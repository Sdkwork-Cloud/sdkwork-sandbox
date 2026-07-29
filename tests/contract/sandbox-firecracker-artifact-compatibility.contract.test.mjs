import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(
    path.join(repoRoot, "specs/sandbox-firecracker-artifact-compatibility.contract.json"),
    "utf8",
  ),
);

test("Sandbox Firecracker artifact compatibility remains a draft non-runtime contract", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.firecracker-artifact-compatibility-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0012");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract.manifestCandidate.type, "SandboxFirecrackerArtifactManifest");
  assert.equal(contract["x-sdkwork-require-human-review"], true);
  assert.equal(contract["x-sdkwork-no-runtime-implementation"], true);
  assert.equal(contract["x-sdkwork-no-release-artifacts"], true);
});

test("Sandbox Firecracker manifest and descriptors are prefixed, bounded, and immutable", () => {
  for (const sandbox_field of [
    ...contract.manifestCandidate.requiredFields,
    ...contract.artifactDescriptor.requiredFields,
    ...contract.compatibilityTuple.requiredFields,
  ]) {
    assert.match(sandbox_field, /^sandbox_/u);
  }
  assert.equal(contract.manifestCandidate.unknownFieldsRejected, true);
  assert.equal(contract.manifestCandidate.immutableAfterPublication, true);
  assert.equal(contract.artifactDescriptor.digestAlgorithm, "sha256");
  assert.equal(contract.artifactDescriptor.digestLength, 64);
  assert.ok(contract.bounds.sandbox_manifest_max_bytes <= 131072);
  assert.equal(contract.bounds.sandbox_artifact_count_max, 6);
  assert.ok(contract.bounds.sandbox_reference_max_length <= 512);
});

test("Sandbox Firecracker artifact roles form one exact compatibility tuple", () => {
  assert.deepEqual(
    contract.artifactRoles.map((sandbox_artifact) => sandbox_artifact.name),
    [
      "sandbox_firecracker",
      "sandbox_jailer",
      "sandbox_guest_kernel",
      "sandbox_rootfs",
      "sandbox_guest_agent",
      "sandbox_initrd",
    ],
  );
  assert.deepEqual(
    contract.artifactRoles.filter((sandbox_artifact) => !sandbox_artifact.required).map(
      (sandbox_artifact) => sandbox_artifact.name,
    ),
    ["sandbox_initrd"],
  );
  assert.deepEqual(contract.compatibilityTuple.supportedHostArchitectures, [
    "linux-kvm-x86_64",
    "linux-kvm-aarch64",
  ]);
  assert.equal(contract.compatibilityTuple.exactArtifactDigestReferencesRequired, true);
  assert.equal(contract.compatibilityTuple.firecrackerAndJailerReleaseMustMatch, true);
  assert.equal(contract.compatibilityTuple.crossArchitectureTupleReuseAllowed, false);
  assert.equal(contract.compatibilityTuple.partialTupleAllowed, false);
  assert.equal(contract.compatibilityTuple.runtimeCompatibilityOverrideAllowed, false);
});

test("Sandbox Firecracker artifact evidence fails closed", () => {
  assert.match(
    contract.evidence.sdkworkArtifactEvidenceSchema,
    /sdkwork\.artifact-evidence\.schema\.v1\.json$/u,
  );
  for (const sandbox_evidence_flag of [
    "bundleChecksumRequired",
    "bundleSignatureRequired",
    "sbomRequiredForEveryArtifact",
    "provenanceRequiredForEveryArtifact",
    "licenseRecordRequiredForEveryArtifact",
    "advisorySnapshotRequiredForEveryArtifact",
    "sourceRevisionRequired",
    "buildWorkflowAndToolchainRequired",
    "evidenceMustMatchReleaseAndArchitecture",
    "missingOrInvalidEvidenceFailsClosed",
  ]) {
    assert.equal(contract.evidence[sandbox_evidence_flag], true);
  }
  assert.equal(contract.evidence.signingPrivateMaterialAllowedInManifest, false);
});

