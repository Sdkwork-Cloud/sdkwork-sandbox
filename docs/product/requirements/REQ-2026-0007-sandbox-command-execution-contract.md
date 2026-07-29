---
id: REQ-2026-0007
title: Deliver the provider-neutral Sandbox command execution contract
owner: SDKWork Runtime Platform
status: draft
priority: critical
source: platform
problem: Local and Firecracker execution cannot be completed through the lifecycle-only SandboxProvider port, and provider-specific command APIs would split Runtime semantics and force Kernel behavior branches.
goals:
  - Define one bounded, typed Sandbox command execution contract shared by Local and Firecracker Providers.
  - Preserve Sandbox Session, Runtime Binding, Workspace, Provider, and Fencing ownership on every command.
  - Prove timeout, cancellation, output bounds, environment minimization, cleanup, and unsupported-capability behavior through common conformance tests.
non_goals:
  - Implement an implicit shell, interactive PTY, Browser, Port Forward, Network, Secret resolver, Scheduler, HTTP route, SDK, or Docker Provider.
  - Expose physical Workspace paths, Provider allocation references, host process ids, API sockets, or microVM identities.
  - Change Agent tool selection, MCP semantics, AgentSession, or AgentWorkspace ownership.
users:
  - SDKWork Kernel integrators
  - Local and Firecracker Sandbox Provider maintainers
  - SDKWork developers executing bounded build and tool commands
affected_surfaces:
  - rust-components
  - composition
  - security
  - observability
---

# REQ-2026-0007: 交付 Provider-neutral Sandbox Command Execution Contract

## Readiness Blockers

本需求在以下决策完成人工评审前保持 `draft`：

- 接受 `SandboxCommandExecutor` 独立端口以及候选 `SandboxCommandExecution*` 公共类型命名。
- 接受 `SandboxProvider` 继续只拥有生命周期，Command Execution 通过同一 `sandbox_provider_id` 组合，而不是向生命周期 Trait 填入所有能力方法。
- 接受 Local Provider 的 HostUser 边界与 Firecracker Provider 的 MicroVm 边界；共同契约不能把较弱 Provider 的限制静默提升为较强保证。
- 明确第一版只交付非交互 Executable + Argv；PTY、Shell、Network、Browser、Port 和 Secret Injection 分别使用后续 Ready Requirement。

## Candidate Acceptance Criteria

