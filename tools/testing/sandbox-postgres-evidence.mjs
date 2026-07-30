#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const supportedPostgresMajors = new Set(["16", "17"]);
const disposableContainerPrefix = "sdkwork-sandbox-pg";

function fail(message) {
  throw new Error(message);
}

export function parsePostgresEvidenceArgs(argv) {
  let postgresMajor = "17";
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--postgres-major") {
      postgresMajor = argv[index + 1] ?? fail("--postgres-major requires a value");
      index += 1;
    } else if (argument.startsWith("--postgres-major=")) {
      postgresMajor = argument.slice("--postgres-major=".length);
    } else {
      fail(`unsupported argument: ${argument}`);
    }
  }
  if (!supportedPostgresMajors.has(postgresMajor)) {
    fail("--postgres-major must be 16 or 17");
  }
  return { postgresMajor };
}

export function createPostgresEvidenceIdentity(postgresMajor, runId = randomUUID()) {
  if (!supportedPostgresMajors.has(postgresMajor)) {
    fail("PostgreSQL evidence supports only major versions 16 and 17");
  }
  const normalizedRunId = runId.replaceAll("-", "").toLowerCase().slice(0, 12);
  if (!/^[a-z0-9]{8,12}$/u.test(normalizedRunId)) {
    fail("PostgreSQL evidence run id must contain 8 to 12 ASCII letters or digits");
  }
  const databaseName = `sdkwork_ai_test_sandbox_pg${postgresMajor}_${normalizedRunId}`;
  return {
    containerName: `${disposableContainerPrefix}${postgresMajor}-evidence-${normalizedRunId}`,
    databaseName,
    restoreDatabaseName: `${databaseName}_restore`,
    roleName: "sdkwork_ai_test",
    image: `postgres:${postgresMajor}-alpine`,
  };
}

export function parseDockerPostgresBinding(inspectOutput) {
  let inspection;
  try {
    inspection = JSON.parse(inspectOutput);
  } catch {
    fail("Docker inspect did not return JSON");
  }
  const bindings = inspection?.[0]?.NetworkSettings?.Ports?.["5432/tcp"];
  if (!Array.isArray(bindings) || bindings.length !== 1) {
    fail("disposable PostgreSQL must expose exactly one host binding");
  }
  const [{ HostIp: hostIp, HostPort: hostPort }] = bindings;
  if (hostIp !== "127.0.0.1" || !/^[1-9][0-9]{0,4}$/u.test(hostPort)) {
    fail("disposable PostgreSQL must use one loopback-only host port");
  }
  const numericPort = Number(hostPort);
  if (numericPort > 65535) {
    fail("Docker returned an invalid PostgreSQL host port");
  }
  return numericPort;
}

