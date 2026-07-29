# REVIEW-20260729: Sandbox Service Host Composition And Readiness

Status: pending-human-review

Requirement: [REQ-2026-0009](../../product/requirements/REQ-2026-0009-sandbox-service-host-composition-and-readiness.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-service-host-composition-and-readiness.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: high - runtime composition, secret/config boundaries, persistence authority, readiness, observability, and standalone/cloud parity.

## Scope And Inputs

本 Review 请求人工评审 L5 `sdkwork-sandbox-service-host` 的 typed Composition、Config/Secret/KMS/Telemetry/Store/Provider 注入、fail-closed Readiness、bounded Shutdown 与 Standalone/Cloud parity。评审输入包括 REQ-2026-0009、对应 ADR、Provider/Workspace Attachment ADR、`CONFIG_SPEC.md`、`DEPLOYMENT_SPEC.md`、`OBSERVABILITY_SPEC.md`、`SECURITY_SPEC.md`、`APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`、`RUNTIME_DIRECTORY_SPEC.md`、`COMPONENT_SPEC.md` 与 `TEST_SPEC.md`。

本 Review 不批准真实 Local/Firecracker Provider、HTTP/RPC Listener、Generated SDK、Scheduler/Quota/Metering、KMS 实现、Deployment Profile 或商业 Release。

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| HOST-01 | Service Host 固定为 L5 `runtime-service-host`，只负责构造和绑定组件。 | L2 Policy、L3 Port、L4 Mechanism、L5 Composition 与 L1/L6 Transport 分离。 | 必须更新 Layer/Component Ownership 后重审。 |
| HOST-02 | Host 只接收 typed `SandboxServiceHostConfig`，由 Runtime Bootstrap 从 approved source `etc/` profile 注入。 | 共享 Service/Repository/Provider 不读取环境变量、`.env` 或 Secret。 | 需要明确且更强的 Config Authority/Secret Boundary。 |
| HOST-03 | PostgreSQL Pool、Lifecycle Service、Provider Registry、Workspace Attachment、Secret/KMS、Telemetry、Clock/ID 都通过 Port 注入。 | Host 不创建 Pool、不运行迁移、不复制业务规则。 | 不得开始 Composition 实现。 |
| HOST-04 | `SandboxServiceHostReadiness` 按 Config/Store/Provider/Workspace/Secret/Telemetry/Fencing 分项检查，任一必需项失败均 fail closed。 | 无弱 Provider、Memory/SQLite Server fallback 或虚假 Running。 | 需要替代且可验证的 Readiness Authority。 |
| HOST-05 | Service Host 不挂载 HTTP/RPC Listener；Internal API、Gateway、SDK 由独立 Requirement/ADR 拥有。 | Host 可嵌入 Standalone/Cloud/Test Composition，避免路线/SDK 复制。 | 必须重划 L1/L5/L6 边界。 |
| HOST-06 | Standalone/Cloud 共享 L2/L3 Contract，差异只进入 L5 Profile/Infrastructure/Provider/Store/Cache/Telemetry。 | Kernel 和 Sandbox Service 不出现部署拓扑分支。 | 必须提交 parity 例外并重审。 |
| HOST-07 | Readiness/Health/Shutdown/Metric/Audit 只输出低基数、脱敏身份和 Outcome，Shutdown 使用有界 Deadline 且幂等。 | 满足 Observability/Security/Recovery 责任边界。 | 不得进入运行时实现。 |
| HOST-08 | Server/Cloud Lifecycle Authority 固定为注入的 PostgreSQL Repository；Memory 仅测试或明确单进程候选。 | 保持 REQ-0005 的数据库 Authority、CAS、Lease/Fencing 与恢复语义。 | 需重新评审 Persistence Authority。 |

## Pre-review Blocking Findings

1. Provider SPI、Local/Command/Firecracker ADR 仍未人工接受；Workspace Attachment 已形成 REQ-2026-0013 draft provider-neutral Composition/L4 Block Device mechanism contract，但其 Ownership/Storage/KMS/Device/Residue Review 未批准，Host 不能声明真实 Provider Ready。
2. Config/Secret/KMS/Telemetry 的具体 Owner、接口版本、供应链和运行时权限尚未记录；Workspace Port 候选命名已固定为 Host-facing `SandboxWorkspaceAttachmentPort` 与其后的 L4 `SandboxWorkspaceBlockDevicePort`，但实现 Owner 和运行时权限仍未批准。
3. Standalone/Cloud source `etc/` profile、runtime target、runtime directory、PostgreSQL/Redis/Secret 连接预算和部署 Owner 尚未形成可验证配置 Authority。
4. 当前 Service Host 仍为空骨架，尚无 Composition、Readiness、Shutdown 或真实依赖 wiring 证据；本 Review 不把空骨架当作实现。
5. Internal API/SDK、Scheduler/Quota/Metering、Operator、Deployment/Release 与 Incident Runbook 需要独立 Requirement，不得由 Host 偷含。

## Required Evidence Before Ready

- Architecture/Security/Operations/Config Owner 接受 HOST-01..HOST-08。
- typed Config schema、source `etc/` profile、Secret/KMS/Telemetry/Workspace Port 和 Runtime Directory/Shutdown 责任矩阵。
- Composition tests 覆盖依赖缺失、Identity/Assurance mismatch、Secret/KMS/Telemetry failure、Readiness 分项、Shutdown Deadline、重复调用和 Standalone/Cloud parity。
- Static/Component/Layering/Rust Composition/Config/Deployment/Observability validators 通过，且无 Provider/API/SDK/Scheduler 旁路。
- PostgreSQL Pool/Privilege/Database Authority 与 REQ-0005 的 Lease/Fencing/Recovery 证据绑定；Memory 不得进入 Server/Cloud fallback。

## Candidate Machine Contract Evidence

- `crates/sdkwork-sandbox-service-host/specs/sandbox-service-host-composition.contract.json` records the draft `SandboxServiceHostConfig`, standalone/cloud profile parity, injected Sandbox dependencies, seven fail-closed readiness dimensions, safe observation fields, forbidden sensitive fields, and bounded idempotent shutdown.
- `implementationAuthorized` remains `false`; the component contract continues to declare no public exports, provided/required ports, runtime entrypoints, or config keys.
- `tests/contract/sandbox-service-host-composition.contract.test.mjs` statically verifies Gate 0 status, `Sandbox*` type names, `sandbox_*` field/dependency names, profile parity, readiness completeness/redaction, shutdown semantics, and absence of executable surface.
- Verification evidence must be refreshed after every contract change; passing candidate tests does not replace the pending Architecture, Security, Operations/Release, Config/Secret/Telemetry, or Database human outcomes.

## Verification Evidence

Executed from `sdkwork-sandbox` on 2026-07-29:

- `cargo fmt --all -- --check` - passed.
- `cargo check --workspace --offline` - passed.
- `cargo test --workspace --offline` - passed; 41 unit tests passed and the external PostgreSQL integration test remained explicitly ignored without `SDKWORK_SANDBOX_TEST_DATABASE_URL`.
- `cargo clippy --workspace --all-targets --offline -- -D warnings` - passed.
- `node --test tests/contract/*.test.mjs` - 25 passed, 0 failed.
- `node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict` - passed.
- `node ../sdkwork-specs/tools/check-application-layering.mjs --root .` - passed.
- `node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .` - passed.
- `node ../sdkwork-specs/tools/check-identity-naming.mjs --root .` - passed.
- `node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .` - passed.
- `node ../sdkwork-specs/tools/check-workspace-packages-layout.mjs --root . --mode enforce` - passed.
- `node ../sdkwork-specs/tools/audit-repository-docs-debt.mjs --root .` - passed with zero repositories carrying debt.
- `node ../sdkwork-specs/tools/audit-repository-baseline.mjs --root .` - passed.

Cross-repository dependency evidence:

- `sdkwork-kernel`: `cargo check -p sdkwork-agent-kernel --offline`, 160 kernel tests, and Clippy with `-D warnings` passed; `SandboxSessionRepositoryError::InvalidPageRequest` maps to a non-retryable Runtime `ValidationError`.
- `sdkwork-agents`: workspace check passed; Open API route-manifest contract passed; PostgreSQL migration baseline passed, while two gateway/IAM tests remained explicitly ignored without an initialized external IAM PostgreSQL schema.
- Cargo manifests preserve `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`; no reverse kernel/agents dependency exists in `sdkwork-sandbox`.

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`。`Approved with follow-up` 不得推迟 Secret、Readiness、Persistence Authority、Profile parity 或 Shutdown 责任。

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | HOST-01, HOST-05, HOST-06 |
| Security owner | pending | pending | pending | HOST-02, HOST-04, HOST-07 |
| Operations/Release owner | pending | pending | pending | HOST-04, HOST-06, HOST-07 |
| Config/Secret/Telemetry owner | pending | pending | pending | HOST-02, HOST-03, HOST-07 |
| Database owner | pending | pending | pending | HOST-03, HOST-08 |

## Implementation Gate

在所需 Reviewer 全部 `Approved`、依赖 Port Owner 和 profile Authority 固定前，REQ-2026-0009 保持 `draft`、ADR 保持 `proposed`；不得新增 Service Host Public Export、Config Key、Runtime Entrypoint、Secret/KMS wiring、Readiness implementation 或 Deployment Profile。

## Close-Out Checklist (Reviewer 执行项)

Review Approved 前必须逐项核验：

- [ ] REQ-STATUS: 对应 REQ 处于 `ready` 或 `accepted`
- [ ] ADR-STATUS: 对应 ADR 处于 `accepted`
- [ ] ARCHITECTURE-REVIEW: 接口契约、命名、Port 边界、L0-L6 分层符合 COMPONENT_SPEC / LAYERED_ARCH
- [ ] SECURITY-REVIEW: 数据分类、红字规则、零化清理、Secret 流、并发控制(Lease/Fencing)符合 SECURITY_SPEC
- [ ] PERFORMANCE-REVIEW: 有界 Page/Buffer、低 Cardinality Metric、Backpressure 符合 PERFORMANCE_SPEC
- [ ] OBSERVABILITY-REVIEW: Trace/Audit/Event/Outbox/Meter 符合 OBSERVABILITY_SPEC
- [ ] TEST-EVIDENCE: Unit Test 全量通过；Contract Test 通过；Common Conformance 候选 Scenario 可运行
- [ ] DEPENDENCY-DIRECTION: cargo tree 方向为 `sdkwork-agents -> sdkwork-kernel -> sdkwork-sandbox`；无反向引入
- [ ] EVIDENCE-SIGN-OFF: 对应 Verification (`REVIEW-...verification.md`) 接受状态非 pending
- [ ] HUMAN-REVIEW-DECISION: Decision Matrix 每条 CMD-xxx / LOC-xxx / FIR-xxx 均有 `Approved` 或 `Changes requested` + 替代方案

## Exit Gate

本 Review 标记 Approved 需同时满足：
1. 全部 Checklist 项勾选完毕
2. 同 REQ/ADR 的所有 Reviewer Role（Architecture / Security / Kernel / Operations / Database / Product）均表决 Approved
3. 如存在 `Changes requested`，替代方案须写入 REQ/ADR 并触发 narrow re-review
4. REQ 进入 `ready`，ADR 进入 `accepted`
5. `specs/sandbox-provider-delivery-gates.contract.json` 的 `implementationAuthorized` 在最后一个 Review 通过后可被置为 `true`

未经上述门禁，禁止把该 REQ 对应组件进入 V1 Local Runtime 实现阶段。
