# REVIEW-20260729: Sandbox Provider Allocation Key Rotation Verification

Status: conditional-pass

Requirement: [REQ-2026-0006](../../product/requirements/REQ-2026-0006-sandbox-provider-allocation-key-rotation.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

## Scope

本 Review 验证 `SandboxProviderAllocationKeySource`、`SandboxProviderAllocationProtector` 与 PostgreSQL `SqlxSandboxSessionRepository` 的候选密钥轮换行为。验证范围包括 Key Material/派生 Key 清零、Safe Key ID、版本化恢复、Tenant-scoped Cursor Page、Page Size `1..=200`、Ciphertext Metadata CAS、并发 Lifecycle Save 冲突保护、幂等重试和 Repository 重建后的恢复。

固定产品术语保持 `Runtime`、`Session`、`Workspace`、`Sandbox` 与 `Provider`；Sandbox-owned 类型使用 `Sandbox*`，存在歧义的字段和变量使用 `sandbox_*`。本 Review 不批准 KMS/Secret Provider、Operator API、Worker、Deployment Profile、自动旧密钥撤销或任何 Sandbox Provider。

## Environment

- Windows Host，Docker Engine `28.0.4`。
- 一次性 `postgres:17-alpine`，镜像 Digest `sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193`，仅绑定 `127.0.0.1` 随机端口。
- 空数据库只通过 `sdkwork-database-cli` 初始化；Repository 只通过 `sdkwork-database-sqlx::PoolBuilder` 构造连接池。
- 临时 PostgreSQL Container 使用 `--rm`，验证后已停止并确认删除；该测试夹具不实现、不注册也不启用 Docker Sandbox Provider。

## Evidence

| Command / Check | Result |
| --- | --- |
| `sdkwork-database-cli -- --app-root . init` against an empty PostgreSQL database | PASS: 首次应用 1 个 Migration；立即重跑应用 0 个 Migration。 |
| `cargo test -p sdkwork-intelligence-sandbox-repository-sqlx --test postgres_repository -- --ignored --nocapture` | PASS: 1 个真实 PostgreSQL Integration Test，0 失败；包含 unsafe Key ID Constraint 负向验证。 |
| `sdkwork-database-cli -- --app-root . status` | PASS: `module=sandbox engine=postgres status=clean pending_migrations=0`。 |
| `sdkwork-database-cli -- --app-root . drift-check` | PASS: `drift check passed`。 |
| `cargo fmt --all -- --check` and `cargo check --workspace` | PASS。 |
| `cargo test --workspace` | PASS: 23 个默认 Rust Test；1 个显式 Live PostgreSQL Test 在默认套件中按设计忽略，并已由上方专项命令单独通过。 |
| `cargo clippy --workspace --all-targets -- -D warnings` | PASS。 |
| Database Framework、Pagination、Component Port、Application Layering、Identity Naming、Packages Layout、Documentation、Docs Debt 与 Repository Baseline Validators | PASS；Documentation Debt 为 0。 |
| Kernel `cargo test -p sdkwork-agent-kernel` and package Clippy | PASS: 160 个 Library Test、全部 Package Integration/Doc Test 与 Clippy 通过；Sandbox Runtime 8 个 Error/Identity Mapping Test 包含 `InvalidPageRequest`。 |
| Agents `cargo check --workspace` and Cargo dependency tree | PASS: `sdkwork-agents -> sdkwork-kernel -> sdkwork-intelligence-sandbox-service -> sdkwork-sandbox-provider-spi` 依赖链保持可编译。 |
| Kernel `cargo test --workspace` | BLOCKED outside this Requirement: `sdkwork-api-kernel-standalone-gateway` 仍以零参数调用需要 `Arc<InternalRuntimeApiState>` 的 Assembly；不能用 Memory/Always-ready 绕过真实 Bootstrap。该 Gateway 迁移需要按 Kernel 的 API Assembly/Standalone Gateway 架构评审单独关闭。 |

真实 PostgreSQL Test 证明：

- V1 Ciphertext 可在 V2 为 Current 时通过精确 Key ID/Version 恢复，并重加密为 V2。
- Tenant A 的三条旧版本记录在 Page Size 1 下以三个 Cursor Page 收敛，第四条 Current-version 记录不重写；Tenant B 在 Tenant A 扫描期间保持 V1。
- Page Size 0 和 201 显式返回 `SandboxSessionRepositoryError::InvalidPageRequest`。
- 含换行的 `sandbox_allocation_key_id` 被 PostgreSQL 以 SQLSTATE `23514`、Constraint `ck_sandbox_runtime_binding_allocation_metadata` 拒绝；失败语句后 Ciphertext、Key ID/Version 与 Crypto Version 均保持不变。
- Kernel 对 `SandboxLifecycleError::Repository(InvalidPageRequest)` 使用无通配分支的显式映射，返回来源为 Runtime、不可重试且可安全呈现的 `ValidationError`，不泄露 Repository、Database 或 Crypto Detail。
- 第二次 Tenant 扫描返回零待处理记录，证明已完成行的幂等跳过。
- 并发 Lifecycle Save 改变 Ciphertext Metadata 时，旧版本重加密 CAS 返回 Conflict，不覆盖新值。
- Repository 重建后，已重加密与并发更新的 `SandboxRuntimeBinding` 都能恢复，Transient Session Reconciliation 继续工作。
- Debug/Result Assertion 不包含 Provider-private Allocation Reference 或 Ciphertext。

## Security And Reliability Findings

- Key Material 由注入的 `SandboxProviderAllocationKeySource` 提供；Repository 不读取环境变量、普通 Config 或数据库中的 Key Material。
- `SandboxProviderAllocationKey` 使用 `Zeroizing<Vec<u8>>`，无效构造输入也在错误返回时清零；派生 AES Key 直接使用 `Zeroizing<[u8; 32]>` 承载。
- Key ID 只接受 `1..=128` bytes printable ASCII；Key Carrier、Service Domain Constructor 与 PostgreSQL `CHECK` Constraint 分层拒绝空格、控制字符和非 ASCII 值。
- Restore + Protect 在 `SandboxProviderAllocationProtector` 内完成；SQL 只接触受保护对象及其 Version Metadata。
- 每行独立 CAS，不持有跨 Crypto/KMS 调用的长事务或行锁；并发 Lifecycle Write 优先保留。
- 分页查询按 Tenant 与 `sandbox_runtime_binding_id` Keyset 限定，最大 Page Size 200，不存在全 Tenant 无界收集。
- 旧密钥撤销必须等待所有 Tenant 的零待处理扫描、Conflict Retry、活跃 Runtime Binding Recovery Smoke 与显式人工审批。

## Remaining Gates

- ADR 仍为 `proposed`；公共命名、Key Lifecycle、CAS 语义、生产 Secret/KMS Ownership 与撤销姿态需要人工架构/安全评审。
- `SandboxProviderAllocationKeySource` 当前是同步 Trait；生产远程 KMS 必须先批准短生命周期本地 Key Handle/异步刷新边界或 Async Port 演进，禁止在 Tokio Worker 上直接阻塞。
- `sdkwork-sandbox-service-host` 尚未提供批准的 Secret/KMS Adapter、Operator Entry Point、Background Worker、Audit/Event/Metric 或受控 Deployment Profile。
- WAL/Lock Budget、KMS Failure Injection、Pause/Resume、Multi-replica Soak、PITR、告警与生产旧密钥撤销演练仍缺少证据。
- Kernel 直接依赖 Crate 与 Agents 依赖链已通过，但 Kernel 根工作区仍有独立 Standalone Gateway Composition 编译阻断；在其 API Assembly/Topology/安全管线迁移经人工评审并关闭前，不得宣称跨仓库商业发布门禁通过。
- [Sandbox Provider Allocation Key Rotation And Old-key Revocation Runbook](../../runbooks/RUNBOOK-sandbox-provider-allocation-key-rotation.md) 目前是 Candidate；在上述运行能力和人工评审完成前禁止用于生产撤销。

## Conclusion

REQ-2026-0006 的 Protector 与 PostgreSQL Repository 候选实现通过 Key Material/派生 Key 清零、Safe Key ID、真实 PostgreSQL 轮换、分页、隔离、CAS 与重建恢复验证，结论为 `conditional-pass`。REQ 保持 `in-progress`，ADR 保持 `proposed`；本 Review 不构成生产 KMS、Provider、部署或商业发布批准。
