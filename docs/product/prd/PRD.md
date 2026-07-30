# SDKWork Sandbox PRD

Status: active

Owner: SDKWork Runtime Platform

Application: sandbox

Updated: 2026-07-30

Specs: `REQUIREMENTS_SPEC.md`, `DOCUMENTATION_SPEC.md`, `SECURITY_SPEC.md`, `DEPLOYMENT_SPEC.md`, `PERFORMANCE_SPEC.md`

## 文档地图 (Document Map)

- [能力、生命周期与产品规则](PRD-capabilities.md)
- [交付路线图与阶段门禁](PRD-roadmap.md)
- [REQ-2026-0001: 初始化 Sandbox 工程基础](../requirements/REQ-2026-0001-sandbox-foundation.md)
- [REQ-2026-0002: 交付 Provider-neutral Sandbox 生命周期核心](../requirements/REQ-2026-0002-sandbox-lifecycle-core.md)
- [REQ-2026-0003: 交付受约束的 Local Sandbox Provider](../requirements/REQ-2026-0003-secure-local-provider.md)
- [REQ-2026-0004: Agents Workspace 与 Sandbox Attachment](../requirements/REQ-2026-0004-agents-workspace-attachment.md)
- [REQ-2026-0005: 持久化 Sandbox Session Repository 与崩溃恢复](../requirements/REQ-2026-0005-durable-sandbox-session-repository-and-reconciliation.md)
- [REQ-2026-0006: Sandbox Provider Allocation 密钥轮换与有界重加密](../requirements/REQ-2026-0006-sandbox-provider-allocation-key-rotation.md)
- [REQ-2026-0007: Provider-neutral Sandbox Command Execution Contract](../requirements/REQ-2026-0007-sandbox-command-execution-contract.md)
- [REQ-2026-0008: Firecracker Sandbox Provider](../requirements/REQ-2026-0008-firecracker-sandbox-provider.md)
- [REQ-2026-0009: Sandbox Service Host Composition And Readiness](../requirements/REQ-2026-0009-sandbox-service-host-composition-and-readiness.md)
- [REQ-2026-0010: Sandbox Observability, Event, Audit And Outbox Contract](../requirements/REQ-2026-0010-sandbox-observability-event-audit-outbox.md)
- [REQ-2026-0011: Sandbox Host Isolation Broker Boundary](../requirements/REQ-2026-0011-sandbox-host-isolation-broker.md)
- [REQ-2026-0012: Sandbox Firecracker Artifact Compatibility And Supply Chain](../requirements/REQ-2026-0012-sandbox-firecracker-artifact-compatibility-and-supply-chain.md)
- [REQ-2026-0013: Sandbox Workspace Block Device Attachment And Sanitization](../requirements/REQ-2026-0013-sandbox-workspace-block-device-attachment-and-sanitization.md)
- [REQ-2026-0014: Sandbox Firecracker Network Isolation And Egress Policy](../requirements/REQ-2026-0014-sandbox-firecracker-network-isolation.md)
- [REQ-2026-0015: Sandbox Firecracker Resource Isolation And Usage Facts](../requirements/REQ-2026-0015-sandbox-firecracker-resource-isolation-and-usage.md)
- [REQ-2026-0016: Sandbox Multi-tenant Admission, Scheduling And Capacity](../requirements/REQ-2026-0016-sandbox-multi-tenant-admission-scheduling-and-capacity.md)
- [REQ-2026-0017: Sandbox Node Trust, Enrollment, Attestation And Verified Inventory](../requirements/REQ-2026-0017-sandbox-node-trust-enrollment-attestation-and-inventory.md)
- [REQ-2026-0018: Sandbox PostgreSQL Quota And Capacity Reservation Persistence](../requirements/REQ-2026-0018-sandbox-postgresql-quota-and-capacity-reservation-persistence.md)
- [REQ-2026-0019: Sandbox Runtime Pool And Fast Allocation](../requirements/REQ-2026-0019-sandbox-runtime-pool-and-fast-allocation.md)
- [REQ-2026-0020: Sandbox Lifecycle Hot State And Idempotency Retention](../requirements/REQ-2026-0020-sandbox-lifecycle-hot-state-and-idempotency-retention.md)
- [REQ-2026-0021: Sandbox Workspace Runtime Transaction And Checkpoint](../requirements/REQ-2026-0021-sandbox-workspace-runtime-transaction-and-checkpoint.md)
- [REQ-2026-0022: Sandbox Standalone Data Residency And Recovery](../requirements/REQ-2026-0022-sandbox-standalone-data-residency-and-recovery.md)
- [技术架构](../../architecture/tech/TECH_ARCHITECTURE.md)

