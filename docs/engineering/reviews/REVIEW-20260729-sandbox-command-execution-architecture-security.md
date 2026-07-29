# REVIEW-20260729: Sandbox Command Execution Architecture And Security

Status: pending-human-review

Requirement: [REQ-2026-0007](../../product/requirements/REQ-2026-0007-sandbox-command-execution-contract.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-command-execution-and-terminal-boundary.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - public Rust contract, execution security boundary, Provider composition, and cross-repository Kernel integration.

## Scope And Inputs

本 Review 请求人工评审 Provider-neutral `SandboxCommandExecutor`、公共 `SandboxCommandExecution*` 类型、Terminal Capability 语义、Fencing/Idempotency、Output/Environment Bound 与 Local/Firecracker Common Conformance。评审输入为 Product PRD、REQ-2026-0007、对应 ADR、[Provider Delivery Plan](../plans/PLAN-2026-0001-local-and-firecracker-provider-delivery.md)、`CODE_REVIEW_SPEC.md`、`SECURITY_SPEC.md`、`PERFORMANCE_SPEC.md`、`OBSERVABILITY_SPEC.md`、`RUST_CODE_SPEC.md` 与 `TEST_SPEC.md`。

当前实现只存在 Lifecycle Port；本 Review 不包含代码完成结论。Docker、Interactive PTY、Shell、Network、Browser、Port、Secret Injection、HTTP/RPC、SDK 与 Deployment Profile 不在本次批准范围。

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| CMD-01 | `SandboxProvider` 保持 Lifecycle Port；Command 使用独立 `SandboxCommandExecutor`，按同一 `SandboxProviderId` 组合。 | 保持接口隔离，进入公共 Contract 实现。 | 在修改 REQ/ADR 并重新评审前停止实现；不得创建 Provider-private `exec`。 |
| CMD-02 | 公共类型固定为 `SandboxCommandExecutionRequest`、`SandboxCommandLimits`、`SandboxCommandExecutionResult`、`SandboxCommandExitStatus` 与 `SandboxCommandExecutionError`。 | 允许进入 Provider SPI Public Export；Sandbox-owned 字段继续使用 `sandbox_*`。 | 记录替代命名及迁移影响，更新 PRD/REQ/ADR/Component Spec 后重审。 |
| CMD-03 | `RuntimeCapability::Terminal` 第一版只表示有界、非交互 Executable + Argv；禁止 Command String、Implicit Shell 与自动回退。 | Local/Firecracker 使用同一 No-shell Contract。 | Terminal Capability 必须拆分或重命名后重审，不能保留含混语义。 |
| CMD-04 | Request 必须携带 Tenant、Sandbox Workspace/Session/Allocation/Runtime Binding、Fencing Token 与 Command Operation Identity。 | Provider 能在副作用前验证 Ownership、Readiness、Fencing 与 Idempotency。 | 在缺失的身份/所有权契约明确前停止实现。 |
| CMD-05 | stdout/stderr 使用分别有界的 Byte Buffer 与 Truncated 标志，不强制 UTF-8；Raw Command、Argument、Path、Environment、Output 与 Provider-private Identity 不进入普通 Log/Metric。 | 保留任意字节并满足 Redaction/Bound。 | 需要给出等价的数据完整性、内存上限与隐私证明后重审。 |
| CMD-06 | Timeout、Cancel、Output Limit、Lease Lost 与 Provider Shutdown 共用有界 Descendant Cleanup Contract；Stale Fencing 在启动副作用前失败。 | Common Conformance 固定安全收敛语义。 | 不得声明 Terminal Capability。 |
| CMD-07 | Descriptor 只有在 Lifecycle Provider、匹配 Identity 的 Executor 与 Common Conformance 同时存在时才声明 Terminal；不一致时 Provider Unavailable。 | Composition 关闭失败且不夸大 Capability。 | 必须给出同等级的机器可验证 Capability Authority 后重审。 |
| CMD-08 | 同一 Operation ID + 同一 Request Fingerprint 可重放有界结果；不同 Fingerprint 返回 Conflict，不启动第二个 Command。 | 固定重试与重复提交语义。 | 在替代幂等模型与保留边界获批前停止实现。 |

## Review Evidence

- 当前 Provider SPI、Lifecycle Service、PostgreSQL Repository 与 Kernel Adapter 已通过 Cargo Test/Clippy、Component Port、Layering、Naming 与依赖链检查。
- Gate 0 下 Local crate 的 `#[cfg(test)]` Fake Host Boundary 已通过 5 个纯数据测试：Logical Relative Path/Windows 设备路径拒绝、Typed Argv 无 Shell 解析、Executable/Environment Allowlist、参数与环境边界；该 Harness 不访问 Host、不导出 Command Port，也不构成执行或隔离证据。
- `npm test` / `node --test tests/contract/provider-delivery-gate.contract.test.mjs` 通过 8 个跨组件 Contract Test，其中 4 个专门锁定 Gate 0 的 REQ/ADR 状态、Local 空 Port、延迟 Provider Crate 和公共 Command Port 禁止项。
- `cargo tree` 证明当前依赖方向为 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`；本设计不向 Kernel 引入 Local/Firecracker 分支。
- REQ/ADR 已定义 No-shell、Byte Output、Bounded Buffer、Stale Fencing、Idempotency、Cleanup、Redaction 与 Unsupported Capability Negative Cases。
- 真实 Local Host 与 Linux KVM Firecracker Evidence 尚不存在，不能作为本 Design Review 的完成证据。

## Candidate Contract Evidence

- `apis/commands/sandbox-command-execution-request.schema.json` fixes Sandbox identity, provider binding, fencing, request fingerprint, typed executable, bounded Argv, logical relative working directory, deny-by-default environment, and bounded limits.
- `apis/commands/sandbox-command-execution-result.schema.json` fixes binary-safe base64 output, truncation flags, bounded timing/resource usage, and a closed execution outcome set.
- `apis/commands/sandbox-command-execution-error.schema.json` fixes the safe error taxonomy and explicit retryability without host, allocation, or secret details.
- `apis/commands/sandbox-command-contract.json` fixes forbidden execution modes and common conformance scenario names.
- `node --test tests/contract/sandbox-command-contract.contract.test.mjs` passes 6/6. This is static contract evidence only and does not authorize implementation or replace human review.

## Blocking Review Questions

1. Architecture Reviewer 是否接受 CMD-01 至 CMD-08 的 Port、命名、Ownership 与 Composition Boundary？
2. Security Reviewer 是否接受 `Terminal` 的首版非交互语义、Output/Environment 数据分类与 Cleanup/Fencing Failure Model？
3. Kernel Owner 是否接受仅消费 Provider-neutral Port，并保持 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`？
4. Reviewer 若拒绝任一项，必须记录 Decision ID、替代方案、受影响 REQ/ADR/Component 与重新评审条件。

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`。`Approved with follow-up` 不得用于推迟公共命名、Fencing、Cleanup、Redaction、Capability Authority 或真实 Provider 安全证据。

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | CMD-01..CMD-08 |
| Security owner | pending | pending | pending | CMD-03..CMD-08 |
| Kernel integration owner | pending | pending | pending | CMD-01, CMD-02, CMD-04, CMD-07 |

## Implementation Gate

在所需人工 Reviewer 全部 `Approved` 前，REQ-2026-0007 保持 `draft`、ADR 保持 `proposed`，不得新增公共 Command Execution Port、类型或真实 Provider Command 实现。批准后才可把 REQ 改为 `ready`、ADR 改为 `accepted`，并按 Provider SPI -> Service/Registry -> Common Conformance -> Kernel/Agents Dependency Chain 的顺序实施。
