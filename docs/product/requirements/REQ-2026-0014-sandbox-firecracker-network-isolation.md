---
id: REQ-2026-0014
title: Define the Sandbox Firecracker network isolation and egress policy boundary
owner: SDKWork Runtime Platform
status: draft
priority: critical
source: security
problem: Firecracker requires outbound connectivity controls, but allowing the Provider or privileged host mechanism to invent policy, share host or tenant network state, or treat a partially applied rule set as ready would break tenant isolation and MicroVm assurance.
goals:
  - Define a provider-neutral SandboxNetworkPolicyPort authority separated from the Firecracker L4 SandboxNetworkIsolationPort mechanism.
  - Require DenyAll by default, explicit DNS and egress grants, and permanent denial of cloud metadata, host control plane, and tenant lateral traffic.
  - Define fenced, idempotent, atomic apply/verify, bounded teardown, residue quarantine, safe telemetry, and durable denial audit boundaries.
non_goals:
  - Implement a Rust port, adapter, network namespace, Tap, nftables, firewall, route, DNS proxy, packet filter, host command, service unit, config, or deployment profile.
  - Authorize ingress, port forwarding, browser networking, unrestricted internet access, wildcard destinations, catch-all CIDRs, service discovery, VPN, overlay networking, or Kubernetes CNI.
  - Change Sandbox lifecycle policy, Provider selection, Host Broker privilege ownership, Node Enrollment, Scheduler, public API/SDK, billing, Secret/KMS, or Docker Provider scope.
users:
  - Sandbox and Firecracker Provider maintainers
  - SDKWork security and network platform reviewers
  - KVM node and incident operators
  - Privacy and audit reviewers
affected_surfaces:
  - cross-component-contract
  - security
  - privacy
  - composition
  - observability
  - operations
---

# REQ-2026-0014: Sandbox Firecracker Network Isolation 与 Egress Policy 边界

## Readiness Blockers

- 人工接受 `SandboxNetworkPolicyPort`、`SandboxNetworkPolicyRequest/Grant/Error`、`SandboxNetworkIsolationPort`、`SandboxNetworkIsolationRequest/Result/Error/Readiness` 候选命名及 L3 Policy/L4 Mechanism 分离。
- 确定 Tenant/Organization/Platform Network Policy 来源、Policy Issuer、签名/撤销/Clock Authority、Revision 生命周期和 Operator Change Control；Caller 的网络请求不自动构成授权。
- 确定支持的 DNS Resolver、Domain/Endpoint 规范化、IPv4/IPv6、DNS Rebinding、Redirect、Fragment 与 Connection Tracking 行为。
- 确定 Cloud Metadata、Host Control Plane、Tenant Lateral Traffic 的 Node-specific 地址分类权威和无法分类时的关闭失败行为。
- 确定 Host Isolation Broker 的最小 Linux Capability、netns/Tap/firewall 操作、持久 Fencing/Policy Journal、Crash Recovery、Upgrade/Rollback 与 Node Drain 所有者。
- 提供真实 Linux KVM 网络命名空间、Tap、双栈、DNS、出口、故障注入、VMM/Broker Restart、Residue 和 Cross-tenant Negative Test 环境。

## Candidate Acceptance Criteria

