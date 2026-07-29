# SDKWork Sandbox 模块与契约架构

Status: draft

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

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

The L0 event and observability contract candidate is authored under [`apis/async/`](../../../apis/async/), governed by `REQ-2026-0010` (`draft`), its proposed ADR, and the pending human review. It defines the Sandbox event envelope/catalog, transactional Outbox semantics, `SandboxAuditRecord`, structured logs, metrics, traces, backpressure, and fact separation; no event runtime, exporter, worker, migration, API, SDK, or deployment profile is implemented.

The L0 command contract candidate is authored under [`apis/commands/`](../../../apis/commands/), governed by `REQ-2026-0007` (`draft`), its proposed ADR, and the pending human review. It defines bounded executable/Argv and fenced cancellation requests, portable logical paths, server-owned trace correlation, Service-derived/Executor-verified canonical fingerprints, Tenant+Provider idempotency, durable first-terminal arbitration, outcome-consistent binary-safe terminal results, explicit cleanup/quarantine, same-operation result-unavailable retry, pre-start/result-unavailable errors, and common conformance scenarios only; no Rust `SandboxCommandExecutor`, host process, or provider implementation is present.

| Crate | Layer Role | 当前 Contract |
| --- | --- | --- |
| `sdkwork-sandbox-provider-spi` | L3 `backend-domain` | `SandboxProvider`、`SandboxProviderAllocationRequest`、`SandboxProviderStartRequest`、`SandboxProviderStopRequest`、`SandboxProviderDestroyRequest`、Capability/Assurance 与 Sandbox-qualified Identity。 |
| `sdkwork-intelligence-sandbox-service` | L2 `backend-service` | `SandboxSessionLifecyclePort`、`SandboxSessionRepository`、`SandboxSessionState`、幂等和 Sandbox Provider Selection。 |
| `sdkwork-sandbox-provider-local` | L4 `backend-provider` | 无 Host Access；仅提供 `#[cfg(test)]` Fake Host Boundary 负向 Harness，预留 Local Adapter Ownership。 |
| `sdkwork-intelligence-sandbox-repository-memory` | L4 `backend-repository` | 非生产、单进程 `InMemorySandboxSessionRepository`。 |
| `sdkwork-intelligence-sandbox-repository-sqlx` | L4 `backend-repository` | PostgreSQL `SandboxSessionRepository`、受保护 Provider Allocation Reference、Tenant-scoped CAS 与 Lease/Fencing 候选实现。 |
| `sdkwork-sandbox-service-host` | L5 `runtime-service-host` | 无 Runtime Entrypoint；`REQ-2026-0009` draft 预留 typed Composition/Readiness Ownership。 |
| `sdkwork-sandbox-cli` | L6 `tooling` | Empty Executable；无已接受 Command。 |

## 2.1 REQ-2026-0002 候选组件契约

| Crate | Layer Role | Candidate Contract |
| --- | --- | --- |
| `sdkwork-sandbox-provider-spi` | L3 `backend-domain` | `SandboxProviderId`、`SandboxProviderKind`、`SandboxProviderDescriptor`、`SandboxProviderHealth`、`SandboxProviderAllocationRequest`/`SandboxProviderAllocation`、`SandboxProviderStartRequest`、`SandboxProviderStopRequest`、`SandboxProviderDestroyRequest`、`SandboxProviderReadiness`、`SandboxProvider` Port 与 `SandboxIdentifierError`。 |
| `sdkwork-intelligence-sandbox-service` | L2 `backend-service` | `SandboxSession`、`SandboxSessionState`、`CreateSandboxSessionCommand`、`SandboxSessionLifecycleCommand`、`SandboxSessionOperation`、Idempotency、Sandbox Provider Selection、`SandboxSessionRepository`/`SandboxSessionLifecyclePort` 与 `SandboxLifecycleError`/`SandboxSessionRepositoryError`。 |
| `sdkwork-intelligence-sandbox-repository-memory` | L4 `backend-repository` | Tenant-scoped、Versioned、Single-process `InMemorySandboxSessionRepository` Adapter。 |

以上公共命名是 `ADR-20260728-sandbox-lifecycle-provider-spi-and-memory-store` 的 `0.1` 候选契约，人工评审前不构成跨仓库稳定性承诺。

每个组件拥有 `README.md`、`specs/README.md` 与 `specs/component.spec.json`。空 Contract 是刻意设计：Public Type、Port、Dependency、Event、Config Key 和 Entrypoint 必须随可实施 Requirement 一起到达。

