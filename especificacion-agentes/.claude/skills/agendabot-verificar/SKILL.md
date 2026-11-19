---
name: agendabot-verificar
description: "Revisa de punta a punta una construcción de AgendaBot contra los criterios de aceptación de todas sus skills (base de datos, backend, modelos de IA, asistente y WhatsApp, frontend, pantallas de cuenta, imágenes) y entrega un informe con lo que cumple, lo que falla y cómo arreglarlo. Úsala al terminar cada parte y antes de dar el proyecto por acabado."
---

# AgendaBot · Verificar la construcción

Eres el revisor. **No escribes funcionalidades nuevas**: compruebas, ejecutas y reportas. Si arreglas algo, que sea mínimo y dilo.

## Procedimiento

1. **Base de datos** (base temporal que borras al final): `scripts/migrar` dos veces (la segunda no aplica nada) y `scripts/verificar.sql` (siete `OK`).
2. **Backend**: `npm install`, `npm run lint`, `npm test`, `npm run migrate`, `npm run dev`; `GET /api/health` → `{status:'ok',db:'ok'}`. Prueba con `curl` el registro, el login de portada, crear servicio y horario, dos reservas simultáneas a la misma hora (una 201, otra 409), cancelar sin motivo (400) y con motivo, y que `/events` emite al reservar.
3. **Modelos de IA**: con sesión, `GET /ai/catalog`; con una clave real (si el usuario la da) `POST /ai/models`, `POST /ai/test` y `POST /ai/providers` con `activate: true`; `GET /ai/status` → `configured: true, source: 'negocio'`. Comprueba que ninguna respuesta, log ni fila de `audit_logs` contiene la clave, y que en `ai_providers` solo está cifrada. Con una clave falsa, la prueba falla con el mensaje traducido.
4. **Asistente** (si hay IA configurada): simula conversaciones llamando directamente a la función del asistente con un chat de prueba: saludo solo → solo bienvenida; tres mensajes seguidos → una respuesta; pedir hora ocupada → alternativas; reservar, preguntar por la cita y cancelar con motivo. Borra después los datos de prueba.
5. **Frontend**: `npm install`, `npm run build`, `npx vitest run`; con backend y frontend en marcha, recorre en el navegador registro → configuración → panel; revisa 1440, 768 y 375 px, claro y oscuro, sin scroll horizontal, y que `localStorage` no tenga datos de clientes tras cerrar sesión.
6. **Seguridad**: `GET /settings` sin sesión no muestra `businessInfo`; `GET /appointments` sin sesión no tiene nombres ni contactos; ninguna clave en el navegador ni en logs.

## Informe

Una tabla por skill: criterio · ✅ cumple / ❌ falla / ⚠️ no comprobado (y por qué) · evidencia (comando o salida) · arreglo propuesto. Termina con los fallos ordenados por gravedad.

## Criterios a comprobar

### agendabot-base-de-datos
- [ ] `migrar` funciona en una base vacía (la crea) y, repetido, no aplica nada nuevo; las tildes de los datos de ejemplo se guardan bien.
- [ ] `verificar.sql` imprime los siete `OK` y deja la base como estaba.
- [ ] Ninguna tabla de negocio lleva nombre de schema fijo.
- [ ] Prueba hecha en una base temporal que después se borra.

### agendabot-backend
- [ ] `npm run lint` (tsc) sin errores y `npm test` en verde.
- [ ] `npm run migrate` deja la base lista; `npm run dev` responde `GET /api/health` con `{status:'ok',db:'ok'}`.
- [ ] Registro → panel con sesión; login de portada con una sola verificación de contraseña.
- [ ] Dos reservas simultáneas a la misma hora: una 201, otra 409.
- [ ] Cancelar desde el panel sin motivo → 400; con motivo → `notified` según WhatsApp.
- [ ] Con WhatsApp vinculado: un "Hola" recibe solo la bienvenida; tres mensajes seguidos reciben una respuesta; pedir cita, confirmar, preguntar por ella y cancelar con motivo funciona de punta a punta.
- [ ] El panel recibe avisos SSE al reservar por WhatsApp.

### agendabot-modelos-ia
- [ ] Recién registrado, el panel avisa de que falta la IA y lleva a la pestaña Inteligencia artificial.
- [ ] Con una clave real de Groq: “Cargar modelos” lista los modelos de la cuenta, “Probar conexión” da ✓ y “Guardar y activar” deja la IA lista; WhatsApp y el chat web responden con ese modelo.
- [ ] Una clave falsa da “La clave no es válida o no tiene permisos” y no se puede activar.
- [ ] La clave no aparece en ninguna respuesta de la API, en `audit_logs`, en logs ni en el navegador; en la base solo está cifrada.
- [ ] Sin configuración en el negocio se usa la del `.env`; sin ninguna, el asistente da el mensaje de “no puedo responder”.
- [ ] Cambiar el proveedor activo se nota en la siguiente respuesta, sin reiniciar el servidor.

### agendabot-frontend
- [ ] `npm run build` (tsc + vite) sin errores y `npx vitest run` en verde.
- [ ] Registro → Configuración con sesión; recargar mantiene la sesión; cerrar sesión no deja datos de clientes en `localStorage`.
- [ ] Con el panel abierto, una cita hecha por WhatsApp aparece sola en Citas y Dashboard con el aviso “Nueva cita”.
- [ ] Cancelar exige motivo; editar la hora avisa; eliminar pide confirmación.
- [ ] La pestaña Inteligencia artificial cumple los criterios de la skill `agendabot-modelos-ia`.
- [ ] El chat web reserva una cita real y la cita aparece en el panel.
- [ ] Se ve bien a 360, 768 y 1440 px, en claro y oscuro, sin scroll horizontal.
- [ ] Crear cuenta e Iniciar sesión cumplen los criterios de la skill `agendabot-pantallas-cuenta`.
- [ ] La imagen del panel está generada según la skill `agendabot-imagenes` (o, si no se pudo, se avisó y el panel se ve con su color y degradado).

### agendabot-pantallas-cuenta
- [ ] A 1440, 768 y 375 px las dos pantallas siguen los esquemas de arriba, sin scroll horizontal, en claro y oscuro.
- [ ] Textos idénticos (incluidos signos y tildes), tamaños, colores y orden como se describen.
- [ ] Teclado: todo se alcanza con Tab, foco visible; el desplegable se abre con Enter/Espacio y tiene roles `listbox`/`option`.
- [ ] Registro y login funcionan contra la API y dejan la sesión abierta en el panel.

### agendabot-imagenes
- [ ] 1672 × 941 px, guardada en `frontend/public/images/auth-booking-hero-v2.png`.
- [ ] El tercio izquierdo es oscuro: con el degradado encima, el título blanco se lee perfectamente.
- [ ] La persona queda a la derecha y su cara no la tapa el formulario en escritorio (el panel ocupa el 55 % izquierdo de la pantalla, la imagen se recorta con `cover`).
- [ ] Manos y cara sin deformaciones; un solo teléfono; sin texto ni logos.
- [ ] En móvil (cabecera de ~200 px de alto) se sigue viendo el ambiente verde oscuro y parte de la persona.
