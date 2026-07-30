import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const contractUrl = new URL("../../specs/sandbox-standalone-data-residency.contract.json", import.meta.url);
const contract = JSON.parse(await readFile(contractUrl, "utf8"));

test("Standalone data residency remains a draft non-runtime release gate", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.standalone-data-residency");
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0022");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract["x-sdkwork-no-runtime-wiring"], true);
  assert.equal(contract["x-sdkwork-no-database-or-migration"], true);
  assert.equal(contract["x-sdkwork-no-cross-repository-source-change"], true);
  assert.equal(contract["x-sdkwork-no-production-claim"], true);
});

test("Standalone topology and Local provider do not imply device locality", () => {
  assert.equal(contract.scope.sandbox_execution_profile_id, "sandbox_standalone_local");
  assert.equal(contract.scope.sandbox_deployment_profile_alone_proves_device_locality, false);
  assert.equal(contract.scope.sandbox_provider_kind_alone_proves_device_locality, false);
  assert.equal(contract.scope.sandbox_cross_repository_evidence_required, true);
  assert.equal(contract.readiness.sandbox_unknown_or_missing_evidence_is_ready, false);
});

test("Persistence and strict processing claims cannot silently degrade", () => {
  const claims = new Map(contract.claimModes.map((claim) => [claim.sandbox_claim_mode, claim]));
  assert.deepEqual([...claims.keys()], [
    "device-local-persistence",
    "strict-device-local-processing",
  ]);
  assert.equal(claims.get("device-local-persistence").sandbox_remote_durable_copy_allowed, false);
  assert.equal(
    claims.get("device-local-persistence").sandbox_external_processing_requires_separate_user_authorized_grant,
    true,
  );
  assert.equal(claims.get("strict-device-local-processing").sandbox_content_egress_allowed, false);
  assert.equal(
    claims.get("strict-device-local-processing").sandbox_unavailable_when_external_processing_is_required,
    true,
  );
});

test("Every Local coding data class has one explicit owner and lifecycle", () => {
  const expected = [
    "sandbox_workspace_source",
    "sandbox_agents_business_state",
    "sandbox_kernel_transient_execution_state",
    "sandbox_control_state",
    "sandbox_runtime_root",
    "sandbox_build_cache",
    "sandbox_logs_and_audit",
    "sandbox_secrets_and_credentials",
    "sandbox_temporary_and_output_data",
    "sandbox_checkpoint_candidate",
    "sandbox_birdcoder_device_facts",
  ];
  const ids = contract.authorityMatrix.map((entry) => entry.sandbox_data_class_id);
  assert.deepEqual(ids, expected);
  assert.equal(new Set(ids).size, expected.length);
  for (const entry of contract.authorityMatrix) {
    assert.ok(entry.sandbox_owner);
    assert.ok(entry.sandbox_persistence_role);
    assert.ok(entry.sandbox_backup_policy);
    assert.ok(entry.sandbox_purge_policy);
    assert.ok(entry.sandbox_classification.length > 0);
  }
});

test("Database roles keep local physical placement separate from authority", () => {
  const policy = contract.databaseRolePolicy;
  assert.equal(policy.sandbox_agents_business_state_role, "authoritative-server-postgresql");
  assert.equal(policy.sandbox_sandbox_control_state_role, "authoritative-server-postgresql");
  assert.equal(policy.sandbox_server_sqlite_fallback_allowed, false);
  assert.equal(policy.sandbox_remote_postgresql_endpoint_allowed_for_device_local_claim, false);
  assert.equal(policy.sandbox_kernel_embedded_sqlite_requires_database_role, "client-local");
  assert.equal(policy.sandbox_kernel_service_database_role, "authoritative-server-postgresql");
  assert.equal(policy.sandbox_birdcoder_sqlite_when_present_requires_database_role, "client-local");
  assert.equal(policy.sandbox_database_role_selected_from_connection_string, false);
});

test("Workspace, service state and runtime directories use distinct capabilities", () => {
  const runtime = contract.runtimeDirectoryPolicy;
  assert.equal(runtime.sandbox_application_code, "sandbox");
  assert.equal(runtime.sandbox_user_private_root, "~/.sdkwork/sandbox");
  assert.deepEqual(runtime.sandbox_required_distinct_capabilities, [
    "sandbox_workspace_capability",
    "sandbox_service_data_capability",
    "sandbox_runtime_root_capability",
    "sandbox_cache_capability",
    "sandbox_log_capability",
    "sandbox_secret_capability",
    "sandbox_temp_capability",
  ]);
  assert.equal(runtime.sandbox_source_repository_sdkwork_directory_is_runtime_root, false);
  assert.equal(runtime.sandbox_ids_may_be_converted_to_host_paths, false);
  assert.equal(runtime.sandbox_raw_host_root_input_allowed, false);
});

test("Cleanup, reset and uninstall preserve user-owned Workspace data", () => {
  const cleanup = contract.separationAndCleanup;
  assert.equal(cleanup.sandbox_workspace_and_runtime_share_writable_root, false);
  assert.equal(cleanup.sandbox_workspace_deleted_by_runtime_cleanup, false);
  assert.equal(cleanup.sandbox_workspace_deleted_by_default_reset, false);
  assert.equal(cleanup.sandbox_workspace_deleted_by_uninstall, false);
  assert.equal(cleanup.sandbox_runtime_release_requires_temp_cache_runtime_cleanup_evidence, true);
  assert.equal(cleanup.sandbox_cleanup_uncertainty_reports_failure_and_quarantines_binding, true);
  assert.equal(cleanup.sandbox_checkpoint_handoff_precedes_runtime_release, true);
});