Local Provider 的 Fake Host Boundary 仅在测试配置中编译，验证 `.` Workspace Root、跨平台逻辑相对路径/Windows Device 拒绝、Typed Argv、环境白名单和 UTF-8 Byte 边界；它没有公共导出、没有 Host I/O，不改变 Gate 0 对真实 Host Command 和 Local Capability 的禁止。

Firecracker Artifact Compatibility 当前只有 repository-level `specs/sandbox-firecracker-artifact-compatibility.contract.json`。它定义 draft `SandboxFirecrackerArtifactManifest`、精确 Architecture Tuple、Evidence、只读原子 Materialization、Revocation 与 Rollback；不创建 Rust Crate/Port、Artifact Builder/Downloader/Resolver、Runtime Path、Config、Release Artifact 或 `MicroVm` Assurance。

Workspace Block Device/Sanitization 当前只有 repository-level `specs/sandbox-workspace-block-device-attachment.contract.json`。Service Host 仍只注入 provider-neutral `SandboxWorkspaceAttachmentPort`；该契约定义其后的 draft L4 `SandboxWorkspaceBlockDevicePort` 机制、Agents/Drive-or-approved-storage Ownership、Grant、Fencing、At-rest Protection、Guest Device、Readiness、Sanitization、Residue 与 Quarantine；不创建 Rust Crate/Port、Storage Backend、KMS、Device/Mount、Runtime Path 或 `MicroVm` Assurance。

Firecracker Network Isolation 当前只有 repository-level `specs/sandbox-firecracker-network-isolation.contract.json`。provider-neutral `SandboxNetworkPolicyPort` 是候选 Policy Authority，其后的 L4 `SandboxNetworkIsolationPort` 只消费签名 Grant，并通过 Host Broker 固定 `sandbox_prepare_network` 机制执行；契约定义 `DenyAll`、显式 DNS/Egress、永久 Metadata/Host/Tenant Lateral Denial、per-binding netns/Tap、Fencing/Revision、Atomic Apply/Verify、Readiness、Cleanup/Residue/Quarantine 与 Durable Audit，不创建 Rust Crate/Port、Network Namespace、Tap、Firewall/DNS/Route Runtime、Config 或 `MicroVm` Assurance。

Firecracker Resource Isolation 当前只有 repository-level `specs/sandbox-firecracker-resource-isolation.contract.json`。provider-neutral `SandboxResourcePolicyPort` 是候选 Quota/Resource Policy Authority，其后的 L4 `SandboxResourceIsolationPort` 只消费 `SandboxResourceLimitGrant`，通过 Host Broker 固定 `sandbox_apply_resource_limits` 执行 Firecracker Machine Config + per-binding cgroup v2，并输出 immutable `SandboxResourceUsageFact`；契约定义 CPU/Memory/PID/IO、Fencing/Revision、Effective Readback、typed Limit Outcome、Final Usage、Commerce Ownership、Cleanup/Residue/Quarantine，不创建 Rust Crate/Port、Quota Engine、cgroup/Machine Config Runtime、Usage Pipeline、Commerce Adapter、Config 或 `MicroVm` Assurance。

Multi-tenant Admission、Scheduler、Placement 与 Capacity 当前只有 repository-level `specs/sandbox-multi-tenant-scheduling.contract.json`。候选 `SandboxAdmissionPolicyPort` 原子预留 Tenant Quota，`SandboxNodeInventoryPort` 提供受信且有界的 Node Snapshot，`SandboxSchedulerPort` 先执行 Hard Placement Filter，`SandboxCapacityReservationPort` 再在 PostgreSQL 权威边界完成 Reservation-before-Allocate；`SandboxPlacementDecision` 与 REQ-2026-0015 Resource Grant 绑定同一 Admission/Reservation。该 Gate 0 不创建 Rust Crate/Port、Scheduler/Admission Runtime、Database Schema/Migration、Node Agent/Enrollment、Pool、Commerce Adapter、Config 或 Deployment Profile。

PostgreSQL Quota/Capacity Persistence 当前只有 repository-level `specs/sandbox-quota-and-capacity-persistence.contract.json`。REQ-2026-0018 将候选权威拆为 `SandboxTenantQuotaState`、`SandboxAdmissionReservation`、`SandboxNodeCapacityState` 与 `SandboxCapacityReservation`，固定显式 Resource Vector、全局 Lock Order、CAS/Fencing、Database Clock、Bounded Whole-transaction Retry、TTL/Quarantine、Keyset Reconciliation、RLS/Role 与 PITR/RPO/RTO。该 Gate 明确把现有 `TenantId`/`tenant_id TEXT` 到标准 SQL Subject `BIGINT` 的对齐列为实现前 Migration Blocker；当前 Database Contract/Registry/Migration 和 Rust Repository 不变，不创建 Table、Port、Adapter、Scheduler 或 Deployment Profile。

