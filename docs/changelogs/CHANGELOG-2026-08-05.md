# CHANGELOG-2026-08-05: Lifecycle Core Hardening And Build Baseline Repair

Date: 2026-08-05

Phase: V1 lifecycle core after accepted Phase 0 foundation

## Summary

本变更修复工作区构建基线（sqlx 0.8/0.9 双版本冲突）、消除审查发现的并发幂等竞争与无界读取 OOM 风险、消除 reconcile 批量水化 N+1、强制执行事务超时契约，并补齐对应回归测试。所有变更均为生命周期核心候选实现范围内的防御性硬化，未新增公共 Runtime Port、Provider、API、SDK 或部署能力。

## Changed

### 构建基线修复

- `Cargo.toml` 将 workspace `sqlx` 从 `0.8` 统一为 `0.9`（`default-features = false`，启用 `runtime-tokio`/`tls-rustls`/`postgres`/`json`），与 `sdkwork-database` 及 kernel 依赖图对齐，修复 `sdkwork-intelligence-sandbox-repository-sqlx` 与 `sdkwork-database-sqlx::DatabasePool` 的类型不匹配（`cargo check --workspace` 由失败恢复为通过）
- `cargo update` 将全部直接与传递依赖提升至当前兼容最新版本（tokio 1.53、uuid 1.24、thiserror 2.0.19、zeroize 1.9、async-trait 0.1.91、serde_json 1.0.151、rustls 0.23.43、libsqlite3-sys 0.37.0）

### 有界读取与 OOM 防护

- `crates/sdkwork-intelligence-sandbox-repository-sqlx/src/repository.rs` 新增 `MAX_SANDBOX_SESSION_OPERATIONS = 10_000` 安全界：`sandbox_session_operation` 读取改用 `ROW_NUMBER()` 窗口查询并限制 `MAX + 1` 行，历史超出安全界的持久化 Session 失败关闭（`InvalidStoredData`）而非将无界行集载入进程内存；该界为 REQ-2026-0020（有界生命周期历史与幂等保留）获批前的安全措施

### 批量水化与性能

- `list_sandbox_sessions_requiring_reconciliation` 由每 Session 三次查询（N+1，最多 600 次往返/200 个事务）重构为单事务三次查询批量水化：`sandbox_session` / `sandbox_runtime_binding` / `sandbox_session_operation` 各自 `ANY($2)` 一次读取，保持 REPEATABLE READ READ ONLY 与既有顺序/连续序列校验语义

### 事务超时契约强制执行

- 所有仓储事务（读取、创建、保存、批量列表）在 `BEGIN` 后执行 `SET LOCAL statement_timeout = '30s'` 与 `SET LOCAL lock_timeout = '2s'`，与 `0001_create_sandbox_lifecycle.up.sql` 迁移头声明的超时契约一致

### 并发幂等竞争修复

- `create_sandbox_session` 增加 `VersionConflict`（sandbox_session 主键冲突）恢复路径：并发相同请求先提交时回查 operation 索引并返回权威 Session（幂等成功），Session id 被不同 operation 占用时返回新增的类型化错误 `SandboxLifecycleError::SandboxSessionIdConflict`，不再把调用方冲突误报为仓储内部错误
- 新增回归测试：`sandbox_create_rejects_sandbox_session_id_reuse_across_operations`、`sandbox_create_recovers_when_a_concurrent_identical_create_commits_first`（测试仓储新增带竞争赢家注入的 insert 失败钩子）

### 对账单页容错

- `reconcile_sandbox_sessions` 对"列表与取租约之间 Session 消失"（NotFound）改为尽力释放租约并跳过该项，不再中断整页对账
- 对账中 Provider 失败后重读 Session 时再次 NotFound（对账过程中 Session 消失）同样跳过该项，不再中断整页

### 文档同步

- `TECH-security-and-operations.md`、`TECH-modules-and-contracts.md`、`gate-zero-exit-readiness-package.md` 中"完整历史 hydrate"的当前状态描述更新为"有界历史 hydrate（`MAX_SANDBOX_SESSION_OPERATIONS` 读取上限，超限失败关闭）"，REQ-2026-0020 的后续目标与门禁语义保持不变

## Verification

- cargo fmt --all -- --check: PASS
- cargo check --workspace: PASS
- cargo test --workspace: PASS (46 单元/集成测试，1 ignored；契约测试 242 全部通过)
- cargo clippy --workspace --all-targets -- -D warnings: PASS
- node --test tests/contract/*.test.mjs: PASS (242)
- check-repository-docs-standard: PASS
- check-workspace-packages-layout: PASS (mode=enforce)
- check-component-port-bindings: PASS
- audit-repository-baseline: PASS
- check-pagination: PASS
- check-sandbox-commercial-readiness: NO-GO（与契约自证一致，商业就绪门禁保持关闭）

## Residual Verification Gap

实时 PostgreSQL 16/17 证据运行器（`tools/testing/sandbox-postgres-evidence.mjs`）依赖 Docker，本机不可用；批量水化窗口查询与 `SET LOCAL` 超时语句需在具备 Docker 的环境复跑证据运行器验证。

## Files Changed

- Modified: `Cargo.toml`（sqlx 0.9 统一）
- Modified: `Cargo.lock`（依赖提升）
- Modified: `crates/sdkwork-intelligence-sandbox-repository-sqlx/src/repository.rs`（有界窗口读取、批量水化、事务超时）
- Modified: `crates/sdkwork-intelligence-sandbox-service/src/error.rs`（`SandboxSessionIdConflict`）
- Modified: `crates/sdkwork-intelligence-sandbox-service/src/service.rs`（create 幂等恢复、对账容错）
- Modified: `crates/sdkwork-intelligence-sandbox-service/src/tests.rs`（回归测试与测试钩子）
- Modified: `docs/architecture/tech/TECH-security-and-operations.md`（有界历史描述同步）
- Modified: `docs/architecture/tech/TECH-modules-and-contracts.md`（有界历史描述同步）
- Modified: `docs/engineering/gate-zero-exit-readiness-package.md`（有界历史描述同步）
- Added: `docs/changelogs/CHANGELOG-2026-08-05.md`
