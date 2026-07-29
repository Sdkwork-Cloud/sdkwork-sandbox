use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SandboxFakeHostBoundaryError {
    ExecutableDenied,
    ArgumentCountExceeded,
    ArgumentInvalid,
    WorkingDirectoryInvalid,
    EnvironmentCountExceeded,
    EnvironmentNameInvalid,
    EnvironmentDenied,
    EnvironmentValueInvalid,
}

struct SandboxFakeHostBoundary {
    sandbox_allowed_executables: BTreeSet<String>,
    sandbox_allowed_environment: BTreeSet<String>,
    sandbox_max_arguments: usize,
    sandbox_max_argument_bytes: usize,
    sandbox_max_working_directory_bytes: usize,
    sandbox_max_environment_entries: usize,
    sandbox_max_environment_name_bytes: usize,
    sandbox_max_environment_value_bytes: usize,
}

impl SandboxFakeHostBoundary {
    fn for_test(
        sandbox_allowed_executables: &[&str],
        sandbox_allowed_environment: &[&str],
    ) -> Self {
        Self {
            sandbox_allowed_executables: sandbox_allowed_executables
                .iter()
                .map(|sandbox_executable| (*sandbox_executable).to_owned())
                .collect(),
            sandbox_allowed_environment: sandbox_allowed_environment
                .iter()
                .map(|sandbox_environment_name| (*sandbox_environment_name).to_owned())
                .collect(),
            sandbox_max_arguments: 16,
            sandbox_max_argument_bytes: 256,
            sandbox_max_working_directory_bytes: 512,
            sandbox_max_environment_entries: 8,
            sandbox_max_environment_name_bytes: 64,
            sandbox_max_environment_value_bytes: 1_024,
        }
    }

    fn validate_sandbox_command(
        &self,
        sandbox_executable: &str,
        sandbox_arguments: &[&str],
        sandbox_working_directory: &str,
        sandbox_environment: &BTreeMap<&str, &str>,
    ) -> Result<(), SandboxFakeHostBoundaryError> {
        if !self
            .sandbox_allowed_executables
            .contains(sandbox_executable)
        {
            return Err(SandboxFakeHostBoundaryError::ExecutableDenied);
        }

        if sandbox_arguments.len() > self.sandbox_max_arguments {
            return Err(SandboxFakeHostBoundaryError::ArgumentCountExceeded);
        }
        if sandbox_arguments.iter().any(|sandbox_argument| {
            sandbox_argument.as_bytes().contains(&0)
                || sandbox_argument.len() > self.sandbox_max_argument_bytes
        }) {
            return Err(SandboxFakeHostBoundaryError::ArgumentInvalid);
        }

        if !is_valid_sandbox_logical_relative_path(
            sandbox_working_directory,
            self.sandbox_max_working_directory_bytes,
        ) {
            return Err(SandboxFakeHostBoundaryError::WorkingDirectoryInvalid);
        }

        if sandbox_environment.len() > self.sandbox_max_environment_entries {
            return Err(SandboxFakeHostBoundaryError::EnvironmentCountExceeded);
        }
        for (sandbox_environment_name, sandbox_environment_value) in sandbox_environment {
            if !is_valid_sandbox_environment_name(
                sandbox_environment_name,
                self.sandbox_max_environment_name_bytes,
            ) {
                return Err(SandboxFakeHostBoundaryError::EnvironmentNameInvalid);
            }
            if !self
                .sandbox_allowed_environment
                .contains(*sandbox_environment_name)
            {
                return Err(SandboxFakeHostBoundaryError::EnvironmentDenied);
            }
            if sandbox_environment_value.as_bytes().contains(&0)
                || sandbox_environment_value.len() > self.sandbox_max_environment_value_bytes
            {
                return Err(SandboxFakeHostBoundaryError::EnvironmentValueInvalid);
            }
        }

        Ok(())
    }
}

fn is_valid_sandbox_logical_relative_path(
    sandbox_path: &str,
    sandbox_max_path_bytes: usize,
) -> bool {
    if sandbox_path.is_empty()
        || sandbox_path.len() > sandbox_max_path_bytes
        || sandbox_path.as_bytes().contains(&0)
        || sandbox_path.starts_with('/')
        || sandbox_path.starts_with('\\')
    {
        return false;
    }

    let sandbox_path_bytes = sandbox_path.as_bytes();
    if sandbox_path_bytes.len() >= 2
        && sandbox_path_bytes[0].is_ascii_alphabetic()
        && sandbox_path_bytes[1] == b':'
    {
        return false;
    }

    sandbox_path
        .split(['/', '\\'])
        .all(is_valid_sandbox_logical_path_segment)
}

fn is_valid_sandbox_logical_path_segment(sandbox_path_segment: &str) -> bool {
    if sandbox_path_segment.is_empty()
        || matches!(sandbox_path_segment, "." | "..")
        || sandbox_path_segment.ends_with(['.', ' '])
        || sandbox_path_segment.contains(':')
        || sandbox_path_segment.chars().any(char::is_control)
    {
        return false;
    }

    let sandbox_base_name = sandbox_path_segment
        .split_once('.')
        .map_or(sandbox_path_segment, |(sandbox_base_name, _)| {
            sandbox_base_name
        });
    !is_reserved_sandbox_windows_device_name(sandbox_base_name)
}

fn is_reserved_sandbox_windows_device_name(sandbox_base_name: &str) -> bool {
    let sandbox_uppercase_name = sandbox_base_name.to_ascii_uppercase();
    matches!(
        sandbox_uppercase_name.as_str(),
        "CON" | "PRN" | "AUX" | "NUL"
    ) || (sandbox_uppercase_name.len() == 4
        && (sandbox_uppercase_name.starts_with("COM") || sandbox_uppercase_name.starts_with("LPT"))
        && matches!(sandbox_uppercase_name.as_bytes()[3], b'1'..=b'9'))
}

fn is_valid_sandbox_environment_name(
    sandbox_environment_name: &str,
    sandbox_max_environment_name_bytes: usize,
) -> bool {
    let mut sandbox_environment_name_bytes = sandbox_environment_name.bytes();
    let Some(sandbox_first_byte) = sandbox_environment_name_bytes.next() else {
        return false;
    };

    sandbox_environment_name.len() <= sandbox_max_environment_name_bytes
        && (sandbox_first_byte.is_ascii_uppercase() || sandbox_first_byte == b'_')
        && sandbox_environment_name_bytes.all(|sandbox_byte| {
            sandbox_byte.is_ascii_uppercase()
                || sandbox_byte.is_ascii_digit()
                || sandbox_byte == b'_'
        })
}

#[cfg(test)]
mod tests;
