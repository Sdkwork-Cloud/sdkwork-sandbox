use sdkwork_sandbox_provider_spi::{
    OperationId, SandboxProviderError, SandboxProviderId, SandboxSessionId, TenantId,
};
use thiserror::Error;

use crate::{
    SandboxSessionFailure, SandboxSessionOperationKind, SandboxSessionRepositoryError,
    SandboxSessionState,
};

pub type SandboxLifecycleResult<T> = Result<T, SandboxLifecycleError>;

#[derive(Debug, Error)]
pub enum SandboxLifecycleError {
    #[error("sandbox provider registry contains duplicate provider id {sandbox_provider_id}")]
    DuplicateProvider {
        sandbox_provider_id: SandboxProviderId,
    },
    #[error("sandbox session {sandbox_session_id} does not exist in tenant {tenant_id}")]
    SandboxSessionNotFound {
        tenant_id: TenantId,
        sandbox_session_id: SandboxSessionId,
    },
    #[error("sandbox operation {sandbox_operation_kind:?} is invalid while sandbox session is {sandbox_session_state:?}")]
    InvalidTransition {
        sandbox_session_state: SandboxSessionState,
        sandbox_operation_kind: SandboxSessionOperationKind,
    },
    #[error("sandbox operation id {sandbox_operation_id} was already used for another lifecycle command")]
    IdempotencyConflict { sandbox_operation_id: OperationId },
    #[error("sandbox operation {sandbox_operation_id} is already in progress")]
    OperationInProgress { sandbox_operation_id: OperationId },
    #[error("sandbox operation {sandbox_operation_id} previously failed with {sandbox_session_failure:?}")]
    OperationPreviouslyFailed {
        sandbox_operation_id: OperationId,
        sandbox_session_failure: SandboxSessionFailure,
    },
    #[error("no sandbox provider satisfies the requested capabilities and isolation assurance")]
    NoEligibleProvider,
    #[error("no eligible sandbox provider currently reports ready health")]
    NoHealthyProvider,
    #[error("sandbox provider {sandbox_provider_id} did not prove readiness, policy enforcement, and workspace attachment")]
    ProviderReadinessRejected {
        sandbox_provider_id: SandboxProviderId,
    },
    #[error("sandbox session state is internally inconsistent: {0}")]
    InvariantViolation(&'static str),
    #[error("sandbox session is currently owned by another lifecycle controller")]
    LeaseUnavailable,
    #[error("sandbox session lifecycle lease was lost before the operation completed")]
    LeaseLost,
    #[error(transparent)]
    Repository(#[from] SandboxSessionRepositoryError),
    #[error(transparent)]
    Provider(#[from] SandboxProviderError),
}
