# REVIEW-20260729: Firecracker Sandbox Provider Architecture And Security

Status: pending-human-review

Requirement: [REQ-2026-0008](../../product/requirements/REQ-2026-0008-firecracker-sandbox-provider.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-firecracker-provider-isolation-and-node-boundaries.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - multi-tenant isolation claim, privileged Host boundary, KVM/Jailer, network/workspace isolation, artifact supply chain, and production operations.

## Scope And Inputs

本 Review 请求人工评审 Firecracker Provider 的公共命名、`MicroVm` Assurance、Linux KVM Target、Host Isolation Broker/Jailer、Artifact Integrity、Guest Block Device Workspace、private Vsock、cgroup v2、Network Namespace、Fencing State、Cleanup 与第一版 Capability Exclusion。评审输入包括 REQ-2026-0008、对应 ADR、Command Execution Review、Workspace Attachment ADR、Provider Delivery Plan、`SECURITY_SPEC.md`、`DEPLOYMENT_SPEC.md`、`RUNTIME_DIRECTORY_SPEC.md`、`OBSERVABILITY_SPEC.md`、`PERFORMANCE_SPEC.md`、`SUPPLY_CHAIN_SECURITY_SPEC.md` 与 `TEST_SPEC.md`。

当前 Windows 环境不能产生 MicroVm Assurance Evidence。本 Review 是 Design/Gate Review，不是 Provider、KVM 或商业发布完成证明。

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| FC-01 | Component 固定为 `sdkwork-sandbox-provider-firecracker`，Kind `firecracker`，Assurance `MicroVm`；只有真实 Linux KVM Matrix 可形成 Assurance Evidence。 | 公共命名和声明边界固定。 | 更新 REQ/ADR/Component Name 后重新评审，禁止创建 Crate。 |
| FC-02 | Firecracker/Jailer/Kernel/RootFS/Guest Agent/Initrd 为固定 Version、Digest、Signature/Provenance 的兼容 Tuple；禁止 `latest`、运行时任意下载和未校验本地 Artifact。 | 供应链成为 Allocate/Start Preflight。 | 在等价不可变供应链 Authority 获批前停止实现。 |
| FC-03 | 普通 Adapter 非特权；最小 Host Isolation Broker 只接受固定结构化操作和 Opaque Identity，不接受任意 Shell/Executable/Host Path。Firecracker 以专用非特权 UID/GID、Jailer Chroot、Seccomp、最小 `/dev/kvm` 权限运行。 | 将 Host 特权限制在可审计边界。 | 不允许 Root Firecracker 或通用 Sudo Helper；需提交替代最小权限设计重审。 |
| FC-04 | 每个 `SandboxRuntimeBindingId` 独立 Runtime Directory、Jailer Root、API Socket、cgroup、netns/tap、Ephemeral Layer 和原子 Provider-private State。 | 防止跨 Binding 共享身份与残留。 | 在等价隔离与清理模型获批前停止实现。 |
| FC-05 | Authorized Workspace Attachment 映射为 Provider-private Guest Block Device；禁止从 `sandbox_workspace_id` 推导 Host Path或把 Host Directory 直接暴露给 Guest。 | 保持 Ownership、TOCTOU 与 Tenant Boundary。 | 修改 Workspace ADR 并完成跨仓库安全评审。 |
| FC-06 | Guest Control 使用一次性启动身份绑定的 private Vsock/等价 Channel；第一版只声明 Authenticated Guest Readiness，不声称 Hardware/Remote Attestation。 | 避免虚假 Attestation Claim。 | 必须定义并证明替代认证/Attestation Contract。 |
| FC-07 | 独立 Network Namespace/Tap，默认拒绝 Egress、Cloud Metadata、Host Control Plane 与 Tenant Lateral Access；第一版 Descriptor 不声明 Network。 | Network Policy 缺失时关闭失败。 | 需要独立 Ready Network Requirement 与真实 Policy Evidence。 |
| FC-08 | Provider-private State 原子保存最高 `sandbox_fencing_token`；所有 Mutating Operation 在副作用前拒绝低 Token，Provider Restart 后仍成立。 | 防止双重活动 Binding 与旧控制器副作用。 | 不得实现真实 Provider Lifecycle。 |
| FC-09 | Readiness 同时证明 VMM、Authenticated Guest、Artifact、Policy、Workspace、cgroup Limit 与 Fencing；任一失败均不可进入 Running。 | 保持 `MicroVm` Assurance 完整性。 | 必须给出更严格且可机器验证的 Readiness Contract。 |
| FC-10 | 第一版不声明 Snapshot/Restore/Warm Pool/Network/Browser/Port；Docker/Local 不作为 MicroVm 失败回退。Destroy 幂等清理全部临时资源但不删除 Agents-owned Workspace。 | 限制首版风险和防止 Assurance Downgrade。 | 新能力分别新增 Ready Requirement/ADR/Release Evidence。 |

## Pre-review Blocking Findings

1. Provider SPI、Workspace Attachment 与 Command Execution 的相关 ADR 尚未人工接受。
2. Firecracker/Jailer/Kernel/RootFS/Guest Agent 的精确 Version/Digest/Compatibility Tuple、Artifact Authority、SBOM、Provenance 与漏洞响应 Owner 尚未记录。
3. 真实 Linux KVM x86_64/aarch64 Node、Test Runner、`/dev/kvm`/cgroup v2/netns 权限与运行 Owner 未解析。
4. Host Isolation Broker 的 Protocol Schema、Privilege Model、Binary Ownership、安装/升级/审计/撤销边界尚未形成独立 Ready Requirement/ADR。
5. Workspace Block Device Provisioning、At-rest Protection、Sanitization 与 Tenant Residue Scan Owner 未解析。
6. Node Drain、VMM Crash、Residual Resource Quarantine、Artifact Rollback、Provider Outage 与 Incident Runbook 尚未交付。

这些 Finding 是 Definition of Ready 与 Release Blocker，不能作为非阻塞 Follow-up 延后。即使本 ADR 的边界被接受，REQ-2026-0008 仍必须保持 `draft`，直到上述实施前置条件形成可验证 Authority。

## Required Evidence Before Ready

- 接受 FC-01 至 FC-10 的 Architecture/Security/Operations Human Review。
- 固定 Artifact Compatibility Manifest 与 Supply-chain Evidence Location。
- Host Isolation Broker 独立 Requirement/ADR、Typed Protocol、Threat Model 与 Privilege Test Plan。
- Real KVM Node Matrix 和 Owner；Windows/WSL/Fake Test 只用于非 Assurance Contract Test。
- Common Command Conformance 与 Firecracker-specific KVM/Jailer/cgroup/netns/Vsock/Fencing/Cleanup/Tenant Residue Test Plan。
- Node Drain、Artifact Rollback、Provider Outage 与 Security Incident Runbook Owner。

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`。`Approved with follow-up` 不得用于推迟 MicroVm Assurance、Host Privilege、Artifact Integrity、Workspace/Network Isolation、Fencing、Cleanup 或真实 KVM Evidence。

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | FC-01..FC-10 |
| Security owner | pending | pending | pending | FC-02..FC-10 |
| Platform/KVM operations owner | pending | pending | pending | Node, Broker, cgroup, netns, drain |
| Supply-chain owner | pending | pending | pending | Artifact tuple, SBOM, provenance, rollback |
| Workspace/data owner | pending | pending | pending | FC-05, sanitization, residue |

## Implementation Gate

当前推荐人工 Outcome 为 `Changes requested`，直到 Pre-review Blocker 形成具体 Authority 和 Owner。REQ-2026-0008 保持 `draft`、ADR 保持 `proposed`；在批准前不创建 Firecracker Crate，不实现 Host Broker/KVM/Jailer/netns，不新增部署配置，也不声明 `IsolationAssurance::MicroVm` Capability。
