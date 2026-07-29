use std::collections::{BTreeSet, HashMap, VecDeque};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use async_trait::async_trait;
use sdkwork_sandbox_provider_spi::{
    IsolationAssurance, OperationId, RuntimeCapability, SandboxFencingToken, SandboxId,
    SandboxLeaseOwnerId, SandboxProvider, SandboxProviderAllocation, SandboxProviderAllocationRef,
    SandboxProviderAllocationRequest, SandboxProviderDescriptor, SandboxProviderDestroyRequest,
    SandboxProviderError, SandboxProviderErrorKind, SandboxProviderHealth,
    SandboxProviderHealthStatus, SandboxProviderId, SandboxProviderKind, SandboxProviderOperation,
    SandboxProviderReadiness, SandboxProviderResult, SandboxProviderStartRequest,
    SandboxProviderStopRequest, SandboxRuntimeBindingId, SandboxSessionId, SandboxWorkspaceId,
    TenantId,
};

use crate::{
    CreateSandboxSessionCommand, SandboxLifecycleError, SandboxLifecycleService,
    SandboxOperationOutcome, SandboxProtectedProviderAllocationRef,
    SandboxProviderAllocationProtectionVersion, SandboxRuntimeBinding, SandboxSession,
    SandboxSessionFailure, SandboxSessionLease, SandboxSessionLifecycleCommand,
    SandboxSessionOperation, SandboxSessionOperationKind, SandboxSessionReconciliationOutcome,
    SandboxSessionRepository, SandboxSessionRepositoryError, SandboxSessionRepositoryResult,
    SandboxSessionState,
};

static NEXT_SANDBOX_SESSION_ID: AtomicUsize = AtomicUsize::new(1);

#[derive(Default)]
struct TestSandboxSessionRepositoryState {
    sandbox_sessions: HashMap<(TenantId, SandboxSessionId), SandboxSession>,
    sandbox_operations: HashMap<(TenantId, OperationId), SandboxSessionId>,
    sandbox_leases: HashMap<(TenantId, SandboxSessionId), TestSandboxSessionLease>,
}

struct TestSandboxSessionLease {
    sandbox_lease_owner_id: Option<SandboxLeaseOwnerId>,
    sandbox_fencing_token: u64,
    sandbox_lease_expires_at: Option<Instant>,
    sandbox_lease_expires_at_unix_millis: Option<i64>,
}

#[derive(Default)]
struct TestSandboxSessionRepository {
    sandbox_state: Mutex<TestSandboxSessionRepositoryState>,
}

impl TestSandboxSessionRepository {
    fn lock_sandbox_state(&self) -> MutexGuard<'_, TestSandboxSessionRepositoryState> {
        match self.sandbox_state.lock() {
            Ok(sandbox_state) => sandbox_state,
            Err(poisoned_sandbox_state) => poisoned_sandbox_state.into_inner(),
        }
    }

    fn sandbox_lease_duration_millis(
        sandbox_lease_duration: Duration,
    ) -> SandboxSessionRepositoryResult<i64> {
        let sandbox_lease_duration_millis = sandbox_lease_duration.as_millis();
        if !(1..=300_000).contains(&sandbox_lease_duration_millis) {
            return Err(SandboxSessionRepositoryError::LeaseConflict);
        }
        i64::try_from(sandbox_lease_duration_millis)
            .map_err(|_| SandboxSessionRepositoryError::LeaseConflict)
    }

    fn unix_millis_now() -> SandboxSessionRepositoryResult<i64> {
        let sandbox_duration = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| SandboxSessionRepositoryError::Unavailable)?;
        i64::try_from(sandbox_duration.as_millis())
            .map_err(|_| SandboxSessionRepositoryError::Unavailable)
    }

    fn sandbox_session_lease(
        tenant_id: &TenantId,
        sandbox_session_id: &SandboxSessionId,
        sandbox_lease: &TestSandboxSessionLease,
    ) -> SandboxSessionRepositoryResult<SandboxSessionLease> {
        SandboxSessionLease::new(
            tenant_id.clone(),
            sandbox_session_id.clone(),
            sandbox_lease
                .sandbox_lease_owner_id
                .clone()
                .ok_or(SandboxSessionRepositoryError::InvalidStoredData)?,
            SandboxFencingToken::new(sandbox_lease.sandbox_fencing_token)
                .map_err(|_| SandboxSessionRepositoryError::InvalidStoredData)?,
            sandbox_lease
                .sandbox_lease_expires_at_unix_millis
                .ok_or(SandboxSessionRepositoryError::InvalidStoredData)?,
        )
    }
}

#[async_trait]
impl SandboxSessionRepository for TestSandboxSessionRepository {
    async fn find_by_sandbox_operation(
        &self,
        tenant_id: &TenantId,
        sandbox_operation_id: &OperationId,
    ) -> SandboxSessionRepositoryResult<Option<SandboxSession>> {
        let sandbox_state = self.lock_sandbox_state();
        let sandbox_session_id = sandbox_state
            .sandbox_operations
            .get(&(tenant_id.clone(), sandbox_operation_id.clone()));
        Ok(sandbox_session_id.and_then(|sandbox_session_id| {
            sandbox_state
                .sandbox_sessions
                .get(&(tenant_id.clone(), sandbox_session_id.clone()))
                .cloned()
        }))
    }

    async fn get_sandbox_session(
        &self,
        tenant_id: &TenantId,
        sandbox_session_id: &SandboxSessionId,
    ) -> SandboxSessionRepositoryResult<Option<SandboxSession>> {
        Ok(self
            .lock_sandbox_state()
            .sandbox_sessions
            .get(&(tenant_id.clone(), sandbox_session_id.clone()))
            .cloned())
    }

    async fn insert_sandbox_session(
        &self,
        sandbox_session: SandboxSession,
    ) -> SandboxSessionRepositoryResult<()> {
        let mut sandbox_state = self.lock_sandbox_state();
        let sandbox_session_key = (
            sandbox_session.tenant_id().clone(),
            sandbox_session.sandbox_session_id().clone(),
        );
        if sandbox_state
            .sandbox_sessions
            .contains_key(&sandbox_session_key)
        {
            return Err(SandboxSessionRepositoryError::VersionConflict);
        }
        for sandbox_operation in sandbox_session.sandbox_operations() {
            if sandbox_state.sandbox_operations.contains_key(&(
                sandbox_session.tenant_id().clone(),
                sandbox_operation.sandbox_operation_id().clone(),
            )) {
                return Err(SandboxSessionRepositoryError::DuplicateOperation);
            }
        }
        for sandbox_operation in sandbox_session.sandbox_operations() {
            sandbox_state.sandbox_operations.insert(
                (
                    sandbox_session.tenant_id().clone(),
                    sandbox_operation.sandbox_operation_id().clone(),
                ),
                sandbox_session.sandbox_session_id().clone(),
            );
        }
        sandbox_state
            .sandbox_sessions
            .insert(sandbox_session_key.clone(), sandbox_session);
        sandbox_state.sandbox_leases.insert(
            sandbox_session_key,
            TestSandboxSessionLease {
                sandbox_lease_owner_id: None,
                sandbox_fencing_token: 0,
                sandbox_lease_expires_at: None,
                sandbox_lease_expires_at_unix_millis: None,
            },
        );
        Ok(())
    }

