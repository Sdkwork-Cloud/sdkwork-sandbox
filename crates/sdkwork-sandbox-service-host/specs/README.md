# Service Host Component Contract

`component.spec.json` is the machine authority for the future L5 composition root. No executable composition is declared in Phase 0.

`sandbox-service-host-composition.contract.json` is the draft candidate contract for `SandboxServiceHostConfig`, injected dependencies, standalone/cloud parity, fail-closed `SandboxServiceHostReadiness`, and bounded idempotent shutdown. It sets `implementationAuthorized` to `false`; it is review evidence, not authority to add public exports, config keys, runtime entrypoints, Provider implementations, API/SDK surfaces, Secret/KMS wiring, or deployment profiles.
