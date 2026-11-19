import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 20,
});

/** Lo mínimo que necesitan los repositorios: un pool, un cliente o el contexto del negocio. */
export interface Db {
  query<R extends pg.QueryResultRow = any>(text: string, values?: unknown[]): Promise<pg.QueryResult<R>>;
}

/** Fija el schema del negocio en una conexión. Solo cambia dentro de la transacción en curso (LOCAL). */
export async function useSchema(client: pg.PoolClient, schema: string, local = true) {
  await client.query(`SET ${local ? 'LOCAL ' : ''}search_path TO ${pg.escapeIdentifier(schema)}, public`);
}

const tenantSchema = new AsyncLocalStorage<string>();

/** Ejecuta `fn` con el schema de un negocio como contexto de todas sus consultas. */
export const runInTenant = <T>(schema: string, fn: () => T): T => tenantSchema.run(schema, fn);

function currentSchema(): string {
  const schema = tenantSchema.getStore();
  if (!schema) throw new Error('Consulta de negocio fuera de su contexto (falta runInTenant)');
  return schema;
}

/**
 * Acceso a la base dentro del schema del negocio actual.
 * Cada consulta abre una transacción corta para que el search_path no se filtre a otras peticiones.
 * shortcut: 3 viajes extra por consulta; si pesa, mantener una conexión por petición.
 */
export function tdb(): Db {
  const schema = currentSchema();
  return {
    query: (text, values) => tenantTransaction((c) => c.query(text, values), schema),
  };
}

export async function tenantTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
  schema = currentSchema()
): Promise<T> {
  return withTransaction(async (client) => {
    await useSchema(client, schema);
    return fn(client);
  });
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
