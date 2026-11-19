---
name: agendabot-frontend
description: "Construye desde cero el frontend de AgendaBot: React 19 + Vite + Tailwind CSS 4 + Zustand, panel del negocio (dashboard, citas, clientes, servicios, horario, conversaciones, WhatsApp, configuración), chat web y avisos en tiempo real. Úsala para crear o modificar cualquier pantalla de AgendaBot."
---

# AgendaBot · Frontend (registro, panel y chat web)

> Habla con el backend **solo** a través de la skill `agendabot-contrato-api`. Mientras el backend no exista, puedes simularlo con datos falsos en un único archivo `src/lib/api/mock.ts`, pero el código de pantallas debe usar las mismas funciones que llaman a la API real.

## Tecnología (no cambiar)

React 19 + TypeScript estricto · Vite · **Tailwind CSS 4** (`@tailwindcss/vite`, `@import "tailwindcss"`, modo oscuro por clase `.dark`) · React Router 7 · Zustand 5 (estado) · `lucide-react` (iconos) · `sonner` (avisos) · `recharts` (gráfico del dashboard) · `clsx` + `tailwind-merge` (`cn()`) · Vitest para pruebas. Nada más. Todo en **español**.

## Estructura

```
frontend/
  index.html              lang="es", fuentes de Google: DM Sans (texto), Plus Jakarta Sans (títulos), JetBrains Mono (datos)
  vite.config.ts          alias @ → src; en desarrollo proxy /api → VITE_API_PROXY_TARGET (sin CORS)
  .env.example            VITE_API_URL=/api · VITE_API_PROXY_TARGET=http://localhost:3000
  src/
    main.tsx              decide la pantalla según la URL (ver Rutas)
    index.css             tokens de color y tipografía
    lib/tenant.ts         slug actual desde /n/<slug>/…
    lib/api/client.ts     fetch con base /api/t/<slug>, Bearer, timeout 15 s, ApiError(message, status)
    lib/api/*.ts          una función por ruta del contrato (services.list(), appointments.update()…)
    lib/live.ts           escucha /events (SSE con fetch) y recarga lo que cambió
    lib/format.ts         dinero en USD, fechas en español
    store/                Zustand: datos del negocio y acciones que llaman a la API
    components/ui/        Button, Input, Select, Textarea, Label, Card, Dialog, Switch, cn
    components/           AuthShell (+ PasswordInput, FormError), BusinessIcon, ThemeSync  ← ver agendabot-pantallas-cuenta
    components/admin/     AdminLayout y una sección por pantalla del panel
    components/settings/  pestañas de Configuración
    components/chat/      ventana, burbujas, sugerencias, entrada, “escribiendo…”
    pages/                LoginStartPage, SignupPage, AdminPage, SettingsPage, ClientChatPage
```

## Rutas

| URL | Pantalla | Notas |
|---|---|---|
| `/` y `/registro` | **Crear cuenta** (portada) | `POST /api/signup` → guarda token → `/n/<slug>/admin/settings?tab=ia` |
| `/iniciar-sesion` | **Iniciar sesión** | `POST /api/platform/auth/login` → guarda token → `/n/<slug>/admin` |
| `/n/<slug>` | **Chat web** público del negocio | |
| `/n/<slug>/admin` | **Panel**; sección con `?s=citas|clientes|servicios|horario|conversaciones|whatsapp` | sin sesión → login del negocio |
| `/n/<slug>/admin/settings?tab=ia|negocio|asistente|apariencia` | **Configuración** | `ia` = Inteligencia artificial (por defecto) |
| `/n/<slug>/…` inexistente | redirige a `/n/<slug>` | negocio inexistente (404) → aviso “Negocio no encontrado” |

## Sesión y datos en el navegador (obligatorio)

