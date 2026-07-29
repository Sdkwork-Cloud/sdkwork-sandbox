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

[PLAN-2026-0001: Local And Firecracker Sandbox Provider Delivery](engineering/plans/PLAN-2026-0001-local-and-firecracker-provider-delivery.md) fixes the delivery order as Local, shared Command/Terminal conformance, then Firecracker. Docker remains deferred.

## Verification

```bash
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
```
