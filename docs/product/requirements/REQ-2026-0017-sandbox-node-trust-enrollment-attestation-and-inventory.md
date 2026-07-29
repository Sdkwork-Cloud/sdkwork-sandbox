---
id: REQ-2026-0017
title: Define Sandbox node trust, enrollment, attestation, and verified inventory
owner: SDKWork Runtime Platform
status: draft
priority: critical
source: platform
problem: Firecracker cloud scheduling cannot trust node identity, capability, assurance, health, locality, or capacity when enrollment, workload identity, attestation verification, inventory publication, drain, quarantine, rotation, and revocation have no reviewed authority or fail-closed contract.
goals:
  - Define separate provider-neutral authorities for node enrollment, attestation verification, verified inventory publication, and node lifecycle control.
  - Require single-use bootstrap, short-lived key-bound workload identity, mutually authenticated transport, rotation, revocation, and cloned-identity detection.
  - Keep machine authentication distinct from hardware or platform attestation and require explicit trust profiles selected by control-plane policy.
  - Permit scheduling only from a fresh control-plane-verified inventory projection bound to active identity, attestation, artifact, policy, health, lifecycle, and capacity revisions.
  - Define drain, quarantine, compromise recovery, safe telemetry, durable audit, bounded reconciliation, and public privacy boundaries.
non_goals:
  - Implement a Node Agent, enrollment service, PKI/CA/HSM, attestation verifier, TPM/TEE integration, database schema, scheduler, provider, API/SDK, service unit, deployment profile, or runtime wiring.
  - Define IAM user authentication, Commerce billing, provider lifecycle, Host Broker privileges, KVM/Jailer implementation, artifact building, or secret manager behavior.
  - Claim remote hardware attestation from mTLS, a signed heartbeat, a software-only self-report, or a Windows/WSL/Fake test.
users:
  - SaaS platform, capacity, security, and incident-response operators
  - Sandbox scheduler, Firecracker, node-agent, and service-host maintainers
  - PKI, key-custody, attestation, database, reliability, privacy, and compliance reviewers
affected_surfaces:
  - cross-component-contract
  - node-trust
  - machine-identity
  - attestation
  - scheduling
  - security
  - privacy
  - observability
  - events
  - deployment
  - operations
---

# REQ-2026-0017: Sandbox Node Trust、Enrollment、Attestation 与 Verified Inventory

## Readiness Blockers

- 人工接受 `SandboxNodeEnrollmentPort`、`SandboxNodeAttestationVerificationPort`、`SandboxNodeInventoryPublicationPort`、`SandboxNodeLifecycleControlPort`、`SandboxNodeIdentity`、`SandboxNodeAttestationEvidence/Verification`、`SandboxNodeInventoryPublication` 与 `SandboxVerifiedNodeInventoryRecord` 候选命名和所有权。
- 确定 Machine Identity Trust Domain、Enrollment Approver、Bootstrap Credential Issuer、PKI/CA/HSM、Certificate Profile、Key Algorithm/Storage、Trust Bundle、Rotation/Revocation/OCSP-or-equivalent、Clock 和 Emergency Compromise Owner。
- 确定支持的 Node Trust Profile、TPM/TEE/Cloud Attestation Verifier、Evidence Format、Nonce、Endorsement/Chain、Approved Boot/Kernel/Artifact Baseline、Policy Revision、Freshness、Privacy、False-positive 与 Verifier Outage 行为。
- 确定 Node Agent Binary/Package/Supply-chain、Host Installation、Upgrade/Rollback、Process Privilege、Config/Secret Boundary、Local Transport、Control-plane Endpoint 和 Break-glass Policy。
- 确定 PostgreSQL Enrollment/Identity/Attestation/Inventory/Drain/Quarantine/Revocation 权威表、唯一约束、Sequence/Revision/CAS、TTL、Retention、PITR、RPO/RTO 和有界 Reconciler Owner。
- 提供真实 Linux KVM Node、受信 Machine Identity、可用的目标 Attestation Mechanism、多副本 Control Plane 和故障注入证据，覆盖 Bootstrap Replay、Key Theft/Clone、Certificate Expiry/Revocation、Trust Bundle Rotation、Stale/Out-of-order Inventory、Drain/Quarantine、Node Restart、Clock Skew 和 Verifier/CA Outage。

