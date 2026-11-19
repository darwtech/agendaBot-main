---
name: agendabot-base-de-datos
description: "Diseña y escribe desde cero la base de datos PostgreSQL de AgendaBot (multinegocio con un schema por negocio), sus migraciones, el script para aplicarlas, datos de ejemplo y una verificación automática. Úsala cuando haya que crear o cambiar tablas, migraciones o el modelo de datos de AgendaBot."
---

# AgendaBot · Base de datos

Escribes tú todo el SQL a partir de esta especificación. No existe un SQL de referencia: los nombres de tablas, columnas, restricciones y comportamientos de aquí **son el contrato** del que dependen el backend y el frontend; respétalos exactamente.

## Requisitos

PostgreSQL 15 o superior. Extensión `btree_gist`. Todo en UTF‑8.

## Arquitectura: un schema por negocio

- Schema `public` = **plataforma** (común): registro de negocios, directorio de correos, auditoría de la plataforma, control de migraciones.
- Un schema por negocio llamado `t_<slug>` con `-` cambiado por `_` (slug `barberia-central` → `t_barberia_central`), todos con **las mismas tablas**.
- El backend ejecuta cada operación de un negocio dentro de una transacción con `SET LOCAL search_path TO "t_<slug>", public`. Por eso las tablas de negocio se crean **sin prefijo de schema** y usan funciones de `public`.

## Convenciones para TODAS las tablas (plataforma y negocio, salvo `user_emails` y las de auditoría)

| Columna | Definición |
|---|---|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `created_at`, `updated_at` | `timestamptz NOT NULL DEFAULT now()` |
| `deleted_at` | `timestamptz` — **borrado lógico** (la app nunca hace `DELETE`) |
| `created_by`, `updated_by` | `uuid` — usuario del panel que hizo el cambio; `NULL` = público o sistema; plataforma = `00000000-0000-4000-8000-000000000002` |
| `estado` | `boolean GENERATED ALWAYS AS (deleted_at IS NULL) STORED` |

Cada tabla con estas columnas lleva dos triggers: `BEFORE UPDATE … EXECUTE FUNCTION public.set_updated_at()` y `AFTER INSERT OR DELETE OR UPDATE … EXECUTE FUNCTION public.audit_row_change()` (excepciones indicadas abajo). Los índices únicos son **parciales**: `WHERE deleted_at IS NULL` (un registro borrado no bloquea crear otro igual).

## Funciones (en `public`)

1. `public.set_updated_at()` — trigger `plpgsql` que pone `NEW.updated_at := now()` y devuelve `NEW`.
2. `public.audit_row_change()` — trigger `plpgsql` de auditoría:
   - Inserta en la tabla `audit_logs` **del mismo schema que la tabla que cambió** (usar `TG_TABLE_SCHEMA` con `EXECUTE format('INSERT INTO %I.audit_logs …', TG_TABLE_SCHEMA)`), así cada negocio tiene su auditoría aislada.
   - Columnas que rellena: `table_name` = `TG_TABLE_NAME`; `record_id` = id de la fila (`OLD.id` si es DELETE); `operation` = `TG_OP`, salvo un UPDATE que pasa `deleted_at` de NULL a valor → `'SOFT_DELETE'`; `old_values` = `to_jsonb(OLD)` (NULL en INSERT); `new_values` = `to_jsonb(NEW)` (NULL en DELETE); `actor_id` = `OLD.updated_by` en DELETE, `NEW.created_by` en INSERT, `NEW.updated_by` en UPDATE.
   - **Nunca guarda secretos**: quita las claves `password_hash`, `token_hash` y `api_key_encrypted` de `old_values`/`new_values` (`to_jsonb(x) - 'password_hash' - 'token_hash' - 'api_key_encrypted'`).
   - Un UPDATE en el que solo cambia `updated_at` no deja registro.
   - Devuelve `OLD` en DELETE y `NEW` en el resto.

## Migraciones de plataforma (`migrations/platform/`, se aplican sobre `public`)

`001_extensiones_y_funciones.sql`: `CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;` y las dos funciones.

`002_negocios.sql`:
- `public.audit_logs`: `id uuid PK default gen_random_uuid()`, `table_name text NOT NULL`, `record_id uuid NOT NULL`, `operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','SOFT_DELETE','DELETE'))`, `old_values jsonb`, `new_values jsonb`, `actor_id uuid`, `occurred_at timestamptz NOT NULL DEFAULT now()`. Índices en `(table_name, record_id)` y `(occurred_at)`.
- `public.tenants` (convenciones completas): `slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 2 AND 40)`, `name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100)`, `business_type text NOT NULL DEFAULT 'otro' CHECK (char_length(business_type) BETWEEN 2 AND 40)`, `schema_name text NOT NULL UNIQUE CHECK (schema_name ~ '^t_[a-z0-9_]+$')`. Triggers `set_updated_at` y `audit_row_change`. Desactivar un negocio = `deleted_at`.

