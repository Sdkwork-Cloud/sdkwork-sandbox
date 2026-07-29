use sdkwork_sandbox_provider_spi::SandboxSessionId;

use crate::SandboxSessionState;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SandboxSessionReconciliationOutcome {
    Reconciled,
    Failed,
    LeaseUnavailable,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SandboxSessionReconciliationItem {
    sandbox_session_id: SandboxSessionId,
    sandbox_session_state: SandboxSessionState,
    sandbox_reconciliation_outcome: SandboxSessionReconciliationOutcome,
}

impl SandboxSessionReconciliationItem {
    pub(crate) fn new(
        sandbox_session_id: SandboxSessionId,
        sandbox_session_state: SandboxSessionState,
        sandbox_reconciliation_outcome: SandboxSessionReconciliationOutcome,
    ) -> Self {
        Self {
            sandbox_session_id,
            sandbox_session_state,
            sandbox_reconciliation_outcome,
        }
    }

    pub fn sandbox_session_id(&self) -> &SandboxSessionId {
        &self.sandbox_session_id
    }

    pub fn sandbox_session_state(&self) -> SandboxSessionState {
        self.sandbox_session_state
    }

    pub fn sandbox_reconciliation_outcome(&self) -> SandboxSessionReconciliationOutcome {
        self.sandbox_reconciliation_outcome
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SandboxSessionReconciliationPage {
    sandbox_items: Vec<SandboxSessionReconciliationItem>,
    next_sandbox_session_id: Option<SandboxSessionId>,
}

impl SandboxSessionReconciliationPage {
    pub(crate) fn new(
        sandbox_items: Vec<SandboxSessionReconciliationItem>,
        next_sandbox_session_id: Option<SandboxSessionId>,
    ) -> Self {
        Self {
            sandbox_items,
            next_sandbox_session_id,
        }
    }

    pub fn sandbox_items(&self) -> &[SandboxSessionReconciliationItem] {
        &self.sandbox_items
    }

    pub fn next_sandbox_session_id(&self) -> Option<&SandboxSessionId> {
        self.next_sandbox_session_id.as_ref()
    }
}