    async fn save_sandbox_session(
        &self,
        sandbox_session: SandboxSession,
        expected_sandbox_version: u64,
        sandbox_session_lease: &SandboxSessionLease,
    ) -> SandboxSessionRepositoryResult<()> {
        let mut sandbox_state = self.lock_sandbox_state();
        let sandbox_session_key = (
            sandbox_session.tenant_id().clone(),
            sandbox_session.sandbox_session_id().clone(),
        );
        let current_sandbox_session = sandbox_state
            .sandbox_sessions
            .get(&sandbox_session_key)
            .ok_or(SandboxSessionRepositoryError::NotFound)?;
        let sandbox_lease = sandbox_state
            .sandbox_leases
            .get(&sandbox_session_key)
            .ok_or(SandboxSessionRepositoryError::LeaseConflict)?;
        if sandbox_lease.sandbox_lease_owner_id.as_ref()
            != Some(sandbox_session_lease.sandbox_lease_owner_id())
            || sandbox_lease.sandbox_fencing_token
                != sandbox_session_lease.sandbox_fencing_token().value()
            || sandbox_lease
                .sandbox_lease_expires_at
                .is_none_or(|sandbox_lease_expires_at| sandbox_lease_expires_at <= Instant::now())
        {
            return Err(SandboxSessionRepositoryError::LeaseConflict);
        }
        if current_sandbox_session.sandbox_version() != expected_sandbox_version
            || sandbox_session.sandbox_version() != expected_sandbox_version + 1
        {
            return Err(SandboxSessionRepositoryError::VersionConflict);
        }
        for sandbox_operation in sandbox_session.sandbox_operations() {
            sandbox_state.sandbox_operations.insert(
                (
                    sandbox_session.tenant_id().clone(),
                    sandbox_operation.sandbox_operation_id().clone(),
                ),
                sandbox_session.sandbox_session_id().clone(),
            );
        }
        sandbox_state
            .sandbox_sessions
            .insert(sandbox_session_key, sandbox_session);
        Ok(())
    }

    async fn acquire_sandbox_session_lease(
        &self,
        tenant_id: &TenantId,
        sandbox_session_id: &SandboxSessionId,
        sandbox_lease_owner_id: &SandboxLeaseOwnerId,
        sandbox_lease_duration: Duration,
    ) -> SandboxSessionRepositoryResult<Option<SandboxSessionLease>> {
        let sandbox_lease_duration_millis =
            Self::sandbox_lease_duration_millis(sandbox_lease_duration)?;
        let mut sandbox_state = self.lock_sandbox_state();
        let sandbox_session_key = (tenant_id.clone(), sandbox_session_id.clone());
        if !sandbox_state
            .sandbox_sessions
            .contains_key(&sandbox_session_key)
        {
            return Err(SandboxSessionRepositoryError::NotFound);
        }
        let sandbox_lease = sandbox_state
            .sandbox_leases
            .get_mut(&sandbox_session_key)
            .ok_or(SandboxSessionRepositoryError::InvalidStoredData)?;
        let sandbox_now = Instant::now();
        if sandbox_lease
            .sandbox_lease_expires_at
            .is_some_and(|sandbox_lease_expires_at| sandbox_lease_expires_at > sandbox_now)
        {
            return Ok(None);
        }
        sandbox_lease.sandbox_fencing_token = sandbox_lease
            .sandbox_fencing_token
            .checked_add(1)
            .filter(|sandbox_fencing_token| *sandbox_fencing_token <= i64::MAX as u64)
            .ok_or(SandboxSessionRepositoryError::LeaseConflict)?;
        sandbox_lease.sandbox_lease_owner_id = Some(sandbox_lease_owner_id.clone());
        sandbox_lease.sandbox_lease_expires_at = Some(sandbox_now + sandbox_lease_duration);
        sandbox_lease.sandbox_lease_expires_at_unix_millis = Some(
            Self::unix_millis_now()?
                .checked_add(sandbox_lease_duration_millis)
                .ok_or(SandboxSessionRepositoryError::LeaseConflict)?,
        );
        Self::sandbox_session_lease(tenant_id, sandbox_session_id, sandbox_lease).map(Some)
    }

    async fn renew_sandbox_session_lease(
        &self,
        sandbox_session_lease: &SandboxSessionLease,
        sandbox_lease_duration: Duration,
    ) -> SandboxSessionRepositoryResult<Option<SandboxSessionLease>> {
        let sandbox_lease_duration_millis =
            Self::sandbox_lease_duration_millis(sandbox_lease_duration)?;
        let mut sandbox_state = self.lock_sandbox_state();
        let sandbox_lease = sandbox_state
            .sandbox_leases
            .get_mut(&(
                sandbox_session_lease.tenant_id().clone(),
                sandbox_session_lease.sandbox_session_id().clone(),
            ))
            .ok_or(SandboxSessionRepositoryError::NotFound)?;
        let sandbox_now = Instant::now();
        if sandbox_lease.sandbox_lease_owner_id.as_ref()
            != Some(sandbox_session_lease.sandbox_lease_owner_id())
            || sandbox_lease.sandbox_fencing_token
                != sandbox_session_lease.sandbox_fencing_token().value()
            || sandbox_lease
                .sandbox_lease_expires_at
                .is_none_or(|sandbox_lease_expires_at| sandbox_lease_expires_at <= sandbox_now)
        {
            return Ok(None);
        }
        sandbox_lease.sandbox_lease_expires_at = Some(sandbox_now + sandbox_lease_duration);
        sandbox_lease.sandbox_lease_expires_at_unix_millis = Some(
            Self::unix_millis_now()?
                .checked_add(sandbox_lease_duration_millis)
                .ok_or(SandboxSessionRepositoryError::LeaseConflict)?,
        );
        Self::sandbox_session_lease(
            sandbox_session_lease.tenant_id(),
            sandbox_session_lease.sandbox_session_id(),
            sandbox_lease,
        )
        .map(Some)
    }

    async fn release_sandbox_session_lease(
        &self,
        sandbox_session_lease: &SandboxSessionLease,
    ) -> SandboxSessionRepositoryResult<bool> {
        let mut sandbox_state = self.lock_sandbox_state();
        let sandbox_lease = sandbox_state
            .sandbox_leases
            .get_mut(&(
                sandbox_session_lease.tenant_id().clone(),
                sandbox_session_lease.sandbox_session_id().clone(),
            ))
            .ok_or(SandboxSessionRepositoryError::NotFound)?;
        if sandbox_lease.sandbox_lease_owner_id.as_ref()
            != Some(sandbox_session_lease.sandbox_lease_owner_id())
            || sandbox_lease.sandbox_fencing_token
                != sandbox_session_lease.sandbox_fencing_token().value()
        {
            return Ok(false);
        }
        sandbox_lease.sandbox_lease_owner_id = None;
        sandbox_lease.sandbox_lease_expires_at = None;
        sandbox_lease.sandbox_lease_expires_at_unix_millis = None;
        Ok(true)
    }

    async fn list_sandbox_sessions_requiring_reconciliation(
        &self,
        tenant_id: &TenantId,
        after_sandbox_session_id: Option<&SandboxSessionId>,
        sandbox_page_size: u16,
    ) -> SandboxSessionRepositoryResult<Vec<SandboxSession>> {
        if !(1..=200).contains(&sandbox_page_size) {
            return Err(SandboxSessionRepositoryError::InvalidPageRequest);
        }
        let sandbox_state = self.lock_sandbox_state();
        let mut sandbox_sessions = sandbox_state
            .sandbox_sessions
            .iter()
            .filter(
                |((stored_tenant_id, stored_sandbox_session_id), sandbox_session)| {
                    stored_tenant_id == tenant_id
                        && after_sandbox_session_id.is_none_or(|after_sandbox_session_id| {
                            stored_sandbox_session_id > after_sandbox_session_id
                        })
                        && matches!(
                            sandbox_session.sandbox_session_state(),
                            SandboxSessionState::Starting
                                | SandboxSessionState::Stopping
                                | SandboxSessionState::Destroying
                        )
                },
            )
            .map(|(_, sandbox_session)| sandbox_session.clone())
            .collect::<Vec<_>>();
        sandbox_sessions
            .sort_by(|left, right| left.sandbox_session_id().cmp(right.sandbox_session_id()));
        sandbox_sessions.truncate(usize::from(sandbox_page_size));
        Ok(sandbox_sessions)
    }
}

