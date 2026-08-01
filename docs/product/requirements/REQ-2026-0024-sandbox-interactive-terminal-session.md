# REQ-2026-0024: Sandbox Interactive Terminal Session

Status: draft

Owner: SDKWork Runtime Platform

Source: customer

Priority: P0

Updated: 2026-07-31

Specs: REQUIREMENTS_SPEC.md, ARCHITECTURE_DECISION_SPEC.md, APPLICATION_LAYERED_ARCHITECTURE_SPEC.md, RPC_SPEC.md, RPC_RESILIENCE_SPEC.md, SECURITY_SPEC.md, PRIVACY_SPEC.md, OBSERVABILITY_SPEC.md, PERFORMANCE_SPEC.md, EVENT_SPEC.md, TEST_SPEC.md, QUALITY_GATE_SPEC.md

Related: REQ-2026-0003, REQ-2026-0007, REQ-2026-0008, REQ-2026-0009, REQ-2026-0010, REQ-2026-0021, REQ-2026-0023

## Problem

BirdCoder requires an interactive terminal for local and cloud IDE workflows. The current Sandbox Command contract is intentionally non-interactive: it accepts one logical executable plus bounded arguments and returns a bounded terminal result. It excludes PTY, stdin, resize, reconnect, and streaming. The current candidate `RuntimeCapability::Terminal` name is also used for that non-interactive Command capability, so treating it as proof of an interactive terminal would be unsafe.

An IDE terminal is a long-lived, bidirectional, stateful capability. Network disconnect must not imply process termination, repeated input must not execute twice, output replay must be bounded and private, resize must be idempotent, and Workspace Runtime freeze/checkpoint must prevent new input before cleanup. Local Windows, Local Linux, Local macOS, and Firecracker require different containment mechanisms but one provider-neutral session contract.

## Goals

- Define a separate provider-neutral Interactive Terminal Session port and lifecycle.
- Split the candidate non-interactive `Command` capability from `InteractiveTerminal` capability semantics before either becomes public.
- Launch only approved logical executables with bounded Argv and an immutable binding policy; never accept a shell command string, host path, PATH search, ambient environment, or implicit shell fallback.
- Provide authenticated single-controller attach/reconnect, ordered idempotent input, idempotent resize, ordered binary-safe output, acknowledgements, bounded replay, backpressure, disconnect grace, and terminal outcome.
- Bind every operation to Tenant, Workspace Runtime Transaction, Sandbox Session/Binding, current fencing, and a Terminal Session control lease.
- Freeze input, drain or cancel the terminal, persist its first terminal outcome, and complete bounded cleanup before Checkpoint and runtime release.
- Require honest platform capability matrices and real Local/Firecracker containment evidence.

## Non-Goals

- Extending the unary Command request/result into an unbounded interactive stream.
- Accepting arbitrary shell strings, shell expansion, host executable paths, PATH/CWD lookup, login-shell profiles, ambient credentials, or caller-defined environment policy.
- Defining browser-to-Agents WebSocket/UI behavior, public APIs, generated product SDK fields, or direct BirdCoder-to-Sandbox transport.
- Supporting multi-controller collaborative terminals, terminal sharing across tenants, background daemon persistence after runtime release, file transfer, port forwarding, browser automation, or Secret values.
- Claiming macOS Local Interactive Terminal support before detached descendant containment is approved and proven.
- Authorizing PTY/ConPTY, guest-agent stream, RPC stream, database, cache, Provider, Service Host, or deployment implementation.

## Acceptance Criteria

