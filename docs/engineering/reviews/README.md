# Engineering Reviews

Design, code, release, and verification review records use stable `REVIEW-*` ids and follow `DOCUMENTATION_SPEC.md` section 2.

## Active Records

- [REVIEW-20260728: Sandbox Foundation Verification](REVIEW-20260728-sandbox-foundation-verification.md) - accepted.
- [REVIEW-20260728: Sandbox Lifecycle Core Verification](REVIEW-20260728-sandbox-lifecycle-core-verification.md) - conditional pass.
- [REVIEW-20260728: Sandbox Workspace Attachment Boundary Verification](REVIEW-20260728-sandbox-workspace-attachment-boundary-verification.md) - conditional pass.
- [REVIEW-20260728: Sandbox PostgreSQL Persistence Verification](REVIEW-20260728-sandbox-postgresql-persistence-verification.md) - conditional pass.
- [REVIEW-20260729: Sandbox Provider Allocation Key Rotation Verification](REVIEW-20260729-sandbox-provider-allocation-key-rotation-verification.md) - conditional pass.
- [REVIEW-20260729: Sandbox Command Execution Architecture And Security](REVIEW-20260729-sandbox-command-execution-architecture-security.md) - pending human review.
- [REVIEW-20260729: Sandbox Service Host Composition And Readiness](REVIEW-20260729-sandbox-service-host-composition-and-readiness.md) - pending human review.
- [REVIEW-20260729: Local Sandbox Provider Architecture And Security](REVIEW-20260729-local-provider-architecture-security.md) - pending human review; pre-review blockers recorded.
- [REVIEW-20260729: Firecracker Sandbox Provider Architecture And Security](REVIEW-20260729-firecracker-provider-architecture-security.md) - pending human review; pre-review blockers recorded.
- [REVIEW-20260729: Sandbox Observability, Event, Audit And Outbox Contract](REVIEW-20260729-sandbox-observability-event-audit-outbox.md) - pending human review.
- [REVIEW-20260729: Sandbox Host Isolation Broker Architecture And Security](REVIEW-20260729-sandbox-host-isolation-broker.md) - pending human review; privileged operation, grant, fencing, audit, supply-chain, and real KVM blockers recorded.
- [REVIEW-20260729: Sandbox Firecracker Artifact Compatibility And Supply Chain](REVIEW-20260729-sandbox-firecracker-artifact-compatibility-and-supply-chain.md) - pending human review; exact tuple, release authority, key custody, revocation, materialization, rollback, and real KVM blockers recorded.
- [REVIEW-20260729: Sandbox Workspace Block Device Attachment And Sanitization](REVIEW-20260729-sandbox-workspace-block-device-attachment-and-sanitization.md) - pending human review; Agents/Drive/storage ownership, grant, encryption, device, sanitization, residue, quarantine, and real KVM blockers recorded.
- [REVIEW-20260729: Sandbox Firecracker Network Isolation Architecture And Security](REVIEW-20260729-sandbox-firecracker-network-isolation.md) - pending human review; policy authority, DenyAll, permanent denial, netns/Tap, atomic verification, cleanup, audit, and real KVM blockers recorded.
- [REVIEW-20260729: Sandbox Firecracker Resource Isolation Architecture And Security](REVIEW-20260729-sandbox-firecracker-resource-isolation.md) - pending human review; quota/capacity authority, Machine Config/cgroup v2, usage facts, Commerce handoff, cleanup, and real KVM blockers recorded.
- [REVIEW-20260729: Sandbox Multi-tenant Admission, Scheduling And Capacity](REVIEW-20260729-sandbox-multi-tenant-admission-scheduling-and-capacity.md) - pending human review; IAM/Commerce inputs, node trust, PostgreSQL atomic reservation, fairness, multi-replica races, recovery, and real KVM blockers recorded.
- [REVIEW-20260729: Sandbox Node Trust, Enrollment, Attestation And Verified Inventory](REVIEW-20260729-sandbox-node-trust-enrollment-attestation-and-inventory.md) - pending human review; bootstrap, machine identity, PKI/key custody, attestation, verified inventory, rotation/revocation, drain/quarantine, scheduler binding, and real KVM blockers recorded.
- [REVIEW-20260729: Sandbox PostgreSQL Quota And Capacity Persistence](REVIEW-20260729-sandbox-postgresql-quota-and-capacity-persistence.md) - pending human review; SQL subject migration, four State/Reservation tables, transaction/lock/CAS/fencing, RLS/roles, PITR and real PostgreSQL/Firecracker blockers recorded.
