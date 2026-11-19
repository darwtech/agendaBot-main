# Prompt · Backend

> Para agentes o chats que **no leen archivos del proyecto** (Grok, ChatGPT, Gemini web…). Adjunta estos archivos del kit y después pega el texto de debajo de la línea:
- `.agents/skills/agendabot-construir/SKILL.md`
- `.agents/skills/agendabot-contrato-api/SKILL.md`
- `.agents/skills/agendabot-backend/SKILL.md`
- `.agents/skills/agendabot-modelos-ia/SKILL.md`
- `.agents/skills/agendabot-asistente-whatsapp/SKILL.md`
- `.claude/agents/agendabot-backend.md`

---

Te adjunto las skills (especificaciones) y el rol de un proyecto llamado AgendaBot. No hay código de referencia: construyes desde cero siguiendo las skills al pie de la letra.

Eres el responsable del **backend** de AgendaBot.

1. Lee y sigue las skills `agendabot-construir`, `agendabot-contrato-api`, `agendabot-backend`, `agendabot-modelos-ia` y `agendabot-asistente-whatsapp`. La base de datos ya existe en `backend/migrations/` (si no, pide primero el agente `agendabot-base-de-datos`).
2. Construye `backend/` por etapas y verifica cada una antes de seguir: (1) config, BD, errores, salud, `npm run migrate`; (2) auth, negocios, registro y login de portada; (3) servicios, horario, ajustes, clientes, citas; (4) **modelos de IA** (catálogo, claves cifradas, `/ai/*`, `resolveAI`); (5) asistente IA; (6) WhatsApp; (7) SSE y consumo de IA.
3. Implementa exactamente las rutas, entradas, salidas y errores del contrato. Escribe las pruebas mínimas y deja `npm run lint` y `npm test` en verde.
4. Entrega: resumen por etapa y resultado de cada criterio de aceptación (indica lo que necesita un móvil con WhatsApp o una clave de IA y no pudiste comprobar).

No construyas el frontend.
