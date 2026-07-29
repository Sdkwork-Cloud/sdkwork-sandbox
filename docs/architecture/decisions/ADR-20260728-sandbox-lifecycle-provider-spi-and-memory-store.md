# ADR-20260728: Sandbox Lifecycle, Provider SPI And In-memory Store

Status: proposed

Requirement: REQ-2026-0002

Owner: SDKWork Runtime Platform

Date: 2026-07-28

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `COMPONENT_SPEC.md`, `NAMING_SPEC.md`, `RUST_CODE_SPEC.md`, `SECURITY_SPEC.md`, `TEST_SPEC.md`

## Context

Phase 0 只建立了空 Crate 边界。V1 需要先证明业务状态机和 Provider 扩展点能够独立于 Local、Firecracker 或其他未来 Mechanism 工作，同时避免把测试仓储、宿主机/KVM 访问或 Provider 私有身份泄漏进公共生命周期模型。Docker Provider 当前延期。

生命周期和 Provider 调用跨越异步边界。重复请求、Provider 部分失败和并发写入都可能造成重复 Allocation、状态回退或同一 Binding 的多个活动所有者，因此首个实现切片必须在引入真实执行前固定这些不变量。

## Decision

1. `sdkwork-sandbox-provider-spi` 是 L3 Provider Port Owner。它拥有 `SandboxProviderDescriptor`、Capability、Isolation Assurance、`SandboxProviderHealth`、Sandbox Provider Lifecycle Request/Outcome，以及跨 Provider 边界所需的不透明 Identity Value Object。
2. Provider 私有 Allocation Reference 只能由 Service 持久状态和对应 Provider Adapter 消费。它不实现 Serialization，Debug 固定输出脱敏占位符，Error 不携带其 Value。
3. `sdkwork-intelligence-sandbox-service` 是 L2/L3 Lifecycle Owner。它拥有 `SandboxSession` State、`SandboxSessionLifecycleCommand`、`SandboxSessionOperation`、`SandboxSessionRepository`、`SandboxSessionLifecyclePort`、Provider Selection Policy 与 Use-case Orchestration。
4. `sdkwork-intelligence-sandbox-repository-memory` 是 L4 Adapter，只实现 Service 声明的 Repository Port。它面向 Test 和单进程开发，不声明 Durable、HA 或 Multi-process 保证。
5. Lifecycle 使用 Command-supplied `OperationId`（变量 `sandbox_operation_id`）实现幂等：Repository 保存已应用 `SandboxSessionOperation`；同 ID/同 Kind 重试返回当前 `SandboxSession` Projection 且不重复 Provider Side Effect，同 ID/不同 Kind 拒绝。
6. Repository Save 使用 Expected Version。首次 Start 在 Allocate 前原子持久化 `Starting`、In-progress Start Operation 与无 Allocation Reference 的稳定 `SandboxRuntimeBinding` Intent，使并发 Start 只能有一个进入 Allocate/Start Provider Boundary；Retry Start 必须在原稳定状态下先幂等清理旧 Allocation，清理成功后才进入新的 `Starting`。Stop 和 Destroy 采用相同的中间状态所有权规则。
7. Start 只选择满足全部 Capability、最低 Assurance 且 Health 可用的 Provider。Provider 返回的 Ready、Policy Enforced、Workspace Attached 三项任一为假时，Service 尝试释放 Allocation 并进入 `Failed`，不得进入 `Running`。
8. Failed/Stopped `SandboxSession` Retry Start 必须先对旧 Allocation 执行幂等 Destroy；清理失败保存 Typed `Failed(Cleanup)` 并保留旧 Binding 供后续恢复，清理成功后才以无 Allocation Reference 的稳定 Binding Intent 启动新一轮 Start。已有无 Allocation Intent 时复用其 `SandboxId`/`SandboxRuntimeBindingId`，已清理旧 Allocation 时创建新的 Identity。
9. `SandboxWorkspaceId` 与 `SandboxSessionId` 是调用方提供的 Opaque Context，Sandbox 不生成。`SandboxId`、`SandboxRuntimeBindingId` 与 `OperationId` 由 Sandbox 拥有。
10. Sandbox 自有且跨域易混淆的公共领域类型使用 `Sandbox` 前缀；`TenantId`、`OperationId`、`RuntimeCapability` 与 `IsolationAssurance` 等 SDKWork 共享类型保持标准名称；存在歧义的字段/变量使用 `sandbox_` 前缀。本 ADR 不批准真实 Local Provider Host Access、生产隔离等级、HTTP/API Authority、Generated SDK、Durable Event Name 或 Deployment Profile。

## Alternatives

### 在 Service 中直接按 Provider Kind 分支

拒绝。它会把机制选择固化进业务层，并迫使 Kernel 或 API 消费者感知 Local/Firecracker 等实现。

### 把 Memory Repository 放入 Service Crate

拒绝。Repository 实现是 L4 基础设施；放入 L2 会弱化 Production Persistence 替换边界并让 Service 测试依赖具体存储。

### 先实现 Local Host Command，再补生命周期

拒绝。没有状态、幂等、Capability 和 Cleanup 契约的 Host Execution 无法给出可审查的安全与恢复保证。

### 静默选择任意可用 Provider

拒绝。弱化 Isolation Assurance 会改变安全边界；无合格 Provider 必须失败关闭。

## Consequences

收益：Provider 作者获得单一一致性端口；Service 行为可通过 Fake Provider 和 Memory Repository 独立验证；未来 Durable Repository、Local/Firecracker Adapter 与 Scheduler 可以替换 L4/L5 而不改变生命周期语义。Docker 延期不会改变该契约。

成本：Operation History 仍属于 `SandboxSession` Aggregate 的一致性边界；`REQ-2026-0005` 已将其物化到独立 PostgreSQL Operation Table，并增加 Lease/Fencing 与 Crash Reconciliation 候选实现，但 Retention、Operator Pagination/API、Durable Outbox、真实 PostgreSQL/Provider 证据和公共 Rust 命名人工评审仍未完成。

## Verification

- Provider SPI 单元测试验证 Identity 解析、Capability/Assurance 匹配和 Private Reference Redaction。
- Lifecycle Service 测试验证状态机、Provider Selection、Readiness Gate、Idempotency、Failure Cleanup 与 Tenant Scope。
- Memory Repository 测试验证 Create Operation 唯一性、Version Compare-and-swap 和 Tenant Isolation。
- Component Port、Application Layering、Identity Naming 与 Rust Composition Validator 必须通过。
- 真实 Provider 或 Release 工作开始前必须新增对应 Requirement，并完成人工 Security/Architecture Review。

## Supersedes / Superseded By

Supersedes: none.

Superseded by: none.
