# PLAN-2026-0001: Local And Firecracker Sandbox Provider Delivery

Status: draft

Requirements: REQ-2026-0003, REQ-2026-0007, REQ-2026-0008, REQ-2026-0011, REQ-2026-0012, REQ-2026-0013, REQ-2026-0014, REQ-2026-0015, REQ-2026-0016, REQ-2026-0017, REQ-2026-0018

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

Specs: `ENGINEERING_WORKFLOW_SPEC.md`, `QUALITY_GATE_SPEC.md`, `CODE_REVIEW_SPEC.md`, `SECURITY_SPEC.md`, `DEPLOYMENT_SPEC.md`, `OBSERVABILITY_SPEC.md`, `PERFORMANCE_SPEC.md`, `SUPPLY_CHAIN_SECURITY_SPEC.md`, `TEST_SPEC.md`

## Objective

按 `Local -> shared Command/Terminal contract -> Firecracker` 顺序交付两条真实 Sandbox Provider 路径，并保持 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`、PRD 中的 `Runtime / Session / Workspace / Sandbox / Provider / Scheduler / Pool / Placement / Quota` 术语、`Sandbox*` 类型与 `sandbox_*` 字段/变量规则。Docker Provider 延期，不参与 Capability Fallback、测试替代或 Release Claim。

当前所有新增 Provider、Host Broker、Node Trust、Scheduler 与 Runtime Contract 仍处于 Gate 0。静态契约与 Fake Host Test 只证明边界可审查，不构成 Local HostUser、Firecracker MicroVm、SaaS、生产部署或商业运营能力。

## Gate 0: Human Review Before Host/KVM Implementation

- 接受 Provider SPI、Agents Workspace Attachment、Local HostUser Assurance、Command Executor 公共命名和 Firecracker MicroVm Assurance ADR。
- 接受 Local Process Supervision、Capability Directory 与依赖供应链方案。
- 接受 REQ-2026-0011 最小 Host Isolation Broker/Jailer 权限和 Grant/Fencing/Audit 边界。
- 接受 REQ-2026-0012 精确 Firecracker/Jailer/Kernel/RootFS/Guest Agent/可选 Initrd Artifact Tuple、Release/Key/Advisory Authority 与供应链证据位置。
- 接受 REQ-2026-0013 Workspace Block Device/Encryption/Sanitization/Residue/Quarantine 边界。
- 接受 REQ-2026-0014 Network Policy/Isolation/Atomic Verification/Residue/Quarantine 边界。
- 接受 REQ-2026-0015 Resource Policy/Machine Config/cgroup v2/Usage/Commerce 边界。
- 接受 REQ-2026-0016 Admission/Scheduler/PostgreSQL Capacity Reservation/Fairness/Recovery 边界。
- 接受 REQ-2026-0017 Bootstrap/Machine Identity/PKI/Attestation/Verified Inventory/Rotation/Revocation/Drain/Quarantine 边界。
- 接受 REQ-2026-0018 SQL Subject Migration、四对象 PostgreSQL Quota/Capacity Persistence、Lock/CAS/Fencing、TTL/Quarantine、RLS/Role、PITR/RPO/RTO 边界。
- 确认真实 Windows/macOS/Linux Local Test Runner 与 Linux KVM Firecracker Test Node 的 Owner。

Gate 0 未完成时只允许 Contract、Test Harness、Fake Host Boundary 与文档工作。禁止真实 Host Command、KVM、Jailer、Network Namespace、Secret Injection 或发布配置。Contract 包括 Requirement、ADR 和 Machine Contract，Fake Host Boundary 只能在 `#[cfg(test)]` 下编译；同时禁止新增公共 Runtime Port、Node Agent、PKI/CA/HSM、Attestation Verifier、Scheduler/Reservation Database 或 cgroup/Device Mechanism。

当前 Gate 0 机器权威是 `specs/sandbox-provider-delivery-gates.contract.json` 及其关联契约。所有契约保持 `draft`、`implementationAuthorized: false`；批准后必须同步修改门禁、Component Contract 与真实实现证据，不能只改变文档状态。

人工评审包：

