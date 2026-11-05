# Bitácora — La Boutique Cat & Dog

Registro cronológico del proyecto. Convenciones:
- **[prod]** = está en GitHub Pages (repo `laboutiquecatydog/laboutiquecatydog.github.io`, rama `main`).
- **[local]** = terminado pero esperando el push final (W5).
- **[worker]** = desplegado en Cloudflare (`sveltia-cms-auth.laboutiquecatydog10.workers.dev`).
- Cada etapa termina con backup en `_backup/pre-<etapa>-<fecha>/` y verificación automática headless (navegador Edge + protocolo CDP, con GitHub simulado) además de la prueba real del usuario.

---

## 2026-10-21 · Base publicada

- Sitio landing vanilla (HTML/CSS/JS, sin build) en GitHub Pages.
- **G1** [prod]: contenido migrado a `data/sitio.json` + `data/pagina.json`, render con `js/render.js` (verificado A/B contra el HTML original).
- **G2** [prod]: panel Sveltia en `/admin/` (config.yml, login OAuth vía Worker de Cloudflare).
- Guardado de Sveltia verificado end-to-end (commit de prueba `6f12746`); campos ocultos de imágenes preservados.

## 2026-10-22 · Robustez del panel + rediseño estético

- Fix **[prod]** (`09e7734`): Sveltia exigía los campos de texto → todos los `string/text` pasaron a `required: false, default: ''`. Validado con js-yaml y confirmado en producción.
- Definición de links: web pública = `https://laboutiquecatydog.github.io/`, panel = `/admin/`.
- **G3 — rediseño estético** [local] (backup `pre-estetica-2026-10-22_00-52-01`):
  - `setupIntro()` typewriter del título del hero con watchdog de 6 s y flag `halted` (nunca deja botones ocultos); `**negritas**` → spans de acento.
  - Reveal escalonado (`--reveal-delay`), barra de progreso de scroll, `prefers-reduced-motion`.
  - `updateSEO()` dinámico desde `sitio.json` (title, description, OG, JSON-LD `PetStore`) con fallback estático.
  - Sección productos rediseñada: grid `auto-fill minmax(280px,1fr)`, `.product-price`, badge de marca, CTA rojo, fotos `object-fit: cover`.
  - Verificación headless: 0 errores desktop + mobile, typewriter OK, reveal 19/19, 18/18 imágenes, geometría OK (3 por fila, 476 px, sin overlap).

## 2026-10-23 · W1 — Editor visual: fundación

Decisiones con el usuario: cobertura total (secciones + textos + imágenes + `sitio.json`), Sveltia queda como "modo avanzado", el Worker puede extenderse (solo login).

- **Worker extendido** [worker] (`tools/worker-editor.js`): flujo Sveltia intacto; modo `client=editor` agrega cookie `cms-back` y redirige la misma pestaña al editor con `#access_token=…`. Validación de dominio con las mismas reglas (`ALLOWED_DOMAINS`). Desplegado por el usuario en Cloudflare.
- **Fix de configuración**: `ALLOWED_DOMAINS` quedó `laboutiquecatydog.github.io, localhost` — **sin** asterisco (el patrón matchea hostname sin puerto; `localhost*` no matcheaba → pantalla en blanco al loguear en local). El worker local ahora muestra el error visible en vez de página blanca.
- **W1** [local] (backup `pre-editorW1-2026-10-23_00-56-52`):
  - `admin/editor.html` + `editor.css` + `editor.js`: login GitHub (token en `sessionStorage`), lista de secciones (drag & drop, ↑↓, ocultar, duplicar, eliminar, agregar por plantilla), vista previa iframe, publicación = commit por API (`Editor visual: actualizar secciones de la portada`), borrador automático en `localStorage`, descartar, manejo básico de conflictos (409/422).
  - Verificado: `node --check`, smoke headless y login real del usuario (el panel carga con sesión).
- Lanzadores locales: `preview.cmd` (sitio) y **`Abrir panel (local).cmd`** (levanta servidor + abre el panel).

## 2026-10-24 · W2 — Textos y datos del local

- `admin/editor-form.js` (nuevo): constructor de formularios guiado por reglas por campo (etiquetas en español, textareas, selects, checks, viñetas 1-por-línea, orden de redes). Solo actualiza claves existentes: el JSON conserva su forma exacta.
- Pestaña **«Datos del local»** habilitada: formulario completo de `data/sitio.json` (negocio, redes, menú, pie).
- Panel derecho con toggle **«Vista previa ⟷ Textos»**; publicación de 1–2 commits según qué cambió (mensajes distintos por archivo); borrador separado por archivo.
- Verificación headless (GitHub simulado): formulario con 14 campos + 2 grupos + carrusel; edición marca cambios; publicación doble con SHA y mensaje correctos; 0 errores.

## 2026-10-24 · W2.5 — Edición directa en la vista previa

Feedback del usuario: el clic en la lista no debe saltar a textos; editar lo más posible dentro de la vista previa.

- `admin/editor-inline.js` (nuevo): marca los textos editables del sitio renderizado y permite escribir sobre ellos (contenteditable `plaintext-only`); Enter confirma, Escape revierte; los enlaces no navegan dentro de la miniatura; el título del hero reconstruye `**negritas**` desde los `<span class="accent">`.
- `js/main.js`: gancho `BQPreview.renderizar/reiniciar` (re-render con los datos del editor + re-init de carruseles/reveal/filtros; sin typewriter en preview). Inocuo en producción.
- `js/render.js`: las secciones con `oculto: true` **dejan de renderizarse** (el botón del ojo ahora es real).
- El clic en la lista pasa a **seleccionar** (resalta en lista y en vista); el formulario queda como modo alternativo sincronizado.
- Bugfix del día: al quitar `contenteditable` el `focusout` re-entraba en `finalizar(true)` y pisaba la reversión de Escape → el estado se baja antes de tocar el DOM.
- Verificación headless: clic en lista no salta de modo; edición in situ actualiza modelo + chip; re-render refleja el cambio; edición del pie (sitio.json) en vivo; Escape revierte; 0 errores.

