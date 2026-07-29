# ADR-20260728: Agents Workspace And Sandbox Attachment Ownership

Status: proposed

Requirement: REQ-2026-0004

Owner: SDKWork Runtime Platform

Date: 2026-07-28

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `DEPENDENCY_MANAGEMENT_SPEC.md`, `SECURITY_SPEC.md`, `RUST_CODE_SPEC.md`, `TEST_SPEC.md`

## Context

原始 PRD 固定使用 `Runtime`、`Session`、`Workspace`、`Sandbox` 与 `Provider`。这些术语必须保留，但相同术语在 Agents 业务域和 Sandbox 运行域中承担不同职责。`sdkwork-agents` 已经定义 `AgentWorkspace` 与 `AgentSession` 作为持久业务权威；若 Sandbox 再建立 Workspace Create/Get/Repository/Registry，就会产生双写、身份冲突和反向依赖。

Sandbox 仍需要把经授权的 Workspace 连接到一次 Provider Allocation。该职责是运行时 Attachment Mechanism，而不是 Workspace 业务生命周期。Kernel 位于 Agents 与 Sandbox 之间，适合完成稳定 ID 映射和运行生命周期协调。

## Decision

1. `sdkwork-agents` 独占 `AgentWorkspace` Identity、业务状态、持久生命周期、授权和 Repository；`sdkwork-sandbox` 不提供 Workspace Create/Update/Delete/Registry。
2. `sdkwork-agents` 独占 `AgentSession` 业务聚合；`sdkwork-sandbox` 拥有 `SandboxSession` Provider-neutral 运行生命周期投影。
3. 编译与调用依赖固定为 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`。Sandbox 不导入 Agents 或 Kernel，Kernel 不把 Provider 机制上移到 Agents。
4. Kernel 把经授权的 Agents Workspace/Session ID 映射为 Opaque `SandboxWorkspaceId` 与 `SandboxSessionId`。二者由调用方提供、在 Sandbox 中 Parse-only，不由 Sandbox 生成。
5. Sandbox 生成并拥有 `SandboxId`、`SandboxRuntimeBindingId` 与 `OperationId`。Sandbox 自有且跨域易混淆的公共领域类型使用 `Sandbox` 前缀；`OperationId` 等 SDKWork 共享类型保持标准名称；存在领域歧义的字段和变量使用 `sandbox_` 前缀。
6. `SandboxSessionLifecyclePort` 是 Kernel 消费的生命周期权威。`CreateSandboxSessionCommand`、`SandboxSessionLifecycleCommand`、`SandboxSession` 与 `SandboxRuntimeBinding` 不复制 Agents 业务模型。
7. Sandbox 拥有 Physical Workspace Attachment Mechanism、Lease/Fencing、`SandboxProviderAllocationRef` 与 Cleanup；Attachment 不授予 Workspace 业务所有权。Firecracker Block Device/Sanitization 候选机制由 `ADR-20260729-sandbox-workspace-block-device-attachment-and-sanitization` 收敛，Service Host 仍只依赖 provider-neutral `SandboxWorkspaceAttachmentPort`。
8. Local/Remote Provider 只消费经过 Composition/Adapter 授权的 Attachment Capability。禁止根据 `sandbox_workspace_id` 猜测 Host Path，禁止把 Host Path 或 Credential 放入公共 Domain Type。
9. Stop/Destroy 释放 Attachment 和 Sandbox Allocation，不删除或变更 `AgentWorkspace`。Workspace Delete、Archive、Revision、Retention 与 Snapshot 仍由对应业务/存储权威治理。
10. Kernel 可把 `SandboxRuntimeBindingId` 映射为 Agents 的 Opaque `runtimeLocationId`；该映射不暴露 Provider ID、Host Path 或 Allocation Reference。
11. 跨域只允许 Stable ID 与公共契约。禁止跨仓库 SQL、Foreign Key、模型复制、Raw HTTP 和 Sandbox-to-Agents Callback。

## Alternatives

### Sandbox 拥有 Workspace Registry

拒绝。它与 `AgentWorkspace` 形成双权威，要求跨域同步和补偿，并破坏既定依赖方向。

### Sandbox 直接依赖 sdkwork-agents

拒绝。底层 Runtime Infrastructure 不能反向依赖上层业务应用；这会形成 `Agents -> Kernel -> Sandbox -> Agents` 环。

### Kernel 或 Provider 从 Workspace ID 推导 Host Path

拒绝。Opaque ID 不携带物理位置语义，路径推导会绕过授权、数据驻留和租户隔离。

### 把 Agents 模型复制到 Sandbox

拒绝。复制模型会形成漂移，扩大 Sandbox 持久化面，并把业务生命周期误当成运行机制。

## Consequences

收益：Workspace 与 Session 只有一个持久业务权威；Sandbox 保持独立、可复用且 Provider-neutral；变量命名可明确区分 Agents 对象和 Sandbox 运行投影；Kernel 能通过稳定契约协调两域。

成本：Kernel 必须维护显式 ID 映射和错误映射；生产 Attachment 需要独立持久化 Lease/Fencing 与 Reconciler；跨仓库 `0.1` 契约变化需要同步评审。

## Verification

- Sandbox Behavior Test 证明 `SandboxWorkspaceId` 和 `SandboxSessionId` 由调用方提供并原样保留。
- Kernel Contract Test 证明 Agents ID 映射到 Sandbox-qualified Command/Field，并只消费 `SandboxSessionLifecyclePort`。
- `cargo tree -p sdkwork-agent-kernel` 显示 Kernel 依赖 Sandbox，且 Sandbox 依赖树不包含 Agents。
- Component Binding、Layering、Naming、Cargo Test/Clippy 与跨仓库文档检查必须通过。
- 搜索不得残留 Sandbox-owned Workspace Registry、Workspace Repository 或由 Sandbox 生成 Workspace ID 的描述。

## Supersedes / Superseded By

Supersedes: none.

Superseded by: none.
