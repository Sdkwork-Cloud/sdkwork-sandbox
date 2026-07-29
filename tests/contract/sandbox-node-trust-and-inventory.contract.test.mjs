import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sandboxRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readSandboxJson(sandboxRelativePath) {
  return JSON.parse(readFileSync(path.join(sandboxRepoRoot, sandboxRelativePath), "utf8"));
}

function readSandboxText(sandboxRelativePath) {
  return readFileSync(path.join(sandboxRepoRoot, sandboxRelativePath), "utf8");
}

const sandboxContract = readSandboxJson("specs/sandbox-node-trust-and-inventory.contract.json");
const sandboxSchedulingContract = readSandboxJson("specs/sandbox-multi-tenant-scheduling.contract.json");
const sandboxProviderContract = readSandboxJson("specs/sandbox-provider-delivery-gates.contract.json");
const sandboxEventCatalog = readSandboxJson("apis/async/sandbox-event-catalog.json");
const sandboxObservabilityCatalog = readSandboxJson("apis/async/sandbox-observability-catalog.json");

test("node trust and inventory remains a draft non-runtime contract", () => {
  assert.equal(sandboxContract.kind, "sdkwork.sandbox.node-trust-and-inventory");
  assert.equal(sandboxContract.requirementId, "REQ-2026-0017");
  assert.equal(sandboxContract.status, "draft");
  assert.equal(sandboxContract.implementationAuthorized, false);
  for (const sandboxGate of [
    "x-sdkwork-require-human-review",
    "x-sdkwork-no-node-agent-implementation",
    "x-sdkwork-no-pki-or-attestation-verifier-implementation",
    "x-sdkwork-no-database-implementation",
    "x-sdkwork-no-runtime-or-deployment-implementation",
  ]) {
    assert.equal(sandboxContract[sandboxGate], true, `${sandboxGate} must remain true`);
  }
  assert.equal(existsSync(path.join(sandboxRepoRoot, "crates/sdkwork-sandbox-node-agent")), false);
  assert.match(
    readSandboxText("docs/product/requirements/REQ-2026-0017-sandbox-node-trust-enrollment-attestation-and-inventory.md"),
    /^status:\s*draft$/mu,
  );
  assert.match(
    readSandboxText("docs/architecture/decisions/ADR-20260729-sandbox-node-trust-enrollment-attestation-and-inventory.md"),
    /^Status:\s*proposed$/mu,
  );
  assert.match(
    readSandboxText("docs/engineering/reviews/REVIEW-20260729-sandbox-node-trust-enrollment-attestation-and-inventory.md"),
    /^Status:\s*pending-human-review$/mu,
  );
});

test("enrollment, attestation, inventory, and lifecycle authorities are separated", () => {
  assert.deepEqual(
    Object.values(sandboxContract.ports).map((sandboxPort) => sandboxPort.type),
    [
      "SandboxNodeEnrollmentPort",
      "SandboxNodeAttestationVerificationPort",
      "SandboxNodeInventoryPublicationPort",
      "SandboxNodeLifecycleControlPort",
    ],
  );
  for (const sandboxPort of Object.values(sandboxContract.ports)) {
    assert.equal(sandboxPort.layer, "L3");
    assert.equal(sandboxPort.providerNeutral, true);
  }
  assert.equal(sandboxContract.ownership.sandbox_node_agent_is_claimant_and_publisher_only, true);
  assert.equal(sandboxContract.ownership.sandbox_scheduler_may_enroll_or_attest_node, false);
  assert.equal(sandboxContract.ownership.sandbox_provider_may_issue_node_identity_or_trust, false);
  assert.equal(sandboxContract.ownership.sandbox_host_broker_may_issue_node_identity_or_trust, false);
  assert.equal(sandboxContract.ownership.sandbox_identity_authentication_is_hardware_attestation, false);
});

test("node trust operations and fields are closed and Sandbox-prefixed", () => {
  for (const sandboxValue of [
    ...sandboxContract.operations,
    ...sandboxContract.enrollmentRequest.requiredFields,
    ...sandboxContract.nodeIdentity.requiredFields,
    ...sandboxContract.attestationEvidence.requiredFields,
    ...sandboxContract.attestationVerification.requiredFields,
    ...sandboxContract.inventoryPublication.requiredFields,
  ]) {
    assert.match(sandboxValue, /^sandbox_/u);
  }
  for (const sandboxType of Object.values(sandboxContract.types)) {
    assert.match(sandboxType, /^Sandbox/u);
  }
  assert.equal(sandboxContract.enrollmentRequest.unknownFieldsRejected, true);
  assert.equal(sandboxContract.inventoryPublication.unknownFieldsRejected, true);
});