## 2026-10-24 · W3 — Imágenes

- `admin/editor-media.js` (nuevo) — **BQMedia**:
  - **Galería**: listado de `assets/img/` por API (funciona con repo privado; miniaturas por `Accept: raw`); detecta variantes `-900` para armar srcset.
  - **Subida**: archivo de la PC → canvas → JPEG 82 % máx. 1600 px (+ variante `-900` cuando el campo la usa; logo mantiene PNG máx. 600 px) → **un commit por imagen** vía Git Data API (blobs → tree → commit → ref).
- Imágenes editables por **dos caminos**: clic sobre la foto en la vista previa, o miniatura + «Cambiar…» en el formulario.
- Listas editables (fotos del carrusel, tarjetas, productos, fotos de producto): **↑ ↓ ✕** y **«+ Agregar …»** que exige elegir imagen primero (nada queda sin foto).
- Verificación headless con inyección de archivo real por CDP: 2000×1200 → 1600×960 + `-900`; secuencia git completa en un commit; 0 errores.

## 2026-10-24 · W4a — Catálogo ordenado y más control

Feedback del usuario: cómo quitar productos, y organizar el catálogo si crece.

- **Paginación del catálogo** [local, sitio público]: `js/render.js` agrega el contenedor y `js/main.js` pagina en **bloques de 6** con flechas ‹ ›, números (ventana de 7 con «…»), «Página X de Y» con `aria-live`; los **filtros repaginan** el resultado y vuelven a la página 1; con ≤6 no se muestra nada; degradable sin JS. Estilos en `css/styles.css` (`.product-pagination`).
- **Quitar productos** con tres caminos: insignia **✕** al pasar el mouse sobre el producto en la vista previa (con confirmación), botón **«Quitar este producto»** en el formulario, y ✕ de siempre.
- Verificación headless: 5 productos sin paginación → 7 = «Página 1 de 2» → página 2 muestra 1 → filtro «Gatos» repagina y oculta controles (1 página) → quitar producto vuelve a ajustar solo; 0 errores.

---

## 2026-10-24 · W4b — Deshacer/rehacer y conflictos

- **Historial de deshacer/rehacer**: instantáneas del modelo completo (`pagina.json` + `sitio.json`, separador `\u0000`), máximo 60, captura con *debounce* de 600 ms para que una ráfaga de teclas no llene el historial de micro-estados. Se accede con **`Ctrl+Z` / `Ctrl+Y`** (o `Ctrl+Shift+Z`) y con los botones **Deshacer/Rehacer** del topbar (con estado deshabilitado correcto). Mientras se escribe en un campo, el undo nativo del navegador no se intercepta (sus eventos `input` re-sincronizan el modelo).
- **Chip honesto**: `compararConPublicado()` recalcula los flags de borrador contra una instantánea base capturada al cargar y al publicar — si deshacer vuelve exactamente al estado publicado, el chip se apaga y el borrador local se limpia solo.
- **Conflictos pre-vuelo**: antes de publicar se compara el SHA remoto de cada archivo sucio con el local; si GitHub cambió mientras editabas (otra pestaña, Sveltia, commit directo) aparece un modal claro: «Aceptar» descarta y recarga, «Cancelar» conserva el borrador intacto. Nunca se pisa a ciegas (fallback por 409/422 conservado).
- **Bugfix importante (edición inline)**: `doc.body.click()` programático no mueve el foco → la edición quedaba "abierta"; al deshacer, el re-render arrancaba el `contenteditable` del DOM y un `focusout` tardío re-escribía el valor viejo sobre el modelo restaurado. Triple fix: `BQInline.cancelar()` (cierra sin escribir) llamado antes de restaurar/re-renderizar; guarda `isConnected` en `finalizar` (DOM desactualizado no escribe nada); y los re-renders programados cancelan la edición abierta primero.
- Documentación: README actualizado (panel visual, estructura, login, ALLOWED_DOMAINS sin asterisco, paginación, etapas W1–W4) y esta bitácora creada.
- Verificación headless: trayectoria del historial (editar → deshacer estable → rehacer), atajo `Ctrl+Z`, conflicto simulado cambiando el SHA remoto (modal + cancelar conserva + aceptar recarga limpia); 0 errores.

---

## 2026-10-24 · W4c — Flechas tipo Word + recuperación de lo publicado

Feedback del usuario: "si el cliente hace algo mal, tiene que poder volver atrás, como las flechas de Word". Dos capas nuevas sobre el deshacer de W4b:

- **Flechas tipo Word**: los botones Deshacer/Rehacer pasaron a ser íconos de flecha curva (↶ ↷) con tooltip del atajo. Además el atajo `Ctrl+Z`/`Ctrl+Y` ahora **también funciona mientras el foco está en la vista previa** (los eventos keydown del iframe se reenvían al editor; si el foco está en un texto editable de la vista, manda el deshacer nativo).
- **Historial de versiones** (ícono de reloj ⋾): la red de seguridad para errores **ya publicados**, que el deshacer de sesión no cubre. Lista las últimas 10 versiones publicadas de cada archivo (via `/commits?path=…`) con fecha legible y mensaje de commit; «Restaurar» trae el contenido de esa versión (`contents?ref=<sha>`) y lo carga **como borrador**: se revisa en la vista previa, no se publica nada solo, y la restauración misma entra al historial de deshacer (Ctrl+Z la revierte). Cero riesgo de perder nada: siempre hay que confirmar con «Publicar cambios».
- Sistema de seguridad resultante, en capas: 1) Deshacer/Rehacer (sesión), 2) Descartar (vuelve a lo publicado), 3) Historial de versiones (recupera incluso lo ya publicado), 4) respaldo final: el historial completo de commits de GitHub.
- Verificación headless: íconos presentes y funcionales; deshacer por botón-ícono; rehacer; editar de nuevo + `Ctrl+Z` con foco en el iframe revierte; modal de versiones con 2 grupos y 3 filas; restaurar la versión vieja del antetítulo → borador "VERSION-VIEJA" **visible en la vista previa**; deshacer la restauración vuelve al estado previo; 0 errores.

---

## 2026-10-24 · W5a/b/c — SEO técnico, editor único y copias de seguridad

Decisiones del cliente: videos de Instagram **descartados**; Search Console **para después del push**; WhatsApp como único teléfono (NAP). Objetivo de la vuelta: SEO/meta impecables para indexación, **un solo editor** con todo integrado, copias de seguridad del contenido, auditoría, docs. Todo en local.

### W5a — SEO/GEO técnico
- **`robots.txt`** (nuevo): permite la web, excluye `/admin/`, `/graphify-out/`, `/_backup/` y `*.cmd`; declara el sitemap.
- **`sitemap.xml`** (nuevo): URL única con lastmod — lo que se envía en Search Console.
- **Bloque `seo` editable** en `data/sitio.json` (título/descripción) → `updateSEO()` lo aplica en vivo con *fallback* local; el panel lo muestra con pistas de longitud (≤60 / ≤155).
- **JSON-LD mejorado**: URLs absolutas, `url`, `logo`, `image` (og-image), `priceRange: "$"`, `@id`, y **horarios parseados de `negocio.hours`** (antes fijos "10:00-13:00" aunque el cliente cambiara los horarios).
- **`assets/img/og-image.jpg`** (nuevo): 1200×630 recortada de slide-1 para previews de WhatsApp/redes; metas OG/Twitter apuntando a ella.
- Textos con intención local: portada, contacto y pie mencionan Salta.
- `.gitignore`: `graphify-out/`.

### W5b — Editor único (Sveltia retirado)
- **Campos avanzados integrados**: `srcset`/`sizes`/`ancho`/`alto`/`prioridad`/`imagenAncho`/`imagenAlto` dejan de estar ocultos y aparecen en cajas plegables «Campos avanzados» por item (el editor los completa solo al subir fotos, pero ya nada queda fuera del panel).
- `id`/ancla pasa a **editable con advertencia**; `huella` con opción **«ninguna»** y etiqueta corregida (es el lado del camino decorativo, no del texto).
- `/admin/` → `admin/index.html` es un redirect al editor; **`config.yml` eliminado**; fuera el link «Modo avanzado» del topbar.

### W5c — Copias de seguridad + robustez
- **Copias de seguridad** (ícono de copias): lista de copias locales en el navegador (máx. 15) con fecha y etiqueta; **auto-copia «Antes de publicar»** en cada publicación; copias manuales; **descargar a archivo JSON**; **subir desde archivo**; restaurar carga **como borrador** (deshacible, no publica). Red de seguridad completa en capas: deshacer → descartar → copias locales → versiones publicadas (Git) → historial del repo.
- **Auditoría y correcciones**: reordenar/ocultar/duplicar/eliminar/agregar ahora refrescan **la vista previa en vivo** (antes solo marcaban borrador); `irASeccion` alinea índices con secciones ocultas; `BQMedia.abrir()` resetea el estado de una apertura anterior.
- **Paw-trail dinámico (G4 cerrado)**: los tramos salen del orden real + campo `huella` (con «ninguna» y auto-intercalado); `main.js` pasa `pagina` a `renderPawTrails`; `BQPreview.renderizar` redibuja las huellas en la vista del editor (antes quedaban borradas tras el primer re-render); tabla clásica como *fallback*.
- **Bugfix crítico** encontrado por el E2E: `updateSEO` usaba `set()` (helper de render.js inexistente en main.js) → ReferenceError que rompía el arranque del sitio. Corregido a `isConfigured()`.

**Verificación E2E (0 errores):** sitio con SEO dinámico completo (title desde el bloque seo, JSON-LD con url/@id/priceRange/logo absolutos/horarios, og-image, huellas) · editor sin Sveltia · 3 cajas de avanzados con 5 campos c/u + id editable + huella con «ninguna» · grupo SEO con pistas · copia manual + auto-copia «Antes de publicar» al publicar · huellas redibujadas tras reordenar. `robots.txt`, `sitemap.xml`, `og-image.jpg` y el redirect de `/admin/` servidos por el servidor local.

---

## 2026-10-24 · Auditoría de seguridad completa

Objetivo: verificar que el sitio, el panel y el login sean seguros para el cliente, **probando vulnerabilidades reales**, y dejar todo listo para la presentación.

