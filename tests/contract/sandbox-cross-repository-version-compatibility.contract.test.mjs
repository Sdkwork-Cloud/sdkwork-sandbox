import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(path.join(repoRoot, "specs/sandbox-cross-repository-version-compatibility.contract.json"), "utf8"),
);

test("Cross-repository release compatibility remains an unauthorized draft candidate", () => {
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0027");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract.candidateNamesPubliclyApproved, false);
  assert.ok(Object.values(contract.materialization).every((value) => value === false));
  assert.equal(contract.humanReview.approvedOutcomeRequiredBeforeImplementation, true);
});

test("Release set binds all repositories and generated/artifact authorities immutably", () => {
  assert.equal(contract.releaseSet.candidateType, "SandboxCrossRepositoryReleaseSet");
  assert.equal(contract.releaseSet.immutableIdentityRequired, true);
  assert.equal(contract.releaseSet.mutableBranchTagLatestAliasOrLocalPatchIsIdentity, false);
  for (const required of [
    "sdkwork-birdcoder-source-revision",
    "sdkwork-agents-source-revision",
    "sdkwork-kernel-source-revision",
    "sdkwork-sandbox-source-revision",
    "workspace-and-storage-contract-revision",
    "rpc-proto-contract-revision",
    "generated-sdk-input-output-revisions",
    "local-provider-artifact-tuple",
    "firecracker-artifact-tuple",
  ]) {
    assert.ok(contract.releaseSet.requiredMembers.includes(required), `missing ${required}`);
  }
  assert.equal(contract.releaseSet.sourceDependencyLockAndGeneratorProvenanceRequired, true);
  assert.equal(contract.releaseSet.signatureSbomProvenanceAndDigestEvidenceRequired, true);
});

test("Compatibility dimensions are explicit and unknown or weaker relations fail closed", () => {
  for (const required of [
    "semantic-domain-contract",
    "rpc-wire",
    "generated-sdk-client",
    "database-and-drive-schema",
    "workspace-revision-and-checkpoint",
    "artifact-and-guest-protocol",
    "residency-policy",
    "secret-projection",
    "isolation-assurance",
  ]) {
    assert.ok(contract.compatibilityMatrix.dimensions.includes(required), `missing ${required}`);
  }
  assert.deepEqual(contract.compatibilityMatrix.allowedRelations, [
    "same",
    "forward",
    "backward",
    "migration-required",
    "incompatible",
  ]);
  assert.equal(contract.compatibilityMatrix.unknownRelationFailsClosed, true);
  assert.equal(contract.compatibilityMatrix.sharedVersionNumberImpliesCompatibility, false);
  assert.equal(contract.compatibilityMatrix.silentProtocolDowngradeAllowed, false);
  assert.equal(contract.compatibilityMatrix.weakerIsolationAssuranceFallbackAllowed, false);
  assert.equal(contract.compatibilityMatrix.weakerSecretOrResidencyPolicyFallbackAllowed, false);
});

test("Peer preflight precedes every side effect and rejects stale or mutable fallback", () => {
  assert.equal(contract.peerPreflight.requiredBeforePlacementMountSecretProjectionCommandTerminalAttachOrRecovery, true);
  assert.equal(contract.peerPreflight.peerAdvertisesReleaseSetContractCapabilityProfileArchitectureAndBounds, true);
  assert.equal(contract.peerPreflight.minimumAndMaximumCompatiblePeerRequired, true);
  assert.equal(contract.peerPreflight.staleOrExpiredDiscoveryMetadataRejected, true);
  assert.equal(contract.peerPreflight.revokedArtifactOrReleaseSetRejected, true);
  assert.equal(contract.peerPreflight.generationAndFenceRevalidated, true);
  assert.equal(contract.peerPreflight.staticCloudEndpointOrPackageFallbackAllowed, false);
});

test("Rollout and drain protect active transactions and uncertain capacity", () => {
  assert.equal(contract.rolloutAndDrain.stagedPublicationRequired, true);
  assert.equal(contract.rolloutAndDrain.preflightConformanceRequired, true);
  assert.equal(contract.rolloutAndDrain.boundedOverlapRequired, true);
  assert.equal(contract.rolloutAndDrain.incompatibleChangeStopsNewPlacementBeforeDrain, true);
  assert.equal(contract.rolloutAndDrain.activeTransactionsFreezeCheckpointCancelOrFinishWithinApprovedBound, true);
  assert.equal(contract.rolloutAndDrain.drainBeforeIncompatibleSchemaArtifactOrProtocolChange, true);
  assert.equal(contract.rolloutAndDrain.uncertainCapacityQuarantined, true);
});

test("Rollback is immutable and downgrade is an explicit exceptional migration", () => {
  assert.equal(contract.rollbackAndDowngrade.rollbackSelectsPreviousApprovedImmutableSet, true);
  assert.equal(contract.rollbackAndDowngrade.rollbackByMutableAliasAllowed, false);
  assert.equal(contract.rollbackAndDowngrade.rollbackPreflightChecksMigrationDataWorkspaceCheckpointSecretResidencyRpcSdkArtifactAndDrain, true);
  assert.equal(contract.rollbackAndDowngrade.downgradeDeniedByDefault, true);
  assert.equal(contract.rollbackAndDowngrade.downgradeRequiresExplicitMigrationRecoveryPlan, true);
  assert.equal(contract.rollbackAndDowngrade.newerOnlyStateMayBeConsumedByDowngrade, false);
  assert.equal(contract.rollbackAndDowngrade.publishedSetMutationAllowed, false);
  assert.equal(contract.rollbackAndDowngrade.hotfixCreatesImmutableChildSet, true);
});

test("Support windows expire safely without weaker negotiation", () => {
  assert.equal(contract.supportWindow.minimumSupportedClientNodeControlPlaneAndSdkVersionsRequired, true);
  assert.equal(contract.supportWindow.deprecationNoticeRequired, true);
  assert.equal(contract.supportWindow.securityFixOverlapRequired, true);
  assert.equal(contract.supportWindow.migrationDeadlineRequired, true);
  assert.equal(contract.supportWindow.rollbackHorizonRequired, true);
  assert.equal(contract.supportWindow.expiredPeerFailsWithUpgradeRequired, true);
  assert.equal(contract.supportWindow.expiredPeerMayNegotiateWeakerAssurance, false);
});

test("Evidence and exact release bounds remain mandatory and unresolved", () => {
  assert.equal(contract.evidence.sourceAndDependencyCommandsRecorded, true);
  assert.equal(contract.evidence.generatedSdkProtoInputsOutputsAndGeneratorRecorded, true);
  assert.equal(contract.evidence.artifactSignatureDigestSbomAndProvenanceRecorded, true);
  assert.equal(contract.evidence.migrationRollbackAndForwardFixRecorded, true);
  assert.equal(contract.evidence.staticContractSuccessIsRuntimeEvidence, false);
  for (const [name, value] of Object.entries(contract.bounds)) {
    if (name.endsWith("Max")) {
      assert.equal(value, null, `${name} must remain unresolved until owner approval`);
    }
  }
  assert.equal(contract.bounds.allExactValuesRequireOwnerApproval, true);
  assert.equal(contract.bounds.unboundedValueAllowed, false);
  assert.ok(contract.requiredRealEvidence.length >= 11);
});
