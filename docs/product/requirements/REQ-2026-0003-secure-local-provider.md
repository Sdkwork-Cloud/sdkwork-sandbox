---
id: REQ-2026-0003
title: Deliver a constrained local sandbox provider
owner: SDKWork Runtime Platform
status: draft
source: platform
problem: Local development needs executable Sandbox capabilities, but an unrestricted host process adapter would bypass workspace containment, cleanup, resource, credential, and network policy.
goals:
  - Provide an honest HostUser-assurance provider for single-user standalone development.
  - Enforce capability-rooted workspace access and bounded process execution on Windows, macOS, and Linux.
  - Make unsupported isolation and network guarantees machine-discoverable and fail closed.
non_goals:
  - Claim hardened multi-tenant, container, user-space-kernel, microVM, or dedicated-VM isolation.
  - Provide Docker, Firecracker, gVisor, Kubernetes, Remote VM, Browser, or unrestricted network execution.
  - Delete persistent workspaces when a Session or Sandbox allocation is destroyed.
users:
  - SDKWork developers using standalone local mode
  - Sandbox provider maintainers
  - SDKWork Kernel integrators
affected_surfaces:
  - rust-components
  - composition
  - tooling
---

# REQ-2026-0003: 交付受约束的 Local Sandbox Provider

## Readiness Blockers

本需求尚未 Ready，必须先完成以下评审和契约：

- 人工接受 `ADR-20260728-sandbox-lifecycle-provider-spi-and-memory-store` 的 `0.1` 公共命名。
- 人工安全评审并接受 [Local Provider Assurance ADR](../../architecture/decisions/ADR-20260728-local-provider-assurance-and-host-boundaries.md)。
- 接受 Agents Workspace 与 Sandbox Attachment ADR；Local Provider 不得根据 `sandbox_workspace_id` 猜测 Host Path。
- 选定能够在 Windows、macOS 和 Linux 提供进程树终止的经过验证的 Process Supervision 机制；如果跨平台保证不同，必须拆分并声明 Provider Capability。

## Candidate Acceptance Criteria

- Provider Descriptor 固定报告 Kind `local` 和 Assurance `HostUser`，拒绝 `Container` 或更高 Minimum Assurance。
- L5 Composition 只向 Adapter 注入已经打开的 Data/Workspace Capability Handle；Adapter 不读取全局环境变量，也不接收任意 Host Root String 作为每次请求输入。
- Workspace Attachment 来自经授权的 Sandbox Attachment Port/Capability，关联 `sandbox_workspace_id` 并包含 Provider-private Reference；`SandboxSession`/Allocation Destroy 不删除 Agents-owned Workspace。
- Filesystem API 只接受 Logical Relative Path，拒绝 Absolute、Parent Traversal、Symlink/Reparse Escape、Mount Escape、Device Path、Alternate Data Stream 和不支持的 Normalization。
- Terminal/Process 默认使用 Executable+Argv，不经 Shell 解析；Shell 必须是显式 Capability 和 Policy Grant。
- Process 执行限制 Working Directory、Environment、Timeout、Output Bytes、PID/Descendant、CPU/Memory（平台支持时）和 Cancellation；Stop/Destroy 有界终止全部 Descendant。
- 未实现可验证 Egress Enforcement 前不声明 Network、Browser 或 Port Forward Capability；DNS 可解析不视为 Network Grant。
- Secret 只通过短期 Reference 注入，Value 不进入 Command Debug、Environment Dump、Log、Event、Metric、Workspace Metadata 或 Durable Terminal Replay。
- Allocation/Start/Stop/Destroy、Filesystem 和 Terminal 通过共同 Provider Conformance；Windows 与 Unix 分别覆盖适用的 Link/Reparse 和 Process-tree Test。
- CLI 的破坏性操作要求显式目标和确认策略，输出不显示 Private Host Path 或 Secret。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | Local 只承诺当前 OS User 边界；能力未实现或策略无法证明时拒绝请求。 |
| Privacy | Host Path 和 Terminal 内容保持私有、访问受控、有界并使用独立 Retention。 |
| Performance | Output/Filesystem/List 均有上限；不能用全量目录或无界 Buffer 实现交互操作。 |
| Reliability | Stop/Destroy 幂等；Process Tree Cleanup 和残留 Allocation 扫描有故障注入证据。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `SECURITY_SPEC.md`, `RUNTIME_DIRECTORY_SPEC.md`, `CONFIG_SPEC.md`, `RUST_CODE_SPEC.md`, `TEST_SPEC.md`.

Components: `crates/sdkwork-sandbox-provider-local`, `crates/sdkwork-sandbox-service-host`, `crates/sdkwork-sandbox-cli`, plus a future reviewed Sandbox Workspace Attachment adapter; `sdkwork-agents` remains the `AgentWorkspace` owner.

Decision: [ADR-20260728: Local Provider Assurance And Host Boundaries](../../architecture/decisions/ADR-20260728-local-provider-assurance-and-host-boundaries.md).

## Gate 0 Progress

2026-07-29 已在 `sdkwork-sandbox-provider-local` 增加仅 `#[cfg(test)]` 编译的 Fake Host Boundary，5 个测试覆盖 Logical Relative Path 逃逸/Windows 设备路径、Typed Argv 无 Shell 解析、Executable/Environment Allowlist、参数与环境边界。Executable 语法校验先于 Allowlist，显式 Allowlist 不能放行 Command String 或 Path；Executable、Argument、Working Directory 与 Environment 的七项上限由 Rust Test 直接读取 `apis/commands/sandbox-command-contract.json` 交叉校验，防止 Provider Harness 与共享契约漂移。仓库级 `specs/sandbox-provider-delivery-gates.contract.json` 同时固定 Local Kind `local`、Assurance `HostUser`、standalone 范围、平台监督证据、默认拒绝 Network/Browser/Port Forward 和禁止 Assurance 提升，并保持 `implementationAuthorized: false`。该 Harness 与机器契约均不访问 Host Filesystem、不启动进程、不导出 Provider Port，也不构成真实平台能力证据；本需求仍保持 `draft`，等待人工架构/安全评审和真实平台 Runner 证据。

同日 Gate 0 供应链评估将 `process-wrap 9.1.0` 作为 Windows suspended Job Object/POSIX Process Group 条件候选、`cap-std 4.0.2` 作为 Capability Directory 条件候选，并拒绝直接采用 `cgroups-rs 0.5.1` 作为现成安全保证。候选依赖图在 Windows/Rust 1.92 完成锁定、编译、License Metadata 和离线 RustSec 扫描，但 `cap-std` MSRV、Fresh Online Advisory、Linux Compile、race-free cgroup attach、真实 Runner 与人工 Dependency/Security Review 均未关闭；具体证据与平台测试矩阵见 [Local Provider Architecture And Security Review](../../engineering/reviews/REVIEW-20260729-local-provider-architecture-security.md)。

## Verification Plan

Implementation verification will include focused provider tests, cross-platform path/process tests, Provider Conformance, Cargo/Clippy, strict component binding, security review evidence, and a manual limitation review. Exact commands will be frozen when the Requirement becomes `ready`.