### Pruebas ejecutadas (navegador real por CDP + curl)
- **Batería XSS**: payloads `<img onerror>`, `<script>`, `<svg onload>`, `javascript:` en **todos los campos editables** de `pagina.json` y `sitio.json` (títulos, botones, precios, menú, redes, contacto…), renderizados por el propio motor del sitio vía `BQPreview`. Resultado: **0 ejecuciones**, 0 elementos maliciosos, 0 scripts inyectados, textos renderizados como texto inerte.
- **Path traversal** contra `tools/serve.js`: 10 variantes (`../`, `%2e%2e`, `..%5c` para Windows, doble codificación, rutas absolutas) con `curl --path-as-is`. Resultado: **todas 403**. (Hallazgo de metodología: los "200" iniciales eran normalización del cliente HTTP, no del servidor.)
- **CSP activa y verificada**: scripts inline dinámicos → bloqueados; scripts externos (`data:`) → bloqueados; sitio 100 % funcional (clase `js` por hash correcto, JSON-LD vivo, 0 violaciones en consola).
- **Higiene del token**: URL limpia post-login, token solo en `sessionStorage` (no en localStorage), y todas las peticiones con `Authorization` van **exclusivamente** a `api.github.com`.
- **Escaneos**: secretos hardcodeados (0), contenido mixto (0), `innerHTML` del panel revisado (solo constantes o contenido escapado), `rel="noopener"` en `_blank` ✓, subida de imágenes re-codificada por canvas ✓.

### Hallazgos corregidos
1. **Enlaces editables aceptaban `javascript:`** (botones del hero, tarjetas, menú/nav, redes) → sanitizador **`hrefSeguro()`** en `render.js`: solo `#`, rutas internas, `https:`, `mailto:`, `tel:`; el resto se neutraliza en `#`.
2. **Página de error del Worker** interpolaba el `site_id` sin escapar (inyección HTML teórica) → `escapeHtml()` en `tools/worker-editor.js`. El Worker desplegado hoy no refleja el dato (verificado con curl), así que es refuerzo pendiente de re-deploy (documentado en el informe).
3. **Servidor local sin `nosniff`** → cabecera `X-Content-Type-Options` agregada.

### Entregables
- **`guias/INFORME-SEGURIDAD.md`**: informe presentable (resumen ejecutivo para el cliente, qué se probó, hallazgos corregidos, recomendaciones — 2FA en GitHub — y checklist previo a publicación).
- README: nueva sección «Seguridad».
- Verificación final: sitio renderiza completo con CSP + sanitizador (0 errores, 0 violaciones), editor funcional.

**Estado**: APROBADO para presentar. Siguiente paso con visto bueno del cliente: push a producción → re-deploy del Worker hardenado → Search Console + Google Business Profile.

---

## 2026-10-24 · Cierre — ayuda integrada, carga ágil y publicación en producción

Últimos ajustes pedidos por el desarrollador y **push a producción** con su instrucción explícita.

- **Ayuda integrada en el panel**: botón «?» en el topbar → modal con 6 guías cortas (editar textos, fotos, secciones y productos, publicar, recuperación ante errores, sesión). Cierra con clic afuera o la ✕ como el resto de los modales.
- **Carga ágil y revelado suave** (feedback: «lo último en cargar es el título, subtítulo e imagen»): la causa era que todo el contenido esperaba a que el título terminara de escribirse (~2,5–3 s). Ahora el bloque se revela **en paralelo** a la escritura (`enter()` a los 90 ms con la cascada escalonada existente) y el typewriter va más liviano (19 ms/carácter, arranque a 120 ms, pausa de segmento ×3). Medido: contenido visible a ~0,5 s, título completo a ~1,6 s (antes ~3 s). Verificado con headless + sin violaciones de CSP.
- **Auditoría visual de la portada**: carrusel del hero a 3:2 (~505×337 px en desktop), tamaño correcto; nota documentada: las fotos fuente son 2.17:1, así que se recortan los laterales al presentarlas en 3:2 — si alguna foto se viera apretada, la solución es subir una versión más cuadrada desde el panel.
- **Push a producción** con instrucción explícita del desarrollador. Sveltia queda retirado también en producción (`/admin/` redirige al editor visual; `config.yml` se borra del repo). Auditoría del paw-trail registrada (sin cambios) con tres opciones de mejora propuestas para decisión del cliente.
- Pendiente post-push: re-deploy del Worker en Cloudflare con `tools/worker-editor.js` hardenado (paso a paso en el informe de seguridad) y Search Console + Google Business Profile con visto bueno.
- Documentación: **`guias/PRESENTACION-CLIENTE.md`** (guía de la reunión de entrega: checklist, guion de demo de 15 min, argumentos de valor, preguntas difíciles y qué no prometer) y README actualizado (ayuda «?», tiempos de la intro).

---

## 2026-10-24 · Ronda de feedback: fixes del panel, huellas orgánicas y entrega

Ronda de correcciones sobre feedback real de uso + preparación de la entrega al cliente final.

### Correcciones de bugs del panel
- **La pantalla saltaba al tocar una foto en productos** (muy molesto: "toco una imagen y tengo que bajar de nuevo"): dos causas corregidas. (1) Tocar algo dentro de la vista **selecciona la sección sin hacer scroll** — `seleccionarSeccion(indice, hacerScroll)`: scroll solo al elegir desde la lista, nunca desde clics dentro de la propia vista. (2) El re-render de la vista **conserva la posición de scroll** (`scrollY` capturado y restaurado en `programarRerender`).
- **Imágenes recién subidas no se veían en el producto en la vista previa local** (salían vacías): el archivo vive en GitHub pero todavía no en el disco local. `BQMedia` deja una copia en memoria (`window.BQ_SUBIDAS[ruta] = dataURL`) y el editor la inyecta en la vista y en las miniaturas del formulario → el resultado se ve **al instante** (en la web pública aparece sola cuando Pages reconstruye, ~1 min).