## 1. 背景与问题 (Background And Problem)

Codex、Claude Code、OpenCode、Gemini CLI、Qwen Code 等 AI Coding Agent 在执行任务时，需要运行命令、读写工作区、构建代码、启动浏览器、开放端口，并保存可恢复的会话状态。`sdkwork-kernel` 负责 Agent Provider、Prompt、模型交互、工具编排和 Agent 行为，但不应同时内置 Windows、macOS、Linux、Docker、Firecracker、gVisor、Kubernetes 与 Remote VM 的所有执行机制。

本地开发、企业私有化、SaaS、Web IDE、Remote Coding、Browser Coding、CI/CD 和 Serverless Agent 对隔离、调度、存储和可观测性的要求不同。如果缺少独立运行时边界，Kernel 消费方只能直接获得不安全的宿主机权限，或者在 Kernel 内累积大量 Provider 分支，最终无法维持一致的生命周期、安全、配额和恢复语义。

SDKWork Sandbox 是面向 SDKWork Agent 的 Provider 无关执行环境。它将“在哪里执行、如何隔离”收敛为基础设施选择，同时保持 Kernel 面向的 Runtime 契约稳定。

## 2. 目标用户 (Target Users)

| 用户 | 核心诉求 |
| --- | --- |
| 本地开发者 | 在 Windows、macOS 或 Linux 上绑定本地 Workspace，无需部署服务器即可运行 Agent。 |
| 企业运维人员 | 在私有基础设施中执行 Agent，并控制网络、文件系统、Secret 与资源策略。 |
| SaaS 平台运维人员 | 在多租户集群中调度 Session，使用 Pool、Quota、Metering、Snapshot 和故障恢复。 |
| SDKWork Kernel 集成人员 | 使用同一 Runtime 契约，不按 Local、Docker、Firecracker、gVisor、Kubernetes 或 Remote VM 编写行为分支。 |
| Sandbox Provider 开发者 | 实现并验证新的 Provider，而无需修改 Kernel 或产品生命周期策略。 |
| IDE 与自动化开发者 | 通过稳定 SDK 获取终端、日志、事件和状态流，而不是适配各 Provider 私有协议。 |

## 3. 目标与非目标 (Goals And Non-Goals)

### 目标

- 为本地、私有化与 SaaS 组合提供一套经过评审的 Runtime 契约。
- 将 Agents-owned 持久 Workspace 与可销毁 Sandbox 分离。
- 让 BirdCoder Local 与 Cloud 复用同一 Workspace Revision、运行分配、Command、耐久 Checkpoint 和补偿语义；Local Workspace 默认不隐式上传，全部数据留在设备上的声明必须通过独立驻留/恢复 Gate，Cloud 通过隔离 Attachment 挂载持久数据。
- 为每个 `SandboxSession` 提供独立运行生命周期、`SandboxRuntimeBinding`、Quota、日志/事件流与恢复状态，同时不复制 `AgentSession` 业务聚合。
- 通过 SPI 与一致性测试扩展 Provider，不修改 Kernel。
- 先覆盖 Windows、macOS、Linux 的 Local Provider 平台发现与精确 Capability Matrix：Windows/Linux 只有真实 containment 通过后声明 Terminal，macOS 在 detached-descendant containment 获批前明确拒绝 Terminal；再以同一 Provider-neutral Command Contract 跑通 Linux KVM Firecracker Provider。Docker 明确延期到 Local 与 Firecracker 验证完成之后，后续再分阶段评审 gVisor、Kubernetes 与 Remote VM。
- 按 Provider 声明的隔离等级执行默认拒绝的文件系统、进程、网络、Capability、Secret 与资源策略。
- 让启动时延、容量、失败、配额、安全事件和 Provider 健康状态可观测。

### 非目标

