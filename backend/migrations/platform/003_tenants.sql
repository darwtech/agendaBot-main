-- Auditoría de la plataforma (altas y cambios de negocios).
CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'SOFT_DELETE', 'DELETE')),
    old_values jsonb,
    new_values jsonb,
    actor_id uuid,
    occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_record ON public.audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_occurred_at ON public.audit_logs (occurred_at);

-- Un negocio = una fila aquí + un schema propio con sus tablas.
CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text NOT NULL UNIQUE
      CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 2 AND 40),
    name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
    business_type text NOT NULL DEFAULT 'otro' CHECK (char_length(business_type) BETWEEN 2 AND 40),
    schema_name text NOT NULL UNIQUE CHECK (schema_name ~ '^t_[a-z0-9_]+$'),
    -- SHA-256 del token del panel; el token en claro nunca se guarda.
    admin_token_hash text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    estado boolean GENERATED ALWAYS AS (deleted_at IS NULL) STORED
);

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenants_audit AFTER INSERT OR DELETE OR UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- Registra el negocio importado por 002 (si lo hubo). Su token se asigna con: npm run tenant:token
DO $$
BEGIN
  IF to_regnamespace('t_el_bigote') IS NOT NULL THEN
    EXECUTE $q$
      INSERT INTO public.tenants (slug, name, business_type, schema_name)
      VALUES (
        'el-bigote',
        coalesce((SELECT data->>'businessName' FROM t_el_bigote.business_settings
                  WHERE deleted_at IS NULL LIMIT 1), 'Barbería El Bigote'),
        'barberia',
        't_el_bigote'
      )
    $q$;
  END IF;
END $$;
