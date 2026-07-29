use std::collections::BTreeSet;

use sdkwork_intelligence_sandbox_service::{
    SandboxOperationOutcome, SandboxSessionFailure, SandboxSessionOperationKind,
    SandboxSessionRepositoryError, SandboxSessionRepositoryResult, SandboxSessionState,
};
use sdkwork_sandbox_provider_spi::{IsolationAssurance, RuntimeCapability};
use serde_json::Value;

pub(crate) fn sandbox_session_state_value(
    sandbox_session_state: SandboxSessionState,
) -> &'static str {
    match sandbox_session_state {
        SandboxSessionState::Created => "created",
        SandboxSessionState::Starting => "starting",
        SandboxSessionState::Running => "running",
        SandboxSessionState::Stopping => "stopping",
        SandboxSessionState::Stopped => "stopped",
        SandboxSessionState::Failed => "failed",
        SandboxSessionState::Destroying => "destroying",
        SandboxSessionState::Destroyed => "destroyed",
    }
}

pub(crate) fn parse_sandbox_session_state(
    value: &str,
) -> SandboxSessionRepositoryResult<SandboxSessionState> {
    match value {
        "created" => Ok(SandboxSessionState::Created),
        "starting" => Ok(SandboxSessionState::Starting),
        "running" => Ok(SandboxSessionState::Running),
        "stopping" => Ok(SandboxSessionState::Stopping),
        "stopped" => Ok(SandboxSessionState::Stopped),
        "failed" => Ok(SandboxSessionState::Failed),
        "destroying" => Ok(SandboxSessionState::Destroying),
        "destroyed" => Ok(SandboxSessionState::Destroyed),
        _ => Err(SandboxSessionRepositoryError::InvalidStoredData),
    }
}

fn sandbox_runtime_capability_value(sandbox_runtime_capability: RuntimeCapability) -> &'static str {
    match sandbox_runtime_capability {
        RuntimeCapability::Terminal => "terminal",
        RuntimeCapability::Filesystem => "filesystem",
        RuntimeCapability::Git => "git",
        RuntimeCapability::Build => "build",
        RuntimeCapability::Browser => "browser",
        RuntimeCapability::PortForward => "port_forward",
        RuntimeCapability::McpTransport => "mcp_transport",
        RuntimeCapability::Environment => "environment",
    }
}

fn parse_sandbox_runtime_capability(
    value: &str,
) -> SandboxSessionRepositoryResult<RuntimeCapability> {
    match value {
        "terminal" => Ok(RuntimeCapability::Terminal),
        "filesystem" => Ok(RuntimeCapability::Filesystem),
        "git" => Ok(RuntimeCapability::Git),
        "build" => Ok(RuntimeCapability::Build),
        "browser" => Ok(RuntimeCapability::Browser),
        "port_forward" => Ok(RuntimeCapability::PortForward),
        "mcp_transport" => Ok(RuntimeCapability::McpTransport),
        "environment" => Ok(RuntimeCapability::Environment),
        _ => Err(SandboxSessionRepositoryError::InvalidStoredData),
    }
}

pub(crate) fn sandbox_runtime_capabilities_value(
    sandbox_runtime_capabilities: &BTreeSet<RuntimeCapability>,
) -> Value {
    Value::Array(
        sandbox_runtime_capabilities
            .iter()
            .map(|sandbox_runtime_capability| {
                Value::String(
                    sandbox_runtime_capability_value(*sandbox_runtime_capability).to_string(),
                )
            })
            .collect(),
    )
}

pub(crate) fn parse_sandbox_runtime_capabilities(
    value: Value,
) -> SandboxSessionRepositoryResult<BTreeSet<RuntimeCapability>> {
    let Value::Array(values) = value else {
        return Err(SandboxSessionRepositoryError::InvalidStoredData);
    };
    let mut sandbox_runtime_capabilities = BTreeSet::new();
    for value in values {
        let Value::String(value) = value else {
            return Err(SandboxSessionRepositoryError::InvalidStoredData);
        };
        if !sandbox_runtime_capabilities.insert(parse_sandbox_runtime_capability(&value)?) {
            return Err(SandboxSessionRepositoryError::InvalidStoredData);
        }
    }
    Ok(sandbox_runtime_capabilities)
}

pub(crate) fn sandbox_isolation_assurance_value(
    sandbox_isolation_assurance: IsolationAssurance,
) -> &'static str {
    match sandbox_isolation_assurance {
        IsolationAssurance::HostUser => "host_user",
        IsolationAssurance::Container => "container",
        IsolationAssurance::UserSpaceKernel => "user_space_kernel",
        IsolationAssurance::MicroVm => "micro_vm",
        IsolationAssurance::DedicatedVm => "dedicated_vm",
    }
}