- 不负责 Prompt、Model、Agent 推理、对话语义、Agent Provider SDK 或 Provider 特有 Agent 行为。
- 不替代 `sdkwork-kernel` 的工具编排或 MCP 协议语义；Sandbox 只提供受控的执行能力。
- 不负责 IAM 登录与租户身份权威，也不负责价格、账单和支付；Sandbox 只消费已验证身份/配额策略并输出计量事实。
- 不宣称 Local Provider 具备与容器、gVisor 或 microVM 相同的隔离强度。
- 不要求 V1 一次性实现全部 Provider；当目标隔离等级不可用时，禁止静默降级到更弱 Provider。

## 4. 范围 (Scope)

产品范围包括 Runtime、Session、Workspace Runtime Transaction、Sandbox Provider SPI、资源与配额执行、Scheduler、Pool、面向执行的 Filesystem/Terminal/Browser/Port 能力、Checkpoint/Snapshot、Cache 集成、Network Policy、Secret 注入、日志、指标、Trace、审计事件与恢复编排。

### 术语与所有权

`Runtime`、`Session`、`Workspace`、`Sandbox` 与 `Provider` 是本产品固定术语，不得用 `RuntimeLocation`、`SandboxSpec`、`SandboxInstance` 等替代词重命名领域概念。跨域实现按所有权限定名称：

| 固定术语 | 权威领域对象 | Sandbox Rust 字段/变量 | 预留 Wire 字段 | 所有权与映射 |
| --- | --- | --- | --- | --- |
| Workspace | `AgentWorkspace` / `SandboxWorkspaceId` | `sandbox_workspace_id` | `sandboxWorkspaceId` | `sdkwork-agents` 拥有 Identity、业务生命周期、授权与持久化；Kernel 只把已授权 Identity 映射为 Opaque Sandbox Context。 |
| Session | `AgentSession` / `SandboxSession` / `SandboxSessionId` | `sandbox_session_id`、`sandbox_session_state` | `sandboxSessionId`、`sandboxSessionState` | Agents 拥有业务聚合；Sandbox 只拥有 Provider-neutral 运行生命周期投影。 |
| Runtime | `SandboxRuntimeBinding` / `SandboxRuntimeBindingId` | `sandbox_runtime_binding`、`sandbox_runtime_binding_id` | `sandboxRuntimeBindingId` | Sandbox 拥有当前 Sandbox Provider Allocation 的运行绑定；Kernel 只向 Agents 暴露 Opaque `runtimeLocationId`。 |
| Sandbox | `SandboxId` | `sandbox_id` | `sandboxId` | Sandbox 生成并拥有可销毁的执行分配身份。 |
| Provider | `SandboxProvider` / `SandboxProviderId` / `SandboxProviderKind` / `SandboxProviderDescriptor` | `sandbox_provider`、`sandbox_provider_id`、`sandbox_provider_kind`、`sandbox_provider_descriptor` | `sandboxProviderId`、`sandboxProviderKind` | Sandbox Provider SPI 拥有执行环境契约；Kernel 不按具体 Sandbox Provider Kind 编写业务分支。 |
| Lifecycle Operation | `OperationId` / `SandboxSessionOperation` | `sandbox_operation_id`、`sandbox_session_operation` | `sandboxOperationId` | `OperationId` 是 SDKWork 共享类型；Sandbox 字段和变量用 `sandbox_` 表达所属生命周期。 |
| Lifecycle Ownership | `SandboxLeaseOwnerId` / `SandboxFencingToken` / `SandboxSessionLease` | `sandbox_lease_owner_id`、`sandbox_fencing_token`、`sandbox_session_lease` | 内部控制面契约，暂不承诺 Public Wire | Sandbox 使用 Tenant-scoped Lease 与单调 Fencing Token 防止多个控制器同时拥有 Provider Side Effect。 |

SDKWork 共享类型 `TenantId`、`OperationId`、`RuntimeCapability` 与 `IsolationAssurance` 保持标准名称，不创建 `SandboxTenantId`、`SandboxOperationId` 等重复别名。共享类型进入 Sandbox Command、Projection、Log 或 Event 后，存在领域歧义的字段和变量仍使用 `sandbox_` 前缀，例如 `sandbox_operation_id`、`sandbox_required_capabilities`、`sandbox_runtime_capabilities`、`sandbox_minimum_assurance` 与 `sandbox_isolation_assurance`；对应预留 Wire 字段为 `sandboxOperationId`、`sandboxRequiredCapabilities`、`sandboxRuntimeCapabilities`、`sandboxMinimumAssurance` 与 `sandboxIsolationAssurance`。

