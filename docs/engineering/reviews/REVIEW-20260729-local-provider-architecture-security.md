# REVIEW-20260729: Local Sandbox Provider Architecture And Security

Status: pending-human-review

Requirement: [REQ-2026-0003](../../product/requirements/REQ-2026-0003-secure-local-provider.md)

Decision: [ADR-20260728](../../architecture/decisions/ADR-20260728-local-provider-assurance-and-host-boundaries.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - Host filesystem/process access, public Provider assurance, cross-platform cleanup, Workspace ownership, and credential exposure.

## Scope And Inputs

本 Review 请求人工评审 Local Provider 的 `HostUser` Assurance、授权 Workspace Attachment、Capability-rooted Filesystem、跨平台 Process Supervision、Environment Deny、Capability Declaration 与 Cleanup Boundary。评审同时依赖 Lifecycle Provider SPI ADR、Agents Workspace Attachment ADR、Sandbox Command Execution Review、`SECURITY_SPEC.md`、`RUNTIME_DIRECTORY_SPEC.md`、`CONFIG_SPEC.md`、`RUST_CODE_SPEC.md` 与 `TEST_SPEC.md`。

Local 只面向 Single-user Standalone Development，不承载不可信多租户 SaaS Workload。Docker Provider 不在范围内，也不能作为 Local 隔离或测试回退。

## Candidate Machine Contract Evidence

- `specs/sandbox-provider-delivery-gates.contract.json` fixes Local Kind `local`, Assurance `HostUser`, standalone scope, fail-closed capability policy, platform-specific supervision evidence, forbidden assurance claims and forbidden weak fallbacks; `implementationAuthorized` remains `false`.
- `node --test tests/contract/provider-delivery-gate.contract.test.mjs` passes 7/7 and proves the Local component still has no public ports, Host IO or process spawn while the review remains pending.
- This evidence makes LOCAL-01..LOCAL-08 machine-reviewable but does not replace Windows/macOS/Linux real Host runner, filesystem race, descendant cleanup, credential isolation or supply-chain evidence.

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| LOCAL-01 | Kind 固定为 `local`，Assurance 固定为 `HostUser`，配置不能提升为 Container/MicroVm。 | Descriptor 诚实表达 Host 边界。 | 必须选择不同 Provider/Assurance；禁止实现中伪装提升。 |
| LOCAL-02 | Adapter 只消费 Composition 打开的 Runtime/Workspace Capability Handle；不得从 `sandbox_workspace_id` 推导 Host Path，也不得按请求接受任意 Host Root。 | Workspace Authority 保持在 Agents/Attachment Boundary。 | 在替代授权模型获批前停止 Host Access。 |
| LOCAL-03 | 第一版 Terminal 只在 Windows Job Object 与 Linux delegated cgroup v2 的真实 Descendant Cleanup Conformance 通过后声明；macOS 在获得能阻止/回收 detached descendant 的审计机制前不声明 Terminal。 | 先交付可证明的平台能力，不把 Process Group 当作完整 Tree Guarantee。 | Reviewer 必须指定并批准等价 macOS Supervisor，或明确要求三平台全部就绪后再开始 Local Terminal。 |
| LOCAL-04 | Filesystem 采用 Handle-relative、逐级 No-follow/Reparse 检查；Linux 优先 `openat2` Resolve Policy，Unix Fallback 逐级 `openat`/`O_NOFOLLOW`，Windows 使用 Handle/Reparse/Final-path/File-identity 检查。无法证明的平台不声明 Filesystem。 | 避免 String Canonicalization 与 TOCTOU 被当作安全边界。 | 在替代 Capability Library/OS Primitive 及 Escape Test 获批前停止 Filesystem 实现。 |
| LOCAL-05 | Command 只使用已批准的 `SandboxCommandExecutor`，Executable + Argv、Logical Relative Working Directory、Bounded Output/Timeout/Cancellation，不隐式使用 Shell。 | Local 与 Firecracker 共享语义。 | 不得增加 Local-private Command DTO 或 Shell Wrapper。 |
| LOCAL-06 | Final Environment 从 Allowlist 构造，不继承 Ambient Credential、SSH Agent、Cloud Credential、Proxy Credential、Docker Socket 或 Secret-bearing Variable。 | 降低 Host Credential 暴露。 | 在等价 Secret Isolation 证明前不声明 Terminal。 |
| LOCAL-07 | Network、Browser、Port Forward 与 Shell 默认不声明；不支持的 Minimum Assurance/Capability 请求失败关闭。 | 不产生静默弱化或不受限 Egress。 | 需要独立 Ready Requirement、Policy 与平台证据。 |
| LOCAL-08 | Stop/Destroy 幂等回收 Process/Temporary Allocation/Attachment，但不删除 Agents-owned Persistent Workspace。 | 保持 Workspace 业务所有权与破坏性操作边界。 | 必须修改 Workspace Ownership ADR 并进行跨仓库人工评审。 |

## Pre-review Blocking Findings

1. Lifecycle Provider SPI 与 Agents Workspace Attachment ADR 仍为 `proposed`；Local 不能在其公共命名和 Ownership 未接受时进入真实 Host 实现。
2. `SandboxCommandExecutor` 尚待 [Command Architecture/Security Review](REVIEW-20260729-sandbox-command-execution-architecture-security.md)。
3. Windows Job Object、Linux cgroup v2 与 Filesystem OS Primitive 的具体 Rust Dependency、Version、License、Advisory 和最低 Rust Version 尚未形成供应链记录。
4. macOS 普通 Process Group/Session 不能阻止子进程自行创建新 Session；在等价机制获批前声明 Terminal 会违反 Descendant Cleanup Acceptance Criterion。
5. Windows、Linux 与未来 macOS Real Host Runner Owner 尚未记录。没有真实平台证据时不得把 Mock/Fake Test 作为 Capability Evidence。

推荐选择 LOCAL-03 的渐进式 Capability：先验证 Windows 与 Linux；macOS Descriptor 不声明 Terminal，而不是跳过失败测试后继续宣称跨平台支持。该选择会收窄 REQ-2026-0003 的首版目标，必须由 Product/Architecture Owner 明确接受并更新 Requirement。

## Required Evidence Before Ready

- Gate 0 Fake Host Boundary 已有 5 个纯数据负向测试，覆盖 Logical Relative Path、Windows 设备路径、Executable/Environment Allowlist、Typed Argv 与请求边界；这些测试不访问 Host、不启动进程，不替代以下真实平台证据。
- 接受 Lifecycle、Workspace Attachment、Command Execution 与本 ADR 的人工记录。
- Dependency/Supply-chain Record：Capability Filesystem、Windows API、Unix/Linux Process/Cgroup 使用的精确 Crate/Version/License/Advisory/MSRV。
- Windows Job Object 与 Linux cgroup v2 Preflight、Kill-on-close/Delegation、Timeout、Cancel、Detached Child、Output Limit 与 Residue Test Design。
- Windows Reparse/Device/ADS 与 Unix Symlink/Mount/Rename Race Negative Test Design。
- Provider Descriptor/CLI Known Limitation Copy，明确 `HostUser` 不是多租户隔离。

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`。当前五项 Pre-review Finding 未关闭前，不得使用 `Approved with follow-up` 隐藏安全或 Requirement Scope 缺口。

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Product/architecture owner | pending | pending | pending | LOCAL-01..LOCAL-08, macOS scope |
| Security owner | pending | pending | pending | LOCAL-02..LOCAL-07 |
| Workspace/Kernel owner | pending | pending | pending | LOCAL-02, LOCAL-05, LOCAL-08 |
| Platform operations owner | pending | pending | pending | real Host runner and supervisor ownership |

## Implementation Gate

当前推荐人工 Outcome 为 `Changes requested`，直到 Reviewer 明确接受平台切片并关闭 Dependency/Runner Blocker。REQ-2026-0003 保持 `draft`、ADR 保持 `proposed`；禁止真实 Host Command、Filesystem Mutation、Secret Injection 或发布 Composition。
