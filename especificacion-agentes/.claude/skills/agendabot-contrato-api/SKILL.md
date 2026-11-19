---
name: agendabot-contrato-api
description: "Contrato exacto de la API REST de AgendaBot (rutas, tipos, errores, eventos en tiempo real) que comparten backend y frontend. Úsala siempre que construyas o consumas una ruta de AgendaBot."
---

# AgendaBot · Contrato de la API (backend ⇄ frontend)

> Este archivo es el acuerdo entre quien construye el backend y quien construye el frontend. **Ninguno de los dos lo cambia por su cuenta.** Si algo falta, se añade aquí primero.

## Reglas generales

- Base: `/api`. JSON en ambos sentidos (`Content-Type: application/json`), cuerpo máximo 1 MB.
- Rutas de un negocio: `/api/t/:slug/...`. Si el negocio no existe o está desactivado → **404** `{"message":"Negocio no encontrado"}`.
- Autenticación del panel: cabecera `Authorization: Bearer <token>`. El token lo dan el registro y los logins. Sin token válido en una ruta de panel → **401** `{"message":"Inicia sesión para continuar"}`.
- Errores, siempre: `{ "message": "texto para mostrar", "details"?: ... }`.

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos (`details` = errores por campo de Zod), JSON mal formado, formato inválido |
| 401 | Sin sesión o credenciales incorrectas |
| 403 | API de plataforma desactivada |
| 404 | Negocio, recurso o ruta inexistente |
| 409 | Conflicto: hora ocupada (`Ese horario ya está ocupado`), fuera de horario, en el pasado, duplicado, ya cancelada |
| 413 | Petición demasiado grande |
| 429 | Demasiados intentos (`Demasiados intentos. Vuelve a probar en N min.`) |
| 500 | `Error interno del servidor` (nunca se filtran detalles) |

- Fechas: `date` = `YYYY-MM-DD`, `time` = `HH:MM` (24 h), **en la zona horaria del negocio**. Instantes (`createdAt`…) en ISO 8601.
- Dinero: número en **dólares (USD)**. No hay otras monedas.

## Tipos

```ts
type BusinessType = 'barberia'|'peluqueria'|'estetica'|'unas'|'spa'|'masajes'|'clinica'|'dental'
  |'fisioterapia'|'psicologia'|'nutricion'|'veterinaria'|'gimnasio'|'tatuajes'|'taller'|'asesoria'|'otro';
// Etiquetas: Barbería, Peluquería, Estética, Uñas, Spa, Masajes, Clínica, Dental, Fisioterapia,
// Psicología, Nutrición, Veterinaria, Gimnasio, Tatuajes, Taller, Asesoría, Otro.

interface Service { id: string; name: string; description: string; durationMinutes: number;
  price: number; active: boolean; createdAt: string; updatedAt: string }

interface Customer { id: string; fullName: string;
  contact: string;            // email, o teléfono en dígitos, o JID de WhatsApp si no hay número
  createdAt: string; updatedAt: string }

interface Appointment { id: string; customerId: string; customerName: string; customerContact: string;
  serviceId: string; serviceName: string; price: number; durationMinutes: number;
  date: string; time: string; status: 'confirmed'|'cancelled'; channel: 'web'|'whatsapp'|'api';
  notes: string|null; cancelReason: string|null;
  createdAt: string; updatedAt: string; cancelledAt: string|null }

interface TimeBlock { start: string; end: string }               // HH:MM, end > start
interface DaySchedule { dayOfWeek: 0|1|2|3|4|5|6; closed: boolean; blocks: TimeBlock[] } // 0 = domingo

interface Settings {
  businessName: string;           // 2–80
  businessType: BusinessType;     // solo lectura (viene de la plataforma)
  timezone: string;               // IANA, por defecto 'America/Guayaquil'
  slotInterval: 15|30|60;         // cuadrícula de horas ofrecidas
  currency: 'USD';                // fija
  theme: 'light'|'dark'|'system';
  accentColor: 'emerald'|'blue'|'amber'|'rose'|'slate';
  address: string;                // ≤ 200
  phone: string;                  // ≤ 40
  businessInfo: string;           // ≤ 4000, información e instrucciones para el asistente (PRIVADA)
  welcomeMessage: string;         // ≤ 1000, admite {{negocio}}; vacío = mensaje por defecto
  historyTurns: number;           // 0–50, turnos de historial que ve la IA
  timeoutSeconds: number;         // 3–120, espera máxima de la IA
  maxSlotsShown: number;          // 1–20, horas ofrecidas por mensaje
}
// Sin sesión, GET /settings devuelve SOLO: businessName, businessType, timezone, slotInterval,
// currency, theme, accentColor, address, phone, welcomeMessage.

interface ChatMessage { id: string; role: 'user'|'assistant'|'error'; content: string;
  timestamp: string; manual?: boolean }   // manual = escrito por una persona desde el panel

interface Conversation { id: string; channel: 'web'|'whatsapp'; externalId: string;
  customerName: string|null; messages: ChatMessage[]; createdAt: string; updatedAt: string }

interface Session { token: string; expiresAt: string; user: { id: string; email: string; fullName: string } }
```

