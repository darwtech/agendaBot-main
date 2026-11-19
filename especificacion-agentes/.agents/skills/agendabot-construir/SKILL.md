---
name: agendabot-construir
description: "Punto de entrada para construir AgendaBot desde cero (plataforma de citas por WhatsApp con IA para cualquier negocio, multinegocio, panel en tiempo real). Explica el producto, las decisiones tomadas, las reglas de trabajo y el orden de construcción, y reparte el trabajo entre las demás skills y agentes. Úsala primero cuando te pidan crear, replicar o continuar AgendaBot."
---

# AgendaBot · Construir el proyecto completo


## Qué es

**AgendaBot** es una plataforma para que cualquier negocio con agenda (barberías, salones de uñas, spas, clínicas, talleres, asesorías…) atienda a sus clientes por **WhatsApp con inteligencia artificial**: la IA informa de servicios, precios y horarios, ofrece solo horas realmente libres, reserva, recuerda y cancela citas pidiendo el motivo. El dueño lo controla todo desde un **panel web en tiempo real**. También hay un **chat web** público por negocio. Una sola instalación sirve a muchos negocios, con sus datos totalmente separados.

Mercado inicial: Ecuador → **todo en dólares (USD)** y zona horaria `America/Guayaquil` por defecto. Idioma de la interfaz: español.

## Usuarios

| Quién | Qué hace |
|---|---|
| **Dueño / recepción** | Se registra, configura el negocio, vincula WhatsApp, gestiona citas, clientes, servicios y horario, lee y responde conversaciones |
| **Cliente final** | Escribe por WhatsApp o en el chat web; pide información, reserva, pregunta por su cita, la cancela o la cambia |
| **Plataforma** (administrador técnico) | Crea o desactiva negocios y usuarios con un token o por consola |

## Recorrido principal

1. **Crear cuenta** en `/registro`: nombre del negocio, tipo (17 opciones), tu nombre, correo y contraseña. El negocio queda activo al instante con su dirección `/n/<negocio>` generada del nombre.
2. **Configurar**: servicios con duración y precio, horario semanal por bloques, dirección, teléfono, mensaje de bienvenida e instrucciones para el asistente.
3. **Vincular WhatsApp** escaneando un QR (una vez; se reconecta solo).
4. **La IA atiende**: espera unos segundos a que el cliente termine de escribir, contesta una sola vez, ofrece horas libres, propone alternativas si lo pedido no está libre, reserva tras confirmar, recuerda citas y cancela pidiendo motivo.
5. **El panel se actualiza solo**: aparece “Nueva cita”. Desde el panel se crean, editan, cancelan (con motivo, que se envía al cliente por WhatsApp) y eliminan citas.

## Arquitectura en una imagen

```
 Clientes WhatsApp ─┐                      ┌─ Groq / DeepSeek / Gemini (IA)
 Chat web público ──┼──►  BACKEND Node.js  ┼─ PostgreSQL (un schema por negocio)
 Panel del negocio ─┘   Express · Baileys  └─ archivos: credenciales WhatsApp, consumo IA
        ▲                IA · SSE
        └──── avisos en vivo (Server-Sent Events) ────┘
```

Tres piezas que se construyen por separado y encajan por contrato:

| Pieza | Skill | Depende de |
|---|---|---|
| Base de datos | `agendabot-base-de-datos` | nada |
| Backend | `agendabot-backend` + `agendabot-modelos-ia` + `agendabot-asistente-whatsapp` | base de datos, `agendabot-contrato-api` |
| Frontend | `agendabot-frontend` + `agendabot-modelos-ia` (pestaña IA) + `agendabot-pantallas-cuenta` + `agendabot-imagenes` | `agendabot-contrato-api` (puede empezar con datos simulados) |

## Decisiones ya tomadas (no reabrir)