- Provider-neutral `SandboxNetworkPolicyPort` 是 Policy Authority；Firecracker L4 `SandboxNetworkIsolationPort` 只消费已签名、短期且绑定 Runtime Binding 的 `SandboxNetworkPolicyGrant`。Provider、Broker、Guest 和 Caller 均不能自行扩大授权。
- 所有 Sandbox-owned Type 使用 `Sandbox` 前缀，字段使用 `sandbox_` 前缀，未知字段关闭失败。Policy 默认为 `DenyAll`；第一版只允许显式 `sandbox_dns_resolution` 和 `sandbox_egress_connection` Grant，不允许 Ingress、Port Forward、Ambient Host Network、Wildcard Destination 或 `0.0.0.0/0`/`::/0` 等 Catch-all Rule。
- 每个 `SandboxRuntimeBindingId` 使用独立 Network Namespace 与 Tap；活动 Binding 不共享 Namespace/Tap，不进入 Host Network Namespace，不访问 Host Loopback，也不从 Tenant/Session/Binding ID 推导 Host Interface Name。
- Cloud Metadata、Host Control Plane 和 Tenant Lateral Traffic 是永久拒绝 Destination Class。拒绝规则在 Allow Rule 前执行，并在 DNS Resolution 与 Redirect 后逐地址重检；即使显式 Grant 也不能覆盖，未知分类关闭失败。
- DNS 只有在 Resolver 与 Domain Rule 都获授权时可用；禁止 Ambient System Resolver。Resolved Address 必须有界并绑定 Policy，连接前重检 Rebinding 和永久拒绝分类。
- Egress Grant 必须明确 Transport、Destination 与 Port，仅候选支持 TCP/UDP；Redirect Target、IPv4/IPv6、Fragment/Malformed Packet 与 Existing Flow 都服从当前 Policy Revision 和 Expiry。
- `SandboxNetworkPolicyGrant` 绑定 Tenant Scope Hash、Session、Runtime Binding、Provider、Fencing Token、Policy Revision/Fingerprint、DNS/Egress Rule、Issued/Expiry、Nonce、Audience 与 Signature，并验证 Replay、Revocation 和 Clock Uncertainty。
- 每个网络副作用前验证并持久化最高 `sandbox_fencing_token`；Policy Revision 单调。同 Operation+Fingerprint 重放同一 Result，不同 Fingerprint 冲突；Restart 后恢复判断。
- Apply 先 Stage，后原子 Commit，再回读 Active Revision/Fingerprint，并探测 Default Deny 和永久拒绝。全部验证前不得报告 Network Ready；Partial Apply 关闭失败并恢复 `DenyAll`，无法证明时 Quarantine。
- Readiness 同时证明 Grant、Fencing、Namespace、Tap、Default Deny、DNS/Egress、永久拒绝、Revision 和 Prior Residue Clear；静态契约或单一 Network Namespace 不构成 `MicroVm` Evidence。
- Teardown 顺序至少包含 Grant Revocation、Force DenyAll、Flow/Rule Removal、Tap/Namespace Removal、Residue Scan 和 Audit。失败或未知时 Binding/Node 进入 Quarantine，不能跨 Tenant 重用，并由有界 Reconciler 处理。
- Metric 只使用 Provider Kind、Operation、Outcome、Reason Code 等低基数维度；Destination IP/Domain/Port、Rule、Packet、Namespace/Tap/Firewall Handle 不进入 Metric 或普通 Log。每次 Denial 和 Policy Change 产生 Durable `SandboxAuditRecord`，Telemetry 不可用不能丢失审计。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | Default Deny、Policy Authority、Grant、Permanent Denial、DNS/Rebinding、Redirect、Dual-stack、Fencing、Atomic Apply、Teardown 和 Residue 必须有负向证据并关闭失败。 |
| Privacy | Destination 与 Network Metadata 按 tenant/operational 分类并最小化；普通 Log/Metric 不记录 Destination、Rule、Packet 或 Host-private Identity。 |
| Performance | Policy Compile/Apply/Verify、DNS Decision、Egress Decision 和 Teardown 分别记录 p50/p95/p99；真实 KVM/Rule/Flow 基准前不设置虚假 SLO。 |
| Reliability | Partial Apply、Broker/VMM Restart、Stale Controller、Policy Update 和 Cleanup Failure 不产生未授权 Flow 或可跨 Tenant 重用的残留网络状态。 |
| Coupling | Policy Authority、Service Orchestration、Host Broker、Firecracker Mechanism、Audit 和 Node Operations 通过 typed Grant/Result 组合；Provider-private 标识不泄露。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `PERFORMANCE_SPEC.md`, `EVENT_SPEC.md`, `RUNTIME_DIRECTORY_SPEC.md`, `TEST_SPEC.md`.

Components: `crates/sdkwork-sandbox-provider-spi`, `crates/sdkwork-intelligence-sandbox-service`, future reviewed Sandbox Network Policy component or focused service port, future reviewed `sdkwork-sandbox-host-isolation-broker`, and future reviewed `sdkwork-sandbox-provider-firecracker` L4 adapter.

Decisions: [ADR-20260729: Sandbox Firecracker Network Isolation And Egress Policy](../../architecture/decisions/ADR-20260729-sandbox-firecracker-network-isolation-and-egress-policy.md), [ADR-20260729: Firecracker Provider Isolation And Node Boundaries](../../architecture/decisions/ADR-20260729-firecracker-provider-isolation-and-node-boundaries.md), [ADR-20260729: Sandbox Host Isolation Broker Boundary](../../architecture/decisions/ADR-20260729-sandbox-host-isolation-broker-boundary.md), and [ADR-20260729: Sandbox Observability, Event, Audit And Outbox Boundary](../../architecture/decisions/ADR-20260729-sandbox-observability-event-audit-outbox-boundary.md).

## Verification Plan

- `tests/contract/sandbox-firecracker-network-isolation.contract.test.mjs` 验证 Draft Gate、Sandbox 命名、Policy/Mechanism Ownership、DenyAll、永久拒绝、Namespace/Tap、Grant、Fencing、Atomic Apply/Verify、Readiness、Teardown、Quarantine、Telemetry/Audit 和 Bounds。
- Runtime 阶段增加 Policy Signature/Expiry/Replay/Revocation、DNS Rebinding、Redirect、IPv4/IPv6、Metadata/Host/Tenant Lateral Denial、Stale Fencing、Concurrent Revision、Partial Apply、Broker/VMM Restart、Cleanup/Residue 和 Audit Backpressure Test。
- 真实 Linux KVM Matrix 必须证明每个 Binding 独立 netns/Tap、Default Deny、显式 DNS/Egress Allow、永久拒绝不可覆盖、Atomic Policy Update、Bounded Teardown、Cross-tenant Residue Clear 和 Node Quarantine。

## Release Boundary

本需求只定义 Gate 0 候选边界，不创建 Rust Port/Crate、netns、Tap、nftables/Firewall、Route、DNS Proxy、Runtime Path、Config、Service Unit 或 Deployment Profile。人工网络策略、权限、审计、运维和真实 KVM Evidence 完成前保持 `draft`，不得把静态 Contract Test 解释为 Network Isolation、`MicroVm` Assurance 或商业发布能力。
