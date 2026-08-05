# Component Interaction Flows

Status: active

Owner: SDKWork Runtime Platform

Updated: 2026-07-29

## 目的

本视图描述已实现和计划中的组件交互流程，供架构评审时参考。

## Sandbox Session Lifecycle Flow

```mermaid
sequenceDiagram
    participant Kernel as sdkwork-kernel
    participant Service as Sandbox Lifecycle Service
    participant Repo as PostgreSQL Repository
    participant Provider as Sandbox Provider
    participant Store as Sandbox Session Store

    Kernel->>Service: StartSandbox(tenantId, workspaceId, capabilities)
    Service->>Repo: insertSandboxSession(session)
    Service->>Provider: allocate(allocationRequest)
    Provider-->>Service: allocationResult
    Service->>Repo: saveSandboxSession(session, version, lease)
    Service-->>Kernel: sandboxSessionId

    Kernel->>Service: StopSandbox(sessionId)
    Service->>Provider: stop(stopRequest)
    Service->>Repo: saveSandboxSession(stoppedState)
    Service-->>Kernel: stopResult
```

## Lease/Concurrency Flow

```mermaid
sequenceDiagram
    participant Reconciler as Reconciliation Loop
    participant Repo as Session Repository
    participant Lease as Sandbox Session Lease
    participant Provider as Provider Adapter

    Reconciler->>Repo: getRecoveringSessions(page)
    Repo-->>Reconciler: sessionPage
    Reconciler->>Lease: acquire(sessionId, ownerId, duration)
    Lease-->>Reconciler: leaseResult
    alt leaseAcquired
        Reconciler->>Provider: reconcile(session)
        Provider-->>Reconciler: outcome
        Reconciler->>Lease: release(lease)
    else leaseNotAcquired
        Reconciler->>Reconciler: skipToNext
    end
```

## Key Rotation Flow

```mermaid
sequenceDiagram
    participant Operator as Operator/Runbook
    participant Repo as PostgreSQL Repository
    participant Crypto as Encryption Service
    participant KMS as KMS/Key Source

    Operator->>Repo: getCurrentKeyIdentity()
    Repo-->>Operator: currentKeyId
    Operator->>KMS: generateNewKey()
    KMS-->>Operator: newKeyMaterial
    Operator->>Crypto: reencryptAllocationRefs(oldKey, newKey)
    Crypto-->>Operator: reencryptResult
    Operator->>Repo: persistRotatedKeys(newKeyIdentity)
    Operator->>Operator: verifyAllocationAccessibility()
```

## Sandbox Provider Allocation Flow

```mermaid
flowchart TD
    A[Sandbox Allocation Request] --> B{Capability Policy Check}
    B -->|Pass| C{Provider Readiness}
    B -->|Fail| D[Return Unsupported Capability]
    C -->|Ready| E[Validate Workspace Attachment]
    C -->|Not Ready| F[Return Provider Unavailable]
    E -->|Valid| G[Create SandboxRuntimeBinding]
    E -->|Invalid| H[Return Policy Denied]
    G --> I[Persist Allocation Intent]
    I --> J[Provider.allocate]
    J --> K[Persist Allocation Result]
    K --> L[Return SandboxId + Binding]
```

## Data Flow Boundaries

```mermaid
flowchart LR
    subgraph Control Plane
        S[Sandbox Service]
        R[Repository]
        Q[Quota]
    end

    subgraph Provider Boundary
        P[Provider SPI]
        E[Executor SPI]
    end

    subgraph Data Plane
        L[Local Provider]
        F[Firecracker Provider]
    end

    S -->|Session State| R
    S -->|Read Identity| P
    S -->|Write Events| Q
    P -->|Static Capability| L
    P -->|Static Capability| F
    E -->|Execute + Result| L
    E -->|Execute + Result| F
```

## Identity Isolation

```mermaid
flowchart TB
    subgraph External Boundary
        Kernel[sdkwork-kernel]
    end

    subgraph Sandbox Boundary
        SVC[Sandbox Service]
        ID[Sandbox Identity Types]
    end

    subgraph Provider Boundary
        PA[Provider Adapter]
        PREF[SandboxProviderAllocationRef]
    end

    Kernel -->|SandboxWorkspaceId| SVC
    Kernel -->|SandboxSessionId| SVC
    SVC -->|TenantId, SandboxId| ID
    ID -->|paque reference only| PA
    PA -->|expose_to_provider| PREF
    PREF -.->|only provider adapter| PA
```

## Security Flow Summary

| 流 | 输入 | 处理 | 输出 |
| --- | --- | --- | --- |
| Workspace Access | Capability-rooted attachment | Authority check via Kernel | SandboxWorkspaceId only |
| Provider Allocation | Tenant + capability + binding | Policy + readiness check | Opaque sandbox_id + binding |
| Command Execution | Fenced idempotent request | Fingerprint + lease + output bound | Bounded result/replay |
| Key Rotation | KMS-derived material | AES-256-GCM re-encrypt | Zeroized new identity |
| Cleanup | Destroy/stop signal | Descendant termination + residue scan | Cleanup status |

## Component Contract Map

| 调用方 | 被调用方 | 契约 | 验证方式 |
| --- | --- | --- | --- |
| Kernel | Lifecycle Service | SandboxSession API | Integration test |
| Lifecycle Service | Repository | SandboxSessionRepository trait | 33 unit tests |
| Lifecycle Service | Provider SPI | SandboxProvider trait | 5 fake boundary tests |
| Lifecycle Service | Lease Manager | Lease/Fencing | Concurrency tests |
| Reconciliation | Repository + Provider | Recovery + page | 7 reconciler tests |
| Repository (SQLx) | PostgreSQL | Migration + query | 6 unit + live PG evidence |