pub(crate) fn parse_sandbox_isolation_assurance(
    value: &str,
) -> SandboxSessionRepositoryResult<IsolationAssurance> {
    match value {
        "host_user" => Ok(IsolationAssurance::HostUser),
        "container" => Ok(IsolationAssurance::Container),
        "user_space_kernel" => Ok(IsolationAssurance::UserSpaceKernel),
        "micro_vm" => Ok(IsolationAssurance::MicroVm),
        "dedicated_vm" => Ok(IsolationAssurance::DedicatedVm),
        _ => Err(SandboxSessionRepositoryError::InvalidStoredData),
    }
}

pub(crate) fn sandbox_session_failure_value(
    sandbox_session_failure: SandboxSessionFailure,
) -> &'static str {
    match sandbox_session_failure {
        SandboxSessionFailure::Provider => "provider",
        SandboxSessionFailure::Readiness => "readiness",
        SandboxSessionFailure::Cleanup => "cleanup",
    }
}

pub(crate) fn parse_sandbox_session_failure(
    value: &str,
) -> SandboxSessionRepositoryResult<SandboxSessionFailure> {
    match value {
        "provider" => Ok(SandboxSessionFailure::Provider),
        "readiness" => Ok(SandboxSessionFailure::Readiness),
        "cleanup" => Ok(SandboxSessionFailure::Cleanup),
        _ => Err(SandboxSessionRepositoryError::InvalidStoredData),
    }
}

pub(crate) fn sandbox_operation_kind_value(
    sandbox_operation_kind: SandboxSessionOperationKind,
) -> &'static str {
    match sandbox_operation_kind {
        SandboxSessionOperationKind::Create => "create",
        SandboxSessionOperationKind::Start => "start",
        SandboxSessionOperationKind::Stop => "stop",
        SandboxSessionOperationKind::Destroy => "destroy",
    }
}

pub(crate) fn parse_sandbox_operation_kind(
    value: &str,
) -> SandboxSessionRepositoryResult<SandboxSessionOperationKind> {
    match value {
        "create" => Ok(SandboxSessionOperationKind::Create),
        "start" => Ok(SandboxSessionOperationKind::Start),
        "stop" => Ok(SandboxSessionOperationKind::Stop),
        "destroy" => Ok(SandboxSessionOperationKind::Destroy),
        _ => Err(SandboxSessionRepositoryError::InvalidStoredData),
    }
}

pub(crate) fn sandbox_operation_outcome_values(
    sandbox_operation_outcome: SandboxOperationOutcome,
) -> (&'static str, Option<&'static str>) {
    match sandbox_operation_outcome {
        SandboxOperationOutcome::InProgress => ("in_progress", None),
        SandboxOperationOutcome::Succeeded => ("succeeded", None),
        SandboxOperationOutcome::Failed(sandbox_session_failure) => (
            "failed",
            Some(sandbox_session_failure_value(sandbox_session_failure)),
        ),
    }
}

pub(crate) fn parse_sandbox_operation_outcome(
    sandbox_operation_outcome: &str,
    sandbox_session_failure: Option<&str>,
) -> SandboxSessionRepositoryResult<SandboxOperationOutcome> {
    match (sandbox_operation_outcome, sandbox_session_failure) {
        ("in_progress", None) => Ok(SandboxOperationOutcome::InProgress),
        ("succeeded", None) => Ok(SandboxOperationOutcome::Succeeded),
        ("failed", Some(sandbox_session_failure)) => Ok(SandboxOperationOutcome::Failed(
            parse_sandbox_session_failure(sandbox_session_failure)?,
        )),
        _ => Err(SandboxSessionRepositoryError::InvalidStoredData),
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use sdkwork_intelligence_sandbox_service::SandboxSessionRepositoryError;
    use sdkwork_sandbox_provider_spi::RuntimeCapability;
    use serde_json::json;

    use super::{parse_sandbox_runtime_capabilities, sandbox_runtime_capabilities_value};

    #[test]
    fn sandbox_capability_codec_is_canonical_and_rejects_duplicates() {
        let sandbox_capabilities =
            BTreeSet::from([RuntimeCapability::Filesystem, RuntimeCapability::Terminal]);
        let sandbox_value = sandbox_runtime_capabilities_value(&sandbox_capabilities);
        assert_eq!(
            parse_sandbox_runtime_capabilities(sandbox_value),
            Ok(sandbox_capabilities)
        );
        assert_eq!(
            parse_sandbox_runtime_capabilities(json!(["filesystem", "filesystem"])),
            Err(SandboxSessionRepositoryError::InvalidStoredData)
        );
    }
}
