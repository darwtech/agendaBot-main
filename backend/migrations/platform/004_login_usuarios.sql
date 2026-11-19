-- El panel pasa de token por negocio a usuarios con correo y contraseña.
ALTER TABLE public.tenants DROP COLUMN admin_token_hash;

-- La auditoría nunca guarda secretos (hash de contraseña ni de sesión).
CREATE OR REPLACE FUNCTION public.audit_row_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_operation TEXT := TG_OP;
  v_old jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) - 'password_hash' - 'token_hash' END;
  v_new jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) - 'password_hash' - 'token_hash' END;
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
    v_old,
    v_new,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.updated_by
         WHEN TG_OP = 'INSERT' THEN NEW.created_by
         ELSE NEW.updated_by END;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