- Multinegocio con **un schema de PostgreSQL por negocio** (aislamiento fuerte y simple).
- SQL a mano, sin ORM. Validación con Zod en el servidor.
- **La IA vive solo en el servidor**; el navegador nunca tiene claves de IA ni lógica de reservas. WhatsApp y chat web usan el mismo asistente.
- La base de datos es la última barrera contra dobles reservas (restricción de no solape).
- Borrado lógico y auditoría en todas las tablas.
- Una sola instancia del backend (límites, avisos y sesiones de WhatsApp en memoria, marcados como `shortcut:`).

## Fuera de alcance (no construir)

Pagos, facturación, recordatorios automáticos programados, varios profesionales/agenda por empleado, app móvil nativa, plantillas de WhatsApp Business API, varios idiomas de interfaz, monedas distintas del dólar.

## Glosario

- **slug**: identificador del negocio en la URL (`barberia-central`).
- **schema**: espacio de tablas propio de cada negocio en PostgreSQL (`t_barberia_central`).
- **JID / LID**: identificadores de chat de WhatsApp. JID con número: `593981234567@s.whatsapp.net`; LID (id interno, sin número): `12345@lid`.
- **SSE**: Server-Sent Events, conexión abierta por la que el servidor avisa al panel.
- **Horas libres**: horas dentro del horario, en la cuadrícula del intervalo, que no se solapan con citas confirmadas.

## Reglas de trabajo (para cualquier agente)

- **No hay código de referencia.** Todo se construye desde cero con estas skills; son la especificación completa.
- Construye solo la parte que te pidan. No cambies el contrato de la API (`agendabot-contrato-api`), los nombres de tablas/columnas ni las tecnologías indicadas. Si algo es imposible o ambiguo, para y pregunta; no inventes otra versión.
- Usa solo las dependencias indicadas. Interfaz, mensajes y comentarios en **español**; dinero siempre en **USD**.
- Valida toda entrada en el servidor. Nunca guardes ni registres contraseñas, tokens o claves en claro. Nunca guardes datos de clientes en `localStorage`.
- La solución más simple que cumpla la skill. Comenta solo el porqué. Un atajo con límite conocido lleva `// shortcut: <límite>, <cuándo cambiarlo>`.
- Escribe las pruebas que pide cada skill y déjalas pasando. Al terminar cada parte, recorre sus **criterios de aceptación** y di cuáles se cumplen y cuáles no pudiste comprobar.

## Orden de construcción

| Paso | Qué | Skill(s) | Agente |
|---|---|---|---|
| 1 | Base de datos: migraciones, script `migrar`, datos de ejemplo, verificación | `agendabot-base-de-datos` | `agendabot-base-de-datos` |
| 2 | Backend: API, auth, multinegocio, citas, SSE, CLI | `agendabot-backend`, `agendabot-contrato-api` | `agendabot-backend` |
| 3 | **Modelos de IA** (proveedor, clave cifrada, modelos, prueba) y asistente IA + WhatsApp | `agendabot-modelos-ia`, `agendabot-asistente-whatsapp` | `agendabot-backend` |
| 4 | Frontend: panel, configuración (incluida la pestaña **Inteligencia artificial**), chat web | `agendabot-frontend`, `agendabot-modelos-ia`, `agendabot-contrato-api` | `agendabot-frontend` |
| 5 | Pantallas de cuenta e imagen del panel | `agendabot-pantallas-cuenta`, `agendabot-imagenes` | `agendabot-frontend` |
| 6 | Revisión final de punta a punta | `agendabot-verificar` | `agendabot-revisor` |

Los pasos 2–3 y 4–5 pueden ir en paralelo (el contrato ya está fijado; el frontend puede usar datos simulados con `VITE_USE_MOCK=1` mientras tanto).

Estructura final del repositorio:
```
agendabot/
  backend/     ← pasos 1, 2 y 3 (incluye migrations/, seeds/, scripts/)
  frontend/    ← pasos 4 y 5
```
