# RUNBOOK: Sandbox Provider Failure Recovery

Status: candidate

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

Requirement: [REQ-2026-0002](../product/requirements/REQ-2026-0002-sandbox-lifecycle-core.md)

Verification: [REVIEW-20260728](../engineering/reviews/REVIEW-20260728-sandbox-lifecycle-core-verification.md)

## Operational Boundary

本 Runbook 定义 Sandbox Provider 故障时的恢复流程。当前状态为 `candidate`：Service Host、Observability Runtime、CLI 尚未交付，因此当前不得在生产环境执行自动恢复。

禁止通过直接修改数据库状态绕过 SandboxSession 状态机。禁止通过重启 Session 替代有界 Cleanup。

## Failure Classification

| 类别 | 描述 | 自动响应 | 人工介入 |
| --- | --- | --- | --- |
| ProviderStartupFailure | Provider 无法启动新 Allocation | 标记 Provider Unavailable | 检查 Host 资源/配置 |
| ProviderTimeout | Provider 操作超时 | 有界终止 + 重试 | 检查 Provider 健康状态 |
| LeaseLost | Sandbox Lease 竞争失败 | 放弃当前操作 | 检查 Reconciler 状态 |
| FencingConflict | Fencing Token 过期 | 拒绝操作 | 检查并发写来源 |
| CleanupFailure | Stop/Destroy 清理失败 | 标记 Binding Quarantine | 手动残留扫描 |
| KeyRotationFailure | 密钥轮换冲突 | 暂停轮换 | 检查 KMS/Repository |

## Required Signals

| Signal | Dimensions | Gate |
| --- | --- | --- |
| Provider health | provider_kind, provider_id, status | 健康/不健康/未知可审计 |
| Reconciliation lag | tenant_scope, page_size, cursor | 延迟在已批准预算内 |
| Lease conflict rate | tenant_scope, session_id | 不包含 Fencing Token 值 |
| Cleanup failure | binding_id, outcome | 触发 Quarantine |

## Preconditions

1. REQ-2026-0002 为 `accepted`，相关 ADR 已由人工评审标记为 `accepted`
2. PostgreSQL Repository 已初始化，Migration/Drift 状态为 Clean
3. Observability Pipeline 已部署，Metric/Trace/Audit 可查询
4. CLI 或 Operator Entry Point 已交付
5. Reconciliation Loop 已配置有界分页

## Procedure

### 1. 识别故障范围

- 查询 SandboxSession 状态矩阵，确认受影响 Session 范围
- 按 Provider/租户/时间窗口聚合故障
- 检查 Lease/Fencing Token 状态

### 2. 隔离故障 Provider

- 标记 Provider Descriptor 为 Unavailable
- 阻止新 Allocation 路由到故障 Provider
- 保持现有 Session 运行（如果安全）

### 3. 恢复 SandboxSession

- 对 Starting/Stopping/Destroying 状态启动 Reconciliation
- 使用有界分页（page_size <= 200）处理
- 每次 CAS 失败记录 Conflict，不覆盖并发写

### 4. 验证恢复

- 全量 Dry Verification
- 核对 Audit Event 完整性
- 确认 Lease 无孤儿持有

### 5. 恢复 Provider

- 确认 Host 资源/配置正常
- 标记 Provider Descriptor 为 Ready
- 渐进式恢复路由权重

## Hold And Recovery

任何恢复失败：
- 立即停止自动恢复流程
- 触发 Incident Response
- 保留现场快照供事后分析
