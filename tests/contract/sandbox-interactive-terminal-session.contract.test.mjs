import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(path.join(repoRoot, "specs/sandbox-interactive-terminal-session.contract.json"), "utf8"),
);

test("interactive Terminal remains a draft non-runtime contract", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.interactive-terminal-session-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract.candidateNamesArePubliclyApproved, false);
  assert.ok(Object.values(contract.materialization).every((allowed) => allowed === false));
});

test("Command and Interactive Terminal capabilities cannot be conflated", () => {
  const split = contract.capabilitySplitCandidate;
  assert.equal(split.currentNonInteractiveCandidate, "Terminal");
  assert.equal(split.currentCandidateProvesInteractiveTerminal, false);
  assert.equal(split.proposedNonInteractiveCapability, "Command");
  assert.equal(split.proposedInteractiveCapability, "InteractiveTerminal");
  assert.equal(split.publicRenameAuthorized, false);
  assert.equal(split.descriptorRequiresPortAndPlatformConformance, true);
});

test("Terminal Session has one cohesive authority below the Workspace Runtime", () => {
  assert.equal(contract.authority.portCandidate, "SandboxTerminalSessionPort");
  assert.equal(contract.authority.separateFromCommandExecutor, true);
  assert.equal(contract.authority.separateFromLifecycleProvider, true);
  assert.equal(contract.authority.kernelIsOnlyCrossRepositoryRuntimeConsumer, true);
  assert.equal(contract.authority.birdcoderDirectAccessAllowed, false);
  assert.equal(contract.authority.agentsDirectAccessAllowed, false);
  assert.equal(contract.authority.terminalSessionOwnsWorkspaceRevisionOrWriterLease, false);
  assert.equal(contract.authority.terminalSessionOwnsRuntimeAllocation, false);
});

test("Terminal launch uses a logical executable without shell or ambient authority", () => {
  const policy = contract.launchPolicy;
  assert.equal(policy.logicalExecutableRequired, true);
  assert.equal(policy.providerOwnedImmutableRegistryRequired, true);
  assert.equal(policy.finalEnvironmentStartsEmpty, true);
  for (const field of [
    "shellCommandStringAllowed",
    "implicitShellFallbackAllowed",
    "loginProfileLoadingAllowed",
    "callerExecutablePathAllowed",
    "pathOrCwdSearchAllowed",
    "ambientEnvironmentAllowed",
    "secretValueAllowed",
  ]) {
    assert.equal(policy[field], false);
  }
});

test("Terminal lifecycle and controller enforce one current writer", () => {
  assert.deepEqual(contract.lifecycle.states, [
    "requested", "opening", "ready", "attached", "detached", "closing", "closed", "failed", "quarantined",
  ]);
  assert.equal(contract.lifecycle.terminalStateCannotReattach, true);
  assert.equal(contract.controller.singleControllerV1, true);
  assert.equal(contract.controller.multipleControllersAllowed, false);
  assert.equal(contract.controller.observersAllowed, false);
  assert.equal(contract.controller.controllerLeaseRequired, true);
  assert.equal(contract.controller.controllerGenerationMonotonic, true);
  assert.equal(contract.controller.staleConnectionMutationAllowed, false);
});

test("Terminal input is at-most-once and resize is idempotent", () => {
  assert.equal(contract.input.monotonicSequenceRequired, true);
  assert.equal(contract.input.canonicalFingerprintRequired, true);
  assert.equal(contract.input.atMostOncePerTerminalSession, true);
  assert.equal(contract.input.sameSequenceSameFingerprintReplaysAck, true);
  assert.equal(contract.input.sameSequenceDifferentFingerprintConflicts, true);
  assert.equal(contract.input.unknownDeliveryRequiresStatusLookup, true);
  assert.equal(contract.input.blindRetransmissionAllowed, false);
  assert.equal(contract.resize.idempotencyRequired, true);
  assert.equal(contract.resize.hostPixelsFontDisplayOrDeviceMetadataAllowed, false);
});

test("Terminal output and reconnect are bounded and connection-safe", () => {
  assert.equal(contract.output.singleOrderedPtyByteStream, true);
  assert.equal(contract.output.monotonicSequenceRequired, true);
  assert.equal(contract.output.resumeCursorRequired, true);
  assert.equal(contract.output.boundedReplayRequired, true);
  assert.equal(contract.output.normalLogMetricOrAuditPayloadCopyAllowed, false);
  assert.equal(contract.disconnectAndReconnect.connectionAndTerminalLifetimesSeparate, true);
  assert.equal(contract.disconnectAndReconnect.disconnectImmediatelyReleasesRuntime, false);
  assert.equal(contract.disconnectAndReconnect.boundedGraceRequired, true);
  assert.equal(contract.disconnectAndReconnect.cloudFallbackAfterLocalDisconnectAllowed, false);
});

test("Terminal outcome and Workspace checkpoint ordering fail closed", () => {
  assert.equal(contract.terminalArbitration.durableFirstTerminalCasRequired, true);
  assert.equal(contract.terminalArbitration.laterOutcomeMayRewritePrimary, false);
  assert.equal(contract.terminalArbitration.cleanupStatusSeparateFromPrimaryOutcome, true);
  assert.equal(contract.terminalArbitration.cleanupUncertaintyQuarantinesBindingAndCapacity, true);
  assert.equal(contract.workspaceTransaction.freezeRejectsNewAttachInputAndResize, true);
  assert.equal(contract.workspaceTransaction.durableCheckpointHandoffAfterTerminalOutcome, true);
  assert.equal(contract.workspaceTransaction.runtimeReleaseAfterCheckpointAndCleanup, true);
  assert.equal(contract.workspaceTransaction.terminalDisconnectMaySkipCheckpoint, false);
});

test("platform support requires exact containment and no fallback", () => {
  const byPlatform = new Map(contract.platformMatrix.map((entry) => [entry.platform, entry]));
  assert.ok(byPlatform.get("windows-local").requiredMechanisms.includes("conpty"));
  assert.ok(byPlatform.get("windows-local").requiredMechanisms.includes("job-object-kill-on-close"));
  assert.ok(byPlatform.get("linux-local").requiredMechanisms.includes("delegated-cgroup-v2"));
  assert.equal(byPlatform.get("macos-local").candidateSupport, "denied");
  assert.equal(byPlatform.get("macos-local").fallbackAllowed, false);
  assert.ok(byPlatform.get("linux-kvm-firecracker").requiredMechanisms.includes("authenticated-guest-agent"));
});

test("Terminal transport is private and all exact policy values await owners", () => {
  assert.equal(contract.privateTransport.publicSandboxWebSocketAllowed, false);
  assert.equal(contract.privateTransport.directBirdcoderConnectionAllowed, false);
  assert.equal(contract.privateTransport.kernelMediatedPlacementAndProxyRequired, true);
  assert.equal(contract.privacyAndObservability.inputAndOutputClassification, "sensitive-content");
  assert.equal(contract.privacyAndObservability.ordinaryTelemetryContentAllowed, false);
  for (const [name, value] of Object.entries(contract.bounds)) {
    if (name.endsWith("Max")) {
      assert.equal(value, null, `${name} must remain unresolved until owner approval`);
    }
  }
  assert.equal(contract.bounds.allExactValuesRequireOwnerApproval, true);
  assert.equal(contract.bounds.unboundedValueAllowed, false);
  assert.ok(contract.requiredRealEvidence.length >= 14);
  assert.equal(contract.humanReview.approvedOutcomeRequiredBeforeImplementation, true);
});
