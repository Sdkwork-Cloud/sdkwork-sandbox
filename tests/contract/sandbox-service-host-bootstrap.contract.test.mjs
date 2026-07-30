import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contractPath = path.join(
  repoRoot,
  "crates/sdkwork-sandbox-service-host/specs/sandbox-service-host-bootstrap.contract.json",
);
const componentPath = path.join(
  repoRoot,
  "crates/sdkwork-sandbox-service-host/specs/component.spec.json",
);
const cargoPath = path.join(repoRoot, "crates/sdkwork-sandbox-service-host/Cargo.toml");
const sourcePath = path.join(repoRoot, "crates/sdkwork-sandbox-service-host/src/lib.rs");
const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const component = JSON.parse(readFileSync(componentPath, "utf8"));

test("Service Host Bootstrap remains a draft non-implementation contract", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.service-host-bootstrap-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0009");
  assert.equal(contract.component, "sdkwork-sandbox-service-host");
  assert.equal(contract.layerRole, "runtime-service-host");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract["x-sdkwork-require-human-review"], true);
  for (const sandbox_flag of [
    "x-sdkwork-no-runtime-implementation",
    "x-sdkwork-no-config-or-etc-materialization",
    "x-sdkwork-no-secret-kms-implementation",
    "x-sdkwork-no-database-or-cache-implementation",
    "x-sdkwork-no-telemetry-or-outbox-implementation",
    "x-sdkwork-no-deployment",
  ]) {
    assert.equal(contract[sandbox_flag], true);
  }
});

test("Bootstrap ownership keeps mechanisms outside the Service Host", () => {
  const sandbox_ownership = contract.ownership;
  assert.equal(sandbox_ownership.sandbox_normalized_config_owner, "sdkwork-sandbox-service-host");
  assert.equal(
    sandbox_ownership.sandbox_database_pool_and_credential_owner,
    "approved-database-composition",
  );
  assert.equal(
    sandbox_ownership.sandbox_repository_port_owner,
    "sdkwork-intelligence-sandbox-service",
  );
  assert.equal(sandbox_ownership.sandbox_service_host_owns_database_pool, false);
  assert.equal(sandbox_ownership.sandbox_service_host_owns_database_migration, false);
  assert.equal(sandbox_ownership.sandbox_service_host_owns_secret_resolution, false);
  assert.equal(sandbox_ownership.sandbox_service_host_owns_telemetry_exporter, false);
});

test("Source config has the exact profile matrix and contains only safe values", () => {
  const sandbox_source = contract.sourceConfig;
  assert.deepEqual(sandbox_source.sandbox_supported_profile_ids, [
    "standalone.development",
    "standalone.test",
    "standalone.staging",
    "standalone.production",
    "cloud.development",
    "cloud.test",
    "cloud.staging",
    "cloud.production",
  ]);
  assert.equal(
    new Set(sandbox_source.sandbox_supported_profile_ids).size,
    sandbox_source.sandbox_supported_profile_ids.length,
  );
  assert.equal(sandbox_source.sandbox_runtime_target, "server");
  assert.deepEqual(sandbox_source.sandbox_safe_config_precedence, [
    "source-etc-profile",
    "installed-operator-config",
    "process-environment-safe-overrides",
    "cli-safe-overrides",
  ]);
  assert.equal(sandbox_source.sandbox_override_source_provenance_required, true);
  assert.equal(sandbox_source.sandbox_unknown_override_key_rejected, true);
  assert.equal(sandbox_source.sandbox_secret_resolution_is_separate_from_safe_config_precedence, true);
  assert.equal(sandbox_source.sandbox_service_host_reads_process_environment, false);
  assert.equal(sandbox_source.sandbox_profile_identity_override_allowed, false);
  assert.equal(sandbox_source.sandbox_unknown_profile_fallback_allowed, false);
  assert.equal(sandbox_source.sandbox_cloud_to_standalone_fallback_allowed, false);
  assert.equal(sandbox_source.sandbox_production_to_nonproduction_fallback_allowed, false);
  assert.equal(sandbox_source.sandbox_source_etc_materialization_authorized, false);
  for (const sandbox_forbidden_field of [
    "sandbox_database_url",
    "sandbox_database_password",
    "sandbox_secret_material",
    "sandbox_raw_key",
    "sandbox_token",
    "sandbox_private_key",
    "sandbox_physical_runtime_path",
  ]) {
    assert.ok(sandbox_source.sandbox_forbidden_fields.includes(sandbox_forbidden_field));
  }
});

