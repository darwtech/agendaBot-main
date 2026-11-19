---
name: agendabot-imagenes
description: "Genera con cualquier IA de imágenes (GPT-image, Gemini, Grok, Midjourney, Stable Diffusion) la foto del panel de las pantallas de cuenta de AgendaBot: prompts, composición, paleta, tamaño y comprobaciones. Úsala cuando haya que crear o rehacer imágenes de AgendaBot."
---

# AgendaBot · Imágenes a generar

> La app usa **una sola imagen**: la foto del panel izquierdo de *Crear cuenta* e *Iniciar sesión*. No se entrega el archivo: **la generas tú** con la IA de imágenes que tengas (GPT‑image / DALL·E, Gemini Imagen, Grok Aurora, Midjourney, Stable Diffusion, Flux, Ideogram…) siguiendo esta especificación al pie de la letra.
> Los iconos **no** son imágenes: salen de `lucide-react`. El logo tampoco: es el icono `CalendarCheck` en un cuadro (ver skill `agendabot-pantallas-cuenta`).

## Imagen 1 · `auth-booking-hero-v2.png`

| Dato | Valor |
|---|---|
| Ruta final | `frontend/public/images/auth-booking-hero-v2.png` (se usa como `url('/images/auth-booking-hero-v2.png')`) |
| Tamaño final | **1672 × 941 px** (≈ 16:9), PNG, RGB, sin transparencia; idealmente < 700 KB (si pesa más, comprímela sin cambiar tamaño) |
| Uso | fondo `cover` + `center` del panel; encima va un degradado verde casi negro a la izquierda y casi transparente a la derecha, y el texto blanco a la izquierda |
| Estilo | fotografía realista, cinematográfica, nocturna; nada de ilustración, 3D de juguete ni dibujos |

### Composición (obligatoria)

```
 0%                 33%                     60%                      100%
 ┌──────────────────┬──────────────────────┬────────────────────────┐
 │ ZONA OSCURA      │ hologramas flotando: │ MUJER (dueña) de pie,  │
 │ casi negra       │ calendario con check │ cuerpo de cintura para │
 │ (#05-#15 RGB),   │ arriba, burbujas de  │ arriba, girada 3/4     │
 │ poco detalle,    │ chat debajo, líneas  │ hacia la izquierda,    │
 │ ventanal y       │ finas brillantes que │ mirando y escribiendo  │
 │ plantas apenas   │ conectan con el      │ en su móvil, sonriente │
 │ visibles.        │ móvil                │ tarjeta de contactos   │
 │ Aquí va el texto │                      │ holográfica a su lado  │
 │ de la app.       │ sillones de salón en │ derecho, espejo        │
 │                  │ fila al fondo        │ redondo con aro de luz │
 └──────────────────┴──────────────────────┴────────────────────────┘
```

- **Tercio izquierdo**: oscuro y sin elementos importantes (ahí se escribe “Tu agenda, atendida por chat.”). Promedio de color ≈ `#091018`.
- **Persona**: ocupa del 55 % al 95 % del ancho; cabeza en el 10–35 % de la altura; se corta a la altura de la cadera. Promedio del tercio derecho ≈ `#443f35`.
- **Hologramas** entre el 33 % y el 60 %, a la altura del pecho y la cara.

### Paleta

Negro azulado `#050f17` · `#010b15` · gris carbón `#111414` · `#15242b` · gris cálido `#474546` · marrón madera `#302b26` · piel/luz cálida `#957f69` · verde esmeralda del blazer `#0b4a3a`–`#0f5c47` · brillo de hologramas verde menta `#34d399`–`#6ee7b7` · luces ámbar `#f5b041`. Dominan los tonos oscuros; el verde y el ámbar son acentos.

### Prompt principal (español)

