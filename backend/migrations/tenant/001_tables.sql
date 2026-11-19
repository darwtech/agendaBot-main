-- Plantilla de cada negocio: se ejecuta con search_path = <schema del negocio>, public.
-- Todas las tablas tienen estado (derivado de deleted_at) y columnas de auditoría.
CREATE TABLE appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    service_id uuid NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    channel text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    estado boolean GENERATED ALWAYS AS ((deleted_at IS NULL)) STORED,
    notes text,
    cancelled_at timestamp with time zone,
    CONSTRAINT appointments_channel_check CHECK ((channel = ANY (ARRAY['web'::text, 'whatsapp'::text, 'api'::text]))),
    CONSTRAINT appointments_notes_check CHECK ((char_length(notes) <= 500)),
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['confirmed'::text, 'cancelled'::text]))),
    CONSTRAINT appointments_valid_range CHECK ((ends_at > starts_at))
);
CREATE TABLE audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    operation text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    actor_id uuid,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_logs_operation_check CHECK ((operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'SOFT_DELETE'::text, 'DELETE'::text])))
);
CREATE TABLE business_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_of_week smallint NOT NULL,
    opens_at time without time zone NOT NULL,
    closes_at time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    estado boolean GENERATED ALWAYS AS ((deleted_at IS NULL)) STORED,
    CONSTRAINT business_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT business_hours_valid_range CHECK ((closes_at > opens_at))
);
CREATE TABLE business_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    estado boolean GENERATED ALWAYS AS ((deleted_at IS NULL)) STORED
);
CREATE TABLE conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel text NOT NULL,
    external_id text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    estado boolean GENERATED ALWAYS AS ((deleted_at IS NULL)) STORED,
    CONSTRAINT conversations_channel_check CHECK ((channel = ANY (ARRAY['web'::text, 'whatsapp'::text]))),
    CONSTRAINT conversations_external_id_check CHECK (((char_length(external_id) >= 1) AND (char_length(external_id) <= 200)))
);
CREATE TABLE customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    estado boolean GENERATED ALWAYS AS ((deleted_at IS NULL)) STORED,
    CONSTRAINT customers_contact_required CHECK (((phone IS NOT NULL) OR (email IS NOT NULL))),
    CONSTRAINT customers_email_check CHECK (((email = lower(email)) AND (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))),
    CONSTRAINT customers_full_name_check CHECK (((char_length(btrim(full_name)) >= 2) AND (char_length(btrim(full_name)) <= 100))),
    CONSTRAINT customers_phone_check CHECK ((phone ~ '^[0-9]{7,15}$'::text))
);
CREATE TABLE services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    price numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    estado boolean GENERATED ALWAYS AS ((deleted_at IS NULL)) STORED,
    CONSTRAINT services_duration_minutes_check CHECK (((duration_minutes >= 5) AND (duration_minutes <= 480))),
    CONSTRAINT services_name_check CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 80))),
    CONSTRAINT services_price_check CHECK ((price >= (0)::numeric))
);
ALTER TABLE ONLY appointments
    ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist (tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE (((status = 'confirmed'::text) AND (deleted_at IS NULL)));
ALTER TABLE ONLY appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);
ALTER TABLE ONLY business_settings
    ADD CONSTRAINT business_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);
CREATE INDEX idx_appointments_customer ON appointments USING btree (customer_id);
CREATE INDEX idx_appointments_service ON appointments USING btree (service_id);
CREATE INDEX idx_appointments_starts_at ON appointments USING btree (starts_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs USING btree (occurred_at);
CREATE INDEX idx_audit_logs_record ON audit_logs USING btree (table_name, record_id);
CREATE UNIQUE INDEX uq_business_hours_slot ON business_hours USING btree (day_of_week, opens_at) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_business_settings_single ON business_settings USING btree ((true)) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_conversations_channel_external ON conversations USING btree (channel, external_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_customers_email ON customers USING btree (email) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_customers_phone ON customers USING btree (phone) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_services_name ON services USING btree (lower(name)) WHERE (deleted_at IS NULL);
CREATE TRIGGER trg_appointments_audit AFTER INSERT OR DELETE OR UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_business_hours_audit AFTER INSERT OR DELETE OR UPDATE ON business_hours FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_business_hours_updated_at BEFORE UPDATE ON business_hours FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_business_settings_audit AFTER INSERT OR DELETE OR UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_conversations_audit AFTER INSERT OR DELETE OR UPDATE OF channel, external_id, deleted_at ON conversations FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_customers_audit AFTER INSERT OR DELETE OR UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_services_audit AFTER INSERT OR DELETE OR UPDATE ON services FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE ONLY appointments
    ADD CONSTRAINT appointments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;
ALTER TABLE ONLY appointments
    ADD CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT;
