import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(
    path.join(repoRoot, "specs/sandbox-firecracker-resource-isolation.contract.json"),
    "utf8",
  ),
);
const eventCatalog = JSON.parse(
  readFileSync(path.join(repoRoot, "apis/async/sandbox-event-catalog.json"), "utf8"),
);
const observabilityCatalog = JSON.parse(
  readFileSync(path.join(repoRoot, "apis/async/sandbox-observability-catalog.json"), "utf8"),
);

test("Firecracker resource isolation remains a draft non-runtime contract", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.firecracker-resource-isolation-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0015");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract["x-sdkwork-require-human-review"], true);
  assert.equal(contract["x-sdkwork-no-runtime-implementation"], true);
  assert.equal(contract["x-sdkwork-no-cgroup-implementation"], true);
  assert.equal(contract["x-sdkwork-no-quota-engine-implementation"], true);
  assert.equal(contract["x-sdkwork-no-billing-implementation"], true);
});

test("resource policy authority is provider-neutral and separate from L4 mechanism", () => {
  assert.equal(contract.policyPort.type, "SandboxResourcePolicyPort");
  assert.equal(contract.policyPort.grantType, "SandboxResourceLimitGrant");
  assert.equal(contract.policyPort.providerNeutral, true);
  assert.equal(contract.mechanismPort.type, "SandboxResourceIsolationPort");
  assert.equal(contract.mechanismPort.usageFactType, "SandboxResourceUsageFact");
  assert.equal(contract.mechanismPort.providerLayer, "L4");
  assert.equal(contract.mechanismPort.hostBrokerOperation, "sandbox_apply_resource_limits");
  assert.equal(contract.ownership.sandbox_provider_may_author_limits, false);
  assert.equal(contract.ownership.sandbox_broker_may_author_limits, false);
  assert.equal(contract.ownership.sandbox_usage_fact_is_billing_invoice, false);
});

test("resource operations and fields are closed and Sandbox-prefixed", () => {
  assert.deepEqual(contract.operations, [
    "sandbox_prepare_resource_scope",
    "sandbox_apply_resource_limits",
    "sandbox_verify_resource_limits",
    "sandbox_sample_resource_usage",
    "sandbox_release_resource_scope",
  ]);
  for (const sandbox_value of [
    ...contract.operations,
    ...contract.request.requiredFields,
    ...contract.grant.requiredFields,
    ...contract.usageFact.requiredFields,
  ]) {
    assert.match(sandbox_value, /^sandbox_/u);
  }
  assert.equal(contract.request.unknownFieldsRejected, true);
  assert.equal(contract.request.ambientTenantOrQuotaContextAllowed, false);
});

test("resource limits are explicit, finite, capacity-backed, and immutable in guest shape", () => {
  assert.equal(contract.limitPolicy.sandbox_every_limit_explicit_and_finite, true);
  assert.equal(contract.limitPolicy.sandbox_unlimited_cpu_allowed, false);
  assert.equal(contract.limitPolicy.sandbox_unlimited_memory_allowed, false);
  assert.equal(contract.limitPolicy.sandbox_unlimited_pids_allowed, false);
  assert.equal(contract.limitPolicy.sandbox_unlimited_io_allowed, false);
  assert.equal(contract.limitPolicy.sandbox_limit_exceeds_tenant_ceiling_allowed, false);
  assert.equal(contract.limitPolicy.sandbox_limit_exceeds_node_reservation_allowed, false);
  assert.equal(contract.limitPolicy.sandbox_live_guest_vcpu_or_memory_mutation_allowed, false);
  assert.equal(contract.limitPolicy.sandbox_new_binding_required_for_guest_shape_change, true);
  assert.equal(contract.grant.nodeCapacityReservationRequired, true);
  assert.equal(contract.grant.tenantAndPlatformCeilingsRequired, true);
});

test("cgroup v2 scope is per binding with no v1, hybrid, path, or process escape", () => {
  assert.equal(contract.cgroupV2.sandbox_unified_hierarchy_required, true);
  assert.equal(contract.cgroupV2.sandbox_cgroup_v1_fallback_allowed, false);
  assert.equal(contract.cgroupV2.sandbox_hybrid_hierarchy_fallback_allowed, false);
  assert.deepEqual(contract.cgroupV2.sandbox_required_controllers, [
    "cpu",
    "memory",
    "pids",
    "io",
  ]);
  assert.equal(contract.cgroupV2.sandbox_leaf_scope_per_runtime_binding, true);
  assert.equal(contract.cgroupV2.sandbox_scope_shared_across_active_bindings, false);
  assert.equal(contract.cgroupV2.sandbox_arbitrary_cgroup_path_allowed, false);
  assert.equal(contract.cgroupV2.sandbox_untrusted_workload_before_scope_attachment_allowed, false);
  assert.equal(contract.cgroupV2.sandbox_vmm_jailer_and_descendants_membership_required, true);
  assert.equal(contract.cgroupV2.sandbox_foreign_process_membership_allowed, false);
});