产品叙述继续使用 `Runtime`、`Session`、`Workspace`、`Sandbox` 与 `Provider`，不得为了实现命名而改写产品术语。Rust 类型、字段、局部变量、测试夹具和未来 API/事件示例必须使用上表的所有权限定名称；Sandbox-owned 上下文禁止使用无前缀的 `workspace_id`、`session_id`、`runtime_binding_id`、`operation_id`、`provider_id`、`lease_owner_id` 或 `fencing_token`。`SandboxProviderAllocationRef` 及变量 `sandbox_allocation_reference` 是 Provider 私有持久/恢复上下文，不得成为普通 Projection、Log、Event 或 Wire 字段。

公开错误和 Result 也属于领域契约：Identifier Boundary 使用 `SandboxIdentifierError`，生命周期使用 `SandboxLifecycleError`/`SandboxLifecycleResult`，Repository Port 使用 `SandboxSessionRepositoryError`/`SandboxSessionRepositoryResult`。应用尚未发布，不保留 `IdentifierError`、`LifecycleError`、`LifecycleResult`、`RepositoryError` 或 `RepositoryResult` 兼容别名。

生命周期控制权竞争使用 `SandboxLifecycleError::LeaseUnavailable`，已取得控制权后续租、令牌校验、持久化 Lease 校验或成功业务后的释放失败使用 `SandboxLifecycleError::LeaseLost`；已有 Provider/Readiness 错误不被并发释放错误覆盖。Reconciler 必须在取得 Lease 后重新读取权威 `SandboxSession`，不得依据 Lease 前陈旧状态触发 Provider Side Effect。跨 Kernel 边界时 `LeaseUnavailable`/`LeaseLost` 映射为来源为 Runtime 的可重试 `KernelErrorKind::Conflict`，不得误分类为参数校验或 Sandbox Provider 故障。