test("bootstrap enrollment and node identity are bounded, key-bound, and non-replayable", () => {
  assert.equal(sandboxContract.enrollmentRequest.sandbox_bootstrap_credential_single_use, true);
  assert.equal(sandboxContract.enrollmentRequest.sandbox_bootstrap_credential_short_lived, true);
  assert.equal(sandboxContract.enrollmentRequest.sandbox_bootstrap_credential_replay_allowed, false);
  assert.equal(sandboxContract.enrollmentRequest.sandbox_bootstrap_secret_value_in_request_allowed, false);
  assert.equal(sandboxContract.enrollmentRequest.sandbox_caller_supplied_node_reference_allowed, false);
  assert.equal(sandboxContract.enrollmentRequest.sandbox_caller_supplied_trust_profile_allowed, false);
  assert.equal(sandboxContract.nodeIdentity.sandbox_identity_bound_to_public_key, true);
  assert.equal(sandboxContract.nodeIdentity.sandbox_private_key_non_exportable_required, true);
  assert.equal(sandboxContract.nodeIdentity.sandbox_node_identity_shared_across_nodes_allowed, false);
  assert.equal(sandboxContract.nodeIdentity.sandbox_static_permanent_certificate_allowed, false);
  assert.ok(sandboxContract.nodeIdentity.sandbox_identity_ttl_seconds_max <= 86400);
});

test("steady-state node transport requires mutually authenticated short-lived identity", () => {
  assert.equal(sandboxContract.mutualAuthentication.sandbox_mutual_authentication_required, true);
  assert.equal(sandboxContract.mutualAuthentication.sandbox_minimum_tls_version, "1.3");
  assert.equal(sandboxContract.mutualAuthentication.sandbox_server_identity_validation_required, true);
  assert.equal(sandboxContract.mutualAuthentication.sandbox_client_identity_validation_required, true);
  assert.equal(sandboxContract.mutualAuthentication.sandbox_certificate_status_and_revocation_checked, true);
  assert.equal(sandboxContract.mutualAuthentication.sandbox_plaintext_transport_allowed, false);
  assert.equal(
    sandboxContract.mutualAuthentication.sandbox_bearer_token_as_steady_state_node_identity_allowed,
    false,
  );
  assert.equal(
    sandboxContract.mutualAuthentication.sandbox_certificate_or_private_key_in_source_config_allowed,
    false,
  );
});

test("attestation is distinct from authentication and fails closed on stale or unknown evidence", () => {
  assert.equal(
    sandboxContract.trustProfiles.sandbox_authenticated_identity_may_claim_platform_attestation,
    false,
  );
  assert.equal(sandboxContract.trustProfiles.sandbox_node_agent_may_upgrade_profile, false);
  assert.equal(sandboxContract.attestationEvidence.sandbox_fresh_nonce_required, true);
  assert.equal(sandboxContract.attestationEvidence.sandbox_evidence_bound_to_node_key, true);
  assert.equal(sandboxContract.attestationEvidence.sandbox_evidence_bound_to_artifact_manifest, true);
  assert.equal(sandboxContract.attestationEvidence.sandbox_measurements_compared_to_approved_baseline, true);
  assert.equal(sandboxContract.attestationEvidence.sandbox_replayed_or_stale_evidence_accepted, false);
  assert.equal(sandboxContract.attestationEvidence.sandbox_unknown_evidence_format_accepted, false);
  assert.equal(
    sandboxContract.attestationEvidence.sandbox_missing_hardware_evidence_may_claim_verified_platform_attestation,
    false,
  );
  assert.equal(sandboxContract.attestationVerification.sandbox_failed_or_unknown_outcome_schedulable, false);
});

test("only verified, fresh, active inventory can become a scheduler candidate", () => {
  assert.equal(sandboxContract.inventoryPublication.sandbox_inventory_signed_by_active_node_identity, true);
  assert.equal(sandboxContract.inventoryPublication.sandbox_inventory_sequence_strictly_monotonic, true);
  assert.equal(sandboxContract.inventoryPublication.sandbox_capabilities_derived_from_verified_effective_state, true);
  assert.equal(sandboxContract.inventoryPublication.sandbox_node_self_report_is_scheduler_authority, false);
  assert.equal(sandboxContract.inventoryPublication.sandbox_stale_or_out_of_order_inventory_accepted, false);
  assert.equal(sandboxContract.verifiedInventoryRecord.sandbox_control_plane_signature_required, true);
  assert.equal(
    sandboxContract.verifiedInventoryRecord.sandbox_identity_attestation_inventory_revisions_bound,
    true,
  );
  assert.equal(sandboxContract.verifiedInventoryRecord.sandbox_scheduler_consumes_verified_projection_only, true);
  assert.equal(sandboxContract.nodeLifecycle.sandbox_only_active_state_schedulable, true);
  assert.equal(sandboxContract.nodeLifecycle.sandbox_new_enrollment_defaults_schedulable, false);
  assert.equal(sandboxContract.nodeLifecycle.sandbox_unknown_state_schedulable, false);
  assert.equal(sandboxSchedulingContract.nodeCandidateSnapshot.nodeTrustContractRequired, true);
});

