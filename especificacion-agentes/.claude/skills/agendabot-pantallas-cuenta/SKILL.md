---
name: agendabot-pantallas-cuenta
description: "Especificación exacta para construir las pantallas Crear cuenta e Iniciar sesión de AgendaBot (marco con imagen y degradado, formulario, medidas, textos, colores, comportamiento adaptable). Úsala cuando construyas o cambies el registro, el inicio de sesión o el marco AuthShell."
---

# AgendaBot · Pantallas de cuenta (Crear cuenta e Iniciar sesión)

> Estas dos pantallas se construyen **exactamente** así. No hay código de referencia: esta skill es la especificación completa (estructura, medidas, textos, colores, comportamiento y esquemas por tamaño). La imagen del panel se genera con la skill `agendabot-imagenes`. No rediseñes ni cambies textos, colores, tamaños ni orden.

## Rutas (sin negocio en la URL)

| URL | Pantalla |
|---|---|
| `/` y `/registro` | **Crear cuenta** (`SignupPage`) |
| `/iniciar-sesion` | **Iniciar sesión** (`LoginStartPage`) |

Al registrarse → guardar token y ir a `/n/<slug>/admin/settings?tab=ia` (configurar la IA es lo primero). Al iniciar sesión → `/n/<slug>/admin`.

## Cómo se ven (esquemas)

Medidas en px. `▓` = imagen del panel con el degradado verde oscuro encima; texto blanco. `[ ]` = campo; `(█ … █)` = botón verde.

**Escritorio (≥ 1024 px) — Crear cuenta**
```
┌──────────────── 55 % ────────────────┬──────────────── 45 % ───────────────┐
│▓ [▣] AgendaBot                       ▓│                                      │
│▓                                     ▓│   Crea tu cuenta                     │
│▓                                     ▓│   Un minuto y tu negocio queda…      │
│▓  Tu agenda, atendida por chat.      ▓│   Tu negocio                         │
│▓  Para barberías, clínicas, spas,    ▓│   Nombre              Tipo de negocio│
│▓  talleres y cualquier negocio…      ▓│   [Barbería Central ] [▣ Otro     ⌄] │
│▓                       (persona  ▓▓▓▓▓│   Tu acceso                          │
│▓                        a la     ▓▓▓▓▓│   Tu nombre           Correo         │
│▓                        derecha) ▓▓▓▓▓│   [               ]   [tu@negocio…]  │
│▓ ──────────────────────────────────  ▓│   Contraseña                         │
│▓ (●) Crea tu cuenta                  ▓│   [                            👁]   │
│▓     Tu negocio queda activo…        ▓│   Mínimo 8 caracteres.               │
│▓ (●) Configura                       ▓│   (██████ Crear cuenta → ██████)     │
│▓     Servicios, horario y…           ▓│   ¿Ya tienes una cuenta? Iniciar…    │
│▓ (●) Abre el chat                    ▓│                                      │
│▓     Tus clientes reservan solos…    ▓│                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
 alto = 100 % de la pantalla, sin scroll de página; el formulario (máx. 576) centrado en vertical
```

**Escritorio — Iniciar sesión**: mismo panel izquierdo. Columna derecha:
```
│                                     Crear mi negocio │   ← enlace arriba a la derecha
│   [🔒]                                               │   ← cuadro 44 verde claro
│   Bienvenido de nuevo                                │
│   Inicia sesión para gestionar tus citas, servicios… │
│   Correo electrónico                                 │
│   [✉ tu@negocio.com                              ]   │   ← 44 de alto
│   Contraseña                                         │
│   [                                            👁]   │
│   (████████████ Iniciar sesión → ████████████)       │   ← 44 de alto
│        ¿Aún no tienes cuenta? Crea tu negocio        │
```