test("Sandbox Firecracker runtime consumption forbids downloads, aliases, and path races", () => {
  const sandbox_runtime = contract.runtimeConsumption;
  assert.equal(sandbox_runtime.sandbox_provider_builds_artifacts, false);
  assert.equal(sandbox_runtime.sandbox_provider_publishes_artifacts, false);
  assert.equal(sandbox_runtime.sandbox_provider_downloads_artifacts, false);
  assert.equal(sandbox_runtime.sandbox_runtime_network_fetch_allowed, false);
  assert.equal(sandbox_runtime.sandbox_arbitrary_url_allowed, false);
  assert.equal(sandbox_runtime.sandbox_mutable_alias_allowed, false);
  assert.equal(sandbox_runtime.sandbox_latest_allowed, false);
  assert.equal(sandbox_runtime.sandbox_unverified_local_artifact_allowed, false);
  assert.equal(sandbox_runtime.sandbox_source_checkout_fallback_allowed, false);
  assert.equal(sandbox_runtime.sandbox_symlink_allowed, false);
  assert.equal(sandbox_runtime.sandbox_hardlink_allowed, false);
  assert.equal(sandbox_runtime.sandbox_read_only_materialization_required, true);
  assert.equal(sandbox_runtime.sandbox_atomic_publish_required, true);
  assert.equal(sandbox_runtime.sandbox_verify_after_open_before_use, true);
  assert.equal(sandbox_runtime.sandbox_fail_closed_on_file_identity_or_metadata_change, true);
});

test("Sandbox Firecracker revocation and rollback cannot weaken assurance", () => {
  const sandbox_policy = contract.revocationAndRollback;
  assert.equal(sandbox_policy.sandbox_revocation_check_before_allocate, true);
  assert.equal(sandbox_policy.sandbox_revocation_check_before_start, true);
  assert.equal(sandbox_policy.sandbox_critical_advisory_blocks_new_allocations, true);
  assert.equal(sandbox_policy.sandbox_unknown_advisory_state_blocks_new_allocations, true);
  assert.equal(sandbox_policy.sandbox_revoked_tuple_never_selected_for_recovery, true);
  assert.equal(sandbox_policy.sandbox_rollback_target_must_be_previous_approved_manifest_digest, true);
  assert.equal(sandbox_policy.sandbox_rollback_rebuild_allowed, false);
  assert.equal(sandbox_policy.sandbox_rollback_mutable_alias_allowed, false);
  assert.equal(sandbox_policy.sandbox_rollback_requires_audit, true);
  assert.equal(sandbox_policy.sandbox_cross_architecture_rollback_allowed, false);
});

test("Sandbox Firecracker artifact readiness and ownership remain fail closed", () => {
  assert.equal(contract.readiness.type, "SandboxFirecrackerArtifactReadiness");
  assert.equal(contract.readiness.failureMode, "fail-closed");
  assert.equal(contract.readiness.degradedMayAuthorizeAllocationOrStart, false);
  assert.equal(contract.readiness.readinessClaimIsMicroVmEvidenceByItself, false);
  assert.ok(contract.readiness.requiredDimensions.includes("sandbox_manifest_signature"));
  assert.ok(contract.readiness.requiredDimensions.includes("sandbox_runtime_file_identity"));
  assert.equal(contract.ownership.sandbox_release_authority_owns_publication_and_revocation, true);
  assert.equal(contract.ownership.sandbox_provider_only_validates_and_consumes, true);
  assert.equal(contract.ownership.sandbox_host_isolation_broker_may_select_or_build, false);
  assert.equal(contract.ownership.sandbox_service_host_may_override_digest, false);
  assert.ok(contract.forbiddenPublicMetadata.includes("sandbox_artifact_host_path"));
  assert.ok(contract.forbiddenPublicMetadata.includes("sandbox_signing_private_key"));
});
