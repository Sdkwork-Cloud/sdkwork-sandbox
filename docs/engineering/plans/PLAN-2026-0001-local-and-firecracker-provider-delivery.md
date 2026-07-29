# PLAN-2026-0001: Local And Firecracker Sandbox Provider Delivery

Status: draft

Requirements: REQ-2026-0003, REQ-2026-0007, REQ-2026-0008

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

Specs: `ENGINEERING_WORKFLOW_SPEC.md`, `QUALITY_GATE_SPEC.md`, `CODE_REVIEW_SPEC.md`, `SECURITY_SPEC.md`, `DEPLOYMENT_SPEC.md`, `OBSERVABILITY_SPEC.md`, `PERFORMANCE_SPEC.md`, `SUPPLY_CHAIN_SECURITY_SPEC.md`, `TEST_SPEC.md`

## Objective

按 `Local -> shared Command/Terminal contract -> Firecracker` 顺序交付两条真实 Sandbox Provider 路径，并保持 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`、`Runtime / Session / Workspace / Sandbox / Provider` 术语、`Sandbox*` 类型与 `sandbox_*` 变量规则。Docker Provider 延期，不参与 Capability Fallback、测试替代或 Release Claim。

## Gate 0: Human Review Before Host/KVM Implementation

- 接受 Provider SPI、Agents Workspace Attachment、Local HostUser Assurance、Command Executor 公共命名和 Firecracker MicroVm Assurance ADR。
- 接受 Local Process Supervision 与 Capability Directory 技术选型及依赖供应链。
- 接受 Firecracker/Jailer/Kernel/RootFS/Guest Agent 版本矩阵、最小 Host Isolation Broker/Jailer 权限、Workspace Block Device、Vsock、cgroup v2 与 Network Namespace/Egress 边界。
- 确认真实 Windows/macOS/Linux Local Test Runner 与 Linux KVM Firecracker Test Node 的 Owner。

Gate 0 未完成时只允许 Contract、Test Harness、Fake Host Boundary 与文档工作；禁止真实 Host Command、KVM、Jailer、Network Namespace、Secret Injection 或发布配置。

Gate 0 人工评审包：

- [Sandbox Command Execution Architecture And Security](../reviews/REVIEW-20260729-sandbox-command-execution-architecture-security.md) - 公共 Port/Type、Terminal 语义、Fencing、Idempotency、Cleanup 与 Kernel Boundary。
- [Local Sandbox Provider Architecture And Security](../reviews/REVIEW-20260729-local-provider-architecture-security.md) - HostUser、Workspace Capability、Filesystem 与跨平台 Process Supervision；当前建议在 macOS 暂不声明 Terminal。
- [Firecracker Sandbox Provider Architecture And Security](../reviews/REVIEW-20260729-firecracker-provider-architecture-security.md) - MicroVm、Host Broker/Jailer、Artifact、Workspace/Network、Fencing、Cleanup 与真实 KVM Gate。

三个 Review 当前均为 `pending-human-review`；它们整理 Decision 与 Blocker，不构成 Agent 自行批准。

## Workstream 1: Provider-neutral Command Execution

1. 在 `sdkwork-sandbox-provider-spi` 添加经过评审的 `SandboxCommandExecutor`、请求/Limit/Result/Error 类型，保持 Lifecycle Trait 高内聚。
2. 在 Service/Registry Composition 验证 Terminal Descriptor 与 Executor 端口按 `sandbox_provider_id` 一致；缺失时关闭失败。
3. 建立 Common Conformance，覆盖 Argv、No-shell、Relative Working Directory、Environment Deny、Timeout、Cancel、Output Bound、Stale Fencing、Idempotency、Cleanup 与 Redaction。
4. 更新 Component Specs/README 和 Kernel Adapter 仅消费 Provider-neutral Port；不增加 Local/Firecracker 分支。

Expected evidence: focused SPI/Service tests, component-port and layering checks, public naming review, full Cargo/Clippy, Kernel/Agents dependency-chain check.

## Workstream 2: Local Provider

1. 实现固定 Kind `local`、Assurance `HostUser` 和精确 Capability Descriptor/Preflight。
2. 注入已授权 Workspace Attachment Capability；不接收任意 Host Root，不从 `sandbox_workspace_id` 推导 Path。
3. 使用经过评审的跨平台 Process Supervision：Windows Job Object 等价机制；macOS/Linux Process Group/Session，并在支持时叠加 cgroup。不能证明 Descendant Cleanup 的平台不声明 Terminal。
4. 执行 Environment Allowlist、Timeout、Output Limit、Cancellation、Fencing 与幂等 Command Operation。
5. 分别在 Windows、macOS、Linux 运行真实 Process Tree、Path/Link、Timeout、Cancellation、Output 和 Cleanup Test；公开 Known Limitations。

Expected evidence: three-platform real Host conformance, no-shell/escape/credential negative tests, Provider Descriptor inspection, cleanup fault injection, security review.

## Workstream 3: Firecracker Provider

1. 在公共命名接受后创建 `sdkwork-sandbox-provider-firecracker` Component 与最小依赖边界。
2. 实现 Linux KVM Preflight、Artifact Digest/Compatibility 校验和 Provider Descriptor，不在无 KVM 环境声明 Ready。
3. 实现非特权 Adapter、最小 Host Isolation Broker、Jailer/VMM lifecycle、atomic Fencing State、cgroup v2、Network Namespace/Tap deny policy、Workspace Block Device Broker 和 private Vsock Guest Agent authenticated readiness。
4. 实现同一 `SandboxCommandExecutor`，不创建 Firecracker-private Command DTO。
5. 实现有界 Stop/Destroy、Crash/Restart Recovery 与 Residue Detection；第一版不声明 Snapshot/Warm Pool/Network/Browser/Port。
6. 在真实 Linux KVM x86_64/aarch64 受支持矩阵运行 Common + Firecracker Security Conformance。

Expected evidence: pinned artifact inventory, real microVM boot/command/cleanup results, cgroup/network/fencing tests, tenant residue scan, SBOM/provenance/checksum, security/operations review.

## Workstream 4: Composition And Release Closure

1. Service Host 只通过 Component Ports 注入 Provider、Workspace Broker、Secret/KMS、Telemetry 与 Store；Source Config 不包含 Secret。
2. Standalone 组合只启用经过验证的 Local Capability；Cloud 组合只在 Firecracker Node Preconditions 满足时启用 MicroVm Provider。
3. 定义 Health/Readiness、Metric/Trace/Audit、Provider Outage、Node Drain、Artifact Rollback、Workspace Recovery 与 Incident Runbook。
4. 运行 Sandbox、Kernel、Agents 全依赖链验证和所有适用 SDKWork Merge/Release Gate；创建 `sdkwork.app.config.json` 只在实际包装/注册/部署进入范围时进行。

## Verification Matrix

| Gate | Local | Firecracker | Shared |
| --- | --- | --- | --- |
| Lifecycle + Fencing | real Host Provider | real KVM Provider | common conformance |
| Command/Timeout/Cancel/Output | Windows/macOS/Linux | Linux KVM matrix | identical request/result/error contract |
| Workspace | capability-rooted attachment | guest block device attachment | opaque `SandboxWorkspaceId` only |
| Isolation | HostUser limitation review | MicroVm security review | no silent downgrade |
| Cleanup | descendant tree + local residue | VMM/cgroup/netns/tap/disk/vsock residue | idempotent Stop/Destroy |
| Observability | safe HostUser labels | safe MicroVm labels | no raw command/path/output/secret |
| Release | standalone evidence | cloud node/provider evidence | SBOM/provenance/checksum/rollback |

## Rollback And Recovery

- Contract work is reverted by removing unaccepted public exports before release; no compatibility alias is retained because the application is pre-launch.
- Local Provider can be disabled by composition when Platform Conformance fails; Lifecycle Service returns no eligible/healthy Provider rather than using unrestricted Host fallback.
- Firecracker Provider can be drained and disabled by exact Provider/Artifact Version; active Session recovery uses the same or stronger Assurance and never Local or any deferred/weaker Provider fallback.
- Provider Destroy never deletes Agents-owned Workspace. Failed cleanup quarantines the Allocation/Node and emits an operator-visible failure instead of returning it to a Tenant Pool.

## Completion Boundary

本计划只有在 Local 与 Firecracker 的真实平台证据、人工安全/架构/运维评审、Composition、可观测性、发布供应链和回滚门禁全部通过后才完成。单元测试、Mock/Fake Provider、Windows 上的 Firecracker Config Test 或 Phase 0 基线通过都不能替代上述证据。
