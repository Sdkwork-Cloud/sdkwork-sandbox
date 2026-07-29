import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(
    path.join(repoRoot, "specs/sandbox-firecracker-network-isolation.contract.json"),
    "utf8",
  ),
);

test("Firecracker network isolation remains a draft non-runtime contract", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.firecracker-network-isolation-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0014");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract["x-sdkwork-require-human-review"], true);
  assert.equal(contract["x-sdkwork-no-runtime-implementation"], true);
  assert.equal(contract["x-sdkwork-no-netns-implementation"], true);
  assert.equal(contract["x-sdkwork-no-firewall-implementation"], true);
  assert.equal(contract["x-sdkwork-no-tap-implementation"], true);
});

test("network policy authority is provider-neutral and separate from L4 mechanism", () => {
  assert.equal(contract.policyPort.type, "SandboxNetworkPolicyPort");
  assert.equal(contract.policyPort.providerNeutral, true);
  assert.equal(contract.mechanismPort.type, "SandboxNetworkIsolationPort");
  assert.equal(contract.mechanismPort.providerLayer, "L4");
  assert.equal(contract.mechanismPort.hostBrokerOperation, "sandbox_prepare_network");
  assert.equal(contract.ownership.sandbox_provider_may_author_policy, false);
  assert.equal(contract.ownership.sandbox_broker_may_author_policy, false);
  assert.equal(contract.ownership.sandbox_caller_request_implies_grant, false);
});

test("network policy defaults to DenyAll and accepts only explicit DNS and egress grants", () => {
  assert.equal(contract.policyModel.sandbox_default_action, "DenyAll");
  assert.equal(contract.policyModel.sandbox_default_deny_required, true);
  assert.deepEqual(contract.policyModel.sandbox_allowed_grant_kinds, [
    "sandbox_dns_resolution",
    "sandbox_egress_connection",
  ]);
  assert.equal(contract.policyModel.sandbox_explicit_grant_required, true);
  assert.equal(contract.policyModel.sandbox_ingress_allowed, false);
  assert.equal(contract.policyModel.sandbox_port_forward_allowed, false);
  assert.equal(contract.policyModel.sandbox_catch_all_cidr_allowed, false);
  assert.equal(contract.policyModel.sandbox_wildcard_destination_allowed, false);
});

test("permanent denials cannot be overridden by grants, DNS, or redirects", () => {
  assert.deepEqual(contract.permanentDenials.sandbox_destination_classes, [
    "sandbox_cloud_metadata",
    "sandbox_host_control_plane",
    "sandbox_tenant_lateral_traffic",
  ]);
  assert.equal(contract.permanentDenials.sandbox_checked_before_allow_rules, true);
  assert.equal(contract.permanentDenials.sandbox_checked_after_dns_and_redirect_resolution, true);
  assert.equal(contract.permanentDenials.sandbox_explicit_grant_may_override, false);
  assert.equal(contract.dnsPolicy.sandbox_permanent_denials_rechecked_for_every_address, true);
  assert.equal(contract.egressPolicy.sandbox_redirect_target_revalidation_required, true);
});

test("each binding receives isolated namespace and Tap state", () => {
  assert.equal(contract.bindingIsolation.sandbox_network_namespace_per_runtime_binding, true);
  assert.equal(contract.bindingIsolation.sandbox_tap_per_runtime_binding, true);
  assert.equal(
    contract.bindingIsolation.sandbox_namespace_or_tap_shared_across_active_bindings,
    false,
  );
  assert.equal(contract.bindingIsolation.sandbox_host_network_namespace_allowed, false);
  assert.equal(contract.bindingIsolation.sandbox_host_loopback_reachable, false);
});

test("network request and grant fields are Sandbox-prefixed and fail closed", () => {
  for (const sandbox_field of [
    ...contract.request.requiredFields,
    ...contract.grant.requiredFields,
  ]) {
    assert.match(sandbox_field, /^sandbox_/u);
  }
  assert.equal(contract.request.unknownFieldsRejected, true);
  assert.equal(contract.request.ambientTenantOrPolicyContextAllowed, false);
  assert.equal(contract.grant.shortLived, true);
  assert.equal(contract.grant.revisionAndFingerprintBound, true);
  assert.equal(contract.grant.replayProtectionRequired, true);
  assert.equal(contract.grant.revocationCheckRequired, true);
});

test("policy apply is fenced, idempotent, atomic, and verified before readiness", () => {
  assert.equal(contract.fencingAndIdempotency.sandbox_stale_token_rejected_before_side_effect, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_policy_revision_must_be_monotonic, true);
  assert.equal(
    contract.fencingAndIdempotency.sandbox_same_operation_same_fingerprint_replays_result,
    true,
  );
  assert.equal(contract.atomicApplyAndVerification.sandbox_atomic_commit_required, true);
  assert.equal(contract.atomicApplyAndVerification.sandbox_active_revision_readback_required, true);
  assert.equal(contract.atomicApplyAndVerification.sandbox_active_fingerprint_readback_required, true);
  assert.equal(contract.atomicApplyAndVerification.sandbox_ready_before_verification_allowed, false);
  assert.equal(
    contract.atomicApplyAndVerification.sandbox_failure_restores_deny_all_or_quarantines,
    true,
  );
  assert.equal(contract.readiness.degradedMayReportNetworkReady, false);
});

test("teardown, telemetry, audit, and bounds prevent residue and sensitive labels", () => {
  assert.equal(contract.teardownAndQuarantine.sandbox_force_deny_all_before_detach, true);
  assert.equal(contract.teardownAndQuarantine.sandbox_policy_state_residue_scan_required, true);
  assert.equal(
    contract.teardownAndQuarantine.sandbox_unknown_or_failed_cleanup_quarantines_binding,
    true,
  );
  assert.equal(
    contract.teardownAndQuarantine.sandbox_quarantined_binding_reusable_across_tenants,
    false,
  );
  assert.equal(contract.telemetryAndAudit.sandbox_low_cardinality_metrics_required, true);
  assert.equal(
    contract.telemetryAndAudit.sandbox_destination_ip_domain_port_in_metrics_allowed,
    false,
  );
  assert.equal(contract.telemetryAndAudit.sandbox_every_denial_emits_durable_audit_fact, true);
  assert.equal(contract.telemetryAndAudit.sandbox_audit_durable_when_telemetry_unavailable, true);
  assert.ok(contract.bounds.sandbox_policy_document_max_bytes <= 65536);
  assert.ok(contract.bounds.sandbox_egress_rule_count_max <= 256);
  assert.ok(contract.bounds.sandbox_apply_deadline_ms_max <= 30000);
});
