---
id: REQ-2026-0004
title: Integrate Agents-owned Workspace with Sandbox attachment
owner: SDKWork Runtime Platform
status: in-progress
source: architecture
problem: Sandbox Session lifecycle needs an authorized Workspace attachment without duplicating the AgentWorkspace registry, identity lifecycle, or persistence owned by sdkwork-agents.
goals:
  - Preserve AgentWorkspace and AgentSession as sdkwork-agents business authorities.
  - Map authorized Agents identities through sdkwork-kernel into opaque Sandbox context identifiers.
  - Establish a fail-closed Sandbox Workspace attachment boundary without exposing physical storage references.
non_goals:
  - Create, update, archive, delete, version, or persist AgentWorkspace records in sdkwork-sandbox.
  - Import sdkwork-agents models or storage adapters into sdkwork-sandbox.
  - Guess a physical host path from a Workspace identity.
users:
  - SDKWork Agents maintainers
  - SDKWork Kernel integrators
  - SDKWork Runtime Platform maintainers
  - Sandbox provider authors
affected_surfaces:
  - rust-components
  - cross-repository-contract
  - composition
---

# REQ-2026-0004: Agents Workspace 与 Sandbox Attachment

## 验收标准

- `sdkwork-agents` 是 `AgentWorkspace` Identity、业务状态、持久生命周期和授权决策的唯一权威；`sdkwork-sandbox` 不实现第二套 Workspace Registry。
- `sdkwork-agents` 是 `AgentSession` 业务聚合的唯一权威；Sandbox 只维护 Provider-neutral `SandboxSession` 运行生命周期投影。
- 依赖方向固定为 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`；`sdkwork-sandbox` 不得依赖 `sdkwork-kernel` 或 `sdkwork-agents`。
- Kernel 在授权边界内把 Agents-owned Workspace/Session ID 映射为调用方提供的 `SandboxWorkspaceId` 与 `SandboxSessionId`；Sandbox 不生成这两个 ID。
- `CreateSandboxSessionCommand` 显式携带 `sandbox_workspace_id`、`sandbox_session_id`、`sandbox_operation_id`、`sandbox_required_capabilities` 与 `sandbox_minimum_assurance`。
- Sandbox 生成并拥有 `SandboxId`、`SandboxRuntimeBindingId` 与 `OperationId`；跨边界变量使用 `sandbox_id`、`sandbox_runtime_binding_id` 与 `sandbox_operation_id`，避免与 Agents 对象混淆。
- `SandboxSessionLifecyclePort` 与 `SandboxSessionRepository` 只保存运行生命周期所需的 Opaque ID、状态、操作记录和 `SandboxRuntimeBinding`，不复制 `AgentWorkspace` 或 `AgentSession` 业务字段。
- Sandbox 拥有 Workspace Attachment 的运行机制、Lease/Fencing 状态和 Provider-private Attachment Reference；Agents 仍拥有 Workspace 逻辑生命周期和授权语义。
- `SandboxProviderAllocationRequest`/`SandboxProviderStartRequest` 只携带 `sandbox_workspace_id` 等逻辑上下文与 `SandboxProviderAllocationRef`，不携带 Host Path、Storage Credential 或 Agents 持久化模型。
- Local Provider 不得从 `sandbox_workspace_id` 推导、拼接或猜测 Host Path；物理 Attachment 必须由经过授权的 L4 Adapter/Composition Capability 注入。
- Sandbox Session Stop/Destroy 只释放 Runtime Binding 与 Workspace Attachment，不删除、归档或变更 `AgentWorkspace`。
- Kernel 将活动 `SandboxRuntimeBindingId` 映射为 Agents 可持久化的 Opaque `runtimeLocationId`；Agents 不读取 Provider-private Allocation Reference。
- 跨仓库契约测试证明调用方提供的 `SandboxWorkspaceId`/`SandboxSessionId` 被原样保留，且 Cargo 依赖图不存在 Sandbox 到 Agents 的反向边。

## 非功能需求

| 领域 | 要求 |
| --- | --- |
| Security | Agents 在调用 Sandbox 前完成 Workspace/Session 授权；Sandbox 对缺失上下文、弱 Assurance、缺失 Capability 与未授权 Attachment 全部 Fail Closed。 |
| Privacy | Host Path、Storage Credential、Provider Allocation Reference 不进入 Agents 模型、公共错误、日志、事件或 Debug 输出。 |
| Performance | ID 映射为 O(1) 值转换；Attachment 查找与 Lease/Fencing 必须由有界索引或持久化约束实现，不允许无界内存扫描。 |
| Reliability | Operation Idempotency、Optimistic Version、Attachment Lease/Fencing 与 Reconciliation 防止重复活动 Runtime Binding。 |
| Coupling | 只通过稳定 Opaque ID 和 Sandbox-owned Port 集成；禁止跨仓库 SQL、Foreign Key、复制模型或 Raw HTTP。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `DEPENDENCY_MANAGEMENT_SPEC.md`, `SECURITY_SPEC.md`, `RUST_CODE_SPEC.md`, `TEST_SPEC.md`.

Components: `crates/sdkwork-sandbox-provider-spi`, `crates/sdkwork-intelligence-sandbox-service`, `sdkwork-kernel/sdkwork-agent-kernel`, and the Agents-owned Workspace/Session integration boundary.

Decision: [ADR-20260728: Agents Workspace And Sandbox Attachment Ownership](../../architecture/decisions/ADR-20260728-agents-workspace-and-sandbox-attachment-ownership.md).

## Verification

```bash
cargo test -p sdkwork-sandbox-provider-spi
cargo test -p sdkwork-intelligence-sandbox-service
cargo test -p sdkwork-intelligence-sandbox-repository-memory
cargo test --manifest-path ../sdkwork-kernel/sdkwork-agent-kernel/Cargo.toml
cargo tree --manifest-path ../sdkwork-kernel/Cargo.toml -p sdkwork-agent-kernel
node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
```

## Current Evidence

2026-07-28 已验证 `SandboxWorkspaceId`/`SandboxSessionId` 由 Kernel 从 Agents-owned ID 映射并原样进入 `CreateSandboxSessionCommand`；Lifecycle Service 将同一 `sandbox_workspace_id`、`sandbox_session_id`、`sandbox_id`、`sandbox_runtime_binding_id` 与 `sandbox_fencing_token` 传入 Allocate/Start Provider Request。`SandboxProviderReadiness` 对 Provider Ready、Policy Enforced 和 Workspace Attached 三项全部关闭失败，`sandbox_workspace_attached=false` 不得进入 Running。Cargo Dependency Tree 与锁定依赖编译/测试证明方向为 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`，Sandbox Cargo Manifest 不包含 Kernel/Agents 反向依赖。详见 [REVIEW-20260728: Sandbox Workspace Attachment Boundary Verification](../../engineering/reviews/REVIEW-20260728-sandbox-workspace-attachment-boundary-verification.md)。

当前证据只覆盖 Opaque Identity、Provider Request、Readiness 和依赖边界；生产 Physical Attachment Capability、Storage Backend、Revision/Authorization Proof、Attachment Retention、Snapshot/Restore 与多租户数据面隔离尚未实现，因此状态为 `in-progress`。

## Review Boundary

本需求建立跨仓库 `0.1` 候选契约与依赖方向。生产 Workspace Attachment 持久化 Schema、Lease Expiry/Fencing、Reconciler、Storage Backend、Snapshot/Restore、Retention 和多租户数据面隔离仍必须由独立 Ready Requirement 与人工数据/安全评审管理。
