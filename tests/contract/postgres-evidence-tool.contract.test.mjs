import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createPostgresEvidenceIdentity,
  parseDockerPostgresBinding,
  parseLifecycleEvidence,
  parsePostgresEvidenceArgs,
  sanitizeProcessOutput,
  validateLifecycleEvidence,
} from "../../tools/testing/sandbox-postgres-evidence.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("PostgreSQL evidence accepts only the supported 16 and 17 matrix", () => {
  assert.deepEqual(parsePostgresEvidenceArgs([]), { postgresMajor: "17" });
  assert.deepEqual(parsePostgresEvidenceArgs(["--postgres-major", "16"]), {
    postgresMajor: "16",
  });
  assert.throws(() => parsePostgresEvidenceArgs(["--postgres-major", "15"]));
  assert.throws(() => parsePostgresEvidenceArgs(["--unknown"]));
});

test("PostgreSQL evidence generates canonical disposable identities", () => {
  const identity = createPostgresEvidenceIdentity("17", "01234567-89ab-cdef");

  assert.equal(identity.containerName, "sdkwork-sandbox-pg17-evidence-0123456789ab");
  assert.equal(identity.databaseName, "sdkwork_ai_test_sandbox_pg17_0123456789ab");
  assert.equal(identity.restoreDatabaseName, `${identity.databaseName}_restore`);
  assert.equal(identity.roleName, "sdkwork_ai_test");
  assert.equal(identity.image, "postgres:17-alpine");
  assert.throws(() => createPostgresEvidenceIdentity("17", "unsafe/name"));
});

test("PostgreSQL evidence accepts only one loopback Docker port binding", () => {
  const inspect = JSON.stringify([
    { NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }] } } },
  ]);

  assert.equal(parseDockerPostgresBinding(inspect), 55432);
  assert.throws(() =>
    parseDockerPostgresBinding(
      JSON.stringify([
        { NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "55432" }] } } },
      ]),
    ),
  );
});

test("PostgreSQL evidence validates backup counts and denies plaintext allocations", () => {
  const evidence = parseLifecycleEvidence("11/20/9/11\n0\n");

  assert.deepEqual(evidence, {
    sessions: 11,
    operations: 20,
    bindings: 9,
    leases: 11,
    plaintextAllocationMatches: 0,
  });
  assert.doesNotThrow(() => validateLifecycleEvidence(evidence, { ...evidence }));
  assert.throws(() =>
    validateLifecycleEvidence(evidence, { ...evidence, plaintextAllocationMatches: 1 }),
  );
  assert.throws(() => validateLifecycleEvidence(evidence, { ...evidence, leases: 10 }));
});

test("PostgreSQL evidence redacts connection URLs from process errors", () => {
  const redacted = sanitizeProcessOutput(
    "failed postgresql://sdkwork_ai_test:secret@127.0.0.1:55432/sdkwork_ai_test_run",
  );

  assert.equal(redacted, "failed [redacted-postgres-url]");
  assert.doesNotMatch(redacted, /secret|55432/u);
});

test("PostgreSQL evidence uses argument arrays and internally scoped cleanup", () => {
  const source = readFileSync(
    path.join(repoRoot, "tools/testing/sandbox-postgres-evidence.mjs"),
    "utf8",
  );

  assert.match(source, /spawnSync\(command, args,/u);
  assert.match(source, /shell: false/u);
  assert.match(source, /\["rm", "--force", identity\.containerName\]/u);
  assert.match(source, /fail\(`disposable PostgreSQL cleanup failed/u);
  assert.doesNotMatch(source, /execSync|shell:\s*true/u);
  assert.doesNotMatch(source, /sdkwork-dev-postgres/u);
});