- [Sandbox Command Execution Architecture And Security](../reviews/REVIEW-20260729-sandbox-command-execution-architecture-security.md)
- [Local Sandbox Provider Architecture And Security](../reviews/REVIEW-20260729-local-provider-architecture-security.md)
- [Firecracker Sandbox Provider Architecture And Security](../reviews/REVIEW-20260729-firecracker-provider-architecture-security.md)
- [Sandbox Host Isolation Broker Architecture And Security](../reviews/REVIEW-20260729-sandbox-host-isolation-broker.md)
- [Sandbox Firecracker Artifact Compatibility And Supply Chain](../reviews/REVIEW-20260729-sandbox-firecracker-artifact-compatibility-and-supply-chain.md)
- [Sandbox Workspace Block Device Attachment And Sanitization](../reviews/REVIEW-20260729-sandbox-workspace-block-device-attachment-and-sanitization.md)
- [Sandbox Firecracker Network Isolation Architecture And Security](../reviews/REVIEW-20260729-sandbox-firecracker-network-isolation.md)
- [Sandbox Firecracker Resource Isolation Architecture And Security](../reviews/REVIEW-20260729-sandbox-firecracker-resource-isolation.md)
- [Sandbox Multi-tenant Admission, Scheduling And Capacity](../reviews/REVIEW-20260729-sandbox-multi-tenant-admission-scheduling-and-capacity.md)
- [Sandbox Node Trust, Enrollment, Attestation And Verified Inventory](../reviews/REVIEW-20260729-sandbox-node-trust-enrollment-attestation-and-inventory.md)
- [Sandbox PostgreSQL Quota And Capacity Persistence](../reviews/REVIEW-20260729-sandbox-postgresql-quota-and-capacity-persistence.md)

所有 Review 当前均为 `pending-human-review`；它们整理 Decision 与 Blocker，不构成 Agent 自行批准。

## Workstream 1: Provider-neutral Command Execution

1. 在公共命名和安全评审通过后，为 `sdkwork-sandbox-provider-spi` 添加同一 `SandboxCommandExecutor` 及请求、Limit、Result、Error 类型，保持 Lifecycle 与 Command 职责分离。
2. 在 Service/Registry Composition 验证 Terminal Descriptor 与 Executor Port 的 `sandbox_provider_id` 一致，缺失或冲突时关闭失败。
3. 建立 Common Conformance，覆盖 Typed Argv、No-shell、Logical Relative Working Directory、Environment Deny、Timeout、Cancel、Output Bound、Stale Fencing、Idempotency、Cleanup 与 Redaction。
4. 更新 Component Specs/README 和 Kernel Adapter，使 Kernel 只消费 Provider-neutral Sandbox Port，不增加 Local/Firecracker 分支。

Expected evidence: focused SPI/Service tests, component-port and layering checks, public naming review, full Cargo/Clippy, Kernel/Agents dependency-chain check.

## Workstream 2: Local Provider

1. 实现固定 Kind `local`、Assurance `HostUser` 和精确 Capability Descriptor/Preflight。
2. 注入已授权 Workspace Attachment Capability；不接收任意 Host Root，不从 `sandbox_workspace_id` 推导 Path。
3. 使用经评审的跨平台 Process Supervision：Windows Job Object 等价机制；macOS/Linux Process Group/Session，并在支持时叠加 cgroup。不能证明 Descendant Cleanup 的平台不声明 Terminal。
4. 执行 Environment Allowlist、Timeout、Output Limit、Cancellation、Fencing 与幂等 Command Operation。
5. 分别在 Windows、macOS、Linux 运行真实 Process Tree、Path/Link、Timeout、Cancellation、Output 和 Cleanup Test，并公开 Known Limitations。

Expected evidence: three-platform real Host conformance, no-shell/escape/credential negative tests, Provider Descriptor inspection, cleanup fault injection, security review.

## Workstream 3: Firecracker Provider

1. 在公共命名、REQ-2026-0008 和关联安全 Gate 获批后创建 `sdkwork-sandbox-provider-firecracker` Component 与最小依赖边界。
2. 在 REQ-2026-0012 获批并有真实 Manifest/Evidence 后，实现 Linux KVM Preflight、Artifact Digest/Signature/Compatibility/Revocation 校验和 Provider Descriptor；无 KVM、精确 Tuple 或完整 Evidence 时不得声明 Ready。
3. 先物化 REQ-2026-0017 Node Agent/Machine Identity/Attestation/Verified Inventory Authority，Cloud Scheduler 只能消费 `SandboxVerifiedNodeInventoryRecord` 的短期投影；Node Trust 失败不得回退到未验证 Node、Local 或 Docker。
4. 在 REQ-2026-0018 获批后先完成 SQL Subject `BIGINT` 预发布 Migration，再物化四对象 PostgreSQL Quota/Capacity Persistence、RLS/Role、PITR/Restore 与真实多副本并发证据。
5. 再物化 REQ-2026-0016 IAM/Commerce Admission 与 Scheduler，保证 Confirmed Reservation-before-Allocate；REQ-2026-0015 Resource Grant 必须绑定同一 Admission/Reservation 且不超过预留资源。
6. 在 REQ-2026-0011、REQ-2026-0013、REQ-2026-0014 与 REQ-2026-0015 获批后，组合非特权 Adapter、最小 Host Isolation Broker、Jailer/VMM Lifecycle、Atomic Fencing State、Workspace Block Device/Sanitization、Network Namespace/Tap Policy、Firecracker Machine Config/cgroup v2 和 private Vsock Guest Agent authenticated readiness；Guest Authentication 不替代 REQ-2026-0017 Host Node Platform Attestation。
7. 实现与 Local 相同的 `SandboxCommandExecutor`，不创建 Firecracker-private Command DTO。
8. 实现有界 Stop/Destroy、Crash/Restart Recovery 与 Residue Detection；第一版不声明 Snapshot、Restore、Warm Pool、Browser 或 Port Forward。
9. 在真实 Linux KVM x86_64/aarch64 受支持矩阵运行 Common + Firecracker Security Conformance。

