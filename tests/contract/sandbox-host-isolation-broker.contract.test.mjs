import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(path.join(repoRoot, "specs/sandbox-host-isolation-broker.contract.json"), "utf8"),
);

test("Sandbox Host Isolation Broker remains a draft non-runtime contract", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.host-isolation-broker-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0011");
  assert.deepEqual(contract.relatedRequirementIds, [
    "REQ-2026-0013",
    "REQ-2026-0014",
    "REQ-2026-0015",
  ]);
  assert.deepEqual(contract.relatedContracts, [
    "sandbox-workspace-block-device-attachment.contract.json",
    "sandbox-firecracker-network-isolation.contract.json",
    "sandbox-firecracker-resource-isolation.contract.json",
  ]);
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract.publicPort.type, "SandboxHostIsolationBroker");
  assert.equal(contract.publicPort.requestType, "SandboxHostIsolationRequest");
  assert.equal(contract["x-sdkwork-require-human-review"], true);
  assert.equal(contract["x-sdkwork-no-runtime-implementation"], true);
});

test("Sandbox Host Isolation Broker exposes only fixed typed operations", () => {
  assert.deepEqual(
    contract.operations.map((sandbox_operation) => sandbox_operation.name),
    [
      "sandbox_inspect_node",
      "sandbox_prepare_allocation",
      "sandbox_apply_resource_limits",
      "sandbox_prepare_network",
      "sandbox_attach_workspace_device",
      "sandbox_launch_jailer",
      "sandbox_inspect_allocation",
      "sandbox_cleanup_allocation",
    ],
  );
  for (const sandbox_operation of contract.operations) {
    assert.match(sandbox_operation.name, /^sandbox_/u);
    assert.match(sandbox_operation.requiredGrantAction, /^sandbox\.host\./u);
  }
  const sandbox_workspace_operation = contract.operations.find(
    (sandbox_operation) => sandbox_operation.name === "sandbox_attach_workspace_device",
  );
  assert.equal(
    sandbox_workspace_operation.boundaryContract,
    "sandbox-workspace-block-device-attachment.contract.json",
  );
  const sandbox_network_operation = contract.operations.find(
    (sandbox_operation) => sandbox_operation.name === "sandbox_prepare_network",
  );
  assert.equal(
    sandbox_network_operation.boundaryContract,
    "sandbox-firecracker-network-isolation.contract.json",
  );
  const sandbox_resource_operation = contract.operations.find(
    (sandbox_operation) => sandbox_operation.name === "sandbox_apply_resource_limits",
  );
  assert.equal(
    sandbox_resource_operation.boundaryContract,
    "sandbox-firecracker-resource-isolation.contract.json",
  );
  assert.equal(contract.privilegeBoundary.sandbox_arbitrary_shell_allowed, false);
  assert.equal(contract.privilegeBoundary.sandbox_arbitrary_executable_allowed, false);
  assert.equal(contract.privilegeBoundary.sandbox_arbitrary_host_path_allowed, false);
  assert.equal(contract.privilegeBoundary.sandbox_arbitrary_device_allowed, false);
});

test("Sandbox Host Isolation Broker request and grant are prefixed, bounded, and fail closed", () => {
  for (const sandbox_field of [
    ...contract.request.requiredFields,
    ...contract.request.optionalOpaqueFields,
    ...contract.grant.requiredFields,
  ]) {
    assert.match(sandbox_field, /^sandbox_/u);
  }
  assert.equal(contract.request.unknownFieldsRejected, true);
  assert.equal(contract.grant.shortLived, true);
  assert.equal(contract.grant.singleBinding, true);
  assert.equal(contract.grant.singleProvider, true);
  assert.equal(contract.grant.requestFingerprintBound, true);
  assert.equal(contract.grant.replayProtectionRequired, true);
  assert.equal(contract.grant.revocationCheckRequired, true);
  assert.equal(contract.grant.failClosedOnClockUncertainty, true);
  assert.ok(contract.bounds.sandbox_request_max_bytes <= 65536);
  assert.ok(contract.bounds.sandbox_grant_ttl_seconds_max <= 60);
  assert.ok(contract.bounds.sandbox_deadline_ms_max <= 300000);
});

test("Sandbox Host Isolation Broker transport is local and strongly authenticated", () => {
  assert.equal(contract.transport.kind, "linux-unix-domain-socket");
  assert.equal(contract.transport.tcpAllowed, false);
  assert.equal(contract.transport.remoteNetworkAllowed, false);
  assert.equal(contract.transport.socketInProviderPrivateRuntimeDirectory, true);
  assert.equal(contract.transport.filesystemAclRequired, true);
  assert.equal(contract.transport.peerCredentialsRequired, true);
  assert.equal(contract.transport.peerExecutableIdentityRequired, true);
  assert.equal(contract.transport.unknownMessageRejected, true);
});

test("Sandbox Host Isolation Broker enforces fencing, idempotency, and bounded cleanup", () => {
  assert.equal(contract.fencingAndIdempotency.sandbox_highest_fencing_token_persisted_per_binding, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_stale_token_rejected_before_side_effect, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_same_operation_same_fingerprint_replays_result, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_same_operation_different_fingerprint_conflicts, true);
  assert.equal(contract.fencingAndIdempotency.sandbox_restart_recovery_required, true);
  assert.ok(contract.bounds.sandbox_cleanup_step_count_max <= 64);
  assert.ok(contract.bounds.sandbox_reconciliation_batch_size_max <= 100);
});

test("Sandbox Host Isolation Broker readiness, outputs, and audit remain safe", () => {
  assert.equal(contract.readiness.type, "SandboxHostIsolationBrokerReadiness");
  assert.equal(contract.readiness.failureMode, "fail-closed");
  assert.equal(contract.readiness.degradedMayAuthorizeSideEffects, false);
  assert.ok(contract.readiness.requiredDimensions.includes("sandbox_peer_authentication"));
  assert.ok(contract.readiness.requiredDimensions.includes("sandbox_fencing_store"));
  assert.equal(contract.result.providerResourceReferenceOpaqueAndProtected, true);
  assert.equal(contract.result.physicalMetadataAllowed, false);
  assert.equal(contract.audit.sandbox_every_side_effect_emits_audit_fact, true);
  assert.equal(contract.audit.sandbox_denial_emits_security_fact, true);
  assert.equal(contract.audit.sandbox_audit_durable_when_telemetry_unavailable, true);
  assert.equal(contract.privilegeBoundary.sandbox_firecracker_runs_as_root, false);
  assert.equal(contract.privilegeBoundary.sandbox_docker_socket_allowed, false);
  assert.equal(contract.privilegeBoundary.sandbox_cloud_credentials_allowed, false);
});