struct FakeSandboxProvider {
    sandbox_provider_descriptor: SandboxProviderDescriptor,
    sandbox_provider_health: SandboxProviderHealthStatus,
    sandbox_provider_readiness:
        Mutex<VecDeque<Result<SandboxProviderReadiness, SandboxProviderErrorKind>>>,
    sandbox_start_delay: Option<Duration>,
    fail_sandbox_destroy_call: Option<usize>,
    sandbox_health_calls: AtomicUsize,
    sandbox_allocate_calls: AtomicUsize,
    sandbox_start_calls: AtomicUsize,
    sandbox_stop_calls: AtomicUsize,
    sandbox_destroy_calls: AtomicUsize,
    sandbox_allocate_requests: Mutex<Vec<SandboxProviderAllocationRequest>>,
    sandbox_start_requests: Mutex<Vec<SandboxProviderStartRequest>>,
    sandbox_allocate_fencing_tokens: Mutex<Vec<SandboxFencingToken>>,
    sandbox_start_fencing_tokens: Mutex<Vec<SandboxFencingToken>>,
    sandbox_stop_fencing_tokens: Mutex<Vec<SandboxFencingToken>>,
    sandbox_destroy_fencing_tokens: Mutex<Vec<SandboxFencingToken>>,
}

impl FakeSandboxProvider {
    fn ready(
        sandbox_capabilities: impl IntoIterator<Item = RuntimeCapability>,
        sandbox_assurance: IsolationAssurance,
    ) -> Self {
        Self::with_behavior(
            SandboxProviderHealthStatus::Ready,
            sandbox_capabilities,
            sandbox_assurance,
            VecDeque::new(),
            None,
        )
    }

    fn with_behavior(
        sandbox_provider_health: SandboxProviderHealthStatus,
        sandbox_capabilities: impl IntoIterator<Item = RuntimeCapability>,
        sandbox_assurance: IsolationAssurance,
        sandbox_provider_readiness: VecDeque<
            Result<SandboxProviderReadiness, SandboxProviderErrorKind>,
        >,
        fail_sandbox_destroy_call: Option<usize>,
    ) -> Self {
        Self {
            sandbox_provider_descriptor: SandboxProviderDescriptor::new(
                sandbox_provider_id("provider-test"),
                sandbox_provider_kind("test"),
                sandbox_capabilities,
                sandbox_assurance,
            ),
            sandbox_provider_health,
            sandbox_provider_readiness: Mutex::new(sandbox_provider_readiness),
            sandbox_start_delay: None,
            fail_sandbox_destroy_call,
            sandbox_health_calls: AtomicUsize::new(0),
            sandbox_allocate_calls: AtomicUsize::new(0),
            sandbox_start_calls: AtomicUsize::new(0),
            sandbox_stop_calls: AtomicUsize::new(0),
            sandbox_destroy_calls: AtomicUsize::new(0),
            sandbox_allocate_requests: Mutex::new(Vec::new()),
            sandbox_start_requests: Mutex::new(Vec::new()),
            sandbox_allocate_fencing_tokens: Mutex::new(Vec::new()),
            sandbox_start_fencing_tokens: Mutex::new(Vec::new()),
            sandbox_stop_fencing_tokens: Mutex::new(Vec::new()),
            sandbox_destroy_fencing_tokens: Mutex::new(Vec::new()),
        }
    }

    fn with_sandbox_start_delay(mut self, sandbox_start_delay: Duration) -> Self {
        self.sandbox_start_delay = Some(sandbox_start_delay);
        self
    }

    fn record_sandbox_fencing_token(
        sandbox_fencing_tokens: &Mutex<Vec<SandboxFencingToken>>,
        sandbox_fencing_token: SandboxFencingToken,
    ) {
        match sandbox_fencing_tokens.lock() {
            Ok(mut sandbox_fencing_tokens) => {
                sandbox_fencing_tokens.push(sandbox_fencing_token);
            }
            Err(poisoned_sandbox_fencing_tokens) => {
                poisoned_sandbox_fencing_tokens
                    .into_inner()
                    .push(sandbox_fencing_token);
            }
        }
    }

    fn record_sandbox_request<T>(sandbox_requests: &Mutex<Vec<T>>, sandbox_request: T) {
        match sandbox_requests.lock() {
            Ok(mut sandbox_requests) => sandbox_requests.push(sandbox_request),
            Err(poisoned_sandbox_requests) => {
                poisoned_sandbox_requests.into_inner().push(sandbox_request);
            }
        }
    }

    fn sandbox_requests<T: Clone>(sandbox_requests: &Mutex<Vec<T>>) -> Vec<T> {
        match sandbox_requests.lock() {
            Ok(sandbox_requests) => sandbox_requests.clone(),
            Err(poisoned_sandbox_requests) => poisoned_sandbox_requests.into_inner().clone(),
        }
    }

    fn sandbox_fencing_tokens(
        sandbox_fencing_tokens: &Mutex<Vec<SandboxFencingToken>>,
    ) -> Vec<SandboxFencingToken> {
        match sandbox_fencing_tokens.lock() {
            Ok(sandbox_fencing_tokens) => sandbox_fencing_tokens.clone(),
            Err(poisoned_sandbox_fencing_tokens) => {
                poisoned_sandbox_fencing_tokens.into_inner().clone()
            }
        }
    }

    fn next_sandbox_provider_readiness(
        &self,
    ) -> Result<SandboxProviderReadiness, SandboxProviderErrorKind> {
        let mut sandbox_provider_outcomes = match self.sandbox_provider_readiness.lock() {
            Ok(sandbox_provider_outcomes) => sandbox_provider_outcomes,
            Err(poisoned_sandbox_provider_outcomes) => {
                poisoned_sandbox_provider_outcomes.into_inner()
            }
        };
        sandbox_provider_outcomes
            .pop_front()
            .unwrap_or(Ok(SandboxProviderReadiness {
                sandbox_provider_ready: true,
                sandbox_policy_enforced: true,
                sandbox_workspace_attached: true,
            }))
    }

    fn sandbox_provider_error(
        &self,
        sandbox_provider_operation: SandboxProviderOperation,
        sandbox_provider_error_kind: SandboxProviderErrorKind,
    ) -> SandboxProviderError {
        SandboxProviderError::new(
            self.sandbox_provider_descriptor
                .sandbox_provider_id()
                .clone(),
            sandbox_provider_operation,
            sandbox_provider_error_kind,
        )
    }
}

#[async_trait]
impl SandboxProvider for FakeSandboxProvider {
    fn sandbox_provider_descriptor(&self) -> &SandboxProviderDescriptor {
        &self.sandbox_provider_descriptor
    }

    async fn sandbox_provider_health(&self) -> SandboxProviderResult<SandboxProviderHealth> {
        self.sandbox_health_calls.fetch_add(1, Ordering::SeqCst);
        Ok(SandboxProviderHealth {
            sandbox_provider_health_status: self.sandbox_provider_health,
        })
    }

    async fn allocate(
        &self,
        sandbox_request: SandboxProviderAllocationRequest,
    ) -> SandboxProviderResult<SandboxProviderAllocation> {
        Self::record_sandbox_request(&self.sandbox_allocate_requests, sandbox_request.clone());
        Self::record_sandbox_fencing_token(
            &self.sandbox_allocate_fencing_tokens,
            sandbox_request.sandbox_fencing_token,
        );
        let sandbox_allocate_call = self.sandbox_allocate_calls.fetch_add(1, Ordering::SeqCst) + 1;
        let sandbox_allocation_reference =
            SandboxProviderAllocationRef::new(format!("allocation-{sandbox_allocate_call}"));
        match sandbox_allocation_reference {
            Ok(sandbox_allocation_reference) => Ok(SandboxProviderAllocation {
                sandbox_allocation_reference,
            }),
            Err(_) => Err(self.sandbox_provider_error(
                SandboxProviderOperation::Allocate,
                SandboxProviderErrorKind::Internal,
            )),
        }
    }

