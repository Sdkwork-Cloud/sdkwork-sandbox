# SDKWork Sandbox 交付路线图

Status: draft

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

Parent: [SDKWork Sandbox PRD](PRD.md)

## Phase 0: Foundation

交付物：独立仓库、SDKWork L1/L2 基线、完整目录字典、文档 Canon，以及当前七个分层 Rust 组件边界。Provider SPI、Sandbox Service、Memory Repository 与 PostgreSQL Repository 已进入候选实现；Local Provider、Service Host 与 CLI 仍未激活运行行为。Sandbox Observability/Event/Audit/Outbox、Host Isolation Broker、Firecracker Artifact Compatibility、Workspace Block Device/Sanitization、Firecracker Network Isolation、Firecracker Resource Isolation/Usage、Multi-tenant Admission/Scheduling/Capacity、Node Trust/Verified Inventory 与 PostgreSQL Quota/Capacity Persistence 仅形成 `draft` 机器契约与静态 Contract Test，不代表运行时、存储迁移、KMS、网络、配额计量、调度或发布能力。

退出门禁：Cargo Workspace Check/Test 通过；文档、Workspace Layout、Component Contract、Naming 与 Repository Baseline 检查通过；代码不声称已经具备可用 Sandbox 执行能力。

## V1: Local Runtime

