---
id: REQ-2026-0009
title: Define the typed Sandbox Service Host composition and readiness boundary
owner: SDKWork Runtime Platform
status: draft
priority: high
source: platform
problem: The Sandbox repository has lifecycle and persistence candidate ports but no explicit L5 composition boundary that constructs them with typed configuration, safe dependencies, readiness, and shutdown semantics.
goals:
  - Define one provider-neutral Sandbox Service Host composition boundary for standalone and cloud profiles.
  - Make configuration, PostgreSQL authority, Secret/KMS, Workspace Attachment, Provider Registry, and Telemetry dependencies explicit and injected.
  - Fail closed when required dependencies or capability/assurance guarantees are unavailable, without silently selecting weaker infrastructure.
  - Produce safe readiness and health observations without exposing secrets, physical paths, provider-private allocation data, or raw command data.
non_goals:
  - Implement a Local, Firecracker, Docker, or other Sandbox Provider.
  - Add an HTTP/RPC listener, internal API, generated SDK, Scheduler, Pool, Quota/Metering, Snapshot, or public Operator API.
  - Read environment variables, `.env` files, source checkout metadata, or Secret Material from L2/L3 code.
  - Create database pools, run migrations, own PostgreSQL schema, or use Memory Repository as a server fallback.
  - Create `sdkwork.app.config.json` or a deployable profile before packaging/deployment is explicitly in scope.
users:
  - SDKWork Runtime Platform maintainers
  - Sandbox Service Host and release operators
  - SDKWork Kernel integrators
  - Sandbox Provider authors
affected_surfaces:
  - rust-components
  - composition
  - config
  - observability
  - security
  - reliability
---

# REQ-2026-0009: Sandbox Service Host Composition 与 Readiness 边界

## Readiness Blockers

本需求在以下边界完成人工评审前保持 `draft`：

- 接受 `SandboxProvider`、REQ-2026-0013 provider-neutral `SandboxWorkspaceAttachmentPort`/L4 mechanism 边界、Kernel 集成和公共 `Sandbox*` 命名 ADR。
- 接受 standalone/cloud 的 typed deployment profile、environment、runtime target 与 source `etc/` 归属。
- 接受 Secret/KMS、Telemetry、PostgreSQL Pool 与 Workspace Capability 的注入 Port 及其 owner。
- 确认 Service Host、Standalone Gateway、Internal API、Scheduler、Operator 和部署发布的层级所有权；Service Host 不拥有 HTTP Listener 或业务 Policy。

## Candidate Acceptance Criteria