**Tablet (640–1023 px)** — el panel pasa a **cabecera** de ancho completo:
```
┌───────────────────────────────────────────────┐
│▓ [▣] AgendaBot                               ▓│  padding 32
│▓ Tu agenda, atendida por chat.  (30 px)      ▓│
│▓ Para barberías, clínicas, spas, talleres…   ▓│  (sin los 3 pasos)
└───────────────────────────────────────────────┘
        formulario centrado, máx. 576 de ancho:
        Crear cuenta → Nombre | Tipo en una fila; Tu nombre | Correo en una fila
```

**Móvil (< 640 px)**:
```
┌───────────────────────────┐
│▓ [▣] AgendaBot           ▓│  cabecera ~200 alto, padding 16
│▓ Tu agenda, atendida por ▓│  título 24 px
│▓ chat.                   ▓│
│▓ Para barberías, clínic… ▓│
└───────────────────────────┘
  Crea tu cuenta (24 px)
  Un minuto y tu negocio…
  Tu negocio
  Nombre            [      ]
  Tipo de negocio   [▣ Otro ⌄]      ← todo en una columna
  Tu acceso
  Tu nombre / Correo / Contraseña   ← uno debajo de otro
  (█████ Crear cuenta → █████)
```
En móvil, Iniciar sesión: misma cabecera; debajo, “Crear mi negocio” alineado a la derecha y el formulario en una columna.

## Descripción exacta

**Marco (`AuthShell`)**
- Escritorio (≥ 1024 px): dos columnas `grid-cols-[minmax(0,11fr)_minmax(0,9fr)]`, alto de pantalla completo (`h-dvh`), sin scroll de página; el formulario hace scroll propio si no cabe.
- **Panel izquierdo**: fondo `auth-booking-hero-v2.png` con `background-size: cover; background-position: center`, sobre color de reserva `--accent-700`. Encima, una capa con degradado horizontal `linear-gradient(90deg, rgba(2,28,23,.94), rgba(3,54,43,.72) 55%, rgba(2,28,23,.25))` (oscuro a la izquierda para que se lea el texto, transparente a la derecha para ver a la persona). Además un círculo difuminado decorativo color `--accent-500`, opacidad 40 %, `blur-3xl`, de 28 rem, asomando por la esquina inferior derecha.
  - Arriba: logo = cuadro redondeado 36 px con fondo blanco 15 % e icono `CalendarCheck` (lucide), y el texto **AgendaBot** (Plus Jakarta Sans, semibold, 18 px).
  - Centro: título **“Tu agenda, atendida por chat.”** (Plus Jakarta Sans semibold, 36 px en escritorio, 30 px tablet, 24 px móvil, interlineado 1,1) y debajo **“Para barberías, clínicas, spas, talleres y cualquier negocio que trabaje con citas.”** (blanco 80 %, 16 px, máx. 28 rem).
  - Abajo (solo escritorio), separado por una línea blanca 20 %: tres pasos con icono en círculo blanco 15 % de 32 px: **Crea tu cuenta** — “Tu negocio queda activo al momento.” (`UserPlus`) · **Configura** — “Servicios, horario y cómo responde el asistente.” (`Settings2`) · **Abre el chat** — “Tus clientes reservan solos, a cualquier hora.” (`MessageCircle`).
  - Relleno 40 px (48 px en ≥ 1280).
- Tablet y móvil: el panel pasa a ser una **cabecera** encima del formulario con la misma imagen y degradado, logo, título y texto; sin los tres pasos.
- **Columna derecha**: fondo `stone-50` (oscuro: `slate-950`), contenido centrado, ancho máximo 36 rem, márgenes 16 px móvil / 32 px tablet / 48–64 px escritorio.