Expected evidence: pinned artifact inventory, Node Trust/attestation evidence, real microVM boot/command/cleanup results, reservation/cgroup/network/fencing tests, tenant residue scan, SBOM/provenance/checksum, security/operations review.

## Workstream 4: Composition And Release Closure

1. Service Host 只通过 Component Ports 注入 Provider、Workspace、Network、Resource、Node Trust、Admission/Scheduler、Secret/KMS、Telemetry 与 Store；Source Config 不包含 Secret。
2. Standalone 组合只启用经过验证的 Local Capability；Cloud 组合只在 REQ-2026-0017 Verified Node Gate、REQ-2026-0018 PostgreSQL Persistence Gate 和 REQ-2026-0016 Admission/Capacity Gate 满足时启用 Firecracker MicroVm Provider。
3. 定义 Health/Readiness、Metric/Trace/Audit、PKI/Verifier Outage、Identity Rotation/Revocation、Node Drain/Quarantine、Provider Outage、Artifact Rollback、Workspace Recovery 与 Incident Runbook。
4. 运行 Sandbox、Kernel、Agents 全依赖链验证和所有适用 SDKWork Merge/Release Gate；`sdkwork.app.config.json` 只在实际包装、注册或部署进入范围时创建。

## Verification Matrix

| Gate | Local | Firecracker | Shared |
| --- | --- | --- | --- |
| Lifecycle + Fencing | real Host Provider | real KVM Provider | common conformance |
| Command/Timeout/Cancel/Output | Windows/macOS/Linux | Linux KVM matrix | identical request/result/error contract |
| Workspace | capability-rooted attachment | encrypted guest block device | opaque `SandboxWorkspaceId` only |
| Isolation | HostUser limitation review | MicroVm security review | no silent downgrade |
| Node Trust | not required for Standalone Local | identity + attestation + verified inventory | Cloud fails closed |
| Admission/Capacity | explicit Single-node policy only | PostgreSQL atomic reservation | reservation before allocate |
| Cleanup | descendant tree + local residue | VMM/cgroup/netns/tap/disk/vsock residue | idempotent Stop/Destroy |
| Observability | safe HostUser labels | safe MicroVm/Node labels | no raw command/path/output/secret/evidence |
| Release | standalone evidence | cloud node/provider evidence | SBOM/provenance/checksum/rollback |

## Rollback And Recovery

- Contract work removes unaccepted public exports before release; no compatibility alias is retained because the application is pre-launch.
- Local Provider can be disabled by Composition when Platform Conformance fails; Lifecycle Service returns no eligible/healthy Provider rather than using unrestricted Host fallback.
- Firecracker Provider can be drained and disabled by exact Provider/Artifact Version。Identity/Attestation/Inventory 失效时从 Verified Projection 移除 Node，active Session recovery 使用同等级或更强 Assurance，绝不回退 Local、Docker 或未验证 Node。
- Provider Destroy 不删除 Agents-owned Workspace。Cleanup、Sanitization 或 Trust Verification 失败时 Quarantine Allocation/Node 并产生 Operator-visible 安全事实，不返回给其他 Tenant。

## Completion Boundary

本计划只有在 Local 与 Firecracker 的真实平台证据、人工安全/架构/PKI/Attestation/数据库/容量/商业/运维评审、Composition、可观测性、发布供应链和回滚门禁全部通过后才完成。单元测试、Mock/Fake Provider、Windows 上的 Firecracker Config Test、静态 Contract Test 或 Phase 0 基线通过都不能替代上述证据。