test("rotation, drain, quarantine, revocation, and recovery reject stale or cloned authority", () => {
  const sandboxRecovery = sandboxContract.rotationRevocationAndRecovery;
  assert.equal(sandboxRecovery.sandbox_rotation_proves_possession_of_new_key, true);
  assert.ok(sandboxRecovery.sandbox_rotation_overlap_identity_count_max <= 2);
  assert.equal(sandboxRecovery.sandbox_compromise_quarantines_node_and_revokes_identity, true);
  assert.equal(sandboxRecovery.sandbox_duplicate_active_key_or_cloned_identity_quarantines_nodes, true);
  assert.equal(sandboxRecovery.sandbox_restart_may_reuse_bootstrap_credential, false);
  assert.equal(sandboxRecovery.sandbox_same_operation_same_fingerprint_replays_result, true);
  assert.equal(sandboxRecovery.sandbox_same_operation_different_fingerprint_conflicts, true);
  assert.equal(sandboxRecovery.sandbox_stale_identity_inventory_or_attestation_revision_rejected, true);
  assert.equal(sandboxRecovery.sandbox_unbounded_full_node_scan_allowed, false);
  assert.equal(sandboxContract.nodeLifecycle.sandbox_drain_blocks_new_placement_before_evict_or_wait, true);
  assert.equal(sandboxContract.nodeLifecycle.sandbox_quarantine_blocks_new_and_existing_side_effects, true);
  assert.equal(sandboxContract.nodeLifecycle.sandbox_revocation_immediately_blocks_authentication_and_placement, true);
});

test("node trust errors, privacy, and operating bounds expose no machine secrets", () => {
  assert.equal(sandboxContract.denialAndErrorTaxonomy.sandbox_retryability_explicit, true);
  assert.equal(sandboxContract.denialAndErrorTaxonomy.sandbox_retry_after_bounded, true);
  assert.equal(
    sandboxContract.denialAndErrorTaxonomy.sandbox_raw_certificate_attestation_node_or_topology_detail_in_error_allowed,
    false,
  );
  assert.equal(sandboxContract.privacyAndPublicBoundary.sandbox_public_node_identity_allowed, false);
  assert.equal(sandboxContract.privacyAndPublicBoundary.sandbox_public_certificate_or_attestation_evidence_allowed, false);
  assert.equal(sandboxContract.privacyAndPublicBoundary.sandbox_public_host_address_topology_or_capacity_allowed, false);
  assert.ok(sandboxContract.bounds.sandbox_enrollment_request_bytes_max <= 32768);
  assert.ok(sandboxContract.bounds.sandbox_attestation_evidence_bytes_max <= 1048576);
  assert.ok(sandboxContract.bounds.sandbox_inventory_publication_bytes_max <= 262144);
  assert.ok(sandboxContract.bounds.sandbox_reconciliation_batch_size_max <= 100);
  assert.equal(sandboxContract.deploymentScope.sandbox_cloud_node_trust_required, true);
  assert.equal(sandboxContract.deploymentScope.sandbox_node_agent_implementation_in_scope, false);
  assert.ok(sandboxContract.forbiddenPublicMetadata.includes("sandbox_attestation_quote"));
});

test("node trust events, metrics, scheduler, and Firecracker gates share existing authorities", () => {
  const sandboxEventTypes = new Set(
    sandboxEventCatalog.eventTypes.map((sandboxEvent) => sandboxEvent.type),
  );
  for (const sandboxEventType of sandboxContract.eventAndAudit.sandbox_event_types) {
    assert.ok(sandboxEventTypes.has(sandboxEventType), `missing event: ${sandboxEventType}`);
  }
  const sandboxMetricNames = new Set(
    sandboxObservabilityCatalog.metrics.catalog.map((sandboxMetric) => sandboxMetric.name),
  );
  for (const sandboxMetricName of sandboxContract.telemetry.sandbox_required_metric_names) {
    assert.ok(sandboxMetricNames.has(sandboxMetricName), `missing metric: ${sandboxMetricName}`);
  }
  assert.equal(sandboxContract.eventAndAudit.sandbox_event_or_metric_is_identity_or_attestation_authority, false);
  assert.equal(
    sandboxContract.telemetry.sandbox_node_reference_identity_serial_key_thumbprint_measurement_labels_allowed,
    false,
  );
  assert.ok(sandboxSchedulingContract.relatedRequirementIds.includes("REQ-2026-0017"));
  assert.ok(sandboxSchedulingContract.relatedContracts.includes("sandbox-node-trust-and-inventory.contract.json"));
  assert.ok(sandboxProviderContract.requirementIds.includes("REQ-2026-0017"));
  const sandboxFirecrackerProvider = sandboxProviderContract.providers.find(
    (sandboxProvider) => sandboxProvider.sandbox_provider_name === "sandbox_firecracker_provider",
  );
  assert.equal(
    sandboxFirecrackerProvider.nodeTrustAndInventory.sandbox_contract,
    "sandbox-node-trust-and-inventory.contract.json",
  );
  assert.equal(sandboxFirecrackerProvider.nodeTrustAndInventory.sandbox_cloud_preflight_dependency_required, true);
});
