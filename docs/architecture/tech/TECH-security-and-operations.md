# SDKWork Sandbox 安全与运行架构

Status: draft

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

Parent: [Technical Architecture](TECH_ARCHITECTURE.md)

## 1. Threat Model Boundary

Sandbox 执行不可信或部分可信代码。攻击目标可能包括 Workspace Escape、跨 Assignment Persistence、Resource Exhaustion、Host/Cloud Control Plane Access、Credential Theft、Cross-tenant Attack 与 Data Exfiltration。每个 Sandbox Provider 必须发布 Assurance Profile，产品 Policy 决定它可承载哪些 Workload。

Local Provider 无法建立强于当前 OS User 与已开放 Host Capability 的边界。当前多租户不可信 Workload 的优先候选是经过评审的 Linux KVM Firecracker MicroVm Profile；Docker Provider 延期且不能作为 Assurance 回退。未来 gVisor、Dedicated VM 或其他 Profile 必须分别提供等价评审证据。

## 2. Deny-by-default Control

- 禁止不受限 Host Filesystem；Workspace/Cache Root 使用 Capability Handle 与 Canonical Containment。
- 默认禁止 Docker/Container Socket、Cloud Metadata Endpoint、Host Network、Host SSH Agent、Privileged Mode、Host PID Namespace。
- 禁止 Ambient Credential；Secret 通过 Reference 解析，在最小 Scope/Time 内注入，并在 Stop/Reassignment 后撤销。
- 未经评审的 Profile 禁止 Elevated Linux Capability、Device、Kernel Module 与 Unsafe Host Mount。
- Egress 默认拒绝或按 Destination、Protocol、Purpose 显式授权；DNS Resolution 不等同 Egress Grant。
- Provider 支持时 RootFS Read-only；Writable Layer、Workspace、Cache、Temp 分别限制。
- 每个 Destructive Filesystem/Workspace/Snapshot/Allocation Operation 都必须显式、授权、可审计且考虑 Idempotency。

## 3. Filesystem And Workspace Safety

Path Validation 必须按操作系统处理 `..`、Symbolic Link、Reparse Point、Mount Point、Hard Link、Case/Normalization、Device Name、Alternate Data Stream 与 TOCTOU。Provider 应优先使用已打开的 Capability-based Directory Handle，而不是反复信任 String Path。

Physical Workspace Root 与 Provider Host Path 是 Private Metadata。Public Error/Event/SDK Type 只使用 Logical Relative Path 与 Opaque `SandboxWorkspaceId`；变量名使用 `sandbox_workspace_id`，不得从该值推导路径。Workspace Snapshot 必须校验 Integrity，未经 Agents Ownership/Authorization 与 Revision Validation 不得覆盖 Active `SandboxRuntimeBinding`。

## 4. Process、Terminal 与 Network Safety

Process Creation 执行 Executable Policy、Working-directory Containment、Environment Allow/Deny、CPU/Memory/IO/PID Limit、Wall Timeout、Output Limit、Cancellation 与 Child Cleanup。Stop/Destroy 必须在有界策略下等待或强制结束 Descendant。

Terminal IO 可能包含敏感数据，必须 Bounded、Access-controlled，并与 Structured Operational Log 使用不同 Retention。Port Forward 需要显式 Lease，至少记录 Owner、Direction、Target、Expiry、Exposure Class 与 Revoke Operation。

Sandbox Lifecycle Provider Side Effect 使用 `SandboxSessionLease` 建立唯一控制权。内部身份/变量固定为 `SandboxLeaseOwnerId`/`sandbox_lease_owner_id` 与 `SandboxFencingToken`/`sandbox_fencing_token`；每次 Allocate/Start/Stop/Destroy 前必须 Renew，Provider Request 必须携带当前 Token。Acquire 发现其他控制器仍持有 Lease 时返回 `SandboxLifecycleError::LeaseUnavailable`；Acquire 成功后 Renew、Token Identity Check 或 Release 失败时返回 `SandboxLifecycleError::LeaseLost`。Provider Operation Timeout 必须非零且不超过 Lease Duration 的一半，以便 Timeout/返回后仍保留提交失败状态或清理的时间预算；`LeaseLost` 后不得继续 Provider 调用或 Repository Save。真实 Provider 必须按 `SandboxRuntimeBindingId` 拒绝低于已观察值的 Token。

PostgreSQL Operation 历史使用稳定 `sandbox_operation_sequence`，避免同一事务时间戳和随机 ID 造成状态机反序。Repository Restore 必须在解密 `SandboxProviderAllocationRef` 前按该顺序重放并验证持久化组合不变量；`Running`/`Stopping`/`Stopped` 缺少受保护 Allocation、`Created`/`Destroyed` 保留 Binding、Transient State 缺少匹配 InProgress Operation、Failure 不匹配等情况统一关闭失败，且不得触发 Provider Side Effect。

## 5. Secret Handling

Secret Value 禁止进入 Source `etc/`、App Manifest、Component Spec、Workspace Metadata、Event Payload、Metric Label、可避免的 Command-line Argument 或默认 Durable Terminal Replay。Sandbox Runtime 可以记录 Secret Reference、Purpose、`sandbox_provider_id`、Version、Injection Time 与 Revocation Outcome，但不能记录 Value。

Reassignment、Snapshot 与 Cache Policy 必须证明 Secret-bearing Memory/Filesystem Layer 被排除，或已加密并受访问控制。Restore 后重新解析 Secret，不能假设旧 Credential 仍有效。

