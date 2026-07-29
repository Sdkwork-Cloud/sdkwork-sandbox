# Gate 0 Exit Readiness Package

Status: active

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

## 目的

本文档汇总 Gate 0 退出所需的人工评审材料，为评审者提供一站式检查入口。

## Gate 0 退出条件

根据 `specs/sandbox-provider-delivery-gates.contract.json`：

1. `implementationAuthorized` 保持 `false` 直到所有 Review Packet 完成人工评审
2. 所有 Review Packet 状态为 `pending-human-review`
3. 人工评审通过后，门禁契约需同步更新为 `implementationAuthorized: true`

## 评审包总览

| # | Review ID | ADR | REQ | 风险 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 1 | REVIEW-20260729-sandbox-command-execution-architecture-security | ADR-20260729-sandbox-command-execution-and-terminal-boundary | REQ-2026-0007 | critical | pending-human-review |
| 2 | REVIEW-20260729-local-provider-architecture-security | ADR-20260728-local-provider-assurance-and-host-boundaries | REQ-2026-0003 | critical | pending-human-review |
| 3 | REVIEW-20260729-firecracker-provider-architecture-security | ADR-20260729-firecracker-provider-isolation-and-node-boundaries | REQ-2026-0008 | critical | pending-human-review |
| 4 | REVIEW-20260729-sandbox-firecracker-artifact-compatibility-and-supply-chain | ADR-20260729-sandbox-firecracker-artifact-compatibility-and-supply-chain | REQ-2026-0012 | high | pending-human-review |
| 5 | REVIEW-20260729-sandbox-workspace-block-device-attachment-and-sanitization | ADR-20260729-sandbox-workspace-block-device-attachment-and-sanitization | REQ-2026-0013 | high | pending-human-review |
| 6 | REVIEW-20260729-sandbox-firecracker-network-isolation | ADR-20260729-sandbox-firecracker-network-isolation-and-egress-policy | REQ-2026-0014 | critical | pending-human-review |
| 7 | REVIEW-20260729-sandbox-firecracker-resource-isolation | ADR-20260729-sandbox-firecracker-resource-isolation-and-usage-facts | REQ-2026-0015 | high | pending-human-review |
| 8 | REVIEW-20260729-sandbox-multi-tenant-admission-scheduling-and-capacity | ADR-20260729-sandbox-multi-tenant-admission-scheduling-and-capacity-reservation | REQ-2026-0016 | critical | pending-human-review |
| 9 | REVIEW-20260729-sandbox-node-trust-enrollment-attestation-and-inventory | ADR-20260729-sandbox-node-trust-enrollment-attestation-and-inventory | REQ-2026-0017 | critical | pending-human-review |
| 10 | REVIEW-20260729-sandbox-postgresql-quota-and-capacity-persistence | ADR-20260729-sandbox-postgresql-quota-and-capacity-reservation-persistence | REQ-2026-0018 | high | pending-human-review |
| 11 | REVIEW-20260729-sandbox-service-host-composition-and-readiness | ADR-20260729-sandbox-service-host-composition-and-readiness | REQ-2026-0009 | high | pending-human-review |

## 评审决策摘要

### CMD-01 至 CMD-11: Command Execution

| ID | 决策 | 接受效果 |
| --- | --- | --- |
| CMD-01 | SandboxProvider 保持 Lifecycle，Command 独立 Port | 接口隔离 |
| CMD-02 | 公共类型固定命名 | 进入 Provider SPI Public Export |
| CMD-03 | Terminal 第一版只表示有界非交互 Executable+Argv | 禁止 Command String/Shell |
| CMD-04 | Request 必须携带完整 Identity/Ownership | 副作用前验证 |
| CMD-05 | stdout/stderr 有界 Byte Buffer，不强制 UTF-8 | 保留任意字节 |
| CMD-06 | Timeout/Cancel/Output Limit 共用有界 Cleanup | 固定安全收敛语义 |
| CMD-07 | Descriptor 需 Lifecycle+Executor+Conformance 同时存在才声明 Terminal | 关闭失败 |
| CMD-08 | 同 Operation+Fingerprint 可重放，不同 Fingerprint 冲突 | 固定重试语义 |
| CMD-09 | Fingerprint 由 Sandbox Service 派生，Executor 必须重算 | 防伪造 |
| CMD-10 | Cancel 独立幂等，终态 Result 不伪装可重试错误 | 取消可审计 |
| CMD-11 | durable first-terminal CAS 仲裁竞争 | 终态唯一 |

### Local Provider (REQ-2026-0003) 决策

| 决策 ID | 决策 | 接受效果 |
| --- | --- | --- |
| LOC-01 | Kind 固定 `local`，Assurance 固定 `HostUser` | 不承诺更强隔离 |
| LOC-02 | 只通过已授权 Workspace Capability 访问 | 不任意读取 Host Path |
| LOC-03 | Process Supervision 需跨平台验证 | Windows/macOS/Linux 分别证据 |
| LOC-04 | 未验证 Egress 前不声明 Network/Browser/Port | 默认拒绝 |
| LOC-05 | Secret 只通过短期 Reference 注入 | 不进入 Debug/Log/Event |

### Firecracker Provider (REQ-2026-0008) 决策

| 决策 ID | 决策 | 接受效果 |
| --- | --- | --- |
| FIR-01 | Kind `firecracker`，Assurance `MicroVm` | 最强隔离级别 |
| FIR-02 | Artifact Tuple 需精确匹配 | 供应链完整 |
| FIR-03 | Node Trust 优先于 Provider Allocation | Cloud fails closed |
| FIR-04 | Confirmed Reservation-before-Allocate | 容量原子预留 |
| FIR-05 | Guest Auth 不替代 Host Attestation | 双层验证 |

## 评审退出后立即可执行的工作项

### Phase 1: Command Execution Port
在 `sdkwork-sandbox-provider-spi` 创建 `SandboxCommandExecutor` Port 与公共类型，Component Spec 更新端口声明。

### Phase 2: Local Provider
跨平台 Process Supervision 实现 (Windows Job Object / POSIX Process Group / cgroup)，Workspace Attachment Capability 注入，Environment/Timeout/Output/Cancellation/Fencing 真实执行。

### Phase 3: Firecracker Provider
KVM Preflight、Artifact 校验、Host Isolation Broker、Workspace/Network/Resource 实现。

### Phase 4: Service Host + CLI
L5 Typed Composition + Readiness，Operator CLI 命令。

## 已完成的人工评审

| Review | 状态 |
| --- | --- |
| REVIEW-20260728-sandbox-foundation-verification | accepted |
| REVIEW-20260728-sandbox-lifecycle-core-verification | conditional-pass |
| REVIEW-20260728-sandbox-postgresql-persistence-verification | conditional-pass |
| REVIEW-20260728-sandbox-workspace-attachment-boundary-verification | conditional-pass |
| REVIEW-20260729-sandbox-provider-allocation-key-rotation-verification | conditional-pass |