- 新端口候选名为 `SandboxCommandExecutor`；实现必须绑定一个已注册的 `SandboxProviderId`。Provider Descriptor 只有在同一 Provider 已注册并通过执行端口 Conformance 时才能声明 `RuntimeCapability::Terminal`。
- 请求候选类型为 `SandboxCommandExecutionRequest`，至少携带 `tenant_id`、`sandbox_workspace_id`、`sandbox_session_id`、`sandbox_id`、`sandbox_runtime_binding_id`、`sandbox_fencing_token`、`sandbox_command_operation_id`、`sandbox_executable`、`sandbox_arguments`、`sandbox_working_directory`、`sandbox_environment` 与 `sandbox_command_limits`。
- 所有存在领域歧义的字段和局部变量使用 `sandbox_*` 前缀；共享 `TenantId`、`OperationId` 与 `RuntimeCapability` 不创建重复 `Sandbox*` 类型别名。
- `sandbox_executable` 是经过 Policy/Provider 校验的单一 Executable；`sandbox_arguments` 是有界 Argv。第一版不经过 Shell 解析，不接受命令行字符串，也不提供自动 Shell 回退。
- `sandbox_working_directory` 只接受 Workspace Attachment 内的 Logical Relative Path。公共请求、结果、错误、Debug、Log、Event 与 Metric 不包含物理 Host Path 或 `SandboxProviderAllocationRef`。
- `sandbox_environment` 只接受长度、名称和值均有界的非 Secret 项，并由 Provider 以 Allowlist 构造最终环境；默认不继承 Ambient Credential、SSH Agent、Cloud Credential、Proxy Credential、Docker Socket 或其他 Secret-bearing 变量。
- `sandbox_command_limits` 明确包含非零 Timeout、stdout/stderr Byte Limit 与 Provider 可执行的资源边界。达到 Timeout、Cancellation 或 Output Hard Limit 后，Provider 必须有界终止整个 Sandbox Command Descendant Tree。
- 结果候选类型 `SandboxCommandExecutionResult` 返回结构化 Exit Status、stdout/stderr 有界字节、截断标志、开始/结束时间与安全的资源用量；不得假定输出是 UTF-8，也不得包含 Host PID 或 Provider-private Identity。
- Command 开始前验证当前 `sandbox_fencing_token`；执行期间检测到 Lease/Fencing 失效时停止接收新输入并触发有界 Cleanup。低于 Provider 已观察 Token 的请求确定性关闭失败。
- 重复 `sandbox_command_operation_id` 使用明确幂等语义：同一请求可重放已完成结果，不同请求指纹产生 Conflict；不得重复启动第二个进程或 microVM Guest Command。
- Error Taxonomy 区分 Invalid Request、Unsupported Capability、Policy Denied、Stale Fencing、Timeout、Cancelled、Output Limit、Resource Exhausted、Provider Unavailable 与 Internal Failure；外部安全消息不泄露 Host、Repository、API Socket、Jailer、KVM 或 Secret 细节。
- Common Conformance 同一套运行在 Local 与 Firecracker Adapter，至少覆盖无 Shell、Argv 保真、Working-directory Escape、Environment Deny、Timeout、Cancellation、Output Bound、Descendant Cleanup、Stale Fencing、Idempotency 与 Private Metadata Redaction。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | 所有执行必须先通过 Workspace Attachment、Policy、Capability、Lease/Fencing 与 Provider Readiness；任一保证不可证明时关闭失败。 |
| Privacy | Command Output 与 Terminal Stream 是独立敏感数据类别；结果有界、访问受控，并禁止写入普通 Operational Log。 |
| Performance | 请求和输出内存与配置的 Byte Limit 成正比；不得建立无界 Pipe、Buffer、Replay 或全量目录预扫描。 |
| Reliability | Timeout、Cancel、Lease Lost 与 Provider Failure 都必须收敛到有界 Descendant Cleanup，并输出可重试性明确的结构化结果。 |
| Observability | Metric 只使用稳定、低基数 Provider/Outcome/Capability Label；Trace/Log 关联 Sandbox Identity，但不记录 Raw Command、Argument、Path、Output 或 Environment Value。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `SECURITY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `PERFORMANCE_SPEC.md`, `RUST_CODE_SPEC.md`, `TEST_SPEC.md`.

Components: `crates/sdkwork-sandbox-provider-spi`, `crates/sdkwork-intelligence-sandbox-service`, `crates/sdkwork-sandbox-provider-local`, and the proposed Firecracker Sandbox Provider component.

Decisions: [ADR-20260729: Sandbox Command Execution And Terminal Boundary](../../architecture/decisions/ADR-20260729-sandbox-command-execution-and-terminal-boundary.md), [ADR-20260728: Local Provider Assurance And Host Boundaries](../../architecture/decisions/ADR-20260728-local-provider-assurance-and-host-boundaries.md), and [ADR-20260729: Firecracker Provider Isolation And Node Boundaries](../../architecture/decisions/ADR-20260729-firecracker-provider-isolation-and-node-boundaries.md).

## Verification Plan

```bash
cargo fmt --all -- --check
cargo test -p sdkwork-sandbox-provider-spi
cargo test -p sdkwork-intelligence-sandbox-service
cargo test -p sdkwork-sandbox-provider-local
cargo test --workspace
cargo clippy --workspace --all-targets -- -D warnings
node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
node ../sdkwork-specs/tools/check-identity-naming.mjs --root .
```

Provider-specific real Host/KVM commands and security suites are additional mandatory evidence; a Fake Executor is not release evidence.