### Huellas — Opción A (orgánico), elegida por el desarrollador
- Longitud de onda **por altura de sección** (una onda cada ~340 px, acotada 1,15–4,6): las secciones largas ondean más veces en vez de estirar la misma onda → dejó de verse genérico.
- **Pisadas dobles ocasionales** (~8 %, misma mascota, desplazadas y con inclinación propia): pausas del animal que suman vida.
- Tamaño con variación más marcada (0,8–1,25). Se conserva: semilla determinista, fade de extremos, lado por campo `huella`, móvil (solo primer y último tramo).
- *Nota de la corrida:* un typo `AMPLITUD_MAX` tumbaba el arranque del sitio (detectado por el E2E); corregido y re-verificado (desktop: 91 huellas con dobles; móvil: 37).

### Acceso discreto al panel
- **Tres clics seguidos en el logo** (ventana de 1,4 s) → abre `/admin/editor.html`. Inofensivo: no expone nada, el login con GitHub sigue siendo obligatorio, `/admin/` sigue excluido de buscadores. Desactivado cuando la página está embebida (vista previa del editor).

### Pase móvil verificado (390×844)
Sin overflow horizontal, hero a una columna, menú hamburguesa accesible, paginación oculta con catálogo corto, huellas en modo móvil. Sin regresiones.

### Entrega al cliente
- **`guias/ENTREGA-CLIENTE.md`**: qué necesita el cliente (nada instalado: navegador + sus cuentas GitHub/Cloudflare con 2FA), rol del pendrive (respaldo, no requisito), por qué NO instalarle Node/Git/GitHub Desktop, el flujo 100 % web, y checklist de la reunión de entrega.
- Push pendiente del lado del desarrollador (GitHub Desktop con la cuenta del cliente; el shell local tiene logueada la cuenta equivocada `nicolabarranco27-a11y`).

**Verificación E2E (0 errores):** scroll determinista con `scroll-behavior: auto` inyectado (tocar foto: 2937→2937 exacto; re-render: 2937→2937), triple-click navega al panel, subida visible al instante en la vista (src=data:), huellas presentes desktop/móvil, móvil sin overflow.

---

## 2026-10-24 · Retiro de las huellas + guía de entrega ampliada

Decisión del desarrollador tras verlo en vivo: **las huellas decorativas se quitan de la página** ("queda mejor sin eso").

- Remoción limpia, sin dejar huérfanos: `js/paw-trail.js` eliminado del repo (queda en el historial de git por si algún día vuelve), script tag fuera de `index.html`, llamadas a `renderPawTrails` fuera de `main.js` (boot y `BQPreview.renderizar`), bloque CSS `.paw-trails` fuera de `styles.css`.
- Campo **`huella` retirado de punta a punta**: eliminado de las 5 secciones de `data/pagina.json` y de las plantillas del editor; fuera de las `REGLAS` del formulario y agregado a `TECNICOS` (si un borrador viejo lo trae, no se muestra).
- Documentación sincronizada: README (sección del componente eliminada, estructura, funcionalidades), guía de presentación (fuera la mención de "huellitas") y **guía de entrega ampliada**: aclaración explícita de que `preview.cmd` y `Abrir panel (local).cmd` son herramientas del DESARROLLADOR — el cliente nunca levanta localhost, su panel vive en internet.

---

## 2026-11-03 · Auditoría de seguridad/UX + control de acceso al panel

### Auditoría completa y correcciones (commit `1006ac6`) [prod]

Revisión de seguridad, estabilidad y UX del sitio y del panel. 25 hallazgos; los relevantes corregidos y verificados con 31 pruebas E2E (sitio + panel, 0 errores de JavaScript) y 8 contra producción.

- **Seguridad**: la documentación interna (`README.md`, `BITACORA.md`, `guias/`, `tools/`, `preview.cmd`, `_config.yml`) **dejó de publicarse**. GitHub Pages corre Jekyll 3.10.0, que publicaba los `.md` como páginas; ahora están en el `exclude` de `_config.yml` y `robots.txt` los bloquea además. Se agregaron `404.html`, `privacidad.html` y `manifest.json`, y `robots.txt` con `Disallow` para `/admin/`.
- **UX del panel**: el re-render de la vista ya no patea el scroll al tocar una foto; Escape cierra modales y el foco vuelve al botón de origen; la vista previa de "Datos del local" lleva al pie (`#contacto`); los errores de red se muestran en español según el código HTTP (401/403/404/409/422/429/5xx) en lugar de texto técnico; el pie de la web se edita por clave `data-sitio` (el teléfono del local ahora es editable); los `input file` son alcanzables por teclado; los mensajes al guardar usan el sistema de avisos global (`window.BQToast`) sin duplicar listeners.
- **Sitio**: carrusel del hero con autoplay que respeta `prefers-reduced-motion`; `<noscript>` con H1, WhatsApp, dirección y horario; `preload` con `imagesizes` correctos; `width`/`height` en las 18 imágenes; `hrefSeguro` rechaza URLs `//`; límite de 8 MB y validación de tipo en la subida de imágenes; miniaturas livianas con `IntersectionObserver` y liberación de `objectURL`; imágenes re-codificadas con `sharp` (−760 KB) y 3 huérfanas borradas.
- **Verificado en producción**: `/README.md`, `/BITACORA.md`, `/guias/*`, `/tools/*` → **404**; `/`, `/admin/editor.html`, `/privacidad.html`, `/404.html`, `/manifest.json` → **200**.

### Control de acceso: quién puede publicar [prod]