1. Candidate capability semantics distinguish non-interactive `Command` from `InteractiveTerminal`. The existing candidate `Terminal` label cannot enable an interactive stream. Final public names require compatibility and human review.
2. `SandboxTerminalSessionPort` is separate from `SandboxCommandExecutor` and `SandboxProvider`. Provider identity binds the lifecycle, Command, and Terminal adapters without exposing Provider branches to Kernel.
3. The Terminal Session is subordinate to one ready Workspace Runtime Transaction and Runtime Binding. It never becomes an Agents Session, Kernel placement, Sandbox Session, Workspace writer lease, or Runtime allocation authority.
4. Open request carries trusted Tenant, Workspace/Revision authorization, Sandbox Session/Binding, Workspace Runtime Transaction, Provider, current Sandbox fencing, Terminal operation/idempotency/fingerprint, logical executable, Argv, working directory, immutable policy reference, deadline, and trace correlation. Physical paths, device ids, allocation references, credentials, Secret values, and caller-selected Provider/node/slot are forbidden.
5. The executable is a Provider-owned logical identifier resolved from the immutable Runtime Binding registry. Shells, when allowed, are explicit registered executable profiles. There is no command string, implicit shell, login-profile loading, PATH search, CWD lookup, or weaker fallback.
6. Final environment starts empty and follows the same immutable allowlist/protected-name rules as Command. Terminal adds no ambient environment or Secret channel; Secret projection is a separate ready contract.
7. Lifecycle is explicit and closed: requested, opening, ready, attached, detached, closing, closed, failed, or quarantined. Illegal transition, unknown state, stale fence, and attachment after terminal outcome fail closed.
8. Exactly one current controller lease may write input or resize. Reconnect by the same authorized principal rotates connection identity but preserves Terminal Session identity; multiple observers/controllers are not part of V1.
9. Input frames are binary-safe, bounded, monotonically sequenced, fingerprinted, acknowledged, and at-most-once per Terminal Session. Duplicate sequence with identical fingerprint replays acknowledgement; different content conflicts. Unknown delivery is queried before retransmission.
10. Resize uses bounded positive columns/rows, monotonic operation sequence, idempotency, and current controller/fencing validation. Resize does not accept host display, font, pixel, or device metadata.
11. Output is a single ordered binary-safe PTY byte stream with monotonically increasing sequence, bounded frame size, acknowledgement, replay cursor, replay window, and explicit gap/truncation outcome. Output is never copied into normal logs, metrics, audit payloads, or command stdout/stderr fields.
12. Backpressure has bounded in-memory and durable replay buffers, slow-consumer policy, hard output limit, and a defined outcome. It cannot allocate memory proportional to terminal lifetime or block cleanup indefinitely.
13. Transport connection and Terminal Session lifetimes are separate. Disconnect moves an eligible Session to detached, starts an approved bounded grace window, and does not release the Runtime immediately. Expiry freezes input and triggers fenced close, Checkpoint policy, cleanup, and release.
14. Reconnect validates authorization, current Runtime Binding, controller generation, Terminal state, replay cursor, and current Sandbox fence. A stale connection cannot write, resize, acknowledge, close, or advance output after controller rotation.
15. Close, timeout, output limit, Provider exit, fencing loss, runtime freeze, and cancellation use durable first-terminal CAS. Cleanup status is separate from the primary outcome; cleanup uncertainty quarantines the Binding and capacity.
16. Workspace Runtime freeze rejects new Terminal input/resize/attach, drains or cancels the active terminal within a bound, revokes write access, flushes Workspace writes, and precedes durable Checkpoint handoff and runtime cleanup.
17. Windows Local requires ConPTY plus suspended-process Job Object containment before user code; Linux Local requires PTY plus race-free delegated cgroup v2 containment; macOS Local denies `InteractiveTerminal` until detached descendant containment passes review; Firecracker requires an authenticated guest agent and microVM/cgroup/network/Workspace readiness. No platform silently falls back.
18. Terminal transport is private and authenticated. A future bidirectional RPC/stream adapter calls the Terminal port, applies bounded frames/deadlines/cancellation, and never exposes a public Sandbox WebSocket or direct BirdCoder connection.
19. Metrics use fixed-cardinality Provider class/outcome/reason labels only. Audit records lifecycle/control actions without input/output content, executable arguments, environment values, paths, raw identity, or infrastructure details.
20. Real platform conformance proves open/attach/input/resize/output/ack/replay/reconnect/close, duplicate and conflicting frames, stale connection/fencing, disconnect expiry, output saturation, freeze/checkpoint, descendant cleanup, crash/restart, and cross-tenant negative/residue behavior.

## Non-Functional Requirements

| Area | Required outcome |
| --- | --- |
| Security | Single controller, current fencing, logical executable policy, empty environment, authenticated private stream, platform descendant containment, and no direct client bypass. |
| Privacy | Terminal input/output is sensitive content with bounded encrypted replay where persisted, short approved retention, access audit, and no ordinary telemetry copy. |
| Performance | Frame, buffer, replay, active session, waiter, reconnect, output, cleanup, and shutdown bounds are approved and measured under slow-consumer and disconnect load. |
| Reliability | At-most-once input, ordered replay, first-terminal CAS, reconnect generation, crash recovery, freeze/checkpoint ordering, and quarantine on cleanup uncertainty. |
| Operability | Safe states/reasons, saturation metrics, bounded support diagnostics, platform capability evidence, drain, and forced-close procedures. |

## Affected Surfaces

- future Terminal Session application port and provider adapters
- Local Windows/Linux containment and macOS capability denial
- Firecracker guest-agent terminal stream and microVM readiness
- Workspace Runtime Transaction freeze/checkpoint/release
- internal control-plane transport integration, Kernel proxy, and Agents/BirdCoder authorized presentation
- terminal replay persistence/retention, observability, operations, and release evidence

## Traceability

- [ADR-20260731](../../architecture/decisions/ADR-20260731-sandbox-interactive-terminal-session.md)
- [Architecture and security review](../../engineering/reviews/REVIEW-20260731-sandbox-interactive-terminal-session.md)
- [Machine contract](../../../specs/sandbox-interactive-terminal-session.contract.json)
- [Command contract](../../../apis/commands/sandbox-command-contract.json)
- [Workspace Runtime Transaction](REQ-2026-0021-sandbox-workspace-runtime-transaction-and-checkpoint.md)

## Implementation Gate

This requirement remains `draft`. Capability, port, session, operation, event, error, transport, and retention names and values are non-public candidates. It does not authorize a Rust Port/type, PTY/ConPTY, process spawn, guest-agent method, stream, Proto/SDK/API, persistence, cache, runtime config, Provider, Service Host, deployment, Kernel, Agents, or BirdCoder change. Implementation begins only after the requirement is ready, the ADR/review and capability split are approved, Command/Provider/Workspace Runtime dependencies authorize implementation, exact bounds and retention are approved, and claimed platforms have assigned real evidence environments.
