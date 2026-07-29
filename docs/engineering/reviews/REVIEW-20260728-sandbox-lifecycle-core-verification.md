# REVIEW-20260728: Sandbox Lifecycle Core Verification

Status: conditional-pass

Requirement: REQ-2026-0002

Decision: ADR-20260728-sandbox-lifecycle-provider-spi-and-memory-store

Owner: SDKWork Runtime Platform

Date: 2026-07-28

## Scope

本次验证覆盖 Provider-neutral Identity/Capability/Assurance/Lifecycle SPI、`SandboxSession` State 和 Command Idempotency、Provider Selection/Readiness/Cleanup、Tenant-scoped `SandboxSessionRepository`，以及单进程 `InMemorySandboxSessionRepository`。不覆盖真实 Host Execution、Durable Persistence、Distributed Coordination、HTTP/SDK、Deployment 或 Production Isolation；Kernel Integration 由 REQ-2026-0004 单独验证。

## Behavior Evidence

| Component | Evidence | Result |
| --- | --- | --- |
| Provider SPI | Opaque ID validation、Private Allocation Reference Debug Redaction、Capability/Assurance Match、Workspace Attachment Readiness Fail-closed | PASS，4 tests |
| Lifecycle Service | `SandboxSession` Lifecycle、Caller-supplied `SandboxSessionId`、Opaque Workspace Context Propagation、Idempotent Replay、Capability/Assurance/Health Rejection、Readiness Gate、Failed `SandboxRuntimeBinding` Cleanup、Tenant Scope、Lease/Fencing/Timeout/Reconciliation | PASS，10 tests |
| Memory Repository | Tenant Isolation、Operation Index、Optimistic Version Conflict、Lease Competition/Takeover/Stale Token Rejection | PASS，3 tests |
| PostgreSQL Repository | Codec/Encryption Unit Contract 与显式 Live PostgreSQL Integration Entry | PASS，2 tests；1 live test 按环境变量显式启用 |
| Inactive Phase 0 Components | Local Provider、Service Host、CLI 不包含 Operational Behavior | PASS，保持未激活 |

## Verification Evidence

| Command | Result |
| --- | --- |
| `cargo fmt --all -- --check` | PASS |
| `cargo check --workspace` | PASS |
| `cargo test --workspace` | PASS，19 Behavior/Unit Tests；1 Live PostgreSQL Test 默认 ignored |
| `cargo clippy --workspace --all-targets -- -D warnings` | PASS |
| `node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict` | PASS |
| `node ../sdkwork-specs/tools/check-application-layering.mjs --root .` | PASS |
| `node ../sdkwork-specs/tools/check-identity-naming.mjs --root .` | PASS，Consumer Mode |
| `node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .` | PASS |
| `node ../sdkwork-specs/tools/audit-repository-baseline.mjs --root .` | PASS |
| `node ../sdkwork-specs/tools/verify-repo.mjs --root .` | PASS |

## Cross-repository Boundary Evidence

| Command | Result |
| --- | --- |
| `cargo test --offline -p sdkwork-agent-kernel sandbox_runtime::tests` from `sdkwork-kernel` | PASS，7 Adapter Tests；Agents-owned ID 映射到 `sandbox_` Command 字段，Path-like ID 在进入 Sandbox 前被拒绝，Lease/Repository Error 显式安全映射 |
| `cargo test --offline -p sdkwork-agent-kernel` from `sdkwork-kernel` | PASS，159 Library Tests、Integration Targets 与 Doc Tests |
| `cargo test --locked -p sdkwork-intelligence-agents-service` from `sdkwork-agents` | PASS，282 Tests；5 PostgreSQL Live Tests 因未配置 `SDKWORK_AGENTS_TEST_POSTGRES_URL` 保持 ignored |
| `cargo clippy -p sdkwork-intelligence-agents-service --all-targets -- -D warnings` from `sdkwork-agents` | PASS；Session Activity Projection 输入已收束为高内聚 `SessionActivitySummaryParts`，未使用 Clippy Allow 绕过门禁 |
| `cargo tree -p sdkwork-intelligence-agents-service -i sdkwork-sandbox-provider-spi` from `sdkwork-agents` | PASS；依赖证据为 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`，无 Sandbox 到 Kernel/Agents 的反向依赖 |

以上证据是 REQ-2026-0002 当时的 In-process Candidate Contract、命名与依赖方向快照；当前 Durable Repository/Reconciler 证据由 `REQ-2026-0005` 继续追踪。该快照不替代 proposed ADR 的人工 Architecture/Security Review，也不构成 Production Provider 或商业发布证明。

## Review Findings

- Provider Selection 对 Capability、Minimum Isolation Assurance 和 Ready Health 全部执行故障关闭；没有弱 Provider Fallback。
- `SandboxProviderAllocationRef` 不可序列化、Debug 脱敏，并且不通过 `SandboxRuntimeBinding` Public Accessor 暴露。
- Start/Stop/Destroy 在 Provider Side Effect 前持久化中间状态和 Operation Ownership；并发 Command 由 Repository Version Conflict 拒绝。
- Start Failure 的 Cleanup 失败会保留旧 Binding；后续新 Operation Retry 在 Allocate 前先 Destroy 旧 Binding。
- Memory Repository 使用 `(TenantId, SandboxSessionId)` 和 `(TenantId, OperationId)` 索引，不通过全量 `SandboxSession` 扫描查找请求。

## Conditional Gates And Residual Risk

- `ADR-20260728-sandbox-lifecycle-provider-spi-and-memory-store` 仍为 `proposed`。公共 Rust 命名和 Provider Security Boundary 需要人工架构/安全评审，因此 REQ-2026-0002 保持 `in-progress`，不能作为跨仓库稳定契约发布。
- Operation History 仍位于 Session Aggregate 的一致性边界；`REQ-2026-0005` 已物化独立 PostgreSQL Operation Table，但 Retention、Operator Pagination/API 与 Durable Outbox 仍未完成。
- `REQ-2026-0005` 已加入 Runtime Binding Intent、Lease/Fencing、Provider Timeout 与 `Starting`/`Stopping`/`Destroying` Reconciler 候选实现，并完成临时 PostgreSQL 17 的 Migration、重启式恢复、并发、Query Plan 与 Backup/Restore 候选证据；真实 Provider Fencing Conformance、多副本长稳与生产 PITR 仍未完成。
- `IsolationAssurance` 仅代表候选等级匹配，不构成对任何真实 Provider 的安全认证。Local/Firecracker Adapter 尚未激活，Docker Provider 已延期。

## Conclusion

REQ-2026-0002 的仓库内候选实现满足该切片代码和静态验收标准，可作为后续 Adapter/Persistence 设计基线；`REQ-2026-0005` 已补充 Durable Recovery 与临时 PostgreSQL 候选证据，但在人工评审、真实 Provider Conformance、多副本/PITR/SLO 与 Release Evidence 完成前，仍不满足 Production 或商业发布门禁。
