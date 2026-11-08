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

---

## 2026-11-06 — Rediseño del panel de administración (modo «Textos»)

### El problema que se reportó

Al agregar un producto en el panel, **todas las tarjetas se desplegaban a la vez** y había que hacer mucho scroll horizontal. La causa real (reproducida con Edge headless + CDP sobre el servidor local) no era el scroll, sino dos cosas juntas:

1. `admin/editor-form.js` → `construirLista()` creaba un `<details class="item-lista">` por ítem con `cajaItem.open = i === 0 || (valor || []).length === 1;` ⇒ **la primera foto de cada producto quedaba abierta** y el primer producto abierto medía **1192px** (campos + fotos anidadas, la primera foto 370px).
2. Cualquier cambio estructural (`alCambiar(true)` → `actualizarFormularioActual()` → `construirSeccion`) **reconstruye el formulario entero** ⇒ se reabría el primer ítem y **se perdía la posición del scroll**.

### Lo que quedó

- **Productos como íconos**: cada producto es una miniatura con nombre y un dato (precio o destino), en una rejilla de 5 por fila. Con más de 10 productos la tira pasa sola a **carrusel horizontal** con flechas.
- **Buscador en su propio bloque**, con contador (`5 productos` / `1 de 5` al filtrar) y estado vacío («Ningún resultado coincide con «…»»).
- **Ventana de edición propia** (`#modal-item`, 520px) que abre al tocar un ícono: título, posición («Producto 3 de 5»), campos en dos columnas, fotos del producto en filas compactas con sus campos desplegables, y acciones **Subir / Bajar / Quitar** + **Listo**. Cierra con la X, con un clic afuera o con `Esc`.
- **Edición en vivo**: al cambiar un campo, el ícono y el título de la ventana se actualizan al instante; el modelo se guarda solo.
- **El mismo tratamiento para el hero y las categorías**: las fotos del carrusel se ven como íconos («Foto 1…») y las tarjetas de categorías como íconos con su título.
- **Se mantiene el scroll** al agregar o quitar: `actualizarFormularioActual()` guarda y restaura el `scrollTop` de `#form-seccion`.
- **Pulido general**: pestañas tipo píldora, radios más suaves (14/16/20px), sombras suaves, campos con foco más claro, ventana con fondo desenfocado, identidad con degradado y encabezado pegajoso a sangre (sin hueco arriba).
- El **aro de color por mascota** (perro/gato/ambos) se ve como un overlay sobre la miniatura (antes la foto lo tapaba).

### Verificación (61 comprobaciones automáticas, todas OK)

| Suite | Resultado |
|---|---|
| `panel-test.js` (productos) | **36/36** |
| `panel-test-otros.js` (hero, categorías, datos del local) | **15/15** |
| `panel-pulido-check.js` (separador, encabezado, pistas, aro) | **10/10** |

