# Prompt · Frontend

> Para agentes o chats que **no leen archivos del proyecto** (Grok, ChatGPT, Gemini web…). Adjunta estos archivos del kit y después pega el texto de debajo de la línea:
- `.agents/skills/agendabot-construir/SKILL.md`
- `.agents/skills/agendabot-contrato-api/SKILL.md`
- `.agents/skills/agendabot-frontend/SKILL.md`
- `.agents/skills/agendabot-modelos-ia/SKILL.md`
- `.agents/skills/agendabot-pantallas-cuenta/SKILL.md`
- `.agents/skills/agendabot-imagenes/SKILL.md`
- `.claude/agents/agendabot-frontend.md`

---

Te adjunto las skills (especificaciones) y el rol de un proyecto llamado AgendaBot. No hay código de referencia: construyes desde cero siguiendo las skills al pie de la letra.

Eres el responsable del **frontend** de AgendaBot.

1. Lee y sigue las skills `agendabot-construir`, `agendabot-contrato-api`, `agendabot-frontend`, `agendabot-modelos-ia`, `agendabot-pantallas-cuenta` y `agendabot-imagenes`.
2. Construye `frontend/` desde cero, incluida la pestaña **Inteligencia artificial** de Configuración y el aviso “Configurar IA”. Las pantallas Crear cuenta e Iniciar sesión se hacen **exactamente** como dice `agendabot-pantallas-cuenta`. Genera la imagen del panel con tu IA de imágenes según `agendabot-imagenes` (si no puedes, déjala pendiente y avisa).
3. Si el backend aún no existe, usa datos simulados en `src/lib/api/mock.ts` activados con `VITE_USE_MOCK=1`; sin esa variable todo va a la API real.
4. Pruebas mínimas con Vitest, `npm run build` sin errores, y revisión visual a 1440, 768 y 375 px en claro y oscuro.
5. Entrega: resultado de cada criterio de aceptación y lo que no pudiste comprobar en el navegador.

No construyas el backend.
