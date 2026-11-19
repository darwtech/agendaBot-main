# AgendaBot · Instrucciones para agentes de código

Este repositorio se construye **desde cero** con un kit de *skills* (especificaciones) y *agentes* (roles). No hay código de referencia: las skills son la especificación completa.

## Skills

Están en `.agents/skills/<nombre>/SKILL.md` (formato abierto Agent Skills: Codex y Gemini CLI las cargan solas; Claude Code usa la copia de `.claude/skills/`).

| Skill | Para qué |
|---|---|
| `agendabot-construir` | **Empieza aquí**: producto, decisiones, reglas y orden de construcción |
| `agendabot-contrato-api` | Rutas, tipos, errores y eventos entre backend y frontend |
| `agendabot-base-de-datos` | Tablas, restricciones, migraciones, script migrar, datos de ejemplo, verificación |
| `agendabot-backend` | API Node.js + Express 5, multinegocio, auth, citas, tiempo real, CLI |
| `agendabot-modelos-ia` | Proveedores y modelos de IA: clave cifrada, cargar modelos, probar y activar, pestaña Inteligencia artificial |
| `agendabot-asistente-whatsapp` | Asistente IA (WhatsApp y web) y WhatsApp con Baileys |
| `agendabot-frontend` | Panel, configuración, chat web, diseño, tiempo real |
| `agendabot-pantallas-cuenta` | Crear cuenta e Iniciar sesión, al detalle |
| `agendabot-imagenes` | Cómo generar la imagen del panel con cualquier IA de imágenes |
| `agendabot-verificar` | Revisión final con todos los criterios de aceptación |

## Agentes (roles)

| Rol | Codex | Gemini CLI | Claude Code |
|---|---|---|---|
| Base de datos | `.codex/agents/agendabot-base-de-datos.toml` | `.gemini/agents/agendabot-base-de-datos.md` | `.claude/agents/agendabot-base-de-datos.md` |
| Backend | `.codex/agents/agendabot-backend.toml` | `.gemini/agents/agendabot-backend.md` | `.claude/agents/agendabot-backend.md` |
| Frontend | `.codex/agents/agendabot-frontend.toml` | `.gemini/agents/agendabot-frontend.md` | `.claude/agents/agendabot-frontend.md` |
| Revisor | `.codex/agents/agendabot-revisor.toml` | `.gemini/agents/agendabot-revisor.md` | `.claude/agents/agendabot-revisor.md` |

## Cómo trabajar

1. Lee **siempre primero** la skill `agendabot-construir`.
2. Cuando te pidan una parte, usa su agente (o, si tu herramienta no tiene subagentes, adopta tú su rol leyendo su archivo) y sigue sus skills al pie de la letra.
3. Orden: base de datos → backend → frontend → revisión. Backend y frontend pueden ir en paralelo.
4. Respeta las reglas de `agendabot-construir`: no cambies el contrato de la API, ni nombres de tablas/columnas, ni tecnologías; nada de datos personales en el navegador; todo en español y en USD; pruebas en verde; al terminar, informe de criterios de aceptación.
5. **No edites** el kit (`.agents/`, `.claude/`, `.codex/`, `.gemini/`, `prompts/`, `herramientas/`) salvo que te lo pidan; si lo haces, edita solo `.agents/skills/` o `.claude/agents/` y ejecuta `python herramientas/sincronizar.py`.