- El repositorio es **público** (lo exige GitHub Pages): lo único que se protege es **quién publica**.
- El desarrollador pasó a ser **colaborador con escritura** (`push`, sin ser admin) del repo `laboutiquecatydog/laboutiquecatydog.github.io`. Antes el push salía con el token del cliente (403 con la cuenta del desarrollador) y ese token quedó guardado en el keyring de la máquina del desarrollador → **ya se quitó** (`gh auth logout`), el helper de git ahora usa la cuenta propia.
- La rama `main` quedó protegida: sin force-push y sin borrado de rama; los pushes directos siguen permitidos (no se pide PR para publicar desde el panel).
- Verificado que una cuenta **sin** permiso de escritura es rechazada por el panel con el mensaje "La cuenta @X no tiene permiso para editar este sitio", y que el token rechazado se borra de la sesión (4/4 pruebas propias).

### Worker de login: scope reducido [worker]

- El Worker desplegado seguía pidiendo `scope=repo,user`: al autorizar, GitHub mostraba al cliente **"acceso a todos sus repositorios (públicos y privados)"**. Como el repo del sitio es público, `public_repo` alcanza.
- **Re-despliegue por API de Cloudflare** (2026-11-03) con `tools/worker-editor.js`, conservando los bindings (`keep_bindings`: `plain_text` + `secret_text`): `ALLOWED_DOMAINS`, `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` siguen intactos. Rollback guardado: el archivo del commit `213f7de` (el que estaba desplegado).
- Verificado: el redirect a GitHub ahora pide `public_repo,user`; `/callback` canjea el código y devuelve 302 al panel; un dominio fuera de `ALLOWED_DOMAINS` se rechaza con 400 y mensaje en español.

### Decisión de fondo: la llave del login se queda en la cuenta del desarrollador

La **OAuth App** y el **Worker** son la "llave de la puerta" del panel, no el contenido: el token que obtiene el cliente es **de la cuenta del cliente**, que es la dueña del repo y la única que decide qué se publica. La llave se queda en la cuenta del desarrollador (decisión 2026-11-03) para que el cliente no tenga que administrar Cloudflare; el traspaso al cliente queda documentado en 3 pasos en `guias/ENTREGA-CLIENTE.md` (sección 0) por si algún día lo pide, y el **PAT de alcance fino** sigue siendo el plan B si el desarrollador dejara de dar mantenimiento.

> Corrección de la guía de entrega: los nombres de las variables del Worker son `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` y `ALLOWED_DOMAINS` (la guía decía `CLIENT_ID`, `CLIENT_SECRET`, `ORIGIN` y `ALLOWED_REPOS`, que no existen).

---

## 2026-11-05 · Huella legal del proyecto + respaldo del código fuente

Trabajo pedido por el desarrollador: **que la empresa quede como titular de los derechos** en los documentos legales del sitio (no el nombre comercial del negocio) y dejar preparada la compra del dominio propio.

### Decisión de fondo

La reserva de derechos la hace **Estalingrado Corp** (la empresa que desarrolla y mantiene el software), no el nombre "La Boutique Cat & Dog" (que es marca del cliente). En el pie de la web, la línea de copyright ahora dice *"Estalingrado Corp. Todos los derechos reservados."* y se agregó *"Desarrollo y operación: Estalingrado Corp"*. El negocio sigue apareciendo con su marca en todo el sitio: lo que se protege es el **software**, no la marca ajena.

### Archivos nuevos

- **`terminos.html`** (publicado): quién es el responsable (Estalingrado Corp opera el sitio y es titular del software; el negocio es el que vende), datos de inscripción a solicitud, naturaleza informativa del sitio (sin carrito ni pago online), precios orientativos, propiedad intelectual (marca y fotos del negocio / software de Estalingrado Corp con licencia de uso y prohibición de copiar, modificar o redistribuir sin autorización), consultas y reclamos, ley aplicable (Salta), cookies y aviso de cambios.
- **`LICENSE`** (raíz del repo, **excluido de la publicación** vía `_config.yml`): copyright de Estalingrado Corp, autoría a nombre de la empresa (sin nominación personal) con el derecho moral de paternidad de la Ley 11.872 (inalienable), licencia de uso no exclusiva e intransferible al negocio, prohibición de sublicenciar o revender.
- **`guias/CONTRATO-LICENCIA-USO.md`** (interno): modelo en blanco de 17 secciones + Anexos I/II + **bloque de firmas**. Objeto, límites de la licencia, titularidad y autoría, marca y contenidos del cliente, cuentas y dominio, entregables, soporte, precios, obligaciones, derechos de imagen, confidencialidad, portfolio, terminación (la licencia de uso sobrevive al fin de la relación), responsabilidad, ley aplicable y firmas.
- **`guias/AUTORIZACION-DOMINIO.md`** (interno): autorización para registrar y administrar el dominio, con **bloque de firma**; variante A (el cliente entrega su CUIT y lo registra como apoderado) y variante B (se registra a nombre del desarrollador con compromiso de transferencia sin cargo en 30 días); tabla de los datos que hay que pedirle al cliente; notas de ejecución de NIC.ar.

### Archivos modificados

- `privacidad.html`: el bloque "Quién es el responsable" ahora nombra a Estalingrado Corp como responsable del tratamiento y titular del software, con el negocio y su domicilio; se agrega la línea de datos de inscripción a solicitud.
- `js/render.js`: el pie suma los links **Aviso de privacidad · Términos y condiciones** y la línea "Desarrollo y operación: Estalingrado Corp".
- `data/sitio.json`: `footer.copyright` → "Estalingrado Corp. Todos los derechos reservados." (sigue editable desde el panel).
- `_config.yml`: `LICENSE` agregado al `exclude` (evidencia de titularidad visible en GitHub, pero no publicada).
- `guias/ENTREGA-CLIENTE.md`: sección 0 con el procedimiento real del dominio; sección 8 reescrita con el paso a paso de NIC.ar → Cloudflare → GitHub Pages → Worker; **sección 9 nueva** (documentos legales, pendientes que requieren al cliente y decisiones de la empresa).
- `README.md`: estructura, estado, sección de licencia y pendientes actualizados.