依赖方向固定为 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`。Sandbox 不依赖 Agents，不建立第二套 Workspace Registry，也不从 `sandbox_workspace_id` 猜测物理路径。

详细能力边界、状态机和产品验收规则见 [PRD-capabilities.md](PRD-capabilities.md)。阶段承诺与延期能力见 [PRD-roadmap.md](PRD-roadmap.md)。

## 5. 用户场景 (User Scenarios)

1. BirdCoder Desktop 通过本地 Agents 组合创建 Session，Kernel 把已授权的 Workspace/Revision 映射到 Local Sandbox 已打开的 Workspace Capability；当 REQ-2026-0022 的 Local-only 驻留/恢复证据通过后，Workspace、业务状态、Runtime State 和派生副本才能声明留在本机，停止运行环境、默认重置或卸载均不删除 Workspace。
2. SaaS 运维人员将同一 Runtime 请求提交到 Firecracker Provider，并附带由 `SandboxNetworkPolicyPort` 授权的显式 DNS/Egress Policy 请求、Secret 引用、CPU/Memory/Disk 限制和可审计策略；不存在有效 `SandboxNetworkPolicyGrant` 或合规 MicroVm Provider 时关闭失败，不回退 Local 或延期的 Docker Provider。
3. BirdCoder Cloud 通过 Agents/Kernel 请求 Firecracker Runtime；Sandbox 在 Capacity Reservation 后选择 Cold 或干净 Pool Slot，挂载不可变 Workspace Revision，执行命令，生成耐久 Checkpoint Candidate 并交由 Agents CAS 晋级 Revision，然后完成 Detach、Sanitization、Residue Scan 和资源归还。
4. Provider 开发者增加 Firecracker 适配器，通过生命周期、文件系统约束、网络、资源、事件与清理一致性测试，不改变 Kernel-facing 契约。
5. Kernel 仅请求 Capability 与隔离等级，不选择具体 Provider；不存在合规 Provider 时返回类型化错误，而不是降低隔离等级。

## 6. 成功指标 (Success Metrics)

| 指标 | 目标与证据 |
| --- | --- |
| Runtime 可移植性 | Firecracker Provider 候选完成前，同一 Command/Lifecycle Conformance 场景至少通过 Local 与真实 Linux KVM Firecracker；Kernel 不出现按 Provider 类型分支的业务行为。 |
| 本地可用性 | 当前 Windows、macOS、Linux CI Runner 上通过受支持的本地 Smoke 场景。 |
| 热分配速度 | 在公开参考环境中，Pool 到 Workspace 绑定 p95 小于 500 ms；冷启动单独统计。 |
| 生命周期正确性 | 可重试操作具备幂等证据；非法状态转换确定性失败；孤儿回收有恢复测试。 |
| 隔离安全 | 发布安全套件中不存在已知 Workspace 越界、禁止宿主机 Socket 挂载、云 Metadata 访问或日志 Secret 泄露。 |
| 恢复能力 | 可恢复 Session 能重新绑定 Workspace 与最后有效 Snapshot，且不会产生双重活动所有权。 |
| 可观测性 | 每个命令与生命周期操作携带 `traceId`，并在对应身份存在时关联 `sandboxSessionId`、`sandboxWorkspaceId`、`sandboxId` 与 `sandboxRuntimeBindingId`；Agents 关联另行使用 `agentSessionId`/`agentWorkspaceId`。 |
| 容量安全 | 并发 Session 准入不超过租户与节点配额；拒绝结果包含安全的重试信息。 |
| Workspace 持久性 | ReadWrite Runtime 释放前有耐久 Checkpoint/Handoff；并发 Writer 不覆盖新 Revision，断连恢复测试不存在静默丢写。 |
| 数据驻留与恢复 | Local 的 `device-local-persistence`/`strict-device-local-processing` 声明分别通过完整数据清单、无隐式远程持久化/内容外传、角色正确的本地数据库、备份恢复、导出清除和真实 OS/网络证据；Cloud Workspace 只通过 Drive 或批准的 Block-volume Authority 投影。 |

性能目标只有在参考硬件、工作负载、Provider 和统计方法被记录后才能作为发布门禁；它们不是对 Phase 0 空骨架的性能声明。

## 7. 阶段 (Phases)

- **Phase 0, Foundation：** 仓库基线、产品/架构 Canon、组件边界，无执行能力。
- **V1, Local Runtime：** Local Provider、Runtime/Session/Workspace 生命周期、Provider-neutral Command/Terminal 与核心工具能力、资源限制、结构化事件与日志。
- **V2, Isolated Cloud Runtime：** Firecracker、Scheduler、Pool、Snapshot、恢复、Cluster Placement，以及控制面/数据面分离。
- **V3, Elastic Platform：** 延期的 Docker Provider 重新评审，以及 Kubernetes、gVisor、Remote VM、GPU 策略、Browser Sandbox 研究与 Serverless 执行。
- **V4, Runtime Platform：** 多区域 SaaS、受治理 Provider 生态、工作负载感知调度，以及 SDKWork IDE/Browser/Workflow/DevOps 的统一接入。

详细阶段门禁见 [PRD-roadmap.md](PRD-roadmap.md)。Roadmap 条目只有在形成 `ready` 状态的 `REQ-*` 后才进入实施范围。

## 8. 关联需求 (Linked Requirements)

- [REQ-2026-0001: 初始化 SDKWork Sandbox 工程基础](../requirements/REQ-2026-0001-sandbox-foundation.md) - Phase 0 仓库、文档和组件边界。
- [REQ-2026-0002: 交付 Provider-neutral Sandbox 生命周期核心](../requirements/REQ-2026-0002-sandbox-lifecycle-core.md) - `SandboxSession`、Provider SPI、幂等生命周期与 Memory Repository 候选实现。
- [REQ-2026-0003: 交付受约束的 Local Sandbox Provider](../requirements/REQ-2026-0003-secure-local-provider.md) - HostUser Assurance、路径/进程约束与 Local Provider 安全门禁。
- [REQ-2026-0004: Agents Workspace 与 Sandbox Attachment](../requirements/REQ-2026-0004-agents-workspace-attachment.md) - Agents Workspace 权威、Kernel ID 映射与 Sandbox Attachment 边界。
- [REQ-2026-0005: 持久化 Sandbox Session Repository 与崩溃恢复](../requirements/REQ-2026-0005-durable-sandbox-session-repository-and-reconciliation.md) - PostgreSQL 权威、加密 Runtime Binding 恢复元数据、Lease/Fencing 与瞬态 Session 恢复。
- [REQ-2026-0006: Sandbox Provider Allocation 密钥轮换与有界重加密](../requirements/REQ-2026-0006-sandbox-provider-allocation-key-rotation.md) - 注入式版本化 Key Source、Tenant-scoped 重加密、页目标 Protection Version 稳定性、Session-bound 密文 CAS 与旧密钥撤销门禁。
- [REQ-2026-0007: Provider-neutral Sandbox Command Execution Contract](../requirements/REQ-2026-0007-sandbox-command-execution-contract.md) - Local 与 Firecracker 共用的 Executable/Argv、Limit、Fencing、Result、Error 与 Conformance。
- [REQ-2026-0008: Firecracker Sandbox Provider](../requirements/REQ-2026-0008-firecracker-sandbox-provider.md) - Linux KVM、Jailer、Artifact Integrity、cgroup、Network/Workspace Boundary 与 MicroVm Assurance。
- [REQ-2026-0009: Sandbox Service Host Composition And Readiness](../requirements/REQ-2026-0009-sandbox-service-host-composition-and-readiness.md) - L5 typed Composition、依赖注入、fail-closed Readiness、安全 Shutdown 与 Standalone/Cloud parity；保持 `draft`，不批准真实 Provider/API/Deployment。
- [REQ-2026-0010: Sandbox Observability, Event, Audit And Outbox Contract](../requirements/REQ-2026-0010-sandbox-observability-event-audit-outbox.md) - versioned event envelope、event catalog、structured telemetry、audit-fact 与 transactional Outbox 边界；保持 `draft`，不批准 Runtime exporter、worker、migration、API、SDK 或 deployment。
- [REQ-2026-0011: Sandbox Host Isolation Broker Boundary](../requirements/REQ-2026-0011-sandbox-host-isolation-broker.md) - Firecracker Host 特权固定操作、Local IPC、短期 Grant、Fencing/Idempotency、Audit、Cleanup 与 Supply-chain 边界；保持 `draft`，不批准 Broker runtime 或 privileged implementation。
- [REQ-2026-0012: Sandbox Firecracker Artifact Compatibility And Supply Chain](../requirements/REQ-2026-0012-sandbox-firecracker-artifact-compatibility-and-supply-chain.md) - Firecracker/Jailer/Guest Kernel/RootFS/Guest Agent 的不可变 Architecture Tuple、Evidence、Materialization、Revocation 与 Rollback 边界；保持 `draft`，不批准 Artifact 发布、下载、构建或 Provider runtime。
- [REQ-2026-0013: Sandbox Workspace Block Device Attachment And Sanitization](../requirements/REQ-2026-0013-sandbox-workspace-block-device-attachment-and-sanitization.md) - Agents/Drive Ownership、授权 Guest Block Device、At-rest Encryption、Fencing、Sanitization、Residue Scan 与 Quarantine 边界；保持 `draft`，不批准 Storage/KMS/Device/Provider runtime。
- [REQ-2026-0014: Sandbox Firecracker Network Isolation And Egress Policy](../requirements/REQ-2026-0014-sandbox-firecracker-network-isolation.md) - provider-neutral Policy Authority、`DenyAll`、显式 DNS/Egress Grant、永久 Metadata/Host/Tenant Lateral Denial、per-binding netns/Tap、Atomic Apply/Verify、Cleanup/Quarantine 与 Durable Audit 边界；保持 `draft`，不批准 Network Runtime。
- [REQ-2026-0015: Sandbox Firecracker Resource Isolation And Usage Facts](../requirements/REQ-2026-0015-sandbox-firecracker-resource-isolation-and-usage.md) - provider-neutral Resource Policy、Firecracker Machine Config/cgroup v2 CPU/Memory/PID/IO、Effective Readback、immutable Usage Fact、Commerce Ownership、Cleanup/Quarantine 边界；保持 `draft`，不批准 Resource/Quota/Billing Runtime。
- [REQ-2026-0016: Sandbox Multi-tenant Admission, Scheduling And Capacity](../requirements/REQ-2026-0016-sandbox-multi-tenant-admission-scheduling-and-capacity.md) - provider-neutral Admission/Node Inventory/Scheduler/Capacity Reservation、Hard Placement Filter、Tenant-aware Fairness、PostgreSQL Atomic Reservation、Fencing/Recovery 与 Resource Grant Binding 边界；保持 `draft`，不批准 Scheduler/Database/Node Agent/Pool Runtime。
- [REQ-2026-0017: Sandbox Node Trust, Enrollment, Attestation And Verified Inventory](../requirements/REQ-2026-0017-sandbox-node-trust-enrollment-attestation-and-inventory.md) - provider-neutral Enrollment/Attestation Verification/Inventory Publication/Lifecycle Control、短期 Machine Identity、Verified Inventory、Rotation/Revocation、Drain/Quarantine 与 Scheduler Binding 边界；保持 `draft`，不批准 Node Agent/PKI/Verifier/Database/Deployment Runtime。
- [REQ-2026-0018: Sandbox PostgreSQL Quota And Capacity Reservation Persistence](../requirements/REQ-2026-0018-sandbox-postgresql-quota-and-capacity-reservation-persistence.md) - `SandboxTenantQuotaState`、`SandboxAdmissionReservation`、`SandboxNodeCapacityState` 与 `SandboxCapacityReservation` 候选 PostgreSQL Authority、全局 Lock Order、CAS/Fencing、TTL/Quarantine、RLS/Role、PITR/RPO/RTO 及现有 `tenant_id TEXT` 到标准 `BIGINT` 的预发布迁移门禁；保持 `draft`，不批准 Table/Migration/Repository/Scheduler Runtime。
- [REQ-2026-0019: Sandbox Runtime Pool And Fast Allocation](../requirements/REQ-2026-0019-sandbox-runtime-pool-and-fast-allocation.md) - tenant-neutral `PreparedSlot`/`WarmMicroVmSlot`、fenced Claim、Sanitization/Residue/Quarantine、bounded scaling 与 fast-allocation evidence；保持 `draft`，不批准 Pool、Snapshot、Table、Worker、API、SDK 或 Deployment。
- [REQ-2026-0020: Sandbox Lifecycle Hot State And Idempotency Retention](../requirements/REQ-2026-0020-sandbox-lifecycle-hot-state-and-idempotency-retention.md) - bounded current-state projection、Tenant-scoped point-lookup idempotency ledger、current-operation-only hydration、Session limits、terminal retention、late retry 与 expand/backfill/cutover migration gate；保持 `draft`，不批准 Rust/Database/API/SDK/Kernel 实现。
- [REQ-2026-0021: Sandbox Workspace Runtime Transaction And Checkpoint](../requirements/REQ-2026-0021-sandbox-workspace-runtime-transaction-and-checkpoint.md) - Local/Firecracker lane parity、Workspace Revision Writer Lease、allocation/attachment/command/checkpoint/cleanup 顺序、耐久 Handoff、失败补偿与 bounded SaaS backpressure；保持 `draft`，不批准 Runtime/Storage/API/SDK/Kernel/BirdCoder 实现。
- [REQ-2026-0022: Sandbox Standalone Data Residency And Recovery](../requirements/REQ-2026-0022-sandbox-standalone-data-residency-and-recovery.md) - Local-only 四仓数据清单、设备本地持久化/严格本地处理声明、数据库角色、独立 Runtime Capability、无隐式传输、备份恢复、导出清除和真实 OS 证据；保持 `draft`，不批准数据库、配置、打包、遥测、同步或跨仓库实现。

后续 Runtime API、生命周期、Provider、Scheduler、安全、Snapshot、Cache 与 SaaS 工作必须在实施前拆分为可评审的需求记录。

## 9. 待决问题 (Open Questions)

- 各操作系统上的 Local Provider 最低隔离保证是什么，哪些 Workload 必须升级到 Firecracker 或更强 Provider？
- V1 与 V2 分别需要哪些 Workspace 持久化后端和保留等级？
- 第一版远程控制权威选择 HTTP internal-api、internal RPC，还是二者并存？
- Quota 策略、用量聚合和向 Commerce Billing 交接分别由哪个团队拥有？
- 哪一套参考机器与工作负载定义 500 ms 热分配目标？
- 哪些 Provider 能提供 Snapshot/Restore，跨 Provider 的最小可移植 Snapshot 契约是什么？
- 最大 Lifecycle Operation 数、最大活动 Session 生命周期、终态幂等保留窗口及窗口结束后的安全 Late Retry Outcome 分别是什么？
- 首个 Local 商业版本采用哪一种公开驻留声明，哪些数据类进入本地备份，以及其 RPO/RTO、保留和验证恢复预算分别是多少？
