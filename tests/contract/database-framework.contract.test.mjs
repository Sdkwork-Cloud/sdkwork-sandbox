import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateDatabaseFramework } from "../../../sdkwork-specs/tools/check-database-framework-standard.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("canonical database framework validator accepts the Sandbox contract", () => {
  const result = validateDatabaseFramework(repoRoot);

  assert.equal(result.skipped, false);
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test("Sandbox database is PostgreSQL authoritative-server only", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(repoRoot, "database/database.manifest.json"), "utf8"),
  );

  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.databaseRole, "authoritative-server");
  assert.deepEqual(manifest.engines, ["postgres"]);
  assert.equal(manifest.defaultEngine, "postgres");
  assert.equal(manifest.tablePrefix, "sandbox_");
  assert.equal(manifest.lifecycle.autoMigrate, false);
});

test("Sandbox lifecycle authority registers the exact four owned tables", () => {
  const registry = JSON.parse(
    readFileSync(path.join(repoRoot, "database/contract/table-registry.json"), "utf8"),
  );
  const registeredTables = registry.tables.map((entry) => entry.table_name);

  assert.deepEqual(registeredTables, [
    "sandbox_session",
    "sandbox_session_operation",
    "sandbox_runtime_binding",
    "sandbox_session_lease",
  ]);
  assert.ok(registry.tables.every((entry) => entry.system_of_record === true));
});

test("migration preserves tenant-leading identity, operation order, CAS, encryption, and fencing constraints", () => {
  const migration = readFileSync(
    path.join(
      repoRoot,
      "database/migrations/postgres/0001_create_sandbox_lifecycle.up.sql",
    ),
    "utf8",
  );

  assert.match(migration, /PRIMARY KEY \(tenant_id, sandbox_session_id\)/u);
  assert.match(migration, /PRIMARY KEY \(tenant_id, sandbox_operation_id\)/u);
  assert.match(
    migration,
    /UNIQUE \(\s*tenant_id, sandbox_session_id, sandbox_operation_sequence\s*\)/u,
  );
  assert.match(
    migration,
    /CHECK \(sandbox_operation_sequence >= 0\)/u,
  );
  assert.match(migration, /\bversion BIGINT NOT NULL\b/u);
  assert.match(migration, /sandbox_allocation_ciphertext TEXT/u);
  assert.match(migration, /sandbox_allocation_key_version BIGINT/u);
  assert.ok(migration.includes("sandbox_allocation_key_id ~ '^[!-~]+$'"));
  assert.match(migration, /sandbox_fencing_token BIGINT NOT NULL DEFAULT 0/u);
  assert.doesNotMatch(migration, /CREATE TABLE\s+(?:agent_workspace|agent_session)\b/iu);
  assert.doesNotMatch(migration, /\bsqlite\b/iu);
});
