# ADR-20260729: Sandbox Service Host Composition And Readiness

Status: proposed

Requirement: REQ-2026-0009

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `COMPONENT_SPEC.md`, `SOURCE_CONFIG_SPEC.md`, `CONFIG_SPEC.md`, `ENVIRONMENT_SPEC.md`, `DEPLOYMENT_SPEC.md`, `OBSERVABILITY_SPEC.md`, `SECURITY_SPEC.md`, `RUNTIME_DIRECTORY_SPEC.md`, `RUST_CODE_SPEC.md`, `TEST_SPEC.md`

## Context

Sandbox 已拥有 Lifecycle、PostgreSQL Repository、Provider SPI 和 Kernel Adapter 候选边界，但 `sdkwork-sandbox-service-host` 仍为空骨架。若直接在 Service、Repository 或 Provider Crate 中构造连接池、读取环境变量、初始化 Secret、选择 Provider 或挂载 HTTP Listener，会破坏 L2/L3/L4/L5 分层，并把 standalone、cloud、test 和 production 的安全语义混在一起。

Service Host 还必须把“进程能启动”与“已经可以安全接受 Sandbox Lifecycle”区分开。缺少 Runtime Directory Capability、Store、Provider Registry、Workspace Attachment、Secret/KMS、Telemetry 或 Fencing 依赖时，Host 必须报告不可用并关闭新请求，不得通过 Memory、Local、Docker 或其他弱 Provider 静默回退。

八个通用 Readiness 维度不足以证明某个执行 Profile 可用。Local 需要真实 Host Boundary；Firecracker 需要 Broker、Artifact、Workspace、Network 与 Resource 隔离；Cloud 还需要受信 Node、Admission/Scheduling 与权威 Capacity Persistence。Command/Terminal 也不能只根据 Provider Descriptor 开启，Pool 则不能反向成为 Cold Firecracker 的正确性依赖。

## Decision

1. `sdkwork-sandbox-service-host` 固定为 L5 `runtime-service-host`，唯一职责是从 typed Config 和注入 Ports 构造 Sandbox Service Composition；它不拥有 Domain Policy、SQL、Provider Mechanism、HTTP Route、SDK Authority 或 Scheduler Policy。
2. Host 通过 `SandboxServiceHostConfig` 接收明确的 profile ID、deployment profile、environment、runtime target、timeouts 和 enabled capability；Runtime Bootstrap 独占 source profile 解析，并只从八个精确候选 profile 生成安全归一化配置。Host 不直接读取 process environment、`.env`、Source Checkout 或 Secret Material，本 ADR 不物化 `etc/`。
3. Host 是唯一 Composition Root：它只接受已构造的 `SandboxSessionRepository`、`SandboxProvider` Registry、provider-neutral `SandboxWorkspaceAttachmentPort`、预打开 `SandboxRuntimeDirectoryCapabilities`、Secret/KMS Port、Telemetry Port 与 Clock/ID Port，并据此构造 `SandboxSessionLifecyclePort`；Lifecycle Service 不作为外部输入再次注入。外部 Database Composition 独占具体 PostgreSQL Pool、凭据、迁移与状态；Host 不接收 `DatabasePool`。REQ-2026-0013 的 L4 `SandboxWorkspaceBlockDevicePort` 只能组合在通用 Attachment Port 后方，Host 不按 Provider 分支。Redis 当前禁用。
4. Host 使用 `SandboxServiceHostReadiness` 表达 Config、Runtime Directory Capability、Store、Provider Registry、Workspace Attachment、Secret/KMS、Telemetry 和 Fencing 八个分项结果。任何必需项缺失、`degraded`/`unknown`、身份不匹配或 Assurance 不足都产生 fail-closed Readiness；不得用“部分可用”把 `SandboxSession` 置为 Running。
5. Host 通过可解析的 Machine Contract Dependency Gate 计算 Profile/Capability Readiness。依赖缺失、状态未知、仍为 Draft、待人工评审、缺少实现授权或未通过必需证据时关闭失败；Host 不得根据自己的进程状态推断依赖 Ready。
   Source `sandbox_profile_id` 仅标识 deployment/environment；Execution Profile ID 由配置中的 deployment profile 与 Service Policy/Provider Registry 已选择的 Provider Kind 精确派生，调用方不可覆盖。只允许 Standalone Local、Standalone Firecracker 和 Cloud Firecracker，未知组合及 Cloud Local 关闭失败，Profile Gate 必须先于 Provider Side Effect。
