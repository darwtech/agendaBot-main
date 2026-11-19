# Kit AgendaBot · Construir el proyecto desde cero con agentes de IA

Este kit permite que **cualquier persona**, con **cualquier agente de código** (Claude Code, Codex, Gemini CLI, Grok, ChatGPT…), construya AgendaBot completo **desde cero**: base de datos, backend con IA y WhatsApp, y frontend. No incluye código ni SQL de referencia: incluye *skills* (especificaciones completas) y *agentes* (roles) que le dicen al agente exactamente qué construir y cómo comprobarlo.

## Qué contiene

```
AGENTS.md                         instrucciones para cualquier agente (Codex y otros lo leen solos)
CLAUDE.md · GEMINI.md             lo mismo para Claude Code y Gemini CLI (importan AGENTS.md)
.agents/skills/                   ★ las 10 skills (formato abierto Agent Skills) — Codex y Gemini CLI
  agendabot-construir/            producto, decisiones, reglas y orden de construcción  ← empezar aquí
  agendabot-contrato-api/         rutas, tipos, errores y eventos (backend ⇄ frontend)
  agendabot-base-de-datos/        tablas, restricciones, migraciones, script migrar, datos de ejemplo, verificación
  agendabot-backend/              API Node.js + Express 5, multinegocio, auth, citas, tiempo real, CLI
  agendabot-modelos-ia/           proveedores y modelos de IA (clave cifrada, cargar modelos, probar, activar)
  agendabot-asistente-whatsapp/   asistente IA (WhatsApp y web) y WhatsApp con Baileys
  agendabot-frontend/             panel, configuración, chat web, diseño, tiempo real
  agendabot-pantallas-cuenta/     Crear cuenta e Iniciar sesión, al detalle
  agendabot-imagenes/             cómo generar la imagen del panel con cualquier IA de imágenes
  agendabot-verificar/            revisión final con todos los criterios de aceptación
.claude/skills/ · .claude/agents/ Claude Code (copia de las skills + los 4 agentes en Markdown)
.codex/agents/                    los 4 agentes para Codex (TOML)
.gemini/agents/                   los 4 agentes para Gemini CLI (Markdown)
.gemini/commands/agendabot/       comandos /agendabot:… para Gemini CLI
prompts/                          textos para pegar en chats que no leen archivos
herramientas/sincronizar.py       regenera las copias para cada herramienta (solo si editas el kit)
```

Agentes: **base de datos**, **backend** (incluye modelos de IA, asistente y WhatsApp), **frontend** (incluye pantallas de cuenta e imagen) y **revisor**.

## Cómo usarlo

1. Crea una carpeta vacía para el proyecto y **copia dentro todo el contenido de este kit**, incluidas las carpetas ocultas (`.agents`, `.claude`, `.codex`, `.gemini`). Conviene iniciar Git (`git init`): Codex busca las skills hasta la raíz del repositorio.
2. Abre tu herramienta en esa carpeta y pide las partes **en orden**: base de datos → backend → frontend → revisión (backend y frontend pueden ir en paralelo).

### Codex (CLI, IDE o app)
- Lee `AGENTS.md` solo; las skills aparecen con `/skills` y se invocan con `$nombre` (por ejemplo `$agendabot-construir`).
- Los agentes de `.codex/agents/` se usan nombrándolos: *“Usa el agente agendabot-base-de-datos para construir la base de datos”*, luego `agendabot-backend`, `agendabot-frontend` y `agendabot-revisor`.

### Gemini CLI
- Skills de `.agents/skills/` (comprueba con `/skills list`) y subagentes de `.gemini/agents/` (comprueba con `/agents list`).
- Comandos listos: `/agendabot:construir`, `/agendabot:base-de-datos`, `/agendabot:backend`, `/agendabot:frontend`, `/agendabot:verificar` (puedes añadir instrucciones detrás, p. ej. `/agendabot:backend empieza por la etapa 1`).

### Claude Code
- Skills en `.claude/skills/` (`/skills`) y agentes en `.claude/agents/` (`/agents`).
- Escribe: *“Construye AgendaBot siguiendo la skill agendabot-construir”* o *“Usa el agente agendabot-backend”*.

### Grok, ChatGPT, Gemini web u otro chat
- Abre `prompts/1-base-de-datos.md` (luego 2, 3 y 4), adjunta los archivos que indica y pega el texto.

3. Después de cada parte, el agente debe decirte qué **criterios de aceptación** cumple. Al final, pide la revisión al agente `agendabot-revisor`.
4. Para probarlo todo: PostgreSQL local, backend en el puerto 3000, frontend en el 5173; regístrate, configura un servicio y un horario, vincula WhatsApp y escribe desde otro móvil.

## Si cambias el kit

Edita **solo** `.agents/skills/` (skills) o `.claude/agents/` (agentes) y ejecuta `python herramientas/sincronizar.py`: regenera las copias de Claude Code, los agentes de Codex y Gemini, los comandos de Gemini y los prompts.

## Qué necesitas

- Node.js 22, PostgreSQL 15+ con `psql`, un número de WhatsApp para vincular y una clave de IA (Groq gratis sirve; también DeepSeek, Gemini, OpenAI, OpenRouter u Ollama). La clave se pone **en el panel**, en Configuración → Inteligencia artificial, que explica cómo conseguirla.
- Para la imagen del panel, un agente con generador de imágenes, o cualquier IA de imágenes usando la skill `agendabot-imagenes`. Sin ella la app funciona y se ve bien; solo falta la foto.

## Qué construye

Plataforma de citas para cualquier negocio (barberías, uñas, spas, clínicas, talleres…), en español y en dólares: registro en un minuto; panel en tiempo real con citas, clientes, servicios, horario y conversaciones; WhatsApp atendido por IA que ofrece horas libres, propone alternativas, reserva, recuerda y cancela con motivo; cancelaciones y cambios avisados al cliente; chat web con la misma IA; y control del consumo del plan de IA. Incluye las correcciones de seguridad de la auditoría de la versión original.
