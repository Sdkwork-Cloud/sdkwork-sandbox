# ADR-20260730: Sandbox Standalone Data Residency And Recovery

Status: proposed

Requirement: [REQ-2026-0022](../../product/requirements/REQ-2026-0022-sandbox-standalone-data-residency-and-recovery.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-30

Deciders: Product Architecture, Security/Privacy, BirdCoder, Agents, Kernel, Sandbox, Workspace/Drive, Database and Local Operations owners

## Context

Local coding spans four repositories and several physical stores. Workspace locality alone cannot prove that all persisted coding data stays on the device. Agents and Sandbox own PostgreSQL authorities, Kernel may run embedded SQLite or a PostgreSQL-backed service, BirdCoder owns only device facts, and source-derived caches, logs, temporary files, secrets and Checkpoints can create additional copies. `standalone` is too broad to be a residency claim, and an external inference or synchronization flow is a processing/transfer decision independent of where the application persists data.

## Decision

1. Introduce a Local data-residency release gate scoped to `sandbox_standalone_local`. It is a cross-repository evidence composition, not a new persistence owner.
2. Separate candidate claim modes `device-local-persistence` and `strict-device-local-processing`. Both names remain non-public until product/privacy review.
3. A topology or Provider value never proves a claim. Readiness requires evidence for every declared data class and fails closed on an unknown, missing, remote or ambiguous store.
4. Preserve single ownership: local folder/Drive owns Workspace bytes; Agents owns business data and Revision semantics; Kernel owns transient runtime state; Sandbox owns lifecycle/control facts; BirdCoder owns bounded device facts only.
5. Server authorities remain PostgreSQL even when physically local. SQLite is allowed only inside a separately declared client/native `client-local` module and never as an automatic server fallback.
6. Workspace, service data, Runtime Root, cache, logs, secrets and temp use distinct preopened capabilities. IDs and config never become host paths, and source-controlled `.sdkwork/` never stores runtime state.
7. Local Sandbox release/cleanup preserves Workspace by default. Checkpoint promotion remains Agents-owned; reset, uninstall and purge have separate scopes and explicit confirmation.
8. Remote durable copies, implicit synchronization and implicit telemetry are denied. Optional sync or external model/tool processing uses a separate user-authorized grant with disclosed categories, destination, retention and revocation.
9. The strict processing claim denies content egress. A required external Provider closes that claim instead of silently degrading it.
10. Backups are local and opt-in by default, exclude Workspace and secrets unless separately selected, use role-correct database mechanisms, include integrity metadata and require restore evidence.
11. Export, purge and retention cover derived copies and backups. Uninstall is not privacy deletion. Partial or uncertain purge remains visible and blocks a completed-deletion claim.
12. Missing capability, database locality failure, corruption, disk full, restore failure or residue uncertainty fails closed without Cloud fallback.
13. Service Host adds the contract as a Local-only dependency. Standalone Firecracker and Cloud Firecracker do not inherit a desktop-local claim.

## Consequences

- The commercial Local claim becomes testable across every data producer instead of relying on folder selection or deployment vocabulary.
- Server data keeps the SDKWork PostgreSQL authority while still permitting a physically local desktop composition.
- Embedded SQLite remains possible for declared client-local state without creating a cross-engine abstraction or business authority fork.
- Local users retain control of Workspace deletion and optional outbound processing.
- Local availability now depends on explicit data-root, database, secret and recovery evidence; the system may refuse to start rather than make a false privacy claim.

## Rejected Alternatives

### Treat `standalone` as device-local

Rejected because `standalone` includes private servers, appliances and containers and says nothing about physical database, backup, telemetry or processing destinations.

### Store all four-repository state in one BirdCoder SQLite database

Rejected because it duplicates Agents/Sandbox authorities, weakens PostgreSQL server contracts and couples the desktop shell to business/runtime schemas.

### Make every Local store SQLite

Rejected because Agents and Sandbox server authorities are PostgreSQL-first. Physical locality does not change database role.

### Delete the Workspace during cleanup or uninstall

Rejected because the Workspace is user/Drive-owned durable data, not Sandbox residue.

### Allow automatic Cloud backup or failover

Rejected because it contradicts default local residency and turns an availability mechanism into an unreviewed transfer.

## Verification

- Static contract tests validate ownership, data-class completeness, database roles, separation, transfer policy, backup/restore, purge, failure behavior and release evidence.
- Service Host contract tests prove the dependency applies only to `sandbox_standalone_local` and remains fail closed.
- Future real evidence runs on Windows, macOS and Linux with network capture, local PostgreSQL/SQLite inspection, OS-user/profile isolation, restart, corruption, disk-full, backup/restore, purge and residue tests.

## Implementation Boundary

This proposed ADR does not authorize public claim names, filesystem/database changes, backup/purge implementation, telemetry, sync, API/SDK, packaging, deployment or cross-repository source changes.