6. `standalone/local` 额外依赖 Local Host Boundary；`standalone/firecracker` 额外依赖 Host Broker、Artifact Compatibility、Workspace、Network 与 Resource Gate；`cloud/firecracker` 还依赖 Node Trust、Admission/Scheduling 和 PostgreSQL Quota/Capacity Persistence。Standalone 与 Cloud 共享 L2/L3 Contract，差异只由 L5 依赖闭包与 Infrastructure Composition 表达。
7. Command Capability 必须同时满足 Provider Descriptor、`SandboxCommandExecutor` 绑定、共同 Command Conformance 和平台 Cleanup Conformance。Terminal 还必须满足认证、后代监督与清理证据；Descriptor 单独不能开启 Capability，macOS Local Terminal 当前拒绝。
8. Runtime Pool 是 `cloud/firecracker` 的显式可选加速 Overlay，Cold Firecracker 不依赖 Pool。明确要求 Pool 的请求不得静默回退；可选 Pool 不可用时，仅在完整 Cold Cloud Gate 已 Ready 且 Assurance 不变时回退。
9. Host 不挂载 HTTP/RPC Listener。未来 Internal API、Generated SDK、Standalone Gateway 和 Cloud Ingress 分别由 L0/L1/L5/L6 Requirement/ADR 拥有；它们只能消费 Host 的 typed Composition/Observation Port。
10. Readiness、Health、Shutdown 和 Error Observation 只包含低基数、脱敏的 Sandbox Identity、Trace、Dependency、Outcome 和 Duration。禁止包含 Database URL、Token、Secret、Physical Path、Provider Allocation Reference、API Socket、Raw Command 或 Environment Value。
11. Shutdown 使用显式有界 Deadline，停止新 Provider Side Effect，按 Lease/Fencing 语义释放可释放资源并支持幂等重复调用。Deadline 超时必须产生结构化 Internal Failure 和 Operator-visible Observation，不得无界等待。
12. Memory Repository 只允许在测试或明确的单进程候选 Composition 中注入；Server/Cloud Composition 的 Lifecycle Authority 固定为 PostgreSQL，不允许 SQLite 或 Memory Fallback。
13. Bootstrap 按固定、有界、失败原子化顺序完成 safe config、Runtime Directory Capability、Secret Adapter、Database Composition/Repository、Telemetry、Audit/Outbox 与 Provider Registry 检查；失败按逆序清理。具体路径、数据库连接材料、Raw Key 和 Exporter Client 不进入 Host Composition Input。
14. Telemetry Adapter 必须先证明有界接收、脱敏与丢弃计数。外部 Exporter Outage 仅可记录为独立运维健康降级；Buffer Policy 成立时不降低必需 Adapter Readiness，Buffer Policy 失效则 Adapter Not Ready。Telemetry 不替代 Audit/Outbox Authority。
15. 本 ADR 不批准真实 Local/Firecracker Host/KVM、Secret/KMS 实现、Scheduler/Quota/Metering、API/SDK、Deployment Profile、Node Enrollment、Snapshot、Event Outbox 或商业 Release。

## Alternatives

### 在 Sandbox Service 内部构造 Repository/Provider/Config

拒绝。它会把 L2 业务规则与 L4/L5 机制耦合，破坏依赖注入、测试替换和 Standalone/Cloud Composition parity。

### 让 Service Host 直接读取环境变量和 Secret 文件

拒绝。Config/Secret Source 应由 Runtime Bootstrap 和批准的 Secret/KMS Adapter 拥有；共享 Service Host 直接解析会造成秘密边界、 profile 选择和测试隔离不一致。

### 把 HTTP Listener 放进 Service Host

拒绝。Listener、Route Authority、Internal API 和 Generated SDK 有独立 L0/L1/L6 所有权；Service Host 应保持可进程内组合和可测试。

### 依赖缺失时回退 Memory、Local 或 Docker

拒绝。弱化 Provider 或非权威 Store 会隐藏安全/可靠性缺口；Readiness 必须关闭失败并让 Composition/Operator 处理 Outage。

## Consequences

收益：Composition、Config、Secret、Telemetry、Persistence、Provider Registry 和 Lifecycle Policy 的责任清晰；同一 Sandbox Contract 可被 Standalone、Cloud 和 Test Host 复用；错误不会泄露基础设施细节或静默降级。

成本：需要额外的 typed Config、Readiness/Health、Shutdown、Secret/KMS、Telemetry、跨契约状态解析和 Profile/Capability Composition Test；API、Scheduler、Deployment、Provider 和多副本运维必须分别定义并通过人工评审。

## Verification

- Component Spec 验证 L5 `runtime-service-host`、Public Export、Required Port、Runtime Entrypoint 和 Config Key 所有权。
- Unit/Composition Test 验证 typed Config、依赖缺失、Identity/Assurance 不匹配、Secret/KMS/Telemetry Failure、Readiness 分项状态、Shutdown Deadline 和重复调用。
- Static scans 验证 Host 不拥有 HTTP Route/SQL/Provider-private DTO，不读取 Environment/`.env`，不接收或创建 Database Pool，不向 Kernel 引入 Provider 分支。
- Bootstrap Contract Test 验证八个 source profile、安全配置 allowlist、预打开 Runtime Directory Capability、Secret/KMS 零泄露、Repository-only 注入、Redis 禁用、Telemetry backpressure/redaction 和固定初始化/清理顺序。
- Standalone/Cloud parity Test 验证同一 L2/L3 Contract 下仅 Composition Profile/Infrastructure 改变。
- Cross-contract Test 验证依赖路径存在，`draft`、未知、待评审或未授权状态均关闭失败；Profile 闭包覆盖 Local、Cold Firecracker、Cloud Firecracker，Pool 不进入 Cold 必需集合。
- Capability Test 验证 Command/Terminal 不能只凭 Descriptor 开启，且 Terminal 必须继承 Command Gate 和平台监督/清理证据。
- Cargo、Component Port、Layering、Rust Composition、Naming、Documentation、Config、Deployment 和 Observability validators 必须通过；人工架构/安全/运维评审前保持 `proposed`。

## Supersedes / Superseded By

Supersedes: none.

Superseded by: none.
