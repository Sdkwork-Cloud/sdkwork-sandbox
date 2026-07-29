---
id: REQ-2026-0013
title: Define the Sandbox Workspace block-device attachment and sanitization boundary
owner: SDKWork Runtime Platform
status: draft
priority: critical
source: security
problem: Firecracker needs an authorized guest Workspace device without exposing host storage, duplicating Agents or Drive ownership, leaking encryption keys, or reusing a projection with cross-tenant residue.
goals:
  - Define one SandboxWorkspaceBlockDevicePort mechanism candidate behind the provider-neutral SandboxWorkspaceAttachmentPort for authorized, fenced, encrypted guest Workspace projection.
  - Preserve Agents-owned Workspace lifecycle and Drive-owned file/object storage while Sandbox owns only the bounded runtime attachment projection.
  - Define fail-closed readiness, detach, ephemeral sanitization, residue scan, quarantine, audit, and recovery behavior.
non_goals:
  - Create or delete AgentWorkspace records, Drive spaces/nodes/objects, or a block-volume provider.
  - Select a filesystem, encryption implementation, KMS, key algorithm, storage backend, volume manager, device mapper, mount tool, or guest driver.
  - Implement Snapshot/Restore, Workspace export/import, Secret injection, public API/SDK, Scheduler, Node Enrollment, deployment profile, Local Provider host directory access, or Docker Provider.
users:
  - SDKWork Agents and Kernel integrators
  - Sandbox Provider and Workspace attachment maintainers
  - Security, privacy, Drive, storage, and KVM operations reviewers
affected_surfaces:
  - cross-repository-contract
  - security
  - privacy
  - storage
  - composition
  - operations
---

# REQ-2026-0013: Sandbox Workspace Block Device Attachment 与 Sanitization 边界

## Readiness Blockers

- 人工接受 Agents Workspace Authorization/Revision Proof、Kernel Opaque ID 映射、Sandbox Session/Fencing、provider-neutral `SandboxWorkspaceAttachmentPort` Composition 边界与 L4 `SandboxWorkspaceBlockDevicePort` 机制候选命名。
- 确定实际 Backing Authority：SDKWork 文件/对象存储必须由 Drive 拥有；若需要独立 Block-volume Authority，必须先有独立 Ready Requirement/ADR，Sandbox 不得自行创建 Storage Provider。
- 确定 Workspace Revision/Retention/Deletion、ReadOnly/ReadWrite Policy、容量/IO Limit、Filesystem/Guest Driver、Integrity/Repair 与 Crash Recovery Owner。
- 确定 At-rest Encryption、Key Scope、KMS/Key Reference、Unwrap、Rotation、Revocation、Zeroization、Cryptographic Erase 与审计 Owner；本需求不实现 Secret/KMS。
- 确定 Provider-private Runtime Root、Device/Mapper 权限、Host Isolation Broker 操作、Detach/Sanitize/Reconcile/Quarantine、Residue Scan 与 Node Reuse Owner。
- 提供真实 Linux KVM Guest Block Device、VMM Crash、Node Restart、Stale Fencing、Sanitization Fault Injection 和 Cross-tenant Residue 环境。

## Candidate Acceptance Criteria