Cloud Node Trust、Enrollment、Attestation 与 Verified Inventory 当前只有 repository-level `specs/sandbox-node-trust-and-inventory.contract.json`。四个 provider-neutral L3 Port 分别拥有 Enrollment、Attestation Verification、Inventory Publication 与 Lifecycle Control；Node Agent 只作为 Claimant/Publisher，Control Plane 绑定短期 Key-bound Identity、Attestation、Artifact、Policy、Health 与 Capacity Revision 后签发 `SandboxVerifiedNodeInventoryRecord`，REQ-2026-0016 的 `SandboxNodeInventoryPort` 只能投影该记录。该 Gate 0 不创建 Rust Crate/Port、Node Agent、PKI/CA/HSM、Attestation Verifier、Database、Scheduler/Provider Runtime、Service Unit 或 Deployment Profile。

## 3. 输入 PRD Module Mapping

| 输入逻辑模块 | SDKWork-aligned Ownership | 计划 Artifact（仅在拆分合理时） |
| --- | --- | --- |
| `sandbox-core` | L3 Shared Domain Type/Port，不建立 Application-code `core` Catch-all | 扩展 Focused Port/Domain Crate；不创建 `sdkwork-sandbox-core`。 |
| `sandbox-runtime` | Kernel-facing Runtime Port 与 L2 Orchestration | `SandboxSessionLifecyclePort`、`CreateSandboxSessionCommand`、`SandboxSessionLifecycleCommand` 与 `SandboxRuntimeBinding`；不创建 Bare Runtime Crate。 |
| `sandbox-api` | L0 internal-api Authority、L1 Route、L5 Assembly、L6 Listener | `sdkwork-routes-sandbox-internal-api`、`sdkwork-api-sandbox-assembly`、`sdkwork-api-sandbox-standalone-gateway`。 |
| `sandbox-session` | L2 Lifecycle Use Case 与 L3 State/Repository Port | `SandboxSession`/`SandboxSessionState` 是 `AgentSession` 的运行投影；使用 `sandbox_session_id`、`sandbox_session_state` 与 `sandbox_operation_id`，位于 Sandbox Service。 |
| `sandbox-workspace` | Workspace Attachment 与受控运行访问 | `AgentWorkspace` Identity/业务生命周期由 `sdkwork-agents` 拥有；SDKWork 文件/对象存储适用时由 Drive 拥有；Sandbox 只拥有一次 Session/Binding 的 Attachment Projection/Lease/Fencing，具体 Block-volume Backend 需独立 Ready Requirement。 |
| `sandbox-scheduler` | L2 Admission/Placement Orchestration、L3 Admission/Inventory/Scheduler/Capacity Port、L4 PostgreSQL Quota/Capacity Persistence Adapter | REQ-2026-0016 与 REQ-2026-0018 已形成 draft Gate 0 Contract；Subject Migration、公共命名、四对象数据权威与实现仍等待人工评审，不创建 Scheduling Service/Table/Migration/Adapter。 |
| `sandbox-node-trust` | L3 Enrollment/Attestation/Inventory Publication/Lifecycle Port、未来 L4 Machine Identity/Attestation/Verified Inventory Adapter 与 L6 Node Agent | REQ-2026-0017 已形成 draft Gate 0 Contract；Node Agent 不是 Scheduler Authority，公共命名、PKI、Attestation、Database 与 Deployment 实现均等待人工评审。 |
| `sandbox-pool` | Warm Pool、跨 Tenant Reuse、Sanitization、Refresh、Drain 与 Capacity Reconciliation | 延期；必须由独立 Ready Requirement/ADR 定义，不能从 Scheduler Gate 推导实现。 |
| `sandbox-provider` | L3 SPI 与 L4 Adapter | 现有 SPI Scaffold；未来 `sdkwork-sandbox-provider-{local,firecracker,docker,gvisor,kubernetes,remote}`，其中 Docker 延期；Firecracker 只消费经评审的 `SandboxFirecrackerArtifactManifest`，不拥有构建/发布。 |
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
  apis/                         # reviewed and draft contract authority boundary
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
  specs/                        # active cross-component machine contracts
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
