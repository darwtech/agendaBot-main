-- Usuarios del panel de este negocio (inicio de sesión con correo y contraseña).
CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL CHECK (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 100),
    -- scrypt$<salt>$<hash>; la contraseña en claro nunca se guarda.
    password_hash text NOT NULL,
    last_login_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    estado boolean GENERATED ALWAYS AS (deleted_at IS NULL) STORED
);
CREATE UNIQUE INDEX uq_users_email ON users (email) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- Audita altas, bajas, cambios de datos y cada inicio de sesión (last_login_at).
CREATE TRIGGER trg_users_audit AFTER INSERT OR DELETE OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- Sesiones abiertas. Cerrar sesión = baja lógica (deleted_at).
CREATE TABLE sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    -- SHA-256 del token de sesión que guarda el navegador.
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    estado boolean GENERATED ALWAYS AS (deleted_at IS NULL) STORED
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- El inicio de sesión ya queda en la auditoría de users; aquí solo se auditan los cierres.
CREATE TRIGGER trg_sessions_audit AFTER UPDATE OF deleted_at ON sessions
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
