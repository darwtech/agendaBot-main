import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { pool, useSchema, withTransaction } from './pool.js';

const root = path.resolve(process.cwd(), 'migrations');

function loadFiles(dir: 'platform' | 'tenant') {
  const folder = path.join(root, dir);
  return readdirSync(folder)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const sql = readFileSync(path.join(folder, file), 'utf8');
      return {
        file,
        version: file.split('_')[0],
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    });
}

const trackingTable = (table: string) => `CREATE TABLE IF NOT EXISTS ${table} (
  version text PRIMARY KEY,
  name text NOT NULL,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

/** Migraciones globales (schema public). Devuelve los archivos aplicados. */
export async function migratePlatform(): Promise<string[]> {
  await pool.query(trackingTable('public.platform_migrations'));
  const { rows } = await pool.query<{ version: string }>('SELECT version FROM public.platform_migrations');
  const done = new Set(rows.map((r) => r.version));
  const applied: string[] = [];
  for (const m of loadFiles('platform')) {
    if (done.has(m.version)) continue;
    await withTransaction(async (c) => {
      await c.query('SET LOCAL search_path TO public');
      await c.query(m.sql);
      await c.query('INSERT INTO public.platform_migrations (version, name, checksum) VALUES ($1, $2, $3)', [
        m.version,
        m.file,
        m.checksum,
      ]);
    });
    applied.push(m.file);
  }
  return applied;
}

/** Aplica la plantilla de negocio pendiente en un schema. Debe llamarse dentro de una transacción. */
export async function migrateTenantSchema(client: pg.PoolClient, schema: string): Promise<string[]> {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${pg.escapeIdentifier(schema)}`);
  await useSchema(client, schema);
  await client.query(trackingTable('schema_migrations'));
  const { rows } = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
  const done = new Set(rows.map((r) => r.version));
  const applied: string[] = [];
  for (const m of loadFiles('tenant')) {
    if (done.has(m.version)) continue;
    await client.query(m.sql);
    await client.query('INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)', [
      m.version,
      m.file,
      m.checksum,
    ]);
    applied.push(m.file);
  }
  return applied;
}

/** Plataforma primero y luego cada negocio (activo o no), cada uno en su transacción. */
export async function migrateAll(log = console.log) {
  for (const f of await migratePlatform()) log(`✔ plataforma: ${f}`);
  const { rows } = await pool.query<{ slug: string; schema_name: string }>(
    'SELECT slug, schema_name FROM public.tenants ORDER BY created_at'
  );
  for (const t of rows) {
    const applied = await withTransaction((c) => migrateTenantSchema(c, t.schema_name));
    for (const f of applied) log(`✔ ${t.slug}: ${f}`);
  }
}