`003_directorio_de_correos.sql`:
- `public.user_emails`: `email text PRIMARY KEY CHECK (email = lower(email) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')`, `tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT`, `created_at timestamptz NOT NULL DEFAULT now()`. Índice en `tenant_id`. Garantiza que un correo de usuario del panel pertenezca a **un solo** negocio y permite el login de la portada con una consulta. Sin triggers.

## Migraciones de cada negocio (`migrations/tenant/`, en este orden)

| Archivo | Tabla y columnas (además de las convenciones) | Reglas |
|---|---|---|
| `001_auditoria.sql` | `audit_logs`: igual que `public.audit_logs` (sin convenciones ni triggers) | Va primero: la usan los triggers del resto |
| `002_ajustes.sql` | `business_settings`: `data jsonb NOT NULL DEFAULT '{}'` | Índice único `((true)) WHERE deleted_at IS NULL` → como mucho una fila activa |
| `003_horario.sql` | `business_hours`: `day_of_week smallint NOT NULL CHECK (0–6)` (0 = domingo), `opens_at time NOT NULL`, `closes_at time NOT NULL` | `CHECK (closes_at > opens_at)`; único `(day_of_week, opens_at)` |
| `004_servicios.sql` | `services`: `name text NOT NULL CHECK (2–80 sin espacios extremos)`, `description text`, `duration_minutes integer NOT NULL CHECK (5–480)`, `price numeric(10,2) NOT NULL CHECK (>= 0)` (dólares USD), `is_active boolean NOT NULL DEFAULT true` | Único `lower(name)` |
| `005_clientes.sql` | `customers`: `full_name text NOT NULL CHECK (2–100)`, `phone text CHECK (phone ~ '^[0-9]{7,15}$')` (dígitos con prefijo de país, sin `+`), `email text CHECK (minúsculas y formato correo)`, `whatsapp_jid text CHECK (3–200)` (chat de WhatsApp sin número, p. ej. `12345@lid`) | `CHECK (phone IS NOT NULL OR email IS NOT NULL OR whatsapp_jid IS NOT NULL)`; únicos parciales en `phone`, `email` y `whatsapp_jid` |
| `006_citas.sql` | `appointments`: `customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT`, `service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT`, `starts_at timestamptz NOT NULL`, `ends_at timestamptz NOT NULL`, `status text NOT NULL DEFAULT 'confirmed' CHECK (IN ('confirmed','cancelled'))`, `channel text NOT NULL CHECK (IN ('web','whatsapp','api'))`, `notes text CHECK (≤ 500)`, `cancel_reason text CHECK (≤ 500)`, `cancelled_at timestamptz` | `CHECK (ends_at > starts_at)`; **restricción de no solape**: `EXCLUDE USING gist (tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status = 'confirmed' AND deleted_at IS NULL)` con nombre `appointments_no_overlap`; índices en `customer_id`, `service_id` y `starts_at WHERE deleted_at IS NULL` |
| `007_conversaciones.sql` | `conversations`: `channel text NOT NULL CHECK (IN ('web','whatsapp'))`, `external_id text NOT NULL CHECK (1–200)`, `context jsonb NOT NULL DEFAULT '{}'` | Único `(channel, external_id)`. Su trigger de auditoría es solo `AFTER INSERT OR DELETE OR UPDATE OF channel, external_id, deleted_at` (los mensajes cambian demasiado) |
| `008_usuarios_y_sesiones.sql` | `users`: `email text NOT NULL CHECK (minúsculas y formato)`, `full_name text NOT NULL CHECK (2–100)`, `password_hash text NOT NULL`, `last_login_at timestamptz` · `sessions`: `user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT`, `token_hash text NOT NULL UNIQUE`, `expires_at timestamptz NOT NULL` | Único `users.email`; índice `sessions.user_id`. El trigger de auditoría de `sessions` es solo `AFTER UPDATE OF deleted_at` (cierre de sesión) |
| `009_proveedores_ia.sql` | `ai_providers`: `provider text NOT NULL CHECK (IN ('groq','deepseek','gemini','openai','openrouter','compatible'))`, `model text NOT NULL CHECK (1–200)`, `base_url text CHECK (base_url ~ '^https?://')`, `api_key_encrypted text NOT NULL`, `api_key_last4 text NOT NULL`, `is_active boolean NOT NULL DEFAULT false`, `last_test_ok boolean`, `last_tested_at timestamptz`, `last_test_message text` | Único `((true)) WHERE is_active AND deleted_at IS NULL` → un solo proveedor activo. Detalle y uso en la skill `agendabot-modelos-ia` |

