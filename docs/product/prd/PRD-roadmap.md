# SDKWork Sandbox 交付路线图

Status: draft

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

Parent: [SDKWork Sandbox PRD](PRD.md)

## Phase 0: Foundation

交付物：独立仓库、SDKWork L1/L2 基线、完整目录字典、文档 Canon，以及当前七个分层 Rust 组件边界。Provider SPI、Sandbox Service、Memory Repository 与 PostgreSQL Repository 已进入候选实现；Local Provider、Service Host 与 CLI 仍未激活运行行为。

退出门禁：Cargo Workspace Check/Test 通过；文档、Workspace Layout、Component Contract、Naming 与 Repository Baseline 检查通过；代码不声称已经具备可用 Sandbox 执行能力。

## V1: Local Runtime

当前进度：`REQ-2026-0002` 已实现 Provider-neutral `SandboxSession` Lifecycle 候选契约和 Memory Repository Adapter；`REQ-2026-0004` 已固定 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`、Agents Workspace 权威与 `sandbox_*` ID 映射规则，并验证 Opaque Workspace Context 在 Allocate/Start Provider Request 中原样传递以及未附着 Readiness 关闭失败；`REQ-2026-0005` 已物化 PostgreSQL Repository、加密 `SandboxRuntimeBinding` 恢复元数据、Lease/Fencing、Provider 调用前续租、有界 Timeout 与瞬态 `SandboxSession` Reconciler；`REQ-2026-0006` 的版本化 Key Source、Tenant-scoped Re-encryption 与 Ciphertext Metadata CAS 已通过真实 PostgreSQL 候选验证，并形成旧密钥撤销 Runbook Candidate；`REQ-2026-0007` 已形成 Provider-neutral Command/Terminal 候选契约。生产 Physical Workspace Attachment、真实 Provider Fencing、Secret/KMS/Operator Composition、Command Executor 公共命名、跨平台 Process Supervision、多副本长稳/PITR/SLO、撤销演练与安全边界人工评审仍是门禁，真实 Local Host Execution 尚未激活。

交付顺序固定为 Local Provider -> 共享 Command/Terminal Conformance -> Firecracker Provider。Docker Provider 本阶段不实施、不作为测试替代、不作为 Capability 或 Assurance 回退。

候选需求切片：

1. Runtime Request/Response 与 Capability Negotiation 契约；实现对象固定为 `CreateSandboxSessionCommand`、`SandboxSessionLifecycleCommand`、`SandboxSession` 与 `SandboxRuntimeBinding`，不引入替代产品术语。
2. Agents-owned Workspace Identity 与 Sandbox-owned Containment/Attachment/Git Runtime Capability。
3. `SandboxSession`/`SandboxSessionState` 状态机与带 `sandbox_*` 字段的幂等生命周期 Command；共享 `OperationId` 在该边界使用 `sandbox_operation_id`。
4. Windows、macOS、Linux 的 Local Provider 与公开保证限制。
5. Provider-neutral Command/Terminal、Process、Filesystem、Environment 与 Build 能力；Port、Network 与 Browser 在专项 Requirement 前不声明。
6. Resource Limit、Log/Event Streaming、本地恢复与 Operator CLI。
7. PostgreSQL `SandboxSession`/Operation/`SandboxRuntimeBinding` Authority、Tenant-scoped Lease/Fencing 与 Crash Reconciliation；Memory Repository 不作为 Server Authority。

退出门禁：Windows、macOS、Linux 上受支持的 Local Provider Conformance 通过；Kernel 只使用经过评审的 Provider-neutral Port 且无 Sandbox Provider 分支；安全测试覆盖 Path Escape、Process Cleanup、Environment/Secret Redaction、Quota 与破坏性操作。未交付 Network Policy 前 Descriptor 不声明 Network/Browser/Port Capability。

## V2: Isolated Cloud Runtime

当前候选入口：`REQ-2026-0008` 与对应 Firecracker ADR 已定义 Linux KVM、Jailer、Artifact Integrity、cgroup v2、Network Namespace、Workspace Block Device、Vsock、Fencing、Cleanup 与 Tenant Sanitization 门禁。后续独立切片包括 Scheduler、Node Inventory、Admission、Placement、Warm Pool、Portable Checkpoint、Provider Snapshot、Recovery、Internal API/SDK、Cluster Service Host 与 Application Ingress。

退出门禁：多租户隔离与恢复 Threat Model 通过人工安全评审；Node Loss、Control Plane Restart、Pool Sanitization、Snapshot Integrity 与 Quota Contention 测试通过；Standalone 与 Cloud 保持同一契约。

## V3: Elastic Platform

候选需求切片：重新评审延期的 Docker Provider，以及 Kubernetes、gVisor、Remote VM、Enterprise Node Enrollment、GPU Policy、Multi-cluster、High Availability、Region-aware Placement 和 Browser Sandbox/WASM 可行性门禁。

退出门禁：Provider 限制可机器发现；多集群故障与容量测试达到定义的 SLO；GPU、Browser 或 WASM 未通过工作负载证据前不得对外宣称支持。

## V4: Runtime Platform

候选结果：为 SDKWork IDE、Web IDE、Desktop、Browser、Workflow、DevOps、Automation 与 Serverless Agent 提供统一执行底座；建立第三方 Provider 治理与 Conformance 体系；实现工作负载感知调度、成本/计量优化与多区域恢复。

每项工作都必须拥有独立 Requirement、必要 ADR、Verification、Release Evidence 与 Rollback Plan。版本标签只表达产品顺序，不构成对未评审范围的交付承诺。