- Token en `sessionStorage` con clave `agendabot-admin-token:<slug>` (se borra al cerrar la pestaña). “Cerrar sesión” llama a `/auth/logout` y borra la clave. Un 401 en cualquier llamada → borrar token, volver al login y avisar “Tu sesión ha caducado”.
- **No guardar en `localStorage` clientes, citas, conversaciones ni nada personal.** Solo se permite guardar ahí preferencias visuales del navegador. Los datos del negocio viven en memoria (Zustand) y se piden al servidor al entrar.
- El chat web guarda su `conversationId` en `sessionStorage` (`agendabot-chat:<slug>`).

## Diseño

- Color de acento por negocio (`settings.accentColor`) con variables CSS en `:root[data-accent=…]`: `--accent-50/100/500/600/700` y `--accent-fg`. Esmeralda (por defecto): `#ecfdf5 #d1fae5 #10b981 #059669 #047857`; azul `#eff6ff #dbeafe #3b82f6 #2563eb #1d4ed8`; ámbar `#fffbeb #fef3c7 #f59e0b #d97706 #b45309`; rosa `#fff1f2 #ffe4e6 #f43f5e #e11d48 #be123c`; pizarra `#f8fafc #f1f5f9 #475569 #1e293b #0f172a`.
- Fondo `stone-50`/`slate-950`, tarjetas blancas con borde `slate-200` y radio `xl/2xl`, texto `slate-900`/`slate-100`. Títulos en Plus Jakarta Sans; datos (horas, importes) en JetBrains Mono con `tabular-nums`.
- `ThemeSync` aplica `settings.theme` (claro/oscuro/sistema) y el acento. Selección de texto y cursor con el acento.
- Totalmente adaptable: móvil 360 px, tablet 768 px, escritorio ≥ 1024 px, sin scroll horizontal. Foco visible en todo (`ring-2` acento). Iconos decorativos con `aria-hidden`; botones de solo icono con `aria-label`.
- Dinero siempre `Intl.NumberFormat('es-EC', { style:'currency', currency:'USD' })` → `$15`, `$15,50`. Nada en euros.

## Pantallas

### Cuenta (Crear cuenta e Iniciar sesión) — réplica exacta

Se construyen con la skill **`agendabot-pantallas-cuenta`**, que define al detalle el marco, medidas, textos, colores y comportamiento, y con la skill **`agendabot-imagenes`** para generar la foto del panel. No las rediseñes.

**Login del negocio** (`/n/<slug>/admin` sin sesión): mismo marco y estilo que Iniciar sesión, con enlace “Volver al chat” y el nombre del negocio arriba; llama a `POST /api/t/<slug>/auth/login`.

### Panel — `AdminLayout`
Barra lateral (cajón en móvil) con: Dashboard, Citas, Clientes, Servicios, Horario, Conversaciones, WhatsApp, Configuración; abajo “Chat del cliente” (abre `/n/<slug>`) y “Cerrar sesión”. Cabecera con título de la sección y botón de tema claro/oscuro.

Al entrar: cargar ajustes, servicios, horario, citas, clientes y conversaciones, y **abrir los avisos en vivo** (`lib/live.ts`). Con cada aviso, recargar solo ese tema (agrupando avisos de 300 ms). Si llega una cita confirmada nueva, aviso “Nueva cita: <cliente>” con “<servicio> · <fecha> a las <hora> · WhatsApp”. Si se corta la conexión, reintentar a los 3 s y recargar todo al volver. Respaldo: recargar Citas y Conversaciones cada 30 s mientras se ven.