## Plataforma

| Método y ruta | Acceso | Entrada | Salida |
|---|---|---|---|
| `GET /api/health` | público | — | `{status:'ok', db:'ok'}` |
| `POST /api/signup` | público, 10 intentos/15 min por IP (cuenta cada intento) | `{ name, businessType, owner: { fullName, email, password } }` (password ≥ 8) | **201** `{ slug, token, expiresAt }` · 409 `Ese correo ya tiene una cuenta` |
| `POST /api/platform/auth/login` | público, 10 fallos/15 min por IP | `{ email, password }` | `Session & { slug }` · 401 `Correo o contraseña incorrectos` |
| `GET /api/platform/tenants` | `Bearer PLATFORM_TOKEN` | — | lista de negocios |
| `POST /api/platform/tenants` | idem | `{ slug, name, businessType?, timezone?, owner: { email, fullName, password? } }` | 201 `{ id, slug, schema, owner: { email, password? } }` (password solo si se generó) |
| `PATCH /api/platform/tenants/:slug` | idem | `{ name?, businessType?, active? }` | negocio |
| `POST /api/platform/tenants/:slug/users` | idem | `{ email, fullName, password? }` | 201/200 `{ email, created, password? }` |

El slug del registro **lo genera el servidor** a partir del nombre (`"Barbería Central"` → `barberia-central`; si existe, `-2`, `-3`…). El frontend solo muestra una vista previa.

## Negocio: `/api/t/:slug`

### Sesión
| Ruta | Acceso | Entrada | Salida |
|---|---|---|---|
| `POST /auth/login` | público, 10 fallos/15 min por negocio+IP | `{ email, password }` | `Session` |
| `GET /auth/me` | panel | — | `{ id, email, fullName }` |
| `POST /auth/logout` | panel | — | 204 |

### Ajustes, servicios, horario
| Ruta | Acceso | Entrada | Salida |
|---|---|---|---|
| `GET /settings` | público (subconjunto) / panel (todo) | — | `Settings` |
| `PATCH /settings` | panel | `Partial<Settings>` sin `businessType` ni `currency` | `Settings` |
| `GET /services` | público (solo activos) / panel (todos) | — | `Service[]` |
| `GET /services/:id` | público | — | `Service` |
| `POST /services` | panel | `{ name, description?, durationMinutes, price, active? }` | 201 `Service` |
| `PATCH /services/:id` · `DELETE /services/:id` | panel | parcial | `Service` · 204 |
| `GET /schedule` | público | — | `DaySchedule[]` |
| `PUT /schedule` | panel | `DaySchedule[]` (semana completa) | `DaySchedule[]` |

### Clientes
| Ruta | Acceso | Entrada | Salida |
|---|---|---|---|
| `GET /customers` | panel | — | `Customer[]` |
| `GET /customers/:id` · `PATCH` · `DELETE` | panel | `{ fullName?, contact? }` | `Customer` · 204 |

No existe alta pública de clientes: se crean al reservar.

### Citas
| Ruta | Acceso | Entrada | Salida |
|---|---|---|---|
| `GET /appointments?from&to` | público: solo `confirmed`, **sin datos personales** (`customerName`, `customerContact`, `notes`, `cancelReason` vacíos), `from` por defecto = hoy · panel: todo, `from` por defecto = hoy − 30 días | `from`, `to` = `YYYY-MM-DD` opcionales | `Appointment[]` |
| `GET /appointments/:id` | panel | — | `Appointment` |
| `POST /appointments` | panel | `{ customerName, customerContact, serviceId, date, time, channel?: 'web'|'whatsapp'|'api', notes? }` | 201 `Appointment` |
| `PATCH /appointments/:id` | panel | `{ serviceId?, date?, time?, notes?, status?: 'confirmed'|'cancelled', cancelReason? }` — `cancelReason` (3–500) **obligatorio** si `status:'cancelled'` | `Appointment & { notified?: boolean }` |
| `DELETE /appointments/:id` | panel | — | 204 (borrado lógico, sin aviso al cliente) |

