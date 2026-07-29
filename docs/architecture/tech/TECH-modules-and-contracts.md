# SDKWork Sandbox 模块与契约架构

Status: draft

Owner: SDKWork Runtime Platform

Updated: 2026-07-28

Parent: [Technical Architecture](TECH_ARCHITECTURE.md)

## 1. Layer Model

| Layer | Sandbox Ownership | Dependency Rule |
| --- | --- | --- |
| L0 Contract | OpenAPI、RPC、Event Schema、State 与 Config Machine Contract | 不依赖实现。 |
| L1 Adapter | HTTP Route/Controller 与 Transport Mapper | 只调用 L2；不执行 Sandbox Provider/Repository Policy。 |
| L2 Service | `SandboxSession`、Workspace Attachment、Allocation、Quota、Snapshot 与 Recovery Use Case | 只依赖 L3 Port 与 Domain Type；不拥有 `AgentWorkspace`/`AgentSession`。 |
| L3 Domain/Port | State Rule、Repository Port、Sandbox Provider SPI、Clock/ID/Secret/Event Port | 不导入 HTTP、Database、Sandbox Provider SDK、Deployment 或 UI Type。 |
| L4 Adapter | 优先 Local/Firecracker，后续 Docker/gVisor/Kubernetes/Remote Sandbox Provider，以及 Persistence/Cache Adapter | 实现 L3 Port；只拥有 Mechanism，不拥有 Business Policy。Docker 当前延期，不进入 Composition。 |
| L5 Composition | Service Host、Scheduler Composition、Sandbox Provider Registry、Config Bootstrap、API Assembly | 构造并绑定组件。 |
| L6 Delivery/Ops | CLI、Standalone Gateway、Node Agent、Deployment Package、Operator UI | 通过 L1/L5 或 Generated SDK 调用。 |

## 2. 当前已物化组件

| Crate | Layer Role | 当前 Contract |
| --- | --- | --- |
| `sdkwork-sandbox-provider-spi` | L3 `backend-domain` | `SandboxProvider`、`SandboxProviderAllocationRequest`、`SandboxProviderStartRequest`、`SandboxProviderStopRequest`、`SandboxProviderDestroyRequest`、Capability/Assurance 与 Sandbox-qualified Identity。 |
| `sdkwork-intelligence-sandbox-service` | L2 `backend-service` | `SandboxSessionLifecyclePort`、`SandboxSessionRepository`、`SandboxSessionState`、幂等和 Sandbox Provider Selection。 |
| `sdkwork-sandbox-provider-local` | L4 `backend-provider` | 无 Host Access；预留 Local Adapter Ownership。 |
| `sdkwork-intelligence-sandbox-repository-memory` | L4 `backend-repository` | 非生产、单进程 `InMemorySandboxSessionRepository`。 |
| `sdkwork-intelligence-sandbox-repository-sqlx` | L4 `backend-repository` | PostgreSQL `SandboxSessionRepository`、受保护 Provider Allocation Reference、Tenant-scoped CAS 与 Lease/Fencing 候选实现。 |
| `sdkwork-sandbox-service-host` | L5 `runtime-service-host` | 无 Runtime Entrypoint；预留 Composition Ownership。 |
| `sdkwork-sandbox-cli` | L6 `tooling` | Empty Executable；无已接受 Command。 |

## 2.1 REQ-2026-0002 候选组件契约

| Crate | Layer Role | Candidate Contract |
| --- | --- | --- |
| `sdkwork-sandbox-provider-spi` | L3 `backend-domain` | `SandboxProviderId`、`SandboxProviderKind`、`SandboxProviderDescriptor`、`SandboxProviderHealth`、`SandboxProviderAllocationRequest`/`SandboxProviderAllocation`、`SandboxProviderStartRequest`、`SandboxProviderStopRequest`、`SandboxProviderDestroyRequest`、`SandboxProviderReadiness`、`SandboxProvider` Port 与 `SandboxIdentifierError`。 |
| `sdkwork-intelligence-sandbox-service` | L2 `backend-service` | `SandboxSession`、`SandboxSessionState`、`CreateSandboxSessionCommand`、`SandboxSessionLifecycleCommand`、`SandboxSessionOperation`、Idempotency、Sandbox Provider Selection、`SandboxSessionRepository`/`SandboxSessionLifecyclePort` 与 `SandboxLifecycleError`/`SandboxSessionRepositoryError`。 |
| `sdkwork-intelligence-sandbox-repository-memory` | L4 `backend-repository` | Tenant-scoped、Versioned、Single-process `InMemorySandboxSessionRepository` Adapter。 |

以上公共命名是 `ADR-20260728-sandbox-lifecycle-provider-spi-and-memory-store` 的 `0.1` 候选契约，人工评审前不构成跨仓库稳定性承诺。

每个组件拥有 `README.md`、`specs/README.md` 与 `specs/component.spec.json`。空 Contract 是刻意设计：Public Type、Port、Dependency、Event、Config Key 和 Entrypoint 必须随可实施 Requirement 一起到达。

## 3. 输入 PRD Module Mapping

