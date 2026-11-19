-- Extensiones y funciones compartidas por la plataforma y todos los negocios.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Escribe en la tabla audit_logs del MISMO schema que la tabla auditada,
-- así cada negocio tiene su propia auditoría aislada.
CREATE OR REPLACE FUNCTION public.audit_row_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_operation TEXT := TG_OP;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- UPDATE sin cambios reales (solo updated_at) no genera ruido
    IF (to_jsonb(NEW) - 'updated_at') = (to_jsonb(OLD) - 'updated_at') THEN
      RETURN NEW;
    END IF;
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_operation := 'SOFT_DELETE';
    END IF;
  END IF;

  EXECUTE format(
    'INSERT INTO %I.audit_logs (table_name, record_id, operation, old_values, new_values, actor_id)
     VALUES ($1, $2, $3, $4, $5, $6)',
    TG_TABLE_SCHEMA
  ) USING
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    v_operation,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.updated_by
         WHEN TG_OP = 'INSERT' THEN NEW.created_by
         ELSE NEW.updated_by END;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
