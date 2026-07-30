import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function readStatus(relativePath) {
  const source = readFileSync(path.join(repoRoot, relativePath), "utf8");
  const match = source.match(/^(?:status|Status):\s*(\S+)\s*$/mu);
  assert.ok(match, `${relativePath} must declare status`);
  return match[1];
}

const contract = readJson("specs/sandbox-lifecycle-history-and-idempotency.contract.json");

test("lifecycle history boundary remains draft and implementation-disabled", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.lifecycle-history-and-idempotency-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract["x-sdkwork-no-runtime-implementation"], true);
  assert.equal(contract["x-sdkwork-no-database-implementation"], true);
  assert.equal(contract["x-sdkwork-no-api-sdk-kernel-implementation"], true);
  assert.equal(
    readStatus(
      "docs/product/requirements/REQ-2026-0020-sandbox-lifecycle-hot-state-and-idempotency-retention.md",
    ),
    "draft",
  );
  assert.equal(
    readStatus(
      "docs/architecture/decisions/ADR-20260730-sandbox-lifecycle-hot-state-and-idempotency-ledger.md",
    ),
    "proposed",
  );
  assert.equal(
    readStatus(
      "docs/engineering/reviews/REVIEW-20260730-sandbox-lifecycle-history-and-idempotency-retention.md",
    ),
    "pending-human-review",
  );
});

test("known current full-history and reconciliation debt is explicit", () => {
  const debt = contract.currentDebtEvidence;
  assert.equal(debt.sandbox_session_hydration_reads_complete_operation_history, true);
  assert.equal(debt.sandbox_operation_lookup_hydrates_complete_owning_aggregate, true);
  assert.equal(
    debt.sandbox_reconciliation_candidate_page_performs_pre_lease_aggregate_hydration,
    true,
  );
  assert.equal(debt.sandbox_maximum_operations_per_session_approved, false);
  assert.equal(debt.sandbox_terminal_idempotency_retention_approved, false);
});

test("hot lifecycle projection is bounded and not event-sourced", () => {
  const hotState = contract.hotStateProjection;
  assert.equal(hotState.sandbox_current_in_progress_operation_count_max, 1);
  assert.equal(hotState.sandbox_stable_state_has_in_progress_operation, false);
  assert.equal(hotState.sandbox_transient_state_requires_matching_current_operation, true);
  assert.equal(hotState.sandbox_complete_historical_operation_collection_allowed, false);
  assert.equal(hotState.sandbox_full_event_history_replay_required_for_restore, false);
  assert.equal(
    hotState.sandbox_query_and_memory_cost_independent_of_historical_operation_count,
    true,
  );
});

test("idempotency ledger uses tenant point lookup and canonical fingerprints", () => {
  const ledger = contract.idempotencyLedger;
  assert.deepEqual(ledger.primaryLookupKey, ["tenant_id", "sandbox_operation_id"]);
  assert.equal(ledger.sandbox_point_lookup_required, true);
  assert.equal(ledger.sandbox_full_session_history_scan_allowed, false);
  assert.equal(ledger.sandbox_fingerprint_is_versioned_and_canonical, true);
  assert.equal(
    ledger.sandbox_same_operation_same_fingerprint_replays_persisted_business_result,
    true,
  );
  assert.equal(
    ledger.sandbox_same_operation_different_fingerprint_conflicts_before_side_effect,
    true,
  );
  assert.equal(
    ledger.sandbox_same_operation_different_kind_or_owner_conflicts_before_side_effect,
    true,
  );
});

test("active recovery records never expire and absence never silently reexecutes", () => {
  const ledger = contract.idempotencyLedger;
  assert.equal(
    ledger.sandbox_active_transient_recoverable_or_retry_eligible_record_may_expire,
    false,
  );
  assert.equal(
    ledger.sandbox_record_absence_after_retention_may_silently_authorize_reexecution,
    false,
  );
  assert.equal(
    ledger.sandbox_secret_workspace_content_raw_host_path_or_plain_provider_allocation_allowed,
    false,
  );
});

