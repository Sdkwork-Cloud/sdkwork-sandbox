import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(path.join(repoRoot, "specs/sandbox-cloud-data-residency.contract.json"), "utf8"),
);

test("Cloud data residency remains an unauthorized draft candidate", () => {
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0026");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract.candidateClaimsPubliclyApproved, false);
  assert.ok(Object.values(contract.materialization).every((value) => value === false));
  assert.equal(contract.humanReview.approvedOutcomeRequiredBeforeImplementation, true);
});

test("Cloud data authorities preserve cohesive ownership", () => {
  assert.equal(contract.authority.tenantAndResidencyPolicyOwner, "sdkwork-iam-and-region-registry");
  assert.equal(contract.authority.workspaceBusinessRevisionAuthorizationOwner, "sdkwork-agents");
  assert.equal(contract.authority.workspaceAndCheckpointBytesOwner, "sdkwork-drive-or-approved-volume-authority");
  assert.equal(contract.authority.sandboxLifecycleAndRuntimeControlFactsOwner, "sdkwork-sandbox");
  assert.equal(contract.authority.kernelExecutionPlacementOwner, "sdkwork-kernel");
  assert.equal(contract.authority.sandboxOwnsWorkspaceOrCheckpointBytes, false);
  assert.equal(contract.authority.sandboxOwnsTenantResidencyPolicy, false);
  assert.equal(contract.authority.runtimeResumeMayBypassAgentsDriveOrIam, false);
});

test("Residency uses explicit SDKWork, provider, storage and failure-domain layers", () => {
  assert.equal(contract.claimScope.appliesOnlyToCloudLane, true);
  assert.equal(contract.claimScope.cloudTopologyAloneProvesResidency, false);
  assert.equal(contract.claimScope.providerRegionAloneProvesResidency, false);
  assert.equal(contract.claimScope.storageRegionAloneProvesResidency, false);
  assert.deepEqual(contract.claimScope.requiredTupleFields, [
    "regionCode",
    "allowedProviderRegions",
    "allowedStorageRegions",
    "allowedProcessingRegions",
    "availabilityZoneOrFailureDomainPolicy",
    "replicationPolicy",
    "residencyPolicyRevision",
  ]);
  assert.equal(contract.claimScope.callerMayWidenTuple, false);
  assert.equal(contract.claimScope.unknownLocationFailsClosed, true);
});

test("Data inventory contains durable, derived, operational and recovery classes", () => {
  const ids = contract.dataClasses.map(({ id }) => id);
  for (const required of [
    "workspace-source-bytes",
    "agents-workspace-revision-business-state",
    "durable-checkpoint-candidate-handoff",
    "sandbox-lifecycle-binding-operation-control",
    "command-terminal-output-and-generated-artifact",
    "logs-audit-events-support-diagnostics",
    "cache-temp-and-scratch",
    "database-drive-backup-wal-pitr-and-dr-copies",
  ]) {
    assert.ok(ids.includes(required), `missing ${required}`);
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(contract.dataClasses.every(({ owner }) => typeof owner === "string" && owner.length > 0));
});

test("Replication, export and purge are explicit, class-complete and non-fallback", () => {
  assert.equal(contract.replicationAndResidency.primaryAndDrCopiesAreDistinctResources, true);
  assert.equal(contract.replicationAndResidency.crossRegionReplicationRequiresExplicitPolicy, true);
  assert.equal(contract.replicationAndResidency.replicationDestinationAllowlistRequired, true);
  assert.equal(contract.replicationAndResidency.partialOrStaleReplicaMayBePromoted, false);
  assert.equal(contract.replicationAndResidency.implicitCrossRegionStorageAllowed, false);
  assert.equal(contract.replicationAndResidency.implicitLocalCloudOrProviderFallbackAllowed, false);
  assert.equal(contract.retentionExportAndDeletion.exportIsTenantAuthorizedScopedAuditedAndExpiring, true);
  assert.equal(contract.retentionExportAndDeletion.secretValuesAndInfrastructureCredentialsExported, false);
  assert.equal(contract.retentionExportAndDeletion.purgeIncludesPrimaryDerivedReplicaBackupAndSupportCopies, true);
  assert.equal(contract.retentionExportAndDeletion.unknownOrUnreachableClassMayClaimDeleted, false);
});

test("Recovery restores data before a fresh runtime and fencing", () => {
  assert.equal(contract.backupAndRecovery.databaseAwareBaseWalAndPitrRequired, true);
  assert.equal(contract.backupAndRecovery.backupJobAloneProvesRecovery, false);
  assert.equal(contract.backupAndRecovery.restoreTargetIsIsolatedAndNonDestructive, true);
  assert.deepEqual(contract.backupAndRecovery.recoveryOrder.slice(0, 5), [
    "approved-region-and-control-plane",
    "iam-residency-policy",
    "agents-drive-workspace-metadata-and-bytes",
    "revision-checkpoint-integrity",
    "sandbox-control-facts-or-rebuild",
  ]);
  assert.equal(contract.backupAndRecovery.runtimeMayResumeBeforeFreshFencingAndDataValidation, false);
  assert.equal(contract.backupAndRecovery.pitrGapOrChecksumMismatchQuarantines, true);
});

test("Tenant isolation and support access fail closed", () => {
  assert.equal(contract.tenantIsolation.authorizationKeyScopeNamespaceAndRoleIsolationRequired, true);
  assert.equal(contract.tenantIsolation.sharedPhysicalInfrastructureMayShareLogicalData, false);
  assert.equal(contract.tenantIsolation.crossTenantRestoreExportCacheLogBackupOrSupportReadAllowed, false);
  assert.equal(contract.tenantIsolation.residueVerificationRequired, true);
  assert.equal(contract.tenantIsolation.operatorAccessTimeBoundRegionScopedAndAudited, true);
  assert.equal(contract.failurePolicy.supportBundleContainsRawWorkspaceOutputSecretOrInfrastructureDetails, false);
});

test("Secret projection and runtime images remain outside recovery data", () => {
  assert.equal(contract.secretAndRuntimeExclusion.secretProjectionRootsInWorkspaceCheckpointSnapshotBackupOrReplicationAllowed, false);
  assert.equal(contract.secretAndRuntimeExclusion.rawSecretValuesOrGrantsPersistedForRecoveryAllowed, false);
  assert.equal(contract.secretAndRuntimeExclusion.runtimeImageCarriesTenantDataOrSecretsAllowed, false);
  assert.equal(contract.secretAndRuntimeExclusion.cloudRecoveryRequiresFreshSecretGrant, true);
  assert.equal(contract.secretAndRuntimeExclusion.secretExposedRuntimeReturnsToWarmPool, false);
});

test("Failure policy is fail-closed and exact recovery limits await approval", () => {
  assert.equal(contract.failurePolicy.regionStorageBackupReplicaPitrCorruptionOrDeletionUncertaintyFailsClosed, true);
  assert.equal(contract.failurePolicy.silentRegionProviderStorageOrLocalFallbackAllowed, false);
  assert.equal(contract.failurePolicy.staleRevisionCheckpointOrFencingMayStartRuntime, false);
  for (const [name, value] of Object.entries(contract.bounds)) {
    if (name.endsWith("Max") || name.endsWith("Min")) {
      assert.equal(value, null, `${name} must remain unresolved until owner approval`);
    }
  }
  assert.equal(contract.bounds.allExactValuesRequireOwnerApproval, true);
  assert.equal(contract.bounds.unboundedValueAllowed, false);
  assert.ok(contract.requiredRealEvidence.length >= 13);
});
