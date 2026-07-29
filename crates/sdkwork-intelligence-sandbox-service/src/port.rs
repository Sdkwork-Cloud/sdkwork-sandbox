use async_trait::async_trait;
use sdkwork_sandbox_provider_spi::{SandboxSessionId, TenantId};

use crate::{
    CreateSandboxSessionCommand, SandboxLifecycleResult, SandboxSession,
    SandboxSessionLifecycleCommand,
};

#[async_trait]
pub trait SandboxSessionLifecyclePort: Send + Sync {
    async fn create_sandbox_session(
        &self,
        command: CreateSandboxSessionCommand,
    ) -> SandboxLifecycleResult<SandboxSession>;

    async fn get_sandbox_session(
        &self,
        tenant_id: &TenantId,
        sandbox_session_id: &SandboxSessionId,
    ) -> SandboxLifecycleResult<SandboxSession>;

    async fn start_sandbox_session(
        &self,
        command: SandboxSessionLifecycleCommand,
    ) -> SandboxLifecycleResult<SandboxSession>;

    async fn stop_sandbox_session(
        &self,
        command: SandboxSessionLifecycleCommand,
    ) -> SandboxLifecycleResult<SandboxSession>;

    async fn destroy_sandbox_session(
        &self,
        command: SandboxSessionLifecycleCommand,
    ) -> SandboxLifecycleResult<SandboxSession>;
}
