import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(
    path.join(repoRoot, "specs/sandbox-workspace-block-device-attachment.contract.json"),
    "utf8",
  ),
);

test("Sandbox Workspace Block Device remains a draft non-runtime contract", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.workspace-block-device-attachment-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0013");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract.compositionPort.type, "SandboxWorkspaceAttachmentPort");
  assert.equal(contract.compositionPort.providerNeutral, true);
  assert.equal(contract.compositionPort.serviceHostInjectsOnlyThisPort, true);
  assert.equal(contract.compositionPort.providerBranchingAllowed, false);
  assert.equal(contract.mechanismPortCandidate.type, "SandboxWorkspaceBlockDevicePort");
  assert.equal(contract["x-sdkwork-require-human-review"], true);
  assert.equal(contract["x-sdkwork-no-runtime-implementation"], true);
  assert.equal(contract["x-sdkwork-no-storage-backend"], true);
  assert.equal(contract["x-sdkwork-no-kms-implementation"], true);
});

test("Sandbox Workspace Block Device operations and fields are closed and prefixed", () => {
  assert.deepEqual(
    contract.operations.map((sandbox_operation) => sandbox_operation.name),
    [
      "sandbox_prepare_workspace_attachment",
      "sandbox_attach_workspace_device",
      "sandbox_inspect_workspace_attachment",
      "sandbox_detach_workspace_device",
      "sandbox_sanitize_workspace_projection",
    ],
  );
  for (const sandbox_field of [
    ...contract.request.requiredFields,
    ...contract.grant.requiredFields,
    ...contract.result.safeFields,
  ]) {
    assert.match(sandbox_field, /^sandbox_/u);
  }
  assert.equal(contract.request.unknownFieldsRejected, true);
  assert.deepEqual(contract.request.workspaceMountModes, ["ReadOnly", "ReadWrite"]);
  assert.equal(contract.request.ambientTenantOrWorkspaceContextAllowed, false);
});

test("Sandbox Workspace ownership preserves Agents and Drive authorities", () => {
  const sandbox_ownership = contract.ownership;
  assert.equal(sandbox_ownership.sandbox_agents_owns_workspace_identity_lifecycle_authorization_and_retention, true);
  assert.equal(sandbox_ownership.sandbox_kernel_only_maps_authorized_opaque_identity, true);
  assert.equal(sandbox_ownership.sandbox_attachment_adapter_only_owns_runtime_projection, true);
  assert.equal(sandbox_ownership.sandbox_platform_file_or_object_storage_authority, "sdkwork-drive-when-applicable");
  assert.equal(
    sandbox_ownership.sandbox_block_volume_authority,
    "unresolved-requires-independent-ready-requirement",
  );
  assert.equal(sandbox_ownership.sandbox_stop_or_destroy_may_delete_agents_workspace, false);
  assert.equal(sandbox_ownership.sandbox_attachment_may_own_object_storage_lifecycle, false);
  assert.equal(sandbox_ownership.sandbox_direct_storage_provider_sdk_allowed, false);
});

test("Sandbox Workspace grant, fencing, and idempotency fail closed", () => {
  assert.equal(contract.grant.shortLived, true);
  assert.equal(contract.grant.singleTenant, true);
  assert.equal(contract.grant.singleWorkspaceRevision, true);
  assert.equal(contract.grant.singleSessionAndBinding, true);
  assert.equal(contract.grant.singleProvider, true);
  assert.equal(contract.grant.requestFingerprintBound, true);
  assert.equal(contract.grant.replayProtectionRequired, true);
  assert.equal(contract.grant.revocationCheckRequired, true);
  assert.equal(contract.grant.failClosedOnClockUncertainty, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_highest_fencing_token_persisted_per_attachment, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_stale_token_rejected_before_side_effect, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_same_operation_same_fingerprint_replays_result, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_same_operation_different_fingerprint_conflicts, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_restart_recovery_required, true);
});