> Fotografía realista y cinematográfica, formato horizontal 16:9, de noche. Interior de un salón de belleza y barbería moderno y elegante: fila de sillones de peluquería negros de cuero, espejos redondos con aro de luz LED cálida, estanterías iluminadas con productos de peluquería, plantas colgantes, suelo de cemento pulido con reflejos y grandes ventanales al fondo con luces de ciudad y cielo azul y naranja del atardecer. En el lado derecho del encuadre, de cintura para arriba y girada tres cuartos hacia la izquierda, una mujer latina de unos 35 años, dueña del negocio, cabello castaño oscuro recogido en un moño con mechones sueltos, aretes de aro dorados, blazer verde esmeralda oscuro sobre blusa negra, collar fino de oro y reloj dorado, sonríe mientras escribe en un smartphone negro que sostiene con las dos manos. Entre ella y el centro de la imagen flotan interfaces translúcidas tipo holograma de vidrio esmerilado con brillo verde menta: arriba un calendario mensual con un día resaltado en verde y un círculo con un check, debajo dos burbujas de chat con tres puntos, y junto a su hombro derecho una tarjeta con una lista de tres contactos con avatar; todas unidas por líneas finas luminosas que salen del teléfono. El tercio izquierdo de la imagen es muy oscuro, casi negro, con poco detalle, para poner texto encima. Paleta: negros azulados, verdes esmeralda y acentos cálidos ámbar. Profundidad de campo baja, fondo desenfocado, luz suave lateral cálida en su rostro, alta definición, 8K, sin texto, sin letras, sin logotipos, sin marcas de agua.

### Prompt principal (inglés — la mayoría de modelos lo siguen mejor)

> Photorealistic cinematic photograph, wide 16:9, night time. Interior of an upscale modern beauty salon and barbershop: a row of black leather salon chairs, round mirrors with warm LED ring lights, illuminated shelves with hair products, hanging plants, polished concrete floor with reflections, large windows in the background with city lights and a blue-orange dusk sky. On the right side of the frame, waist-up and turned three-quarters to the left, a Latina woman in her mid-30s, the salon owner, dark brown hair in a loose bun, gold hoop earrings, dark emerald-green blazer over a black top, thin gold necklace and gold watch, smiling while typing on a black smartphone held with both hands. Floating between her and the center, translucent frosted-glass holographic UI panels glowing mint green: a monthly calendar with one day highlighted in green and a check-mark circle, below it two chat bubbles with ellipsis dots, and next to her right shoulder a card listing three contacts with avatars, all connected by thin glowing lines coming from the phone. The left third of the image is very dark, nearly black, with little detail (negative space for text). Palette: bluish blacks, emerald greens, warm amber accents. Shallow depth of field, blurred background, soft warm side light on her face, high detail. No text, no letters, no logos, no watermark.

**Prompt negativo** (si la herramienta lo admite): `text, letters, words, logo, watermark, signature, cartoon, illustration, 3d render, anime, extra fingers, deformed hands, distorted face, two phones, bright left side, cluttered left side, overexposed, low resolution`.

### Ajustes por herramienta

| Herramienta | Cómo pedirla |
|---|---|
| **GPT‑image / DALL·E (ChatGPT, Codex con imágenes)** | Prompt en inglés, tamaño `1536x1024` o el apaisado más grande disponible, calidad alta. Después recorta/escala a 1672 × 941. |
| **Gemini (Imagen)** | Prompt en inglés, relación de aspecto `16:9`. Escala a 1672 × 941. |
| **Grok (Aurora)** | Prompt en inglés añadiendo al inicio “Landscape 16:9 photo:”. Escala a 1672 × 941. |
| **Midjourney** | Prompt en inglés + `--ar 16:9 --style raw --v 6 --q 2 --no text, logo, watermark` |
| **Stable Diffusion / Flux** | 1672 × 944 (múltiplo de 8) o 1344 × 768 y escalado ×1,25; CFG 5–7, 30–40 pasos, prompt negativo de arriba. Recorta a 1672 × 941. |
| **Sin generador de imágenes** | No inventes otra imagen ni uses una de stock con marca: deja el archivo sin crear. El panel se ve correcto igualmente (color `--accent-700` + degradado). Avisa al usuario de que falta generarla con este prompt. |

### Comprobación antes de darla por buena

- [ ] 1672 × 941 px, guardada en `frontend/public/images/auth-booking-hero-v2.png`.
- [ ] El tercio izquierdo es oscuro: con el degradado encima, el título blanco se lee perfectamente.
- [ ] La persona queda a la derecha y su cara no la tapa el formulario en escritorio (el panel ocupa el 55 % izquierdo de la pantalla, la imagen se recorta con `cover`).
- [ ] Manos y cara sin deformaciones; un solo teléfono; sin texto ni logos.
- [ ] En móvil (cabecera de ~200 px de alto) se sigue viendo el ambiente verde oscuro y parte de la persona.