## Candidate Acceptance Criteria

- `SandboxNodeEnrollmentPort` 只消费短期单次 Bootstrap Reference、Node-generated Public Key Proof 和受限 Platform Claim；Control Plane 分配 Opaque `sandbox_node_reference`。Caller/Node 不得指定 Trust Profile、Node Reference、Region Authority 或 Capability，Bootstrap Secret/Private Key 不进入请求、配置、日志或事件。
- `SandboxNodeIdentity` 是短期、Key-bound、Trust-domain/Audience-bound Workload Identity；Node Private Key 必须不可导出，禁止共享 Node Identity、永久静态 Certificate、Wildcard Identity 和 steady-state Bearer Token。Transport 使用 TLS 1.3 或更强的双向身份验证并检查 Trust Bundle Revision、Expiry 与 Revocation。
- Machine Identity Authentication 与 Platform Attestation 是独立事实。`sandbox_authenticated_machine_identity` 不得宣称 `sandbox_verified_platform_attestation`；所需 Trust Profile 由 Control-plane Policy 选择，Node Agent、Provider、Broker 或 Scheduler 不能提升。
- `SandboxNodeAttestationVerificationPort` 使用 Fresh Nonce，验证 Evidence Signature/Chain、Node Key Binding、Artifact Manifest Binding、Boot/Kernel Measurement、Policy Revision、Approved Baseline 和 Expiry；Replay、Stale、Unknown Format、Failed/Unknown Outcome 关闭失败。Raw Quote/Event Log/PCR 不进入公共 Contract、Event、Metric 或 Error。
- `SandboxNodeInventoryPublicationPort` 只接受 Active Node Identity 签名、严格单调 Sequence、短 TTL、有限 Capability/Assurance/Capacity、有效 Attestation Verification、Artifact Manifest Digest、Network/Resource Policy Revision、Health、Lifecycle、Locality/Residency/Fault-domain Code 与 Capacity Revision。自报 Inventory 不是 Scheduler Authority。
- Control Plane 验证 Identity、Attestation、Inventory、Artifact、Policy、Health 与 Capacity 后签发 `SandboxVerifiedNodeInventoryRecord`；REQ-2026-0016 `SandboxNodeInventoryPort` 只从该 Projection 形成 Opaque `SandboxNodeCandidateSnapshot`，不能直接消费 Node Agent Publication。
- Node Lifecycle 固定为 Pending Enrollment、Enrolled、Attesting、Active、Draining、Quarantined、Revoked、Expired；只有 Active 且所有证据新鲜的 Node 可调度。新 Enrollment 默认不可调度，Drain 先阻止新 Placement，Quarantine 阻止新旧副作用，Revocation/Expiry 立即阻止认证与 Placement。
- Identity Rotation 必须证明新 Key Possession，最多允许有界双 Identity Overlap，旧 Identity 随后撤销。Compromise、重复 Active Key 或 Clone Detection 同时 Quarantine 相关 Node 并撤销 Identity；Restart 不得重用 Bootstrap Credential。
- Enrollment、Rotation、Attestation、Inventory、Drain、Quarantine、Revocation 与 Reconciliation 使用 Operation + Fingerprint Replay/Conflict、Revision/CAS 与有界 Retry。Stale Identity/Attestation/Inventory Revision 拒绝；禁止无界全 Node Scan。
- Error 使用关闭 Taxonomy、显式 Retryability 与有界 Retry-after，不泄露 Certificate、Identity Serial、Key Thumbprint、Raw Attestation、Node Address、Topology 或 Capacity。Audit 使用 Opaque/Hashed Node Reference，安全事实在 Telemetry 不可用时仍 Durable。
- Node Enrollment/Identity/Trust/Inventory/Drain/Quarantine Event 注册到现有 Event Catalog；Metric 只使用有界 Trust Profile、Lifecycle/Scheduling State、Operation、Outcome 和 Failure Category，不能包含 Node Reference、Serial、Thumbprint、Measurement、Raw Locality/Residency/Fault Domain。
- Cloud 必须使用该 Node Trust Gate。Standalone Local Provider 不要求 Node Enrollment；未来 Single-node Firecracker Adapter 只有在独立 Ready Requirement/Review 下复用同一 Contract，且不得宣称多租户或远程硬件 Attestation。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | Bootstrap、Key Possession、mTLS、Trust Bundle、Revocation、Attestation、Clone Detection、Drain/Quarantine 和 Fail-closed Outage 必须有负向证据。 |
| Privacy | Node Trust 数据为 `InternalSecuritySensitive`；公共 API/Event/Metric 不暴露 Node Identity、Certificate、Raw Evidence、Host Address、Topology、Measurement 或 Capacity。 |
| Performance | Enrollment、Attestation、Inventory Verification 与 Reconciliation 分别记录 p50/p95/p99；Payload、TTL、Capability、Retry、Timeout、Batch 和 State Cardinality 全部有界。 |
| Reliability | CA/Verifier/Control-plane Restart、Clock Skew、Rotation、Revocation、Stale Publication、Duplicate Identity 和 Node Loss 不产生可调度的未知信任状态。 |
| Operations | Trust Bundle、Certificate、Attestation Baseline、Node Agent、Drain/Quarantine、Compromise、Rollout/Rollback 和 Incident Runbook 有明确 Owner、SLO、Alert 与审计。 |
| Coupling | Identity、Attestation、Inventory、Scheduler、Provider、Broker、Artifact、Resource、Observability 通过稳定 Grant/Verification/Projection 组合，不跨层泄露 PKI、Host 或 Vendor Evidence。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `DEPLOYMENT_SPEC.md`, `CONFIG_SPEC.md`, `SUPPLY_CHAIN_SECURITY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `EVENT_SPEC.md`, `PERFORMANCE_SPEC.md`, `DATABASE_SPEC.md`, `TEST_SPEC.md`, `QUALITY_GATE_SPEC.md`.

Components: future reviewed Machine Identity/Enrollment capability, Attestation Verifier adapter, Node Inventory repository/projection, Node Agent delivery component, `crates/sdkwork-intelligence-sandbox-service`, `crates/sdkwork-sandbox-service-host`, future `sdkwork-sandbox-provider-firecracker`, REQ-2026-0012 Artifact Authority, and REQ-2026-0016 Scheduler/Capacity boundary.

Decision: [ADR-20260729: Sandbox Node Trust, Enrollment, Attestation And Verified Inventory](../../architecture/decisions/ADR-20260729-sandbox-node-trust-enrollment-attestation-and-inventory.md).

## Verification Plan

- `tests/contract/sandbox-node-trust-and-inventory.contract.test.mjs` 验证 Draft Gate、Sandbox 命名、Authority 分离、Bootstrap、Workload Identity/mTLS、Authentication-vs-Attestation、Verified Inventory、Scheduler Binding、Rotation/Revocation、Drain/Quarantine、Recovery、Error/Privacy/Bounds 和 Event/Metric。
- Runtime 阶段增加真实 PostgreSQL Migration/Repository/Concurrency/PITR、CA/HSM/Trust Bundle/Rotation/Revocation、TLS 1.3 双向认证、Bootstrap Replay、Proof-of-possession、Clone、Clock Skew、Attestation Nonce/Baseline/Expiry、Inventory Sequence/TTL、Drain/Quarantine 和多副本 Reconciliation Test。
- Firecracker 阶段增加真实 Linux KVM Node Agent Package/Upgrade/Rollback、Artifact/Kernel Measurement、KVM/cgroup/netns Effective Capability、Node Restart/Loss、CA/Verifier Outage、Cross-node Clone 和 Scheduler Exclusion Evidence。

## Release Boundary

本需求只定义 Gate 0 候选边界，不创建 Rust Port/Crate、Node Agent、Enrollment/PKI/CA/HSM Service、Attestation Verifier/TPM/TEE Adapter、PostgreSQL Table/Migration、Scheduler/Provider Integration、Config、Service Unit、Deployment Profile 或 Public API/SDK。Architecture/Security/PKI/Attestation/Capacity/Database/Reliability/Operations/KVM 人工评审与真实 Machine Identity、Attestation、多副本、升级/故障证据完成前保持 `draft`，不得把静态 Contract Test 或普通 mTLS 解释为 Hardware Attestation、Trusted Node、Scheduler Safety、SaaS Readiness 或商业发布能力。
