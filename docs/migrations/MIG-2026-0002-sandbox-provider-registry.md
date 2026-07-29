# MIG-2026-0002: Sandbox Provider Registry Tables

Status: candidate
Owner: SDKWork Runtime Platform
Date: 2026-07-29
Requirement: REQ-2026-0003 (Secure Local Provider), REQ-2026-0008 (Firecracker Provider)
Module: sandbox
Engine: postgres

## 1. Purpose

建立 Provider 注册表，描述 `sandbox_local_provider`、`sandbox_firecracker_provider`（未来预留 `sandbox_docker_provider` 位置）的 identity、assurance、deployment profiles 与 capabilities；同时在 `sandbox_provider_binding` 中记录 Tenant+Session 对特定 Provider 实例运行时的绑定链。

当前所有 Provider metadata 仅出现于 draft Contract JSON；当 REQ-2026-0003/0008 实现激活后，必须通过 Scheduler 与 Admission 读取 Provider identity/assurance/registry 作为候选调度依据。

## 2. New Tables

### 2.1 `sandbox_provider_profile`

```sql
CREATE TABLE sandbox_provider_profile (
    provider_id          TEXT        NOT NULL,
    provider_name        TEXT        NOT NULL,
    provider_kind        TEXT        NOT NULL,
    provider_assurance   TEXT        NOT NULL,
    deployment_profile   TEXT        NOT NULL,
    host_platform_subset JSONB       NOT NULL DEFAULT '[]'::JSONB,
    provider_status      TEXT        NOT NULL DEFAULT 'inactive',
    version              BIGINT      NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_sandbox_provider_profile PRIMARY KEY (provider_id),
    CONSTRAINT ck_provider_name
        CHECK (provider_name IN ('sandbox_local_provider',
                                  'sandbox_firecracker_provider')),
    CONSTRAINT ck_provider_kind
        CHECK (provider_kind IN ('local', 'firecracker')),
    CONSTRAINT ck_provider_assurance
        CHECK (provider_assurance IN ('HostUser', 'MicroVm')),
    CONSTRAINT ck_deployment_profile
        CHECK (deployment_profile IN ('standalone', 'cloud')),
    CONSTRAINT ck_provider_status
        CHECK (provider_status IN ('inactive', 'active', 'draining',
                                    'quarantined', 'retired'))
);
```

### 2.2 `sandbox_provider_binding`

```sql
CREATE TABLE sandbox_provider_binding (
    tenant_id              BIGINT      NOT NULL,
    sandbox_binding_id     TEXT        NOT NULL,
    provider_id            TEXT        NOT NULL,
    provider_generation    BIGINT      NOT NULL,
    provider_fencing_token TEXT,
    provider_assurance     TEXT        NOT NULL,
    binding_state          TEXT        NOT NULL,
    provider_private_ref   JSONB,
    binding_version        BIGINT      NOT NULL DEFAULT 0,
    binding_sequence       BIGINT      NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_sandbox_provider_binding
        PRIMARY KEY (tenant_id, sandbox_binding_id),
    CONSTRAINT fk_provider_binding_provider
        FOREIGN KEY (provider_id)
        REFERENCES sandbox_provider_profile (provider_id)
        ON DELETE RESTRICT,
    CONSTRAINT ck_binding_state
        CHECK (binding_state IN ('pending', 'bound', 'quarantined',
                                  'releasing', 'released'))
);
```

## 3. Indexes

```sql
CREATE INDEX idx_sandbox_provider_profile_active
    ON sandbox_provider_profile (provider_status, provider_assurance)
    WHERE provider_status = 'active';

CREATE INDEX idx_sandbox_provider_binding_reconcile
    ON sandbox_provider_binding (tenant_id, provider_id, binding_state)
    WHERE binding_state IN ('pending', 'releasing');
```

## 4. Reversibility

`reversible: false`（新表创建，通过 DROP 回滚）。迁移前需 vacuum analyze `sandbox_session` / `sandbox_runtime_binding` 以保证业务无感。

Rollback: `DROP TABLE sandbox_provider_binding; DROP TABLE sandbox_provider_profile;` 级联删除相关索引与约束。

## 5. Validation

- `provider_name` 静态 seed 数据匹配 `specs/sandbox-provider-delivery-gates.contract.json` 中 `providers[].sandbox_provider_name`。
- 插入 `sandbox_local_provider` 与 `sandbox_firecracker_provider` 两条 seed row，`provider_status = 'inactive'`（实现就绪后才由 Operator 切 active）。
- 测试 INSERT/UPDATE 违反 `CHECK` constraints 时报错符合预期。
- 迁移后 `SELECT count(*) FROM sandbox_provider_profile` 必须为 2。

## 6. Dependencies

- MIG-2026-0001（tenant_id BIGINT 规范化）完成后执行，确保 FK 一致性。
- `REQ-2026-0003` / `REQ-2026-0008` Provider identity 真实实现就绪前，数据保持 `provider_status = 'inactive'`。

## 7. Authorization

创建独立 Role `sandbox_provider_registry_rw`：
- `GRANT SELECT, INSERT, UPDATE ON sandbox_provider_profile, sandbox_provider_binding TO sandbox_provider_registry_rw;`
- Application service-user `sandbox_service` 额外具备 `USAGE ON SCHEMA public`。

RLS: `sandbox_provider_binding` 开启 `tenant_id` 隔离策略；`sandbox_provider_profile` 不允许 tenant-scoped 限制，保持全局只读查询。

## 8. Evidence

- provider_profile seed 数据校验报告。
- 外键引用完整性验证（空 Profile 拒绝 Binding）。
- RLS 策略：跨 tenant 查询被拒测试。
- Lock/Statement timeout 记录。