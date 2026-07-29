# REVIEW-20260729: Sandbox Node Trust, Enrollment, Attestation And Verified Inventory

Status: pending-human-review

Requirement: [REQ-2026-0017](../../product/requirements/REQ-2026-0017-sandbox-node-trust-enrollment-attestation-and-inventory.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-node-trust-enrollment-attestation-and-inventory.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - bootstrap credential replay, machine identity theft or clone, false attestation claim, stale inventory, capability/capacity spoofing, certificate expiry/revocation, unsafe drain/quarantine, scheduler trust bypass, and cross-tenant Firecracker placement.

## Scope

本 Review 请求人工评审 `SandboxNodeEnrollmentPort`、`SandboxNodeAttestationVerificationPort`、`SandboxNodeInventoryPublicationPort`、`SandboxNodeLifecycleControlPort`、短期 Node Identity/mTLS、Authentication-vs-Attestation、Verified Inventory、Rotation/Revocation、Drain/Quarantine、Clone/Compromise Recovery、Error/Privacy、Event/Metric 与 Scheduler Binding。

本 Review 不批准 Rust Port/Crate、Node Agent、Enrollment/PKI/CA/HSM Service、Attestation Verifier/TPM/TEE Adapter、Database Schema/Migration、Scheduler/Provider Runtime、Config、Service Unit、Deployment Profile、Public API/SDK 或 Hardware Attestation Claim。

## Candidate Contract Evidence

| Evidence | Result |
| --- | --- |
| `specs/sandbox-node-trust-and-inventory.contract.json` | Draft Enrollment/Identity/Attestation/Inventory/Lifecycle boundary; all Node Agent, PKI, verifier, database, runtime and deployment implementations are explicitly unauthorized. |
| `node --test tests/contract/sandbox-node-trust-and-inventory.contract.test.mjs` | PASS (10/10); static checks cover authority, naming, bootstrap, mTLS, attestation separation, verified inventory, scheduler binding, rotation/revocation, lifecycle recovery, privacy/bounds and telemetry. |
| `node --test tests/contract/*.test.mjs` | PASS (104/104); complete repository contract suite includes Node Trust/Verified Inventory integration with Firecracker delivery, Scheduler, PostgreSQL Quota/Capacity Persistence, and Observability authorities. |
| `specs/sandbox-multi-tenant-scheduling.contract.json` | Scheduler candidate snapshot requires this Node Trust contract and only consumes the verified projection. |
| `specs/sandbox-provider-delivery-gates.contract.json` | Cloud Firecracker preflight consumes this Node Trust/Inventory Gate before placement or allocation. |
| Sandbox Rust quality gates | PASS: `cargo fmt --all -- --check`, offline workspace check, 37 tests passed with 1 declared external PostgreSQL test ignored, and all-target Clippy with `-D warnings`. |
| SDKWork repository gates | PASS: docs standard, packages layout, strict component ports, application layering, Rust backend composition, identity naming, provider Session terminology, pagination, API operation/envelope, strict repository verification, docs-debt audit and baseline audit. |
| Upstream dependency chain | PASS: `sdkwork-agent-kernel` offline check and complete target-package tests include the `InvalidPageRequest` non-retryable validation mapping; `sdkwork-intelligence-agents-service` offline check and 286 tests pass with 5 declared external PostgreSQL tests ignored. |
| Real PKI/HSM, attestation, PostgreSQL, Node Agent, multi-replica and KVM evidence | Absent by design; no Node Trust runtime or production topology exists. |

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| NODE-01 | Enrollment、Attestation Verification、Inventory Publication 与 Lifecycle Control 使用四个独立 provider-neutral L3 Port。 | 固定高内聚权威并阻止 Scheduler/Provider/Broker 漂移。 | 重新划分并评审后才能导出 Port。 |
| NODE-02 | Bootstrap 短期单次且只传 Reference；Node 生成不可导出 Key并证明持有，Control Plane 分配 Opaque Reference。 | 限制 Bootstrap Replay、共享 Secret 和 Caller 冒充。 | Cloud Node Enrollment 保持阻塞。 |
| NODE-03 | steady-state Node Identity 短期、Key/Trust-domain/Audience-bound，使用 TLS 1.3 mutual auth、Trust Bundle、Rotation 与 Revocation。 | 建立可轮换、可撤销 Machine Identity。 | 不允许 Node 连接 Control Plane。 |
| NODE-04 | Authentication 与 Platform Attestation 分离；只有独立 Verifier 的 Fresh/Key/Artifact/Baseline-bound Evidence 可形成 Attested Profile。 | 防止把 Certificate/Heartbeat 冒充 Hardware Trust。 | 删除 Attestation Claim 或提交更严格模型重审。 |
| NODE-05 | Node Agent Publication 不是 Scheduler Authority；Control Plane 绑定 Identity/Attestation/Inventory/Artifact/Policy/Health/Capacity Revision 后签发 Verified Record。 | 阻止 Capability、Capacity 和 Trust Spoofing。 | Node 不进入 Scheduler Candidate。 |
| NODE-06 | 只有 Active 且证据新鲜的 Node 可调度；Drain/Quarantine/Revocation/Expiry 是硬过滤。 | 保持故障、维护和安全事件期间关闭失败。 | Cloud Placement 保持阻塞。 |
| NODE-07 | Rotation proof-of-possession、有界重叠、旧证书撤销；Clone/Compromise 同时 Quarantine 与 Revoke。 | 限制 Key Theft 和重复 Node Identity。 | 必须提交等价 Clone/Compromise 控制。 |
| NODE-08 | Operation Fingerprint、Revision/CAS、TTL、Sequence、bounded Retry/Reconcile 拒绝 Stale/Replay/Unknown。 | 支持多副本与重启后确定恢复。 | SaaS HA 保持阻塞。 |
| NODE-09 | Public/Error/Event/Metric 不暴露 Identity、Certificate、Raw Evidence、Host/Topology/Measurement/Capacity；Audit 使用 Opaque/Hash。 | 满足安全、隐私与低基数运营边界。 | 修订全部 Public/Telemetry Contract。 |
| NODE-10 | Local Provider 不要求 Enrollment；Cloud Firecracker 强制该 Gate；Single-node Firecracker 和 Vendor Attestation 分别后续评审。 | 保持 Local 语义与 Cloud Trust 不混淆。 | 需要新的 Deployment/Trust Profile 决策。 |

## Pre-review Blocking Findings

1. Machine Identity Trust Domain、Bootstrap Issuer、Enrollment Approver、PKI/CA/HSM、Certificate Profile、Key Storage、Trust Bundle、Rotation/Revocation/Clock Owner 未获批。
2. TPM/TEE/Cloud Attestation Mechanism、Evidence Format/Chain、Approved Boot/Kernel/Artifact Baseline、Verifier、Policy Revision 和 Outage/Privacy Owner 未选择。
3. Node Agent Component/Package/Binary、Privilege、Install/Upgrade/Rollback、Supply Chain、Config/Secret 与 Control-plane Endpoint 未设计或验证。
4. PostgreSQL Enrollment/Identity/Attestation/Inventory/Lifecycle Schema、Isolation、Sequence/CAS、TTL/Retention、PITR/RPO/RTO 与 Query Plan 未设计或验证。
5. Scheduler/Capacity 与 Provider Allocate 尚无真实 Verified Inventory Integration、Drain/Quarantine Propagation、Node Loss/Recovery 或 Multi-replica Race Evidence。
6. 没有真实 Linux KVM Bootstrap Replay、Key Clone、Certificate Rotation/Revocation、Attestation Replay/Stale/Baseline、Inventory Spoof/Stale、CA/Verifier Outage、Node Upgrade/Rollback 或 Incident Drill Evidence。

## Required Evidence Before Ready

- 接受 NODE-01..NODE-10 的 Architecture/Security/PKI/Attestation/Capacity/Database/Reliability/Operations/KVM Human Review。
- 固定 Machine Identity/Bootstrap/Certificate/Trust Bundle/Key Custody/Rotation/Revocation Contract 与可审计 Owner。
- 固定每个 Trust Profile 的 Attestation Format、Verifier、Approved Baseline、Freshness、Artifact/Key Binding、Privacy 与 Outage Contract。
- PostgreSQL Migration/Repository/Concurrency/Sequence/CAS/Role/Query-plan/PITR Evidence；Cloud 禁止 Memory/SQLite Trust Authority。
- Node Agent Package/SBOM/Provenance/Signature、最小 Privilege、Install/Upgrade/Rollback、Config/Secret 和 Supply-chain Evidence。
- 真实 Multi-replica Enrollment/Rotation/Revocation/Inventory/Drain/Quarantine/Recovery、Clone/Compromise、CA/Verifier Outage 与 Scheduler Exclusion Test。
- 真实 Linux KVM Artifact/Kernel/KVM Effective Evidence、Node Restart/Loss、Capacity Revision、Provider Allocate Gate 和 Cross-tenant Negative Evidence。
- Node Identity/Attestation/Inventory SLO、Dashboard、Alert、Compromise/Drain/Quarantine/CA Outage Runbook、Rollout/Rollback 与 On-call Owner。

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`. `Approved with follow-up` cannot defer Bootstrap Replay、Key Custody、mTLS/Rotation/Revocation、Authentication-vs-Attestation、Verified Inventory、Drain/Quarantine、Clone/Compromise、Scheduler Gate、Privacy 或真实 KVM/故障证据。

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | NODE-01, NODE-05..NODE-10 |
| Security identity owner | pending | pending | pending | NODE-02..NODE-09 |
| PKI/key custody owner | pending | pending | pending | NODE-02..NODE-03, NODE-07..NODE-08 |
| Attestation platform owner | pending | pending | pending | NODE-04..NODE-06, NODE-09 |
| Capacity/scheduler owner | pending | pending | pending | NODE-05..NODE-06, NODE-08, NODE-10 |
| Database/reliability owner | pending | pending | pending | NODE-02, NODE-05..NODE-08 |
| Firecracker/KVM operations owner | pending | pending | pending | NODE-04..NODE-08, NODE-10 |
| Observability/incident owner | pending | pending | pending | NODE-06..NODE-10 |

## Implementation Gate

REQ-2026-0017 remains `draft`, ADR remains `proposed`, and this Review remains `pending-human-review`. Until every required reviewer records `Approved` and blocking authorities are resolved, do not create public Ports/Crates, Node Agent, Enrollment/PKI/CA/HSM Service, Attestation Verifier/Adapter, PostgreSQL Tables/Migrations, Scheduler/Provider Integration, Config, Service Unit, Deployment Profile, Public API/SDK or Hardware Attestation Claim.
