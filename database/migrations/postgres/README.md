# PostgreSQL Migrations

Authoritative Sandbox migrations use sortable `*.up.sql` files with explicit SDKWork migration metadata. Production rollback uses compatible application rollback or reviewed forward-fix/restore cutover; migrations are not automatically reversed.

SQLite migrations are forbidden in this authoritative-server root.
