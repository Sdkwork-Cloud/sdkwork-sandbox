# ADR-20260728: PostgreSQL Sandbox Lifecycle Persistence And Reconciliation

Status: proposed

Requirement: REQ-2026-0005

Owner: SDKWork Runtime Platform

Date: 2026-07-28

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `DATABASE_SPEC.md`, `DATABASE_FRAMEWORK_SPEC.md`, `MIGRATION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `COMPONENT_SPEC.md`, `NAMING_SPEC.md`, `RUST_CODE_SPEC.md`, `SECURITY_SPEC.md`, `TEST_SPEC.md`

## Context

当前 `SandboxSession` 生命周期候选实现把 Aggregate、Operation 与 `SandboxRuntimeBinding` 保存在 Memory Repository。它能证明单进程状态机和幂等语义，但进程重启会丢失所有状态，多控制器实例也无法对 Provider Side Effect 建立唯一所有权。

`Starting`、`Stopping` 与 `Destroying` 在数据库写入和 Provider 调用之间存在不可避免的进程中断窗口。特别是旧流程在 Allocate 后才持久化 `SandboxRuntimeBinding`，如果进程在两者之间退出，Provider 可能已经创建资源，而控制面没有稳定 `SandboxId`/`SandboxRuntimeBindingId` 可用于重放或清理。Provider 私有 `SandboxProviderAllocationRef` 又不能进入普通 Domain Projection、Debug、Log、Event 或 Wire，因此持久化必须同时解决可恢复性和机密性。

## Decision

1. Sandbox Server 生命周期数据的数据库角色固定为 `authoritative-server`，唯一引擎为 PostgreSQL。标准 `database/` 资产由 SDKWork Database Framework 管理；Memory Repository 仅保留为 Test/Candidate Adapter，不提供生产降级路径。
2. 新增 L4 `sdkwork-intelligence-sandbox-repository-sqlx`。它只消费注入的 `sdkwork-database-sqlx::DatabasePool` 和 Service-owned Repository Port，不构造连接池、不运行 Migration、不读取环境变量、不依赖 Kernel/Agents。
3. PostgreSQL 使用职责分离表：`sandbox_session` 保存 Session 状态与 CAS Version，`sandbox_session_operation` 保存 Tenant-scoped Operation 幂等记录和从 `0` 开始的稳定 `sandbox_operation_sequence`，`sandbox_runtime_binding` 保存当前 Runtime Binding Intent/Private Recovery Metadata，`sandbox_session_lease` 保存 Lease Owner、Expiry 与 Fencing Token。Operation 顺序由 Tenant+Session+Sequence 唯一约束确定，不从 `created_at` 或随机 ID 推导。
4. `tenant_id` 是所有主键、唯一约束和在线索引的领先 Scope。`sandbox_session_id` 是 Agents-owned `AgentSession` 的 Opaque 映射，不是 Sandbox 创建的第二套 Session Registry；`sandbox_workspace_id` 不可用于推导 Host Path。
5. Service 声明 `SandboxSessionRepositorySnapshot` 与 Restore Factory 作为唯一持久化映射边界。Restore 在调用 Allocation Protector 解密前按稳定 Operation 顺序重放状态机，并验证 Typed Failure、Transient/InProgress、Runtime Binding 与 Allocation 组合不变量；非法组合关闭失败为 `InvalidStoredData`。普通 `SandboxSession`/`SandboxRuntimeBinding` 不派生 Serde，也不暴露 Provider Allocation 明文 Getter。Adapter 只能通过明确的保护器端口将私有引用转换为受保护记录。
6. Provider Allocation 明文使用 `sdkwork-utils-rust::crypto::derive_aes_256_key` 和 `aes_gcm_encrypt`/`aes_gcm_decrypt` 保护。每条 Binding 的派生上下文绑定 Tenant、Session、Binding 和 Crypto Version；数据库只保存 Ciphertext、Key ID、Key Version 与 Crypto Version。Keyring/Secret Material 由 Service Host Secret Port 注入，Repository 不从普通 Config 或 Environment 自行发现密钥。
7. Session Insert/Save、带稳定 Sequence 的 Operation 写入和 Runtime Binding 同步在同一个 PostgreSQL Transaction 中完成。Save 先执行 Version CAS；Operation ID/Sequence 冲突、非法存储与 Version Conflict 映射到稳定 `SandboxSessionRepositoryError`，不依赖本地化错误文本。
8. `SandboxRuntimeBinding` 允许表达尚未获得 Allocation Reference 的 Intent。首次 Start 在 Provider Allocate 前原子保存 `Starting`、In-progress Start Operation 以及包含 `SandboxId`、`SandboxRuntimeBindingId`、`SandboxProviderId` 且无 Allocation Reference 的 Binding Intent；任何持久化 `Starting` 都必须具有该可恢复 Binding。Failed/Stopped Retry Start 必须在原稳定状态下先持 Lease 幂等销毁旧 Allocation，清理成功后才保存本次新 Intent；清理失败保存 Typed `Failed(Cleanup)` 并保留旧 Binding，不得暴露可被 Reconciler 误启动的旧 Allocation。Allocate 以稳定 Identity 和 Fencing Token 幂等重放，成功后再加密并保存 Allocation Reference。
9. Provider Side Effect 的控制权由 `sandbox_session_lease` 管理。Acquire 使用 PostgreSQL 数据库时钟，仅在 Lease 不存在或已过期时成功；每次新所有权 Acquisition 原子递增非零 `SandboxFencingToken`。Renew/Release 必须匹配 Tenant、Session、Owner 和 Token。Token 达到 PostgreSQL `BIGINT` 上限后 Memory/PostgreSQL Adapter 均关闭失败为 `LeaseConflict`，禁止回绕或误报临时竞争。
10. Allocate/Start/Stop/Destroy Provider Request 都携带 `SandboxFencingToken`。Provider Conformance 要求同一 `SandboxRuntimeBindingId` 拒绝低于已观察值的 Token；Repository CAS 与 Provider Fencing 共同阻止旧控制器在 Lease 过期后继续提交。
11. 每次 Provider Side Effect 前 Renew 当前 `SandboxSessionLease`。Provider Operation Timeout 非零且不超过 Lease Duration 的一半；Timeout 映射为 `SandboxProviderErrorKind::Timeout`。取得 Lease 后 Renew 失败、Identity 不匹配、Save `LeaseConflict` 或成功业务后的 Release 失败统一为 `SandboxLifecycleError::LeaseLost`；已有 Provider/Readiness 错误优先于并发 Release 错误，Lease Lost 时停止调用与持久化，避免无界调用跨越 Lease 所有权窗口。
12. Reconciler 只通过 Tenant-scoped、有界 Keyset Query 读取 `Starting`、`Stopping`、`Destroying`，页大小严格为 `1..=200`；Service 使用有界后继探测，只在确有后续行时返回 Continuation。取得 Lease 后必须重新读取权威 `SandboxSession`，仅当当前状态仍为瞬态时才按原 `sandbox_operation_id` 重放对应幂等 Provider 操作；稳定状态表示候选已由其他控制器收敛，不依据 Lease 前陈旧快照发出副作用。无法取得 Lease 时跳过，不使用 Process-local Split-brain Fallback。
13. 本 ADR 不批准真实 Provider Host/KVM Access、Local/Firecracker Isolation Claim、Service Host Secret 实现、Cross-tenant Operator API、Distributed Scheduler、HTTP/RPC、Generated SDK 或 Release Profile；Docker Provider 当前延期。

## Alternatives

### 继续使用 Memory Repository，并在退出前写 Snapshot

拒绝。它不能提供跨进程 Transaction、Tenant-scoped Operation Uniqueness、CAS、Lease/Fencing 或 PostgreSQL Release Evidence，进程异常退出也无法保证 Snapshot 完整。

### 使用 SQLite 支持 Standalone 与 Server 共用实现

拒绝。Server Authority 必须采用 PostgreSQL；最低共同能力抽象会丢失 PostgreSQL Constraint、Transaction、Locking、Concurrency 和 Query-plan 证据，也违反数据库角色规范。

### 把 Allocation Reference 明文或通用 JSON 写入 Session 表

拒绝。Provider Reference 可能包含 Host Path、Provider Handle 或其他敏感数据；明文、普通 JSON、Debuggable Record 或通用 Projection 都扩大泄露面并破坏最小数据边界。

### 只依赖 Optimistic Version，不使用 Lease/Fencing

拒绝。CAS 能阻止两个最终状态同时提交，但不能撤销已经发出的外部 Provider Side Effect。Lease 限定控制权，Fencing Token 让 Provider 拒绝过期控制器。

### 在 Allocate 成功后才保存 Runtime Binding Identity

拒绝。该顺序保留不可恢复的孤儿分配窗口。先持久化稳定 Intent，再幂等 Allocate，才能在重启后继续或清理。

## Consequences

收益：Sandbox 生命周期在进程重启和多控制器竞争下拥有 PostgreSQL 权威、可验证的 Tenant 隔离、Operation 幂等、Version CAS、加密 Private Metadata 和可恢复的 Provider Identity；Kernel/Agents 依赖方向不变。

成本：Provider SPI 增加 Fencing Contract；Aggregate 需要显式 Persistence Snapshot/Restore Boundary；生命周期调用需要 Lease 管理和更细的故障注入测试。密钥轮换、Backup/Restore、Service Host Secret Wiring、跨 Tenant Operator 调度和真实 Provider Fencing 仍需后续 Requirement 提供上线证据。

## Verification

- Database Framework Validator 验证 Manifest、Contract、Registry、Migration、Seed 和 Drift Dictionary。
- PostgreSQL Migration Smoke 从空库建立最新 Schema，并验证全部 Constraint/Index。
- Repository Integration Test 验证 Tenant Denial、Operation Uniqueness、Version CAS、SQLSTATE Mapping 和 Transaction Atomicity。
- Persisted-state Test 验证 Operation Sequence 往返、非法状态/Failure/Binding/Operation 组合在解密前关闭失败，以及末页恰好满时不产生空页 Continuation。
- Encryption Test 验证数据库无 Allocation 明文、随机 Ciphertext、上下文搬移失败、错误 Key/Version 关闭失败以及 Debug/Log Redaction。
- Concurrency Test 验证 Lease 竞争、Expiry Takeover、Fencing Token 单调递增、旧 Token Renew/Release/Save 失败。
- Failure Injection Test 覆盖 Starting Intent Persist、Allocate、Allocation Persist、Start、Stop、Destroy、Provider Timeout 与最终状态写入前后的进程中断恢复；其中 Allocate 成功但 Allocation Persist 失败的回归必须证明 Provider 清理后仍保留无 Allocation 的稳定 Intent，并由 Reconciler 以更高 Fencing Token 重新 Allocate，且只启动新 Allocation。
- Component、Layering、Naming、Documentation、Cargo Test/Clippy 和真实 PostgreSQL Evidence 必须通过；人工架构/安全评审前保持 Proposed。

## Supersedes / Superseded By

Supersedes: none.

Superseded by: none.
