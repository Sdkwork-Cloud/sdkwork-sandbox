import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const loadJson = (sandbox_relative_path) =>
  JSON.parse(readFileSync(path.join(repoRoot, sandbox_relative_path), "utf8"));

const contract = loadJson("specs/sandbox-multi-tenant-scheduling.contract.json");
const resourceContract = loadJson("specs/sandbox-firecracker-resource-isolation.contract.json");
const providerContract = loadJson("specs/sandbox-provider-delivery-gates.contract.json");
const eventCatalog = loadJson("apis/async/sandbox-event-catalog.json");
const observabilityCatalog = loadJson("apis/async/sandbox-observability-catalog.json");

test("multi-tenant scheduling remains a draft non-runtime contract", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.multi-tenant-scheduling-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0016");
  assert.equal(contract.implementationAuthorized, false);
  for (const sandbox_gate of [
    "x-sdkwork-require-human-review",
    "x-sdkwork-no-runtime-implementation",
    "x-sdkwork-no-scheduler-implementation",
    "x-sdkwork-no-database-implementation",
    "x-sdkwork-no-node-agent-implementation",
    "x-sdkwork-no-pool-implementation",
    "x-sdkwork-no-commerce-implementation",
  ]) {
    assert.equal(contract[sandbox_gate], true, `missing gate: ${sandbox_gate}`);
  }
});

test("admission, scheduling, inventory, and capacity authorities are separated", () => {
  assert.equal(contract.ports.sandbox_admission_policy_port.type, "SandboxAdmissionPolicyPort");
  assert.equal(contract.ports.sandbox_node_inventory_port.type, "SandboxNodeInventoryPort");
  assert.equal(contract.ports.sandbox_scheduler_port.type, "SandboxSchedulerPort");
  assert.equal(
    contract.ports.sandbox_scheduler_port.semanticScope,
    "sandbox-capacity-placement-only",
  );
  assert.equal(
    contract.ports.sandbox_capacity_reservation_port.type,
    "SandboxCapacityReservationPort",
  );
  for (const sandbox_port of Object.values(contract.ports)) {
    assert.equal(sandbox_port.layer, "L3");
    assert.equal(sandbox_port.providerNeutral, true);
  }
  assert.equal(contract.ownership.sandbox_scheduler_may_author_identity_or_entitlement, false);
  assert.equal(contract.ownership.sandbox_provider_may_author_admission_or_placement, false);
  assert.equal(contract.ownership.sandbox_capacity_adapter_may_expand_requested_resources, false);
});

test("Sandbox scheduling is capacity placement, not Kernel execution placement", () => {
  const separation = contract.placementAuthoritySeparation;
  assert.equal(separation.sandbox_scheduler_semantic_scope, "sandbox-capacity-placement-only");
  assert.equal(separation.sandbox_kernel_execution_placement_owner, "sdkwork-kernel");
  assert.equal(separation.sandbox_capacity_placement_owner, "SandboxSchedulerPort");
  assert.equal(separation.sandbox_runtime_allocation_binding_owner, "Sandbox lifecycle service");
  assert.equal(separation.sandbox_kernel_and_sandbox_placement_records_have_distinct_ids, true);
  assert.equal(
    separation.sandbox_kernel_and_sandbox_placement_records_have_distinct_lease_and_fencing_domains,
    true,
  );
  assert.equal(
    separation.sandbox_kernel_and_sandbox_placement_records_have_distinct_idempotency_scopes,
    true,
  );
  assert.equal(separation.sandbox_capacity_placement_may_replace_kernel_execution_placement, false);
  assert.equal(
    separation.sandbox_capacity_placement_may_advance_kernel_execution_placement_state,
    false,
  );
  assert.equal(
    separation.sandbox_kernel_may_select_provider_node_pool_slot_or_capacity_reservation,
    false,
  );
});

test("scheduling operations and contract fields are closed and Sandbox-prefixed", () => {
  assert.deepEqual(contract.operations, [
    "sandbox_evaluate_admission",
    "sandbox_list_placement_candidates",
    "sandbox_reserve_capacity",
    "sandbox_confirm_capacity_reservation",
    "sandbox_release_capacity_reservation",
    "sandbox_reconcile_capacity_reservations",
  ]);
  for (const sandbox_value of [
    ...contract.operations,
    ...contract.admissionRequest.requiredFields,
    ...contract.admissionGrant.requiredFields,
    ...contract.nodeCandidateSnapshot.requiredFields,
    ...contract.capacityReservation.requiredFields,
    ...contract.placementDecision.requiredFields,
  ]) {
    assert.match(sandbox_value, /^sandbox_/u);
  }
  assert.equal(contract.admissionRequest.unknownFieldsRejected, true);
  assert.equal(contract.admissionRequest.callerSuppliedTenantQuotaAllowed, false);
  assert.equal(contract.admissionRequest.callerSuppliedPriorityEscalationAllowed, false);
  assert.equal(contract.admissionRequest.callerSelectedProviderOrNodeAllowed, false);
});