test("Remote storage, synchronization, backup and telemetry are denied by default", () => {
  const transfer = contract.transferAndSync;
  assert.equal(transfer.sandbox_default_remote_storage_sync_backup_telemetry_action, "deny");
  assert.equal(transfer.sandbox_local_mode_implies_external_processing_consent, false);
  assert.equal(transfer.sandbox_optional_sync_is_owned_by_sandbox, false);
  assert.equal(transfer.sandbox_cloud_fallback_on_local_failure_allowed, false);
  assert.equal(
    transfer.sandbox_strict_mode_source_prompt_transcript_artifact_secret_diagnostic_egress_allowed,
    false,
  );
  assert.deepEqual(transfer.sandbox_optional_transfer_requires, [
    "sandbox_user_or_operator_authorization",
    "sandbox_data_category_disclosure",
    "sandbox_destination_and_region_disclosure",
    "sandbox_purpose_and_retention_disclosure",
    "sandbox_revocation_and_deletion_path",
    "sandbox_agents_or_drive_owned_sync_conflict_contract",
  ]);
});

test("Backup is local, role-correct, encrypted and restore-verified", () => {
  const backup = contract.backupAndRecovery;
  assert.equal(backup.sandbox_backup_default, "local-opt-in");
  assert.equal(backup.sandbox_tenant_personal_backup_encryption_required, true);
  assert.equal(backup.sandbox_integrity_manifest_required, true);
  assert.equal(backup.sandbox_postgresql_live_file_copy_allowed, false);
  assert.equal(backup.sandbox_postgresql_database_aware_backup_required, true);
  assert.equal(backup.sandbox_sqlite_supported_online_backup_or_snapshot_required, true);
  assert.equal(backup.sandbox_workspace_included_by_default, false);
  assert.equal(backup.sandbox_secrets_included_by_default, false);
  assert.equal(backup.sandbox_restore_test_required, true);
  assert.equal(backup.sandbox_successful_backup_job_is_restore_evidence, false);
});

test("Export and purge cover derived copies without conflating uninstall", () => {
  const lifecycle = contract.retentionExportDeletion;
  assert.equal(lifecycle.sandbox_owner_approved_bounded_retention_required_for_every_persisted_class, true);
  assert.equal(lifecycle.sandbox_export_inventory_includes_primary_checkpoint_log_and_derived_data, true);
  assert.equal(
    lifecycle.sandbox_purge_inventory_includes_primary_checkpoint_log_cache_temp_derived_and_backup_data,
    true,
  );
  assert.equal(lifecycle.sandbox_purge_requires_scope_confirmation_idempotency_progress_and_audit, true);
  assert.equal(lifecycle.sandbox_partial_or_uncertain_purge_may_report_complete, false);
  assert.equal(lifecycle.sandbox_uninstall_is_privacy_purge, false);
  assert.equal(lifecycle.sandbox_default_uninstall_preserves_workspace, true);
});

test("Local storage failures fail closed without Cloud fallback or data loss", () => {
  const failure = contract.failureHandling;
  assert.equal(failure.sandbox_missing_or_ambiguous_locality_action, "not-ready");
  assert.equal(failure.sandbox_missing_capability_action, "not-ready");
  assert.equal(failure.sandbox_local_database_unavailable_action, "not-ready");
  assert.equal(failure.sandbox_disk_full_action, "stop-new-writes-drain-and-report-safe-error");
  assert.equal(failure.sandbox_corruption_action, "isolate-store-stop-mutations-and-require-recovery");
  assert.equal(failure.sandbox_failure_may_trigger_implicit_cloud_fallback, false);
  assert.equal(failure.sandbox_failure_may_silently_discard_authoritative_data, false);
});

test("Four-repository release evidence and privacy-safe telemetry remain mandatory", () => {
  assert.deepEqual(contract.crossRepositoryEvidence.sandbox_required_repositories, [
    "sdkwork-birdcoder",
    "sdkwork-agents",
    "sdkwork-kernel",
    "sdkwork-sandbox",
  ]);
  assert.equal(contract.crossRepositoryEvidence.sandbox_required_evidence.length, 9);
  assert.equal(contract.crossRepositoryEvidence.sandbox_cross_repository_source_change_requires_human_review, true);
  assert.equal(contract.telemetryAndSupport.sandbox_standalone_telemetry_default, "disabled-or-explicit-privacy-safe-opt-in");
  assert.equal(contract.telemetryAndSupport.sandbox_source_prompt_transcript_artifact_content_allowed, false);
  assert.equal(contract.telemetryAndSupport.sandbox_metrics_may_prove_data_residency, false);
  assert.equal(contract.readiness.sandbox_all_data_classes_require_evidence, true);
  assert.equal(contract.readiness.sandbox_static_contract_is_runtime_evidence, false);
  assert.equal(contract.humanReview.required, true);
  assert.equal(contract.humanReview.sandbox_approved_outcome_required_before_implementation, true);
});