Reglas al crear o mover una cita (las comprueba el servidor):
- Servicio existente y activo; si no → 404.
- Toda la cita dentro de un bloque del horario de ese día → si no, 409 `La hora está fuera del horario de apertura`.
- No en el pasado (hora del servidor de BD) → 409 `No se pueden reservar citas en el pasado`.
- Sin solape con otra confirmada → 409 `Ese horario ya está ocupado` (lo garantiza la BD).
- El cliente se busca por contacto; si no existe se crea con ese nombre.

`notified`: `true` si se avisó al cliente por WhatsApp, `false` si había que avisar y no se pudo, ausente si no había nada que avisar. Se avisa al **cancelar** (con el motivo) y al **cambiar servicio, fecha u hora** de una cita confirmada.

### Conversaciones
| Ruta | Acceso | Salida |
|---|---|---|
| `GET /conversations` | panel | `Conversation[]` (200 más recientes por `updatedAt`) |
| `GET /conversations/:id` · `DELETE` | panel | `Conversation` · 204 |

### Asistente IA
| Ruta | Acceso | Entrada | Salida |
|---|---|---|---|
| `POST /assistant/chat` | **público** (chat web), 30 mensajes/10 min por negocio+IP | `{ conversationId?: uuid, text: string(1–2000) }` | `{ conversationId, replies: string[] }` |
| `GET /assistant/usage` | panel | — | `AIUsage` (abajo) |

Primer mensaje sin `conversationId`: el servidor crea la conversación (`channel:'web'`) y devuelve su id; el frontend lo guarda en `sessionStorage` y lo envía en los siguientes. El servidor aplica **la misma lógica que en WhatsApp** (ver la skill `agendabot-backend` → Asistente). En web el contacto para reservar lo pide la IA (teléfono o correo).

```ts
interface AIUsage { provider: string; model: string; day: string; requestsToday: number; tokensToday: number;
  dailyTokenLimit: number|null;
  requests: { limit: number; remaining: number; resetIn: string|null } | null;   // de las cabeceras del proveedor
  tokensPerMinute: { limit: number; remaining: number } | null;
  lastLimitError: string|null; updatedAt: string|null }
```

### Modelos de IA

Rutas `/ai/catalog`, `/ai/providers`, `/ai/status`, `/ai/models` y `/ai/test` (todas de panel): tipos, entradas, salidas y mensajes de error definidos en la skill `agendabot-modelos-ia`. La clave de IA nunca aparece en ninguna respuesta.

### WhatsApp
| Ruta | Acceso | Entrada | Salida |
|---|---|---|---|
| `GET /whatsapp/status` | panel | — | `{ status: 'disconnected'|'connecting'|'qr'|'connected', qrDataUrl?, phone?, error? }` |
| `POST /whatsapp/connect` | panel | — | mismo estado (si hay QR, `qrDataUrl` es una imagen `data:` para mostrar) |
| `POST /whatsapp/disconnect` | panel | — | 204 |
| `POST /whatsapp/send` | panel | `{ phone, text }` | 204 · 409 si no está conectado |
| `POST /whatsapp/conversations/:id/reply` | panel | `{ text }` | `Conversation` (envía por WhatsApp y guarda el mensaje con `manual:true`) |

### Avisos en tiempo real
`GET /events` (panel) — **Server-Sent Events**. Cabeceras `text/event-stream`, sin caché. Primer mensaje `retry: 3000`. Cada cambio: `data: {"topic":"appointments"|"customers"|"conversations"}`. Latido `: ping` cada 25 s. Como `EventSource` no admite cabeceras, el frontend lo abre con `fetch` + `Authorization` y lee el flujo.

Se emite un aviso tras cualquier escritura correcta en citas (→ `appointments` y `customers`), clientes (→ `customers`), conversaciones o WhatsApp (→ `conversations`), y cuando el asistente guarda una conversación o reserva/cancela.
