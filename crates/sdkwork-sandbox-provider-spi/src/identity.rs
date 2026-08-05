use std::fmt;

use thiserror::Error;
use uuid::Uuid;
use zeroize::Zeroize;

const MAX_OPAQUE_ID_LENGTH: usize = 128;
const MAX_PRIVATE_REFERENCE_LENGTH: usize = 2_048;

#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum SandboxIdentifierError {
    #[error("{field} must be a non-empty opaque identifier of at most {max_length} safe ASCII characters")]
    InvalidOpaqueId {
        field: &'static str,
        max_length: usize,
    },
    #[error("provider allocation reference is invalid")]
    InvalidProviderAllocationReference,
    #[error("sandbox fencing token must be between 1 and the signed 64-bit maximum")]
    InvalidFencingToken,
}

fn validate_opaque_id(value: &str, field: &'static str) -> Result<(), SandboxIdentifierError> {
    let valid = !value.is_empty()
        && value.len() <= MAX_OPAQUE_ID_LENGTH
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'));

    if valid {
        Ok(())
    } else {
        Err(SandboxIdentifierError::InvalidOpaqueId {
            field,
            max_length: MAX_OPAQUE_ID_LENGTH,
        })
    }
}

macro_rules! opaque_id {
    ($name:ident, $field:literal) => {
        #[derive(Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
        pub struct $name(String);

        impl $name {
            pub fn parse(value: impl Into<String>) -> Result<Self, SandboxIdentifierError> {
                let value = value.into();
                validate_opaque_id(&value, $field)?;
                Ok(Self(value))
            }

            pub fn as_str(&self) -> &str {
                &self.0
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str(&self.0)
            }
        }
    };
}

macro_rules! generated_opaque_id {
    ($name:ident, $field:literal) => {
        opaque_id!($name, $field);

        impl $name {
            pub fn generate() -> Self {
                Self(Uuid::new_v4().to_string())
            }
        }
    };
}

opaque_id!(TenantId, "tenantId");
opaque_id!(SandboxWorkspaceId, "sandboxWorkspaceId");
opaque_id!(SandboxSessionId, "sandboxSessionId");
opaque_id!(SandboxProviderId, "sandboxProviderId");
opaque_id!(SandboxProviderKind, "sandboxProviderKind");
generated_opaque_id!(SandboxId, "sandboxId");
generated_opaque_id!(SandboxRuntimeBindingId, "sandboxRuntimeBindingId");
generated_opaque_id!(OperationId, "sandboxOperationId");
generated_opaque_id!(SandboxLeaseOwnerId, "sandboxLeaseOwnerId");

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct SandboxFencingToken(u64);

impl SandboxFencingToken {
    pub fn new(value: u64) -> Result<Self, SandboxIdentifierError> {
        if value == 0 || value > i64::MAX as u64 {
            return Err(SandboxIdentifierError::InvalidFencingToken);
        }
        Ok(Self(value))
    }

    pub fn value(self) -> u64 {
        self.0
    }
}

impl fmt::Display for SandboxFencingToken {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(formatter)
    }
}

#[derive(Clone, Eq, Hash, PartialEq)]
pub struct SandboxProviderAllocationRef(String);

impl SandboxProviderAllocationRef {
    pub fn new(value: impl Into<String>) -> Result<Self, SandboxIdentifierError> {
        let mut value = value.into();
        let valid = !value.is_empty()
            && value.len() <= MAX_PRIVATE_REFERENCE_LENGTH
            && !value.chars().any(char::is_control);
        if valid {
            Ok(Self(value))
        } else {
            value.zeroize();
            Err(SandboxIdentifierError::InvalidProviderAllocationReference)
        }
    }

    /// Returns provider-private data for the owning adapter only.
    pub fn expose_to_provider(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for SandboxProviderAllocationRef {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("SandboxProviderAllocationRef([REDACTED])")
    }
}

impl Drop for SandboxProviderAllocationRef {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

#[cfg(test)]
mod tests {
    use super::{
        SandboxFencingToken, SandboxIdentifierError, SandboxProviderAllocationRef, TenantId,
    };

    #[test]
    fn rejects_path_like_tenant_identifiers() {
        assert!(TenantId::parse("../tenant-a").is_err());
        assert!(TenantId::parse("tenant a").is_err());
        assert!(TenantId::parse("tenant-a").is_ok());
    }

    #[test]
    fn sandbox_provider_reference_debug_output_is_redacted() {
        let sandbox_provider_allocation_reference =
            SandboxProviderAllocationRef::new("private-host-path");
        assert!(sandbox_provider_allocation_reference.is_ok());
        let sandbox_debug_output = format!("{sandbox_provider_allocation_reference:?}");
        assert_eq!(
            sandbox_debug_output,
            "Ok(SandboxProviderAllocationRef([REDACTED]))"
        );
        assert!(!sandbox_debug_output.contains("private-host-path"));
    }

    #[test]
    fn sandbox_fencing_token_rejects_zero_and_signed_maximum_overflow() {
        assert!(matches!(
            SandboxFencingToken::new(0),
            Err(SandboxIdentifierError::InvalidFencingToken)
        ));
        assert!(matches!(
            SandboxFencingToken::new(i64::MAX as u64 + 1),
            Err(SandboxIdentifierError::InvalidFencingToken)
        ));
        let sandbox_maximum_token = SandboxFencingToken::new(i64::MAX as u64)
            .unwrap_or_else(|error| panic!("signed maximum fencing token must be valid: {error}"));
        assert_eq!(sandbox_maximum_token.value(), i64::MAX as u64);
        assert_eq!(sandbox_maximum_token.to_string(), i64::MAX.to_string());
    }
}
