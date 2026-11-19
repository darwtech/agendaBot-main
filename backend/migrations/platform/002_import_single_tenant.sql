-- Instalaciones anteriores (un solo negocio en el schema public):
-- mueve todas sus tablas, con datos, índices, triggers y auditoría, al schema del primer negocio.
-- En una base nueva no hace nada.
DO $$
DECLARE
  t text;
BEGIN
  IF to_regclass('public.services') IS NULL THEN
    RETURN;
  END IF;

  CREATE SCHEMA t_el_bigote;
  FOREACH t IN ARRAY ARRAY[
    'services', 'customers', 'appointments', 'business_hours',
    'conversations', 'business_settings', 'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I SET SCHEMA t_el_bigote', t);
  END LOOP;

  -- Las tablas movidas equivalen a la plantilla tenant/001_tables.sql.
  CREATE TABLE t_el_bigote.schema_migrations (
    version text PRIMARY KEY,
    name text NOT NULL,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
  INSERT INTO t_el_bigote.schema_migrations (version, name, checksum)
  VALUES ('001', '001_tables.sql', 'importado-de-public');

  -- Registro de migraciones del backend de un solo negocio, ya sustituido por platform_migrations.
  DROP TABLE IF EXISTS public.schema_migrations;
END $$;
