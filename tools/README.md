# Tools

Purpose: reusable repository validators, generators, migration utilities, and operator tooling.

Owner: SDKWork Sandbox engineering maintainers.

Allowed: reusable tool implementations with tests and documented inputs. Forbidden: application runtime code, thin shell wrappers, generated SDK output, and credentials.

Related specs: `../../sdkwork-specs/CODE_STYLE_SPEC.md`, `../../sdkwork-specs/TEST_SPEC.md`.

## Commercial Readiness Gate

`check-sandbox-commercial-readiness.mjs` evaluates the repository-level commercial readiness contract and verifies that all local evidence references resolve. The default audit command reports the current decision without converting the expected Gate 0 `NO-GO` into a test failure. Release preflight must use `--require-go`, which exits unsuccessfully until every required slice, cross-repository authority, and missing contract is closed.

```bash
node tools/check-sandbox-commercial-readiness.mjs
node tools/check-sandbox-commercial-readiness.mjs --json
node tools/check-sandbox-commercial-readiness.mjs --require-go
node --test tests/contract/sandbox-commercial-readiness.contract.test.mjs
```

## PostgreSQL Evidence Runner

`testing/sandbox-postgres-evidence.mjs` runs the accepted lifecycle persistence evidence against an internally named disposable PostgreSQL 16 or 17 container. It binds PostgreSQL only to a Docker-selected loopback port, provisions a canonical `sdkwork_ai_test_<run_id>` database/schema, uses `sdkwork-database-cli`, runs the ignored Repository test, verifies custom-format backup/restore and plaintext absence, and removes only the container it successfully created.

```bash
node tools/testing/sandbox-postgres-evidence.mjs --postgres-major 16
node tools/testing/sandbox-postgres-evidence.mjs --postgres-major 17
node --test tests/contract/postgres-evidence-tool.contract.test.mjs
```

The runner requires Docker Engine, Cargo, the sibling `../sdkwork-database` checkout, and the cached or pullable official PostgreSQL image. It creates no deployment profile, application manifest, credential file, host dump, or persistent volume.
