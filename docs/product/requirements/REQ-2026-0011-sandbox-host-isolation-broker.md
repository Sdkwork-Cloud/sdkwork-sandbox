---
id: REQ-2026-0011
title: Define the minimum-privilege Sandbox Host Isolation Broker boundary
owner: SDKWork Runtime Platform
status: draft
priority: critical
source: security
problem: The Firecracker Provider requires privileged Linux host preparation, but granting the normal Provider adapter root, sudo, arbitrary command, path, device, cgroup, or network authority would collapse the MicroVm host boundary and make tenant isolation unauditable.
goals:
  - Define one typed, minimal, fail-closed Sandbox Host Isolation Broker boundary for fixed Firecracker host operations.
  - Require authenticated local IPC, short-lived operation grants, fencing, idempotency, bounded messages, safe results, durable audit, and restart recovery.
  - Keep the normal Firecracker adapter and VMM unprivileged while making every privileged host side effect reviewable and testable.
non_goals:
  - Implement a Broker crate, daemon, IPC transport, privileged helper, Firecracker Provider, Jailer, cgroup, network namespace, workspace device, package, service unit, or deployment profile.
  - Expose HTTP/RPC, public API, SDK, arbitrary shell, arbitrary executable, arbitrary host path/device, root Firecracker, Docker socket, cloud credentials, or general-purpose sudo functionality.
  - Own Sandbox lifecycle policy, Provider selection, Workspace business ownership, Scheduler, Node Enrollment, Secret/KMS, billing, or image building.
users:
  - Sandbox Provider maintainers
  - SDKWork security and platform operations reviewers
  - Firecracker/KVM node operators
  - SDKWork release and incident operators
affected_surfaces:
  - rust-components
  - composition
  - security
  - deployment
  - observability
  - operations
  - supply-chain
---

# REQ-2026-0011: Sandbox Host Isolation Broker 边界

## Readiness Blockers

本需求在以下事项完成人工评审前保持 `draft`，不得创建 Broker crate、daemon、socket、service unit 或特权实现：

- 接受 `SandboxHostIsolationBroker`、`SandboxHostIsolationRequest`、`SandboxHostIsolationResult`、`SandboxHostIsolationError` 与 `SandboxHostIsolationGrant` 公共候选命名。
- 接受 Broker 与 Firecracker Adapter、Jailer、VMM、Service Host、REQ-2026-0013 Workspace Attachment/L4 Block Device、REQ-2026-0014 Network Policy/L4 Isolation、REQ-2026-0015 Resource Policy/L4 Isolation/Usage mechanism、Fencing Store、Audit Sink 和 Node Operator 的所有权边界。
- 确认 Linux 本地 IPC、peer credential、client executable identity、Grant 签发/轮换/撤销、clock uncertainty 和 Broker binary upgrade authority。
- 确认 Broker 运行身份、effective Linux capability allowlist、seccomp/no-new-privileges/filesystem protection、Jailer target UID/GID 和 `/dev/kvm` 最小权限。
- 提供真实 Linux KVM Node、安装/升级/回滚 Owner、Threat Model、Supply-chain Record、故障注入和 Incident Runbook 位置。

## Candidate Acceptance Criteria

