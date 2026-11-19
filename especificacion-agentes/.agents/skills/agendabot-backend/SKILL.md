---
name: agendabot-backend
description: "Construye desde cero el backend de AgendaBot: Node.js 22 + TypeScript + Express 5 + Zod + pg, multinegocio por schema, sesiones, límites de intentos, registro, citas, ajustes, tiempo real (SSE) y CLI. Úsala para crear o modificar cualquier parte del servidor de AgendaBot."
---

# AgendaBot · Backend (API + WhatsApp + IA)

> Requisitos previos: la base de datos de la skill `agendabot-base-de-datos`. El asistente IA y WhatsApp se detallan en la skill `agendabot-asistente-whatsapp` (constrúyelos con ella). El contrato exacto de cada ruta está en la skill `agendabot-contrato-api`: respétalo al pie de la letra.

## Tecnología (no cambiar)

| Pieza | Elección |
|---|---|
| Runtime | Node.js 22, TypeScript estricto, ES modules (`"type": "module"`, imports con `.js`) |
| HTTP | Express 5 (los handlers async propagan errores solos) |
| Validación | Zod 4 en **toda** entrada (body, params, query) |
| Base de datos | `pg` con SQL escrito a mano. **Sin ORM** |
| WhatsApp | `@whiskeysockets/baileys` 7 (WhatsApp Web, “dispositivos vinculados”) + `qrcode` para el QR |
| IA | API compatible con OpenAI (`/chat/completions`) vía `fetch`: Groq por defecto, DeepSeek o Gemini |
| Desarrollo | `tsx watch` · Pruebas: `node:test` con `tsx --test` |

No añadas más dependencias sin necesidad (nada de ORM, ni frameworks de validación extra, ni Redis).

## Estructura

```
backend/
  package.json            scripts: dev, build, start, migrate, test, lint, tenant:create, tenant:user, tenant:list
  .env.example
  migrations/platform/    ← creadas con la skill agendabot-base-de-datos (3 archivos)
  migrations/tenant/      ← ídem (9 archivos, uno por tabla)
  seeds/ · scripts/       ← ídem (datos de ejemplo, migrar.sh/.ps1, verificar.sql)
  data/                   (en .gitignore) credenciales de WhatsApp y contador de IA
  src/
    server.ts             arranca, reconecta WhatsApp guardados, cierre limpio
    app.ts                createApp(): CORS, json 1mb, trust proxy, rutas, 404, errores
    config/env.ts         variables validadas con Zod; si faltan, mensaje claro y exit(1)
    db/pool.ts            pool, runInTenant, tdb(), tenantTransaction, withTransaction
    db/migrations.ts      migratePlatform, migrateTenantSchema, migrateAll
    db/migrate.ts         CLI de migraciones
    cli/tenant.ts         create | user | list
    shared/
      http.ts             HttpError, notFound, parse(schema, data), errorHandler, routeNotFound
      auth.ts             hashToken, generateToken, bearer, loadSession, requireAdmin, requirePlatform, actorOf
      password.ts         hashPassword / verifyPassword (scrypt) y DUMMY_HASH
      rateLimit.ts        assertNotLocked, recordFailure, clearFailures
      tenant.ts           tenantContext
      events.ts           notifyChange, notifyOnWrite, changesStream (SSE)
      sql.ts              buildUpdate, splitContact
    modules/<modulo>/     <modulo>.routes.ts · .schema.ts · .repository.ts · .service.ts (si hay reglas)
      ai  appointments  assistant  auth  conversations  customers  health  platform
      schedule  services  settings  whatsapp
```

Patrón por módulo: **ruta** (valida con Zod y llama) → **servicio** (reglas de negocio) → **repositorio** (SQL). Los repositorios aceptan un `db` opcional para participar en una transacción.

## Variables de entorno (`.env.example`)