export function sanitizeProcessOutput(output) {
  return String(output)
    .replaceAll(/postgres(?:ql)?:\/\/[^\s'"`]+/giu, "[redacted-postgres-url]")
    .slice(-4000);
}

export function parseLifecycleEvidence(output) {
  const lines = String(output)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const countLine = lines.find((line) => /^\d+\/\d+\/\d+\/\d+$/u.test(line));
  const plaintextLine = lines.find((line, index) => index > lines.indexOf(countLine) && /^\d+$/u.test(line));
  if (!countLine || plaintextLine === undefined) {
    fail("PostgreSQL lifecycle evidence output is incomplete");
  }
  const [sessions, operations, bindings, leases] = countLine.split("/").map(Number);
  return {
    sessions,
    operations,
    bindings,
    leases,
    plaintextAllocationMatches: Number(plaintextLine),
  };
}

export function validateLifecycleEvidence(sourceEvidence, restoredEvidence) {
  if (sourceEvidence.plaintextAllocationMatches !== 0) {
    fail("source database contains a plaintext provider allocation reference");
  }
  if (restoredEvidence.plaintextAllocationMatches !== 0) {
    fail("restored database contains a plaintext provider allocation reference");
  }
  for (const key of ["sessions", "operations", "bindings", "leases"]) {
    if (sourceEvidence[key] !== restoredEvidence[key]) {
      fail(`backup and restore ${key} counts do not match`);
    }
  }
}

function defaultRunProcess(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  return {
    error: result.error,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function requireSuccess(result, label) {
  if (result.error || result.status !== 0) {
    const details = sanitizeProcessOutput(result.stderr || result.stdout || result.error?.message);
    fail(`${label} failed${details ? `: ${details}` : ""}`);
  }
  return result.stdout;
}

function waitForPostgres(runProcess, identity) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = runProcess("docker", [
      "exec",
      identity.containerName,
      "pg_isready",
      "--username",
      identity.roleName,
      "--dbname",
      identity.databaseName,
    ]);
    if (!result.error && result.status === 0) {
      return;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  fail("disposable PostgreSQL did not become ready within 30 seconds");
}

function lifecycleQuery(schemaName) {
  return [
    "SELECT",
    `(SELECT COUNT(*) FROM ${schemaName}.sandbox_session) || '/' ||`,
    `(SELECT COUNT(*) FROM ${schemaName}.sandbox_session_operation) || '/' ||`,
    `(SELECT COUNT(*) FROM ${schemaName}.sandbox_runtime_binding) || '/' ||`,
    `(SELECT COUNT(*) FROM ${schemaName}.sandbox_session_lease);`,
    `SELECT COUNT(*) FROM ${schemaName}.sandbox_runtime_binding`,
    "WHERE sandbox_allocation_ciphertext LIKE '%private-provider-allocation%';",
  ].join(" ");
}

function runDatabaseCli(runProcess, databaseEnvironment, operation) {
  return requireSuccess(
    runProcess(
      "cargo",
      [
        "run",
        "--manifest-path",
        "../sdkwork-database/Cargo.toml",
        "--locked",
        "-p",
        "sdkwork-database-cli",
        "--",
        "--app-root",
        ".",
        operation,
      ],
      { env: databaseEnvironment },
    ),
    `database CLI ${operation}`,
  );
}

export function runSandboxPostgresEvidence({
  postgresMajor,
  runProcess = defaultRunProcess,
  runId,
} = {}) {
  const resolvedPostgresMajor = postgresMajor ?? "17";
  const identity = createPostgresEvidenceIdentity(resolvedPostgresMajor, runId);
  let containerCreated = false;
  try {
    requireSuccess(
      runProcess("docker", [
        "run",
        "--name",
        identity.containerName,
        "--detach",
        "--publish",
        "127.0.0.1::5432",
        "--env",
        `POSTGRES_USER=${identity.roleName}`,
        "--env",
        `POSTGRES_DB=${identity.databaseName}`,
        "--env",
        "POSTGRES_HOST_AUTH_METHOD=trust",
        identity.image,
      ]),
      "start disposable PostgreSQL",
    );
    containerCreated = true;
    waitForPostgres(runProcess, identity);

    const inspection = requireSuccess(
      runProcess("docker", ["inspect", identity.containerName]),
      "inspect disposable PostgreSQL",
    );
    const hostPort = parseDockerPostgresBinding(inspection);
    const databaseUrl = `postgresql://${identity.roleName}@127.0.0.1:${hostPort}/${identity.databaseName}?sslmode=disable`;
    const databaseEnvironment = {
      SDKWORK_DATABASE_SCHEMA_FALLBACK_PUBLIC: "false",
      SDKWORK_DATABASE_TEST_POSTGRES_URL: databaseUrl,
      SDKWORK_DATABASE_URL: databaseUrl,
    };

    requireSuccess(
      runProcess("docker", [
        "exec",
        identity.containerName,
        "psql",
        "--username",
        identity.roleName,
        "--dbname",
        identity.databaseName,
        "--set",
        "ON_ERROR_STOP=1",
        "--command",
        `CREATE SCHEMA ${identity.databaseName} AUTHORIZATION ${identity.roleName}`,
      ]),
      "provision canonical PostgreSQL schema",
    );

    const firstInit = runDatabaseCli(runProcess, databaseEnvironment, "init");
    const secondInit = runDatabaseCli(runProcess, databaseEnvironment, "init");
    const status = runDatabaseCli(runProcess, databaseEnvironment, "status");
    const drift = runDatabaseCli(runProcess, databaseEnvironment, "drift-check");
    if (!firstInit.includes("init complete: 1 migration(s) applied")) {
      fail("first database init did not apply exactly one migration");
    }
    if (!secondInit.includes("init complete: 0 migration(s) applied")) {
      fail("second database init was not idempotent");
    }
    if (!status.includes("status=clean pending_migrations=0")) {
      fail("database status is not clean");
    }
    if (!drift.includes("drift check passed")) {
      fail("database drift check did not pass");
    }

    const testOutput = requireSuccess(
      runProcess(
        "cargo",
        [
          "test",
          "-p",
          "sdkwork-intelligence-sandbox-repository-sqlx",
          "--test",
          "postgres_repository",
          "--locked",
          "--",
          "--ignored",
          "--nocapture",
        ],
        { env: databaseEnvironment },
      ),
      "live PostgreSQL repository test",
    );
    if (!testOutput.includes("1 passed; 0 failed")) {
      fail("live PostgreSQL repository test did not report one passing test");
    }

    const sourceEvidence = parseLifecycleEvidence(
      requireSuccess(
        runProcess("docker", [
          "exec",
          identity.containerName,
          "psql",
          "--username",
          identity.roleName,
          "--dbname",
          identity.databaseName,
          "--tuples-only",
          "--no-align",
          "--command",
          lifecycleQuery(identity.databaseName),
        ]),
        "read source lifecycle evidence",
      ),
    );

    requireSuccess(
      runProcess("docker", [
        "exec",
        identity.containerName,
        "pg_dump",
        "--username",
        identity.roleName,
        "--dbname",
        identity.databaseName,
        "--format",
        "custom",
        "--file",
        "/tmp/sdkwork-sandbox-evidence.dump",
      ]),
      "create PostgreSQL evidence backup",
    );
    requireSuccess(
      runProcess("docker", [
        "exec",
        identity.containerName,
        "createdb",
        "--username",
        identity.roleName,
        "--owner",
        identity.roleName,
        identity.restoreDatabaseName,
      ]),
      "create PostgreSQL restore database",
    );
    requireSuccess(
      runProcess("docker", [
        "exec",
        identity.containerName,
        "pg_restore",
        "--username",
        identity.roleName,
        "--dbname",
        identity.restoreDatabaseName,
        "--exit-on-error",
        "/tmp/sdkwork-sandbox-evidence.dump",
      ]),
      "restore PostgreSQL evidence backup",
    );
    const restoredEvidence = parseLifecycleEvidence(
      requireSuccess(
        runProcess("docker", [
          "exec",
          identity.containerName,
          "psql",
          "--username",
          identity.roleName,
          "--dbname",
          identity.restoreDatabaseName,
          "--tuples-only",
          "--no-align",
          "--command",
          lifecycleQuery(identity.databaseName),
        ]),
        "read restored lifecycle evidence",
      ),
    );
    validateLifecycleEvidence(sourceEvidence, restoredEvidence);

    const imageInspection = JSON.parse(
      requireSuccess(
        runProcess("docker", ["image", "inspect", identity.image]),
        "inspect PostgreSQL image",
      ),
    );
    const imageDigest = imageInspection?.[0]?.RepoDigests?.find((value) =>
      value.startsWith("postgres@sha256:"),
    );
    if (!imageDigest) {
      fail("PostgreSQL image does not expose a repository digest");
    }
    return {
      schemaVersion: 1,
      kind: "sdkwork.sandbox.postgres-evidence",
      postgresMajor: resolvedPostgresMajor,
      image: identity.image,
      imageDigest,
      migration: { firstApplied: 1, secondApplied: 0, status: "clean", drift: "passed" },
      repositoryTest: { passed: 1, failed: 0 },
      lifecycleCounts: sourceEvidence,
      backupRestore: "passed",
    };
  } finally {
    if (containerCreated) {
      const cleanup = runProcess("docker", ["rm", "--force", identity.containerName]);
      if (cleanup.error || cleanup.status !== 0) {
        const details = sanitizeProcessOutput(cleanup.stderr || cleanup.error?.message);
        fail(`disposable PostgreSQL cleanup failed${details ? `: ${details}` : ""}`);
      }
    }
  }
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  try {
    const options = parsePostgresEvidenceArgs(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(runSandboxPostgresEvidence(options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`sandbox PostgreSQL evidence failed: ${sanitizeProcessOutput(error.message)}\n`);
    process.exitCode = 1;
  }
}
