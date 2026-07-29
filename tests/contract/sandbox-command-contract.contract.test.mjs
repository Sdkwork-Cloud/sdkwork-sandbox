import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const commandRoot = path.join(root, 'apis', 'commands');
const loadJson = (name) => JSON.parse(fs.readFileSync(path.join(commandRoot, name), 'utf8'));

const catalog = loadJson('sandbox-command-contract.json');
const request = loadJson('sandbox-command-execution-request.schema.json');
const result = loadJson('sandbox-command-execution-result.schema.json');
const error = loadJson('sandbox-command-execution-error.schema.json');

const forbiddenKeys = [
  'secret',
  'token',
  'password',
  'credential',
  'privatekey',
  'hostpath',
  'hostpid',
  'allocationreference',
  'signedurl',
  'sql',
  'rawoutput',
  'argv'
];

function walkKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) walkKeys(item, keys);
    return keys;
  }
  if (!value || typeof value !== 'object') return keys;
  for (const [key, child] of Object.entries(value)) {
    keys.push(key.toLowerCase().replaceAll('_', ''));
    walkKeys(child, keys);
  }
  return keys;
}

test('Sandbox command contract is a draft, provider-neutral machine authority', () => {
  assert.equal(catalog.kind, 'sdkwork.sandbox.command-contract');
  assert.equal(catalog.status, 'draft');
  assert.equal(catalog.requirementId, 'REQ-2026-0007');
  assert.equal(request['x-sdkwork-requirement-id'], 'REQ-2026-0007');
  assert.equal(result['x-sdkwork-requirement-id'], 'REQ-2026-0007');
  assert.equal(error['x-sdkwork-requirement-id'], 'REQ-2026-0007');
  assert.equal(catalog['x-sdkwork-no-host-io'], true);
  assert.equal(catalog['x-sdkwork-require-human-review'], true);
});

test('Sandbox command request preserves identity, fencing, idempotency, and bounded Argv', () => {
  assert.equal(request.additionalProperties, false);
  assert.deepEqual(request.required, [
    'tenantId',
    'sandboxProviderId',
    'sandboxWorkspaceId',
    'sandboxSessionId',
    'sandboxId',
    'sandboxRuntimeBindingId',
    'sandboxFencingToken',
    'sandboxCommandOperationId',
    'sandboxRequestFingerprint',
    'sandboxExecutable',
    'sandboxArguments',
    'sandboxWorkingDirectory',
    'sandboxEnvironment',
    'sandboxCommandLimits'
  ]);
  assert.equal(request.properties.sandboxExecutable['x-sdkwork-shell'], false);
  assert.equal(request.properties.sandboxArguments.maxItems, 128);
  assert.equal(request.properties.sandboxWorkingDirectory['x-sdkwork-path-kind'], 'workspace-logical-relative');
  assert.equal(request.properties.sandboxEnvironment['x-sdkwork-secret-policy'], 'deny-by-default');
  assert.equal(request.properties.sandboxCommandLimits.additionalProperties, false);
  assert.equal(request.properties.sandboxFencingToken.maximum, 9223372036854775807);
  assert.equal(request.properties.sandboxRequestFingerprint.pattern, '^sha256:[0-9a-f]{64}$');
});

test('Sandbox command result is binary-safe, bounded, and does not expose host details', () => {
  assert.equal(result.additionalProperties, false);
  assert.deepEqual(result.properties.sandboxOutcome.enum, [
    'succeeded',
    'failed',
    'timed-out',
    'cancelled',
    'output-limit',
    'resource-exhausted',
    'fencing-lost'
  ]);
  assert.equal(result.properties.sandboxStdoutBase64.contentEncoding, 'base64');
  assert.equal(result.properties.sandboxStderrBase64.contentEncoding, 'base64');
  assert.equal(result.properties.sandboxExitStatus.oneOf.length, 3);
  assert.deepEqual(result.properties.sandboxExitStatus.oneOf[1].required, [
    'sandboxExitKind',
    'sandboxExitCode'
  ]);
  assert.deepEqual(result.properties.sandboxExitStatus.oneOf[2].required, [
    'sandboxExitKind',
    'sandboxSignalName'
  ]);
  assert.equal(result.properties.sandboxResourceUsage.additionalProperties, false);
  assert.equal(result['x-sdkwork-output-encoding'], 'base64-binary');
});

test('Sandbox command errors use a closed safe taxonomy with explicit retryability', () => {
  assert.equal(error.additionalProperties, false);
  assert.deepEqual(error.properties.sandboxErrorCode.enum, catalog.errorCodes.map((item) => item.code));
  assert.equal(error.properties.sandboxSafeMessage.maxLength, 256);
  assert.equal(error['x-sdkwork-detail-policy'], 'safe-message-only');
  assert.equal(catalog.errorCodes.length, 10);
  assert.equal(new Set(catalog.errorCodes.map((item) => item.code)).size, 10);
});

test('Sandbox command contract forbids shell, private metadata, and unbounded execution', () => {
  assert.deepEqual(catalog.executionModes, ['executable-argv']);
  assert.ok(catalog.forbiddenExecutionModes.includes('shell-string'));
  assert.ok(catalog.forbiddenExecutionModes.includes('implicit-shell'));
  assert.ok(catalog.forbiddenExecutionModes.includes('secret-injection'));
  assert.equal(catalog.bounds.maxStdoutBytes, 67108864);
  assert.equal(catalog.bounds.maxStderrBytes, 67108864);
  assert.equal(catalog.bounds.maxTimeoutMs, 86400000);
  const keys = walkKeys({ catalog, request, result, error });
  for (const forbiddenKey of forbiddenKeys) {
    assert.ok(!keys.includes(forbiddenKey), `forbidden command contract key: ${forbiddenKey}`);
  }
});

test('Sandbox command catalog includes the required common conformance scenarios', () => {
  for (const scenario of [
    'typed-executable-and-argv-preservation',
    'shell-string-rejection',
    'logical-working-directory-escape-rejection',
    'deny-by-default-environment',
    'timeout-and-descendant-cleanup',
    'cancellation-and-descendant-cleanup',
    'stdout-and-stderr-hard-bounds',
    'stale-fencing-fail-closed',
    'same-operation-same-fingerprint-replay',
    'same-operation-different-fingerprint-conflict',
    'safe-error-and-private-metadata-redaction'
  ]) {
    assert.ok(catalog.conformanceScenarios.includes(scenario), `missing scenario: ${scenario}`);
  }
});