**Crear cuenta (`SignupPage`)**
- Título **“Crea tu cuenta”** (Plus Jakarta Sans, semibold, 24 px en móvil y 30 px desde 640 px) y **“Un minuto y tu negocio queda listo para configurar.”** (14 px, `slate-600`).
- Bloque **Tu negocio**: en una fila (≥ 640 px, columnas 1,25 : 0,75) **Nombre** (placeholder “Barbería Central”, autofoco) y **Tipo de negocio**: botón desplegable de 40 px con icono del tipo en cuadrito `--accent-50`/`--accent-700`, nombre del tipo y flecha; al abrir, lista con los 17 tipos (icono + nombre), máx. 14 rem de alto con scroll; `otro` por defecto.
- Bloque **Tu acceso**: en una fila (≥ 640 px) **Tu nombre** y **Correo electrónico** (“tu@negocio.com”); debajo **Contraseña** con botón ojo para mostrar/ocultar y ayuda “Mínimo 8 caracteres.” (en ámbar “Faltan N caracteres.” mientras sea corta).
- Error del servidor en recuadro `red-50` / texto `red-700`.
- Botón ancho completo **“Crear cuenta →”** (color `--accent-600`, hover `--accent-700`, alto 40 px, radio 8 px); al enviar: spinner + “Creando tu negocio…”.
- Debajo: “¿Ya tienes una cuenta? **Iniciar sesión**” (enlace subrayado `--accent-700` a `/iniciar-sesion`).
- Campos de 40 px de alto, borde `slate-200`, radio 8 px, foco con anillo `--accent-500`.

**Iniciar sesión (`LoginStartPage`)**
- Arriba a la derecha: enlace **“Crear mi negocio”** (subrayado, `--accent-700`).
- Icono `LockKeyhole` en cuadro 44 px `--accent-50`/`--accent-700`; título **“Bienvenido de nuevo”** (30 px); “Inicia sesión para gestionar tus citas, servicios y configuración.”
- **Correo electrónico** con icono de sobre dentro del campo (`Mail`) y **Contraseña** con botón ojo; campos de 44 px.
- Botón ancho completo **“Iniciar sesión →”** (alto 44 px, radio 12 px; “Iniciando sesión…” al enviar). Debajo: “¿Aún no tienes cuenta? **Crea tu negocio**”.

## La imagen del panel

Genérala con la skill **`agendabot-imagenes`** y guárdala en `frontend/public/images/auth-booking-hero-v2.png` (1672 × 941). Si tu agente no puede generar imágenes, el panel se ve bien con su color `--accent-700` y el degradado: avisa al usuario de que falta.

## Sistema de diseño que usan estas pantallas

**Fuentes** (en `index.html`, `<html lang="es">`, título “AgendaBot AI — Asistente de citas”, con `preconnect` a `fonts.googleapis.com` y `fonts.gstatic.com`):
`https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap`
- Texto: **DM Sans** (`--font-sans`), con `font-feature-settings: "cv02","cv03","cv04","cv11"`.
- Títulos y la clase `font-display`: **Plus Jakarta Sans** (`--font-display`), `text-wrap: balance`.
- Datos y código: **JetBrains Mono** (`--font-mono`).
- `<body class="bg-stone-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased">`.

**`index.css`** (Tailwind 4): `@import "tailwindcss";` · `@custom-variant dark (&:where(.dark, .dark *));` · en `@layer base`:
- `:root` y `[data-accent="emerald"]`: `--accent-50 #ecfdf5`, `--accent-100 #d1fae5`, `--accent-500 #10b981`, `--accent-600 #059669`, `--accent-700 #047857`, `--accent-fg #ffffff`.
- `[data-accent="blue"]` `#eff6ff #dbeafe #3b82f6 #2563eb #1d4ed8` · `[data-accent="amber"]` `#fffbeb #fef3c7 #f59e0b #d97706 #b45309` · `[data-accent="rose"]` `#fff1f2 #ffe4e6 #f43f5e #e11d48 #be123c` · `[data-accent="slate"]` `#f8fafc #f1f5f9 #475569 #1e293b #0f172a` (siempre `--accent-fg #ffffff`).
- `::selection { background: var(--accent-100); color: var(--accent-700); }` · `input, textarea { caret-color: var(--accent-600); }`.
- `@media (prefers-reduced-motion: reduce)`: animaciones y transiciones a 0,01 ms.

