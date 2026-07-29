#![forbid(unsafe_code)]
//! Phase 0 boundary for the local Sandbox provider adapter.
//!
//! Host process, filesystem, network, browser, and terminal access are not
//! implemented until capability and isolation policies are approved.

#[cfg(test)]
mod fake_host_boundary;