| 输入逻辑模块 | SDKWork-aligned Ownership | 计划 Artifact（仅在拆分合理时） |
| --- | --- | --- |
| `sandbox-core` | L3 Shared Domain Type/Port，不建立 Application-code `core` Catch-all | 扩展 Focused Port/Domain Crate；不创建 `sdkwork-sandbox-core`。 |
| `sandbox-runtime` | Kernel-facing Runtime Port 与 L2 Orchestration | `SandboxSessionLifecyclePort`、`CreateSandboxSessionCommand`、`SandboxSessionLifecycleCommand` 与 `SandboxRuntimeBinding`；不创建 Bare Runtime Crate。 |
| `sandbox-api` | L0 internal-api Authority、L1 Route、L5 Assembly、L6 Listener | `sdkwork-routes-sandbox-internal-api`、`sdkwork-api-sandbox-assembly`、`sdkwork-api-sandbox-standalone-gateway`。 |
| `sandbox-session` | L2 Lifecycle Use Case 与 L3 State/Repository Port | `SandboxSession`/`SandboxSessionState` 是 `AgentSession` 的运行投影；使用 `sandbox_session_id`、`sandbox_session_state` 与 `sandbox_operation_id`，位于 Sandbox Service。 |
| `sandbox-workspace` | Workspace Attachment 与受控运行访问 | `AgentWorkspace` Identity/业务生命周期由 `sdkwork-agents` 拥有；Sandbox 只拥有 Attachment Mechanism/Lease/Fencing，Physical Storage 保持 L4 Adapter。 |
| `sandbox-scheduler` / `sandbox-pool` | L2 Admission/Placement、L3 Node/Lease Port、L4 Store | 未来 `sdkwork-intelligence-sandbox-scheduling-service` 与 Focused Adapter。 |
| `sandbox-provider` | L3 SPI 与 L4 Adapter | 现有 SPI Scaffold；未来 `sdkwork-sandbox-provider-{local,docker,firecracker,gvisor,kubernetes,remote}`。 |
| cache/network/security/filesystem/terminal/log/event/snapshot/config | 正确 Layer 中的 Cross-cutting Policy、Port 与 Adapter | 仅在 Reuse 或 Complexity 形成真实 Component Boundary 时拆 Crate。 |
| `sandbox-monitor` | Health/Metric/Trace Adapter 与 Operator Projection | Observability Adapter 或 Operator API，而不是 Business Service。 |
| `sandbox-cli` | L6 Command Adapter | 现有 Empty CLI Scaffold。 |

## 4. 计划依赖图

```mermaid
flowchart LR
    API["L0 contract"] --> ROUTE["L1 route adapter"]
    ROUTE --> SERVICE["L2 Sandbox service"]
    SERVICE --> PORTS["L3 domain and ports"]
    PROVIDERS["L4 provider adapters"] --> PORTS
    STORES["L4 persistence/cache adapters"] --> PORTS
    HOST["L5 service host"] --> SERVICE
    HOST --> PROVIDERS
    HOST --> STORES
    ASSEMBLY["L5 API assembly"] --> ROUTE
    GATEWAY["L6 standalone gateway"] --> ASSEMBLY
    CLI["L6 CLI"] --> HOST
    AGENTS["sdkwork-agents\nAgentWorkspace / AgentSession"] --> KERNEL["sdkwork-kernel\nID mapping adapter"]
    KERNEL --> SERVICE
```

箭头表示 Build/Use Dependency 指向被消费组件。跨仓库方向固定为 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`。L2 不导入 Concrete Provider；Provider Adapter 不决定 Lifecycle 或 Tenant Policy；CLI 与 Route 不直接访问 Provider 或 Repository；Sandbox 不导入 Agents 模型。

## 5. Repository Layout

```text
sdkwork-sandbox/
  AGENTS.md
  Cargo.toml
  .sdkwork/
  apis/                         # inactive contract authority boundary
  apps/README.md                # repository root is primary app surface
  crates/
    sdkwork-sandbox-provider-spi/
    sdkwork-intelligence-sandbox-service/
    sdkwork-sandbox-provider-local/
    sdkwork-intelligence-sandbox-repository-memory/
    sdkwork-intelligence-sandbox-repository-sqlx/
    sdkwork-sandbox-service-host/
    sdkwork-sandbox-cli/
  sdks/                         # inactive generated SDK family boundary
  database/                     # active authoritative-server PostgreSQL contract and migration assets
  jobs/ tools/ plugins/ examples/
  etc/ deployments/ scripts/   # inactive runtime/release boundaries
  docs/
  specs/                        # future cross-component machine contracts
  tests/                        # active cross-component contract verification
```

## 6. Agents、Kernel 与 Sandbox Integration Boundary

Sandbox 不依赖具体 Agent Provider，也不复制 Kernel Tool Semantics 或 Agents 业务模型。进程内集成权威已经固定为 Sandbox-owned Rust Port：

1. `sdkwork-agents` 授权 `AgentWorkspace`/`AgentSession` 并调用 `sdkwork-kernel`。
2. Kernel 映射为 `SandboxWorkspaceId`/`SandboxSessionId`，构造 `CreateSandboxSessionCommand` 或 `SandboxSessionLifecycleCommand`；字段使用 `sandbox_workspace_id`、`sandbox_session_id`、`sandbox_operation_id`、`sandbox_required_capabilities` 与 `sandbox_minimum_assurance`。
3. Kernel 只消费 `SandboxSessionLifecyclePort`，并把 `SandboxRuntimeBindingId` 映射为 Agents 的 Opaque `runtimeLocationId`。
4. Kernel 将 `SandboxLifecycleError::LeaseUnavailable`/`SandboxLifecycleError::LeaseLost` 显式映射为来源为 Runtime 的可重试 Conflict；持久化与保护器内部错误不泄露为 Provider 或 Validation Error。
5. Sandbox 不反向依赖 Kernel/Agents，不创建 Workspace Registry，不推导 Physical Path。

未来跨进程组合可通过生成的 `@sdkwork/intelligence-internal-sdk` 或经过评审的 Internal RPC SDK，但每个 Operation 只能有一个 Source Contract Authority。HTTP/RPC 若并存，必须共享 Operation Semantics、Lifecycle、Identifier、Authorization 与 Error。Sibling Cargo 依赖只在 Kernel Root Cargo 声明一次，member crate 使用 `.workspace = true`。