test("interactive and reconciliation read paths have fixed history bounds", () => {
  const reads = contract.boundedReadPaths;
  assert.equal(reads.sandbox_session_hydration_operation_rows_max, 1);
  assert.equal(reads.sandbox_operation_replay_lookup_hydrates_complete_session_history, false);
  assert.equal(reads.sandbox_reconciliation_candidate_page_uses_tenant_keyset, true);
  assert.equal(reads.sandbox_reconciliation_candidate_page_hydrates_aggregate_per_row, false);
  assert.equal(reads.sandbox_post_lease_authoritative_read_required, true);
  assert.equal(reads.sandbox_post_lease_authoritative_read_operation_rows_max, 1);
  assert.equal(reads.sandbox_unbounded_scan_or_in_process_pagination_allowed, false);
  assert.equal(reads.sandbox_hidden_pre_lease_n_plus_one_hydration_allowed, false);
});

test("limit and retention values stay unresolved until human approval", () => {
  const policy = contract.lifecycleLimitsAndRetention;
  for (const property of [
    "sandbox_maximum_operations_per_session",
    "sandbox_maximum_active_session_lifetime_seconds",
    "sandbox_terminal_session_retention_seconds",
    "sandbox_terminal_idempotency_retention_seconds",
    "sandbox_replay_result_descriptor_bytes_max",
    "sandbox_post_retention_late_retry_outcome",
  ]) {
    assert.equal(policy[property], null, `${property} must not be guessed before review`);
  }
  assert.equal(policy.sandbox_exact_values_require_human_approval_before_ready, true);
  assert.equal(policy.sandbox_limits_checked_before_provider_or_host_side_effect, true);
  assert.equal(policy.sandbox_ttl_alone_may_delete_idempotency_record, false);
  assert.equal(policy.sandbox_uncertain_record_may_be_deleted, false);
});

test("retention worker is tenant-scoped, keyset-bounded and fenced", () => {
  const worker = contract.retentionWorker;
  assert.equal(worker.sandbox_tenant_or_partition_scoped, true);
  assert.equal(worker.sandbox_keyset_pagination_required, true);
  assert.ok(worker.sandbox_batch_size_max <= 100);
  assert.equal(worker.sandbox_database_clock_required, true);
  assert.equal(worker.sandbox_worker_lease_and_fencing_required, true);
  assert.equal(worker.sandbox_durable_checkpoint_or_watermark_required, true);
  assert.equal(worker.sandbox_idempotent_restart_required, true);
  assert.equal(worker.sandbox_cross_tenant_bulk_delete_allowed, false);
});

test("migration is expand-contract and requires real PostgreSQL evidence", () => {
  const migration = contract.migrationGate;
  assert.equal(migration.sandbox_dedicated_migration_record_required, true);
  assert.equal(migration.sandbox_applied_baseline_migration_may_be_edited, false);
  assert.deepEqual(migration.sandbox_required_stages, [
    "sandbox_expand",
    "sandbox_backfill",
    "sandbox_verify",
    "sandbox_dual_read_write_or_shadow_compare",
    "sandbox_cutover",
    "sandbox_retire_old_shape",
  ]);
  assert.equal(migration.sandbox_real_postgresql_16_and_17_required, true);
  assert.equal(migration.sandbox_query_plan_and_buffers_evidence_required, true);
  assert.equal(migration.sandbox_pitr_and_forward_recovery_evidence_required, true);
  assert.equal(migration.sandbox_sqlite_or_memory_only_evidence_sufficient, false);
});

test("audit telemetry and public errors cannot bypass their owners", () => {
  assert.equal(
    contract.ownership.sandbox_idempotency_ledger_may_be_reconstructed_from_audit_event_log_or_metric,
    false,
  );
  assert.equal(contract.candidateErrorSemantics.sandbox_public_error_names_authorized, false);
  assert.equal(
    contract.candidateErrorSemantics.sandbox_limit_or_lifetime_outcome_may_be_emitted_after_side_effect,
    false,
  );
  assert.equal(
    contract.candidateErrorSemantics.sandbox_kernel_mapping_requires_cross_repository_human_review,
    true,
  );
  assert.equal(contract.telemetry.sandbox_low_cardinality_labels_required, true);
  assert.equal(contract.telemetry.sandbox_tenant_session_operation_or_fingerprint_labels_allowed, false);
  assert.equal(contract.telemetry.sandbox_metric_log_trace_event_or_audit_is_idempotency_authority, false);
});
