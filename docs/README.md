# sdkwork-sandbox Documentation

Purpose: route product, architecture, engineering, integration, operations, release, and historical documentation for SDKWork Sandbox.

Owner: SDKWork Runtime Platform maintainers.

Allowed content: Canon PRD and technical architecture, stable `REQ-*`/`ADR-*`/`PLAN-*`/`REVIEW-*` working records, guides, runbooks, changelogs, migrations, releases, domain extensions, and archives. Forbidden content: copied global standards, sole-source machine contracts, generated SDK transports, runtime state, credentials, and private environment values.

## Audience Routing

| I am… | Read first | Then read |
| --- | --- | --- |
| Product or business | [product/prd/PRD.md](product/prd/PRD.md) | [product/requirements/](product/requirements/) |
| Architect | [architecture/tech/TECH_ARCHITECTURE.md](architecture/tech/TECH_ARCHITECTURE.md) | [architecture/decisions/](architecture/decisions/) |
| Developer | [guides/developer/README.md](guides/developer/README.md) | [engineering/plans/](engineering/plans/) |
| Operator | [guides/operator/README.md](guides/operator/README.md) | [runbooks/](runbooks/) |
| Integrator | [guides/integrator/README.md](guides/integrator/README.md) | repository `apis/` and `sdks/` |
| Agent | [../AGENTS.md](../AGENTS.md) | [INDEX.yaml](INDEX.yaml) |

## Canon Documents

| Document | Path |
| --- | --- |
| Product PRD | [product/prd/PRD.md](product/prd/PRD.md) |
| Technical architecture | [architecture/tech/TECH_ARCHITECTURE.md](architecture/tech/TECH_ARCHITECTURE.md) |

## Related Specs

- `DOCUMENTATION_SPEC.md`
- `SDKWORK_WORKSPACE_SPEC.md`
- `REQUIREMENTS_SPEC.md`
- `ARCHITECTURE_DECISION_SPEC.md`

## Active Delivery Focus

[PLAN-2026-0001: Local And Firecracker Sandbox Provider Delivery](engineering/plans/PLAN-2026-0001-local-and-firecracker-provider-delivery.md) fixes the delivery order as Local, shared Command/Terminal conformance, then Firecracker. Docker remains deferred. Draft Observability/Event/Audit/Outbox, Host Isolation Broker, Firecracker Artifact Compatibility/Supply-chain, Workspace Block Device/Sanitization, Firecracker Network Isolation, Firecracker Resource Isolation/Usage, Multi-tenant Admission/Scheduling/Capacity, Node Trust/Enrollment/Attestation/Verified Inventory, and PostgreSQL Quota/Capacity Reservation Persistence boundaries are governed separately by REQ-2026-0010 through REQ-2026-0018; none is runtime implementation authority. REQ-2026-0018 also records the human-reviewed pre-release migration gate required before existing `tenant_id TEXT` persistence can adopt standard positive `BIGINT` SQL subject semantics.

## Verification

```bash
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
```