Significado de los datos:
- `appointments.starts_at/ends_at` son instantes exactos; la fecha y hora que ve la gente se calculan con la zona del negocio (`to_char(starts_at AT TIME ZONE tz, 'YYYY-MM-DD')` y `'HH24:MI'`). `ends_at` = inicio + duración del servicio.
- La restricción de no solape es la **última barrera contra dobles reservas**: si dos personas reservan la misma hora a la vez, una falla con el error `23P01` (el backend lo traduce a HTTP 409 "Ese horario ya está ocupado"). Las citas canceladas no ocupan hora.
- `business_settings.data`: `businessName, timezone, slotInterval, currency ('USD'), theme, accentColor, address, phone, businessInfo, welcomeMessage, historyTurns, timeoutSeconds, maxSlotsShown`.
- `conversations.context`: `{ customerName, messages: [{ id, role: 'user'|'assistant'|'error', content, timestamp, manual? }] (máx. 200), draft: { phone?, appointmentIds: [] } }`. `external_id` = JID del chat de WhatsApp o, en web, el propio id.
- `users.password_hash` = `scrypt$<sal base64>$<hash base64>` (lo genera el backend).
- `ai_providers.api_key_encrypted` = clave de IA cifrada con AES‑256‑GCM por el backend (`iv.tag.cifrado` en base64); nunca se guarda en claro. `sessions.token_hash` = SHA‑256 hex del token; el token en claro nunca se guarda; 12 h de vida.

## Script para aplicar migraciones (`scripts/migrar.sh` y `scripts/migrar.ps1`)

Escribe los dos (bash y Windows PowerShell), solo con `psql`, seguros de repetir:
1. Leen la conexión de `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`. Si la base no existe, la crean (conectando a `postgres`).
2. Crean `public.platform_migrations (version text PRIMARY KEY, name text NOT NULL, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())` y aplican cada archivo de `migrations/platform/` aún no registrado, en orden de nombre, **cada uno en su transacción**, registrando versión (prefijo numérico `001`), nombre y SHA‑256 del archivo.
3. Con la opción `--demo` / `-Demo`, insertan el negocio de ejemplo `barberia-demo` ("Barbería Demo", tipo `barberia`, schema `t_barberia_demo`) si no existe.
4. Para cada fila de `public.tenants`: `CREATE SCHEMA IF NOT EXISTS`, crean `<schema>.schema_migrations` (mismas columnas) y aplican los archivos de `migrations/tenant/` pendientes con `SET LOCAL search_path TO "<schema>", public`, cada uno en su transacción.
5. Con `--demo`, cargan `seeds/negocio_demo.sql` en `t_barberia_demo`.

Trampas conocidas (resuélvelas):
- En Windows, **los argumentos de línea de comandos no viajan en UTF‑8**: cualquier SQL con tildes (“Barbería”) envíalo a `psql` por **entrada estándar**, no con `-c`.
- En PowerShell 5.1: guarda el `.ps1` en **UTF‑8 con BOM** y pon `$OutputEncoding` y `[Console]::OutputEncoding` en UTF‑8 y `PGCLIENTENCODING=UTF8`, o las tildes y símbolos se rompen.
- En SQL, los literales de hora dentro de `UNION ALL` necesitan cast explícito (`'09:00'::time`).

El backend tendrá su propio `npm run migrate` que debe usar **las mismas tablas de control** para poder mezclarse.

## Datos de ejemplo (`seeds/negocio_demo.sql`)

Idempotente (`ON CONFLICT DO NOTHING`). Ajustes: `businessName` "Barbería Demo", `timezone` "America/Guayaquil", `slotInterval` 30, `currency` "USD", `theme` "system", `accentColor` "emerald", una dirección y teléfono de Quito de ejemplo, `businessInfo` con formas de pago y política de cancelación, `welcomeMessage` vacío, `historyTurns` 6, `timeoutSeconds` 15, `maxSlotsShown` 6. Servicios: Corte clásico (30 min, $10), Arreglo de barba (30, $7), Corte + barba (60, $15), Corte infantil (30, $8). Horario: lunes a viernes 09:00–13:00 y 15:00–19:00, sábado 09:00–14:00, domingo cerrado (11 bloques). No crea usuarios (la contraseña la cifra el backend).

## Verificación automática (`scripts/verificar.sql`)

Un script `psql` que, **dentro de una transacción que termina en `ROLLBACK`** (no deja rastro), crea dos schemas de prueba, les aplica todas las migraciones de negocio con `\ir` y comprueba con bloques `DO` que imprimen `OK: …` o lanzan `FALLO: …`:
1. Dos citas confirmadas solapadas → error `exclusion_violation` (23P01).
2. Tras cancelar una, la hora queda libre.
3. Un `UPDATE` de `services` deja fila en `audit_logs`; un cambio en `users` no guarda `password_hash`.
4. Un cliente solo con `whatsapp_jid` se inserta; sin ningún contacto → `check_violation`.
5. Dos negocios distintos pueden tener citas a la misma hora.
6. `seeds/negocio_demo.sql` carga completo (servicios y 11 bloques).
7. Un cambio en `ai_providers` no guarda `api_key_encrypted` en `audit_logs`; dos proveedores activos a la vez fallan con `unique_violation`.

Ejecútalo con `psql -v ON_ERROR_STOP=1 -d <base> -f scripts/verificar.sql`.

## Criterios de aceptación

- [ ] `migrar` funciona en una base vacía (la crea) y, repetido, no aplica nada nuevo; las tildes de los datos de ejemplo se guardan bien.
- [ ] `verificar.sql` imprime los siete `OK` y deja la base como estaba.
- [ ] Ninguna tabla de negocio lleva nombre de schema fijo.
- [ ] Prueba hecha en una base temporal que después se borra.
