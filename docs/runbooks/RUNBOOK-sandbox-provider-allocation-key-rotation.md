# RUNBOOK: Sandbox Provider Allocation Key Rotation And Old-key Revocation

Status: candidate

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

Requirement: [REQ-2026-0006](../product/requirements/REQ-2026-0006-sandbox-provider-allocation-key-rotation.md)

Decision: [ADR-20260728](../architecture/decisions/ADR-20260728-sandbox-provider-allocation-key-rotation-and-reencryption.md)

Verification: [REVIEW-20260729](../engineering/reviews/REVIEW-20260729-sandbox-provider-allocation-key-rotation-verification.md)

## Operational Boundary

本 Runbook 定义 `SandboxProviderAllocationRef` 保护密钥轮换与旧密钥撤销的生产门禁。当前状态为 `candidate`：批准的 Secret/KMS Adapter、Operator Entry Point、Worker、Audit/Event/Metric 与 Deployment Profile 尚未交付，因此当前不得执行生产轮换或撤销。

禁止使用 Ad-hoc SQL 改写 Ciphertext、Key ID、Key Version 或 Crypto Version。禁止通过直接删除 KMS Key、修改普通 Config、环境变量脚本或数据库批量 Update 绕过 `SandboxProviderAllocationProtector` 与 Repository CAS。

## Required Signals

生产执行入口交付前必须提供以下低 Cardinality、无 Secret/Ciphertext 的信号：

| Signal | Required dimensions | Gate |
| --- | --- | --- |
| Rotation page outcome | Provider profile, key version, outcome | Scanned、Re-encrypted、Conflict、Failed Count 可审计。 |
| Rotation duration | Provider profile, outcome | Page 与 Tenant Sweep 延迟在已批准预算内。 |
| Recovery smoke | Provider profile, key version, outcome | 活跃 Runtime Binding 使用新旧版本恢复的结果。 |
| Repository/KMS failure | Stable error class, retryable | 不包含 Tenant ID、Key Material、Ciphertext 或 Allocation Reference。 |
| Audit event | Actor, action, resource class, tenant scope, result, time, traceId | Key Activation、Sweep、Hold、Recovery Verification 与 Revocation 均可追溯。 |

Dashboard、Alert 与 Audit Sink 尚未实现时，轮换必须保持 Blocked。

## Preconditions

1. REQ-2026-0006 为 `ready` 或 `accepted`，相关 ADR 已由人工架构与安全评审标记为 `accepted`。
2. Composition 只通过批准的 Secret/KMS Adapter 注入 `SandboxProviderAllocationKeySource`，并能同时解析 Current 与全部仍被引用的 Historical Key ID/Version。Key ID 必须为 `1..=128` bytes printable ASCII；同步 Port 只能消费经评审的短生命周期本地 Key Handle 并在异步边界刷新，不得阻塞 Tokio Worker 发起远程 KMS 请求。
3. Operator Actor、Tenant Scope、Change Window、审批记录、Trace/Audit Context 和停止条件已经明确。
4. PostgreSQL Migration/Drift 状态为 Clean，Backup/PITR 与 Restore Exercise 在有效期内。
5. 已验证 Current Key 的 Protect/Restore、Historical Key Restore、错误 Key Identity Fail-closed 与 KMS Unavailable 行为。
6. 已清点所有 Tenant Scope；不得以抽样 Tenant 替代完整轮换与撤销门禁。
7. 运行能力提供有界 `sandbox_page_size`、Opaque Cursor、Pause/Resume、Conflict Retry 和 Dry Verification；Page Size 不得超过 200。

## Procedure

1. 在 KMS 中创建新版本并保持旧版本可解密；记录 Key ID、Old/New Version、审批人与变更窗口，禁止记录 Key Material。
2. 将新版本设置为 `SandboxProviderAllocationKeySource` 的 Current Key。先执行 Protect/Restore Canary，确认新写入只使用新版本且历史 Ciphertext 仍可恢复。
3. 对每个明确 Tenant Scope 调用受控轮换入口，从空 Cursor 开始，以批准的 `sandbox_page_size` 循环处理。每页记录 Scanned、Re-encrypted、Conflict、Failed Count 与 Next Cursor。
4. Conflict 只通过重新读取后重试下一轮扫描解决；不得覆盖并发 Lifecycle Save。KMS/Repository Failure 达到停止阈值时立即 Pause。
5. 每个 Tenant Sweep 结束后，从空 Cursor 执行 Dry Verification。只在零待处理记录且零未解决 Conflict 时将该 Tenant 标记为完成。
6. 对每种活跃 Provider Profile 执行 Runtime Binding Recovery Smoke，证明新版本 Ciphertext 可恢复且 Fencing、Tenant 与 Runtime Binding Identity 保持一致。
7. 所有 Tenant 完成后执行第二次全量 Dry Verification，并核对 Audit、Failure Queue、Retry Queue 与 Recovery Smoke Evidence。
8. 由独立人工安全审批确认撤销门禁。只有审批通过后才能 Disable/Retire 旧版本；Repository 与 Worker 不得自动撤销。
9. 撤销后持续观察已批准窗口；任何 Historical Key Lookup、Protection Failure 或 Recovery Failure 立即触发 Incident，并停止后续 Key Retirement。

当前仓库没有生产 Operator Command。Procedure 中的“调用受控轮换入口”必须由后续 Ready Requirement 交付的 Typed Port/Worker/API 实现；在此之前不得用手工 SQL 或临时脚本替代。

## Hold And Recovery

- **Conflict 增长：** Pause 当前 Tenant，保留新旧 Key，检查 Lifecycle Write Rate 与 CAS Metadata；从最后成功 Cursor 之前的安全边界重新扫描。
- **KMS/Repository Unavailable：** Pause 全部 Sweep，不撤销任何 Historical Key；恢复依赖后从已记录 Cursor 继续，并再次执行 Dry Verification。
- **Current Key Protect/Restore 失败：** 停止新轮换。若尚未产生新版本 Ciphertext，可经审批恢复旧 Current Key；若已有新版本 Ciphertext，必须同时保留新旧 Key 并修复 Current Key 可用性，禁止简单回退后删除新 Key。
- **撤销后出现 Historical Lookup：** 按 Key Incident 升级；优先恢复旧 Key 的受控 Decrypt 能力，冻结进一步撤销，并重新执行完整 Tenant Sweep 与 Recovery Smoke。
- **疑似明文或 Key Material 泄露：** 停止轮换，隔离日志/终端/事件输出，启动 Security Incident Response，不把可疑 Payload 复制到工单或普通日志。

## Evidence Checklist

- Change/Approval ID、Operator Actor、Tenant Scope、Old/New Key ID/Version。
- 每页 Count、Cursor、Outcome 与 Trace/Audit Reference，不包含 Ciphertext 或 Provider-private Allocation Reference。
- 每个 Tenant 的零待处理 Dry Verification。
- 全局第二次 Dry Verification 与未解决 Conflict/Failure 为零。
- 活跃 Provider Profile Recovery Smoke。
- PostgreSQL Drift、Backup/PITR 与 Restore Evidence。
- 旧密钥撤销审批、时间、KMS Outcome 与撤销后观察结果。

## Escalation

Primary owner: SDKWork Runtime Platform。Security owner、Database owner、Provider profile owner 与 Incident commander 必须在生产接入前由 Deployment/Operations Requirement 指定；任一 Owner 未解析时保持 Blocked。