### Regla que se respetó

**Nada sensible en el repositorio público**: el repositorio es público (lo exige GitHub Pages) → los documentos firmados se completan **fuera de GitHub**; en el repo no hay CUIT, razón social, domicilio fiscal, honorarios ni datos del cliente. Por eso el contrato y la autorización son **modelos en blanco** con campos entre corchetes.

### Investigación del dominio (verificada en fuente oficial + WHOIS)

- Los `.ar` **solo se registran en NIC Argentina** (`nic.ar`): Cloudflare y GitHub no los venden; Cloudflare se usa después como zona DNS. Precios: `.com.ar` $8.500/año, `.ar` $25.500/año, `.net.ar` $8.500/año.
- **Libres** (WHOIS de NIC.ar): `laboutiquecatydog.com.ar` (recomendado), `laboutiquecatydog.ar`, `laboutiquecatydog.net.ar`, `boutiquecatydog.com.ar`, `la-boutique-cat-y-dog.com.ar`, `laboutiquecatydog.com` (este último, en un registrador internacional). `laboutique.com.ar` está ocupado.
- Requisitos: **CUIT + Clave Fiscal nivel 2** para el titular; **nivel 3** para operar en representación de otra persona. Transferencia: $8.500 y el destinatario tiene **4 días corridos** para aceptarla (debe haber entrado antes a Trámites a Distancia).
- **Estalingrado Corp todavía no puede ser titular**: sin inscripción en ARCA no tiene CUIT → pendiente de la empresa, no del sitio.
- El **WHOIS es público** (titular, DNS, fechas) y el nombre contiene una marca ajena → NIC.ar puede pedir comprobante de autorización: hay que pedirla **antes** de pagar.
- Los datos de Cloudflare (4 registros A de GitHub Pages, CNAME de `www`, SSL Full strict, 301 de `www` → naked, TXT `_github-pages-challenge-…`) y la necesidad de **agregar el dominio a `ALLOWED_DOMAINS` del Worker** quedaron documentados en la guía de entrega.

### Leyes: lo que no se pudo verificar

- **Ley 11.872** (derecho moral de paternidad del autor, inalianable; derechos económicos cedibles): el texto legal se redacta **sin citar artículos**, por si el número o el contenido cambiara.
- **Ley 27.266** (Libro de Reclamaciones Virtual): `argentina.gob.ar` devolvió 500 y las búsquedas no dieron resultado oficial → **no se pudo confirmar** el alcance. La frase del sitio ("el libro de reclamos virtual se entrega a quien lo solicite") queda **pendiente de validación con el contador** antes de darla por exacta.

### Respaldo del código fuente

Se crearon **dos repositorios privados de respaldo** en la cuenta del desarrollador: `laboutiquecatydog-mirror` (SHA `f235012`) y `sveltia-cms-auth-mirror` (SHA `6e3a01d`), con el remote `respaldo` agregado al repo local (`git push --all respaldo`).

### El dominio propio: `laboutiquecatydog.com.ar` en producción

- **Registrado en NIC.ar por el cliente** y delegado en Cloudflare (nameservers `jakub.ns.cloudflare.com` / `priscilla.ns.cloudflare.com`, zona `83317105a3afc27218bd598b7e2a2182`, plan Free). GitHub Pages validó el DNS y creó solo el `CNAME` (`3c745f6 Create CNAME`).
- Estado verificado: `https://laboutiquecatydog.com.ar/` responde **200 con TLS válido**; `http://` también respondía 200 sin saltar a HTTPS (pendiente: activar **Always Use HTTPS** en Cloudflare); `www.laboutiquecatydog.com.ar` **no resuelve** (pendiente: crear el registro CNAME `www` → `laboutiquecatydog.github.io`).
- **El panel se había quedado sin login**: con el dominio nuevo, `/auth` en el Worker devolvía **400** ("el dominio no está en ALLOWED_DOMAINS") porque la variable seguía siendo `laboutiquecatydog.github.io, localhost` → y como la URL vieja ahora redirige a la nueva, tampoco se entraba por `laboutiquecatydog.github.io`. **Worker redesplegado** con `ALLOWED_DOMAINS = "laboutiquecatydog.com.ar, www.laboutiquecatydog.com.ar, laboutiquecatydog.github.io, localhost"` (versión `89c81374`, secret `GITHUB_CLIENT_SECRET` conservado). Verificado: origen nuevo 302 ✓, `www` 302 ✓, origen viejo 302 ✓, dominio falso 400 ✓, scope `public_repo,user` ✓.
- **URLs absolutas migradas** al dominio propio: `index.html` (canonical, `og:image`, `og:url`, `twitter:image`), `robots.txt` (Sitemap), `sitemap.xml` (`<loc>` + `lastmod`) y `js/main.js` (respaldo del link "En producción" del aviso de `file://`).
- La URL vieja `laboutiquecatydog.github.io` ahora **redirige 301** al dominio propio: los enlaces guardados y los marcadores del panel siguen funcionando.

### Publicación y verificación en el dominio propio

