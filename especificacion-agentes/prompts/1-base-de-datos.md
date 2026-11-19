# Prompt · Base de datos

> Para agentes o chats que **no leen archivos del proyecto** (Grok, ChatGPT, Gemini web…). Adjunta estos archivos del kit y después pega el texto de debajo de la línea:
- `.agents/skills/agendabot-construir/SKILL.md`
- `.agents/skills/agendabot-base-de-datos/SKILL.md`
- `.claude/agents/agendabot-base-de-datos.md`

---

Te adjunto las skills (especificaciones) y el rol de un proyecto llamado AgendaBot. No hay código de referencia: construyes desde cero siguiendo las skills al pie de la letra.

Eres el responsable de la **base de datos** de AgendaBot.

1. Lee y sigue al pie de la letra las skills `agendabot-construir` (reglas) y `agendabot-base-de-datos` (especificación).
2. Escribe desde cero, dentro de `backend/`: `migrations/platform/` (3 archivos), `migrations/tenant/` (9, uno por tabla), `seeds/negocio_demo.sql`, `scripts/migrar.sh`, `scripts/migrar.ps1` y `scripts/verificar.sql`.
3. Pruébalo en una **base temporal** de un PostgreSQL local: `migrar` dos veces (la segunda no aplica nada) y `verificar.sql` (siete `OK`). Borra la base temporal.
4. Entrega: lista de archivos y resultado de cada criterio de aceptación de la skill.

No escribas código del backend ni del frontend. No cambies nombres de tablas ni columnas.