**Componentes base** (`components/ui`, con `cn()` = `twMerge(clsx(...))`):
- **Label**: `block font-medium text-slate-700 dark:text-slate-300`, `text-sm` (o `text-xs`).
- **Input**: `flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500`.
- **Button**: base `inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-500)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer`. Variante principal `bg-[var(--accent-600)] text-[var(--accent-fg)] hover:bg-[var(--accent-700)] shadow-xs`. Tamaños: `md` = `h-10 px-4 text-sm rounded-lg` (por defecto), `lg` = `h-11 px-5 text-sm rounded-xl`, `sm` = `h-9 px-3 text-xs rounded-lg`, `icon` = `h-10 w-10 rounded-lg`. Otras variantes: `secondary` (slate‑900), `outline` (borde slate‑200, fondo blanco), `ghost`, `danger` (red‑600).
- **PasswordInput**: un Input con `pr-11` y, a la derecha dentro del campo, un botón de 40 px de ancho con el icono `Eye`/`EyeOff` (16 px, `slate-500`, hover `slate-800`), `aria-label` “Mostrar contraseña”/“Ocultar contraseña” y `aria-pressed`.
- **FormError**: `<p role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">`.

**Secciones del formulario de registro**: `<fieldset class="space-y-3">` con `<legend class="mb-2 font-display text-sm font-semibold text-slate-900">` (“Tu negocio”, “Tu acceso”). El formulario: `mt-6 space-y-5` (`lg:mt-5 lg:space-y-4`). Campos con `mt-1.5` bajo su etiqueta.

**Desplegable “Tipo de negocio”**: botón `mt-1.5 flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 hover:border-[var(--accent-500)]` con `aria-haspopup="listbox"` y `aria-expanded`; dentro, cuadro `h-6 w-6 rounded-md bg-[var(--accent-50)] text-[var(--accent-700)]` con el icono del tipo (14 px), el nombre (truncado) y `ChevronDown` (16 px, `slate-400`, gira 180° abierto). Lista: `role="listbox"`, `absolute right-0 z-20 mt-2 max-h-56 w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl`; cada opción `role="option"` `aria-selected`, `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm` (activa: `bg-[var(--accent-50)] font-semibold text-[var(--accent-700)]`; resto: `text-slate-600 hover:bg-slate-100`) con icono de 16 px y nombre. Al elegir se cierra.

**Tipos de negocio** (valor → etiqueta → icono lucide): barberia → Barbería → Scissors · peluqueria → Peluquería → Scissors · estetica → Estética → Sparkles · unas → Uñas → Sparkles · spa → Spa → Sparkles · masajes → Masajes → Sparkles · clinica → Clínica → Stethoscope · dental → Dental → Stethoscope · fisioterapia → Fisioterapia → HeartPulse · psicologia → Psicología → HeartPulse · nutricion → Nutrición → HeartPulse · veterinaria → Veterinaria → Dog · gimnasio → Gimnasio → Dumbbell · tatuajes → Tatuajes → PenTool · taller → Taller → Car · asesoria → Asesoría → Briefcase · otro → Otro → CalendarCheck.

**Comportamiento**
- Registro: valida contraseña ≥ 8 antes de enviar; `POST /api/signup` con `{ name, businessType, owner: { fullName, email (sin espacios), password } }`; guarda el token en `sessionStorage['agendabot-admin-token:<slug>']` y navega a `/n/<slug>/admin/settings?tab=ia`. Errores con mensaje del servidor; sin respuesta: “No se pudo conectar: …”.
- Inicio de sesión: si falta correo o contraseña, “Introduce tu correo y contraseña.”; `POST /api/platform/auth/login`; guarda el token igual y va a `/n/<slug>/admin`; sin respuesta: “No se pudo conectar con el servidor.”.

## Criterios de aceptación

- [ ] A 1440, 768 y 375 px las dos pantallas siguen los esquemas de arriba, sin scroll horizontal, en claro y oscuro.
- [ ] Textos idénticos (incluidos signos y tildes), tamaños, colores y orden como se describen.
- [ ] Teclado: todo se alcanza con Tab, foco visible; el desplegable se abre con Enter/Espacio y tiene roles `listbox`/`option`.
- [ ] Registro y login funcionan contra la API y dejan la sesión abierta en el panel.