```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agendabot_db
DB_USER=postgres
DB_PASSWORD=
FRONTEND_URL=http://localhost:5173        # origen permitido por CORS
TRUST_PROXY=0                             # pon 1 si hay un proxy delante (Nginx, Render…)
BUSINESS_TIMEZONE=America/Guayaquil       # zona por defecto de negocios nuevos
PLATFORM_TOKEN=                           # vacío = API de plataforma desactivada
AI_PROVIDER=groq                          # groq | deepseek | gemini
AI_TIMEOUT_MS=15000
AI_DAILY_TOKEN_LIMIT=0                    # 0 = el conocido del proveedor (Groq gratis: 200000)
AI_KEYS_SECRET=                           # 32 bytes en base64: cifra las claves de IA que guarda cada negocio
# Las variables AI_PROVIDER/GROQ_…/DEEPSEEK_…/GEMINI_… son el RESPALDO del servidor; lo normal es que cada negocio
# configure su proveedor en el panel (skill agendabot-modelos-ia).
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

`app.set('trust proxy', env.TRUST_PROXY)` — imprescindible detrás de un proxy, si no todos los visitantes comparten IP y los límites de intentos bloquean a todo el mundo.

## Contexto de negocio (multinegocio)

- `tenantContext` (middleware de `/api/t/:slug`): busca el negocio activo (`deleted_at IS NULL`); si no existe → 404. Guarda `req.tenant = { id, slug, name, businessType, schema }` y ejecuta el resto de la petición dentro de `AsyncLocalStorage` con su schema (`runInTenant`).
- `tdb().query(sql, values)`: cada consulta abre una transacción corta con `SET LOCAL search_path TO "<schema>", public`, para que el schema nunca se filtre entre peticiones. Usa `pg.escapeIdentifier` para el nombre.
- `tenantTransaction(fn)`: varias consultas en una sola transacción del negocio (reservas, horario).
- Fuera de una petición (WhatsApp, CLI) se usa `runInTenant(schema, fn)` explícitamente.

## Autenticación y límites

- Contraseñas: `scrypt` con sal aleatoria de 16 bytes, clave de 64 → `scrypt$<sal b64>$<hash b64>`. Comparar con `timingSafeEqual`.
- Siempre se verifica la contraseña, aunque el correo no exista (contra `DUMMY_HASH`), y el error es el mismo: `Correo o contraseña incorrectos`.
- Token de sesión: `randomBytes(24).toString('base64url')`. En BD solo `sha256(token)`. Validez 12 h. `loadSession` pone `req.user` si el token es de **ese** negocio y no ha caducado.
- `requirePlatform`: compara `PLATFORM_TOKEN` con `timingSafeEqual`.
- Límite de intentos en memoria (`shortcut:` comentado: con varias instancias, moverlo a PostgreSQL): 10 por clave en 15 min → 429 con minutos restantes. Claves: `login|<slug>|<ip>`, `platform-login|<ip>`, `signup|<ip>` (cuenta todos los intentos), `chat|<slug>|<ip>` (30 en 10 min). Limpia periódicamente las entradas caducadas para que el mapa no crezca sin fin.

## Registro y negocios

**Registro público** `POST /api/signup`:
1. Límite por IP. Validar `{ name 2–100, businessType, owner { fullName 2–100, email, password ≥ 8 } }`.
2. Si el correo ya está en `public.user_emails` → 409 `Ese correo ya tiene una cuenta`.
3. `slug = slugFromName(name)`: quitar tildes (NFD), minúsculas, todo lo que no sea `a-z0-9` → `-`, sin guiones al inicio/fin, máx. 34 caracteres; si queda < 2 → `negocio`. Buscar el primero libre: `slug`, `slug-2`, `slug-3`… (también cuentan negocios desactivados).
4. `createTenant` en **una transacción**: fila en `tenants`, `CREATE SCHEMA`, aplicar plantilla, `business_settings` con `{ businessName, timezone: BUSINESS_TIMEZONE, currency: 'USD' }`, usuario dueño, fila en `user_emails`.
5. Crear sesión y responder `201 { slug, token, expiresAt }`. El negocio queda activo al instante.

**Login de portada** `POST /api/platform/auth/login`: buscar el correo en `user_emails` → negocio → verificar contraseña en su schema → sesión. Una sola verificación scrypt por intento.

**Upsert de usuario** (CLI y plataforma): crea o actualiza nombre y contraseña; si ya existía, cierra sus sesiones abiertas. Mantiene `user_emails`; si el correo ya pertenece a **otro** negocio → 409 `Ese correo ya tiene una cuenta`. Sin contraseña se genera una y se devuelve una única vez.

## Citas: reglas y horas libres

Reservar (`bookAppointment`, en `tenantTransaction`): servicio activo → dentro del horario (`EXISTS` en `business_hours` del día de la semana donde `opens_at ≤ hora` y `hora + duración ≤ closes_at`) → cliente por contacto o nuevo → `INSERT` con `starts_at = (date + time) AT TIME ZONE tz` y `ends_at = starts_at + duración` → si `starts_at <= now()` lanzar 409 (el rollback deshace la fila). El solape lo rechaza la BD (`23P01` → 409).

Editar (`updateAppointmentDetails`): mismas validaciones al cambiar servicio/fecha/hora; 409 si se cancela una ya cancelada; devuelve `{ before, after }` para decidir el aviso.

Contacto (`splitContact`), en este orden: termina en `@lid` o `@s.whatsapp.net` → `whatsapp_jid` (el asistente solo lo usa cuando WhatsApp no da el número; si lo da, usa `+<dígitos>`); contiene `@` → `email` en minúsculas; si no → `phone` = solo dígitos. La búsqueda de cliente existente usa la columna que corresponda.

**Horas libres** (función pura `freeSlotsByDay`, con test): para cada día desde `from` durante N días, saltar días cerrados; en cada bloque, horas `t` desde el inicio del bloque en pasos de `slotInterval` mientras `t + duración ≤ fin`; descartar las de hoy `≤ hora actual`; descartar las que solapan con citas confirmadas de ese día; como máximo `maxPerDay` por día. La hora "actual" se calcula en la zona del negocio con `Intl.DateTimeFormat`.

## Tiempo real (SSE)

`notifyChange(slug, ...topics)` sobre un `EventEmitter` en memoria (`shortcut:` con varias instancias, usar LISTEN/NOTIFY). `notifyOnWrite` (middleware de negocio): lee la ruta **al entrar** (Express la reescribe al enrutar) y al terminar una escritura con éxito emite según la tabla de la skill `agendabot-contrato-api`. `changesStream`: cabeceras SSE, `retry: 3000`, latido cada 25 s; en cada latido comprobar que la sesión sigue válida y cerrar si no; quitar el oyente al cerrar.

## Modelos de IA

Sigue la skill `agendabot-modelos-ia`: módulo `modules/ai/` (catálogo, cifrado de claves con `AI_KEYS_SECRET`, rutas `/ai/*`, `resolveAI`). Sin esta parte la app no responde.

## Asistente IA y WhatsApp

Sigue la skill `agendabot-asistente-whatsapp` (asistente único para WhatsApp y chat web, cliente de IA, consumo, Baileys, avisos al cliente).

## Seguridad obligatoria (corrige fallos detectados en la versión anterior)

- `GET /settings` sin sesión devuelve solo campos públicos; `businessInfo`, `historyTurns`… son privados.
- No hay alta pública de clientes ni de conversaciones: el público solo habla con `/assistant/chat`.
- `GET /appointments` público sin datos personales y desde hoy; panel desde hoy − 30 días por defecto.
- La IA nunca ejecuta nada sin que el servidor lo valide; solo cancela citas del propio cliente.
- Nunca registrar en logs contraseñas, tokens ni claves.

## Pruebas mínimas (`npm test`, sin base de datos)

`password` (hash y verificación) · `rateLimit` (bloqueo y caducidad) · `sql` (`buildUpdate`, `splitContact`) · `slugFromName` · horario (`rowsToSchedule`/`diffSchedule`) · `freeSlotsByDay` (horario, duración, días cerrados, ocupadas, horas pasadas, límite por día) · `parseAssistantJson` (válido, con texto alrededor, inválido, con `cancel`) · `isGreetingOnly` · `buildSystemPrompt` (contiene servicios, horario, horas libres, citas del cliente, dirección, info, máximo de horas; no contiene datos ajenos) · `welcomeText` · `retryDelayMs` · `createBatcher` · uso de IA (cabeceras y error TPD, con archivo temporal) · decisión de aviso · SSE (una escritura en `/appointments` llega a `/events` del mismo negocio y no a otro).

## Criterios de aceptación

- [ ] `npm run lint` (tsc) sin errores y `npm test` en verde.
- [ ] `npm run migrate` deja la base lista; `npm run dev` responde `GET /api/health` con `{status:'ok',db:'ok'}`.
- [ ] Registro → panel con sesión; login de portada con una sola verificación de contraseña.
- [ ] Dos reservas simultáneas a la misma hora: una 201, otra 409.
- [ ] Cancelar desde el panel sin motivo → 400; con motivo → `notified` según WhatsApp.
- [ ] Con WhatsApp vinculado: un "Hola" recibe solo la bienvenida; tres mensajes seguidos reciben una respuesta; pedir cita, confirmar, preguntar por ella y cancelar con motivo funciona de punta a punta.
- [ ] El panel recibe avisos SSE al reservar por WhatsApp.
