# REVIEW-20260729: Sandbox Service Host Composition And Readiness

Status: pending-human-review

Requirement: [REQ-2026-0009](../../product/requirements/REQ-2026-0009-sandbox-service-host-composition-and-readiness.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-service-host-composition-and-readiness.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: high - runtime composition, secret/config boundaries, persistence authority, readiness, observability, and standalone/cloud parity.

## Scope And Inputs

本 Review 请求人工评审 L5 `sdkwork-sandbox-service-host` 的 typed Composition、Config/Secret/KMS/Telemetry/Store/Provider 注入、跨契约 Profile/Capability Gate、fail-closed Readiness、bounded Shutdown 与 Standalone/Cloud parity。评审输入包括 REQ-2026-0009、对应 ADR、Command/Provider/Local/Firecracker/Observability/Lifecycle/Pool/Standalone Data Residency 关联契约与评审包，以及 `SOURCE_CONFIG_SPEC.md`、`CONFIG_SPEC.md`、`ENVIRONMENT_SPEC.md`、`DEPLOYMENT_SPEC.md`、`OBSERVABILITY_SPEC.md`、`SECURITY_SPEC.md`、`PRIVACY_SPEC.md`、`DATABASE_SPEC.md`、`DATABASE_FRAMEWORK_SPEC.md`、`APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`、`RUNTIME_DIRECTORY_SPEC.md`、`COMPONENT_SPEC.md` 与 `TEST_SPEC.md`。

本 Review 不批准真实 Local/Firecracker Provider、HTTP/RPC Listener、Generated SDK、Scheduler/Quota/Metering、KMS 实现、Deployment Profile 或商业 Release。

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| HOST-01 | Service Host 固定为 L5 `runtime-service-host`，只负责构造和绑定组件。 | L2 Policy、L3 Port、L4 Mechanism、L5 Composition 与 L1/L6 Transport 分离。 | 必须更新 Layer/Component Ownership 后重审。 |
| HOST-02 | Host 只接收 Runtime Bootstrap 归一化的 typed `SandboxServiceHostConfig`；八个候选 source profile 精确覆盖 deployment/environment matrix，本 Gate 不物化 `etc/`。 | 共享 Service/Repository/Provider 不读取环境变量、`.env`、物理路径或 Secret。 | 需要明确且更强的 Config Authority/Secret Boundary。 |
| HOST-03 | Host 是唯一 Composition Root：只接收已构造 Repository Port、预打开 Runtime Directory Capability、Provider Registry、Workspace Attachment、Secret/KMS、Telemetry 与 Clock/ID，并据此构造 Lifecycle Port；外部 Database Composition 独占具体 PostgreSQL Pool/凭据/迁移。 | 无双 Composition Root；Host 不接收 Lifecycle Service 或 Pool、不运行迁移、不推导路径、不复制业务规则；Redis 保持禁用。 | 不得开始 Composition 实现。 |
| HOST-04 | `SandboxServiceHostReadiness` 按 Config/Runtime Directory/Store/Provider/Workspace/Secret/Telemetry/Fencing 八维检查，任一必需项失败、degraded 或 unknown 均 fail closed。 | 无弱 Provider、Memory/SQLite Server fallback 或虚假 Running。 | 需要替代且可验证的 Readiness Authority。 |
| HOST-05 | Service Host 不挂载 HTTP/RPC Listener；Internal API、Gateway、SDK 由独立 Requirement/ADR 拥有。 | Host 可嵌入 Standalone/Cloud/Test Composition，避免路线/SDK 复制。 | 必须重划 L1/L5/L6 边界。 |
| HOST-06 | Standalone/Cloud 共享 L2/L3 Contract，差异只进入 L5 Profile/Infrastructure/Provider/Store/Cache/Telemetry。 | Kernel 和 Sandbox Service 不出现部署拓扑分支。 | 必须提交 parity 例外并重审。 |
| HOST-07 | Readiness/Health/Shutdown/Metric/Audit 只输出低基数、脱敏身份和 Outcome；Telemetry Adapter 使用有界缓冲、Redaction、Drop Accounting，Shutdown 使用有界 Deadline 且幂等。 | 满足 Observability/Security/Recovery 责任边界；Exporter 降级不混同必需 Adapter 或 Audit/Outbox Readiness。 | 不得进入运行时实现。 |
| HOST-08 | Server/Cloud Lifecycle Authority 固定为注入的 PostgreSQL Repository；Memory 仅测试或明确单进程候选。 | 保持 REQ-0005 的数据库 Authority、CAS、Lease/Fencing 与恢复语义。 | 需重新评审 Persistence Authority。 |
| HOST-09 | 所有 Profile/Capability 依赖都通过可解析 Machine Contract 和统一状态规则关闭失败。 | 缺失、未知、Draft、待评审或未授权依赖不能产生虚假 Ready。 | 不得开始 Composition 实现。 |
| HOST-10 | Profile Gate 明确拆分 `standalone/local`、`standalone/firecracker` 与 `cloud/firecracker` 依赖闭包；Execution Profile 只能由安全 deployment profile 和经 Service Policy/Registry 选择的 Provider Kind 派生。 | 调用方不能指定执行 Profile；Local、Cold MicroVm 和 Cloud 调度/信任/容量证据不能互相推断或弱化。 | 必须重新提交 Profile 选择与依赖矩阵。 |
| HOST-11 | Command/Terminal 必须同时满足 Descriptor、Executor 和共同/平台 Conformance；macOS Local Terminal 当前拒绝。 | 防止仅凭声明暴露不可监督或不可清理的执行能力。 | Command/Terminal 保持 Not Ready。 |
| HOST-12 | Runtime Pool 仅为 Cloud Firecracker 的显式可选 Overlay，不是 Cold 启动前提。 | Cold 路径可独立交付；明确要求 Pool 时不静默回退。 | 必须重审 Pool 与基础分配语义。 |

## Pre-review Blocking Findings

1. Provider SPI、Local/Command/Firecracker ADR 仍未人工接受；Workspace Attachment 已形成 REQ-2026-0013 draft provider-neutral Composition/L4 Block Device mechanism contract，但其 Ownership/Storage/KMS/Device/Residue Review 未批准，Host 不能声明真实 Provider Ready。
2. Bootstrap 机器责任矩阵已记录 Runtime Bootstrap、Database Composition、Secret Material Manager、Secret/KMS Adapter、Telemetry Adapter、Audit/Outbox Runtime 与 Provider Composition 的候选 Owner；接口版本、供应链、运行时权限和具名 Owner 仍待人工批准。Workspace Port 候选命名已固定为 Host-facing `SandboxWorkspaceAttachmentPort` 与其后的 L4 `SandboxWorkspaceBlockDevicePort`，但实现 Owner 和运行时权限仍未批准。
3. 八个 Standalone/Cloud source profile、runtime target、预打开 Runtime Directory Capability、PostgreSQL/Secret/Telemetry 预算上限与 Redis 禁用已形成可验证候选 Authority；精确生产预算、source `etc/` materialization、具体权限/ACL、部署 Owner 和真实依赖仍未批准或创建。
4. 当前 Service Host 仍为空骨架，尚无 Composition、Readiness、Shutdown 或真实依赖 wiring 证据；本 Review 不把空骨架当作实现。
5. Internal API/SDK、Scheduler/Quota/Metering、Operator、Deployment/Release 与 Incident Runbook 需要独立 Requirement，不得由 Host 偷含。
6. 所有 18 个关联 Machine Contract 当前仍为 `draft`，其中需要独立实现授权的契约均为 `implementationAuthorized: false`；因此没有任何 Local、Firecracker、Cloud、Command、Terminal、Pool 或 Local Data Claim Profile/Capability 可以被判定 Ready。

## Required Evidence Before Ready

- Architecture/Security/Operations/Config Owner 接受 HOST-01..HOST-08。
- 接受 typed Config/source profile、Secret/KMS/Telemetry/Workspace Port、Runtime Directory Capability、Database Composition、Bootstrap/Shutdown 责任矩阵，并批准具体 `etc/` materialization 与生产预算。
- Composition tests 覆盖依赖缺失、Identity/Assurance mismatch、Secret/KMS/Telemetry failure、Readiness 分项、Shutdown Deadline、重复调用和 Standalone/Cloud parity。
- Static/Component/Layering/Rust Composition/Config/Deployment/Observability validators 通过，且无 Provider/API/SDK/Scheduler 旁路。
- 外部 PostgreSQL Pool/Privilege/Database Authority 与注入的 `SandboxSessionRepository`、REQ-0005 Lease/Fencing/Recovery 证据绑定；具体 Pool 不进入 Host，Memory 不得进入 Server/Cloud fallback。
- 机器可验证的依赖闭包覆盖公共 Lifecycle/Observability/Workspace、Standalone Local、Standalone Cold Firecracker、Cloud Node Trust/Admission/Capacity，以及可选 Pool Overlay；任何引用缺失或状态不满足均关闭失败。
- Command/Terminal Composition Test 同时验证 Descriptor、`SandboxCommandExecutor`、共同 Conformance、认证和平台后代清理，不能用声明或 Fake Host 替代真实 Runner/KVM 证据。

## Candidate Machine Contract Evidence

- `crates/sdkwork-sandbox-service-host/specs/sandbox-service-host-composition.contract.json` records the draft `SandboxServiceHostConfig`, standalone/cloud profile parity, injected Sandbox dependencies, eight common readiness dimensions, 16 cross-contract dependency gates, Local/Cold Firecracker/Cloud Firecracker profile closures, optional Pool overlay, Command/Terminal conditional gates, safe observation fields, and bounded idempotent shutdown.
- `crates/sdkwork-sandbox-service-host/specs/sandbox-service-host-bootstrap.contract.json` records the candidate eight-profile source matrix, safe config allowlist, preopened least-privilege Runtime Directory Capability, Secret/KMS lifetime boundary, external PostgreSQL Repository composition, Redis disablement, bounded Telemetry semantics, fixed bootstrap/shutdown order and candidate ownership matrix. It explicitly forbids config/`etc`, Secret/KMS, database/cache, Telemetry/Outbox and deployment materialization.
- `implementationAuthorized` remains `false`; the component contract continues to declare no public exports, provided/required ports, runtime entrypoints, or config keys.
- The two Service Host contract suites statically verify Gate 0 status, Bootstrap ownership/bounds/order, dependency path resolution and disabled state, `Sandbox*` type names, `sandbox_*` field/dependency names, profile dependency closure, Cold/Pool separation, Command/Terminal conjunction, readiness completeness/redaction, shutdown semantics, and absence of executable surface.
- Verification evidence must be refreshed after every contract change; passing candidate tests does not replace the pending Architecture, Security, Operations/Release, Config/Secret/Telemetry, or Database human outcomes.

## Verification Evidence

Executed from `sdkwork-sandbox` on 2026-07-29:

- `cargo fmt --all -- --check` - passed.
- `cargo check --workspace --offline` - passed.
- `cargo test --workspace --offline` - passed; 41 unit tests passed and the external PostgreSQL integration test remained explicitly ignored without `SDKWORK_DATABASE_TEST_POSTGRES_URL`.
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

### Candidate Refresh Evidence (2026-07-30)

- `node --test tests/contract/sandbox-service-host-bootstrap.contract.test.mjs tests/contract/sandbox-service-host-composition.contract.test.mjs` - 21/21 passed, including Bootstrap boundaries, dependency resolution, selected-provider authorization, Local/Cold/Cloud profile closure, Cold/Pool separation and Command/Terminal conjunction.
- `node --test tests/contract/*.test.mjs` - passed; exact current count is recorded in PLAN-2026-0002 Verification Checkpoint.
- `cargo fmt --all -- --check` and `cargo check --workspace --locked` - passed.
- `cargo test --workspace --locked` - 43 passed; 1 live PostgreSQL test remained explicitly ignored because `SDKWORK_DATABASE_TEST_POSTGRES_URL` and an initialized PostgreSQL database were unavailable.
- `cargo clippy --workspace --all-targets --locked -- -D warnings` - passed.
- Repository documentation, Database Framework, packages layout, strict Component Ports, application layering, Rust backend composition, identity naming, documentation debt and baseline audits - passed.
- This refresh proves Gate 0 consistency only. Every referenced Provider/Profile/Capability contract remains `draft`, pending human review or implementation-disabled, so it does not authorize Host wiring or a release claim.

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`。`Approved with follow-up` 不得推迟 Secret、Readiness、Persistence Authority、Profile parity 或 Shutdown 责任。

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | HOST-01, HOST-05, HOST-06, HOST-09, HOST-10, HOST-12 |
| Security owner | pending | pending | pending | HOST-02, HOST-04, HOST-07, HOST-09, HOST-11 |
| Operations/Release owner | pending | pending | pending | HOST-04, HOST-06, HOST-07, HOST-10, HOST-11, HOST-12 |
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
- [ ] HUMAN-REVIEW-DECISION: Decision Matrix 每条相关 HOST/CMD/LOC/FIR/POOL 决策均有 `Approved` 或 `Changes requested` + 替代方案

## Exit Gate

本 Review 标记 Approved 需同时满足：
1. 全部 Checklist 项勾选完毕
2. 同 REQ/ADR 的所有 Reviewer Role（Architecture / Security / Kernel / Operations / Database / Product）均表决 Approved
3. 如存在 `Changes requested`，替代方案须写入 REQ/ADR 并触发 narrow re-review
4. REQ 进入 `ready`，ADR 进入 `accepted`
5. `specs/sandbox-provider-delivery-gates.contract.json` 的 `implementationAuthorized` 在最后一个 Review 通过后可被置为 `true`

未经上述门禁，禁止把该 REQ 对应组件进入 V1 Local Runtime 实现阶段。