    async fn start(
        &self,
        sandbox_request: SandboxProviderStartRequest,
    ) -> SandboxProviderResult<SandboxProviderReadiness> {
        Self::record_sandbox_request(&self.sandbox_start_requests, sandbox_request.clone());
        Self::record_sandbox_fencing_token(
            &self.sandbox_start_fencing_tokens,
            sandbox_request.sandbox_fencing_token,
        );
        self.sandbox_start_calls.fetch_add(1, Ordering::SeqCst);
        if let Some(sandbox_start_delay) = self.sandbox_start_delay {
            tokio::time::sleep(sandbox_start_delay).await;
        }
        self.next_sandbox_provider_readiness()
            .map_err(|sandbox_provider_error_kind| {
                self.sandbox_provider_error(
                    SandboxProviderOperation::Start,
                    sandbox_provider_error_kind,
                )
            })
    }

    async fn stop(&self, sandbox_request: SandboxProviderStopRequest) -> SandboxProviderResult<()> {
        Self::record_sandbox_fencing_token(
            &self.sandbox_stop_fencing_tokens,
            sandbox_request.sandbox_fencing_token,
        );
        self.sandbox_stop_calls.fetch_add(1, Ordering::SeqCst);
        Ok(())
    }

    async fn destroy(
        &self,
        sandbox_request: SandboxProviderDestroyRequest,
    ) -> SandboxProviderResult<()> {
        Self::record_sandbox_fencing_token(
            &self.sandbox_destroy_fencing_tokens,
            sandbox_request.sandbox_fencing_token,
        );
        let sandbox_destroy_call = self.sandbox_destroy_calls.fetch_add(1, Ordering::SeqCst) + 1;
        if self.fail_sandbox_destroy_call == Some(sandbox_destroy_call) {
            Err(self.sandbox_provider_error(
                SandboxProviderOperation::Destroy,
                SandboxProviderErrorKind::Conflict,
            ))
        } else {
            Ok(())
        }
    }
}

fn sandbox_provider_id(value: &str) -> SandboxProviderId {
    SandboxProviderId::parse(value)
        .unwrap_or_else(|error| panic!("invalid test sandbox provider id: {error}"))
}

fn sandbox_provider_kind(value: &str) -> SandboxProviderKind {
    SandboxProviderKind::parse(value)
        .unwrap_or_else(|error| panic!("invalid test sandbox provider kind: {error}"))
}

fn tenant_id(value: &str) -> TenantId {
    TenantId::parse(value).unwrap_or_else(|error| panic!("invalid test tenant id: {error}"))
}

fn sandbox_workspace_id(value: &str) -> SandboxWorkspaceId {
    SandboxWorkspaceId::parse(value)
        .unwrap_or_else(|error| panic!("invalid test sandbox workspace id: {error}"))
}

fn next_sandbox_session_id() -> SandboxSessionId {
    let sandbox_session_sequence = NEXT_SANDBOX_SESSION_ID.fetch_add(1, Ordering::SeqCst);
    SandboxSessionId::parse(format!("session-{sandbox_session_sequence}"))
        .unwrap_or_else(|error| panic!("invalid test sandbox session id: {error}"))
}

fn create_sandbox_session_command(
    tenant_id: TenantId,
    sandbox_capabilities: impl IntoIterator<Item = RuntimeCapability>,
    sandbox_assurance: IsolationAssurance,
) -> CreateSandboxSessionCommand {
    CreateSandboxSessionCommand {
        tenant_id,
        sandbox_workspace_id: sandbox_workspace_id("workspace-a"),
        sandbox_session_id: next_sandbox_session_id(),
        sandbox_operation_id: OperationId::generate(),
        sandbox_required_capabilities: sandbox_capabilities.into_iter().collect(),
        sandbox_minimum_assurance: sandbox_assurance,
    }
}

fn sandbox_session_lifecycle_command(
    sandbox_session: &SandboxSession,
) -> SandboxSessionLifecycleCommand {
    SandboxSessionLifecycleCommand {
        tenant_id: sandbox_session.tenant_id().clone(),
        sandbox_session_id: sandbox_session.sandbox_session_id().clone(),
        sandbox_operation_id: OperationId::generate(),
    }
}

fn sandbox_lifecycle_service_with(
    sandbox_provider: Arc<FakeSandboxProvider>,
) -> SandboxLifecycleService {
    sandbox_lifecycle_service_with_repository(
        Arc::new(TestSandboxSessionRepository::default()),
        sandbox_provider,
    )
}

fn sandbox_lifecycle_service_with_repository(
    sandbox_session_repository: Arc<TestSandboxSessionRepository>,
    sandbox_provider: Arc<FakeSandboxProvider>,
) -> SandboxLifecycleService {
    let sandbox_session_repository: Arc<dyn SandboxSessionRepository> = sandbox_session_repository;
    let sandbox_providers: Vec<Arc<dyn SandboxProvider>> = vec![sandbox_provider];
    SandboxLifecycleService::new(sandbox_session_repository, sandbox_providers)
        .unwrap_or_else(|error| panic!("invalid sandbox lifecycle service: {error}"))
}

fn sandbox_lifecycle_service_with_operation_policy(
    sandbox_session_repository: Arc<TestSandboxSessionRepository>,
    sandbox_provider: Arc<FakeSandboxProvider>,
    sandbox_lease_duration: Duration,
    sandbox_provider_operation_timeout: Duration,
) -> SandboxLifecycleService {
    let sandbox_session_repository: Arc<dyn SandboxSessionRepository> = sandbox_session_repository;
    let sandbox_providers: Vec<Arc<dyn SandboxProvider>> = vec![sandbox_provider];
    SandboxLifecycleService::new_with_sandbox_operation_policy(
        sandbox_session_repository,
        sandbox_providers,
        SandboxLeaseOwnerId::generate(),
        sandbox_lease_duration,
        sandbox_provider_operation_timeout,
    )
    .unwrap_or_else(|error| panic!("invalid sandbox lifecycle service policy: {error}"))
}

fn transient_sandbox_session(
    sandbox_session_id_value: &str,
    sandbox_session_state: SandboxSessionState,
    sandbox_operation_kind: SandboxSessionOperationKind,
    include_sandbox_allocation_reference: bool,
) -> SandboxSession {
    let mut sandbox_runtime_binding = SandboxRuntimeBinding::new_intent(
        SandboxId::generate(),
        SandboxRuntimeBindingId::generate(),
        sandbox_provider_id("provider-test"),
    );
    if include_sandbox_allocation_reference {
        sandbox_runtime_binding.set_sandbox_allocation_reference(
            SandboxProviderAllocationRef::new(format!("allocation-{sandbox_session_id_value}"))
                .unwrap_or_else(|error| {
                    panic!("invalid test sandbox allocation reference: {error}")
                }),
        );
    }
    SandboxSession::restore(
        tenant_id("tenant-a"),
        sandbox_workspace_id("workspace-a"),
        SandboxSessionId::parse(sandbox_session_id_value)
            .unwrap_or_else(|error| panic!("invalid test sandbox session id: {error}")),
        sandbox_session_state,
        BTreeSet::from([RuntimeCapability::Filesystem]),
        IsolationAssurance::HostUser,
        Some(sandbox_runtime_binding),
        None,
        vec![
            SandboxSessionOperation::restore(
                OperationId::generate(),
                SandboxSessionOperationKind::Create,
                SandboxOperationOutcome::Succeeded,
            ),
            SandboxSessionOperation::restore(
                OperationId::generate(),
                sandbox_operation_kind,
                SandboxOperationOutcome::InProgress,
            ),
        ],
        0,
    )
}

