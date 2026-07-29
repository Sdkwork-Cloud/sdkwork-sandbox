# SDKWork Sandbox Runtime Topology

Status: draft

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

Parent: [Technical Architecture](TECH_ARCHITECTURE.md)

## 1. Standalone Local

```mermaid
flowchart LR
    UI["IDE / Desktop / CLI"] --> A["sdkwork-agents\nAgentWorkspace / AgentSession"]
    A --> K["sdkwork-kernel\nSandbox ID mapping"]
    K --> S["Sandbox service host"]
    S --> W["Authorized Workspace attachment capability"]
    S --> LP["Local Provider"]
    LP --> OS["Windows / macOS / Linux host capabilities"]
```

Local Path 不要求服务器。Config、Data、Cache、Log、Secret 与 Temp Path 遵循 `RUNTIME_DIRECTORY_SPEC.md` 中 Application Code `sandbox` 的矩阵。Source `.sdkwork/` 只属于仓库元数据，不能承载 Runtime State。

Local Provider 提供 Host-user-level Containment 与显式 Capability，不承诺 Hardened Multi-tenant Isolation。当前 Standalone Composition 只规划 Local Provider；Docker Provider 延期，不进入依赖、Config、Capability Fallback 或 Release Claim。

## 2. Private Remote

```mermaid
flowchart TB
    CLIENT["IDE / browser / automation"] --> AGENTS["sdkwork-agents application"]
    AGENTS --> KERNEL["sdkwork-kernel adapter"]
    KERNEL --> API["Sandbox internal API / generated SDK"]
    API --> CONTROL["Lifecycle service + scheduler"]
    CONTROL --> META["Durable metadata / leases"]
    CONTROL --> NODE["Enrolled Sandbox Provider node"]
    NODE --> PROVIDER["Firecracker / future gVisor / Remote VM"]
    PROVIDER --> WORKSPACE["Authorized Workspace attachment backend"]
```

Internal API 属于 Application-local Surface，使用锁定的 `/internal/v3/api` Prefix 和 Ingress-token Validation，默认不能暴露在 Platform API Gateway。Provider Node 通过单独评审的 Machine Identity 与 Transport 向 Control Plane 认证。

当前优先远程 Data Plane 是真实 Linux KVM Firecracker。Docker 在 Local 与 Firecracker 完成共同 Conformance 和安全评审前保持延期；不可用的 Firecracker 不回退为 Local、Docker 或更弱 Assurance。

## 3. SaaS Cloud

```mermaid
flowchart TB
    CLIENT["First-party clients"] --> LB["Application ingress"]
    LB --> CP1["Control plane replica"]
    LB --> CP2["Control plane replica"]
    CP1 --> DB["Durable lifecycle metadata"]
    CP2 --> DB
    CP1 --> COORD["Distributed leases / cache / rate limits"]
    CP2 --> COORD
    CP1 --> SCHED["Scheduler"]
    CP2 --> SCHED
    SCHED --> POOL["Sanitized warm pools"]
    SCHED --> NODES["Sandbox Provider node groups"]
    NODES --> DATA["Tenant-isolated Sandbox data planes"]
    DATA --> WS["Workspace and snapshot storage"]
    CP1 --> EVENTS["Events / metrics / metering"]
    CP2 --> EVENTS
```

Control-plane Replica 对活动 Ownership 保持 Stateless；Durable Metadata 与 Atomic Lease 防止重复分配。Data-plane Node 按 Capability、OS、Architecture、Isolation Assurance、Region 与 Capacity 分组。Warm Allocation 在未完成清理验证前不得跨租户重新分配。

## 4. Control Plane And Data Plane

Agents Control Plane 拥有 `AgentWorkspace`/`AgentSession` 业务 Identity、授权和持久生命周期。Sandbox Control Plane 拥有 Validated Runtime Intent、`SandboxSession`/`SandboxSessionState`、`SandboxRuntimeBinding`、Admission、Quota、Placement、Attachment Lease/Fencing、Recovery Decision、Runtime Metadata 与 Operator Projection。Data Plane 通过 `SandboxProvider` 拥有具体 Process/VM/Container、Workspace Capability Handle、Network Namespace/Policy、Resource Enforcement、Terminal IO 与 `SandboxProviderHealth` Observation。

Data-plane Failure 不能直接重写产品生命周期历史，只能报告 Observation，由 Control-plane Service 决定 State Transition 与 Recovery。Control Plane 也不得绕过 Provider 直接访问 Host Path 或 Process。

## 5. Placement Input

- `RuntimeCapability` 与 Sandbox Provider Feature Version。
- Requested Isolation Assurance 与 Tenant Policy。
- OS、CPU Architecture、Optional Accelerator、Toolchain Image。
- Workspace/Snapshot Locality 与 Data Residency。
- CPU、Memory、Disk、IO、PID、Port 与 Network Capacity。
- Tenant/Session/Node/Cluster Quota 与 Concurrency。
- Node Health、Maintenance、Failure Domain 与 Warm-pool Compatibility。

没有 Candidate 满足全部 Hard Constraint 时必须拒绝。Cost、Warmness、Locality 只能对合规 Candidate 排序，不能覆盖 Security Constraint。

## 6. Failure And Recovery

| Failure | Required Response |
| --- | --- |
| `SandboxRuntimeBinding` 前 Sandbox Provider Allocation Failure | `sandbox_operation_id` 对应 Operation 失败或重试同等级 Sandbox Provider；`SandboxSession` 不进入 Running。 |
| Node Disappears | Lease 到期；`SandboxSession` 进入 Recovering；Replacement 必须取得独占 Ownership 和有效 Checkpoint。 |
| Control-plane Replica Restart | Durable Command/Idempotency/Lease State 防止重复活动 `SandboxRuntimeBinding`。 |
| Workspace Backend Unavailable | Write Fail Closed；除非有明确 Read-only Policy，否则不使用不完整或 Stale Mount 启动。 |
| Distributed Coordination Unavailable | Cloud Admission 与 Coordination-critical Operation Fail Closed；禁止 Process-local Split-brain Fallback。 |
| Event/Telemetry Sink Unavailable | 使用 Bounded Buffer/Backpressure；Audit-critical Loss 必须暴露 Degraded Status 与 Alert。 |
| Snapshot Incompatible/Corrupt | 拒绝 Restore，保留 Source Workspace，返回安全类型化 Recovery Failure。 |

## 7. Deployment Profile Parity

Standalone 与 Cloud 共享 `Sandbox*` Identifier、`SandboxSessionState`、Operation Semantics、Event Schema、API/SDK Type、Error Taxonomy 与 Sandbox Provider Conformance。它们只允许在 Metadata Store、Cache/Coordination、Workspace Storage、Scheduler 与 `SandboxRuntimeBinding` Mechanism 上使用不同 Adapter。Deployment Profile 不能成为 L2 Business Rule Switch。
