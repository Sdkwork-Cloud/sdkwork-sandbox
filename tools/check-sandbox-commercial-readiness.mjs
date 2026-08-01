#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = resolve(repositoryRoot, "specs/sandbox-commercial-readiness.contract.json");

function fail(message) {
  throw new Error(message);
}

export function parseCommercialReadinessArgs(argv) {
  const options = { json: false, requireGo: false };
  for (const argument of argv) {
    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--require-go") {
      options.requireGo = true;
    } else {
      fail(`unsupported argument: ${argument}`);
    }
  }
  return options;
}

export function readCommercialReadinessContract() {
  return JSON.parse(readFileSync(contractPath, "utf8"));
}

export function assessCommercialReadiness(contract, { repoRoot = repositoryRoot } = {}) {
  if (contract?.kind !== "sdkwork.sandbox.commercial-readiness") {
    fail("commercial readiness contract kind is invalid");
  }
  if (!Array.isArray(contract.deliverySlices) || contract.deliverySlices.length === 0) {
    fail("commercial readiness contract must declare delivery slices");
  }
  if (!Array.isArray(contract.missingReadyContracts)) {
    fail("commercial readiness contract must declare missing ready contracts");
  }
  if (!Array.isArray(contract.crossRepositorySnapshot)) {
    fail("commercial readiness contract must declare the cross-repository snapshot");
  }
  const requiredSliceStatus = contract.goPolicy?.allRequiredDeliverySlicesMustBe;
  if (typeof requiredSliceStatus !== "string" || requiredSliceStatus.length === 0) {
    fail("commercial readiness contract must declare the required delivery slice status");
  }
  const allowedRepositoryStatuses = contract.goPolicy?.crossRepositoryStatusesAllowed;
  if (!Array.isArray(allowedRepositoryStatuses) || allowedRepositoryStatuses.length === 0) {
    fail("commercial readiness contract must declare allowed cross-repository statuses");
  }
  const readyCrossRepositoryStatuses = new Set(allowedRepositoryStatuses);

  const missingEvidence = [];
  for (const slice of contract.deliverySlices) {
    for (const relativePath of slice.localEvidenceRefs ?? []) {
      if (!existsSync(resolve(repoRoot, relativePath))) {
        missingEvidence.push(relativePath);
      }
    }
  }

  const blockedSlices = contract.deliverySlices
    .filter(
      (slice) =>
        slice.requiredForCommercialRelease && slice.status !== requiredSliceStatus,
    )
    .map((slice) => ({ id: slice.id, status: slice.status, blockers: slice.blockers ?? [] }));
  const unresolvedContracts = contract.missingReadyContracts.map(({ id, reason }) => ({ id, reason }));
  const blockedRepositories = contract.crossRepositorySnapshot
    .filter(({ status }) => !readyCrossRepositoryStatuses.has(status))
    .map(({ repository, status }) => ({ repository, status }));
  const decision =
    blockedSlices.length === 0 &&
    unresolvedContracts.length === 0 &&
    blockedRepositories.length === 0 &&
    missingEvidence.length === 0 &&
    contract.releaseDecision?.runtimeImplementationAuthorizationGranted === true
      ? "go"
      : "no-go";

  if (contract.releaseDecision?.status !== decision) {
    fail(
      `declared release decision ${contract.releaseDecision?.status ?? "missing"} does not match derived ${decision}`,
    );
  }
  if (decision === "go" && contract.releaseDecision.commercialClaimsAllowed !== true) {
    fail("a go decision must explicitly allow commercial claims");
  }
  if (decision === "no-go" && contract.releaseDecision.commercialClaimsAllowed !== false) {
    fail("a no-go decision must forbid commercial claims");
  }

  return {
    schemaVersion: 1,
    kind: "sdkwork.sandbox.commercial-readiness-assessment",
    assessedContractUpdatedAt: contract.updatedAt,
    decision,
    blockedSlices,
    unresolvedContracts,
    blockedRepositories,
    missingEvidence,
  };
}

export function formatCommercialReadinessAssessment(assessment) {
  const lines = [
    `SDKWork Sandbox commercial readiness: ${assessment.decision.toUpperCase()}`,
    `blocked delivery slices: ${assessment.blockedSlices.length}`,
    `missing ready contracts: ${assessment.unresolvedContracts.length}`,
    `blocked repository authorities: ${assessment.blockedRepositories.length}`,
    `missing local evidence references: ${assessment.missingEvidence.length}`,
  ];
  for (const slice of assessment.blockedSlices) {
    lines.push(`- ${slice.id}: ${slice.status}`);
  }
  return `${lines.join("\n")}\n`;
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  try {
    const options = parseCommercialReadinessArgs(process.argv.slice(2));
    const assessment = assessCommercialReadiness(readCommercialReadinessContract());
    process.stdout.write(
      options.json
        ? `${JSON.stringify(assessment, null, 2)}\n`
        : formatCommercialReadinessAssessment(assessment),
    );
    if (options.requireGo && assessment.decision !== "go") {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`sandbox commercial readiness check failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