Sin errores de JavaScript en ningún caso. Los scripts viven en `%TEMP%\opencode\` (son de prueba, no se publican en el repo).

### Archivos tocados

`admin/editor-form.js` (listas compactas + ventana), `admin/editor.html` (markup de la ventana y texto de ayuda), `admin/editor.css` (estilos nuevos), `admin/editor.js` (`cerrarModal` coordina el cierre de la ventana y se preserva el scroll).

### Aviso de privacidad: corregido (3 cambios)

Se aplicaron las tres imprecisiones que había detectado y explicado:

1. «token de acceso de GitHub» → «**credenciales de acceso**» (el aviso es para consumidores; el detalle técnico no aporta legalmente).
2. «(y no en nuestros servidores)» → «**no se almacenan en servidores del sitio**»: el token *transita* el Worker de Cloudflare durante el canje OAuth (no queda almacenado ahí), así que la fórmula anterior era demasiado categórica.
3. Se agregó que **el inicio de sesión se delega a GitHub**, que aplica su propia política de privacidad y sus reglas de acceso al repositorio.

Ningún cambio altera el comportamiento: el panel sigue exigiendo cuenta de GitHub con permiso de escritura y no expone secretos.

## 2026-11-06 — Catálogo con categorías, filtros y destacados

### Lo que se pidió

1. Quitar el rótulo chico de las tarjetas de producto (decía lo mismo que el título).
2. «Para qué mascotas» deja de ser un texto libre: pasa a ser una selección de las **categorías que ya existen** en la sección «Categorías».
3. Agregar **categorías de producto** con filtros reales en la web, y que la lista sea administrable desde el panel.
4. Cada producto puede llevar **varias categorías** (casillas de verificación, no una sola).
5. Extras pedidos: contador de resultados, estado vacío, buscador en el catálogo, precio formateado y productos destacados.

### Cómo quedó el modelo (`data/pagina.json`)

- `categorias.tarjetas[]`: cada tarjeta (mascota) tiene un `id` estable (`perros`, `gatos`). Ese id es el que usan los filtros y la selección de los productos; el texto visible sigue siendo el `titulo`.
- Sección de productos: se agregaron `mostrarFiltros`, `buscador` y `categoriasProducto: [{ id, titulo }]` (Alimentos, Descanso, Transporte, Accesorios, Juguetes).
- Cada producto: `titulo`, `descripcion`, `mascotas: ["perros","gatos"]`, `categorias: ["alimentos"]`, `destacado`, `precio`, `mensajeWhatsApp`, `fotos`. **Se eliminó `etiqueta`** (el rótulo).
- Migración hecha con un script idempotente: los productos que todavía no tenían categoría quedan asignados a la que corresponde y los destacados son «Alimento y nutrición» y «Transporte».

### Panel (`admin/`)

- **Bloque «Categorías de producto»** dentro de la sección Productos: se agregan, renombran y eliminan en el mismo lugar; al eliminar una categoría, los productos que la usaban la pierden (no quedan con referencias rotas).
- **«Para qué mascotas» y «Categorías de producto»** se editan con píldoras (casillas) que salen del modelo: las primeras de las tarjetas de la sección Categorías (más un botón «Todos»), las segundas de la lista administrable (más un botón «Ninguna»).
- Interruptor **«Destacado (se muestra arriba de todo)»** por producto.
- Las **tarjetas de categoría nuevas** reciben un identificador solo; si el cliente renombra una tarjeta y ningún producto la usa, el identificador se rehace, pero si ya hay productos apuntando a él se respeta (no se rompen los filtros).
- El motor de formularios tenía que distinguir un campo de selección múltiple (que guarda un array de ids) de una lista de bloques: sin ese cambio, «mascotas» y «categorías» se dibujaban como listas de texto.

### Web (`js/`, `css/`)

- Dos grupos de filtros: **mascota** y **categoría de producto**; se combinan con Y entre grupos y O dentro del mismo grupo.
- **Buscador** con espera corta (150 ms), **contador** («5 productos» / «4 de 5 productos») y **estado vacío** («No hay productos con esos filtros. Probá con otra búsqueda»).
- **Precios**: los numéricos se formatean con miles (`$12.000`); los textos libres se respetan tal cual («Consultar»).
- **Destacados**: salen primero en la grilla, con aro de color y etiqueta «Destacado». Cada tarjeta conserva su índice real (`data-producto`) para que la edición en línea del panel siga editando el producto correcto aunque cambie el orden.
- La tarjeta ya no tiene rótulo: quedó título, descripción, precio y botón de WhatsApp.

### Verificación (141 comprobaciones automáticas, todas OK)

| Suite | Resultado |
|---|---|
| `panel-test.js` (productos) | **36/36** |
| `panel-test-otros.js` (hero, categorías, datos del local) | **15/15** |
| `panel-pulido-check.js` (separador, encabezado, pistas, aro) | **10/10** |
| `panel-categorias-test.js` (píldoras, lista de categorías, destacado, ids) | **27/27** |
| `web-test.js` (catálogo, filtros, contador, buscador, estado vacío) | **28/28** |
| `web-layout-check.js` (escritorio y móvil: sin desbordes ni superposiciones) | **15/15** |
| `preview-inline-test.js` (edición en la vista previa: editar el producto correcto) | **10/10** |

Sin errores de JavaScript en ningún caso. Los scripts de prueba viven en `%TEMP%\opencode\` (no se publican en el repo).

### Estado

Publicado: el commit de este trabajo sube el modelo, el panel, la web, el README y la guía de entrega. GitHub Pages reconstruye solo (~1 min) y el sitio queda con los filtros por mascota **y** por categoría.

### Detalle de implementación (por si hay que tocarlo)

- **Widget de píldoras** (`opciones-multiple`) en `admin/editor-form.js`: es el único campo que guarda un array de ids y NO es una lista. Por eso `construirObjeto()` lo intercepta **antes** de la rama de arrays: sin eso, «mascotas» y «categorías» se dibujaban como listas de texto.
- **Opciones desde el modelo**: `BQForm.setDatos(datos)` le pasa el modelo completo al formulario; `opcionesDe("mascotas")` lee las tarjetas de la sección Categorías y `opcionesDe("categorias-producto")` la lista administrable de la sección Productos.
- **Identificadores**: las tarjetas de la sección Categorías llevan un `id` estable (`perros`, `gatos`). Las tarjetas nuevas reciben uno solo; al renombrarlas, el `id` se rehace **solo si ningún producto lo usa** (si lo usan, se respeta para no romper los filtros).
- **Orden en la web**: los destacados salen primero, pero cada tarjeta lleva `data-producto` con su índice real, para que la edición directa de la vista previa (`admin/editor-inline.js`) siga apuntando al producto correcto.
- **Estado vacío y paginación**: ambos se rearman al filtrar (`repaginarTodo()`), así que el contador, la grilla y la paginación siempre cuentan lo mismo.

### Caché de Cloudflare: por qué el sitio «no cambiaba»

Al publicar, el sitio seguía mostrando los filtros viejos (solo «Todos / Perros / Gatos») aunque los datos ya tenían las categorías. La causa no era GitHub Pages sino la **caché del edge de Cloudflare**:

| Archivo | `cf-cache-status` | `cache-control` | Efecto |
|---|---|---|---|
| `/` y `/admin/editor.html` | `DYNAMIC` | `max-age=600` | Se ve al instante (10 min en el navegador) |
| `/js/*.js`, `/css/*.css` | **`HIT`** | **`max-age=14400`** | **4 horas de código viejo** |

O sea: el navegador recibía **datos nuevos + JavaScript viejo**. El JS viejo no conocía `categoriasProducto`, así que el grupo de filtros por categoría no se dibujaba y el buscador tampoco aparecía.

**Solución:** los CSS/JS ahora se piden con `?v=<hash>` (`css/styles.css?v=eff646fe`). Al cambiar la URL, la clave de caché cambia y el edge trae el archivo nuevo. La versión se genera sola con:

```bash
node tools/actualizar-version.js
```

El script es idempotente y hay que **commitear el `index.html` / `admin/editor.html` junto con el código nuevo**. Los datos (`data/*.json`) no tienen este problema: se piden con `cache: "no-store"`, así que lo que publica el panel se ve al instante.

---

## 2026-11-07 — Huella legal como enlace, publicación verificada y revisión de estado

Tanda de cierre: el trabajo de la entrada anterior se **publicó y se verificó contra la web real**, se agregó el enlace de la empresa en el pie y se documentó el estado del proyecto para la revisión del CEO (sin tocar el código de la aplicación).

### 1. Huella legal del pie como enlace (`60b6302`)

- `data/sitio.json`: nueva clave **`footer.empresaUrl`** = `https://estalingradocorp.com.ar/`.
- `js/render.js` (`buildFooter`): el texto del copyright se envuelve en `<a class="enlace-copyright" target="_blank" rel="noopener">` **solo si** hay `empresaUrl` cargado; si no, queda como texto plano (sin cambios de comportamiento para nadie que no lo configure).
- `css/styles.css`: `.footer-bottom a.enlace-copyright` hereda el color del pie y se subraya al pasar el mouse (sigue siendo texto, no un botón).
- `admin/editor-form.js`: nueva regla `REGLAS.empresaUrl` → campo **«Enlace de la empresa (pie)»** en la pestaña «Datos del local», junto al aviso de copyright.
- Versión de assets regenerada: `?v=c1c7c0ed`.
- **Verificado en producción (10/10)**: el pie muestra «© 2026 Estalingrado Corp. Todos los derechos reservados.» como enlace, apunta a `https://estalingradocorp.com.ar/`, abre en pestaña nueva con `rel="noopener"`, conserva el texto, hereda el color y el panel expone el campo con la URL cargada. 0 errores de JavaScript.

### 2. Publicación y estado de los remotos

- Commits en `main`: `02b75ce` (catálogo con categorías) → `2391b8f` (versionado de assets) → `60b6302` (huella legal).
- `origin` (GitHub Pages) y `respaldo` (repo privado de respaldo) quedaron **con contenido idéntico** (`git diff --stat origin/main respaldo/main` vacío).
- GitHub Pages: `built`; la web responde 200 y sirve `data/pagina.json` con `categoriasProducto`.
- **Verificación en producción**: `prod-check.js` **9/9** (0 errores JS), `web-test.js` **28/28**, `web-layout-check.js` **15/15**, `panel-categorias-test.js` **27/27** contra el panel publicado, `huella-test.js` **10/10**.

### 3. Problema abierto: los borradores viejos no se migran (NO corregido)

**Lo que se reportó**: en el panel, la sección de productos **no muestra el bloque «Categorías de producto»**, aunque la web sí tiene los filtros. No es un problema de la web: es el panel.

**Causa raíz (verificada leyendo el código):**

1. `admin/editor.js` (`cargarEditor`): al entrar, el panel recupera el borrador local (`localStorage["BQ_DRAFT_PAGINA"]`) **tal cual está**, sin adaptarlo al formato actual:
   ```js
   var guardado = JSON.parse(crudo);
   if (guardado && Array.isArray(guardado.secciones)) { datos = guardado; }
   ```
2. El bloque «Categorías de producto» se dibuja a partir de la clave `categoriasProducto` de la sección (`admin/editor-form.js` → `construirListaTexto`, con `DICT_LISTAS.categoriasProducto`). Si esa clave **no existe** en el modelo, no hay bloque.
3. El borrador viejo tiene el modelo anterior (el de `git show 94e3542:data/pagina.json`): productos con `etiqueta` y `mascotas: "perro gato"` (texto), sin `categorias`, sin `destacado`; tarjetas de categorías sin `id`; sección de productos sin `mostrarFiltros`, `buscador` ni `categoriasProducto`.
4. Mientras tanto, la **web** lee `data/pagina.json` de GitHub (ya migrado) → por eso la web está bien y el panel no.

**Por qué es peligroso**: el chequeo de conflicto previo a publicar (`publicar()` → `vigilarSha`) compara el SHA remoto con `shaPagina`, que se capturó **al descargar el archivo al abrir el panel**. Como el borrador se superpone después a esos mismos datos, **el SHA coincide y no se detecta nada**: publicar desde un borrador viejo **pisa el catálogo nuevo** (la web vuelve al modelo sin categorías) sin avisar.

**Mitigación disponible hoy (sin tocar el código)**: el botón **«Descartar»** del panel llama a `volverACargar()`, que borra `BQ_DRAFT_PAGINA` y `BQ_DRAFT_SITIO` del `localStorage` y vuelve a cargar lo publicado. Al restaurar el borrador, `compararConPublicado()` marca el panel como «con cambios» y activa ese botón, así que está disponible. Al descartar, el panel carga el modelo publicado (con `categoriasProducto`) y **el bloque aparece**.

**Regla para el cliente mientras tanto**: si el panel no muestra el bloque de categorías, **«Descartar» y recargar**; y no publicar desde un panel que muestre el modelo viejo.

**Arreglo de fondo (pendiente, no aplicado)**: migrar el borrador al abrir el panel con la misma lógica idempotente que ya se usó sobre los datos publicados (`categorias.tarjetas[].id`, `categoriasProducto`, `producto.mascotas[]`, `producto.categorias[]`, `producto.destacado`, eliminar `etiqueta`), y aplicarla también a las restauraciones del «Historial de versiones» y de las «Copias de seguridad» (que cargan como borrador). Queda anotado como pendiente en `README.md` y en `guias/ESTADO-ACTUAL.md`.

> **Nota**: este arreglo **no se aplicó** porque el CEO pidió revisar el estado actual del proyecto antes de la entrega y que no se tocara el código. Queda documentado con diagnóstico, impacto, mitigación y solución propuesta.

### 4. Documentación actualizada (este commit)

- **`guias/ESTADO-ACTUAL.md` (nuevo)**: informe de estado para la revisión del CEO — qué es el proyecto, cómo está hecho, cómo funciona, qué se verificó (con los números de las pruebas), **problemas conocidos** con su impacto y su mitigación, pendientes por área (código, marketing, legal, cuentas), cómo revisarlo en 10 minutos, decisiones de fondo y estado de git.
- **`README.md`**: se corrigieron datos que habían quedado desactualizados (los filtros del catálogo, `productos[].mascotas` que ya no es texto sino lista de ids, la clave nueva `footer.empresaUrl`, el valor vigente de `ALLOWED_DOMAINS`, el hash de versión de assets, el archivo `tools/actualizar-version.js` que faltaba en el árbol) y se agregó la sección **«Problemas conocidos»** con el enlace al informe.
- **`guias/ENTREGA-CLIENTE.md`**: aviso en la sección 5.b sobre el borrador viejo y el paso «Descartar», más dos ítems en el checklist de la reunión.
- **`BITACORA.md`**: esta entrada.
- Recordatorio de que **`guias/` está excluido de la publicación** (`_config.yml`) → el informe nuevo **no se publica** en la web (responde 404), como el resto de la documentación interna.

---

## 2026-11-08 — Acceso visible, modo local completo y pulido del panel y la web

Tanda larga, **todo en local y sin tocar GitHub hasta el cierre** (el usuario lo autorizó al final para publicar esta tanda). El repo de trabajo es el de la empresa (`Estalingradocorp/laboutiquecatydog.github.io`), clonado de cero tras borrar la carpeta; quedó una **copia intacta** en `C:\Users\nbmn8\OneDrive\Escritorio\copia repo la boutique` (commit `f12ce5c`, sin cambios locales).

### 1. Ícono de usuario (reemplaza el acceso oculto)

- El acceso de tres clics al logo se retiró. Ahora hay un **ícono de usuario minimalista** (círculo de 42 px, trazo fino) en la **esquina superior derecha** del header, visible en escritorio y móvil, que enlaza a `/admin/editor.html` (`js/render.js` + `css/styles.css`).
- **Bug del panel-anidado**: la vista previa re-dibujaba el header y recreaba el ícono visible dentro del iframe → al tocarlo, el panel se cargaba dentro del propio panel. Arreglo: `buildHeader` **no dibuja el ícono si está embebido** (cada dibujo, no solo al inicio) y `reiniciar()` también lo oculta.
- **«Salir» en modo local** lleva a la web (`/`) en vez de recargar el panel.

### 2. Modo local (sin Worker ni token)

El login con usuario/clave del Worker devolvía `401` con cuerpo vacío ante credenciales que no coinciden → página en blanco, y bloqueaba probar en local. Para trabajar sin credenciales:

- **Carga directa**: en `localhost`/`127.0.0.1`, el panel arranca en **modo local**: lee `data/*.json` de la carpeta, muestra «Modo local (sin publicar)» y entra directo al editor.
- **Guardado local**: el botón pasa a **«Guardar en esta carpeta»** y escribe `data/*.json` vía `POST /__local/guardar` del servidor local (solo esos dos archivos). La web local muestra los cambios al recargar.
- **Imágenes locales**: `GET /__local/imagenes` (galería desde `assets/img/`) y `POST /__local/subir-imagen` (escribe el binario validado). La subida sigue optimizando (JPEG 82 %, 1600 px + variante `-900`).
- **Panel que nunca queda en blanco**: la vista de acceso es visible por defecto (antes las 3 vistas nacían ocultas y sin JS era blanco total) + aviso de carga colgada a los 15 s.
- Producción no cambia: el modo local solo se activa en localhost.

> Nota: el `401` vacío del Worker **sigue existiendo para el login publicado** si las credenciales no coinciden (es código del Worker, fuera de este repo). El modo local lo evita para probar.

### 3. Migración automática de borradores viejos (el bug «no veo las categorías»)

Causa raíz de varios reportes: el panel restauraba el borrador de `localStorage` **sin adaptarlo**; con un borrador anterior a las categorías, el bloque «Categorías de producto» no se dibujaba —y publicar desde ahí pisaba el catálogo nuevo sin aviso (el chequeo SHA no lo detectaba). Ahora `migrarDatos()` (idempotente, en `admin/editor.js`) adapta cualquier modelo viejo al entrar: tarjetas con `id`, `categoriasProducto`, `mascotas` como lista de ids, `categorias` desde la vieja `etiqueta` (las etiquetas nuevas se conservan como categorías), `destacado` por defecto y se quita `etiqueta`. Se aplica al cargar (ambos modos) y al restaurar versiones/copias. Queda marcado como borrador para revisarlo antes de publicar.

### 4. Pulido del panel

- **Categorías como píldoras** (antes: formulario apilado): etiquetas redondeadas iguales a los filtros de la web, nombre editable en línea, ↑ ↓ ✕ mínimos al pasar el mouse, botón punteado «+ Nueva categoría» y ayuda que aclara que son los botones de filtro.
- **Selección múltiple de imágenes**: tocar una imagen la marca (✓), se pueden marcar varias; contador («3 imágenes») + botón «Agregar 3» junto a «Subir desde la PC». La primera va al campo y **el resto se agrega como fotos/slides nuevas** en la misma lista.
- **Ventana de imágenes encima** de la de producto (`#modal-imagenes` z 200, `#modal-confirmar` z 300): antes quedaba detrás.
- **«Destacado» alineado**: el checkbox pasó a fila completa con alineación superior (antes en media columna, desalineado).
- **Orden fijo de campos** en la ventana de producto (Título → Descripción → Mascotas → Categorías → Destacado → Precio → Mensaje → Fotos), sin importar el orden de claves del JSON.
- **Redes sociales en el modo Textos** de la sección Contacto (grupo «Redes sociales (Datos del local)», 6 campos), sin cambiar de pestaña.
- **Aviso de vista previa auto-ocultable**: tras guardar/publicar se va solo a los 3 s con desvanecimiento suave (antes quedaba atorado).
- `editor-media.js`: `REPO` actualizado al repo de la empresa (apuntaba al viejo).

### 5. Pulido de la web

- **Doble «✕» del buscador**: el input es `type="search"` (✕ nativa del navegador) + botón propio. Ahora la nativa se oculta en CSS (web y panel); queda una sola.
- **Paginación sin salto**: al cambiar de página, el catálogo se achica (6 vs 1 producto) y todo se movía. Ahora la paginación se **ancla en su lugar de pantalla** (compensación instantánea + `overflow-anchor: none` durante el repintado + foco en el contenedor, sin robarlo al buscador). Verificado con clic de mouse real: 0 px de corrimiento.
- **Tipografía de precios**: `$` en span propio (más chico, gris) + números Inter 700 con `tabular-nums`, 1.32 rem. («Consultar» y textos libres intactos.)
- `preview.cmd` abre **web + panel** en dos pestañas (antes solo la web).

### Verificación (headless, navegador Edge, servidor local)

| Prueba | Resultado |
|---|---|
| Modo local sin login (editor + secciones + Guardar a disco) | OK |
| Borrador viejo migrado (bloque aparece, etiquetas conservadas, borrador marcado) | OK |
| Píldoras de categorías + botón Guardar | OK |
| Galería local (24) + subida a disco + ruta `..` rechazada | OK |
| Multiselección (3 imágenes → contador + fotos agregadas) | OK |
| Destacado alineado, orden fijo de campos | OK |
| Redes en Textos del contacto (edición → borrador de sitio) | OK |
| Buscador web y del panel (tipeo real) | OK (`1 de 7`) |
| Carrusel: fotos agregadas aparecen (slides/puntos) + buscador en vista previa | OK |
| Paginación con clic real (ancla, 0 px) | OK |
| Aviso de vista previa auto-oculto | OK |
| Ícono visible en web, ausente en vista previa, Salir → web | OK |
| Sin errores de JavaScript en ningún caso | OK |

Los scripts de prueba viven en `%TEMP%\opencode\` (no se publican).

### Pendiente (no tocado en esta tanda)

- El `401` vacío del Worker ante credenciales incorrectas (login publicado): el modo local lo rodea, pero convendría que el Worker devuelva el formulario con mensaje de error en vez de una página en blanco.
- HTTPS del dominio nuevo (certificado pendiente según la entrada anterior).
- Contenido del negocio: 7 productos (incluye «Paisaje Salta» y «estatua», categoría «paisaje prueba») + 3 fotos nuevas en `assets/img/`, guardados en local y **incluidos en la publicación de esta tanda**.

---

## 2026-11-08 — Auditoría de seguridad y correcciones (sin salir del local)

A pedido del usuario: revisión completa en modo atacante (solo lectura + pruebas en loopback local; **sin tocar producción ni el Worker desplegado**). El repo aún no se pushea (permiso de escritura pendiente en `Estalingradocorp`); todo queda commiteado en local y se sube cuando se autorice.

### Hallazgo 1 (corregido): CSRF local — cualquier web podía escribir archivos en la PC

`tools/serve.js` aceptaba los `POST /__local/*` sin validar origen ni tipo: un sitio malicioso visitado mientras corre el servidor local podía escribir `data/pagina.json`, `data/sitio.json` o imágenes en `assets/img/` (POST simple sin preflight CORS). Agravante: aceptaba **`svg`** (script en el origen `localhost` si se navega directo).

**Corrección:** los endpoints `/__local/*` exigen origen local (o ausente) **y** `Content-Type: application/json`; el endpoint de imágenes rechaza `svg`. Verificado con origen forjado real (Node directo): cruzado → `403`, sin preflight → `403`, legítimo → `200`, `svg` → `400`.

### Hallazgo 2 (corregido): XSS almacenado vía `empresaUrl`

`buildFooter()` usaba `a()` (solo escapa comillas) en vez de `hrefSeguro()`: un valor `javascript:…` en ese dato ejecutaba script al hacer clic en el copyright. Ahora usa `hrefSeguro()` como el resto de las URL. Verificado: sin `javascript:` en el HTML servido.

### Hallazgo 3 (abierto, externo): Worker `401` vacío

Con credenciales incorrectas, el Worker responde `401` sin cuerpo → navegador en blanco sin mensaje. El código del Worker no está en este repo (vive en Cloudflare / `Estalingradocorp/sveltia-cms-auth`): no se pudo corregir acá. El modo local lo rodea para probar; queda anotado como pendiente con el arreglo recomendado (devolver el formulario con mensaje de error).

### Verificado como correcto (sin cambios)

Escape sistemático (`e()`/`a()`/`hrefSeguro()`, WhatsApp y Maps con `encodeURIComponent`), CSP en sitio y panel (hash del único inline verificado), token solo en `sessionStorage` y solo hacia `api.github.com`, servidor local en `127.0.0.1` con bloqueo de path traversal, sin secretos en el repo, documentación interna excluida de la publicación, sin dependencias.

Informe completo con prioridades y plan de corrección: `guias/INFORME-SEGURIDAD.md` (creado en esta tanda; antes esa ruta solo se mencionaba en el README sin existir como archivo propio).

---

## 2026-11-08 — Editor de recorte, pulido final y seguridad (segunda tanda)

Todo en local; la publicación con git se hace al final de la tanda. Contenido del negocio incluido: producto «Alimento Pedigree…» (8º), categoría nueva y fotos subidas por el usuario.

### Editor de recorte (antes de subir y desde la galería)

- Al elegir un archivo en «Subir desde la PC» aparece un **editor de recorte**: proporciones 4:3 / 1:1 / 3:4 / Libre, **zoom de 25 % a 400 %** (se puede alejar para encuadrar sin cortar) y paneo por arrastre **limitado para que nunca queden huecos**. Fondo **blanco** en la vista previa, igual al JPG final.
- La **galería también se edita**: al confirmar la selección, cada imagen pasa por el recorte una por una («Imagen 1 de 2»…) y al terminar se aplican todas juntas (la primera al campo, el resto como fotos nuevas).
- **Lápiz ✎** en la ventana de producto: edita la foto que ya está con el mismo editor (antes solo desplegaba datos). Los datos (texto alt/medidas) pasaron al botón **«···»**.
- La miniatura del producto en el panel pasó a `contain` (y 68×84): las bolsas en vertical ya no se cortan a la mitad.

### Pulido de la web y el panel

- **Botones «Consultar disponibilidad» minimalistas**: contorno fino, texto oscuro, hover invertido sin sombras pesadas (antes: bloque rojo sólido). Aprobado por el usuario; el rojo queda solo para WhatsApp.
- **Zoom de tarjetas Perros/Gatos contenido**: la foto vive en un marco `.category-frame` con `overflow: hidden` (antes se derramaba sobre el texto de abajo); ease más suave de 0,9 s.
- **Aviso de vista previa auto-ocultable**: tras guardar/publicar se va solo a los 3 s con desvanecimiento suave.
- **Orden fijo de campos** en la ventana de producto (Categorías y Destacado siempre antes de las fotos, sin importar el orden de claves del JSON).
- **«Destacado» alineado**: fila completa con checkbox alineado arriba.
- **Doble «✕» del buscador**: se oculta la ✕ nativa del navegador (`::-webkit-search-cancel-button`); queda solo la propia.
- **Paginación anclada (versión final)**: al filtrar/buscar solo se repinta (sin tocar scroll ni foco ni «ancla de scroll», para no saltar al tipear); al tocar un número, la paginación se ancla en su lugar de pantalla compensando el achicamiento del catálogo. Verificado con clic de mouse real.

### Seguridad (ver `guias/INFORME-SEGURIDAD.md`)

- **CSRF local cerrado**: los endpoints `/__local/*` exigen origen local + `Content-Type: application/json`; se rechaza `svg` en la subida.
- **XSS vía `empresaUrl` cerrado**: usa `hrefSeguro()` como el resto de las URL.
- Verificado con exploit simulado (origen forjado real por Node directo): cruzado → `403`, sin preflight → `403`, legítimo → `200`, `svg` → `400`.

### Publicación

- Commit de esta tanda (código + contenido del negocio + documentación) y push a `origin` cuando el dueño autorice el acceso de escritura.

---

## 2026-11-08 — Botón «Filtros» y enlaces de soporte (tercera tanda)

### Botón para ocultar/mostrar filtros (web)
- La sección Productos mostraba siempre los dos grupos de filtros (mascota + etiquetas), que con muchas categorías ocupan mucho. Nuevo botón minimalista **«Filtros»** (ícono de embudo + ▾) junto al buscador: pliega/despliega con animación suave (`max-height` + opacidad), expone `aria-expanded` y **conserva la selección** al ocultar/mostrar. La preferencia se guarda en la sesión del navegador.
- Verificado headless: arranca desplegado, se pliega, se despliega, chip activo intacto, 0 errores JS.

### Enlaces de soporte a `estalingradocorp.com.ar/soporte/soporte.html`
- **Web**: en el pie, junto a «Aviso de privacidad · Términos», un enlace con ícono de auriculares («Soporte», pestaña nueva). Ubicación decidida para no cargar el header (que ya tiene menú, WhatsApp e ícono de usuario).
- **Panel**: ícono de soporte en la **barra superior** (junto al «?» de ayuda) y enlace **«¿Problemas para entrar? Ir a soporte»** en la pantalla de login — justo donde más se necesita si el ingreso falla.
- Ambos con `target="_blank" rel="noopener"` y URL validada con `hrefSeguro()`.
- Verificado headless: enlace en el pie, ícono en topbar y enlace en login, 0 errores JS.

### Contenido y escaneo de esa jornada
- El negocio sumó productos y categorías en local («Categoría de Prueba», «Prueba 2/3», foto de ícono nueva, datos en `data/*.json`): integrados al commit.
- Escaneo de estrés (34 productos, carrusel de 10 fotos, payloads XSS, móvil): sin caídas, sin desbordes, 0 errores (detalle en la entrada anterior).
- El commit de esta tanda se sube a `origin` (si el acceso de escritura sigue bloqueado, queda en local con instrucciones de desbloqueo en `guias/ESTADO-ACTUAL.md`).

---

## 2026-11-08 — Un borrador del panel pisó producción: restaurado y protegido

**Qué pasó:** el commit `f2f7cff` («Editor visual: actualizar secciones de la portada», publicado desde el panel) revirtió las tarjetas Perros/Gatos a las imágenes viejas **y** borró los productos del negocio (Paisaje Salta, estatua, Alimento Pedigree…) y sus categorías, reemplazándolos por productos plantilla. No fue un bug del código: fue el **borrador viejo del navegador** (de antes de los cambios) restaurado sobre los datos nuevos y publicado tal cual — exactamente el riesgo documentado el 2026-11-07.

**Restauración:** se recuperó `data/pagina.json` de la última versión buena y se fusionó con el remoto conservando los datos correctos (merge con el árbol corregido). Producción verificada: tarjetas nuevas + 9 productos + categorías del negocio. Las fotos y categorías del usuario están intactas en el repo y en su borrador local.

**Protección agregada (para que no se repita):** el panel publicado **ya no aplica borradores en silencio**. Si el borrador difiere de lo publicado, entra con lo publicado y **pregunta**: «Aceptar: cargar tu borrador · Cancelar: descartar el borrador y usar lo publicado». Un borrador idéntico se limpia sin ruido. El modo local no cambia (ahí los datos son los archivos).

**Lección operativa:** los borradores de navegador **no se suben solos ni se pierden solos** — pero si se publican con datos viejos, pisan lo nuevo sin aviso (el chequeo SHA no lo detecta, como se documentó). La pregunta previa lo elimina.

---

## 2026-11-07 — Migración a Estalingradocorp, Cloudflare y panel sin GitHub para el cliente

Tanda larga: el sitio pasó de `laboutiquecatydog/laboutiquecatydog.github.io` a `Estalingradocorp/laboutiquecatydog.github.io` (dueño nuevo), dominio propio en Cloudflare cuenta `nicotips27`, certificado HTTPS pendiente y panel con usuario/contraseña literal (sin cuenta de GitHub para el cliente).

### 1. Espejo y transferencia
- Descarga completa de `laboutiquecatydog/laboutiquecatydog.github.io` → `laboutiquecatydog.github.io/` local + push inicial a `Estalingradocorp/web-La-Boutique-Cat-y-Dog` (commit `52ab758`) + invitación a `nicotips27` y `nicolabarranco27-a11y` con `push`.
- Intento de **transferir** los repos originales (`laboutiquecatydog/laboutiquecatydog.github.io` y `laboutiquecatydog/sveltia-cms-auth`) a `Estalingradocorp` con PAT del dueño: GitHub devolvió `422 Repository has already been taken` en ambos (user→user con nombre `*.github.io` y validación de nombre). No es transferencia posible por API en este caso.
- Solución: **espejo en cuenta nueva** (equivalente a efectos de administración):
  - `Estalingradocorp/laboutiquecatydog.github.io` creado + push `52ab758` (luego `a1dc0f2`, `35a97a2`, `04147cf`).
  - `Estalingradocorp/sveltia-cms-auth` creado + push `6e3a01d` (luego `ef45fc4`, `281da3f`, `30b3ecc`).
  - Invitación a colaboradores ` nicotips27 / nicolabarranco27-a11y` con `push` en ambos repos nuevos. `admin` no es asignable vía API porque `Estalingradocorp` es **User**, no Org (`Cannot assign permission of admin`).

### 2. Dominio y DNS (Cloudflare `nicotips27`)
- Zona `laboutiquecatydog.com.ar` (ID oculto) en plan Free, NS `lady.ns.cloudflare.com` / `mour5` (verificado en `1.1.1.1`). Cuenta vieja (`la boutique`) eliminada; solo se toca esta zona.
- Registros finales (5→8 tras el fix): `www CNAME → estalingradocorp.github.io` (Solo DNS) + TXT SPF/DMARC/DKIM. El apex se corrigió así:
  - Al principio: apex `CNAME → estalingradocorp.github.io` (flattening). Resolvía a las 4 IPs de GitHub en público, pero GitHub Pages marcaba `DNS check unsuccessful / NotServedByPagesError`.
  - Fix aplicado por API del dashboard (sesión logueada en el navegador): convertir apex `CNAME` a **A `185.199.108.153`** y crear 3 A más `185.199.109/110/111.153` (Solo DNS, TTL Automático). Verificado en `1.1.1.1` (TTL 300).
- Regla respetada: **Solo DNS (nube gris)** en todos. El aviso de Cloudflare «Es necesario redirigir mediante proxy…» se ignora para GitHub Pages (con proxy no se puede emitir el certificado).

### 3. GitHub Pages / HTTPS
- Repo nuevo: `status: built`, `cname: laboutiquecatydog.com.ar`, `source: main /`. Archivo `CNAME` correcto.
- `http://laboutiquecatydog.com.ar/` → **200 OK** (`Server: GitHub.com`, título «La Boutique Cat & Dog | Tienda de mascotas en Salta»). `http://www...` → **301** al apex.
- `https://` todavía falla con `SEC_E_WRONG_PRINCIPAL` y `https_enforced: false` con `https_certificate.state: new` («This domain was recently added…»). No es error de DNS ya, es emisión Let's Encrypt pendiente. Al pasar a `approved`, activar **Enforce HTTPS** en `Settings → Pages`.
- `NotServedByPagesError` sigue en rojo hasta el **Check again** de GitHub después del cambio a A (propagación + cache de GitHub). Estado esperado: tarda minutos/horas.

### 4. Panel sin cuenta de GitHub para el cliente (usuario + contraseña)
- Objetivo: el cliente entra solo con **usuario + contraseña** (no se le da cuenta de GitHub). El token de GitHub queda oculto en el servidor.
- Diseño: el Worker `sveltia-cms-auth` lee secretos **solo desde env** (`ADMIN_USER`, `ADMIN_PASS`, `GITHUB_TOKEN`, `ALLOWED_DOMAINS`). **Ningún secreto está en el repo, en el código ni es público** (verificado con `grep`).
- Worker (`src/index.js`):
  - Nuevo modo `provider=password` / `client=editor`: `GET /auth` muestra formulario, `POST /auth` valida con comparador timing-safe y devuelve el token o redirige.
  - Sveltia: devuelve `outputHTML` (postMessage). Editor: `302` a `/admin/editor.html#access_token=…` (si `pathname=/`, se normaliza a `/admin/editor.html`).
  - Fix aplicado: se había roto el wrapper `async fetch` al agregar el modo (error `Expected ")" but found "==="` en deploys de Cloudflare) → commit `281da3f` lo restaura; `node --check` pasa.
- Editor (`admin/editor.js` + `editor.html`):
  - `WORKER_BASE` actualizado a `https://sveltia-cms-auth.nicotips27.workers.dev` (la vieja `laboutiquecatydog10.workers.dev` daba `404 / 1042`).
  - `REPO` actualizado a `Estalingradocorp/laboutiquecatydog.github.io`.
  - `iniciarLogin()` ahora usa `provider=password` y envía `location.href` completa (antes solo `origin`, que mandaba el token a `/` y dejaba en blanco).
  - Textos del login: «Entrar con usuario y contraseña». Se mantiene respaldo por token manual para el desarrollador.
- Credenciales seteadas **solo en Cloudflare como secretos cifrados** (`nicotips27 → Workers & Pages → sveltia-cms-auth → Settings → Variables`): `ADMIN_USER`, `ADMIN_PASS`, `GITHUB_TOKEN`, `ALLOWED_DOMAINS`. Verificado por POST de prueba → pasó de error `Panel no configurado / MISCONFIGURED_CLIENT` a `302` al editor.
- Borrado de seguridad: los PAT temporales compartidos en el chat deben **revocarse** en `github.com/settings/tokens` cuando se termine la tarea.

