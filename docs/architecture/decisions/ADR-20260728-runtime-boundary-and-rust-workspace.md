# ADR-20260728: Runtime Boundary And Rust Workspace

Status: proposed

Requirement: REQ-2026-0001

Owner: SDKWork Runtime Platform

Date: 2026-07-28

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `NAMING_SPEC.md`, `RUST_CODE_SPEC.md`, `COMPONENT_SPEC.md`, `DEPENDENCY_MANAGEMENT_SPEC.md`

## Context

SDKWork 需要从本地宿主机逐步扩展到 Container、microVM、Kubernetes 与 Remote VM 的执行环境，同时不能把 Provider Mechanism 写入 `sdkwork-kernel`。输入 PRD 提出了 `sandbox-core`、`sandbox-runtime`、`sandbox-session` 等逻辑模块，但当前 SDKWork 命名与分层规范禁止泛化的 Application-code `core`/`runtime` Crate，并要求每个 Authored Component 都有明确 Layer Role 与 Machine Contract。

Lifecycle Slice 已形成 Sandbox-owned `SandboxSessionLifecyclePort` `0.1` 候选契约。该端口必须由 Kernel 消费，不能把 Sandbox Provider Mechanism 或 Agents 业务模型复制进 Kernel。

## Decision

1. `sdkwork-sandbox` 是 Application Repository，Application Code 为 `sandbox`，Repository Root 是 Primary App Surface。
2. Rust 是主实现语言，Cargo 是唯一 Source/Build Dependency Authority。
3. 产品所有权按 SDKWork L0-L6 分层：
   - L0：未来 `apis/` 下的 internal-api、RPC、Event 与机器契约。
   - L1：未来 Route/Controller 与 Transport Mapper。
   - L2：`sdkwork-intelligence-sandbox-service` 拥有生命周期 Use Case。
   - L3：`sdkwork-sandbox-provider-spi` 与未来 Domain/Port Contract。
   - L4：`sdkwork-sandbox-provider-local` 等 Provider/Persistence Adapter。
   - L5：`sdkwork-sandbox-service-host` 负责进程内组合；未来标准 API Assembly/Gateway 负责 HTTP。
   - L6：`sdkwork-sandbox-cli` 与未来 Delivery/Operations Adapter。
4. Provider SPI、Lifecycle Service 与 Memory Repository 发布 `0.1` 候选 Rust Contract；Local Provider、Service Host 与 CLI 在对应 Ready Requirement 前保持未激活。
5. 第一版进程内 Kernel Integration 使用 Sandbox-owned `SandboxSessionLifecyclePort`。Sibling Cargo Dependency 在 Kernel 根 `Cargo.toml` 声明一次，member crate 使用 `.workspace = true`。禁止 Kernel 按具体 Provider 分支。
6. `AgentWorkspace`、`AgentSession`、`SandboxSession`、Sandbox Allocation 与 `SandboxRuntimeBinding` 是不同身份。Kernel 映射 Agents ID 为 `SandboxWorkspaceId`/`SandboxSessionId`；销毁 Allocation 不得隐式删除 Workspace。
7. 跨仓库依赖方向固定为 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`；Sandbox 不依赖 Kernel 或 Agents。
8. Terminal、Filesystem、Security、Network、Cache、Log、Event、Snapshot 与 Config 首先作为正确 Layer 内的职责与 Port 存在。只有独立 Ownership、Reuse 或 Complexity 成立时才拆为独立 Crate。

## Alternatives

### 单一 `sdkwork-sandbox` Crate

拒绝。生命周期策略、Provider Port、Provider Adapter、Composition 与 CLI 会坍缩到同一组件，产生依赖环并破坏分层。

### 按输入 PRD 的每个名词建立一个 Crate

Phase 0 拒绝。它会产生大量空组件、被禁止的泛化名称和不稳定契约。

### 由 `sdkwork-kernel` 直接拥有 Provider Execution

拒绝。每个 Provider 和部署目标都会扩大 Kernel 职责，破坏 Provider-neutral Runtime。

### 让 Sandbox 依赖 `sdkwork-agent-kernel` 或 `sdkwork-agents`

拒绝。Runtime Infrastructure 反向依赖 Kernel/Agents 会形成依赖环，并把业务对象泄漏到 Sandbox。

## Consequences

收益：在实现前明确依赖方向；Provider 可按 Open-Closed 方式增加并做一致性测试；避免 Generic Crate 命名债；仓库在不虚构外部契约的情况下可编译。

成本：Local Provider、CLI 与完整 Runtime 尚不可用；跨仓库 `0.1` Contract 仍需人工评审；部分逻辑职责未来可能拆分为新 Crate，并需要更新 Component Contract。

## Verification

- Cargo Workspace 当前包含七个已声明 Member；只有实现存在的组件声明 Port，PostgreSQL Repository 是新增 L4 Persistence Adapter。
- 每个 Member 都有 `specs/component.spec.json` 并声明 L0-L6 Layer Role。
- Naming Scan 不出现被禁止的 Generic Application-code Crate Suffix。
- Operational Port 增加前，Component Port 与 Application Layering Validator 必须通过。
- Kernel Integration 必须由 REQ-2026-0004 与 Agents Workspace Attachment ADR 追踪，在 Kernel Root Cargo 声明一次 Sandbox 依赖，并用 `cargo tree` 证明不存在反向依赖。

## Supersedes / Superseded By

Supersedes: none.

Superseded by: none.