当前进度：`REQ-2026-0002` 已实现 Provider-neutral `SandboxSession` Lifecycle 候选契约和 Memory Repository Adapter；`REQ-2026-0004` 已固定 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`、Agents Workspace 权威与 `sandbox_*` ID 映射规则，并验证 Opaque Workspace Context 在 Allocate/Start Provider Request 中原样传递以及未附着 Readiness 关闭失败；`REQ-2026-0005` 已物化 PostgreSQL Repository、加密 `SandboxRuntimeBinding` 恢复元数据、Lease/Fencing、Provider 调用前续租、有界 Timeout 与瞬态 `SandboxSession` Reconciler，并固定 Start 恢复顺序为“稳定状态下清理旧 Allocation -> 原子保存 `Starting`/In-progress Start/无 Allocation Binding Intent -> Allocate”。故障注入已证明 Allocation 保存失败后 Reconciler 会以更高 Fencing Token 重新 Allocate 且只启动新 Allocation；Reconciler 抢 Lease 后会重读权威 Session，Renew/Save/Release 控制权故障统一为 `LeaseLost`，Memory/PostgreSQL 对 Fencing Token 上限耗尽一致关闭失败；`REQ-2026-0006` 的版本化 Key Source、Tenant-scoped Re-encryption、页目标 Protection Version 稳定性与 Tenant+Binding+Session+旧密文元数据 CAS 已通过真实 PostgreSQL 候选验证，并形成旧密钥撤销 Runbook Candidate；`REQ-2026-0007` 已形成 Provider-neutral Command/Terminal 候选契约。生产 Physical Workspace Attachment、真实 Provider Fencing、Secret/KMS/Operator Composition、Command Executor 公共命名、跨平台 Process Supervision、多副本长稳/PITR/SLO、撤销演练与安全边界人工评审仍是门禁，真实 Local Host Execution 尚未激活。

交付顺序固定为 Local Provider -> 共享 Command/Terminal Conformance -> Firecracker Provider。Docker Provider 本阶段不实施、不作为测试替代、不作为 Capability 或 Assurance 回退。

`REQ-2026-0007` 当前已有 `apis/commands/` draft Execution/Cancel Request、Result/Error Schema、Canonical Fingerprint/Idempotency/Terminal Completion Catalog 和静态 Contract Test；它们固定 `.` Workspace Root、可移植 Path/Windows Device 与 Console Alias/UTF-8 Byte Bound、Fenced Cancel、Command Result Replay、Result-unavailable 同 Operation 重试、durable first-terminal CAS、Outcome/Exit/Truncation、Cleanup Status/Binding Quarantine 与“已启动后终态 Result、启动前/结果不可得 Error”的共享语义，只用于人审输入，不授权 Rust Port、Host Process 或 Provider 实现。

候选需求切片：

1. Runtime Request/Response 与 Capability Negotiation 契约；实现对象固定为 `CreateSandboxSessionCommand`、`SandboxSessionLifecycleCommand`、`SandboxSession` 与 `SandboxRuntimeBinding`，不引入替代产品术语。
2. Agents-owned Workspace Identity 与 Sandbox-owned Containment/Attachment/Git Runtime Capability。
3. `SandboxSession`/`SandboxSessionState` 状态机与带 `sandbox_*` 字段的幂等生命周期 Command；共享 `OperationId` 在该边界使用 `sandbox_operation_id`。
4. Windows、macOS、Linux 的 Local Provider 与公开保证限制。
5. Provider-neutral Command/Terminal、Process、Filesystem、Environment 与 Build 能力；Port、Network 与 Browser 在专项 Requirement 前不声明。
6. Resource Limit、Log/Event Streaming、本地恢复与 Operator CLI。
7. PostgreSQL `SandboxSession`/Operation/`SandboxRuntimeBinding` Authority、Tenant-scoped Lease/Fencing 与 Crash Reconciliation；Memory Repository 不作为 Server Authority。

退出门禁：Windows、macOS、Linux 上受支持的 Local Provider Conformance 通过；Kernel 只使用经过评审的 Provider-neutral Port 且无 Sandbox Provider 分支；安全测试覆盖 Path Escape、Process Cleanup、Environment/Secret Redaction、Quota 与破坏性操作。未交付 Network Policy 前 Descriptor 不声明 Network/Browser/Port Capability。

## V1 Composition Governance Slice: Service Host

`REQ-2026-0009` 与对应 ADR 当前为 `draft`/`proposed`，只定义 L5 typed Service Host Composition、依赖注入、fail-closed Readiness、安全 Shutdown 与 Standalone/Cloud parity。它不激活 Local/Firecracker Provider、HTTP/API/SDK、Scheduler、Secret/KMS 实现或 Deployment Profile；实现前必须完成相关公共命名、Config/Secret/Telemetry Port、Workspace Attachment、Provider Fencing 和运维 Owner 的人工评审。

## V1 Governance Slice: Observability And Events

`REQ-2026-0010`、对应 ADR 和 Review 当前分别为 `draft`/`proposed`/`pending-human-review`。`apis/async/` 已形成 Sandbox-owned AsyncAPI、`SandboxEventEnvelope`、精确 `sandbox.*` Event Catalog、Outbox Contract、`SandboxAuditRecord` 与 Observability Catalog，通过静态 Contract Test 明确 telemetry、audit-fact、billing fact、retention、redaction、ordering、replay、idempotency、低基数指标、Trace、backpressure 和 PostgreSQL Outbox 事务边界。该切片不实现 Event Worker、Exporter、Outbox migration、API/SDK、Metering、Dashboard、Secret/KMS 或 Deployment Profile；Owner、Security/Privacy、Database、Operations、Retention、Release 和跨仓库 Trace Authority 人工评审完成前不得进入 `ready`。

## V2: Isolated Cloud Runtime

当前候选入口：`REQ-2026-0008` 与对应 Firecracker ADR 已定义 Linux KVM、Jailer、Artifact Integrity、cgroup v2、Network Namespace、Workspace Block Device、Vsock、Fencing、Cleanup 与 Tenant Sanitization 门禁。`REQ-2026-0016` 已固定 Admission、Node Inventory、Scheduler、Placement 与 Capacity Reservation，`REQ-2026-0017` 已固定 Node Trust、Enrollment、Attestation 与 Verified Inventory，`REQ-2026-0018` 已固定 PostgreSQL Quota/Capacity State、Reservation、Transaction/Lock/CAS/Fencing、Expiry/Quarantine、RLS/Role 与 Recovery 的 Gate 0 边界；后续独立切片包括这些边界获批后的实现 Requirement、Warm Pool、Portable Checkpoint、Provider Snapshot、Recovery、Internal API/SDK、Cluster Service Host 与 Application Ingress。

`REQ-2026-0011`、对应 ADR 和 Review 已把 Firecracker 的 Host Privilege 前置项收敛为 draft `SandboxHostIsolationBroker` 候选边界：固定八类 typed operation、Linux Unix Domain Socket、peer identity、短期签名 Grant、执行点 Fencing/Idempotency、最小 Privilege Profile、durable Audit 和 bounded Cleanup。当前仅有机器契约与静态测试，不创建 Broker crate/daemon/socket/service unit；Grant/KMS、Privilege、Journal、Protocol、Package/Upgrade/Rollback 和真实 KVM 证据完成人审前不得进入实现。

`REQ-2026-0012`、对应 ADR 和 Review 已把 Firecracker Artifact 前置项收敛为 draft `SandboxFirecrackerArtifactManifest` 候选边界：按 `linux-kvm-x86_64`/`linux-kvm-aarch64` 固定 Firecracker、Jailer、Guest Kernel、RootFS、Guest Agent 与可选 Initrd 的精确 Digest Tuple，要求 Signature、SBOM、Provenance、License、Advisory、只读原子 Materialization、Revocation/Drain/Quarantine 和 Previous-digest Rollback。当前不选择真实版本、不发布或下载 Artifact、不创建 Builder/Resolver/Provider Runtime；Release/Key/Advisory/Node Owner、真实签名 Evidence 与 Linux KVM Boot 完成人审前不得进入实现。

`REQ-2026-0013`、对应 ADR 和 Review 已把 Workspace Data-plane 前置项收敛为 draft `SandboxWorkspaceBlockDevicePort` 候选边界：Agents 保留 Workspace 业务权威，Drive 保留适用的文件/对象存储权威，Sandbox 只拥有一次 Session/Binding 的授权 Runtime Projection；Grant、Revision、Fencing、At-rest Encryption、Guest Device、Readiness、Detach、Ephemeral Cryptographic Erase、Residue Scan 和 Quarantine 关闭失败。当前不创建 Storage/Drive/Volume Adapter、KMS、Device、Mount 或 Sanitization Runtime；Backend/Key/Retention/Quarantine Owner 与真实 Linux KVM Evidence 完成人审前不得进入实现。

`REQ-2026-0014`、对应 ADR 和 Review 已把 Firecracker Network 前置项收敛为 draft provider-neutral `SandboxNetworkPolicyPort` 与 L4 `SandboxNetworkIsolationPort` 候选边界：默认 `DenyAll`，只接受显式 DNS/Egress Grant，永久拒绝 Cloud Metadata、Host Control Plane 与 Tenant Lateral Traffic；每个 Binding 独立 netns/Tap，Policy Revision/Fencing、Atomic Apply/Readback/Probe、Teardown/Residue/Quarantine 与 Durable Audit 关闭失败。当前不创建 Network Port/Adapter、netns、Tap、nftables/Firewall、Route、DNS Proxy 或 Runtime Config；Policy/Privilege/Network/KVM Owner 与真实 Linux KVM Evidence 完成人审前不得进入实现。

`REQ-2026-0015`、对应 ADR 和 Review 已把 Firecracker Resource 前置项收敛为 draft provider-neutral `SandboxResourcePolicyPort`、L4 `SandboxResourceIsolationPort` 与 immutable `SandboxResourceUsageFact` 候选边界：Firecracker Guest Shape 与 per-binding cgroup v2 CPU/Memory/PID/IO 双重执行，Grant/Ceiling/Node Reservation、Fencing、Effective Readback、typed Limit Outcome、Final Usage、Durable Handoff、Cleanup/Residue/Quarantine 关闭失败；Sandbox/Metric 不拥有 Price/Invoice/Payment。当前不创建 Resource Port/Adapter、Quota Engine、cgroup、Machine Config Runtime、Usage Collector/Aggregator 或 Commerce Adapter；Capacity/Policy/Commerce/KVM Owner 与真实 Evidence 完成人审前不得进入实现。

`REQ-2026-0016`、对应 ADR 和 Review 已把 SaaS 调度前置项收敛为 draft provider-neutral `SandboxAdmissionPolicyPort`、`SandboxNodeInventoryPort`、`SandboxSchedulerPort` 与 `SandboxCapacityReservationPort` 候选边界：Admission 原子预留 Tenant Quota，Scheduler 先执行 Capability/OS/Architecture/Assurance/Locality/Residency/Policy/Health/Capacity 硬过滤，PostgreSQL 原子 Reservation 在 Provider Allocate 前完成并约束 Resource Grant；Fairness、Fencing、Idempotency、Expiry/Orphan Recovery、Event/Metric 与隐私关闭失败。当前不创建 Scheduler/Admission Runtime、Database Schema、Node Agent/Enrollment、Warm Pool、Provider Placement 或 Commerce Runtime；IAM/Commerce/Node Trust/Database/Capacity/Operations/KVM Owner 与真实并发/规模/故障证据完成人审前不得进入实现。

`REQ-2026-0017`、对应 ADR 和 Review 已把 Cloud Firecracker Node Trust 前置项收敛为 draft provider-neutral `SandboxNodeEnrollmentPort`、`SandboxNodeAttestationVerificationPort`、`SandboxNodeInventoryPublicationPort` 与 `SandboxNodeLifecycleControlPort` 候选边界：Bootstrap 单次短期，Machine Identity Key-bound 且双向认证，Authentication 与 Platform Attestation 分离，Control Plane 只把 Identity/Attestation/Artifact/Policy/Health/Capacity Revision 一致且新鲜的 Verified Inventory 交给 Scheduler；Rotation/Revocation、Clone/Compromise、Drain/Quarantine、Event/Metric 与隐私关闭失败。当前不创建 Node Agent、PKI/CA/HSM、Attestation Verifier、Database Schema、Scheduler/Provider Integration 或 Deployment Profile；Security/PKI/Attestation/Database/Operations/KVM Owner 与真实 Machine Identity、Attestation、多副本、升级/故障证据完成人审前不得进入实现。

`REQ-2026-0018`、对应 ADR 和 Review 已把 REQ-2026-0016 的 PostgreSQL 前置项收敛为 draft `SandboxTenantQuotaState`、`SandboxAdmissionReservation`、`SandboxNodeCapacityState` 与 `SandboxCapacityReservation` 候选对象：State Counter 与 Reservation Fact 在同一短事务中按全局 Lock Order、Version CAS、Fencing、Database Clock 和完整事务重试更新；Confirmed/Bound 状态不确定时保留占用并 Quarantine，不能用 TTL 猜测释放。现有 `TenantId`/`tenant_id TEXT` 与 `SUBJECT_ID_SPEC.md` 正数 `BIGINT` 的偏差被列为新表实现前的预发布 Migration Blocker。当前四张 Lifecycle Active Table、Registry、Migration 与 Rust Repository 均未改变；Subject Migration、四表命名、RLS/Role、PITR/RPO/RTO 和真实 PostgreSQL/Firecracker 证据完成人审前不得实现。

退出门禁：多租户隔离与恢复 Threat Model 通过人工安全评审；Node Loss、Control Plane Restart、Pool Sanitization、Snapshot Integrity 与 Quota Contention 测试通过；Standalone 与 Cloud 保持同一契约。

## V3: Elastic Platform

候选需求切片：重新评审延期的 Docker Provider，以及 Kubernetes、gVisor、Remote VM、跨企业/私有云联邦 Node Enrollment、GPU Policy、Multi-cluster、High Availability、Region-aware Placement 和 Browser Sandbox/WASM 可行性门禁。基础 Cloud Firecracker Node Trust 已由 REQ-2026-0017 进入 V2 Gate 0，联邦 Enrollment 不能替代该基础安全门禁。

退出门禁：Provider 限制可机器发现；多集群故障与容量测试达到定义的 SLO；GPU、Browser 或 WASM 未通过工作负载证据前不得对外宣称支持。

## V4: Runtime Platform

候选结果：为 SDKWork IDE、Web IDE、Desktop、Browser、Workflow、DevOps、Automation 与 Serverless Agent 提供统一执行底座；建立第三方 Provider 治理与 Conformance 体系；实现工作负载感知调度、成本/计量优化与多区域恢复。

每项工作都必须拥有独立 Requirement、必要 ADR、Verification、Release Evidence 与 Rollback Plan。版本标签只表达产品顺序，不构成对未评审范围的交付承诺。
