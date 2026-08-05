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
- `gate-zero-current-state.md` 组件状态矩阵测试数字同步（Lifecycle Service 24 → 26 tests）

### 测试补强

- `repository-memory` 新增 `sandbox_session_insert_conflicts_are_scoped_by_tenant`：同租户重复 insert 返回 `VersionConflict`、同 session id 跨租户隔离、各租户保留独立投影
- `repository.rs`（service crate）新增 `sandbox_protected_allocation_reference_enforces_storage_bounds`（密文 8192/Key ID 字符集/版本范围边界）与 `sandbox_session_lease_rejects_non_positive_expiry`（非正过期时间拒绝）
- `model.rs` 新增状态机全矩阵测试（8×8=64 组合逐一断言合法/非法转换）、`transition` 离开 Failed 清除 `sandbox_last_failure`、`replay_sandbox_operation` 匹配/冲突/缺失三种语义
- `service/tests.rs` 新增 `sandbox_stop_provider_failure_records_failed_operation_and_keeps_binding` 与 `sandbox_destroy_provider_failure_records_cleanup_failure_and_keeps_binding`（Provider 失败 → `Failed` 状态、Operation 失败类型正确、Allocation Binding 保留以便重试清理；FakeSandboxProvider 新增 stop 失败注入）
- `provider-spi/identity.rs` 新增 `sandbox_fencing_token_rejects_zero_and_signed_maximum_overflow`（0 与 >i64::MAX 拒绝、上界接受）
- `repository.rs`（sqlx crate）新增 3 个 SQLSTATE 错误映射测试：23505 按 constraint 分类（`pk_sandbox_session_operation`→`DuplicateOperation`、`uk_sandbox_session_operation_sequence`→`InvalidStoredData`、其余→`VersionConflict`）、23502/23503/23514→`InvalidStoredData`、40001/40P01/55P03/57014 及未知码→`Unavailable`、连接类错误→`Unavailable`（该分类逻辑此前零覆盖）

### 构建与供应链验证

- `cargo build --release --workspace`：PASS（生产优化模式）
- `cargo check --workspace --locked`：PASS（CI 锁文件模式）
- `cargo fmt --all -- --check` 作用域包含 path dependency（`sdkwork-database`）；其 `crates/sdkwork-database-spi/src/layout.rs` 存在 rustfmt 格式偏差（该仓库近期修改引入），已按标准 rustfmt 修复该文件
- `cargo audit`：本机可用但无法访问 RustSec advisory 数据库（网络受限），供应链漏洞审计需在可访问网络的 CI 环境执行，记录为验证缺口

### 测试补强（续）

- `service/tests.rs` 新增 `sandbox_lifecycle_service_rejects_invalid_operation_policy_and_duplicate_providers`：lease duration 越界（0ms/301s）、provider timeout 为零或超过 lease 一半、重复 provider id 均在构造时以 `InvariantViolation`/`DuplicateProvider` 失败关闭
- `codec.rs`（sqlx crate）新增 4 个编解码往返测试：8 个 Session 状态、4 个 Operation Kind、5 个 Outcome（含失败原因）、Failure 与 IsolationAssurance 全枚举往返 + 未知值/失败原因与 outcome 不匹配拒绝

### 文档同步（续）

- `README.md` REQ-2026-0020 描述精确化：正式保留/迁移策略仍被阻塞，此前仓储读取由 `MAX_SANDBOX_SESSION_OPERATIONS` 安全界约束（超限失败关闭）
- `traceability-map.md` 测试数字同步（service 24→33、sqlx 6→9）
- `component-interaction-flows.md` 测试数字同步（Repository trait 22→33、reconciler 3→7）

### 一致性复核（无变更项）

- `database/contract/table-registry.json` 与迁移 0001 的 4 张表完全对齐（无缺失/多余）
- 全部 7 个 crate 的 `component.spec.json` verification 命令与实现一致
- `apis/` 事件契约与 EVENT_SPEC（CloudEvents 对齐）及 API_SPEC 输出规范方向一致，draft 状态诚实

## Verification

- cargo fmt --all -- --check: PASS
- cargo check --workspace: PASS
- cargo test --workspace: PASS (63 单元/集成测试，1 ignored；契约测试 242 全部通过)
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
- Modified: `crates/sdkwork-intelligence-sandbox-repository-memory/src/lib.rs`（租户隔离 insert 冲突测试）
- Modified: `crates/sdkwork-intelligence-sandbox-service/src/repository.rs`（受保护引用/租约边界测试）
- Modified: `crates/sdkwork-intelligence-sandbox-repository-sqlx/src/repository.rs`（SQLSTATE 错误映射测试）
- Modified: `../sdkwork-database/crates/sdkwork-database-spi/src/layout.rs`（rustfmt 格式偏差修复，跨仓库 fmt 作用域）
- Modified: `docs/architecture/views/gate-zero-current-state.md`（测试数字同步）
- Modified: `docs/architecture/tech/TECH-security-and-operations.md`（有界历史描述同步）
- Modified: `docs/architecture/tech/TECH-modules-and-contracts.md`（有界历史描述同步）
- Modified: `docs/engineering/gate-zero-exit-readiness-package.md`（有界历史描述同步）
- Added: `docs/changelogs/CHANGELOG-2026-08-05.md`