test("admission atomically reserves bounded tenant quota without owning Commerce", () => {
  assert.equal(contract.admissionGrant.signed, true);
  assert.equal(contract.admissionGrant.authoritativeQuotaReservationRequired, true);
  assert.equal(contract.admissionGrant.revisionAndFingerprintBound, true);
  assert.equal(contract.admissionGrant.priceInvoicePaymentFieldsAllowed, false);
  assert.equal(contract.admissionPolicy.sandbox_verified_identity_context_required, true);
  assert.equal(contract.admissionPolicy.sandbox_verified_entitlement_snapshot_required, true);
  assert.equal(contract.admissionPolicy.sandbox_concurrent_session_quota_reserved_atomically, true);
  assert.equal(contract.admissionPolicy.sandbox_quota_check_without_reservation_is_admission, false);
  assert.equal(contract.admissionPolicy.sandbox_zero_negative_or_unbounded_quota_allowed, false);
  assert.equal(contract.admissionPolicy.sandbox_cross_tenant_quota_sharing_allowed, false);
  assert.equal(contract.admissionPolicy.sandbox_plan_price_or_invoice_logic_allowed, false);
});

test("placement filters hard constraints before scoring and forbids assurance downgrade", () => {
  for (const sandbox_constraint of [
    "sandbox_capability_match_required",
    "sandbox_os_match_required",
    "sandbox_architecture_match_required",
    "sandbox_minimum_assurance_match_required",
    "sandbox_locality_and_residency_match_required",
    "sandbox_policy_and_tenant_isolation_match_required",
    "sandbox_capacity_fit_required",
    "sandbox_node_schedulable_and_healthy_required",
  ]) {
    assert.equal(contract.hardPlacementConstraints[sandbox_constraint], true);
  }
  assert.equal(contract.hardPlacementConstraints.sandbox_score_before_hard_filter_allowed, false);
  assert.equal(contract.hardPlacementConstraints.sandbox_weaker_provider_fallback_allowed, false);
  assert.equal(
    contract.hardPlacementConstraints.sandbox_local_or_docker_fallback_for_firecracker_allowed,
    false,
  );
  assert.equal(contract.placementPolicy.sandbox_tenant_aware_fairness_required, true);
  assert.equal(contract.placementPolicy.sandbox_priority_class_from_admission_grant_only, true);
  assert.equal(contract.placementPolicy.sandbox_warm_pool_candidate_allowed, false);
});

test("node inventory rejects stale, draining, quarantined, unhealthy, and host-private candidates", () => {
  assert.equal(contract.nodeCandidateSnapshot.nodeReferenceOpaque, true);
  assert.equal(contract.nodeCandidateSnapshot.signedOrMutuallyAuthenticatedSourceRequired, true);
  assert.equal(contract.nodeCandidateSnapshot.monotonicCapacityRevisionRequired, true);
  assert.equal(contract.nodeCandidateSnapshot.staleSnapshotEligible, false);
  assert.equal(contract.nodeCandidateSnapshot.drainingNodeEligible, false);
  assert.equal(contract.nodeCandidateSnapshot.quarantinedNodeEligible, false);
  assert.equal(contract.nodeCandidateSnapshot.unhealthyOrUnknownNodeEligible, false);
  assert.equal(contract.nodeCandidateSnapshot.hostAddressOrPathAllowed, false);
  assert.equal(contract.placementDecision.publicNodeIdentityAllowed, false);
  assert.ok(contract.forbiddenPublicMetadata.includes("sandbox_node_ip_address"));
});

test("capacity reservation is atomic, durable, non-overcommitted, and resource-bound", () => {
  assert.equal(contract.capacityReservation.authoritativeStore, "postgresql");
  assert.equal(contract.capacityReservation.atomicCapacityDecrementRequired, true);
  assert.equal(contract.capacityReservation.tenantAndNodeReservationOneWorkflowRequired, true);
  assert.equal(contract.capacityReservation.optimisticVersionOrStrongerConcurrencyRequired, true);
  assert.equal(contract.capacityReservation.stableLockOrderRequired, true);
  assert.equal(contract.capacityReservation.boundedSerializationAndDeadlockRetryRequired, true);
  assert.equal(contract.capacityReservation.overcommitAllowed, false);
  assert.equal(contract.capacityReservation.negativeAvailableCapacityAllowed, false);
  assert.equal(contract.capacityReservation.providerAllocationBeforeConfirmedReservationAllowed, false);
  assert.equal(contract.capacityReservation.resourceLimitGrantMayExceedReservation, false);
  assert.ok(resourceContract.relatedRequirementIds.includes("REQ-2026-0016"));
  assert.ok(resourceContract.relatedContracts.includes("sandbox-multi-tenant-scheduling.contract.json"));
  assert.ok(resourceContract.grant.requiredFields.includes("sandbox_capacity_reservation_id"));
  assert.ok(resourceContract.grant.requiredFields.includes("sandbox_admission_grant_id"));
});

