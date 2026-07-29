# RUNBOOK: CLI Destructive Operation Confirmation

Status: candidate

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

Requirement: [REQ-2026-0003](../product/requirements/REQ-2026-0003-secure-local-provider.md), REQ-2026-0008

## Operational Boundary

本 Runbook 定义 CLI 破坏性操作（Destroy、Force-Stop、Quota-Override、Artifact-Rollback）的确认策略。当前状态为 `candidate`：CLI 未交付，当前不得在生产环境执行破坏性操作。

## Destructive Operation Classification

| 操作 | 破坏性级别 | 确认要求 | 回滚能力 |
| --- | --- | --- | --- |
| Sandbox Destroy | 高 | 双重确认 + 显式目标 | 不可逆 |
| Session Force-Stop | 中 | 显式目标 + 原因 | 可能恢复 |
| Quota Override | 高 | 双重确认 + 审批 | 可回滚 |
| Artifact Rollback | 高 | 双重确认 + 影响评估 | 可回滚 |
| Provider Drain | 中 | 显式目标 + 维护窗口 | 可逆 |
| Key Revocation | 高 | 双重确认 + 撤销门禁 | 不可逆 |

## Confirmation Rules

1. **显式目标**：必须指定 SandboxId/SessionId/ProviderId，禁止通配符
2. **影响范围确认**：显示将被影响的资源数量
3. **双重确认**：高破坏性操作需两次独立确认
4. **审计记录**：所有确认操作记录 Actor、时间、原因
5. **输出限制**：不显示 Private Host Path 或 Secret

## Safety Invariants

- Destroy 不删除 Agents-owned Workspace
- Force-Stop 不跳过 Descendant Cleanup
- Provider Drain 不中断有活跃 Lease 的 Session
- Quota Override 不突破系统硬上限
- Key Revocation 不绕过 Rotation Runbook

## Output Redaction

CLI 输出必须遵守：
- 不显示 `SandboxProviderAllocationRef` 明文
- 不显示 Host Path/Device/Console Alias
- 不显示 Secret/Credential 值
- 不显示 Internal API Socket 路径
- 保留 Sandbox Identity (Opaque ID) 用于追踪
