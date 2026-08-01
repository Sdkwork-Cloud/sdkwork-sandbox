# ADR-20260731: Sandbox Interactive Terminal Session

Status: proposed

Requirement: [REQ-2026-0024](../../product/requirements/REQ-2026-0024-sandbox-interactive-terminal-session.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-31

Deciders: Product, Sandbox, Kernel, BirdCoder, Agents, Local Platform, Firecracker, Security/Privacy, Reliability and Operations owners

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `RPC_SPEC.md`, `RPC_RESILIENCE_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `PERFORMANCE_SPEC.md`, `TEST_SPEC.md`

## Context

The bounded Command contract deliberately excludes interactive terminal behavior. PTY sessions have a longer lifetime, bidirectional bytes, connection churn, input duplication risk, replay, resize, output backpressure, and descendant cleanup. Reusing the current candidate `Terminal` capability for both non-interactive Command and interactive PTY would make capability negotiation ambiguous and let a Provider claim more than it proves.

## Decision

1. Introduce a candidate `SandboxTerminalSessionPort` independent from `SandboxCommandExecutor` and lifecycle `SandboxProvider`.
2. Review a capability split: non-interactive execution becomes candidate `Command`; PTY behavior becomes candidate `InteractiveTerminal`. Existing candidate `Terminal` does not prove PTY support and cannot enable it.
3. A Terminal Session is subordinate to one Workspace Runtime Transaction, Runtime Binding, Provider identity, and Sandbox fencing scope. It owns only interactive process/session state and a separate controller lease.
4. Open launches an approved logical executable profile with bounded Argv, Workspace-relative working directory, empty allowlisted environment, immutable policy, and no command string, PATH/CWD search, login profile, ambient credential, implicit shell, or Secret value.
5. V1 has one authenticated controller. Reconnect rotates connection identity and controller generation without changing Terminal Session identity. Stale connections fail closed. Multiple controllers/observers are deferred.
6. Input uses bounded binary frames, monotonic sequence, canonical fingerprint, at-most-once acceptance, and acknowledgement. Resize is a separate bounded idempotent control operation.
7. PTY output is one ordered binary stream with sequence, acknowledgement, cursor, bounded replay, gap/truncation facts, and slow-consumer policy. It is sensitive content and never ordinary telemetry.
8. Connection loss moves an eligible Session to detached. An owner-approved reconnect grace preserves the Runtime; expiry performs fenced close and the Workspace Runtime Transaction checkpoint/cleanup path.
9. Exit, close, timeout, cancel, output limit, fencing loss, freeze, and Provider failure use durable first-terminal CAS. Cleanup failure is separate and quarantines uncertain resources.
10. Freeze prevents new attach/input/resize, drains or cancels the terminal, revokes writes, flushes, and completes before durable Checkpoint and release.
11. Platform support is evidence-based: Windows uses ConPTY plus pre-user-code Job containment; Linux uses PTY plus race-free delegated cgroup v2 containment; macOS denies the capability until detached descendants are contained; Firecracker uses an authenticated guest agent inside a ready microVM. No fallback weakens assurance.
12. A future private stream adapter invokes the port. BirdCoder and Agents never connect directly to Sandbox; higher layers retain authorization and Kernel retains execution placement/proxy responsibility.

## Alternatives

### Extend Unary Command With Optional Streaming Fields

Rejected because it would combine finite request/result execution with connection, replay, input sequence, resize, and reconnect state.

### Treat Any Command Executor As A Terminal

Rejected because a Provider may safely execute bounded non-interactive tools without providing PTY containment, reconnect, or stream backpressure.

### Accept Shell Command Strings

Rejected because parsing, quoting, expansion, profiles, and injection differ across shells and platforms. Shell access uses an approved logical executable profile and Argv.

### Kill Immediately On Client Disconnect

Rejected because transient network loss would destroy IDE work and bypass the explicit reconnect/checkpoint policy.

### Keep An Unbounded Output Replay Buffer

Rejected because terminal lifetime and slow consumers would create unbounded memory/storage and sensitive-data retention.

## Consequences

- Command and Interactive Terminal can evolve and be secured independently.
- Providers advertise only the exact capability proven on each platform.
- Terminal state, replay retention, transport, controller authorization, and real platform evidence add dedicated implementation and operations work.
- macOS Local remains an explicit denial until containment is approved.
- Workspace Checkpoint and runtime release gain a precise terminal freeze/drain dependency.

## Verification

- Static tests validate capability separation, ownership, logical executable policy, lifecycle, controller fencing, frame ordering, replay, disconnect, first-terminal CAS, freeze, platform matrix, privacy, bounds, and no-implementation gates.
- Future shared conformance runs against real Windows, Linux, and Firecracker; macOS runs denial tests until its containment gate changes.
- Cross-repository integration tests prove BirdCoder/Agents authorization, Kernel proxy/fencing, disconnect/reconnect, checkpoint, and release without direct Sandbox access.

## Implementation Boundary

This proposed ADR does not authorize capability names, a Rust Port/type, PTY/ConPTY, process spawn, guest-agent stream, Proto/SDK/API, persistence, cache, configuration, Provider, Service Host, deployment, or cross-repository source change.

## Supersedes / Superseded By

This decision narrows the interactive portion deferred by ADR-20260729 Command Execution. It does not supersede the bounded Command result contract.
