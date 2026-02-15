import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://crestdesk:crestdesk_dev@localhost:5432/crestdesk',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

export function getPool(): Pool {
  return pool;
}

/**
 * Executes a callback within a transaction with the tenant context set for RLS.
 *
 * Uses a parameterized query to set the tenant ID, avoiding SQL injection.
 * The SET LOCAL ensures the setting is scoped to the transaction only.
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Use sql.param via template literal for safe parameterised SET LOCAL.
    // PostgreSQL SET LOCAL does not support $1 placeholders directly, so we
    // validate the tenantId format (UUID) before interpolating with sql.raw.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
      throw new Error('Invalid tenant ID format');
    }
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    return callback(tx as unknown as typeof db);
  });
}