- 仓库级 `specs/sandbox-host-isolation-broker.contract.json` 是 Gate 0 候选机器权威，状态为 `draft` 且 `implementationAuthorized: false`；未批准前不得在 Component Spec 声明 public port、runtime entrypoint 或 config key。
- Broker 只接受固定 typed operation：`sandbox_inspect_node`、`sandbox_prepare_allocation`、`sandbox_apply_resource_limits`、`sandbox_prepare_network`、`sandbox_attach_workspace_device`、`sandbox_launch_jailer`、`sandbox_inspect_allocation`、`sandbox_cleanup_allocation`。其中 Workspace 操作只消费 REQ-2026-0013 Opaque Attachment，Network 操作只消费 REQ-2026-0014 Policy Grant，Resource 操作只消费 REQ-2026-0015 `SandboxResourceLimitGrant`/Opaque Scope Reference。Broker 不拥有 Workspace/Storage/KMS、Network Policy、Quota/Capacity Policy、Usage Aggregation 或 Commerce Billing。
- 请求必须携带 `sandbox_host_broker_operation_id`、哈希 Tenant Scope、`sandbox_runtime_binding_id`、`sandbox_provider_id`、`sandbox_fencing_token`、`sandbox_request_fingerprint`、短期 `SandboxHostIsolationGrant`、typed operation 和 bounded deadline；未知字段关闭失败。
- Grant 必须绑定单一 Runtime Binding、Provider、Request Fingerprint、允许操作、Policy Revision、Audience、短 TTL、Nonce 和 Signature，并支持撤销、重放防护与 clock uncertainty fail-closed。
- Transport 只允许 Provider-private Runtime Directory 下的 Linux Unix Domain Socket；禁止 TCP/Remote Network，要求 Filesystem ACL、peer credential、client executable identity、协议版本协商、长度前缀和未知消息拒绝。
- Broker 是独立受审计 Host Service；有效特权必须显式 allowlist，不继承 Ambient Capability。普通 Firecracker Adapter 与 VMM 不以 root 运行；Broker 不接受任意 Shell、Executable、Host Path、Device、Environment、Docker Socket 或 Cloud Credential。
- Broker 按 Runtime Binding 持久化最高 Fencing Token，在特权副作用前拒绝 Stale Token；同 Operation+Fingerprint 幂等重放，不同 Fingerprint 冲突，重启后继续保持判断。
- Readiness 必须同时证明 Protocol、Peer Authentication、Grant Verification、Privilege Profile、Runtime Directory、Fencing Store、Audit Sink 和 Cleanup Reconciliation；Degraded/Unknown 不得授权副作用。
- Result/Error 只输出 Opaque Protected Provider Resource Reference、Outcome、Reason Code、Retryability、Observed Fencing Token、Duration 与 Server-owned Trace；禁止物理 Path、Socket、Tap、cgroup、microVM、Credential 或 Provider-private Metadata。
- 每个副作用产生 durable `SandboxAuditRecord`，每个拒绝产生 Security Fact；Telemetry Exporter 不可用时 Audit 仍必须保留。
- Request/Result、Grant TTL、Deadline、Cleanup Step、Reconciliation Batch、Reason Code 和操作数量全部有界；不得通过无界扫描、重试或队列隐藏失败。
- Contract Test 必须证明固定操作、`Sandbox*`/`sandbox_*` 命名、无 Shell/Path/Device、Local-only IPC、Grant/Fencing/Idempotency、Readiness、Audit、Bounds 和 `implementationAuthorized: false`。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | Broker 为最小特权边界，不是通用 root helper；任一身份、Grant、Policy、Fencing、Audit 或 Cleanup 保证不可证明时关闭失败。 |
| Privacy | Tenant/Actor/Resource 使用哈希或 Opaque Reference；Host/Guest 物理标识、Secret、Command 与完整 Payload 不进入普通输出。 |
| Performance | 本地 IPC 消息不超过 64 KiB，Grant TTL 不超过 60 秒，单次 deadline 不超过 300 秒，reconciliation batch 不超过 100。 |
| Reliability | Broker restart、Provider retry、stale controller、partial cleanup 和 duplicate request 有确定、幂等、可恢复结果。 |
| Operations | 安装、权限、版本、SBOM、Provenance、Checksum、漏洞响应、升级、回滚、Node Drain 和 Incident Owner 必须在实现前固定。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `COMPONENT_SPEC.md`, `INTERNAL_API_SPEC.md`, `SECURITY_SPEC.md`, `RUNTIME_DIRECTORY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `EVENT_SPEC.md`, `PERFORMANCE_SPEC.md`, `SUPPLY_CHAIN_SECURITY_SPEC.md`, `RUST_CODE_SPEC.md`, `TEST_SPEC.md`.

Components: future reviewed `sdkwork-sandbox-host-isolation-broker`, proposed `sdkwork-sandbox-provider-firecracker`, `sdkwork-sandbox-provider-spi`, `sdkwork-sandbox-service-host`, Workspace Attachment boundary, and Audit/Outbox authority. No component is created by this requirement.

Decision: [ADR-20260729: Sandbox Host Isolation Broker Boundary](../../architecture/decisions/ADR-20260729-sandbox-host-isolation-broker-boundary.md).

Related: [REQ-2026-0008 Firecracker Provider](REQ-2026-0008-firecracker-sandbox-provider.md), [REQ-2026-0009 Service Host](REQ-2026-0009-sandbox-service-host-composition-and-readiness.md), [REQ-2026-0010 Observability/Event/Audit/Outbox](REQ-2026-0010-sandbox-observability-event-audit-outbox.md), [REQ-2026-0013 Workspace Block Device/Sanitization](REQ-2026-0013-sandbox-workspace-block-device-attachment-and-sanitization.md), [REQ-2026-0014 Firecracker Network Isolation](REQ-2026-0014-sandbox-firecracker-network-isolation.md), and [REQ-2026-0015 Firecracker Resource Isolation/Usage](REQ-2026-0015-sandbox-firecracker-resource-isolation-and-usage.md).

## Verification Plan

```bash
node --test tests/contract/sandbox-host-isolation-broker.contract.test.mjs
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .
node ../sdkwork-specs/tools/check-identity-naming.mjs --root .
node ../sdkwork-specs/tools/audit-repository-baseline.mjs --root .
```

真实 Broker、IPC、Privilege、KVM/Jailer/cgroup/netns/Workspace Device、Package/Service Unit 和 Release/Incident Evidence 必须由后续 `ready` implementation requirement 提供，本候选 Contract Test 不能替代。

## Current Boundary

2026-07-29 已新增 draft `specs/sandbox-host-isolation-broker.contract.json` 和静态 Contract Test。当前没有 Broker crate、daemon、socket、config key、service unit、privileged operation 或 deployment profile；本需求保持 `draft`，等待 Architecture、Security、Platform/KVM Operations、Workspace/Data、Audit/Privacy 与 Supply-chain/Release 人工评审。
