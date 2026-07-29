# migrations

Phase Evidence 目录，记录数据库 schema 的规划迁移。每条迁移都有 Purpose、Affected Tables、Forward 脚本位置、回滚策略、Validation 与 Evidence Checklist。

## 索引

- [MIG-2026-0001](MIG-2026-0001-tenant-id-normalization.md) — tenant_id TEXT → BIGINT 规范化；tenant_mapping 双写策略；batch 回填；前向回滚。
- [MIG-2026-0002](MIG-2026-0002-sandbox-provider-registry.md) — sandbox_provider_profile 与 sandbox_provider_binding 两张新表；Provider identity/assurance/deployment 元数据；RLS Policy；sandbox_provider_registry_rw Role。
- [MIG-2026-0003](MIG-2026-0003-postgresql-quota-capacity-tables.md) — REQ-2026-0018 四张 PostgreSQL Quota/Capacity 持久化表；CAS、RLS、Expiry/Orphan 回收、FK 至 sandbox_provider_profile。