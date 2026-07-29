# REVIEW-20260728: Sandbox Workspace Attachment Boundary Verification

Status: conditional-pass

Requirement: [REQ-2026-0004](../../product/requirements/REQ-2026-0004-agents-workspace-attachment.md)

Decision: [ADR-20260728: Agents Workspace And Sandbox Attachment Ownership](../../architecture/decisions/ADR-20260728-agents-workspace-and-sandbox-attachment-ownership.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-28

## Scope

本 Review 验证 Agents-owned `AgentWorkspace`/`AgentSession` Identity 经 Kernel 映射为 `SandboxWorkspaceId`/`SandboxSessionId` 后，只作为 Opaque Sandbox Context 进入 Lifecycle 与 Provider Request；Sandbox 不建立 Workspace Registry，不推导 Host Path，也不反向依赖 Kernel/Agents。固定产品术语保持 `Runtime`、`Session`、`Workspace`、`Sandbox` 与 `Provider`，Sandbox-owned 类型/变量分别使用 `Sandbox*`/`sandbox_*`。

## Evidence

| Command / Check | Result |
| --- | --- |
| `cargo test -p sdkwork-sandbox-provider-spi sandbox_provider_readiness_requires_workspace_attachment_and_policy_enforcement` | PASS: Provider、Policy、Workspace Attachment 任一未就绪均关闭失败。 |
| `cargo test -p sdkwork-intelligence-sandbox-service sandbox_workspace_context_is_preserved_across_provider_attachment_requests` | PASS: Tenant、Workspace、Session、Sandbox、Runtime Binding 与 Fencing Token 在 Allocate/Start 请求间保持一致。 |
| `cargo test --workspace` | PASS: 19 tests; 1 live PostgreSQL test remained intentionally ignored without its test database variable. |
| Kernel `cargo test --offline -p sdkwork-agent-kernel sandbox_runtime::tests` | PASS: 7 tests, including Agents ID mapping and path-like ID rejection. |
| Agents `cargo check --locked -p sdkwork-intelligence-agents-service` and `cargo test --locked -p sdkwork-intelligence-agents-service` | PASS: dependency compilation and 282 tests; 5 live PostgreSQL tests intentionally ignored. |
| Agents inverse Cargo tree for `sdkwork-intelligence-sandbox-service` | PASS: `sdkwork-intelligence-agents-service -> sdkwork-agent-kernel -> sdkwork-intelligence-sandbox-service`. |
| Sandbox Cargo dependency scan | PASS: no dependency on `sdkwork-agent-kernel` or `sdkwork-agents`. |
| Component, Layering, Identity Naming, Documentation, Baseline, and `verify-repo` validators | PASS. |

## Findings

- `CreateSandboxSessionCommand` receives caller-supplied `sandbox_workspace_id` and `sandbox_session_id`; Sandbox generates only Sandbox-owned allocation/binding identities and shared lifecycle `OperationId` values.
- `SandboxProviderAllocationRequest` and `SandboxProviderStartRequest` contain logical `Sandbox*` identities and policy context, not Host Path, Storage Credential, or Agents persistence models.
- Running readiness requires `sandbox_provider_ready`, `sandbox_policy_enforced`, and `sandbox_workspace_attached`; rejection cleans the candidate Runtime Binding.
- Stop/Destroy operate on Sandbox Allocation/Binding state and have no API capable of deleting or mutating an `AgentWorkspace`.

## Remaining Gates

- `ADR-20260728-agents-workspace-and-sandbox-attachment-ownership` and the cross-repository `0.1` public contract still require human architecture/security review.
- Production Physical Attachment Capability, Storage Backend, Agents Authorization/Revision Proof, Attachment Retention, Snapshot/Restore, and multi-tenant data-plane isolation are not implemented.
- No real Local/Firecracker Provider consumes an authorized Attachment Capability yet; Provider Readiness evidence currently uses a deterministic Fake Provider, and Docker is deferred.

## Conclusion

`REQ-2026-0004` conditionally passes its Opaque Identity, request propagation, fail-closed Readiness, and dependency-direction candidate boundaries. It remains `in-progress` and does not approve production Workspace Attachment, Host Access, Provider isolation, or commercial release.
