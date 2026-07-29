# ADR-20260729: Sandbox Command Execution And Terminal Boundary

Status: proposed

Requirement: REQ-2026-0007

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `MODULE_SPEC.md`, `COMPONENT_SPEC.md`, `SECURITY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `PERFORMANCE_SPEC.md`, `RUST_CODE_SPEC.md`, `TEST_SPEC.md`

## Context

当前 `SandboxProvider` 只定义 Allocate、Start、Stop 与 Destroy。它足以证明 `SandboxSession` Lifecycle，但不能执行 Agent 工具、Build 或 Terminal Command。把 `exec` 分别添加到 Local 和 Firecracker 私有接口会产生两套输入、输出、错误、Fencing、Limit 与 Redaction 语义，并迫使 Kernel 或 Service 按 Sandbox Provider 类型分支。

Command Execution 也不应无限扩张生命周期端口。Filesystem、Terminal、Browser、Port、Snapshot 与未来 GPU 的演进速度和支持矩阵不同；把所有可选能力塞进一个 Trait 会迫使 Provider 实现无意义的方法，并削弱 Descriptor 的可验证性。

## Decision

1. 保持 `SandboxProvider` 为 Provider Lifecycle Port；新增候选独立端口 `SandboxCommandExecutor`，通过同一 `SandboxProviderId` 在 Composition/Registry 绑定。
2. `RuntimeCapability::Terminal` 代表第一版有界非交互 Command Execution。只有 Lifecycle Provider、Command Executor 和对应 Common Conformance 全部存在时，Descriptor 才能声明该 Capability。
3. 公共候选类型使用 `SandboxCommandExecutionRequest`、`SandboxCommandLimits`、`SandboxCommandExecutionResult`、`SandboxCommandExitStatus` 与类型化 `SandboxCommandExecutionError`。存在歧义的字段和变量全部使用 `sandbox_*` 前缀。
4. 请求保留 `TenantId`、`SandboxWorkspaceId`、`SandboxSessionId`、`SandboxId`、`SandboxRuntimeBindingId`、`SandboxFencingToken` 与共享 `OperationId`。Command Operation 字段使用 `sandbox_command_operation_id`，不创建重复的 `SandboxOperationId`。
5. 第一版只接受 Typed Executable + Bounded Argv + Logical Relative Working Directory。Shell String、Implicit Shell、PTY、Network、Browser、Port、Secret Value 和任意 Host Root 不进入本契约。
6. stdout/stderr 以有界 Byte Buffer 表达，并分别报告 Truncated；Result 不把非 UTF-8 强制转换为有损 String。Terminal Streaming/Replay 在后续独立 Requirement 中定义，不能用无界 Channel 代替。
7. Command Executor 在启动副作用前验证 Workspace Attachment、Provider Readiness、Policy、当前 Lease/Fencing 与幂等 Request Fingerprint。Stale Token、Operation Conflict 或 Capability 缺失均在启动前关闭失败。
8. Timeout、Cancellation、Output Hard Limit、Lease Lost 和 Provider Shutdown 使用同一个有界 Descendant Cleanup Contract。Provider-specific Cleanup Mechanism 由 Adapter 实现并通过 Common + Platform-specific Conformance 证明。
9. Command、Argument、Environment Value、Logical/Physical Path、Output、Host PID、API Socket、microVM Identity 与 `SandboxProviderAllocationRef` 不进入 Metric Label 或普通 Operational Log。Trace 只记录安全 Operation/Provider/Outcome/Duration 属性。
10. Service/Registry 通过端口存在性与 Descriptor Capability 交叉校验：声明 Terminal 但没有 Executor、或注册 Executor 但 Provider Identity 不匹配时，Provider 保持 Unavailable。
11. 本 ADR 不批准 Interactive PTY、Shell Capability、Secret Injection、Network、Browser、Port Forward、Docker Provider、HTTP/RPC、SDK 或 Deployment Profile。

## Alternatives

### 直接扩展 `SandboxProvider` 加入所有能力方法

拒绝。它违反接口隔离，并让每个 Provider 为不支持能力维护占位实现；新增能力会持续扩大公共 Trait 的破坏面。

### Local 与 Firecracker 各自公开 `exec`

拒绝。它会让 Kernel、Service、Error Mapping 和 Conformance 感知具体 Sandbox Provider，破坏 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox` 的稳定依赖语义。

### 接受单个 Shell Command String

拒绝。Shell Parsing、Quoting、Expansion 与 Injection 语义跨平台不一致。第一版使用 Executable + Argv；Shell 需要独立 Capability 与 Policy Grant。

### 把 stdout/stderr 只作为 UTF-8 String

拒绝。Build Tool 和子进程可能输出任意字节；强制解码会丢失数据或制造不一致的截断边界。

## Consequences

收益：Local 与 Firecracker 共享同一 Command、Limit、Fencing、Error 和 Conformance；生命周期端口保持高内聚；未来 PTY、Filesystem、Network 等能力可按独立端口扩展，不修改 Kernel Provider 分支。

成本：Composition 必须验证成对端口和 Provider Identity；Command 幂等结果需要有界保留；每个 Provider 仍需实现并证明平台特定 Descendant Cleanup。

## Verification

- Contract Test 验证请求字段、Bound、Byte Output、Error Taxonomy、Debug Redaction 与 `sandbox_*` Naming。
- Registry/Service Test 验证 Terminal Descriptor 与 Executor 端口的一致性并关闭失败。
- Common Conformance 运行在 Local 和 Firecracker，覆盖 Argv、No-shell、Timeout、Cancellation、Output Limit、Working-directory Escape、Environment Deny、Stale Fencing、Idempotency 与 Cleanup。
- 实际 Local Host 与 Linux KVM Firecracker Smoke 必须执行同一命令场景；Fake Executor 只用于 Service Unit Test。
- 公共命名、Error Contract、Provider Security Posture 与跨仓库 Kernel Integration 在实现前完成人工评审。

## Supersedes / Superseded By

Supersedes: none.

Superseded by: none.

