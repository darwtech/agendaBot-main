---
name: agendabot-asistente-whatsapp
description: "Construye el asistente IA de AgendaBot (mismo cerebro para WhatsApp y chat web: prompt, JSON reply/book/cancel, horas libres, alternativas, bienvenida, agrupación de mensajes, reintentos y consumo del plan) y la integración de WhatsApp con Baileys (QR, reconexión, avisos al cliente). Úsala para todo lo que tenga que ver con la IA o WhatsApp en AgendaBot."
---

# AgendaBot · Asistente IA y WhatsApp

> Parte del backend (skill `agendabot-backend`). **Qué modelo y qué clave usa** lo decide `resolveAI` de la skill `agendabot-modelos-ia` (proveedor activo del negocio → respaldo del `.env` → sin IA): `complete()` recibe esa configuración y nunca lee el `.env` directamente. Usa la base de datos de `agendabot-base-de-datos` y las rutas de `agendabot-contrato-api`.

## Asistente IA (mismo cerebro para WhatsApp y chat web)

`answerMessage(slug, { channel, chatId, phone, name, text, parts })` → `string[]` (mensajes a enviar en orden):

1. Buscar la conversación por `(channel, external_id = chatId)`; si no existe, crearla (en web, `chatId` = id de la conversación).
2. **Bienvenida (solo WhatsApp; en el chat web la muestra el frontend al abrir)**: si la conversación no tenía mensajes, `welcome = settings.welcomeMessage` (o el de defecto) con `{{negocio}}` sustituido. Por defecto: `¡Hola! 👋 Bienvenido/a a {{negocio}}. Soy el asistente virtual: puedo darte información de servicios, precios y horarios, reservar tu cita o ayudarte con una que ya tengas. ¿En qué te ayudo?`
3. Si es el primer contacto y el texto es **solo un saludo** (`isGreetingOnly`: hola, holaaa, buenas, buenos días/tardes/noches, saludos, hey, qué tal…, sin tildes ni signos) → responder solo la bienvenida, sin llamar a la IA.
4. Cargar ajustes, servicios activos, horario, citas de hoy −1 a +60 días. Calcular horas libres de 14 días por servicio. **Citas del cliente**: las de `draft.appointmentIds` o cuyo contacto es su teléfono/JID, con fecha ≥ hoy.
5. Construir el prompt de sistema (abajo) e historial: últimos `historyTurns × 2` mensajes (sin los de rol `error`). Llamar a la IA con `timeoutSeconds`.
6. Leer la respuesta: primer `{` a último `}`, `JSON.parse`, validar con Zod `{ reply: string(1–4000), book?: { serviceId uuid, date, time, fullName(2–100), contact? } | null, cancel?: { appointmentId uuid, reason(3–500) } | null }`. Si no es JSON válido, el texto entero es la respuesta y no se ejecuta nada.
7. Ejecutar **validando siempre en el servidor**:
   - `cancel`: solo si la cita está en "citas del cliente" y confirmada → `❌ Tu cita de <servicio> del <día dd/mm> a las <hh:mm> ha sido cancelada.\nMotivo: <motivo>` (+ `Si quieres reservar otra cita, aquí estoy 😊` si no hay reserva). Si no es suya: `No encuentro esa cita a tu nombre…`.
   - `book`: contacto = teléfono de WhatsApp (`+<dígitos>`), o el JID si no hay número, o en web el `contact` que dio el cliente (obligatorio en web). Si sale bien: `✅ Cita confirmada\n<servicio> · $<precio>\n<día dd/mm> a las <hh:mm>\nA nombre de <nombre>\n📍 <dirección si hay>\n¡Te esperamos! Si necesitas cancelar o cambiarla, escríbeme por aquí.` y guardar el id en `draft.appointmentIds` (últimos 20). Si falla con 4xx: `Uy, no he podido reservar esa hora (<motivo>). Te puedo ofrecer: <3 días × 3 horas desde esa fecha>. ¿Te viene bien alguna?`.
   - Cancelar + reservar en la misma respuesta = cambio de cita.
8. Respuestas = `[bienvenida?] + (si hubo acción: mensajes de la acción; si no: reply)`. Guardar los mensajes del cliente **por separado** (`parts`) y las respuestas; recortar a 200. Emitir `notifyChange(slug, 'conversations', + 'appointments','customers' si hubo acción)`.

**Prompt de sistema** (en español; el modelo contesta en el idioma del cliente). Debe incluir, en este orden: rol (`Eres el asistente virtual por <canal> de "<negocio>", <tipo>.`); estilo (mensajes cortos, cálidos, texto plano y algún emoji, no empezar cada mensaje con "Hola", saludar solo una vez, responder juntos los mensajes que llegan en varias líneas); no inventar nada fuera de los datos; **reservar**: pedir servicio, fecha, hora, nombre completo (y en web, teléfono o correo), ofrecer SOLO horas de la lista, máximo `maxSlotsShown` por mensaje, si lo pedido no está libre explicarlo y proponer 2–3 alternativas cercanas, resumir y pedir confirmación antes de rellenar `book`; **citas del cliente**: recordar datos si pregunta, pedir motivo antes de cancelar, solo cancelar las de su lista; **formato**: único objeto JSON `{"reply":…,"book":null,"cancel":null}` con los formatos exactos; si ya se envió bienvenida, no saludar otra vez; ahora (día, fecha, hora, zona) y que los precios son USD; nombre del cliente; datos del establecimiento (nombre, dirección, teléfono, `businessInfo` como "instrucciones del negocio, síguelas"); servicios `- id=<uuid> | nombre | N min | $precio USD | descripción`; horario semanal; horas libres por servicio y día; citas del cliente `- id=<uuid> | servicio, día dd/mm a las hh:mm (cancelada: motivo) | $precio USD | a nombre de X`.