test("Normalized config and composition inputs contain no mechanism-private values", () => {
  const sandbox_config = contract.normalizedConfig;
  assert.equal(sandbox_config.type, "SandboxServiceHostConfig");
  assert.equal(sandbox_config.candidatePublicExportAuthorized, false);
  assert.equal(sandbox_config.sandbox_profile_id_matches_deployment_profile_and_environment, true);
  assert.equal(sandbox_config.sandbox_contains_secret_material, false);
  assert.equal(sandbox_config.sandbox_contains_database_connection_material, false);
  assert.equal(sandbox_config.sandbox_contains_physical_runtime_paths, false);

  const sandbox_inputs = contract.compositionInputs;
  assert.ok(sandbox_inputs.sandbox_required_inputs.includes("SandboxSessionRepository"));
  assert.ok(
    sandbox_inputs.sandbox_required_inputs.includes("SandboxRuntimeDirectoryCapabilities"),
  );
  assert.equal(sandbox_inputs.sandbox_inputs_are_preconstructed_or_opened, true);
  assert.equal(sandbox_inputs.sandbox_missing_input_fails_before_serving, true);
  assert.equal(sandbox_inputs.sandbox_concrete_sqlx_pool_exposed_to_service_host, false);
  assert.equal(sandbox_inputs.sandbox_raw_secret_value_exposed_to_service_host, false);
  assert.equal(sandbox_inputs.sandbox_raw_runtime_path_exposed_to_service_host, false);
});

test("Runtime directories are preopened least-privilege capabilities", () => {
  const sandbox_runtime = contract.runtimeDirectoryCapabilities;
  assert.equal(sandbox_runtime.type, "SandboxRuntimeDirectoryCapabilities");
  assert.equal(sandbox_runtime.sandbox_application_code, "sandbox");
  assert.deepEqual(sandbox_runtime.sandbox_required_roles, [
    "sandbox_runtime_state",
    "sandbox_temporary",
    "sandbox_cache",
    "sandbox_logs",
  ]);
  assert.equal(sandbox_runtime.sandbox_opened_by_runtime_bootstrap, true);
  assert.equal(sandbox_runtime.sandbox_handle_relative_access_required, true);
  assert.equal(sandbox_runtime.sandbox_no_follow_required, true);
  assert.equal(sandbox_runtime.sandbox_file_identity_verification_required, true);
  assert.equal(sandbox_runtime.sandbox_least_privilege_permissions_required, true);
  assert.equal(sandbox_runtime.sandbox_role_handles_must_not_alias, true);
  assert.equal(sandbox_runtime.sandbox_source_checkout_path_allowed, false);
  assert.equal(sandbox_runtime.sandbox_arbitrary_host_root_allowed, false);
  assert.equal(sandbox_runtime.sandbox_id_to_path_derivation_allowed, false);
  assert.equal(sandbox_runtime.sandbox_string_canonicalization_is_security_boundary, false);
});

test("Secret and key material stays behind bounded injected adapters", () => {
  const sandbox_secret = contract.secretBoundary;
  assert.equal(sandbox_secret.sandbox_source_config_contains_secret_material, false);
  assert.equal(sandbox_secret.sandbox_normalized_config_contains_secret_material, false);
  assert.equal(sandbox_secret.sandbox_ambient_cloud_or_host_credentials_allowed, false);
  assert.equal(
    sandbox_secret.sandbox_secret_values_in_host_or_bootstrap_process_environment_allowed,
    false,
  );
  assert.equal(sandbox_secret.sandbox_guest_or_command_secret_injection_defined_or_authorized, false);
  assert.equal(sandbox_secret.sandbox_secret_values_in_cli_arguments_allowed, false);
  assert.equal(
    sandbox_secret.sandbox_secret_values_in_logs_metrics_traces_events_or_readiness_allowed,
    false,
  );
  assert.equal(sandbox_secret.sandbox_key_material_uses_zeroizing_carrier, true);
  assert.equal(sandbox_secret.sandbox_key_id_version_material_immutability_required, true);
  assert.equal(sandbox_secret.sandbox_revoked_or_unknown_key_is_ready, false);
  assert.equal(sandbox_secret.sandbox_synchronous_remote_kms_on_async_executor_allowed, false);
  assert.equal(sandbox_secret.sandbox_remote_secret_operations_are_bounded_and_cancellable, true);
  assert.equal(sandbox_secret.sandbox_secret_cache_persistence_allowed, false);
  assert.equal(sandbox_secret.sandbox_secret_release_or_zeroization_on_shutdown_required, true);
});

test("Database composition is bounded and has no Redis or weak-store fallback", () => {
  const sandbox_database = contract.databaseComposition;
  assert.equal(sandbox_database.sandbox_authoritative_engine, "postgresql");
  assert.equal(sandbox_database.sandbox_database_composition_injects_repository_port, true);
  assert.equal(sandbox_database.sandbox_service_host_constructs_pool, false);
  assert.equal(sandbox_database.sandbox_service_host_receives_database_url_or_password, false);
  assert.equal(sandbox_database.sandbox_service_host_runs_migrations, false);
  assert.equal(sandbox_database.sandbox_memory_or_sqlite_server_fallback_allowed, false);
  assert.equal(sandbox_database.sandbox_profile_connection_budget_required, true);
  assert.equal(sandbox_database.sandbox_profile_connection_budget_exact_values_approved, false);
  assert.ok(sandbox_database.sandbox_connection_budget_bounds.sandbox_max_connections_max <= 256);
  assert.ok(
    sandbox_database.sandbox_connection_budget_bounds.sandbox_connect_timeout_ms_max <= 30000,
  );
  assert.equal(sandbox_database.sandbox_redis_enabled, false);
  assert.equal(sandbox_database.sandbox_redis_enablement_requires_separate_ready_requirement, true);
  assert.equal(sandbox_database.sandbox_implicit_cache_dependency_allowed, false);
});

