# REVIEW-20260801: Sandbox Cross-Repository Version Compatibility And Release Set

Status: pending-human-review

Outcome: No-Go

Requirement: [REQ-2026-0027](../../product/requirements/REQ-2026-0027-sandbox-cross-repository-version-compatibility.md)

Decision: [ADR-20260801](../../architecture/decisions/ADR-20260801-sandbox-cross-repository-version-compatibility.md)

Owner: SDKWork Runtime Platform

Date: 2026-08-01

Risk: critical - mixed-revision behavior, stale fencing, incompatible Workspace/Checkpoint data, Secret audience mismatch, residency downgrade, artifact substitution, unsafe rollback and unbounded support.

## Scope

This review requests approval of the immutable release-set identity, canonical authorities, compatibility matrix, peer preflight, staged rollout/drain, upgrade/rollback/downgrade, hotfix and support-window policies across the four repositories and dependent artifact/SDK/storage authorities.

It does not approve a release version/tag, generated SDK/proto, registry, discovery metadata, migration, deployment, artifact publication, rollout worker, drain controller, API/SDK, Provider, Service Host, Kernel, Agents or BirdCoder source change.

## Findings

| ID | Severity | Finding | Required closure |
| --- | --- | --- | --- |
| VCR-ISSUE-01 | P0 | No immutable set binds BirdCoder, Agents, Kernel, Sandbox, Workspace/Storage, RPC/SDK and artifacts. | Approve release authority and exact member identities. |
| VCR-ISSUE-02 | P0 | Shared version numbers do not cover domain, wire, data, artifact, residency or Secret compatibility. | Approve explicit matrix with unknown-edge fail-closed behavior. |
| VCR-ISSUE-03 | P0 | Rolling changes lack preflight, drain and active Workspace Runtime Transaction policy. | Approve staged rollout, freeze/checkpoint/cancel and quarantine ordering. |
| VCR-ISSUE-04 | P0 | Rollback can leave newer Workspace/Checkpoint/schema/SDK/artifact state. | Approve migration-aware rollback and downgrade denial. |
| VCR-ISSUE-05 | P0 | Generated SDK/proto and artifact provenance is not one release evidence bundle. | Approve canonical generator/artifact/SBOM/provenance sources. |
| VCR-ISSUE-06 | P0 | Silent protocol or assurance downgrade can preserve availability at the cost of security. | Approve no-downgrade and no-fallback policy. |
| VCR-ISSUE-07 | P1 | Support windows and deprecation behavior are undefined. | Assign minimum versions, security overlap and end-of-support outcomes. |
| VCR-ISSUE-08 | P1 | Mixed-version/high-concurrency evidence environments are unassigned. | Assign standalone, Cloud control/node and storage/recovery test owners. |

## Decision Matrix

| ID | Candidate decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| VCR-01 | Use an immutable cross-repository release set. | Every commercial claim maps to exact source/artifact identities. | Releases remain non-commercial. |
| VCR-02 | Separate semantic, wire, SDK, data, artifact, residency, Secret and assurance compatibility. | Safe evolution is explicit. | No rolling upgrade. |
| VCR-03 | Preflight, stage, drain and quarantine before incompatible change. | Active work is not abandoned or double-owned. | Stop rollout on uncertainty. |
| VCR-04 | Migration-aware rollback; downgrade denied by default. | Newer data is not misread by old code. | Forward-fix or restore only. |
| VCR-05 | Signed canonical evidence bundle. | Generated/artifact supply chain is traceable. | No release publication. |
| VCR-06 | Finite support windows with upgrade-required expiry. | Security and test surface remain bounded. | No supported compatibility promise. |

## Required Evidence Before Ready

- Named release authority and canonical revision/digest sources for all repositories, SDK/Proto, Workspace/Storage, config and artifacts.
- Closed compatibility matrix with migration-required and incompatible edges, version-skew preflight and no-downgrade tests.
- Signed release-set manifest, source/dependency locks, generated SDK/proto provenance, artifact signatures/digests/SBOM/provenance and evidence index.
- Mixed-version standalone and Cloud control/node tests for placement, fencing, retries, streams, Secret projection, Checkpoint/recovery, residency and artifact revocation.
- Staged rollout, discovery publication, drain, active-transaction freeze/checkpoint/cancel, rollback/forward-fix, downgrade denial and quarantine evidence.
- Schema/Drive/Workspace migration and restore compatibility, support diagnostics, deprecation notice and end-of-support behavior.
- Real high-concurrency upgrade and node drain capacity results with bounded control-plane load.

## Current Outcome

No-Go. The Gate 0 candidate is reviewable, but no immutable four-repository revision set, compatibility registry, generated artifact evidence bundle, rollout/drain implementation, migration-aware rollback or assigned mixed-version environments exist. Static tests will only prove the candidate remains disabled and internally consistent.

## Human Approval Required

- SDKWork Product, BirdCoder, Agents, Kernel and Sandbox owners
- Drive/Storage, RPC/SDK and Release owners
- Security, Privacy, Reliability, Capacity and Operations owners
