use std::collections::BTreeSet;

use sdkwork_sandbox_provider_spi::{
    IsolationAssurance, OperationId, RuntimeCapability, SandboxSessionId, SandboxWorkspaceId,
    TenantId,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreateSandboxSessionCommand {
    pub tenant_id: TenantId,
    pub sandbox_workspace_id: SandboxWorkspaceId,
    pub sandbox_session_id: SandboxSessionId,
    pub sandbox_operation_id: OperationId,
    pub sandbox_required_capabilities: BTreeSet<RuntimeCapability>,
    pub sandbox_minimum_assurance: IsolationAssurance,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SandboxSessionLifecycleCommand {
    pub tenant_id: TenantId,
    pub sandbox_session_id: SandboxSessionId,
    pub sandbox_operation_id: OperationId,
}
