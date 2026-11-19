---
name: agendabot-modelos-ia
description: "Construye la configuración de modelos de IA de AgendaBot: catálogo de proveedores (Groq, DeepSeek, Gemini, OpenAI, OpenRouter, compatible/Ollama), guardado por negocio con la clave cifrada, listado de modelos de la cuenta, prueba de conexión, activación, uso por el asistente con respaldo del .env, pestaña Inteligencia artificial del panel y guía para obtener claves. Úsala cuando haya que crear, elegir o cambiar el modelo de IA con el que responde AgendaBot."
---

# AgendaBot · Modelos de IA

Sin esta parte la app se construye pero **no responde**: el asistente necesita un proveedor, un modelo y una clave. Aquí se define cómo el dueño del negocio los configura desde el panel, cómo se guardan de forma segura y cómo los usa el asistente. Afecta a: base de datos (`agendabot-base-de-datos`), contrato (`agendabot-contrato-api`), backend (`agendabot-backend`), asistente (`agendabot-asistente-whatsapp`) y frontend (`agendabot-frontend`).

## Catálogo de proveedores (fijo en el backend)

Todos se usan con el formato de OpenAI: `POST <base>/chat/completions` y `GET <base>/models`, cabecera `Authorization: Bearer <clave>`.

| `provider` | Nombre | Base URL | Modelo sugerido | Dónde se consigue la clave |
|---|---|---|---|---|
| `groq` | Groq (plan gratis) | `https://api.groq.com/openai/v1` | `openai/gpt-oss-120b` | console.groq.com → API Keys → Create API Key |
| `deepseek` | DeepSeek | `https://api.deepseek.com` | `deepseek-chat` | platform.deepseek.com → API keys (requiere saldo) |
| `gemini` | Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.5-flash` | aistudio.google.com → Get API key |
| `openai` | OpenAI | `https://api.openai.com/v1` | `gpt-4.1-mini` | platform.openai.com → API keys (requiere saldo) |
| `openrouter` | OpenRouter (muchos modelos) | `https://openrouter.ai/api/v1` | `openai/gpt-4.1-mini` | openrouter.ai → Keys |
| `compatible` | Otro compatible con OpenAI (p. ej. Ollama local) | la escribe el usuario (Ollama: `http://localhost:11434/v1`) | lo escribe el usuario | según el servicio; Ollama no necesita clave real (usa `ollama`) |

Los modelos sugeridos son solo un valor inicial: **la lista real se pide al proveedor** con `GET <base>/models` (botón “Cargar modelos”), porque los nombres cambian con el tiempo. El usuario siempre puede escribir un modelo a mano.

## Datos (añadir a `agendabot-base-de-datos`)

Migración de negocio `009_proveedores_ia.sql`, tabla `ai_providers` (con las convenciones de todas las tablas y sus dos triggers):

| Columna | Tipo y reglas |
|---|---|
| `provider` | `text NOT NULL CHECK (provider IN ('groq','deepseek','gemini','openai','openrouter','compatible'))` |
| `model` | `text NOT NULL CHECK (char_length(model) BETWEEN 1 AND 200)` |
| `base_url` | `text CHECK (base_url ~ '^https?://')` — obligatoria solo para `compatible` |
| `api_key_encrypted` | `text NOT NULL` — clave cifrada (nunca en claro) |
| `api_key_last4` | `text NOT NULL` — últimos 4 caracteres, para mostrar `••••abcd` |
| `is_active` | `boolean NOT NULL DEFAULT false` |
| `last_test_ok` | `boolean`, `last_tested_at timestamptz`, `last_test_message text` — resultado de la última prueba |

Índice único `((true)) WHERE is_active AND deleted_at IS NULL` → **un solo proveedor activo** por negocio. La función de auditoría `public.audit_row_change()` debe quitar también `api_key_encrypted` de `old_values`/`new_values` (junto a `password_hash` y `token_hash`).

## Seguridad de las claves