- **Aviso de IA sin configurar**: mientras `GET /ai/status` diga `configured: false`, Dashboard y WhatsApp muestran arriba un aviso ámbar “Tu asistente aún no tiene IA” con botón “Configurar IA” (→ `?tab=ia`).
- **Dashboard**: tarjeta “Límite gratuito de la IA” (abajo) · 4 indicadores: Citas de hoy (“Confirmadas para hoy”), Citas de la semana (“Próximos 7 días”), Ingresos previstos (“Reservas confirmadas (7 días)”, icono dólar), Tasa de cancelación · gráfico de barras (recharts) de citas por día de los próximos 7 días · “Próximos 5 turnos” con enlace “Ver todas”.
- **Citas**: vista Tabla / Semana (7 columnas). Filtros: búsqueda (cliente, contacto, servicio), Todas/Hoy/Esta semana, estado, servicio, canal. Tabla: Fecha y hora · Cliente (nombre + contacto) · Servicio (duración) · Importe · Canal · Estado (si cancelada, el motivo debajo) · Acciones: **Editar**, **Cancelar** (solo confirmadas), **Eliminar** (icono). 
  - *Nueva cita* (panel lateral): servicio, fecha (mín. hoy), hora entre las **horas libres** calculadas en el cliente con el horario, el intervalo y las citas confirmadas (misma regla que `freeSlotsByDay`), nombre, teléfono o correo, canal → `POST /appointments`.
  - *Editar*: mismo panel; nombre/contacto/canal bloqueados; servicio, fecha, hora (la propia cita no ocupa su hueco) y notas internas; texto “Si cambias fecha, hora o servicio, se avisará al cliente por WhatsApp” → `PATCH` solo con lo cambiado.
  - *Cancelar*: diálogo con **motivo obligatorio** (≥ 3) “Se enviará al cliente por WhatsApp…”; botón “Cancelar y avisar”.
  - *Eliminar*: diálogo “No se avisa al cliente: si la cita sigue en pie, mejor cancélala”.
  - Tras guardar: aviso según `notified` (“Se avisó al cliente por WhatsApp” / aviso ámbar “No se pudo avisar…”). Errores 409 del servidor dentro del formulario.
- **Clientes**: búsqueda por nombre o contacto; lista con nº de citas y sus citas (estado Confirmada/Cancelada); editar nombre y contacto; eliminar.
- **Servicios**: lista con nombre, descripción, duración, precio y Activo/Inactivo; “Nuevo servicio”/“Editar servicio” en diálogo: nombre (`Ej. Degradado + lavado`), descripción (`Breve detalle para el cliente…`), duración (5–480), **Precio (USD $)** (≥ 0), interruptor “Servicio activo”; eliminar con confirmación.
- **Horario**: los 7 días (lunes primero), interruptor abierto/cerrado y bloques hora-inicio/hora-fin añadibles y quitables; validar fin > inicio y sin solapes; guardar → `PUT /schedule`.
- **Conversaciones**: bandeja tipo WhatsApp: lista (nombre o “Visitante anónimo”, icono de móvil si es WhatsApp, último mensaje, hora) con búsqueda; chat con burbujas (cliente a la izquierda, asistente a la derecha en acento, `error` en rojo) y caja de respuesta (Enter envía, Mayús+Enter salto). En chats de WhatsApp la cabecera dice “WhatsApp · Responde la IA (puedes escribir tú también)” y la respuesta va a `POST /whatsapp/conversations/:id/reply`. En chats web, solo lectura.
- **WhatsApp**: estado (Conectado ahora / Esperando escaneo / Desconectado), botón Conectar (muestra el QR `qrDataUrl` y consulta el estado cada 2 s hasta conectar) y Desconectar; cuando está conectado: “La IA responde automáticamente” con el número; aviso de uso responsable (cuentas y contactos autorizados, sin envíos masivos). Debajo, la tarjeta de límite de IA.
- **Tarjeta “Límite gratuito de la IA”** (`GET /assistant/usage`, cada 30 s): proveedor y modelo; cifra grande “≈ N respuestas más hoy” (tokens restantes ÷ media de tokens por respuesta, o 2.000 si aún no hay datos); barra “Tokens de hoy” (usados/límite, %, “Se reinicia a medianoche UTC (19:00 en Ecuador)”); barra “Mensajes de hoy” (límite − restantes, “siguiente hueco en N min”); “Por minuto: X de Y tokens libres”. Colores: acento < 70 %, ámbar < 90 %, rojo ≥ 90 % con aviso de que al agotarse WhatsApp responderá “Ahora mismo no puedo responder”. Barras con `role="progressbar"` y `aria-value*`.

