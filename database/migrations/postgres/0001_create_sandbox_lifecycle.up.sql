-- sdkwork:migration
-- id: 0001_create_sandbox_lifecycle
-- engine: postgres
-- module: sandbox
-- purpose: Create authoritative Sandbox Session, Operation, Runtime Binding, and Lease/Fencing tables
-- reversible: false
-- rollback: forward-fix
-- transactional: true
-- lock: new-tables-only
-- lock_timeout: 2s
-- statement_timeout: 30s
-- rewrite: none
-- replication_wal: bounded new-schema DDL with no backfill
-- cancellation: cancel before transaction commit
-- recovery: fix the migration forward or restore the empty pre-release schema
-- contract_version: 0.1.0

CREATE TABLE sandbox_session (
    tenant_id TEXT NOT NULL,
    sandbox_session_id TEXT NOT NULL,
    sandbox_workspace_id TEXT NOT NULL,
    sandbox_session_state TEXT NOT NULL,
    sandbox_required_capabilities JSONB NOT NULL DEFAULT '[]'::JSONB,
    sandbox_minimum_assurance TEXT NOT NULL,
    sandbox_last_failure TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sandbox_session PRIMARY KEY (tenant_id, sandbox_session_id),
    CONSTRAINT ck_sandbox_session_tenant_id CHECK (char_length(tenant_id) BETWEEN 1 AND 128),
    CONSTRAINT ck_sandbox_session_id CHECK (char_length(sandbox_session_id) BETWEEN 1 AND 128),
    CONSTRAINT ck_sandbox_session_workspace_id CHECK (char_length(sandbox_workspace_id) BETWEEN 1 AND 128),
    CONSTRAINT ck_sandbox_session_state CHECK (
        sandbox_session_state IN ('created', 'starting', 'running', 'stopping', 'stopped', 'failed', 'destroying', 'destroyed')
    ),
    CONSTRAINT ck_sandbox_session_required_capabilities CHECK (
        jsonb_typeof(sandbox_required_capabilities) = 'array'
        AND jsonb_array_length(sandbox_required_capabilities) <= 32
    ),
    CONSTRAINT ck_sandbox_session_minimum_assurance CHECK (
        sandbox_minimum_assurance IN ('host_user', 'container', 'user_space_kernel', 'micro_vm', 'dedicated_vm')
    ),
    CONSTRAINT ck_sandbox_session_last_failure CHECK (
        sandbox_last_failure IS NULL OR sandbox_last_failure IN ('provider', 'readiness', 'cleanup')
    ),
    CONSTRAINT ck_sandbox_session_version CHECK (version >= 0)
);

CREATE INDEX idx_sandbox_session_reconciliation
    ON sandbox_session (tenant_id, sandbox_session_state, sandbox_session_id)
    WHERE sandbox_session_state IN ('starting', 'stopping', 'destroying');

CREATE INDEX idx_sandbox_session_workspace
    ON sandbox_session (tenant_id, sandbox_workspace_id, sandbox_session_id);

CREATE TABLE sandbox_session_operation (
    tenant_id TEXT NOT NULL,
    sandbox_operation_id TEXT NOT NULL,
    sandbox_session_id TEXT NOT NULL,
    sandbox_operation_sequence BIGINT NOT NULL,
    sandbox_operation_kind TEXT NOT NULL,
    sandbox_operation_outcome TEXT NOT NULL,
    sandbox_session_failure TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sandbox_session_operation PRIMARY KEY (tenant_id, sandbox_operation_id),
    CONSTRAINT uk_sandbox_session_operation_sequence UNIQUE (
        tenant_id, sandbox_session_id, sandbox_operation_sequence
    ),
    CONSTRAINT fk_sandbox_session_operation_session FOREIGN KEY (tenant_id, sandbox_session_id)
        REFERENCES sandbox_session (tenant_id, sandbox_session_id) ON DELETE CASCADE,
    CONSTRAINT ck_sandbox_session_operation_id CHECK (char_length(sandbox_operation_id) BETWEEN 1 AND 128),
    CONSTRAINT ck_sandbox_session_operation_sequence CHECK (sandbox_operation_sequence >= 0),
    CONSTRAINT ck_sandbox_session_operation_kind CHECK (
        sandbox_operation_kind IN ('create', 'start', 'stop', 'destroy')
    ),
    CONSTRAINT ck_sandbox_session_operation_outcome CHECK (
        sandbox_operation_outcome IN ('in_progress', 'succeeded', 'failed')
    ),
    CONSTRAINT ck_sandbox_session_operation_failure CHECK (
        (sandbox_operation_outcome = 'failed' AND sandbox_session_failure IN ('provider', 'readiness', 'cleanup'))
        OR (sandbox_operation_outcome <> 'failed' AND sandbox_session_failure IS NULL)
    )
);