async fn create_sandbox_session(
    sandbox_lifecycle_service: &SandboxLifecycleService,
    sandbox_capabilities: impl IntoIterator<Item = RuntimeCapability>,
    sandbox_assurance: IsolationAssurance,
) -> SandboxSession {
    sandbox_lifecycle_service
        .create_sandbox_session(create_sandbox_session_command(
            tenant_id("tenant-a"),
            sandbox_capabilities,
            sandbox_assurance,
        ))
        .await
        .unwrap_or_else(|error| panic!("sandbox session creation failed: {error}"))
}

#[tokio::test]
async fn sandbox_workspace_context_is_preserved_across_provider_attachment_requests() {
    let sandbox_provider = Arc::new(FakeSandboxProvider::ready(
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with(Arc::clone(&sandbox_provider));
    let expected_tenant_id = tenant_id("tenant-workspace-attachment");
    let expected_sandbox_workspace_id = sandbox_workspace_id("workspace-authorized");
    let expected_sandbox_session_id = next_sandbox_session_id();
    let sandbox_session = sandbox_lifecycle_service
        .create_sandbox_session(CreateSandboxSessionCommand {
            tenant_id: expected_tenant_id.clone(),
            sandbox_workspace_id: expected_sandbox_workspace_id.clone(),
            sandbox_session_id: expected_sandbox_session_id.clone(),
            sandbox_operation_id: OperationId::generate(),
            sandbox_required_capabilities: BTreeSet::from([RuntimeCapability::Filesystem]),
            sandbox_minimum_assurance: IsolationAssurance::HostUser,
        })
        .await
        .unwrap_or_else(|error| panic!("sandbox session creation failed: {error}"));

    let running_sandbox_session = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_session_lifecycle_command(&sandbox_session))
        .await
        .unwrap_or_else(|error| panic!("sandbox session start failed: {error}"));
    assert_eq!(
        running_sandbox_session.sandbox_session_state(),
        SandboxSessionState::Running
    );

    let sandbox_allocate_requests =
        FakeSandboxProvider::sandbox_requests(&sandbox_provider.sandbox_allocate_requests);
    let sandbox_start_requests =
        FakeSandboxProvider::sandbox_requests(&sandbox_provider.sandbox_start_requests);
    assert_eq!(sandbox_allocate_requests.len(), 1);
    assert_eq!(sandbox_start_requests.len(), 1);

    let sandbox_allocate_request = &sandbox_allocate_requests[0];
    let sandbox_start_request = &sandbox_start_requests[0];
    assert_eq!(sandbox_allocate_request.tenant_id, expected_tenant_id);
    assert_eq!(
        sandbox_allocate_request.sandbox_workspace_id,
        expected_sandbox_workspace_id
    );
    assert_eq!(
        sandbox_allocate_request.sandbox_session_id,
        expected_sandbox_session_id
    );
    assert_eq!(
        sandbox_start_request.sandbox_workspace_id,
        sandbox_allocate_request.sandbox_workspace_id
    );
    assert_eq!(
        sandbox_start_request.sandbox_session_id,
        sandbox_allocate_request.sandbox_session_id
    );
    assert_eq!(
        sandbox_start_request.sandbox_id,
        sandbox_allocate_request.sandbox_id
    );
    assert_eq!(
        sandbox_start_request.sandbox_runtime_binding_id,
        sandbox_allocate_request.sandbox_runtime_binding_id
    );
    assert_eq!(
        sandbox_start_request.sandbox_fencing_token,
        sandbox_allocate_request.sandbox_fencing_token
    );
}

#[tokio::test]
async fn sandbox_lifecycle_commands_are_idempotent_without_duplicate_provider_effects() {
    let sandbox_provider = Arc::new(FakeSandboxProvider::ready(
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with(Arc::clone(&sandbox_provider));
    let sandbox_create_command = create_sandbox_session_command(
        tenant_id("tenant-a"),
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    );
    let expected_sandbox_session_id = sandbox_create_command.sandbox_session_id.clone();
    let sandbox_session = sandbox_lifecycle_service
        .create_sandbox_session(sandbox_create_command.clone())
        .await
        .unwrap_or_else(|error| panic!("sandbox session creation failed: {error}"));
    assert_eq!(
        sandbox_session.sandbox_session_id(),
        &expected_sandbox_session_id
    );
    let replayed_sandbox_session = sandbox_lifecycle_service
        .create_sandbox_session(sandbox_create_command)
        .await;
    assert!(matches!(
        replayed_sandbox_session,
        Ok(ref replayed_sandbox_session)
            if replayed_sandbox_session.sandbox_session_id()
                == sandbox_session.sandbox_session_id()
    ));

    let sandbox_start_command = sandbox_session_lifecycle_command(&sandbox_session);
    let running_sandbox_session = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_start_command.clone())
        .await
        .unwrap_or_else(|error| panic!("sandbox session start failed: {error}"));
    assert_eq!(
        running_sandbox_session.sandbox_session_state(),
        SandboxSessionState::Running
    );
    assert!(running_sandbox_session.sandbox_runtime_binding().is_some());
    assert!(sandbox_lifecycle_service
        .start_sandbox_session(sandbox_start_command)
        .await
        .is_ok());
    assert_eq!(
        sandbox_provider
            .sandbox_allocate_calls
            .load(Ordering::SeqCst),
        1
    );
    assert_eq!(
        sandbox_provider.sandbox_start_calls.load(Ordering::SeqCst),
        1
    );
    let sandbox_allocate_fencing_tokens = FakeSandboxProvider::sandbox_fencing_tokens(
        &sandbox_provider.sandbox_allocate_fencing_tokens,
    );
    let sandbox_start_fencing_tokens =
        FakeSandboxProvider::sandbox_fencing_tokens(&sandbox_provider.sandbox_start_fencing_tokens);
    assert_eq!(sandbox_allocate_fencing_tokens.len(), 1);
    assert_eq!(
        sandbox_allocate_fencing_tokens,
        sandbox_start_fencing_tokens
    );

    let sandbox_stop_command = sandbox_session_lifecycle_command(&running_sandbox_session);
    let stopped_sandbox_session = sandbox_lifecycle_service
        .stop_sandbox_session(sandbox_stop_command.clone())
        .await
        .unwrap_or_else(|error| panic!("sandbox session stop failed: {error}"));
    assert_eq!(
        stopped_sandbox_session.sandbox_session_state(),
        SandboxSessionState::Stopped
    );
    assert!(sandbox_lifecycle_service
        .stop_sandbox_session(sandbox_stop_command)
        .await
        .is_ok());
    assert_eq!(
        sandbox_provider.sandbox_stop_calls.load(Ordering::SeqCst),
        1
    );
    let sandbox_stop_fencing_tokens =
        FakeSandboxProvider::sandbox_fencing_tokens(&sandbox_provider.sandbox_stop_fencing_tokens);
    assert_eq!(sandbox_stop_fencing_tokens.len(), 1);
    assert!(sandbox_stop_fencing_tokens[0] > sandbox_start_fencing_tokens[0]);

    let sandbox_destroy_command = sandbox_session_lifecycle_command(&stopped_sandbox_session);
    let destroyed_sandbox_session = sandbox_lifecycle_service
        .destroy_sandbox_session(sandbox_destroy_command.clone())
        .await
        .unwrap_or_else(|error| panic!("sandbox session destroy failed: {error}"));
    assert_eq!(
        destroyed_sandbox_session.sandbox_session_state(),
        SandboxSessionState::Destroyed
    );
    assert!(destroyed_sandbox_session
        .sandbox_runtime_binding()
        .is_none());
    assert!(sandbox_lifecycle_service
        .destroy_sandbox_session(sandbox_destroy_command)
        .await
        .is_ok());
    assert_eq!(
        sandbox_provider
            .sandbox_destroy_calls
            .load(Ordering::SeqCst),
        1
    );
    let sandbox_destroy_fencing_tokens = FakeSandboxProvider::sandbox_fencing_tokens(
        &sandbox_provider.sandbox_destroy_fencing_tokens,
    );
    assert_eq!(sandbox_destroy_fencing_tokens.len(), 1);
    assert!(sandbox_destroy_fencing_tokens[0] > sandbox_stop_fencing_tokens[0]);
}

#[tokio::test]
async fn sandbox_provider_selection_fails_closed_for_capability_assurance_and_health() {
    let sandbox_provider = Arc::new(FakeSandboxProvider::with_behavior(
        SandboxProviderHealthStatus::Degraded,
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
        VecDeque::new(),
        None,
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with(sandbox_provider);

    let missing_capability_sandbox_session = create_sandbox_session(
        &sandbox_lifecycle_service,
        [RuntimeCapability::Terminal],
        IsolationAssurance::HostUser,
    )
    .await;
    let missing_capability_result = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_session_lifecycle_command(
            &missing_capability_sandbox_session,
        ))
        .await;
    assert!(matches!(
        missing_capability_result,
        Err(SandboxLifecycleError::NoEligibleProvider)
    ));

    let weak_assurance_sandbox_session = create_sandbox_session(
        &sandbox_lifecycle_service,
        [RuntimeCapability::Filesystem],
        IsolationAssurance::Container,
    )
    .await;
    let weak_assurance_result = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_session_lifecycle_command(
            &weak_assurance_sandbox_session,
        ))
        .await;
    assert!(matches!(
        weak_assurance_result,
        Err(SandboxLifecycleError::NoEligibleProvider)
    ));

    let unhealthy_sandbox_session = create_sandbox_session(
        &sandbox_lifecycle_service,
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    )
    .await;
    let unhealthy_result = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_session_lifecycle_command(
            &unhealthy_sandbox_session,
        ))
        .await;
    assert!(matches!(
        unhealthy_result,
        Err(SandboxLifecycleError::NoHealthyProvider)
    ));
}

#[tokio::test]
async fn sandbox_readiness_gate_cleans_binding_and_records_failed_operation() {
    let sandbox_provider = Arc::new(FakeSandboxProvider::with_behavior(
        SandboxProviderHealthStatus::Ready,
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
        VecDeque::from([Ok(SandboxProviderReadiness {
            sandbox_provider_ready: true,
            sandbox_policy_enforced: false,
            sandbox_workspace_attached: true,
        })]),
        None,
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with(Arc::clone(&sandbox_provider));
    let sandbox_session = create_sandbox_session(
        &sandbox_lifecycle_service,
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    )
    .await;
    let sandbox_start_command = sandbox_session_lifecycle_command(&sandbox_session);
    let sandbox_start_result = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_start_command.clone())
        .await;
    assert!(matches!(
        sandbox_start_result,
        Err(SandboxLifecycleError::ProviderReadinessRejected { .. })
    ));
    let failed_sandbox_session = sandbox_lifecycle_service
        .get_sandbox_session(
            sandbox_session.tenant_id(),
            sandbox_session.sandbox_session_id(),
        )
        .await
        .unwrap_or_else(|error| panic!("failed sandbox session lookup: {error}"));
    assert_eq!(
        failed_sandbox_session.sandbox_session_state(),
        SandboxSessionState::Failed
    );
    assert_eq!(
        failed_sandbox_session.sandbox_last_failure(),
        Some(SandboxSessionFailure::Readiness)
    );
    assert!(failed_sandbox_session.sandbox_runtime_binding().is_none());
    assert_eq!(
        sandbox_provider
            .sandbox_destroy_calls
            .load(Ordering::SeqCst),
        1
    );
    let sandbox_replay_result = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_start_command)
        .await;
    assert!(matches!(
        sandbox_replay_result,
        Err(SandboxLifecycleError::OperationPreviouslyFailed {
            sandbox_session_failure: SandboxSessionFailure::Readiness,
            ..
        })
    ));
}

#[tokio::test]
async fn sandbox_retry_start_releases_failed_binding_before_allocating_again() {
    let sandbox_provider = Arc::new(FakeSandboxProvider::with_behavior(
        SandboxProviderHealthStatus::Ready,
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
        VecDeque::from([
            Err(SandboxProviderErrorKind::Unavailable),
            Ok(SandboxProviderReadiness {
                sandbox_provider_ready: true,
                sandbox_policy_enforced: true,
                sandbox_workspace_attached: true,
            }),
        ]),
        Some(1),
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with(Arc::clone(&sandbox_provider));
    let sandbox_session = create_sandbox_session(
        &sandbox_lifecycle_service,
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    )
    .await;

    let first_sandbox_start_result = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_session_lifecycle_command(&sandbox_session))
        .await;
    assert!(matches!(
        first_sandbox_start_result,
        Err(SandboxLifecycleError::Provider(_))
    ));
    let failed_sandbox_session = sandbox_lifecycle_service
        .get_sandbox_session(
            sandbox_session.tenant_id(),
            sandbox_session.sandbox_session_id(),
        )
        .await
        .unwrap_or_else(|error| panic!("failed sandbox session lookup: {error}"));
    assert_eq!(
        failed_sandbox_session.sandbox_session_state(),
        SandboxSessionState::Failed
    );
    assert_eq!(
        failed_sandbox_session.sandbox_last_failure(),
        Some(SandboxSessionFailure::Cleanup)
    );
    assert!(failed_sandbox_session.sandbox_runtime_binding().is_some());

    let retried_sandbox_session = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_session_lifecycle_command(&failed_sandbox_session))
        .await
        .unwrap_or_else(|error| panic!("sandbox retry start failed: {error}"));
    assert_eq!(
        retried_sandbox_session.sandbox_session_state(),
        SandboxSessionState::Running
    );
    assert_eq!(
        sandbox_provider
            .sandbox_allocate_calls
            .load(Ordering::SeqCst),
        2
    );
    assert_eq!(
        sandbox_provider.sandbox_start_calls.load(Ordering::SeqCst),
        2
    );
    assert_eq!(
        sandbox_provider
            .sandbox_destroy_calls
            .load(Ordering::SeqCst),
        2
    );
}

#[tokio::test]
async fn sandbox_tenant_scope_and_invalid_transitions_are_enforced() {
    let sandbox_provider = Arc::new(FakeSandboxProvider::ready(
        BTreeSet::new(),
        IsolationAssurance::HostUser,
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with(sandbox_provider);
    let sandbox_session = create_sandbox_session(
        &sandbox_lifecycle_service,
        BTreeSet::new(),
        IsolationAssurance::HostUser,
    )
    .await;

    let hidden_sandbox_session = sandbox_lifecycle_service
        .get_sandbox_session(&tenant_id("tenant-b"), sandbox_session.sandbox_session_id())
        .await;
    assert!(matches!(
        hidden_sandbox_session,
        Err(SandboxLifecycleError::SandboxSessionNotFound { .. })
    ));

    let reused_sandbox_create_operation = SandboxSessionLifecycleCommand {
        tenant_id: sandbox_session.tenant_id().clone(),
        sandbox_session_id: sandbox_session.sandbox_session_id().clone(),
        sandbox_operation_id: sandbox_session.sandbox_operations()[0]
            .sandbox_operation_id()
            .clone(),
    };
    let sandbox_operation_conflict = sandbox_lifecycle_service
        .stop_sandbox_session(reused_sandbox_create_operation)
        .await;
    assert!(matches!(
        sandbox_operation_conflict,
        Err(SandboxLifecycleError::IdempotencyConflict { .. })
    ));

    let stop_created_sandbox_result = sandbox_lifecycle_service
        .stop_sandbox_session(sandbox_session_lifecycle_command(&sandbox_session))
        .await;
    assert!(matches!(
        stop_created_sandbox_result,
        Err(SandboxLifecycleError::InvalidTransition {
            sandbox_session_state: SandboxSessionState::Created,
            ..
        })
    ));
}

#[tokio::test]
async fn sandbox_reconciler_recovers_transient_sessions_with_bounded_pagination() {
    let sandbox_session_repository = Arc::new(TestSandboxSessionRepository::default());
    for sandbox_session in [
        transient_sandbox_session(
            "reconcile-1",
            SandboxSessionState::Starting,
            SandboxSessionOperationKind::Start,
            false,
        ),
        transient_sandbox_session(
            "reconcile-2",
            SandboxSessionState::Stopping,
            SandboxSessionOperationKind::Stop,
            true,
        ),
        transient_sandbox_session(
            "reconcile-3",
            SandboxSessionState::Destroying,
            SandboxSessionOperationKind::Destroy,
            true,
        ),
    ] {
        sandbox_session_repository
            .insert_sandbox_session(sandbox_session)
            .await
            .unwrap_or_else(|error| panic!("transient sandbox session insert failed: {error}"));
    }
    let sandbox_provider = Arc::new(FakeSandboxProvider::ready(
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with_repository(
        Arc::clone(&sandbox_session_repository),
        Arc::clone(&sandbox_provider),
    );
    let tenant_id = tenant_id("tenant-a");

    let first_sandbox_page = sandbox_lifecycle_service
        .reconcile_sandbox_sessions(&tenant_id, None, 2)
        .await
        .unwrap_or_else(|error| panic!("first sandbox reconciliation page failed: {error}"));
    assert_eq!(first_sandbox_page.sandbox_items().len(), 2);
    assert!(first_sandbox_page
        .sandbox_items()
        .iter()
        .all(|sandbox_item| {
            sandbox_item.sandbox_reconciliation_outcome()
                == SandboxSessionReconciliationOutcome::Reconciled
        }));
    let next_sandbox_session_id = first_sandbox_page
        .next_sandbox_session_id()
        .cloned()
        .unwrap_or_else(|| panic!("first sandbox reconciliation page must have a cursor"));
    assert_eq!(next_sandbox_session_id.as_str(), "reconcile-2");

    let second_sandbox_page = sandbox_lifecycle_service
        .reconcile_sandbox_sessions(&tenant_id, Some(&next_sandbox_session_id), 2)
        .await
        .unwrap_or_else(|error| panic!("second sandbox reconciliation page failed: {error}"));
    assert_eq!(second_sandbox_page.sandbox_items().len(), 1);
    assert_eq!(
        second_sandbox_page.sandbox_items()[0].sandbox_reconciliation_outcome(),
        SandboxSessionReconciliationOutcome::Reconciled
    );
    assert!(second_sandbox_page.next_sandbox_session_id().is_none());

    for (sandbox_session_id_value, expected_sandbox_session_state) in [
        ("reconcile-1", SandboxSessionState::Running),
        ("reconcile-2", SandboxSessionState::Stopped),
        ("reconcile-3", SandboxSessionState::Destroyed),
    ] {
        let sandbox_session_id = SandboxSessionId::parse(sandbox_session_id_value)
            .unwrap_or_else(|error| panic!("invalid expected sandbox session id: {error}"));
        let sandbox_session = sandbox_session_repository
            .get_sandbox_session(&tenant_id, &sandbox_session_id)
            .await
            .unwrap_or_else(|error| panic!("reconciled sandbox session lookup failed: {error}"))
            .unwrap_or_else(|| panic!("reconciled sandbox session must exist"));
        assert_eq!(
            sandbox_session.sandbox_session_state(),
            expected_sandbox_session_state
        );
        assert_eq!(
            sandbox_session
                .sandbox_operations()
                .last()
                .map(SandboxSessionOperation::sandbox_operation_outcome),
            Some(SandboxOperationOutcome::Succeeded)
        );
    }

    assert_eq!(
        sandbox_provider
            .sandbox_allocate_calls
            .load(Ordering::SeqCst),
        1
    );
    assert_eq!(
        sandbox_provider.sandbox_start_calls.load(Ordering::SeqCst),
        1
    );
    assert_eq!(
        sandbox_provider.sandbox_stop_calls.load(Ordering::SeqCst),
        1
    );
    assert_eq!(
        sandbox_provider
            .sandbox_destroy_calls
            .load(Ordering::SeqCst),
        1
    );
    assert_eq!(
        FakeSandboxProvider::sandbox_fencing_tokens(
            &sandbox_provider.sandbox_allocate_fencing_tokens
        ),
        FakeSandboxProvider::sandbox_fencing_tokens(&sandbox_provider.sandbox_start_fencing_tokens)
    );
}

#[tokio::test]
async fn sandbox_reconciler_omits_a_cursor_when_the_final_page_is_exactly_full() {
    let sandbox_session_repository = Arc::new(TestSandboxSessionRepository::default());
    for sandbox_session in [
        transient_sandbox_session(
            "reconcile-exact-1",
            SandboxSessionState::Starting,
            SandboxSessionOperationKind::Start,
            false,
        ),
        transient_sandbox_session(
            "reconcile-exact-2",
            SandboxSessionState::Starting,
            SandboxSessionOperationKind::Start,
            false,
        ),
    ] {
        sandbox_session_repository
            .insert_sandbox_session(sandbox_session)
            .await
            .unwrap_or_else(|error| panic!("transient sandbox session insert failed: {error}"));
    }
    let sandbox_provider = Arc::new(FakeSandboxProvider::ready(
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with_repository(
        Arc::clone(&sandbox_session_repository),
        sandbox_provider,
    );

    let sandbox_page = sandbox_lifecycle_service
        .reconcile_sandbox_sessions(&tenant_id("tenant-a"), None, 2)
        .await
        .unwrap_or_else(|error| panic!("exact sandbox reconciliation page failed: {error}"));

    assert_eq!(sandbox_page.sandbox_items().len(), 2);
    assert!(sandbox_page.next_sandbox_session_id().is_none());
}

#[tokio::test]
async fn sandbox_reconciler_rejects_invalid_page_sizes_before_repository_access() {
    let sandbox_session_repository = Arc::new(TestSandboxSessionRepository::default());
    let sandbox_provider = Arc::new(FakeSandboxProvider::ready(
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    ));
    let sandbox_lifecycle_service =
        sandbox_lifecycle_service_with_repository(sandbox_session_repository, sandbox_provider);

    for sandbox_page_size in [0, 201] {
        assert!(matches!(
            sandbox_lifecycle_service
                .reconcile_sandbox_sessions(&tenant_id("tenant-a"), None, sandbox_page_size)
                .await,
            Err(SandboxLifecycleError::Repository(
                SandboxSessionRepositoryError::InvalidPageRequest
            ))
        ));
    }
}

#[tokio::test]
async fn sandbox_reconciler_skips_an_actively_leased_session() {
    let sandbox_session_repository = Arc::new(TestSandboxSessionRepository::default());
    let sandbox_session = transient_sandbox_session(
        "reconcile-leased",
        SandboxSessionState::Starting,
        SandboxSessionOperationKind::Start,
        false,
    );
    let sandbox_session_id = sandbox_session.sandbox_session_id().clone();
    let tenant_id = sandbox_session.tenant_id().clone();
    sandbox_session_repository
        .insert_sandbox_session(sandbox_session)
        .await
        .unwrap_or_else(|error| panic!("transient sandbox session insert failed: {error}"));
    let competing_sandbox_session_lease = sandbox_session_repository
        .acquire_sandbox_session_lease(
            &tenant_id,
            &sandbox_session_id,
            &SandboxLeaseOwnerId::generate(),
            Duration::from_secs(30),
        )
        .await
        .unwrap_or_else(|error| panic!("competing sandbox lease acquisition failed: {error}"))
        .unwrap_or_else(|| panic!("competing sandbox lease must be acquired"));
    let sandbox_provider = Arc::new(FakeSandboxProvider::ready(
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with_repository(
        Arc::clone(&sandbox_session_repository),
        Arc::clone(&sandbox_provider),
    );

    let sandbox_page = sandbox_lifecycle_service
        .reconcile_sandbox_sessions(&tenant_id, None, 20)
        .await
        .unwrap_or_else(|error| panic!("sandbox reconciliation failed: {error}"));
    assert_eq!(sandbox_page.sandbox_items().len(), 1);
    assert_eq!(
        sandbox_page.sandbox_items()[0].sandbox_reconciliation_outcome(),
        SandboxSessionReconciliationOutcome::LeaseUnavailable
    );
    assert_eq!(
        sandbox_provider
            .sandbox_allocate_calls
            .load(Ordering::SeqCst),
        0
    );
    assert!(sandbox_session_repository
        .release_sandbox_session_lease(&competing_sandbox_session_lease)
        .await
        .unwrap_or_else(|error| panic!("competing sandbox lease release failed: {error}")));
}

#[tokio::test]
async fn sandbox_reconciler_persists_provider_failure_and_releases_the_binding() {
    let sandbox_session_repository = Arc::new(TestSandboxSessionRepository::default());
    let sandbox_session = transient_sandbox_session(
        "reconcile-failure",
        SandboxSessionState::Starting,
        SandboxSessionOperationKind::Start,
        true,
    );
    let sandbox_session_id = sandbox_session.sandbox_session_id().clone();
    let tenant_id = sandbox_session.tenant_id().clone();
    sandbox_session_repository
        .insert_sandbox_session(sandbox_session)
        .await
        .unwrap_or_else(|error| panic!("transient sandbox session insert failed: {error}"));
    let sandbox_provider = Arc::new(FakeSandboxProvider::with_behavior(
        SandboxProviderHealthStatus::Ready,
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
        VecDeque::from([Err(SandboxProviderErrorKind::Unavailable)]),
        None,
    ));
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with_repository(
        Arc::clone(&sandbox_session_repository),
        Arc::clone(&sandbox_provider),
    );

    let sandbox_page = sandbox_lifecycle_service
        .reconcile_sandbox_sessions(&tenant_id, None, 20)
        .await
        .unwrap_or_else(|error| panic!("sandbox reconciliation failed: {error}"));
    assert_eq!(sandbox_page.sandbox_items().len(), 1);
    assert_eq!(
        sandbox_page.sandbox_items()[0].sandbox_reconciliation_outcome(),
        SandboxSessionReconciliationOutcome::Failed
    );
    let failed_sandbox_session = sandbox_session_repository
        .get_sandbox_session(&tenant_id, &sandbox_session_id)
        .await
        .unwrap_or_else(|error| panic!("failed sandbox session lookup failed: {error}"))
        .unwrap_or_else(|| panic!("failed sandbox session must exist"));
    assert_eq!(
        failed_sandbox_session.sandbox_session_state(),
        SandboxSessionState::Failed
    );
    assert_eq!(
        failed_sandbox_session.sandbox_last_failure(),
        Some(SandboxSessionFailure::Provider)
    );
    assert!(failed_sandbox_session.sandbox_runtime_binding().is_none());
    assert_eq!(
        FakeSandboxProvider::sandbox_fencing_tokens(&sandbox_provider.sandbox_start_fencing_tokens),
        FakeSandboxProvider::sandbox_fencing_tokens(
            &sandbox_provider.sandbox_destroy_fencing_tokens
        )
    );
}

#[tokio::test]
async fn sandbox_provider_timeout_is_bounded_and_persisted_as_a_typed_failure() {
    let sandbox_session_repository = Arc::new(TestSandboxSessionRepository::default());
    let sandbox_provider = Arc::new(
        FakeSandboxProvider::ready(
            [RuntimeCapability::Filesystem],
            IsolationAssurance::HostUser,
        )
        .with_sandbox_start_delay(Duration::from_millis(25)),
    );
    let sandbox_lifecycle_service = sandbox_lifecycle_service_with_operation_policy(
        Arc::clone(&sandbox_session_repository),
        Arc::clone(&sandbox_provider),
        Duration::from_millis(100),
        Duration::from_millis(5),
    );
    let sandbox_session = create_sandbox_session(
        &sandbox_lifecycle_service,
        [RuntimeCapability::Filesystem],
        IsolationAssurance::HostUser,
    )
    .await;

    let sandbox_start_result = sandbox_lifecycle_service
        .start_sandbox_session(sandbox_session_lifecycle_command(&sandbox_session))
        .await;
    assert!(matches!(
        sandbox_start_result,
        Err(SandboxLifecycleError::Provider(ref sandbox_provider_error))
            if sandbox_provider_error.sandbox_provider_error_kind()
                == SandboxProviderErrorKind::Timeout
                && sandbox_provider_error.sandbox_provider_operation()
                    == SandboxProviderOperation::Start
    ));
    let failed_sandbox_session = sandbox_session_repository
        .get_sandbox_session(
            sandbox_session.tenant_id(),
            sandbox_session.sandbox_session_id(),
        )
        .await
        .unwrap_or_else(|error| panic!("timed-out sandbox session lookup failed: {error}"))
        .unwrap_or_else(|| panic!("timed-out sandbox session must exist"));
    assert_eq!(
        failed_sandbox_session.sandbox_session_state(),
        SandboxSessionState::Failed
    );
    assert_eq!(
        failed_sandbox_session.sandbox_last_failure(),
        Some(SandboxSessionFailure::Provider)
    );
    assert!(failed_sandbox_session.sandbox_runtime_binding().is_none());
    let sandbox_allocate_fencing_tokens = FakeSandboxProvider::sandbox_fencing_tokens(
        &sandbox_provider.sandbox_allocate_fencing_tokens,
    );
    assert_eq!(
        sandbox_allocate_fencing_tokens,
        FakeSandboxProvider::sandbox_fencing_tokens(&sandbox_provider.sandbox_start_fencing_tokens)
    );
    assert_eq!(
        sandbox_allocate_fencing_tokens,
        FakeSandboxProvider::sandbox_fencing_tokens(
            &sandbox_provider.sandbox_destroy_fencing_tokens
        )
    );
}

#[test]
fn sandbox_allocation_protection_metadata_rejects_unsafe_key_identity() {
    for sandbox_invalid_key_id in ["", "key id", "key\nid", "密钥"] {
        assert_eq!(
            SandboxProtectedProviderAllocationRef::new(
                "protected-allocation",
                sandbox_invalid_key_id,
                1,
                1,
            ),
            Err(SandboxSessionRepositoryError::InvalidStoredData)
        );
        assert_eq!(
            SandboxProviderAllocationProtectionVersion::new(sandbox_invalid_key_id, 1, 1),
            Err(SandboxSessionRepositoryError::ProtectionFailed)
        );
    }

    assert!(
        SandboxProtectedProviderAllocationRef::new("protected-allocation", "kms/key:v2", 1, 1,)
            .is_ok()
    );
    assert!(SandboxProviderAllocationProtectionVersion::new("kms/key:v2", 1, 1).is_ok());
}
