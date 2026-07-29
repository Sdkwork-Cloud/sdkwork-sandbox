use std::collections::BTreeMap;

use super::{SandboxFakeHostBoundary, SandboxFakeHostBoundaryError};

#[test]
fn sandbox_fake_host_boundary_preserves_typed_arguments_without_shell_parsing() {
    let sandbox_fake_host_boundary = SandboxFakeHostBoundary::for_test(&["cargo"], &["PATH"]);
    let sandbox_environment = BTreeMap::from([("PATH", "sandbox-toolchain")]);

    let sandbox_result = sandbox_fake_host_boundary.validate_sandbox_command(
        "cargo",
        &["test", "--", "name;$(not-a-shell)"],
        "workspace/src",
        &sandbox_environment,
    );

    assert_eq!(sandbox_result, Ok(()));
}

#[test]
fn sandbox_fake_host_boundary_rejects_path_escape_and_windows_path_hazards() {
    let sandbox_fake_host_boundary = SandboxFakeHostBoundary::for_test(&["cargo"], &[]);

    for sandbox_working_directory in [
        "",
        ".",
        "..",
        "../outside",
        "workspace/../outside",
        "/host/root",
        "C:\\host\\root",
        "\\\\server\\share",
        "workspace/NUL.txt",
        "workspace/file:stream",
        "workspace/trailing. ",
    ] {
        let sandbox_result = sandbox_fake_host_boundary.validate_sandbox_command(
            "cargo",
            &[],
            sandbox_working_directory,
            &BTreeMap::new(),
        );

        assert_eq!(
            sandbox_result,
            Err(SandboxFakeHostBoundaryError::WorkingDirectoryInvalid),
            "sandbox path should be rejected: {sandbox_working_directory:?}"
        );
    }
}

#[test]
fn sandbox_fake_host_boundary_denies_command_strings_and_ambient_credentials() {
    let sandbox_fake_host_boundary = SandboxFakeHostBoundary::for_test(&["cargo"], &["PATH"]);

    let sandbox_command_string_result = sandbox_fake_host_boundary.validate_sandbox_command(
        "cargo test",
        &[],
        "workspace",
        &BTreeMap::new(),
    );
    assert_eq!(
        sandbox_command_string_result,
        Err(SandboxFakeHostBoundaryError::ExecutableDenied)
    );

    let sandbox_credential_environment =
        BTreeMap::from([("AWS_SECRET_ACCESS_KEY", "not-a-real-secret")]);
    let sandbox_environment_result = sandbox_fake_host_boundary.validate_sandbox_command(
        "cargo",
        &[],
        "workspace",
        &sandbox_credential_environment,
    );
    assert_eq!(
        sandbox_environment_result,
        Err(SandboxFakeHostBoundaryError::EnvironmentDenied)
    );
}

#[test]
fn sandbox_fake_host_boundary_enforces_argument_and_environment_bounds() {
    let sandbox_fake_host_boundary = SandboxFakeHostBoundary::for_test(&["cargo"], &["PATH"]);
    let sandbox_arguments = vec!["argument"; 17];

    let sandbox_argument_result = sandbox_fake_host_boundary.validate_sandbox_command(
        "cargo",
        &sandbox_arguments,
        "workspace",
        &BTreeMap::new(),
    );
    assert_eq!(
        sandbox_argument_result,
        Err(SandboxFakeHostBoundaryError::ArgumentCountExceeded)
    );

    let sandbox_invalid_environment = BTreeMap::from([("Path", "sandbox-toolchain")]);
    let sandbox_environment_result = sandbox_fake_host_boundary.validate_sandbox_command(
        "cargo",
        &[],
        "workspace",
        &sandbox_invalid_environment,
    );
    assert_eq!(
        sandbox_environment_result,
        Err(SandboxFakeHostBoundaryError::EnvironmentNameInvalid)
    );

    let sandbox_long_argument = "a".repeat(257);
    let sandbox_argument_bytes_result = sandbox_fake_host_boundary.validate_sandbox_command(
        "cargo",
        &[sandbox_long_argument.as_str()],
        "workspace",
        &BTreeMap::new(),
    );
    assert_eq!(
        sandbox_argument_bytes_result,
        Err(SandboxFakeHostBoundaryError::ArgumentInvalid)
    );

    let sandbox_environment_value_result = sandbox_fake_host_boundary.validate_sandbox_command(
        "cargo",
        &[],
        "workspace",
        &BTreeMap::from([("PATH", "invalid\0value")]),
    );
    assert_eq!(
        sandbox_environment_value_result,
        Err(SandboxFakeHostBoundaryError::EnvironmentValueInvalid)
    );
}

#[test]
fn sandbox_fake_host_boundary_enforces_environment_entry_bound() {
    let sandbox_environment_names = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    let sandbox_fake_host_boundary =
        SandboxFakeHostBoundary::for_test(&["cargo"], &sandbox_environment_names);
    let sandbox_environment = BTreeMap::from([
        ("A", "1"),
        ("B", "2"),
        ("C", "3"),
        ("D", "4"),
        ("E", "5"),
        ("F", "6"),
        ("G", "7"),
        ("H", "8"),
        ("I", "9"),
    ]);

    let sandbox_result = sandbox_fake_host_boundary.validate_sandbox_command(
        "cargo",
        &[],
        "workspace",
        &sandbox_environment,
    );
    assert_eq!(
        sandbox_result,
        Err(SandboxFakeHostBoundaryError::EnvironmentCountExceeded)
    );
}
