# REVIEW-20260731: Sandbox Interactive Terminal Session

Status: pending-human-review

Outcome: No-Go

Requirement: [REQ-2026-0024](../../product/requirements/REQ-2026-0024-sandbox-interactive-terminal-session.md)

Decision: [ADR-20260731](../../architecture/decisions/ADR-20260731-sandbox-interactive-terminal-session.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-31

Risk: critical - command injection, duplicate input, stale controller, output disclosure, unbounded replay, detached descendants, lost Workspace writes, and cross-tenant residue.

## Scope

This review requests approval of capability separation, Terminal Session ownership/lifecycle, approved logical executable launch, single-controller lease, input/resize idempotency, output sequence/replay/backpressure, disconnect/reconnect, first-terminal arbitration, Workspace freeze/checkpoint ordering, platform containment, private transport, retention, and evidence.

It does not approve public names, PTY/ConPTY, process spawn, guest-agent streaming, persistence, RPC/WebSocket, APIs/SDKs, Provider, Service Host, config, deployment, or cross-repository implementation.

## Findings

| ID | Severity | Finding | Required closure |
| --- | --- | --- | --- |
| STS-ISSUE-01 | P0 | Current candidate `Terminal` means bounded non-interactive Command. | Approve distinct Command and Interactive Terminal capability semantics and compatibility. |
| STS-ISSUE-02 | P0 | No PTY Session lifecycle or controller ownership exists. | Approve one subordinate Terminal Session and single-controller lease. |
| STS-ISSUE-03 | P0 | Input retry can duplicate irreversible shell/tool actions. | Approve sequence, fingerprint, acknowledgement, operation lookup, and at-most-once rules. |
| STS-ISSUE-04 | P0 | Output replay, slow consumers, and retention are unbounded/undefined. | Approve byte/frame/buffer/replay/retention limits and privacy controls. |
| STS-ISSUE-05 | P0 | Disconnect, reconnect, freeze, Checkpoint, and release ordering is not implemented. | Approve grace, stale connection rejection, first-terminal CAS, and transaction ordering. |
| STS-ISSUE-06 | P0 | Real platform containment differs and macOS detached descendants are unresolved. | Approve exact platform capability matrix with macOS denial. |
| STS-ISSUE-07 | P0 | No authenticated private terminal data path exists across BirdCoder, Agents, Kernel, and Sandbox. | Approve proxy/stream ownership without direct client-to-Sandbox access. |
| STS-ISSUE-08 | P1 | Exact active session, connection, waiter, frame, buffer, replay, grace, retention, and cleanup budgets are unset. | Assign product, capacity, privacy, reliability, and operations values. |

## Decision Matrix

| ID | Candidate decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| STS-01 | Split Command and Interactive Terminal capabilities. | Capability evidence remains honest. | Interactive Terminal stays disabled. |
| STS-02 | Separate Terminal Session port and lifecycle. | PTY state does not pollute lifecycle or unary Command. | Redesign the interface boundary. |
| STS-03 | Single controller with generation/fencing. | Reconnect cannot leave two writers. | No writable interactive terminal. |
| STS-04 | At-most-once sequenced input and idempotent resize. | Ambiguous delivery cannot blindly repeat input. | Disconnect retry remains unsafe. |
| STS-05 | Ordered bounded output replay and backpressure. | Slow clients cannot exhaust memory/storage. | No reconnectable output stream. |
| STS-06 | Detach grace then fenced close/checkpoint. | Transient loss preserves work without leaking capacity indefinitely. | Choose a different reviewed disconnect policy. |
| STS-07 | Platform-specific containment with no fallback. | Claims match real mechanisms. | Disable the unsupported platform. |
| STS-08 | Private Kernel-mediated transport. | Product auth and placement remain authoritative. | No cloud terminal path. |

## Required Evidence Before Ready

- Approved capability names/migration and Descriptor readiness rules.
- Approved exact bounds for sessions, controllers, frames, replay, output, grace, retention, close, cleanup, and shutdown.
- Approved output encryption/access/retention/deletion and support-bundle policy.
- Accepted Local Host, Command, Firecracker, Service Host, Workspace Runtime Transaction, control-plane, observability, and lifecycle-retention gates.
- Real Windows ConPTY/Job and Linux PTY/cgroup descendant tests; macOS denial tests; real Firecracker guest-agent/KVM tests.
- Cross-repository auth/proxy tests, duplicate input, stale connection/fence, replay gap, slow consumer, disconnect expiry, freeze/checkpoint, restart/recovery, and cross-tenant residue evidence.
- Runbooks for forced close, replay corruption, stuck descendants, output saturation, quarantine, drain, and privacy deletion.

## Candidate Static Evidence

`specs/sandbox-interactive-terminal-session.contract.json` and focused tests are design evidence only. They keep all exact policy values unresolved and `implementationAuthorized: false`.

## Human Outcome

| Reviewer role | Reviewer | Outcome | Date | Decisions |
| --- | --- | --- | --- | --- |
| Product/BirdCoder owner | pending | pending | pending | STS-01, STS-05, STS-06, STS-08 |
| Sandbox architecture owner | pending | pending | pending | STS-01..STS-08 |
| Kernel/Agents owner | pending | pending | pending | STS-03, STS-04, STS-06, STS-08 |
| Local platform owner | pending | pending | pending | STS-02, STS-07 |
| Firecracker/guest-agent owner | pending | pending | pending | STS-02, STS-07 |
| Security/privacy owner | pending | pending | pending | STS-01..STS-08 |
| Reliability/capacity/operations owner | pending | pending | pending | STS-03..STS-08 |

No row is approved. Interactive Terminal implementation and commercial IDE Terminal claims remain **No-Go**.
