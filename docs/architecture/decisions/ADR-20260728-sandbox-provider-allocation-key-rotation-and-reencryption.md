# ADR-20260728: Sandbox Provider Allocation Key Rotation And Re-encryption

Status: proposed

Requirement: REQ-2026-0006

Owner: SDKWork Runtime Platform

Date: 2026-07-28

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `SECURITY_SPEC.md`, `CONFIG_SPEC.md`, `DATABASE_SPEC.md`, `DATABASE_FRAMEWORK_SPEC.md`, `PAGINATION_SPEC.md`, `RUST_CODE_SPEC.md`, `OBSERVABILITY_SPEC.md`, `TEST_SPEC.md`

## Context

`SandboxProviderAllocationRef` 是 Provider-private 恢复数据。当前 PostgreSQL 候选实现已经保存 Ciphertext、Key ID、Key Version 与 Crypto Version，并通过注入的 `SandboxProviderAllocationKeySource` 获取密钥；但是只有“用当前密钥写入”和“按历史版本恢复”不足以完成生产轮换。若旧密钥提前撤销，仍引用旧版本的 `SandboxRuntimeBinding` 将无法恢复；若使用无界 Update 或覆盖并发生命周期 Save，又会制造停机、锁放大或数据丢失。

## Decision

1. `SandboxProviderAllocationKeySource` 继续是 Composition-owned Secret/KMS Port。Repository 不实现 KMS、不读取环境变量、不缓存未界定生命周期的 Key Material。当前 Port 为同步 Trait，生产远程 KMS 不得在 Tokio Worker 上直接阻塞；Composition 必须注入已解析的短生命周期本地 Key Handle 并在受控异步边界刷新，或经人工评审后将 Port 演进为 Async Contract。
2. `SandboxProviderAllocationProtectionVersion` 只公开 Current Key ID、Key Version 与 Crypto Version，不公开 Key Material。
3. `SandboxProviderAllocationProtector` 提供当前 Protection Version 和 Re-encryption 操作。Decrypt + Encrypt 在 Protector 内完成，Repository 只接触旧/新受保护对象。
4. `SandboxProviderAllocationRef` 在 Drop 时清零内部 String Buffer；`SandboxProviderAllocationKey` 使用 `Zeroizing<Vec<u8>>`，无效构造输入同样在返回错误时清零；派生 AES Key 直接使用 `Zeroizing<[u8; 32]>` 承载。
5. `SqlxSandboxSessionRepository` 提供 Tenant-scoped、Cursor-based、Page Size `1..=200` 的 `reencrypt_sandbox_provider_allocation_references_page` 维护操作。
6. 查询只选择非空且 Protection Version 不等于 Current Version 的行，按 `sandbox_runtime_binding_id` 稳定升序，最多读取 `page_size + 1` 以确定下一 Cursor。
7. Crypto/KMS 调用不在长事务或行锁内执行。每行重保护后使用旧 Ciphertext + Key ID/Version + Crypto Version 的完整 Compare-and-swap Update；零行更新计为 Conflict，禁止覆盖并发生命周期写入。
8. 每行独立提交，支持 Pause/Resume 和部分成功；Page Result 只报告 Count 与 Cursor，不返回 Secret/Ciphertext。
9. 当前版本行是幂等跳过。旧密钥保留到所有 Tenant 的完整扫描、Conflict Retry、恢复 Smoke 和显式人工撤销完成；Repository 不自动删除密钥。
10. Crypto Version 升级与 Key Version 轮换使用同一有界 Re-encryption 机制，但二者保持独立字段和语义。
11. 本 ADR 不批准实际 KMS Provider、Secret 配置格式、Operator HTTP API、Background Worker、Deployment Profile 或自动 Key Revocation。
12. Key ID 仅允许 `1..=128` bytes printable ASCII。Key Carrier、Service Domain Constructor 与 PostgreSQL `ck_sandbox_runtime_binding_allocation_metadata` 形成独立校验层，数据库必须拒绝空格、控制字符和非 ASCII Key ID。

## Alternatives

### 读取时自动重加密

拒绝。普通 Read 会产生隐藏写入、放大延迟，并使只读路径需要额外授权和故障语义。

### 单事务更新整个 Tenant

拒绝。它会导致无界锁、WAL、延迟和失败回滚成本，不满足生产可运维性。

### 只按 Binding ID 更新

拒绝。Lifecycle Save 可能在重加密期间写入新的 Allocation Reference；没有旧密文元数据 CAS 会覆盖并发新值。

### Key Source 只保留当前密钥

拒绝。滚动部署和可恢复轮换要求在撤销门禁完成前读取历史 Key ID/Version。

## Consequences

收益：轮换不要求停止 Sandbox Lifecycle；并发写入不会被维护任务覆盖；旧密钥撤销具有可验证门禁；Secret/KMS Ownership 与 Repository 分离。

成本：Key Source 必须在轮换窗口保留历史版本；Operator/Worker 需要循环分页并重试 Conflict；同步 Port 需要受控的本地 Key Handle/异步刷新边界或后续 Async Port 评审；生产发布需要额外进度、审计、告警和撤销演练。

## Verification

- Protector Unit Test 覆盖多版本恢复、重加密、错误/不安全 Key Identity、Key Material 长度边界、旧密钥缺失、Context 绑定和 Debug/Drop 安全。
- PostgreSQL Test 覆盖 Tenant Cursor Page、Current-version Skip、旧元数据 CAS、并发 Lifecycle Update Conflict、unsafe Key ID `23514` 约束和 Restart 后恢复。
- Query Plan、WAL/Lock Bound、KMS Failure、Pause/Resume 与旧密钥撤销由生产运维证据追踪。
- Cargo/Clippy、Database Framework、Component、Layering、Naming、Documentation 与 Repository Baseline 检查必须通过。

## Supersedes / Superseded By

Supersedes: none.

Superseded by: none.