**Cliente de IA** (`complete(messages, timeoutMs)`): `POST <base>/chat/completions` con `{ model, messages, temperature: 0.3 }` y `Authorization: Bearer`. Bases: Groq `https://api.groq.com/openai/v1`, DeepSeek `DEEPSEEK_BASE_URL`, Gemini `https://generativelanguage.googleapis.com/v1beta/openai`. Ante 429 o 5xx: esperar lo que diga `retry-after` o el texto `try again in Xs` (entre 1 y 15 s; 2 s si no dice) y reintentar hasta 3 veces. Si falta la clave: error claro.

**Consumo** (`usage.ts`): por cada respuesta, anotar `requestsToday`, `tokensToday += usage.total_tokens` y las cabeceras `x-ratelimit-limit/remaining-requests`, `x-ratelimit-reset-requests`, `x-ratelimit-limit/remaining-tokens`. Ante un 429 con `(TPD): Limit X, Used Y`, corregir límite y gastado. Día en UTC; se guarda en `data/ai-usage.json` (ruta sobrescribible con `AI_USAGE_FILE` para tests). Límite diario = `AI_DAILY_TOKEN_LIMIT` o 200000 en Groq.

Si la IA falla del todo: responder `Ahora mismo no puedo responder. Te contestamos en breve 🙏` y registrar el error.

## WhatsApp (Baileys)

- Una sesión por negocio en memoria: `{ status, qrDataUrl?, phone?, socket? }`. Credenciales con `useMultiFileAuthState` en `data/whatsapp-auth/<slug>/`.
- `connect`: si ya conecta/conectado, devolver estado. Al recibir `qr`, generar `qrDataUrl` (`QRCode.toDataURL`, 280 px). En `open`: `connected` y teléfono. En `close`: si fue `loggedOut` → borrar la carpeta de credenciales y quedar `disconnected`; si no, reconectar a los 1,5 s.
- `disconnect`: `logout()`, borrar credenciales.
- Al arrancar el servidor: reconectar cada negocio activo con `creds.json` guardado.
- `messages.upsert` solo con `type === 'notify'`. Ignorar: `fromMe`, grupos (`@g.us`), estados/listas (`@broadcast`), canales (`@newsletter`), `protocolMessage`, `reactionMessage`.
- Texto = `conversation` ‖ `extendedTextMessage.text` ‖ pie de foto/vídeo. Sin texto (audio, sticker): responder `Por ahora solo puedo leer mensajes de texto. ¿Me lo escribes, por favor?`.
- Teléfono: el JID que acabe en `@s.whatsapp.net` entre `remoteJidAlt` y `remoteJid`; si solo hay LID, `phone = null`.
- Al llegar: marcar leído y `composing`. **Agrupar** por chat: esperar 5 s sin mensajes nuevos (máximo 20 s desde el primero) y responder una vez (`createBatcher`, con test). Una cola por chat para que las respuestas salgan en orden.
- **Al responder, usar la conexión actual** (`sessions.get(slug).socket`), no la del momento en que llegó el mensaje (puede haberse reconectado).
- `notifyCustomer(slug, appointment, text)`: enviar al chat de WhatsApp del cliente: conversación cuyo `draft.appointmentIds` contiene la cita, o cuyo `external_id`/`draft.phone` coincide con su teléfono, o en último caso `<teléfono>@s.whatsapp.net`. Guardar el mensaje en la conversación (`manual:true`). Devuelve `true/false`.

Textos de aviso (se usa el nombre de pila del cliente):
- Cancelación por el negocio: `Hola <nombre> 👋\nLamentamos informarte que tu cita de <servicio> del <día dd/mm a las hh:mm> en <negocio> ha sido cancelada.\nMotivo: <motivo>\nSi quieres, responde a este mensaje y te ayudamos a reservar una nueva cita. Disculpa las molestias 🙏`
- Cambio: `Hola <nombre> 👋\nTu cita en <negocio> ha cambiado:\nAntes: <servicio>, <cuándo>\nAhora: <servicio>, <cuándo>\nSi no te viene bien, responde a este mensaje y lo vemos.`

La decisión "qué aviso enviar" (`antes`, `después` → texto o nada) es una función pura con test: cancelada ahora y antes no → cancelación; confirmada y cambió servicio/fecha/hora → cambio; solo notas → nada.


## Pruebas de esta parte

`parseAssistantJson` · `isGreetingOnly` · `buildSystemPrompt` · `welcomeText` · `retryDelayMs` · `createBatcher` · registro de consumo (cabeceras y error TPD con archivo temporal) · decisión de aviso al cliente · `freeSlotsByDay`.