test("Telemetry is bounded, redacted, and separate from audit authority", () => {
  const sandbox_telemetry = contract.telemetryBoundary;
  assert.equal(sandbox_telemetry.sandbox_adapter_required_before_serving, true);
  assert.equal(
    sandbox_telemetry.sandbox_adapter_readiness_requires_bounded_acceptance_redaction_and_drop_accounting,
    true,
  );
  assert.equal(sandbox_telemetry.sandbox_structured_redacted_observation_required, true);
  assert.equal(sandbox_telemetry.sandbox_low_cardinality_labels_required, true);
  assert.equal(sandbox_telemetry.sandbox_operational_export_uses_bounded_buffer, true);
  assert.equal(sandbox_telemetry.sandbox_operational_export_drop_counter_required, true);
  assert.equal(sandbox_telemetry.sandbox_exporter_outage_may_be_degraded_when_buffer_policy_holds, true);
  assert.equal(sandbox_telemetry.sandbox_exporter_degradation_is_separate_operational_health, true);
  assert.equal(
    sandbox_telemetry
      .sandbox_exporter_degradation_does_not_degrade_required_adapter_readiness_when_buffer_policy_holds,
    true,
  );
  assert.equal(sandbox_telemetry.sandbox_buffer_policy_failure_makes_adapter_not_ready, true);
  assert.equal(sandbox_telemetry.sandbox_exporter_outage_may_disable_redaction_or_drop_accounting, false);
  assert.equal(sandbox_telemetry.sandbox_metrics_logs_or_traces_are_audit_authority, false);
  assert.equal(sandbox_telemetry.sandbox_console_log_is_audit_or_outbox_authority, false);
  assert.equal(sandbox_telemetry.sandbox_security_audit_and_business_event_loss_allowed, false);
  assert.ok(sandbox_telemetry.sandbox_buffer_budget_bounds.sandbox_buffer_items_max <= 10000);
  assert.ok(sandbox_telemetry.sandbox_buffer_budget_bounds.sandbox_buffer_bytes_max <= 16777216);
});

test("Bootstrap and shutdown ordering are fixed, bounded, and failure-atomic", () => {
  const sandbox_bootstrap = contract.bootstrapOrder;
  assert.equal(sandbox_bootstrap.sandbox_stage_order_is_fixed, true);
  assert.equal(sandbox_bootstrap.sandbox_stage_deadline_required, true);
  assert.ok(sandbox_bootstrap.sandbox_total_bootstrap_timeout_ms_max <= 60000);
  assert.equal(sandbox_bootstrap.sandbox_partial_initialization_may_mark_serving, false);
  assert.equal(sandbox_bootstrap.sandbox_failure_releases_initialized_resources_in_reverse_order, true);
  assert.equal(sandbox_bootstrap.sandbox_failure_cleanup_is_bounded, true);
  assert.equal(sandbox_bootstrap.sandbox_cleanup_uncertainty_requires_operator_visible_not_ready, true);
  assert.equal(
    sandbox_bootstrap.sandbox_stages.at(-1),
    "sandbox_mark_serving",
  );

  const sandbox_shutdown = contract.shutdownOrder;
  assert.equal(sandbox_shutdown.sandbox_stop_new_lifecycle_side_effects_first, true);
  assert.equal(sandbox_shutdown.sandbox_idempotent, true);
  assert.equal(sandbox_shutdown.sandbox_deadline_required, true);
  assert.equal(sandbox_shutdown.sandbox_timeout_is_operator_visible_failure, true);
  assert.equal(
    sandbox_shutdown.sandbox_stages.at(-1),
    "sandbox_close_runtime_directory_capabilities",
  );
});

test("Bootstrap Gate adds no executable surface or runtime dependency", () => {
  const sandbox_canonical_specs = new Set(
    component.canonicalSpecs.map((sandbox_spec) => sandbox_spec.file),
  );
  for (const sandbox_spec of [
    "CONFIG_SPEC.md",
    "RUNTIME_DIRECTORY_SPEC.md",
    "SECURITY_SPEC.md",
    "OBSERVABILITY_SPEC.md",
    "PERFORMANCE_SPEC.md",
  ]) {
    assert.ok(sandbox_canonical_specs.has(sandbox_spec));
  }
  assert.deepEqual(component.contracts.publicExports, []);
  assert.deepEqual(component.contracts.requiredPorts, []);
  assert.deepEqual(component.contracts.runtimeEntrypoints, []);
  assert.deepEqual(component.contracts.configKeys, []);

  const sandbox_cargo = readFileSync(cargoPath, "utf8");
  const sandbox_source = readFileSync(sourcePath, "utf8");
  assert.doesNotMatch(sandbox_cargo, /^\[dependencies\]$/mu);
  assert.doesNotMatch(sandbox_source, /\b(?:struct|trait)\s+SandboxServiceHost/u);
  assert.doesNotMatch(sandbox_source, /(?:std|tokio)::process|\/dev\/kvm|CreateProcess/u);
});