`SandboxProviderAllocationRef` 的 Versioned Protection、Tenant-scoped Re-encryption、Ciphertext Metadata CAS 与旧密钥撤销遵循 [Allocation Key Rotation ADR](../decisions/ADR-20260728-sandbox-provider-allocation-key-rotation-and-reencryption.md)。真实 PostgreSQL 候选证据见 [Allocation Key Rotation Verification](../../engineering/reviews/REVIEW-20260729-sandbox-provider-allocation-key-rotation-verification.md)，受控操作顺序见 [Allocation Key Rotation And Old-key Revocation Runbook](../../runbooks/RUNBOOK-sandbox-provider-allocation-key-rotation.md)。Runbook 当前为 `candidate`，不得替代尚未交付的 Secret/KMS Adapter、Operator Entry Point、Audit/Metric 或人工撤销审批。

`SandboxProviderAllocationKey` Key Material 使用 `Zeroizing<Vec<u8>>`，包括构造校验失败路径；派生 AES Key 使用 `Zeroizing<[u8; 32]>`，Provider-private 明文由 `SandboxProviderAllocationRef` Drop 清零。Key ID 限定为 `1..=128` bytes printable ASCII，并由 Key Carrier、Service Domain Constructor 与 PostgreSQL `CHECK` Constraint 分层拒绝不安全值。当前 Key Source 是同步 Trait，生产 Adapter 不得在 Tokio Worker 上直接进行远程 KMS 阻塞调用；必须使用经评审的短生命周期本地 Key Handle/异步刷新边界，或先批准 Async Port 演进。

## 6. Resource And Quota Enforcement

Admission 在 Allocation 前按 Tenant/Platform Policy 校验 Limit。只有 `sandbox_provider_readiness` 证明 Enforcement 已生效，`SandboxSession` 才能进入 Running。限制覆盖 CPU、Memory、Disk、IO、PID、Timeout、Workspace Size、Log/Terminal Size、Network、Port Count 与 Optional GPU。

Usage 在 Provider Boundary 测量，并由 Control Plane 聚合。Sandbox 输出 Immutable Usage Fact 与 Quota Outcome；Commerce 拥有 Price、Invoice 与 Payment。超过 Hard Limit 必须产生受控 Operation/Session Outcome，不能用改变 Tool Semantics 的静默 Throttling 替代。

## 7. Observability Model

| Data Class | Purpose | Minimum Correlation | Sensitive-content Rule |
| --- | --- | --- | --- |
| Operational Log | 诊断 Sandbox Control/Sandbox Provider 行为 | `traceId`、Component、`sandboxOperationId`、`sandboxProviderId`；存在时附授权后的业务 ID | Structured/Redacted；禁止 Secret Value、`SandboxProviderAllocationRef` 与完整 Private Payload。 |
| Terminal Stream | 用户可见 Process IO | `sandboxSessionId`、Command、Stream Sequence | Access-controlled、Bounded、独立 Retention。 |
| Domain Event | State Transition / Integration Fact | Event ID、Type/Version、Occurred Time、Tenant、Trace、Aggregate ID | Versioned Schema，Data 最小化。 |
| Audit Event | Security/Destructive/Operator Fact | Actor、Policy、Target、Decision、Trace | Production Append-oriented、Tamper-resistant。 |
| Metric | Capacity、Latency、Error、Saturation | Provider/Deployment/Runtime Label，低 Cardinality | 禁止 Raw Path、Command、Key、User Content 与 Secret-bearing ID。 |
| Trace | End-to-end Operation Timing | W3C Trace Context 与 Operation Identity | Attribute Allowlist 与 Redaction。 |

未来 Metric Family 至少覆盖 Admission、Allocate/Start/Stop/Destroy Latency、Pool Hit/Miss/Sanitize Failure、Active `SandboxSession`/Sandbox、Quota Rejection、Command Duration/Exit Class、Provider Error/Health、Resource Saturation、Workspace Attachment/Snapshot IO、Recovery Outcome、Event/Log Backpressure 与 Security Policy Denial。

## 8. Event And Audit

对外使用前，Event 必须在 `apis/async/` 形成 Machine Authority。Standard Envelope 包含 Stable Event ID、Type、Version、Occurred Time、Tenant/Organization Context（适用时）、Trace ID、Aggregate Type/ID 与 Typed Data。At-least-once Delivery 需要 Idempotent Consumer，以及对 State-coupled Event 使用 Outbox 或等价 Durable Handoff。

Security Audit 覆盖 Sandbox Provider Selection/Assurance、Policy Change、Secret Injection/Revocation、Destructive Workspace/Snapshot、Port Exposure、Elevated Capability Grant、Quota Override、Node Enrollment、Recovery Takeover 与 Pool Sanitization Failure。

## 9. Provider Conformance

每个 Sandbox Provider 最终都必须通过共同 Lifecycle/Capability Test 和 Sandbox Provider-specific Security Test。Local 与 Firecracker 使用同一候选 `SandboxCommandExecutor` Contract；Common Conformance 包括 Idempotent Lifecycle、Invalid Transition、Workspace Containment、No-shell Argv、Descendant Cleanup、Network Denial、Resource Enforcement、Terminal Cancellation、Output Bound、Stale Fencing、Secret Redaction、Event Ordering、Failure Cleanup 与 Unsupported Capability Reporting。

功能测试通过不足以声明 Assurance Level。每次 Release 都要记录 Provider/Runtime Version、Host Prerequisite、Kernel/RuntimeClass Config、Known Limitation，以及该 Profile 能/不能缓解的 Threat Scenario。