test("Sandbox Workspace guest device and data protection expose no physical or key material", () => {
  const sandbox_device = contract.deviceBoundary;
  assert.equal(sandbox_device.sandbox_guest_block_device_required, true);
  assert.equal(sandbox_device.sandbox_direct_host_directory_mount_allowed, false);
  assert.equal(sandbox_device.sandbox_rootfs_workspace_cache_temp_devices_separate, true);
  assert.equal(sandbox_device.sandbox_rootfs_read_only_required, true);
  assert.equal(sandbox_device.sandbox_device_shared_across_active_tenant_bindings, false);
  assert.equal(sandbox_device.sandbox_host_path_or_device_path_input_allowed, false);
  assert.equal(contract.dataProtection.sandbox_at_rest_encryption_required, true);
  assert.equal(contract.dataProtection.sandbox_external_key_reference_required, true);
  assert.equal(contract.dataProtection.sandbox_raw_key_material_allowed_in_public_contract, false);
  assert.equal(contract.dataProtection.sandbox_raw_key_material_allowed_in_persisted_provider_state, false);
  assert.equal(contract.dataProtection.sandbox_in_memory_key_zeroization_required, true);
  assert.equal(contract.dataProtection.sandbox_secret_kms_implementation_authorized, false);
  assert.equal(contract.result.physicalMetadataAllowed, false);
});

test("Sandbox Workspace readiness, cleanup, and residue policy quarantine uncertainty", () => {
  assert.equal(contract.readiness.type, "SandboxWorkspaceBlockDeviceReadiness");
  assert.equal(contract.readiness.failureMode, "fail-closed");
  assert.equal(contract.readiness.degradedMayReportWorkspaceAttached, false);
  assert.equal(contract.readiness.readinessClaimIsMicroVmEvidenceByItself, false);
  assert.ok(contract.readiness.requiredDimensions.includes("sandbox_authorization_and_revision"));
  assert.ok(contract.readiness.requiredDimensions.includes("sandbox_prior_projection_residue_clear"));
  assert.equal(contract.sanitization.sandbox_persistent_workspace_content_wiped, false);
  assert.equal(contract.sanitization.sandbox_ephemeral_cryptographic_erase_required, true);
  assert.equal(contract.sanitization.sandbox_cross_tenant_residue_scan_before_reuse, true);
  assert.equal(contract.sanitization.sandbox_failed_or_unknown_sanitization_quarantines_attachment, true);
  assert.equal(contract.sanitization.sandbox_quarantine_blocks_node_or_device_reuse, true);
  assert.equal(contract.lifecycle.sandbox_quarantined_attachment_reusable, false);
});

test("Sandbox Workspace contract is bounded, auditable, and forbids storage bypasses", () => {
  assert.ok(contract.bounds.sandbox_request_max_bytes <= 65536);
  assert.ok(contract.bounds.sandbox_grant_ttl_seconds_max <= 60);
  assert.ok(contract.bounds.sandbox_cleanup_step_count_max <= 64);
  assert.ok(contract.bounds.sandbox_reconciliation_batch_size_max <= 100);
  assert.equal(contract.bounds.sandbox_capacity_limit_must_be_positive, true);
  assert.equal(contract.bounds.sandbox_capacity_limit_must_not_exceed_policy, true);
  assert.equal(contract.audit.sandbox_prepare_attach_detach_sanitize_and_quarantine_emit_audit, true);
  assert.equal(contract.audit.sandbox_denial_integrity_failure_and_residue_emit_security_fact, true);
  for (const sandbox_forbidden_field of [
    "sandbox_raw_host_path",
    "sandbox_raw_device_path",
    "sandbox_bucket_name",
    "sandbox_object_key",
    "sandbox_storage_provider_credential",
    "sandbox_presigned_url",
    "sandbox_raw_encryption_key",
  ]) {
    assert.ok(contract.forbiddenInputsAndOutputs.includes(sandbox_forbidden_field));
  }
});