test("lifecycle fencing, idempotency, release, and orphan recovery fail closed", () => {
  assert.equal(contract.lifecycleIntegration.sandbox_admission_before_provider_selection_required, true);
  assert.equal(
    contract.lifecycleIntegration.sandbox_capacity_reservation_before_provider_allocate_required,
    true,
  );
  assert.equal(contract.lifecycleIntegration.sandbox_same_binding_double_placement_allowed, false);
  assert.equal(
    contract.fencingIdempotencyAndRecovery.sandbox_stale_fencing_rejected_before_mutation,
    true,
  );
  assert.equal(
    contract.fencingIdempotencyAndRecovery.sandbox_same_operation_same_fingerprint_replays_result,
    true,
  );
  assert.equal(
    contract.fencingIdempotencyAndRecovery.sandbox_same_operation_different_fingerprint_conflicts,
    true,
  );
  assert.equal(contract.fencingIdempotencyAndRecovery.sandbox_release_idempotent, true);
  assert.equal(
    contract.fencingIdempotencyAndRecovery.sandbox_uncertain_capacity_state_quarantines_node,
    true,
  );
  assert.equal(contract.fencingIdempotencyAndRecovery.sandbox_unbounded_orphan_scan_allowed, false);
});

test("scheduling errors, retries, deployment scope, and operating bounds are explicit", () => {
  assert.ok(contract.denialAndErrorTaxonomy.sandbox_admission_denials.includes("sandbox_quota_exceeded"));
  assert.ok(contract.denialAndErrorTaxonomy.sandbox_scheduling_failures.includes("sandbox_no_capacity"));
  assert.equal(contract.denialAndErrorTaxonomy.sandbox_retryability_explicit, true);
  assert.equal(contract.denialAndErrorTaxonomy.sandbox_retry_after_bounded, true);
  assert.equal(contract.denialAndErrorTaxonomy.sandbox_raw_capacity_or_topology_detail_in_error_allowed, false);
  assert.ok(contract.bounds.sandbox_candidate_count_max <= 128);
  assert.ok(contract.bounds.sandbox_placement_attempt_count_max <= 8);
  assert.ok(contract.bounds.sandbox_placement_deadline_ms_max <= 10000);
  assert.ok(contract.bounds.sandbox_reconciliation_batch_size_max <= 100);
  assert.equal(contract.deploymentScope.sandbox_cloud_multi_tenant_scheduler_required, true);
  assert.equal(contract.deploymentScope.sandbox_process_local_memory_store_allowed_in_cloud, false);
  assert.equal(contract.deploymentScope.sandbox_warm_pool_implementation_in_scope, false);
});

test("scheduling events and low-cardinality metrics use existing authorities", () => {
  const sandbox_event_types = new Set(eventCatalog.eventTypes.map((sandbox_event) => sandbox_event.type));
  for (const sandbox_event_type of contract.eventAndAudit.sandbox_event_types) {
    assert.ok(sandbox_event_types.has(sandbox_event_type), `missing event: ${sandbox_event_type}`);
  }
  const sandbox_metric_names = new Set(
    observabilityCatalog.metrics.catalog.map((sandbox_metric) => sandbox_metric.name),
  );
  for (const sandbox_metric_name of [
    "sdkwork_sandbox_admission_decisions_total",
    "sdkwork_sandbox_scheduler_placement_operations_total",
    "sdkwork_sandbox_scheduler_placement_duration_seconds",
    "sdkwork_sandbox_scheduler_queue_wait_duration_seconds",
    "sdkwork_sandbox_capacity_reservations_active",
    "sdkwork_sandbox_capacity_saturation_ratio",
  ]) {
    assert.ok(sandbox_metric_names.has(sandbox_metric_name), `missing metric: ${sandbox_metric_name}`);
  }
  assert.equal(contract.eventAndAudit.sandbox_metrics_are_capacity_or_quota_authority, false);
  assert.equal(contract.telemetry.sandbox_tenant_session_node_reservation_labels_allowed, false);
  assert.equal(contract.telemetry.sandbox_raw_locality_or_fault_domain_labels_allowed, false);
  assert.equal(contract.privacyAndPublicBoundary.sandbox_node_reference_in_public_api_or_event_allowed, false);
  assert.ok(providerContract.requirementIds.includes("REQ-2026-0016"));
});