CREATE TABLE sandbox_runtime_binding (
    tenant_id TEXT NOT NULL,
    sandbox_runtime_binding_id TEXT NOT NULL,
    sandbox_session_id TEXT NOT NULL,
    sandbox_id TEXT NOT NULL,
    sandbox_provider_id TEXT NOT NULL,
    sandbox_allocation_ciphertext TEXT,
    sandbox_allocation_key_id TEXT,
    sandbox_allocation_key_version BIGINT,
    sandbox_allocation_crypto_version SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sandbox_runtime_binding PRIMARY KEY (tenant_id, sandbox_runtime_binding_id),
    CONSTRAINT uk_sandbox_runtime_binding_session UNIQUE (tenant_id, sandbox_session_id),
    CONSTRAINT uk_sandbox_runtime_binding_sandbox UNIQUE (tenant_id, sandbox_id),
    CONSTRAINT fk_sandbox_runtime_binding_session FOREIGN KEY (tenant_id, sandbox_session_id)
        REFERENCES sandbox_session (tenant_id, sandbox_session_id) ON DELETE CASCADE,
    CONSTRAINT ck_sandbox_runtime_binding_id CHECK (char_length(sandbox_runtime_binding_id) BETWEEN 1 AND 128),
    CONSTRAINT ck_sandbox_runtime_binding_sandbox_id CHECK (char_length(sandbox_id) BETWEEN 1 AND 128),
    CONSTRAINT ck_sandbox_runtime_binding_provider_id CHECK (char_length(sandbox_provider_id) BETWEEN 1 AND 128),
    CONSTRAINT ck_sandbox_runtime_binding_allocation_metadata CHECK (
        (
            sandbox_allocation_ciphertext IS NULL
            AND sandbox_allocation_key_id IS NULL
            AND sandbox_allocation_key_version IS NULL
            AND sandbox_allocation_crypto_version IS NULL
        )
        OR (
            char_length(sandbox_allocation_ciphertext) BETWEEN 1 AND 8192
            AND char_length(sandbox_allocation_key_id) BETWEEN 1 AND 128
            AND sandbox_allocation_key_id ~ '^[!-~]+$'
            AND sandbox_allocation_key_version > 0
            AND sandbox_allocation_crypto_version > 0
        )
    )
);

CREATE INDEX idx_sandbox_runtime_binding_provider
    ON sandbox_runtime_binding (tenant_id, sandbox_provider_id, sandbox_runtime_binding_id);

CREATE TABLE sandbox_session_lease (
    tenant_id TEXT NOT NULL,
    sandbox_session_id TEXT NOT NULL,
    sandbox_lease_owner_id TEXT,
    sandbox_lease_expires_at TIMESTAMPTZ,
    sandbox_fencing_token BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sandbox_session_lease PRIMARY KEY (tenant_id, sandbox_session_id),
    CONSTRAINT fk_sandbox_session_lease_session FOREIGN KEY (tenant_id, sandbox_session_id)
        REFERENCES sandbox_session (tenant_id, sandbox_session_id) ON DELETE CASCADE,
    CONSTRAINT ck_sandbox_session_lease_owner CHECK (
        sandbox_lease_owner_id IS NULL OR char_length(sandbox_lease_owner_id) BETWEEN 1 AND 128
    ),
    CONSTRAINT ck_sandbox_session_lease_tuple CHECK (
        (sandbox_lease_owner_id IS NULL AND sandbox_lease_expires_at IS NULL)
        OR (sandbox_lease_owner_id IS NOT NULL AND sandbox_lease_expires_at IS NOT NULL)
    ),
    CONSTRAINT ck_sandbox_session_lease_fencing_token CHECK (sandbox_fencing_token >= 0)
);

CREATE INDEX idx_sandbox_session_lease_expiry
    ON sandbox_session_lease (tenant_id, sandbox_lease_expires_at, sandbox_session_id)
    WHERE sandbox_lease_owner_id IS NOT NULL;