- `sdkwork-sandbox-service-host` 作为 L5 `runtime-service-host`，只构造并绑定 Sandbox Service、Repository、Provider Registry、Workspace Attachment、Secret/KMS、Telemetry 和 Clock/ID Port；不拥有 L2 业务规则、L4 SQL/Provider Mechanism 或 L1 HTTP 适配。
- Host 接收 typed `SandboxServiceHostConfig`，由 Runtime Bootstrap 从 approved source `etc/` profile 注入；L2/L3 不读取 process environment、`.env`、filesystem registry 或 global mutable state。
- Profile 明确区分 `deploymentProfile`、`environment` 与 `runtimeTarget`，只允许标准 `standalone`/`cloud` 组合；profile 不匹配、缺少必需依赖或 Secret/KMS/Telemetry 未就绪时启动关闭失败。
- PostgreSQL `DatabasePool`、Migration Authority 和 Database Status 由外部 Composition 注入；Host 不创建连接池、不执行迁移、不读取连接 URL、不提供 SQLite Server Fallback。
- Provider Registry 只通过 `SandboxProvider` 与已接受的 Provider-neutral Ports 注入；Provider Identity、Capability、Isolation Assurance 与 Readiness 不匹配时，Host 不选择弱 Provider、不把 `SandboxSession` 标记为 Running。
- `SandboxServiceHostReadiness` 是 typed、可审计的内部结果，至少区分 Config、Store、Provider Registry、Workspace Attachment、Secret/KMS 和 Telemetry 依赖；结果不得包含 Secret Material、Database URL、Physical Host Path、API Socket、Provider Allocation Reference 或 Raw Command。
- Liveness/Readiness/Shutdown 不挂载 HTTP 路由；未来 HTTP/RPC 由独立 Internal API/Standalone Gateway Requirement 定义，Host 只提供可组合的内部 Port/Observation。
- Host Shutdown 在有界 Deadline 内停止新生命周期副作用，释放 Lease/Provider/Telemetry/Store 资源并保持重复调用幂等；超时转为安全的结构化 Internal Failure。
- Standalone 与 Cloud 使用相同 L2/L3 Contract；差异只位于 L5 Composition 的 Infrastructure、Persistence、Cache、Provider Registry 和 Runtime Profile，不允许 Kernel 或 Sandbox Service 分支判断部署拓扑。
- 所有 Host/Readiness/Error/Metric/Audit 关联使用 `sandbox_*` 所有权字段和 Server-owned Trace；禁止输出未脱敏的租户名、Raw ID、路径、命令、环境值或 Provider-private Metadata。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | 依赖缺失、Assurance 不足、Secret/KMS 失败、Provider Fencing 不可证明时关闭失败；不允许弱 Provider 回退。 |
| Privacy | Config、Readiness、Log、Metric、Audit 只包含最小安全身份和低基数 Outcome；Secret/Path/Allocation/Command 不进入普通输出。 |
| Performance | Host Bootstrap 不执行无界扫描或同步远程 Secret/KMS 调用；Readiness 检查有界、有超时、可重复。 |
| Reliability | 初始化、Readiness、Shutdown、Provider Outage 与 Store Unavailable 有明确状态和重试/不可重试分类；多副本协调继续由后续 Scheduler/Lease Requirement 负责。 |
| Operations | Health/Readiness、Trace、Metric、Audit 的 Port Owner、Retention、Redaction 和证据位置必须在实现前固定。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `CONFIG_SPEC.md`, `DEPLOYMENT_SPEC.md`, `OBSERVABILITY_SPEC.md`, `SECURITY_SPEC.md`, `RUNTIME_DIRECTORY_SPEC.md`, `COMPONENT_SPEC.md`, `RUST_CODE_SPEC.md`, `TEST_SPEC.md`.

Components: `crates/sdkwork-sandbox-service-host`, `crates/sdkwork-intelligence-sandbox-service`, `crates/sdkwork-intelligence-sandbox-repository-sqlx`, `crates/sdkwork-sandbox-provider-spi`, and future approved Composition Ports.

Decision: [ADR-20260729: Sandbox Service Host Composition And Readiness](../../architecture/decisions/ADR-20260729-sandbox-service-host-composition-and-readiness.md).

## Verification Plan

```bash
cargo fmt --all -- --check
cargo check -p sdkwork-sandbox-service-host
cargo test -p sdkwork-sandbox-service-host
cargo clippy -p sdkwork-sandbox-service-host --all-targets -- -D warnings
node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .
node ../sdkwork-specs/tools/check-identity-naming.mjs --root .
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
```

真实 Local/Firecracker Provider、Secret/KMS、PostgreSQL Multi-replica、Internal API/SDK、Deployment、Observability Backend、Scheduler/Quota 和商业 Release Evidence 是后续 Requirement 的强制证据，不由本需求的 Host Unit Test 替代。

## Current Boundary

2026-07-29 已完成 Service Host 空组件、Gate 0 文档以及 `specs/sandbox-service-host-composition.contract.json` 候选机器契约；契约已固定 `SandboxServiceHostConfig`、`SandboxServiceHostReadiness`、`sandbox_*` 字段、standalone/cloud parity、依赖注入、fail-closed 和 bounded idempotent shutdown 语义，并明确 `implementationAuthorized: false`。Workspace 依赖现显式关联 REQ-2026-0013，但 Host 仍只注入 provider-neutral `SandboxWorkspaceAttachmentPort`，不直接依赖 L4 `SandboxWorkspaceBlockDevicePort` 或按 Provider 分支。当前仍未创建 Host Public Export、Config Key、Runtime Entrypoint、依赖绑定或运行时实现。本需求保持 `draft`，等待上述人工评审和 Provider/Workspace Contract Gate。
