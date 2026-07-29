#![forbid(unsafe_code)]
//! PostgreSQL persistence adapter for SDKWork Sandbox lifecycle state.

mod codec;
mod encryption;
mod reencryption;
mod repository;

pub use encryption::{
    SandboxProviderAllocationKey, SandboxProviderAllocationKeySource,
    SdkworkUtilsSandboxProviderAllocationProtector,
};
pub use reencryption::SandboxProviderAllocationReencryptionPage;
pub use repository::SqlxSandboxSessionRepository;