- Service Host 只注入 provider-neutral `SandboxWorkspaceAttachmentPort`，不按 Local/Firecracker 分支；Firecracker L4 机制候选为其后的 `SandboxWorkspaceBlockDevicePort`、`SandboxWorkspaceBlockDeviceRequest/Result/Error` 与 `SandboxWorkspaceAttachmentGrant`。Sandbox-owned 字段使用 `sandbox_` 前缀，未知字段关闭失败。
- 只允许 Prepare、Attach、Inspect、Detach 和 Sanitize Projection 五类 typed Operation。禁止任意 Shell、Host Path、Device Path、Mapper Name、Mount Namespace、Bucket/Object Key、Provider Endpoint/Credential、Presigned URL 或 Raw Encryption Key。
- `sdkwork-agents` 继续拥有 Workspace Identity、授权、Revision、Retention 和业务删除；Kernel 只映射已授权 Opaque Identity；Sandbox Service 只拥有 Session/Binding/Fencing/Attachment Orchestration；Attachment Adapter 只拥有 Runtime Projection；Host Isolation Broker 只执行授权的最小特权步骤；Provider 只消费已验证 Result。
- SDKWork 文件/对象存储适用时必须由 Drive 拥有 Provider/Object/Retention/Deletion 生命周期。Sandbox 不直接调用 S3/OSS/MinIO/Local Storage Provider SDK，不保存 Bucket/Object Key/Credential，不创建 Upload/Download/Object Lifecycle。独立 Block-volume Provider 必须由后续 Ready Requirement/ADR 明确所有权。
- `SandboxWorkspaceAttachmentGrant` 短期、签名并绑定 Tenant Scope、Workspace ID/Revision、Session、Runtime Binding、Provider、Fencing Token、Operation、Mount Mode、Capacity、Fingerprint、Nonce 与 Expiry；验证 Revocation/Replay/Clock，不依赖 Ambient Context。
- Firecracker 只接收独立 Guest Block Device，不直接挂载 Host Directory。RootFS、Workspace、Cache、Temp 与 Secret-bearing Ephemeral Data 使用不同生命周期；RootFS 只读。Workspace Device 不能跨活动 Tenant Binding 共享。
- Mount Mode 仅 `ReadOnly` 或 `ReadWrite`，必须由 Grant 显式授权；ReadOnly 不能被 Guest/Provider 提升。Filesystem/Mount Option 使用 Allowlist，Capacity Limit 在 Attach 前执行，Guest Mount Acknowledgement 后才可报告 Attached。
- Workspace Projection 按 Tenant + Workspace Revision + Projection 作用域执行 At-rest Encryption，并只使用外部 Key Reference。Raw Key 不进入公共契约、持久 Provider State、Log/Event/Metric/Audit Detail；仅可信 Node Boundary 解封，Memory Key 必须清零。Key Authority/Algorithm/KMS 在人工评审前保持未实现。
- Prepare/Attach/Detach/Sanitize 在副作用前验证最高 `sandbox_fencing_token`；同 Operation+Fingerprint 重放结果，不同 Fingerprint 冲突；状态和副作用记录原子，Node/Provider Restart 后可恢复。
- Readiness 同时证明 Authorization/Revision、Tenant/Session Binding、Fencing、Encryption、Integrity、Capacity、Mount Mode、Guest Acknowledgement 和 Prior Projection Residue Clear；Degraded 不得设置 `sandbox_workspace_attached=true`，也不单独构成 `MicroVm` Assurance。
- Stop/Destroy 先撤销 Guest Access、Flush、Unmount、Detach、关闭 Encryption Mapping、销毁 Ephemeral Key Handle/Overlay/Cache/Temp，再执行 Provider Projection Residue Scan 和 Audit。不得擦除、删除、归档或变更 Agents-owned Persistent Workspace Content。
- Ephemeral Projection 执行 Cryptographic Erase；只有底层 Capability Evidence 存在时才声称 Physical Discard/Secure Erase。Cleanup/Residue 状态失败或未知时 Attachment/Device/Node 进入 Quarantine，禁止跨 Tenant 重用并由有界 Reconciler 处理。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | 授权、Revision、Fencing、Encryption、Mount/Path、TOCTOU、Device Isolation、Key Handling、Cleanup 和 Residue 全部有负向测试并关闭失败。 |
| Privacy | Workspace 为 `tenant` Data；Secret-bearing Projection 为 `sensitive`。Retention/Deletion 服从 Agents/Drive/Approved Storage Authority，Telemetry 只记录安全 Opaque Identity/Outcome。 |
| Performance | Attach、Integrity Check、Guest Mount、Flush、Detach、Sanitize 与 Residue Scan 分别记录 p50/p95/p99；真实设备/数据规模基准前不设置虚假 SLO。 |
| Reliability | Crash/Restart/Stale Controller 不产生双重 Attachment；Partial Cleanup 不得返回 Pool；Quarantine/Reconcile 有界且可审计。 |
| Coupling | Agents、Kernel、Sandbox、Drive/Storage、Host Broker 与 Firecracker 只通过各自已批准的 Opaque Reference/Port 组合，不跨域复制模型或 Storage Credential。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `DRIVE_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `RUNTIME_DIRECTORY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `PERFORMANCE_SPEC.md`, `TEST_SPEC.md`.

Components: `crates/sdkwork-sandbox-provider-spi`, `crates/sdkwork-intelligence-sandbox-service`, future reviewed Workspace Attachment Adapter, future reviewed `sdkwork-sandbox-host-isolation-broker`, future reviewed `sdkwork-sandbox-provider-firecracker`, `sdkwork-kernel/sdkwork-agent-kernel`, Agents-owned Workspace Authority, and Drive or a future approved Block-volume Authority.

Decisions: [ADR-20260729: Sandbox Workspace Block Device Attachment And Sanitization](../../architecture/decisions/ADR-20260729-sandbox-workspace-block-device-attachment-and-sanitization.md), [ADR-20260728: Agents Workspace And Sandbox Attachment Ownership](../../architecture/decisions/ADR-20260728-agents-workspace-and-sandbox-attachment-ownership.md), [ADR-20260729: Firecracker Provider Isolation And Node Boundaries](../../architecture/decisions/ADR-20260729-firecracker-provider-isolation-and-node-boundaries.md), and [ADR-20260729: Sandbox Host Isolation Broker Boundary](../../architecture/decisions/ADR-20260729-sandbox-host-isolation-broker-boundary.md).

## Verification Plan

- `tests/contract/sandbox-workspace-block-device-attachment.contract.test.mjs` 验证 Draft Gate、Sandbox 命名、Ownership、Grant、Fencing、Device/Encryption、Readiness、Sanitization、Quarantine、Audit、Bounds 和 Storage Bypass 禁止。
- 实现阶段增加 Authorization/Revision、Grant Expiry/Replay/Revocation、Stale Fencing、Encryption/Key Rotation/Zeroization、Integrity/Mount/Capacity、Host/Device Path、Symlink/Hardlink/Mount/TOCTOU、Crash/Restart/Cleanup、Residue 与 Quarantine 测试。
- Drive-backed 或 Object-storage-backed Workspace 必须验证只消费稳定 Drive Reference/approved server-side facade，且不存在 Sandbox-owned Bucket/Object/Upload/Provider 生命周期；独立 Block-volume Backend 必须先有自己的 Ready Requirement/ADR/Test。
- 真实 Linux KVM Evidence 必须覆盖 Guest ReadOnly/ReadWrite Mount、IO/Capacity、VMM Crash、Node Restart、Detach、Sanitize Fault Injection、Cross-tenant Residue 和 Node Reuse Gate。

## Release Boundary

本需求只定义 Gate 0 候选边界。它不创建 Rust Port/Crate、Storage/Drive Adapter、Volume、Device、Filesystem、KMS、Runtime Path、Config、Service Unit、Deployment Profile 或真实 Sanitization。人工所有权、真实 Backend/Key/Node Evidence 与安全/隐私/运维评审完成前保持 `draft`，不得把静态 Contract Test 解释为 Workspace Data-plane Isolation 或商业发布能力。