### Configuración (`/admin/settings`)
Cuatro pestañas. **Inteligencia artificial** (primera y por defecto): proveedor, clave, modelo, probar y activar, exactamente como dice la skill `agendabot-modelos-ia`. En las demás, cada cambio se guarda con `PATCH /settings` (agrupar escritura con 600 ms de espera para no enviar cada tecla).
- **Negocio**: nombre; dirección; teléfono de contacto; zona horaria (lista: America/Guayaquil primero, Pacific/Galapagos, Europe/Madrid, Atlantic/Canary, Europe/London, Europe/Paris, America/Mexico_City, America/Bogota, America/Argentina/Buenos_Aires, America/Santiago, America/Lima, America/New_York) — **si hay citas futuras, pedir confirmación**: “Cambiar la zona horaria cambia la hora con la que se ven las citas ya guardadas”; intervalo de horas (15/30/60); moneda fija “Dólar estadounidense (USD $)”.
- **Asistente**: mensaje de bienvenida (placeholder con el texto por defecto; `{{negocio}}`; “vacío = mensaje de ejemplo”); información e instrucciones para el asistente (pagos, políticas, aparcamiento, tono…; aviso “Solo la ve el asistente, no es pública”); turnos de historial, tiempo de espera (s), horas máximas por mensaje.
- **Apariencia**: tema (Claro/Oscuro/Sistema) y color de acento (Esmeralda, Azul, Ámbar, Rosa, Pizarra) con muestra.

### Chat web (`/n/<slug>`)
Cabecera con icono del tipo de negocio, nombre y botones “Nueva conversación” y “Admin”. Al abrir sin conversación, mostrar la bienvenida (`settings.welcomeMessage` o la de defecto) como primera burbuja del asistente. Sugerencias rápidas: “Ver servicios”, “¿Hay hueco mañana?”, “Reservar cita”. Cada envío → `POST /assistant/chat` con `{ conversationId, text }`; mostrar “escribiendo…” mientras tanto y añadir cada texto de `replies` como burbuja. Errores 429 → “Has enviado muchos mensajes, espera un momento”. Panel lateral (escritorio): servicios activos con precio y duración, y horario de la semana (“Cerrado” si no abre). La IA y la reserva ocurren en el servidor: **el navegador no tiene claves de IA ni lógica de reservas**.

## Pruebas mínimas (Vitest)

`formatCurrency` (USD, sin euros) · vista previa del slug igual a la del servidor · cálculo de horas libres del formulario de citas (horario, ocupadas, horas pasadas, la propia cita al editar) · cliente de API (Bearer, 401 borra sesión, mensajes de error) · lector SSE (separa eventos por línea en blanco y junta `data:`).

## Criterios de aceptación

- [ ] `npm run build` (tsc + vite) sin errores y `npx vitest run` en verde.
- [ ] Registro → Configuración con sesión; recargar mantiene la sesión; cerrar sesión no deja datos de clientes en `localStorage`.
- [ ] Con el panel abierto, una cita hecha por WhatsApp aparece sola en Citas y Dashboard con el aviso “Nueva cita”.
- [ ] Cancelar exige motivo; editar la hora avisa; eliminar pide confirmación.
- [ ] La pestaña Inteligencia artificial cumple los criterios de la skill `agendabot-modelos-ia`.
- [ ] El chat web reserva una cita real y la cita aparece en el panel.
- [ ] Se ve bien a 360, 768 y 1440 px, en claro y oscuro, sin scroll horizontal.
- [ ] Crear cuenta e Iniciar sesión cumplen los criterios de la skill `agendabot-pantallas-cuenta`.
- [ ] La imagen del panel está generada según la skill `agendabot-imagenes` (o, si no se pudo, se avisó y el panel se ve con su color y degradado).
