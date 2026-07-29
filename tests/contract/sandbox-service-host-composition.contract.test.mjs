import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contractPath = path.join(
  repoRoot,
  "crates/sdkwork-sandbox-service-host/specs/sandbox-service-host-composition.contract.json",
);
const componentPath = path.join(
  repoRoot,
  "crates/sdkwork-sandbox-service-host/specs/component.spec.json",
);
const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const component = JSON.parse(readFileSync(componentPath, "utf8"));

test("Sandbox Service Host contract remains a non-implementable Gate 0 authority", () => {
  assert.equal(contract.kind, "sdkwork.sandbox.service-host-composition-contract");
  assert.equal(contract.status, "draft");
  assert.equal(contract.requirementId, "REQ-2026-0009");
  assert.deepEqual(contract.relatedRequirementIds, ["REQ-2026-0013"]);
  assert.equal(contract.component, "sdkwork-sandbox-service-host");
  assert.equal(contract.layerRole, "runtime-service-host");
  assert.equal(contract.implementationAuthorized, false);
  assert.equal(contract["x-sdkwork-require-human-review"], true);
  assert.equal(contract["x-sdkwork-no-runtime-wiring"], true);
});

test("Sandbox Service Host contract preserves standalone and cloud parity", () => {
  assert.deepEqual(
    contract.profileParity.profiles.map((sandbox_profile) => sandbox_profile.sandbox_deployment_profile),
    ["standalone", "cloud"],
  );
  assert.ok(contract.profileParity.sharedContracts.includes("SandboxSessionLifecyclePort"));
  assert.ok(contract.profileParity.sharedContracts.includes("SandboxProvider"));
  assert.deepEqual(contract.profileParity.forbiddenServiceBranches, [
    "sandbox_deployment_profile",
    "sandbox_environment",
    "sandbox_runtime_target",
  ]);
});

test("Sandbox Service Host contract requires typed prefixed config and injected ports", () => {
  assert.equal(contract.typedConfig.type, "SandboxServiceHostConfig");
  assert.equal(contract.typedConfig.sourceAuthority, "runtime-bootstrap-approved-etc-profile");
  for (const sandbox_field of contract.typedConfig.fields) {
    assert.match(sandbox_field.name, /^sandbox_/u);
    assert.equal(sandbox_field.required, true);
  }
  assert.ok(contract.typedConfig.forbiddenSources.includes("process-environment"));
  assert.ok(contract.typedConfig.forbiddenSources.includes("embedded-secret-material"));

  const sandbox_dependency_names = contract.injectedDependencies.map(
    (sandbox_dependency) => sandbox_dependency.name,
  );
  for (const sandbox_dependency_name of sandbox_dependency_names) {
    assert.match(sandbox_dependency_name, /^sandbox_/u);
  }
  assert.ok(sandbox_dependency_names.includes("sandbox_lifecycle_service"));
  assert.ok(sandbox_dependency_names.includes("sandbox_session_repository"));
  assert.ok(sandbox_dependency_names.includes("sandbox_provider_registry"));
  assert.ok(sandbox_dependency_names.includes("sandbox_workspace_attachment"));
  assert.ok(sandbox_dependency_names.includes("sandbox_secret_key_source"));
  assert.ok(sandbox_dependency_names.includes("sandbox_telemetry"));
  const sandbox_workspace_dependency = contract.injectedDependencies.find(
    (sandbox_dependency) => sandbox_dependency.name === "sandbox_workspace_attachment",
  );
  assert.equal(sandbox_workspace_dependency.port, "SandboxWorkspaceAttachmentPort");
  assert.equal(
    sandbox_workspace_dependency.boundaryContract,
    "../../../specs/sandbox-workspace-block-device-attachment.contract.json",
  );
  assert.equal(sandbox_workspace_dependency.providerSpecificMechanismInjectedBehindPort, true);
});

test("Sandbox Service Host readiness is complete, bounded, and redacted", () => {
  assert.equal(contract.readiness.type, "SandboxServiceHostReadiness");
  assert.equal(contract.readiness.aggregation, "all-required-dimensions-ready");
  assert.equal(contract.readiness.failureMode, "fail-closed");
  assert.deepEqual(contract.readiness.dimensions, [
    "sandbox_config",
    "sandbox_store",
    "sandbox_provider_registry",
    "sandbox_workspace_attachment",
    "sandbox_secret_key_source",
    "sandbox_telemetry",
    "sandbox_fencing",
  ]);
  assert.equal(contract.readiness.bounds.sandbox_dimension_count, 7);
  assert.ok(contract.readiness.bounds.sandbox_check_timeout_ms > 0);
  for (const sandbox_field of contract.readiness.safeFields) {
    assert.match(sandbox_field, /^sandbox_/u);
  }
  for (const sandbox_field of [
    "sandbox_secret_material",
    "sandbox_database_url",
    "sandbox_physical_host_path",
    "sandbox_provider_allocation_reference",
    "sandbox_raw_command",
  ]) {
    assert.ok(contract.readiness.forbiddenFields.includes(sandbox_field));
  }
});

test("Sandbox Service Host shutdown and failure behavior are explicit", () => {
  assert.equal(contract.shutdown.type, "SandboxServiceHostShutdown");
  assert.equal(contract.shutdown.bounded, true);
  assert.equal(contract.shutdown.idempotent, true);
  assert.equal(contract.shutdown.stopNewLifecycleSideEffectsFirst, true);
  assert.equal(contract.shutdown.timeoutOutcome, "sandbox_internal_failure");
  assert.ok(contract.failClosedConditions.includes("sandbox_provider_assurance_insufficient"));
  assert.ok(contract.failClosedConditions.includes("sandbox_fencing_unprovable"));
});

test("Sandbox Service Host component remains free of executable surface", () => {
  assert.deepEqual(component.contracts.publicExports, []);
  assert.deepEqual(component.contracts.providedPorts, []);
  assert.deepEqual(component.contracts.requiredPorts, []);
  assert.deepEqual(component.contracts.runtimeEntrypoints, []);
  assert.deepEqual(component.contracts.configKeys, []);

  assert.equal(contract.authorization.publicExports, false);
  assert.equal(contract.authorization.runtimeEntrypoints, false);
  assert.equal(contract.authorization.configKeys, false);
  assert.equal(contract.authorization.httpOrRpc, false);
  assert.equal(contract.authorization.providerImplementation, false);
  assert.equal(contract.authorization.secretKmsImplementation, false);
  assert.equal(contract.authorization.deployment, false);
});