test("Firecracker machine shape and cgroup controllers are jointly verified", () => {
  assert.equal(
    contract.firecrackerMachineConfig.sandbox_guest_vcpu_exact_grant_match_required,
    true,
  );
  assert.equal(
    contract.firecrackerMachineConfig.sandbox_guest_memory_exact_grant_match_required,
    true,
  );
  assert.equal(
    contract.firecrackerMachineConfig.sandbox_host_memory_covers_guest_and_vmm_overhead,
    true,
  );
  assert.equal(contract.firecrackerMachineConfig.sandbox_machine_config_readback_required, true);
  assert.equal(
    contract.firecrackerMachineConfig.sandbox_machine_config_only_is_resource_isolation_evidence,
    false,
  );
  assert.equal(contract.memoryEnforcement.sandbox_memory_high_not_above_max, true);
  assert.equal(contract.memoryEnforcement.sandbox_swap_default_zero, true);
  assert.equal(contract.pidEnforcement.sandbox_descendant_escape_allowed, false);
  assert.equal(contract.ioEnforcement.sandbox_arbitrary_major_minor_or_path_allowed, false);
  assert.equal(
    contract.ioEnforcement.sandbox_disk_capacity_owned_by_workspace_or_storage_contract,
    true,
  );
});

test("resource apply is fenced, idempotent, read back, and fail closed", () => {
  assert.equal(
    contract.applyAndVerification.sandbox_grant_and_fencing_verified_before_side_effect,
    true,
  );
  assert.equal(
    contract.applyAndVerification.sandbox_effective_controller_values_readback_required,
    true,
  );
  assert.equal(
    contract.applyAndVerification.sandbox_process_membership_readback_required,
    true,
  );
  assert.equal(
    contract.applyAndVerification.sandbox_ready_before_all_dimensions_verified_allowed,
    false,
  );
  assert.equal(contract.applyAndVerification.sandbox_partial_apply_returns_ready, false);
  assert.equal(contract.applyAndVerification.sandbox_partial_apply_rolls_back_or_quarantines, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_stale_token_rejected_before_side_effect, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_resource_policy_revision_must_be_monotonic, true);
  assert.equal(contract.readiness.degradedMayReportResourceReady, false);
  assert.equal(contract.readiness.staticContractIsMicroVmEvidence, false);
});

test("usage facts are immutable measurements and never billing authority", () => {
  assert.equal(contract.usageFact.type, "SandboxResourceUsageFact");
  assert.equal(contract.usageFact.immutable, true);
  assert.equal(contract.usageFact.idempotencyKeyRequired, true);
  assert.equal(contract.usageFact.monotonicSequencePerBinding, true);
  assert.equal(contract.usageFact.counterResetAcrossSameBindingAllowed, false);
  assert.equal(contract.usageFact.finalFactBeforeScopeReleaseRequired, true);
  assert.equal(contract.usageFact.negativeOrNaNValueAllowed, false);
  assert.equal(contract.usageFact.priceCurrencyInvoiceOrPaymentFieldsAllowed, false);
  assert.equal(contract.usageFact.providerPrivateIdentityAllowed, false);
  assert.equal(contract.eventAndAudit.sandbox_usage_fact_requires_durable_handoff, true);
  assert.equal(contract.eventAndAudit.sandbox_metrics_are_billing_truth, false);
});

test("resource cleanup, telemetry, audit, and bounds prevent hidden residue or cardinality", () => {
  assert.equal(contract.releaseAndQuarantine.sandbox_final_usage_fact_before_scope_release, true);
  assert.equal(contract.releaseAndQuarantine.sandbox_empty_scope_verified_before_removal, true);
  assert.equal(contract.releaseAndQuarantine.sandbox_resource_state_residue_scan_required, true);
  assert.equal(
    contract.releaseAndQuarantine.sandbox_unknown_or_failed_cleanup_quarantines_binding,
    true,
  );
  assert.equal(
    contract.releaseAndQuarantine.sandbox_quarantined_binding_reusable_across_tenants,
    false,
  );
  assert.equal(contract.telemetry.sandbox_low_cardinality_metrics_required, true);
  assert.equal(contract.telemetry.sandbox_tenant_session_binding_labels_allowed, false);
  assert.equal(contract.telemetry.sandbox_cgroup_path_or_device_labels_allowed, false);
  assert.equal(contract.eventAndAudit.sandbox_limit_denial_or_override_emits_audit_fact, true);
  assert.ok(contract.bounds.sandbox_guest_vcpu_count_max <= 256);
  assert.ok(contract.bounds.sandbox_io_device_role_count_max <= 16);
  assert.ok(contract.bounds.sandbox_apply_deadline_ms_max <= 30000);
});

test("resource events and low-cardinality metrics are registered in existing authorities", () => {
  const sandbox_event_types = new Set(
    eventCatalog.eventTypes.map((sandbox_event) => sandbox_event.type),
  );
  for (const sandbox_event_type of contract.eventAndAudit.sandbox_event_types) {
    assert.ok(sandbox_event_types.has(sandbox_event_type), `missing event: ${sandbox_event_type}`);
  }
  const sandbox_metric_names = new Set(
    observabilityCatalog.metrics.catalog.map((sandbox_metric) => sandbox_metric.name),
  );
  for (const sandbox_metric_name of [
    "sdkwork_sandbox_resource_limit_operations_total",
    "sdkwork_sandbox_resource_limit_operation_duration_seconds",
    "sdkwork_sandbox_resource_limit_breaches_total",
    "sdkwork_sandbox_resource_saturation_ratio",
  ]) {
    assert.ok(sandbox_metric_names.has(sandbox_metric_name), `missing metric: ${sandbox_metric_name}`);
  }
  assert.ok(observabilityCatalog.metrics.allowedBoundedLabels.includes("sandbox_resource_kind"));
  assert.ok(!observabilityCatalog.metrics.allowedBoundedLabels.includes("sandbox_runtime_binding_id"));
});
