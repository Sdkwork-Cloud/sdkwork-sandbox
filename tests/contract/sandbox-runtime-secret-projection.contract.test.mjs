import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(path.join(repoRoot, "specs/sandbox-runtime-secret-projection.contract.json"), "utf8"),
);

test("Runtime Secret projection remains an unauthorized draft candidate", () => {
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0025");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract.candidateNamesArePubliclyApproved, false);
  assert.ok(Object.values(contract.materialization).every((value) => value === false));
  assert.equal(contract.humanReview.approvedOutcomeRequiredBeforeImplementation, true);
});

test("Secret custody, business intent, transport and projection remain separate authorities", () => {
  assert.equal(contract.authority.businessUseIntentOwner, "sdkwork-agents");
  assert.equal(contract.authority.principalAndTenantAuthorizationOwner, "sdkwork-iam");
  assert.equal(
    contract.authority.secretValueVersionPolicyGrantAndRevocationOwner,
    "approved-secret-authority",
  );
  assert.equal(contract.authority.opaqueGrantTransportOwner, "sdkwork-kernel");
  assert.equal(
    contract.authority.projectionLifecycleFencingCleanupAndQuarantineOwner,
    "sdkwork-sandbox",
  );
  assert.equal(contract.authority.sandboxOwnsSecretValuesOrBusinessBindings, false);
  assert.equal(contract.authority.birdcoderDirectSandboxAccessAllowed, false);
  assert.equal(contract.authority.agentsDirectSandboxAccessAllowed, false);
});

test("Cross-repository and durable boundaries remain value-free", () => {
  assert.equal(contract.valueFreeBoundary.publicContractCarriesOpaqueGrantOnly, true);
  assert.equal(contract.valueFreeBoundary.opaqueGrantContainsSecretValue, false);
  assert.equal(contract.valueFreeBoundary.opaqueGrantIsCredentialGradeSensitive, true);
  assert.equal(contract.valueFreeBoundary.rawGrantPersistenceAllowed, false);
  assert.equal(
    contract.valueFreeBoundary.secretValueInBirdcoderAgentsKernelOrSandboxControlPlaneAllowed,
    false,
  );
  assert.equal(contract.valueFreeBoundary.secretValueInDatabaseCacheEventOrOrdinaryTelemetryAllowed, false);
  assert.equal(contract.valueFreeBoundary.durableRecoveryUsesPersistedGrantAllowed, false);
});

test("Grant scope is post-placement, exact and fenced", () => {
  assert.equal(contract.grantBinding.mintedAfterPlacementFactsExist, true);
  for (const required of [
    "tenant",
    "workspace-revision",
    "sandbox-session-and-runtime-binding",
    "kernel-placement-generation",
    "sandbox-fencing-token",
    "attested-node-device-or-guest",
    "deployment-lane",
    "region",
    "execution-audience",
    "logical-projection-target",
    "not-before-and-expiry",
    "nonce",
  ]) {
    assert.ok(contract.grantBinding.requiredClaims.includes(required), `missing ${required}`);
  }
  assert.equal(contract.grantBinding.claimsValidatedBySecretAuthority, true);
  assert.equal(contract.grantBinding.callerClaimsMayWidenGrant, false);
  assert.equal(contract.grantBinding.currentSandboxFencingRequiredForEveryMutation, true);
});

test("Local and Cloud Secret residency cannot silently cross lanes, devices or regions", () => {
  assert.equal(contract.laneAndResidency.localGrantValidInCloud, false);
  assert.equal(contract.laneAndResidency.cloudGrantValidOnLocalDevice, false);
  assert.equal(contract.laneAndResidency.localSecretValueAutomaticCloudSyncAllowed, false);
  assert.equal(contract.laneAndResidency.crossDeviceResolutionAllowed, false);
  assert.equal(contract.laneAndResidency.crossRegionResolutionOrFallbackAllowed, false);
  assert.equal(contract.laneAndResidency.authorityFallbackAllowed, false);
});

test("Projection targets are immutable and environment delivery is an explicit exception", () => {
  assert.equal(contract.targetPolicy.immutableRuntimeBindingRegistryRequired, true);
  assert.deepEqual(contract.targetPolicy.candidateModes, [
    "process-descriptor-or-handle",
    "protected-runtime-tmpfs-file",
    "explicit-process-environment-exception",
  ]);
  assert.equal(contract.targetPolicy.processEnvironmentEnabledByDefault, false);
  assert.equal(contract.targetPolicy.processEnvironmentAppliesOnlyToNewProcessTree, true);
  assert.equal(contract.targetPolicy.hostOrServiceProcessEnvironmentMutationAllowed, false);
  assert.ok(contract.targetPolicy.forbiddenTargets.includes("workspace-path"));
  assert.ok(contract.targetPolicy.forbiddenTargets.includes("ambient-environment"));
  assert.ok(contract.targetPolicy.forbiddenTargets.includes("caller-selected-name-or-path"));
});

