# AgendaBot — Backend multi-negocio

API REST en Node.js + Express 5 + PostgreSQL. TypeScript, validación con Zod, SQL con `pg` (sin ORM).
Sirve a cualquier negocio con agenda (barberías, spas, clínicas, talleres…). **Cada negocio tiene su propio schema de PostgreSQL.**

## Puesta en marcha

```bash
npm install
cp .env.example .env      # rellena DB_* y PLATFORM_TOKEN
npm run migrate           # plataforma + todos los negocios
npm run dev               # http://localhost:3000/api
```

### Gestionar negocios

```bash
# negocio + usuario dueño (sin contraseña se genera una y se muestra una sola vez)
npm run tenant:create -- spa-luna "Spa Luna" spa ana@spaluna.com "Ana López" "SuContraseña123"
# crear otro usuario del panel o restablecer la contraseña de uno existente (cierra sus sesiones)
npm run tenant:user -- spa-luna recepcion@spaluna.com "Recepción" "OtraContraseña123"
npm run tenant:list
```

Tipos: `barberia, peluqueria, estetica, unas, spa, masajes, clinica, dental, fisioterapia, psicologia, nutricion, veterinaria, gimnasio, tatuajes, taller, asesoria, otro`.

En el frontend cada negocio vive en `/n/<slug>` (chat) y `/n/<slug>/admin` (panel, con correo y contraseña).

## Modelo de datos

```
public                         ← plataforma
  tenants                      slug, nombre, tipo, schema
  audit_logs                   auditoría de altas/cambios de negocios
  platform_migrations
t_<slug>  (uno por negocio)    ← mismas tablas en cada uno (migrations/tenant/)
  services · customers · appointments · business_hours
  conversations · business_settings · users · sessions · audit_logs · schema_migrations
```

- **`estado boolean`** en todas las tablas (incluida `tenants`): `true` = activo. Se deriva de `deleted_at` (borrado lógico), así que nunca se contradicen. Los `DELETE` de la API son bajas lógicas; desactivar un negocio lo oculta (404) sin borrar sus datos.
- **Auditoría**: `created_at`, `updated_at`, `created_by`, `updated_by` y la tabla `audit_logs` **del mismo schema**, que se llena por triggers con valores anteriores y nuevos. En conversaciones solo se auditan altas, bajas y cambios de canal.
- Actor de cada cambio: el id del usuario con sesión; plataforma `…0002`; chat público `NULL`.
- Las citas no se solapan dentro de un negocio (`appointments_no_overlap` → `409`); negocios distintos no se afectan.
- **Inicio de sesión**: usuarios por negocio con contraseña cifrada (scrypt + sal). Sesiones de 12 h guardadas como SHA-256 del token; cerrar sesión las da de baja. La auditoría nunca guarda `password_hash` ni `token_hash`.
- **Límite de intentos**: 10 fallos en 15 min por negocio e IP → `429`. Mismo error para correo inexistente o contraseña errónea.

### Migraciones

- `migrations/platform/` se aplica una vez sobre `public`.
- `migrations/tenant/` es la plantilla de cada negocio; `npm run migrate` la aplica a todos los schemas y `tenant:create` a los nuevos. Para cambiar el esquema de todos los negocios, añade `migrations/tenant/002_….sql`.
- `platform/002` importó la instalación de un solo negocio (tablas en `public`) al negocio `el-bigote`.

## Estructura

```
src/
  config/env.ts           Variables de entorno validadas
  db/                     Pool, contexto de negocio (search_path por transacción), migraciones
  shared/                 Errores HTTP, auth (panel por negocio y plataforma), resolución de negocio
  modules/<módulo>/       .schema.ts (Zod) · .repository.ts (SQL) · .routes.ts (HTTP)
  modules/platform/       Alta y gestión de negocios
  cli/tenant.ts           Comandos tenant:*
```

## Endpoints

🔑 = `Authorization: Bearer <PLATFORM_TOKEN>` · 🔒 = `Authorization: Bearer <token de sesión>` (lo devuelve `POST /auth/login`)

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/api/health` | público |
| GET · POST | `/api/platform/tenants` | 🔑 (POST incluye `owner: { email, fullName, password? }`) |
| PATCH | `/api/platform/tenants/:slug` | 🔑 (`name`, `businessType`, `active`) |
| POST | `/api/platform/tenants/:slug/users` | 🔑 crea usuario o restablece contraseña |

Rutas de cada negocio, con el prefijo `/api/t/:slug`:

| Método | Ruta | Acceso |
| --- | --- | --- |
| POST | `/auth/login` | público: `{ email, password }` → `{ token, expiresAt, user }` |
| GET · POST | `/auth/me` · `/auth/logout` | 🔒 |
| GET · PATCH | `/settings` | público (incluye `businessType`) · 🔒 |
| GET | `/services[/:id]` | público (solo activos) / 🔒 todos |
| POST · PATCH · DELETE | `/services[/:id]` | 🔒 |
| GET · PUT | `/schedule` | público · 🔒 (reemplaza la semana) |
| GET · PATCH · DELETE | `/customers[/:id]` | 🔒 |
| POST | `/customers` | público (devuelve el existente si el contacto ya existe) |
| GET | `/appointments?from=&to=` | público sin datos personales / 🔒 completo |
| POST | `/appointments` | público: valida servicio, horario, pasado y solapes |
| PATCH · DELETE | `/appointments/:id` | 🔒 |
| POST · PATCH | `/conversations[/:id]` | público |
| GET · DELETE | `/conversations[/:id]` | 🔒 |

Errores: `{ "message", "details"? }` con `400`, `401/403`, `404` (también negocio inexistente o desactivado), `409`.

## Copia de seguridad

`backups/agendabot_db_antes_multinegocio.dump` es la base antes de la migración. Para restaurarla en una base nueva:

```bash
pg_restore -h localhost -U postgres -d <base_nueva> backups/agendabot_db_antes_multinegocio.dump
```

## Pendiente

Las variables `AI_*`, `GROQ_*`, `DEEPSEEK_*`, `GEMINI_*` y `WHATSAPP_*` aún no se usan (la IA la llama el navegador).
