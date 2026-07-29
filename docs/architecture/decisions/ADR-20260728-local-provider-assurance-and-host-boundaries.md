# ADR-20260728: Local Provider Assurance And Host Boundaries

Status: proposed

Requirement: REQ-2026-0003

Owner: SDKWork Runtime Platform

Date: 2026-07-28

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `SECURITY_SPEC.md`, `RUNTIME_DIRECTORY_SPEC.md`, `CONFIG_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `RUST_CODE_SPEC.md`, `TEST_SPEC.md`

## Context

Standalone developers need low-latency execution without requiring a remote control plane. A Local Provider is useful for that workflow but cannot isolate untrusted workloads more strongly than the current OS account and the host capabilities deliberately granted to the process. Treating it as equivalent to Container、gVisor、microVM 或 Dedicated VM 会形成错误安全承诺。

Local execution also exposes platform-specific hazards：Windows Reparse Point/Device Path/Alternate Data Stream、Unix Symlink/Mount、Shell Parsing、Ambient Credential、Descendant Process、Unbounded Output 和不可验证 Network Egress。Provider Capability 必须反映实际可执行保证，而不是产品愿望。

## Decision

1. Local Provider 固定声明 Kind `local`、Assurance `HostUser` 和 Target `standalone`。它不得通过配置提升为更高 Assurance，也不得被 Scheduler 用于不可信多租户 Workload。
2. Local Adapter 只实现已验证的 Capability。首个版本在 Network/Egress、Browser 和 Port Isolation 可证明前不声明这些 Capability；Service 的 Minimum Assurance/Capability 选择继续故障关闭。
3. Runtime Data Root 由 L5 Composition 按 `RUNTIME_DIRECTORY_SPEC.md` 解析，并以 Capability Directory Handle 注入。Adapter 不在业务方法中读取 Environment，也不把 Source Checkout `.sdkwork/` 当 Runtime Root。
4. `AgentWorkspace` Creation/Persistence 由 `sdkwork-agents` 拥有。Local Provider 只消费经授权的 Sandbox Workspace Attachment Capability；Allocation Destroy、`SandboxSession` Destroy 和 Process Cleanup 不删除 Persistent Workspace。
5. 公共操作只携带 Logical Relative Path 和 Opaque ID。Physical Root/Host Path/Provider Reference 是 Private Metadata，不进入 Error、Event、Metric、CLI 默认输出或 SDK Type。
6. Filesystem 实现优先使用经过验证的 Capability-based Directory Library。每级目录访问拒绝 Symlink/Reparse；Windows 额外拒绝 Drive/UNC/Device Prefix、Reserved Device Name 和 Alternate Data Stream；无法证明的文件类型默认拒绝。
7. Process API 使用 Typed Executable、Argv、Working Directory、Environment Reference、Timeout、Output Limit 和 Cancellation。默认不调用 Shell；需要 Shell 语义时必须声明独立 Capability 与 Policy Grant。
8. Process Supervision 必须对整个 Descendant Tree 生效：Windows 使用经过验证的 Job Object 等价机制，Unix 使用经过验证的 Process Group/Session 以及部署可用时的 Cgroup。若一个平台无法满足 Cleanup Contract，该平台不得声明 Terminal Capability。
9. Output Buffer、Terminal Replay、Directory List/Search 和 File IO 都必须有界。达到 Hard Limit 返回结构化 Outcome，并触发 Cleanup；不能继续在后台产生无界数据。
10. Host Environment 使用 Allowlist 构造，不继承 Ambient Credential、SSH Agent、Cloud Credential、Docker Socket 或 Secret-bearing Variables。Secret Value 通过独立短期 Reference Resolver 注入并执行 Redaction/Revocation。
11. Local Provider 的限制必须进入 Component README、Provider Descriptor、CLI Inspection 和 Release Evidence；功能测试通过不等于隔离认证。

## Alternatives

### 直接包装 `std::process::Command` 和绝对 Workspace Path

拒绝。它缺少 Capability Root、Process Tree Cleanup、Output Bound 和 Private Path Boundary，且容易继承宿主机全部 Environment。

### 把 Local Provider 标记为 Container Assurance

拒绝。当前 OS User 下的普通 Host Process 不形成 Container Namespace、Syscall 或 Kernel 隔离。

### 自动回退到不受限 Shell/Network

拒绝。Unsupported Capability 必须显式失败；便利性不能改变请求的安全语义。

### Destroy Session 时递归删除 Workspace

拒绝。Workspace 是独立持久身份，删除需要单独授权、Retention、Snapshot 和 Audit 决策。

## Consequences

收益：Local 模式的保证可理解、可机器发现，并与 Lifecycle Service 的 Fail-closed Selection 一致；后续 Docker/microVM Provider 不需要兼容 Local 的隐式 Host 权限。

成本：跨平台 Process Tree、Filesystem Link/Reparse 和 Resource Limit 需要平台专项实现与测试；在这些保证完成前，Local Provider 只能逐项开放 Capability，不能一次性声称完整 Terminal/Filesystem/Network 产品能力。

## Verification

- Requirement Readiness Checklist 必须先关闭 Workspace Attachment 和 Process Supervisor 选型。
- Provider Conformance 覆盖 Lifecycle Idempotency、Unsupported Capability、Path Escape、Process Cleanup、Timeout、Cancellation、Output Bound、Environment Deny 和 Private Path Redaction。
- Windows、macOS、Linux 分别记录可执行 Test；平台不支持的 Enforcement 必须反映在 Descriptor，而不是跳过失败测试后继续声明 Capability。
- 人工安全评审必须确认 Threat Boundary、Known Limitation 和 Release Copy，之后才能将 ADR 改为 `accepted` 并开始真实 Host Access Implementation。

## Supersedes / Superseded By

Supersedes: none.

Superseded by: none.