- Dos commits: `968d234` (huella legal) y `82a2b71` (URLs al dominio nuevo), sobre el `3c745f6 "Create CNAME"` que creó GitHub (el repo local quedó un commit atrás → `git pull --rebase` antes de pushear).
- **Hipó de GitHub Pages**: el primer build quedó clavado en `building` (~10 min) y al disparar un rebuild ambos deploys fallaron con *"Deployment cancelled"* (el job de **build** de Jekyll había salido `success`; lo que se caía era el paso de deploy). Se relanzó el build → `built` + deployment `success`. La web nunca dejó de servir (seguía la build anterior).
- **Verificado en producción sobre `https://laboutiquecatydog.com.ar/`**: `/terminos.html` 200 ✓ · `/privacidad.html` 200 ✓ · `/LICENSE` 404 ✓ · `/guias/*` 404 ✓ · canonical, `og:url`, `og:image`, `twitter:image`, `sitemap.xml` y `robots.txt` con el dominio nuevo ✓ · pie con los links legales y "Desarrollo y operación: Estalingrado Corp" ✓ · `footer.copyright` = "Estalingrado Corp. Todos los derechos reservados." ✓.
- **Suite de producción 9/9** sobre el dominio propio (0 errores de JavaScript), incluida la nueva prueba del flujo de login: el panel lleva a GitHub con el `client_id` correcto y `scope=public_repo,user`.
- **Hallazgo de privacidad**: Cloudflare inyecta su beacon de analítica (`static.cloudflareinsights.com`), que la CSP del sitio bloquea (por eso aparece como violación en la consola y **no** se carga). Como el aviso de privacidad declara que no hay cookies ni analítica, lo correcto es **desactivar Web Analytics en el panel de Cloudflare** (o, si se quiere usar, hay que permitirlo en la CSP y corregir el aviso).

---

## 2026-11-05 · El dominio propio en producción (segunda tanda): DNS, HTTPS, incidente y revisión del aviso

### Estado final del dominio (todo verificado)

| Comprobación | Resultado |
|---|---|
| `laboutiquecatydog.com.ar` (ápex) | CNAME → `laboutiquecatydog.github.io`, proxied (naranja) → resuelve a las IPs de Cloudflare ✓ |
| `www.laboutiquecatydog.com.ar` | CNAME → `laboutiquecatydog.github.io`, proxied ✓ |
| `https://laboutiquecatydog.com.ar/` | **200** con TLS válido ✓ |
| `https://www.laboutiquecatydog.com.ar/` | **301 → `https://laboutiquecatydog.com.ar/`** ✓ (sin loop) |
| `http://laboutiquecatydog.com.ar/` | **301 → https** ✓ (Always Use HTTPS) |
| `https://laboutiquecatydog.github.io/` | 301 → el dominio propio ✓ (los enlaces guardados siguen sirviendo) |
| Web Analytics de Cloudflare | sin beacon inyectado ✓ (sin seguimiento y sin violación de CSP) |

### Incidente: el ápex quedó sin registro

Al **editar** el registro CNAME del ápex y cambiarle el Nombre a `www`, Cloudflare **lo renombró en el lugar** (no crea uno nuevo) → el ápex se quedó **sin ningún registro** → el dominio no resolvía y la web quedaba caída (la URL vieja de GitHub redirigía a un destino inexistente). Se detectó consultando los **servidores autoritativos** de Cloudflare (`jakub`/`priscilla.ns.cloudflare.com`) en lugar del resolver local, que cacheaba el NXDOMAIN.

**Solución**: crear un **segundo** registro CNAME (nombre `@` / `laboutiquecatydog.com.ar` → `laboutiquecatydog.github.io`, proxied) **sin tocar** el de `www`. Lección: para tener ápex y `www` hacen falta **dos registros**; renombrar no duplica.

### Revisión del aviso de privacidad (pendiente de aplicar)

El párrafo sobre el panel de administración es **cierto en lo esencial** (el token se guarda en `sessionStorage` y los borradores en `localStorage`, y se borran al cerrar sesión — verificado en `admin/editor.js`), pero tiene tres imprecisiones:

1. "el token de acceso de GitHub" → mejor "las credenciales de acceso" (el aviso es para consumidores; el detalle técnico no aporta nada legal).
2. "y no en nuestros servidores" → **impreciso**: durante el canje OAuth el token *pasa* por el Worker de Cloudflare (no se almacena ahí, pero transita). La fórmula exacta es "**no se almacenan en servidores del sitio**".
3. Falta el dato legalmente relevante: el acceso se delega a **GitHub**, que aplica su propia política de privacidad.

Conclusión de seguridad: publicar ese párrafo **no abre una vía de ataque** (el panel exige cuenta de GitHub **con permiso de escritura**; sin eso no se puede publicar nada y no se expone ningún secreto). Es una decisión de tono y precisión, no de seguridad.

### Decisiones de negocio tomadas

- **El contrato de licencia de uso no se firma ahora**: la web funciona sin él y el cliente todavía no está listo. La reserva de derechos ya está cubierta por el `LICENSE` público del repo. Al cliente se le firma en la entrega, en este orden: (1) autorización del dominio → (2) traspaso de dominio y cuentas → (3) contrato.
- **El dominio queda a nombre del desarrollador por ahora** → por eso la carta de autorización es el documento clave antes de la entrega.
- **Pendiente de SEO/marketing**: Search Console con el dominio nuevo (propiedad de tipo Dominio + sitemap) y ficha de **Google Business Profile**, que es el factor #1 para búsquedas locales del tipo "pet shop cerca mío".

### Documentación actualizada

`README.md` (URLs y pendientes), `guias/ENTREGA-CLIENTE.md` (estado real del dominio, orden de entrega y pasos de Search Console) y esta bitácora.
