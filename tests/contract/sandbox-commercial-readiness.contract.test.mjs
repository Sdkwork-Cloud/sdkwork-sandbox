import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  assessCommercialReadiness,
  formatCommercialReadinessAssessment,
  parseCommercialReadinessArgs,
} from "../../tools/check-sandbox-commercial-readiness.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contract = JSON.parse(
  readFileSync(path.join(repoRoot, "specs/sandbox-commercial-readiness.contract.json"), "utf8"),
);

test("commercial readiness derives a truthful no-go decision", () => {
  const assessment = assessCommercialReadiness(contract, { repoRoot });

  assert.equal(contract.status, "active");
  assert.equal(contract.releaseDecision.staticContractSuccessIsRuntimeEvidence, false);
  assert.equal(contract.releaseDecision.commercialClaimsAllowed, false);
  assert.equal(assessment.decision, "no-go");
  assert.equal(assessment.missingEvidence.length, 0);
  assert.ok(assessment.blockedSlices.length >= 6);
  assert.ok(assessment.unresolvedContracts.length >= 5);
  assert.deepEqual(
    assessment.blockedRepositories.map(({ repository }) => repository),
    ["sdkwork-birdcoder", "sdkwork-agents", "sdkwork-kernel", "sdkwork-sandbox"],
  );
});

test("commercial readiness preserves the four-repository authority chain", () => {
  assert.deepEqual(contract.authorityChain.dependencyDirection, [
    "sdkwork-birdcoder -> sdkwork-agents",
    "sdkwork-agents -> sdkwork-kernel",
    "sdkwork-kernel -> sdkwork-sandbox",
  ]);
  assert.ok(contract.authorityChain.forbiddenDirectDependencies.includes("sdkwork-agents -> sdkwork-sandbox"));
  assert.equal(
    contract.authorityChain.owners.capacityPlacementRuntimeAllocationAttachmentIsolationAndCleanup,
    "sdkwork-sandbox",
  );
  assert.equal(
    contract.authorityChain.owners.workspaceAndCheckpointBytes,
    "sdkwork-drive-or-approved-workspace-volume-owner",
  );
  assert.equal(contract.authorityChain.owners.pricingInvoiceAndPaymentTruth, "sdkwork-commerce");
});

test("commercial readiness separates stable semantics from replaceable mechanisms", () => {
  assert.ok(contract.stableInvariants.includes("runtime-image-and-persistent-workspace-data-separation"));
  assert.ok(contract.stableInvariants.includes("independent-leases-fencing-and-idempotency-scopes"));

  const providerBoundary = contract.extensionBoundaries.find(({ id }) => id === "sandbox-provider-adapter");
  assert.equal(providerBoundary.providerBranchingAboveSandboxAllowed, false);
  assert.ok(providerBoundary.replaceableMechanisms.includes("local-host-user"));
  assert.ok(providerBoundary.replaceableMechanisms.includes("firecracker-microvm"));

  const transportBoundary = contract.extensionBoundaries.find(
    ({ id }) => id === "control-plane-transport-adapter",
  );
  assert.equal(transportBoundary.transportMayChangeDomainSemantics, false);
});

test("commercial readiness makes missing product contracts explicit", () => {
  const missingIds = contract.missingReadyContracts.map(({ id }) => id);
  assert.deepEqual(missingIds, [
    "sandbox-internal-control-plane-and-transport",
    "sandbox-interactive-terminal-session",
    "sandbox-runtime-secret-projection",
    "sandbox-cloud-data-residency-and-recovery",
    "sandbox-cross-repository-version-compatibility",
  ]);
  assert.equal(contract.goPolicy.missingReadyContractsMustBeEmpty, true);
  assert.equal(contract.goPolicy.realEnvironmentEvidenceRequired, true);
  assert.equal(contract.goPolicy.immutableRevisionSetRequired, true);
  assert.equal(
    contract.missingReadyContracts.find(({ id }) => id === "sandbox-runtime-secret-projection")
      .candidateRef,
    "specs/sandbox-runtime-secret-projection.contract.json",
  );
  assert.equal(
    contract.missingReadyContracts.find(({ id }) => id === "sandbox-cloud-data-residency-and-recovery")
      .candidateRef,
    "specs/sandbox-cloud-data-residency.contract.json",
  );
  assert.equal(
    contract.missingReadyContracts.find(({ id }) => id === "sandbox-cross-repository-version-compatibility")
      .candidateRef,
    "specs/sandbox-cross-repository-version-compatibility.contract.json",
  );
});

test("commercial readiness command options are closed and report no-go", () => {
  assert.deepEqual(parseCommercialReadinessArgs([]), { json: false, requireGo: false });
  assert.deepEqual(parseCommercialReadinessArgs(["--json", "--require-go"]), {
    json: true,
    requireGo: true,
  });
  assert.throws(() => parseCommercialReadinessArgs(["--contract", "elsewhere.json"]));

  const output = formatCommercialReadinessAssessment(
    assessCommercialReadiness(contract, { repoRoot }),
  );
  assert.match(output, /^SDKWork Sandbox commercial readiness: NO-GO$/mu);
  assert.match(output, /^missing ready contracts: 5$/mu);
});