test("Projection lifecycle and material handling fail closed", () => {
  assert.deepEqual(contract.lifecycle.states, [
    "requested",
    "validating",
    "materializing",
    "active",
    "rotating",
    "revoking",
    "released",
    "failed",
    "quarantined",
  ]);
  assert.equal(contract.lifecycle.uncertainCleanupState, "quarantined");
  assert.equal(contract.lifecycle.expiredRevokedReplayedOrPartiallyAppliedGrantRejected, true);
  assert.equal(contract.materialHandling.attestedTargetRequiredForCloud, true);
  assert.equal(contract.materialHandling.boundedZeroizingMemoryRequired, true);
  assert.equal(contract.materialHandling.atomicCompleteVersionVisibilityRequired, true);
  assert.equal(contract.materialHandling.pathCanonicalizationOrCheckThenOpenIsSecurityBoundary, false);
  assert.equal(contract.materialHandling.coreDumpCrashReportSupportBundleOrSwapExposureAllowed, false);
});

test("Rotation, revocation, expiry and Authority outage are bounded and non-fallback", () => {
  assert.equal(contract.rotationRevocationAndOutage.immutableSecretVersionsRequired, true);
  assert.equal(contract.rotationRevocationAndOutage.environmentRotationRequiresProcessReplacement, true);
  assert.equal(contract.rotationRevocationAndOutage.revokeOrExpiryBlocksNewLaunchImmediately, true);
  assert.equal(contract.rotationRevocationAndOutage.targetRemovalZeroizationAndResidueVerificationRequired, true);
  assert.equal(contract.rotationRevocationAndOutage.authorityOutageAllowsNewProjectionRefreshOrRotation, false);
  assert.equal(contract.rotationRevocationAndOutage.authorityOutageAllowsOfflineLeaseExtension, false);
  assert.equal(contract.rotationRevocationAndOutage.activeProjectionMayExceedCurrentGrantExpiry, false);
  assert.equal(contract.rotationRevocationAndOutage.revocationErasesTenantCreatedCopiesClaimAllowed, false);
});

test("Checkpoint and pool ordering prevent platform-managed Secret reuse", () => {
  assert.equal(contract.checkpointAndPool.freezeStopsNewSecretConsumersFirst, true);
  assert.equal(contract.checkpointAndPool.projectionReleaseAndResidueVerificationBeforeCheckpoint, true);
  assert.equal(contract.checkpointAndPool.projectionRootExcludedFromCheckpointSnapshotAndBackup, true);
  assert.equal(contract.checkpointAndPool.secretExposedRuntimeReturnsToTenantNeutralPool, false);
  assert.equal(contract.checkpointAndPool.cloudMicroVmDestroyedAfterSecretExposure, true);
});

test("Audit and product claims remain value-free and evidence-scoped", () => {
  assert.equal(contract.auditPrivacyAndClaims.secretAuthorityOwnsAccessVersionRotationAndRevocationAudit, true);
  assert.equal(contract.auditPrivacyAndClaims.sandboxOwnsValueFreeProjectionAndCleanupAudit, true);
  assert.equal(contract.auditPrivacyAndClaims.ordinaryTelemetrySecretOrGrantContentAllowed, false);
  assert.equal(contract.auditPrivacyAndClaims.knownValueExactRedactionIsDefenseInDepthOnly, true);
  assert.equal(contract.auditPrivacyAndClaims.tenantCodeExfiltrationPreventionClaimAllowed, false);
  assert.equal(
    contract.auditPrivacyAndClaims.platformUnauthorizedPersistenceAndCrossTenantReusePreventionClaimRequiresEvidence,
    true,
  );
});

test("All exact limits await owner approval and real evidence remains mandatory", () => {
  for (const [name, value] of Object.entries(contract.bounds)) {
    if (name.endsWith("Max")) {
      assert.equal(value, null, `${name} must remain unresolved until owner approval`);
    }
  }
  assert.equal(contract.bounds.allExactValuesRequireOwnerApproval, true);
  assert.equal(contract.bounds.unboundedValueAllowed, false);
  assert.ok(contract.requiredRealEvidence.length >= 14);
  assert.ok(contract.requiredRealEvidence.includes("sandbox_secret_firecracker_attested_guest_projection_on_real_kvm"));
});