- Variable de entorno nueva **`AI_KEYS_SECRET`**: 32 bytes aleatorios en base64 (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Sin ella, guardar una clave responde 409 “Falta AI_KEYS_SECRET en el servidor”.
- Cifrado **AES‑256‑GCM** con IV aleatorio de 12 bytes: `api_key_encrypted = base64(iv) + '.' + base64(tag) + '.' + base64(cifrado)`. Funciones `encryptKey` / `decryptKey` con prueba (ida y vuelta, y que un texto alterado falla).
- La clave **nunca** se devuelve por la API ni se escribe en logs; solo `••••` + `api_key_last4`.
- Llamadas a `compatible` solo a `http(s)`; con `NODE_ENV=production` rechazar `localhost`, `127.*`, `10.*`, `192.168.*` y `169.254.*` para evitar que alguien use el servidor para llegar a la red interna.

## API (añadir a `agendabot-contrato-api`) — todo con sesión del panel

```ts
type AIProviderId = 'groq'|'deepseek'|'gemini'|'openai'|'openrouter'|'compatible';
interface AICatalogItem { provider: AIProviderId; name: string; baseUrl: string|null; suggestedModel: string|null;
  keyUrl: string|null; keyHelp: string; free: boolean }
interface AIProviderConfig { id: string; provider: AIProviderId; model: string; baseUrl: string|null;
  apiKeyMasked: string; isActive: boolean; lastTestOk: boolean|null; lastTestedAt: string|null;
  lastTestMessage: string|null; createdAt: string; updatedAt: string }
interface AIStatus { configured: boolean; source: 'negocio'|'servidor'|null; provider: AIProviderId|null; model: string|null }
```

| Ruta | Entrada | Salida |
|---|---|---|
| `GET /ai/catalog` | — | `AICatalogItem[]` |
| `GET /ai/providers` | — | `AIProviderConfig[]` |
| `GET /ai/status` | — | `AIStatus` (qué usará ahora el asistente) |
| `POST /ai/models` | `{ provider, apiKey?, baseUrl?, configId? }` (si no envía clave, usa la guardada de `configId`) | `{ models: string[] }` ordenados; 400 con el mensaje del proveedor si la clave no vale |
| `POST /ai/test` | `{ provider, model, apiKey?, baseUrl?, configId? }` | `{ ok, latencyMs, message }` — hace una llamada mínima (`max_tokens` 5, “Responde solo: ok”); si viene `configId`, guarda el resultado |
| `POST /ai/providers` | `{ provider, model, apiKey, baseUrl?, activate?: boolean }` | 201 `AIProviderConfig` |
| `PATCH /ai/providers/:id` | `{ model?, apiKey?, baseUrl?, isActive?: boolean }` | `AIProviderConfig` (activar uno desactiva los demás en la misma transacción) |
| `DELETE /ai/providers/:id` | — | 204 (borrado lógico) |

Mensajes de error de la prueba traducidos: 401/403 → “La clave no es válida o no tiene permisos”; 402 o `insufficient`/`balance` → “La cuenta no tiene saldo”; 404 → “El modelo no existe para esta cuenta”; 429 → “Límite de uso alcanzado, inténtalo en unos segundos”; red/timeout → “No se pudo conectar con el proveedor”.

## Cómo elige el asistente (añadir a `agendabot-asistente-whatsapp`)

`resolveAI(schema)` devuelve `{ provider, baseUrl, apiKey, model, source }`:
1. Proveedor **activo del negocio** (`ai_providers`, descifrando la clave) → `source: 'negocio'`.
2. Si no hay, el del **servidor** (`.env`: `AI_PROVIDER` + su clave y modelo) → `source: 'servidor'`.
3. Si no hay ninguno: no se llama a la IA; el asistente responde “Ahora mismo no puedo responder. Te contestamos en breve 🙏” y registra “IA sin configurar en <slug>”.

`complete(messages, ai, timeoutMs)` recibe esa configuración (ya no lee el `.env` directamente). El consumo (`usage`) se guarda **por clave**: archivo de consumo por `provider` + huella (SHA‑256 de la clave, 12 primeros caracteres), y `GET /assistant/usage` devuelve el de la configuración que el negocio usa ahora (con `provider` y `model` reales). El límite diario por defecto de 200 000 tokens solo aplica a `groq`.

## Pantalla (añadir a `agendabot-frontend`)

**Configuración → pestaña “Inteligencia artificial”** (primera pestaña):
- Arriba, estado: tarjeta verde “La IA está lista · <Proveedor> · <modelo>” o ámbar “Tu asistente aún no tiene IA. Configúrala para que responda en WhatsApp y en el chat web.” (de `GET /ai/status`; si `source: 'servidor'`: “Usando la IA del servidor; puedes poner la tuya”).
- **Proveedor**: tarjetas seleccionables del catálogo (nombre, “Gratis” si `free`, y enlace “Conseguir clave” a `keyUrl` que abre en otra pestaña), con la ayuda `keyHelp` debajo al elegir uno.
- **Clave de API**: campo tipo contraseña con botón mostrar/ocultar; si ya hay una guardada, muestra `••••abcd` y “Cambiar clave”. **Base URL** solo para `compatible`.
- **Modelo**: botón “Cargar modelos” (`POST /ai/models`) que llena un desplegable con buscador; preseleccionado el sugerido si existe; opción “Escribir otro modelo”.
- Botones **“Probar conexión”** (muestra ✓ y la latencia en ms, o el error traducido) y **“Guardar y activar”** (deshabilitado hasta que la prueba sale bien; guarda con `activate: true`).
- Lista de configuraciones guardadas: proveedor, modelo, clave enmascarada, “Activa”/“Activar”, resultado de la última prueba y “Eliminar” con confirmación.
- La clave nunca se guarda en el navegador (ni `localStorage` ni `sessionStorage`); el campo se vacía al guardar.

**Aviso en el panel**: mientras `GET /ai/status` diga `configured: false`, el Dashboard y la sección WhatsApp muestran un aviso ámbar con botón “Configurar IA” que lleva a la pestaña. Tras el registro, la app abre Configuración en esta pestaña.

## Guía para el usuario (texto `keyHelp` de cada proveedor)

- **Groq**: “Entra en console.groq.com con tu cuenta de Google o GitHub, ve a API Keys y pulsa Create API Key. Copia la clave (empieza por gsk_) y pégala aquí. El plan gratis permite unas 100 respuestas al día.”
- **DeepSeek**: “Entra en platform.deepseek.com, recarga saldo y crea una clave en API keys (empieza por sk-).”
- **Gemini**: “Entra en aistudio.google.com, pulsa Get API key y crea una clave. Tiene un plan gratuito con límites.”
- **OpenAI**: “Entra en platform.openai.com, añade saldo y crea una clave en API keys (empieza por sk-).”
- **OpenRouter**: “Entra en openrouter.ai, crea una clave en Keys. Da acceso a modelos de muchas empresas; algunos son gratis.”
- **Compatible**: “Cualquier servicio con API compatible con OpenAI. Para Ollama en tu equipo: base URL http://localhost:11434/v1, clave ollama y el nombre del modelo descargado (p. ej. llama3.1).”

## Pruebas mínimas

`encryptKey`/`decryptKey` (ida y vuelta; texto alterado falla; sin secreto, error claro) · `resolveAI` (negocio activo > servidor > ninguno) · traducción de errores del proveedor · validación de `base_url` en producción · ruta: `GET /ai/providers` nunca contiene la clave ni el cifrado.

## Criterios de aceptación

- [ ] Recién registrado, el panel avisa de que falta la IA y lleva a la pestaña Inteligencia artificial.
- [ ] Con una clave real de Groq: “Cargar modelos” lista los modelos de la cuenta, “Probar conexión” da ✓ y “Guardar y activar” deja la IA lista; WhatsApp y el chat web responden con ese modelo.
- [ ] Una clave falsa da “La clave no es válida o no tiene permisos” y no se puede activar.
- [ ] La clave no aparece en ninguna respuesta de la API, en `audit_logs`, en logs ni en el navegador; en la base solo está cifrada.
- [ ] Sin configuración en el negocio se usa la del `.env`; sin ninguna, el asistente da el mensaje de “no puedo responder”.
- [ ] Cambiar el proveedor activo se nota en la siguiente respuesta, sin reiniciar el servidor.
