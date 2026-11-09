# La Boutique Cat & Dog — Landing page + panel visual de contenido

Sitio web de una sola página (landing) para **La Boutique Cat & Dog**, tienda de productos para perros y gatos. HTML + CSS + JavaScript vanilla, **sin frameworks, sin dependencias y sin paso de build**.

El contenido (textos, imágenes, enlaces y secciones) **no está en el HTML**: vive en archivos JSON dentro de `data/` y se renderiza en el navegador con JavaScript. Sobre esa base hay un **panel de administración visual tipo constructor** en `/admin/editor.html` para que el cliente edite todo con su navegador: textos sobre la propia vista previa, imágenes, productos, orden de secciones y datos del local.

**Web:** <https://laboutiquecatydog.com.ar/>
**Panel visual:** `https://laboutiquecatydog.com.ar/admin/editor.html` *(requiere login con usuario y contraseña; ver [Panel visual de administración](#panel-visual-de-administración))*
**Panel avanzado (Sveltia):** <https://laboutiquecatydog.com.ar/admin/> *(respaldo para casos avanzados)*

---

## Cómo funciona el sitio (arquitectura)

```
data/sitio.json   ─┐
                   ├─►  js/render.js  ─►  HTML de header, <main> y footer
data/pagina.json  ─┘        │
                            ▼
                    js/main.js  ─►  interacciones (menú, carruseles, WhatsApp…)
```

1. `index.html` es solo un **esqueleto**: contiene el `<head>` (SEO, fuentes, JSON-LD) y contenedores vacíos para el header, `<main>`, el footer y el botón flotante de WhatsApp.
2. `js/main.js` carga los dos JSON con `fetch()`.
3. `js/render.js` construye el HTML de la página a partir de esos datos.
4. Luego se inicializan las interacciones.

**Consecuencia importante:** al cargar datos por `fetch()`, el sitio **no funciona abriendo `index.html` con doble clic** (`file://`): hay que servirlo por HTTP (ver [Abrir el sitio en local](#abrir-el-sitio-en-local)).

---

## Contenido del sitio

Una sola página con navegación por anclas. Los bloques y su orden se definen en `data/pagina.json`:

| Sección (bloque) | Elemento | Contenido |
|---|---|---|
| Portada (`hero`) | `#inicio` | Carrusel de fotos, título, y botones de WhatsApp y "Ver productos" |
| Categorías (`categorias`) | `#categorias` | Tarjetas **Perros** y **Gatos** (con imagen) que enlazan a Productos |
| Productos (`productos`) | `#productos` | Catálogo con **dos grupos de filtros** (mascota y categoría de producto), buscador, contador de resultados, **precio formateado**, productos **destacados** y **paginación automática** (bloques de 6, páginas y flechas que se generan solas) |
| Nosotros (`imagenTexto`) | `#nosotros` | Foto a un lado y texto + viñetas + botón al otro |
| Contacto (`contacto`) | `#contacto` | WhatsApp, redes, ubicación/mapa, horarios, teléfono y correo |
| Header | `.site-header` | Logo, menú, botón de WhatsApp |
| Footer | `.site-footer` | Marca, secciones, datos de contacto, redes y año dinámico |

**Funcionalidades:** menú móvil con overlay y scroll-spy, carruseles con teclado/touch/autoplay (pausa al enfocar o pasar el mouse), animaciones de aparición al hacer scroll, barra de progreso de scroll, título de portada con efecto de escritura **y revelado del resto del contenido en paralelo** (todo visible en ~0,5 s, título completo en ~1,6 s), enlaces de WhatsApp/Google Maps generados desde los datos, **catálogo con filtros por mascota y por categoría de producto (plegables con el botón «Filtros»), buscador casi en tiempo real que busca por contenido (título, descripción, precio, etiquetas, textos de fotos) sin depender de la categoría activa, contador, estado vacío, precio formateado y productos destacados** con repaginación anclada (sin salto de scroll al cambiar de página), secciones ocultables desde el panel (`oculto`), SEO dinámico desde `sitio.json` (título, descripción, Open Graph y JSON-LD `PetStore`), **acceso visible al panel: ícono de usuario en la esquina superior derecha** (el login sigue siendo obligatorio; el ícono no se dibuja dentro de la vista previa del editor) y **enlace de soporte** en el pie de la web (`estalingradocorp.com.ar/soporte/soporte.html`) y en el panel (barra superior y login → **WhatsApp directo** al número de soporte).

---

## Estructura

```
la-boutique-cat-y-dog/
├── index.html                  # Esqueleto: <head> (SEO, fuentes, JSON-LD) y contenedores
├── 404.html                    # Página de error 404 (GitHub Pages la sirve automáticamente)
├── privacidad.html             # Aviso de privacidad (Ley 25.326) — sin cookies ni analítica
├── terminos.html               # Términos y condiciones (responsable, precios, propiedad intelectual, reclamos)
├── LICENSE                     # Titularidad del software: © Estalingrado Corp + licencia de uso — NO se publica
├── manifest.json               # Datos de la app web (icono, colores, pantalla de inicio)
├── _config.yml                 # Config de Jekyll: EXCLUYE la documentación interna de la publicación
├── robots.txt                  # Qué puede indexar Google (excluye /admin/ y la doc interna)
├── sitemap.xml                 # Mapa del sitio (se envía en Search Console)
├── preview.cmd                 # Doble clic: servidor local + abre el SITIO en el navegador
├── "Abrir panel (local).cmd"   # Doble clic: servidor local + abre el PANEL VISUAL
├── README.md                   # Este archivo
├── BITACORA.md                 # Registro cronológico del proyecto
├── guias/
│   ├── INFORME-SEGURIDAD.md    # Auditoría de seguridad (presentable al cliente)
│   ├── ENTREGA-CLIENTE.md      # Guía de entrega + traspaso de cuentas + dominio propio + sección legal
│   ├── CONTRATO-LICENCIA-USO.md # Modelo en blanco del contrato de licencia de uso (NO se publica)
│   ├── AUTORIZACION-DOMINIO.md  # Carta de autorización para registrar/administrar el dominio (NO se publica)
│   └── ESTADO-ACTUAL.md         # Informe de estado para revisión: cómo está hecho, qué funciona, qué falta (NO se publica)
├── css/
│   └── styles.css              # Todos los estilos (variables, layout, componentes)
├── js/
│   ├── render.js               # Motor de render: data/*.json  →  HTML
│   ├── main.js                 # Datos, interacciones, paginación, SEO dinámico y BQPreview
│   └── config.js               # ⚠️ SIN USO (se conserva como referencia histórica)
├── data/
│   ├── sitio.json              # Datos globales + bloque "seo" editable
│   └── pagina.json             # Bloques/secciones de la portada, en orden
├── admin/
│   ├── index.html              # Redirect al editor visual (antes cargaba Sveltia)
│   ├── editor.html             # Panel visual (shell: vistas, topbar, modales)
│   ├── editor.css              # Estilos del panel
│   ├── editor.js               # Estado, GitHub API, lista, publicación, historial, copias
│   ├── editor-form.js          # Formularios por campo (textos + avanzados) + gestión de items
│   ├── editor-inline.js        # Edición directa sobre la vista previa (iframe)
│   └── editor-media.js         # Galería + subida optimizada de imágenes (BQMedia)
├── assets/
│   └── img/                    # Imágenes del sitio (subidas van acá) + og-image.jpg
└── tools/
    ├── serve.js                # Servidor estático local sin dependencias (Node)
    ├── actualizar-version.js   # Regenera el ?v= de CSS/JS (cache de Cloudflare) — correr tras tocar CSS/JS
    └── worker-editor.js        # Worker de Cloudflare extendido para el login del editor
```

> **Excluido del repo** (ver `.gitignore`): `Contenido Imagenes/` (26 MB de imágenes originales; las optimizadas ya están en `assets/img/`) y `_backup/` (copias de seguridad históricas de etapas previas).

> **Excluido de la publicación web** (ver `_config.yml`): `README.md`, `BITACORA.md`, `guias/`, `tools/`, `LICENSE` y los `*.cmd`. En producción esas rutas devuelven **404** y además están bloqueadas en `robots.txt`.

---

## Abrir el sitio y el panel en local

No hay dependencias ni paso de compilación, pero **sí hace falta un servidor** porque el contenido se carga con `fetch()`.

**Windows (lo más fácil):**

- Sitio web: doble clic en **`preview.cmd`** → abre <http://localhost:8080/>.
- Panel visual: doble clic en **`Abrir panel (local).cmd`** → levanta el servidor (si no estaba) y abre <http://localhost:8080/admin/editor.html>.

**Manual (cualquier sistema):**

```bash
# Node (incluido en este repo, sin dependencias)
node tools/serve.js . 8080
# o con cualquier otro servidor estático
python -m http.server 8080
npx serve .
```

Luego visitá `http://localhost:8080` (web), `http://localhost:8080/admin/editor.html` (panel visual) o `http://localhost:8080/admin/` (Sveltia).

> **No uses `file://`** (abrir `index.html` con doble clic): el navegador bloquea `fetch()` de archivos locales y verás el mensaje *"No se pudo cargar el contenido"*.

---

## Cómo editar el contenido

Hay **dos formas**, según quién edite:

### 1. Para el cliente — Panel visual (la única herramienta)

Se edita **todo** con el navegador, sin tocar código: textos, fotos, productos, precios, orden de secciones, datos del local, SEO, y hasta los campos técnicos (en «Campos avanzados»). Entrada: `/admin/editor.html` (ver [Panel visual de administración](#panel-visual-de-administración)). El panel antiguo (Sveltia) fue retirado: todo está integrado en el editor visual.

### 2. Para el desarrollador — Archivos JSON directamente

Todo el contenido está en dos archivos. Se editan con cualquier editor de texto y el sitio se republica solo al hacer commit.

#### `data/sitio.json` — datos globales

| Clave | Para qué sirve |
|---|---|
| `marca` | Logo (`logo`, `logoAlt`), nombre (`nombre`, `nombreSecundario`) y etiqueta accesible (`ariaLabel`) |
| `negocio.whatsapp` | Número internacional **sin `+`, espacios ni guiones** (ej.: `543874578676`) |
| `negocio.whatsappDisplay` | El mismo número como se muestra (ej.: `+54 9 387 457-8676`) |
| `negocio.whatsappMensaje` | Mensaje inicial de la conversación de WhatsApp |
| `negocio.phone` | Teléfono fijo/alternativo. **Vacío = se oculta** |
| `negocio.email` | Correo de contacto. **Vacío = se oculta** |
| `negocio.address` | Dirección del local. **Vacía = se oculta** |
| `negocio.hours` | Horarios. **Vacío = se oculta** |
| `negocio.mapsQuery` | Coordenadas `lat,lng` o dirección para el botón "Cómo llegar" |
| `negocio.carouselDelay` | Milisegundos entre fotos del carrusel (3000 = 3 s) |
| `redes` | `instagram`, `tiktok`, `facebook`, cada una con `url` y `etiqueta` |
| `nav` | Lista del menú: `texto` + `ancla` (ej.: `#productos`) |
| `navCtaTexto` | Texto del botón de WhatsApp del menú |
| `footer` | Descripción, títulos de columnas, `ordenSocial`, `whatsappTexto`, `copyright` y **`empresaUrl`** (enlace de la empresa en el pie; si está vacío, el copyright queda como texto plano) |

#### `data/pagina.json` — secciones de la portada

Es una lista `secciones`. **El orden de la lista es el orden en la web.** Cada sección tiene un `tipo` y campos propios:

| `tipo` | Qué renderiza | Campos principales |
|---|---|---|
| `hero` | Portada con carrusel | `id`, `aria`, `eyebrow`, `titulo`, `texto`, `botonPrincipal`, `botonSecundario`, `carruselAria`, `slides[]` |
| `categorias` | Dos tarjetas (Perros/Gatos) | `id`, `eyebrow`, `titulo`, `intro`, `ctaTexto`, `tarjetas[]` |
| `productos` | Galería con filtros | `id`, `eyebrow`, `titulo`, `intro`, `mostrarFiltros`, `buscador`, `categoriasProducto[]` (id + título), `ctaTexto`, `productos[]` |
| `imagenTexto` | Foto + texto | `id`, `eyebrow`, `titulo`, `texto`, `vinetas[]`, `imagen`, `imagenAlt`, `boton` |
| `contacto` | Datos de contacto | `id`, `eyebrow`, `titulo`, `intro`, `botonWhatsapp`, `botonMapsTexto`, `ordenSocial` |

**Detalle de campos con reglas especiales:**

- **`titulo` del `hero`** admite marcado mínimo: `**palabra**` la pone en color de acento y `*palabra*` en cursiva. En el resto de los campos el texto es plano.
- **`categorias.tarjetas[].id`**: identificador estable de cada tarjeta (mascota). Lo usan los filtros y las casillas «Para qué mascotas». El texto visible es el `titulo`.
- **`productos[].mascotas`**: es una **lista de ids** (`["perros","gatos"]`), no un texto. Define en qué filtro de mascota aparece la tarjeta; vacía = aplica a todas.
- **`productos[].categorias`**: lista de ids de `categoriasProducto` (p. ej. `["alimentos"]`). Un producto puede llevar varias; vacía = sin filtro de categoría.
- **`productos[].destacado`**: `true` = sale primero en la grilla, con aro de color y etiqueta «Destacado».
- **`productos[].precio`** (opcional): **texto libre**. Si queda vacío, el precio **no se muestra**. Si es un número, se formatea con miles (`12000` → `$12.000`); si es texto («Consultar») se muestra tal cual.
- **`categoriasProducto[]`** (en la sección de productos): la lista administrable de categorías del catálogo. Sus `id` alimentan los filtros de la web y las casillas «Categorías de producto» de cada producto.
- **`slides[].ancho` / `alto`**, **`tarjetas[].ancho` / `alto`**, **`imagenAncho` / `imagenAlto`**: opcionales. Ayudan a reservar el espacio de la imagen y evitar saltos de layout. El CSS fija la geometría con `aspect-ratio` + `object-fit`, así que **ocultarlos o dejarlos vacíos no deforma las imágenes**.
- **`slides[].srcset` / `sizes`**: opcionales, para servir la variante `-900` en pantallas chicas. En el panel figuran como campos ocultos.
- **`slides[].prioridad`**: reservado para marcar la primera foto como carga prioritaria.

**Regla general:** cualquier campo de texto vacío (`""`) **no se muestra**; los botones y tarjetas asociados se ocultan automáticamente para no enlazar a destinos vacíos. Las imágenes se guardan en `assets/img/`.

---

## Panel visual de administración

`/admin/editor.html` es un **editor tipo constructor de páginas** hecho a medida, sin frameworks: lista de secciones + vista previa en vivo del sitio (un `iframe` del sitio real) + edición **directa sobre la vista previa**.

### Qué se puede hacer

| Acción | Cómo |
|---|---|
| Editar cualquier texto | Clic sobre el texto en la vista previa (títulos, párrafos, botones, menú, pie, viñetas, productos) y escribir encima. También en el modo «Textos» con formularios |
| Cambiar una imagen | Clic sobre la foto en la vista previa → galería del repo o subir una nueva |
| Subir imágenes | Pestaña «Subir desde la PC»: canvas la optimiza (JPEG 82 %, máx. 1600 px + variante `-900` cuando el campo la usa; el logo mantiene PNG). Va al repo en **un solo commit por imagen** (Git Data API). En modo local se escribe en `assets/img/` de la carpeta |
| Elegir varias imágenes de una vez | En la galería se tocan las fotos (✓) y se confirma con el contador + botón junto a «Subir desde la PC»: cada una pasa por el **editor de recorte** (proporción, zoom 25–400 %, arrastre) una por una y al terminar **se agregan todas** como fotos/slides nuevas en la misma lista |
| Editar una foto ya subida | En la ventana de producto, el **lápiz ✎** abre el editor de recorte con la foto existente (antes solo desplegaba datos; esos están ahora en **«···»**) |
| Agregar / quitar / reordenar secciones | Lista de la izquierda: drag & drop, ↑ ↓, ocultar (ojo), duplicar, eliminar, «+ Agregar sección» |
| Agregar / quitar / reordenar productos | En el formulario («+ Agregar producto», «Quitar este producto») o con la insignia ✕ que aparece sobre el producto en la vista previa |
| Clasificar productos | En la ventanita de cada producto: **«Para qué mascotas»** (Perros / Gatos, con botón «Todos») y **«Categorías de producto»** (Alimentos, Descanso, Transporte, Accesorios, Juguetes… con botón «Ninguna»). Ambas se eligen con casillas y un producto puede llevar varias |
| Administrar las categorías del catálogo | En la sección **Productos** (modo «Textos») está el bloque **«Categorías de producto»** como píldoras —las mismas que ve la gente debajo del buscador—: «+ Nueva categoría», renombrar escribiendo en la píldora, reordenar con ↑ ↓ que aparecen al pasar el mouse, borrar con ✕. Al borrar una categoría, los productos que la usaban la pierden; al renombrarla no se rompe nada |
| Destacar productos | Interruptor **«Destacado (se muestra arriba de todo)»** por producto (fila completa, alineado): los destacados salen primero en la grilla, con aro de color y etiqueta «Destacado» |
| Fotos de productos y carrusel | Agregar, quitar, reordenar y reemplazar fotos por producto y por slide del carrusel. En la ventana de producto, los campos siempre van en el mismo orden (categorías y destacado antes que las fotos) |
| Datos del local | Pestaña «Datos del local»: WhatsApp, dirección, horarios, redes, menú, pie (edita `data/sitio.json`). Las **redes sociales también se editan en el modo «Textos»** de la sección Contacto, sin cambiar de pestaña |
| Volver atrás | **Deshacer/rehacer** tipo Word: flechas ↶ ↷ en la barra superior, `Ctrl+Z` / `Ctrl+Y` (también con el foco en la vista previa). Historial de hasta 60 pasos |
| Recuperar algo ya publicado | **Historial de versiones** (ícono de reloj): lista las últimas versiones publicadas de cada archivo con fecha y mensaje; «Restaurar» carga la versión **como borrador** para revisarla en la vista previa — nada se publica solo y la restauración es deshacible |
| Copias de seguridad | Ícono de copias: copias locales del contenido en el navegador (hasta 15). Se guarda una **automática antes de cada publicación**; también manuales, **descargables a un archivo** y se pueden **subir desde archivo**. Restaurar carga como borrador |
| Campos avanzados | Todo lo que antes hacía el panel antiguo, integrado: `id`/anclas (con advertencia), `srcset`/`sizes`/medidas/prioridad en cajas plegables |
| SEO | En «Datos del local», bloque **SEO** con título y descripción (con pistas de longitud). JSON-LD con URLs absolutas, horarios leídos de los datos, `url`, `logo`, `priceRange` |
| Publicar | Botón «Publicar cambios» → 1 commit por archivo que haya cambiado (portada y/o datos del local). En ~1 min está en la web |
| Ayuda integrada | Botón **«?»** en la barra superior: guía corta y clara de todo el panel (textos, fotos, productos, publicar, deshacer, sesión) |

**Modelo de datos del editor:** los cambios viven como **borrador** en el navegador (borrador automático en `localStorage`, se recupera al volver a entrar) hasta «Publicar cambios» o «Descartar». La **única excepción** es la subida de imágenes nuevas, que se commitea en el momento (una imagen en borrador no tiene sentido). Si el archivo cambió en GitHub mientras editabas (p. ej. desde Sveltia), al publicar se detecta el conflicto y se ofrece recargar o quedarse con el borrador. **Los borradores viejos se migran solos al abrir el panel** (`migrarDatos()`): un borrador anterior a las categorías recupera el bloque y las casillas en vez de ocultarlas, y queda marcado como borrador para revisarlo antes de publicar. En **modo local**, «Guardar en esta carpeta» escribe `data/*.json` en disco y la web local refleja los cambios al recargar.

### El catálogo: categorías, filtros y destacados

La sección **Productos** de la web es un catálogo con **dos grupos de filtros** (mascota y categoría de producto), **buscador**, **contador de resultados** y **estado vacío**. Todo sale del modelo, así que el panel manda y la web se arma sola:

| Dato | Dónde se edita | Qué hace |
|---|---|---|
| `categorias.tarjetas[]` (id + título) | Sección **Categorías**: cada tarjeta es una mascota (Perros, Gatos…) | Sus `id` alimentan el filtro de mascota y las casillas «Para qué mascotas» de cada producto |
| `categoriasProducto[]` (id + título) | Sección **Productos** → bloque «Categorías de producto» | Sus `id` alimentan el filtro de categoría de producto y las casillas «Categorías de producto» de cada producto |
| `producto.mascotas[]` | Ventanita del producto → «Para qué mascotas» | A qué mascotas aplica el producto (vacío = todas) |
| `producto.categorias[]` | Ventanita del producto → «Categorías de producto» | Categorías del producto (puede tener varias) |
| `producto.destacado` | Ventanita del producto → «Destacado» | Sale primero en la grilla, con aro y etiqueta |
| `producto.precio` | Ventanita del producto → «Precio (opcional)» | Número → se formatea (`12000` → `$12.000`); texto → se muestra tal cual («Consultar») |

**Cómo se agrupan los productos:** una categoría **no** contiene productos: es una **etiqueta** que se le pone a cada producto. Si el negocio sube tres marcas de alimento, son tres productos independientes y los tres llevan la etiqueta «Alimentos»; el filtro «Alimentos» de la web los muestra juntos sin tocar nada más.

**Reglas de combinación de filtros:** entre grupos va **Y** (mascota **y** categoría) y dentro de un grupo va **O** (perros **o** gatos). «Todos» / «Todas» = ese grupo no filtra.

**Detalles de implementación:**
- Las tarjetas de la sección Categorías llevan un `id` estable (`perros`, `gatos`). Si el cliente renombra una tarjeta y ningún producto la usa, el `id` se rehace solo; si ya hay productos apuntando a él, se respeta para no romper los filtros.
- La web ordena los destacados primero, pero cada tarjeta conserva su índice real (`data-producto`) para que la edición directa en la vista previa del panel siga editando el producto correcto aunque cambie el orden.
- La selección múltiple del panel es un **widget de píldoras** (`opciones-multiple`) que lee sus opciones del modelo; si no hay tarjetas de categorías, avisa en vez de fallar.

### Piezas

| Pieza | Rol |
|---|---|
| `admin/editor.html` + `editor.css` | Shell del panel: login, carga, topbar, pestañas, lista, vista previa, modales |
| `admin/editor.js` | Estado, API de GitHub, lista de secciones, borradores, publicación |
| `admin/editor-form.js` | Constructor de formularios a partir del JSON (reglas por campo, listas, items) |
| `admin/editor-inline.js` | Edición in situ en la vista previa: marca los textos editables, contenteditable, reconstruye `**negritas**` del hero, controla clic/foco/Escape |
| `admin/editor-media.js` | Selector de imágenes: galería (API) + subida optimizada con canvas |
| `tools/worker-editor.js` | Worker de Cloudflare **extendido** para el login del editor (el original de Sveltia sigue intacto para `/admin/`). El Worker desplegado (`nicotips27`) acepta login con usuario y contraseña (`ADMIN_USER`/`ADMIN_PASS` solo en Cloudflare) y devuelve el token de GitHub guardado como secreto |
| Cloudflare Worker `sveltia-cms-auth` | Solo gestiona el login con GitHub (OAuth). Modo `client=editor` redirige de vuelta al panel con el token en el fragmento (`#`), que nunca viaja a un servidor |
| OAuth App de GitHub / secreto `GITHUB_TOKEN` | El token de GitHub queda en el Worker (el cliente no necesita cuenta de GitHub) |

### Flujo de login (panel visual)

1. En `/admin/editor.html`, clic en **«Entrar con usuario y contraseña»**.
2. Se navega (misma pestaña) al Worker con `provider=password`, `site_id=<dominio>`, `client=editor` y `redirect=<URL del panel>`.
3. El Worker valida el dominio contra `ALLOWED_DOMAINS` y compara usuario/contraseña con los secretos `ADMIN_USER`/`ADMIN_PASS` (comparación de tiempo constante).
4. Si coinciden, el Worker entrega el token de GitHub que guarda como secreto `GITHUB_TOKEN` y **redirige al editor** con `#access_token=…`.
5. El editor guarda el token en `sessionStorage` (vive en esa pestaña; «Salir» lo borra) y opera contra la API de GitHub.

También hay un **respaldo con token personal** (avanzado) para el caso en que el login fallé.

> ⚠️ Si las credenciales no coinciden, el Worker responde `401` con cuerpo vacío → **página en blanco** sin mensaje. Revisar mayúsculas y espacios. (El modo local, abajo, no necesita este login.)

### Modo local (sin login, sin GitHub)

En `localhost` / `127.0.0.1` el panel entra directo en **modo local**: lee `data/*.json` de la carpeta, muestra «Modo local (sin publicar)» y no usa el Worker ni GitHub. El botón pasa a **«Guardar en esta carpeta»** (escribe los JSON vía `POST /__local/guardar` del servidor local, solo esos dos archivos) y **la galería/subida de imágenes también es local** (`GET /__local/imagenes`, `POST /__local/subir-imagen` → `assets/img/`). La web local refleja todo al recargar. Publicar en internet sigue haciéndose desde el dominio publicado.

### Variables de entorno del Worker (Cloudflare → Production)

| Variable | Valor | ¿Secret? |
|---|---|---|
| `GITHUB_CLIENT_ID` | Client ID de la OAuth App | No |
| `GITHUB_CLIENT_SECRET` | Client Secret de la OAuth App | **Sí** |
| `ALLOWED_DOMAINS` | `laboutiquecatydog.com.ar, www.laboutiquecatydog.com.ar, laboutiquecatydog.github.io, localhost` — **`localhost` a secas** (el patrón se aplica al *hostname*, sin puerto; el comodín `localhost*` NO matchea) | No |

> Los nombres deben escribirse **exactos, en inglés y en mayúsculas**. Cloudflare suele traducir los nombres a español (p. ej. `ID_CLIENTE_GITHUB`) y entonces el Worker no los encuentra.
> El código a pegar en Cloudflare es `tools/worker-editor.js` (versión del worker oficial `sveltia-cms-auth` + modo editor; el flujo de Sveltia queda intacto).

### Sobre Sveltia CMS (retirado)

El proyecto arrancó con **Sveltia CMS** en `/admin/` como primer panel. Todo lo que hacía quedó integrado en el editor visual (formularios completos + «Campos avanzados»), así que se retiró: `admin/index.html` ahora solo redirige al editor y `admin/config.yml` se eliminó. El Worker de Cloudflare conserva el nombre `sveltia-cms-auth` porque maneja el login de ambos (y el de Sveltia sigue funcionando por si algún día hiciera falta restaurarlo desde el historial de git).

---

## Despliegue (GitHub Pages)

El sitio es 100 % estático y se publica como **sitio de usuario**: el repositorio `laboutiquecatydog.github.io` se sirve desde la rama `main` (raíz), sin build.

- **URL publicada:** <https://laboutiquecatydog.com.ar/>
- URL anterior (redirige 301 al dominio propio): <https://laboutiquecatydog.github.io/>
- Repositorio: `https://github.com/laboutiquecatydog/laboutiquecatydog.github.io`
- Configuración: **Settings → Pages → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`; **HTTPS activado**.
- **Dominio propio:** `laboutiquecatydog.com.ar` (registrado en NIC.ar **a nombre del desarrollador por ahora**, DNS en Cloudflare). GitHub Pages genera el archivo `CNAME` con el dominio personalizado; no hay que borrarlo ni editarlo. En Cloudflare hacen falta **dos** registros CNAME → `laboutiquecatydog.github.io`: uno del **ápex** (`@`) y otro de **`www`** (ambos proxied). Always Use HTTPS activado.

Para actualizar, subí los cambios a `main` y Pages reconstruye automáticamente. Esto aplica también a los cambios que hace el panel: cada guardado es un commit y el sitio se republica.

### ⚠️ Versionado de assets (importante al tocar CSS o JS)

Cloudflare y los navegadores **cachean los `.js` y `.css` hasta 4 horas** (`cache-control: max-age=14400`). Si se sube código nuevo sin cambiar la URL, los visitantes siguen viendo la versión anterior: el sitio queda con **datos nuevos y código viejo** (por ejemplo, los filtros del catálogo no aparecen aunque los datos estén bien).

Por eso los CSS/JS se referencian con un `?v=`:

```html
<link rel="stylesheet" href="css/styles.css?v=c1c7c0ed" />
<script src="js/render.js?v=c1c7c0ed"></script>
```

**Regla:** después de cambiar `css/styles.css`, `js/render.js`, `js/main.js` o cualquier archivo de `admin/`, corré:

```bash
node tools/actualizar-version.js
```

Calcula un hash corto del contenido de esos archivos y reescribe el `?v=` en `index.html` y `admin/editor.html` (es idempotente: si nada cambió, no toca nada). **Commiteá el `index.html`/`admin/editor.html` junto con el código nuevo.**

Los **datos** (`data/pagina.json`, `data/sitio.json`) no tienen este problema: `js/main.js` los pide con `cache: "no-store"`, así que el panel publica y el contenido se ve al instante.

---

## Imágenes

- Todo lo que se muestra está en `assets/img/`, ya **optimizado** (JPG + variantes `-900` para pantallas chicas).
- Las imágenes subidas desde el panel van directo a **`assets/img/`** (un commit por imagen, con `srcset`/medidas autogenerados).
- `assets/img/og-image.jpg` (1200×630): imagen dedicada para previews de WhatsApp/redes (Open Graph / Twitter Cards).
- Las **versiones originales de alta resolución** están en `Contenido Imagenes/` y **no se publican ni se versionan** (26 MB).
- Las imágenes de las tarjetas de categorías —`assets/img/seccion-perros.jpg` (1280×720) y `assets/img/seccion-gatos.jpg` (1280×698)— son **copias optimizadas** de los originales en `Contenido Imagenes/Secciones/`.
- Favicon en SVG (`assets/img/favicon.svg`) e icono para iOS (`assets/img/apple-touch-icon.png`).

---

## SEO y accesibilidad

**Metadatos y posicionamiento:**
- `robots.txt` (excluye `/admin/` y archivos internos) y **`sitemap.xml`** en la raíz — este es el que se envía en Search Console para pedir la indexación.
- Título y descripción **editables desde el panel** (bloque `seo` en `data/sitio.json`, con pistas de longitud: título ≤ 60, descripción ≤ 155 caracteres) y aplicados en vivo por `updateSEO()`.
- **Datos estructurados** JSON-LD de tipo `PetStore` regenerados con los datos reales: URLs absolutas, `url`, `logo`, `image`, `priceRange`, `@id`, **horarios leídos de `negocio.hours`** (no hardcodeados), dirección, geolocalización (`geo` + `hasMap`) y `sameAs` con las redes.
- Open Graph y Twitter Cards con `og-image.jpg` dedicada.
- Textos del contenido con intención local (Salta) en título, descripción, portada, contacto y pie.

**Accesibilidad:**
- `<html lang="es">`, encabezados jerárquicos, `alt` descriptivos, navegación con `aria-label`, botones con `aria-expanded`/`aria-controls`, y foco visible.
- Colores con contraste sobre fondos claros; el sitio es responsive (móvil/tablet/desktop) y respeta `prefers-reduced-motion`.

**Pendiente de SEO (fuera del código):** verificar en **Google Search Console** (enviar el sitemap y pedir indexación) y crear/reclamar la ficha de **Google Business Profile** — el factor #1 para búsquedas locales como "pet shop cerca mío". Guías paso a paso cuando el cliente esté listo.

---

## Seguridad

Auditoría completa (24/10/2026, 3/11/2026 y **8/11/2026** con pruebas de exploit simulado) — ver el informe detallado en **`guias/INFORME-SEGURIDAD.md`**. Síntesis:

- **XSS por contenido**: todos los textos del JSON se escapan al renderizar; los enlaces editables se sanitizan (`hrefSeguro`: solo `#`, rutas internas, `https:`, `mailto:`, `tel:` — `javascript:` queda en `#`). Probado con batería de 25+ payloads en todos los campos: 0 ejecuciones.
- **CSP activa** en sitio y panel (meta tag): bloquea scripts inline/externos no autorizados manteniendo todo funcional (verificado: 0 violaciones en consola).
- **Token de sesión**: OAuth por Worker de Cloudflare, vive solo en `sessionStorage`, nunca en la URL ni en localStorage, y se envía exclusivamente a `api.github.com` (verificado con instrumentación de red).
- **Servidor local**: blindado contra path traversal (10 variantes probadas, todas 403) + `nosniff`; solo escucha en 127.0.0.1.
- **Login**: contraseñas nunca tocan el sitio (GitHub OAuth); dominios validados en el Worker; cookies del flujo `HttpOnly` + `SameSite=Lax` + `Secure`.
- **Alcance del OAuth reducido**: el Worker desplegado pide `public_repo` + `user` (verificado el 3/11/2026), no `repo` — el cliente no autoriza el acceso a sus repositorios privados.
- **Repositorio público**: el código, los textos y el historial **son públicos** (GitHub Pages en plan gratuito lo exige). Lo único protegido es **quién puede publicar**: el panel exige permiso `push` y GitHub rechaza la escritura de cualquier otra cuenta. Hoy hay dos cuentas con escritura: la del cliente (dueño) y la del desarrollador (colaborador, sin ser admin).
- **Documentación interna oculta**: bitácora, README, guías, código del Worker y scripts `.cmd` están excluidos de la publicación (`_config.yml`) y bloqueados en `robots.txt` → responden **404** en producción.
- Recomendación para el cliente: **2FA en la cuenta de GitHub** (la única llave del negocio).

---

## Problemas conocidos

Estado honesto de lo que está funcionando y lo que no. El detalle completo, con el plan de arreglo, está en **`guias/ESTADO-ACTUAL.md`** (informe para revisión del CEO).

| Problema | Qué pasa | Impacto | Estado / qué hacer |
|---|---|---|---|
| **Borrador viejo en el navegador** | El panel recuperaba el borrador local (`localStorage`) **tal cual**, sin adaptarlo al formato actual: con un borrador anterior a las categorías, **no aparecía el bloque «Categorías de producto»** (y publicar desde ahí pisaba el catálogo nuevo sin aviso) | Alto | **Resuelto el 2026-11-08**: `migrarDatos()` adapta borradores, versiones y copias al abrir el panel; queda marcado como borrador para revisar antes de publicar |
| **Login del Worker en blanco** | Si las credenciales no coinciden, el Worker responde `401` con cuerpo vacío → **página en blanco** sin mensaje (en el dominio publicado) | Medio | **Abierto**: el Worker está fuera de este repo. El modo local lo rodea para probar; convendría que el Worker devuelva el formulario con mensaje de error |
| **Caché de Cloudflare** | Los `.js`/`.css` se cachean 4 h: con código viejo y datos nuevos la web «no cambia» | Medio | **Mitigado** con `?v=<hash>` (ver la sección «Versionado de assets») |
| **CSRF local (resuelto)** | Los endpoints `/__local/*` del servidor local aceptaban `POST` sin validar origen ni tipo: cualquier web visitada podía escribir archivos mientras corre `preview.cmd` (y subir SVG con script) | Medio | **Resuelto el 2026-11-08**: se exige origen local + `Content-Type: application/json`, y `svg` ya no se sube. Detalle en `guias/INFORME-SEGURIDAD.md` |
| **XSS vía `empresaUrl` (resuelto)** | La huella legal del pie usaba solo escape de comillas, sin validar el esquema: un `javascript:…` en ese dato ejecutaba script al hacer clic | Medio | **Resuelto el 2026-11-08**: ahora usa `hrefSeguro()` como el resto de las URL |
| **Worker `401` en blanco** | Si las credenciales no coinciden, el Worker responde `401` vacío → página en blanco sin mensaje (login publicado) | Bajo | **Abierto**: el Worker está fuera de este repo. El modo local lo rodea para probar; convendría que devuelva el formulario con mensaje de error |
| **Caché del navegador** | El HTML se cachea 10 min | Bajo | Normal: un **Ctrl+F5** alcanza |
| **Sin analítica de visitas** | Cloudflare Web Analytics está apagado a propósito (su beacon no carga por la CSP y el aviso de privacidad declara que no hay cookies ni analítica) | Bajo | Decisión coherente con el aviso. Si se quiere medir tráfico, hay que elegir entre un medidor sin cookies o actualizar aviso + CSP |
| **Resolución de `assets/img/local.jpg`** (449×660) | Puede verse baja como fondo | Bajo | Pendiente del próximo pase de fotos |
| **Encuadre de las fotos de producto** | No se hizo un repaso fino de los recortes | Bajo | Pendiente de calidad visual |

---

## Detalles técnicos

- **Sin frameworks ni dependencias** (solo Google Fonts por CDN): sin `node_modules`, sin build, sin sorpresas al desplegar.
- **JavaScript ES5 estricto** (`var`, funciones, sin flechas ni *template literals*) dentro de IIFEs con `"use strict"`.
- **Escapado de seguridad** en `js/render.js`: los textos se escapan (`&`, `<`, `>`; comillas en atributos). El cliente **nunca** inyecta HTML crudo; solo `**negrita**` y `*cursiva*` generan marcado, y únicamente en el título del hero.
- **Render por strings**: `js/render.js` concatena HTML en lugar de usar plantillas, para no añadir dependencias.
- **`js/config.js` ya no se usa**: los datos se migraron a `data/*.json`. El archivo se conserva como referencia.

---

## Estado del proyecto

Sitio publicado en GitHub Pages con el contenido en JSON. **Todo el rediseño de la landing y el panel visual (W1–W5) están en producción**, y el 3/11/2026 se publicó una auditoría de seguridad/UX con sus correcciones (commit `1006ac6`).

> **Informe de estado para revisión:** `guias/ESTADO-ACTUAL.md` — qué es el proyecto, cómo está hecho, cómo funciona, **qué se verificó** (con los números de las pruebas), **problemas conocidos** y pendientes por área. Es el documento para leer antes de la entrega.

| Etapa | Cambio | Estado |
|---|---|---|
| Portada / responsive / CSS | Hero en dos columnas, ajustes móviles, tokens de diseño | Publicado |
| **G1 — contenido a JSON** | Todo el contenido pasó a `data/*.json` con `js/render.js` (verificado A/B) | Publicado |
| **G2 — panel Sveltia** | `/admin/` con login GitHub vía Cloudflare Worker; campos de texto opcionales (`required: false`) | Publicado |
| **G3 — rediseño estético** | Typewriter del título (con watchdog), reveal escalonado, barra de progreso, SEO dinámico desde JSON, sección de productos rediseñada | Publicado |
| **W1 — editor visual** | Login, lista de secciones (reordenar/ocultar/duplicar/eliminar/agregar), vista previa, publicación por commits; Worker extendido (`client=editor`) | Publicado + Worker desplegado |
| **W2 — textos y datos** | Formularios por campo + pestaña «Datos del local» (`sitio.json`), publicación de ambos archivos | Publicado |
| **W2.5 — edición en la vista** | Edición in situ sobre la vista previa (`contenteditable`), re-render con los datos del editor, flag `oculto` respetado por el render | Publicado |
| **W3 — imágenes** | Galería del repo + subida optimizada (1600/900, JPEG 82 %), alta/baja/reorden de productos y fotos, cambio de logo | Publicado |
| **W4a — catálogo y control** | Paginación automática del catálogo (6 por página, filtros coordinados), quitar producto desde la vista previa | Publicado |
| **W4b — deshacer y conflictos** | Deshacer/rehacer (historial de instantáneas, `Ctrl+Z`/`Ctrl+Y` + botones), chip que refleja la diferencia real con lo publicado, chequeo de conflictos pre-publicación (SHA en GitHub vs. local) con opciones claras | Publicado |
| **W4c — seguridad total** | Flechas tipo Word (íconos ↶ ↷), atajos activos también dentro de la vista previa, e **Historial de versiones**: restaurar versiones publicadas desde el historial de commits (carga como borrador, deshacible) | Publicado |
| **W5a — SEO/GEO técnico** | `robots.txt` + `sitemap.xml`, bloque **`seo`** editable desde el panel (título/descripción con pistas), JSON-LD con URLs absolutas + `url`/`logo`/`priceRange`/`@id` + **horarios leídos de los datos**, `og-image.jpg` 1200×630, textos con intención local (Salta) | Publicado |
| **W5b — editor único** | **Sveltia retirado**: todo integrado en el editor visual (campos avanzados plegables, `id` editable con advertencia); `/admin/` redirige al editor; `config.yml` eliminado | Publicado |
| **W5c — copias + robustez** | **Copias de seguridad** en el navegador (auto antes de publicar, manuales, descargar/subir archivo, restaurar como borrador); la vista previa refleja reordenar/ocultar/agregar en vivo; `.gitignore` con `graphify-out/` | Publicado |
| **W5d — cierre** | Push general a producción, smoke test, guías de Search Console + Google Business Profile, guía del cliente | Publicado |
| **Auditoría 2026-11-03** | Seguridad (documentación interna ocultada), estabilidad (5 bugs del panel), UX (autoplay del hero, `noscript`, foco de modales, errores en español), imágenes optimizadas (−760 KB), `404.html` / `privacidad.html` / `manifest.json` | Publicado (`1006ac6`) |
| **Huella legal 2026-11-05** | `terminos.html` publicada, `LICENSE` (titularidad de Estalingrado Corp, no se publica), pie con links legales y "Desarrollo y operación: Estalingrado Corp", modelo de contrato de licencia de uso y autorización de dominio (internos) | Publicado |
| **Panel y catálogo 2026-11-06** | Rediseño del panel en modo «Textos» (productos como íconos + ventana de edición), corrección del aviso de privacidad y **catálogo con categorías**: categorías de producto administrables, filtros por mascota y por categoría, buscador, contador, estado vacío, precio formateado y productos destacados | Publicado (`02b75ce`) |
| **Cache de Cloudflare 2026-11-06** | Versionado de assets (`?v=<hash>`) + `tools/actualizar-version.js`: evita que la web sirva JS/CSS viejos con datos nuevos | Publicado (`2391b8f`) |
| **Huella legal como enlace 2026-11-07** | El copyright del pie es un enlace a `https://estalingradocorp.com.ar/` (pestaña nueva, `rel="noopener"`), con campo editable «Enlace de la empresa (pie)» en el panel | Publicado (`60b6302`) |
| **Documentación 2026-11-07** | `guias/ESTADO-ACTUAL.md` (informe de estado para revisión del CEO: cómo está hecho, cómo funciona, verificaciones, problemas y pendientes) + actualización de README, bitácora y guía de entrega | Publicado |
| **Migración a Estalingradocorp 2026-11-07** | Repo espejo en `Estalingradocorp/laboutiquecatydog.github.io`, dominio en Cloudflare `nicotips27`, panel con login de usuario/contraseña (token oculto en el Worker) | Publicado |
| **Acceso visible + modo local 2026-11-08** | Ícono de usuario (fuera el truco de 3 clics), modo local sin login (Guardar en esta carpeta, galería y subida locales), migración automática de borradores viejos, píldoras de categorías, selección múltiple de imágenes, redes en Textos, paginación anclada, tipografía de precios, aviso auto-ocultable | Publicado |
| **Editor de recorte + pulido 2026-11-08** | Recorte con zoom 25–400 % y proporciones antes de subir (también desde la galería, una por una), lápiz para editar la foto existente, orden fijo de campos en la ventana de producto, «Destacado» alineado, zoom de tarjetas contenido en el marco, buscador sin doble «✕», botones «Consultar disponibilidad» minimalistas | Publicado |
| **Botón «Filtros» + soporte 2026-11-08** | Botón minimalista que pliega/despliega los filtros del catálogo (conservando la selección; por defecto plegados); ícono/enlace de **soporte** (`estalingradocorp.com.ar/soporte/soporte.html`) en el pie de la web, en la barra del panel y en el login | Publicado |
| **Ajustes del panel 2026-11-08** | Al agregar un producto se limpia el buscador del panel (el nuevo no queda oculto); «Recortar y subir» sube en un paso (antes pedía un segundo clic); zoom de recorte desde 25 %; el panel publicado pregunta antes de aplicar un borrador que difiere de lo publicado | En esta publicación |
| **Auditoría de seguridad 2026-11-08** | CSRF local cerrado (origen + Content-Type + sin `svg`), XSS vía `empresaUrl` cerrado; informe completo en `guias/INFORME-SEGURIDAD.md` | En esta publicación |

---

## Pendientes / TODO

- [x] ~~Migrar los borradores antiguos al abrir el panel~~ → **hecho el 2026-11-08**: `migrarDatos()` adapta borradores, versiones restauradas y copias al formato actual (categorías, `mascotas[]`, `categorias[]`, `destacado`, sin `etiqueta`); queda marcado como borrador para revisar antes de publicar.
- [ ] **Search Console (con el dominio nuevo):** crear la propiedad de tipo **Dominio** para `laboutiquecatydog.com.ar` (verificación con un registro **TXT** que da Google → se agrega en Cloudflare DNS), enviar `https://laboutiquecatydog.com.ar/sitemap.xml` y pedir la indexación de la portada. La propiedad anterior (`https://laboutiquecatydog.github.io/`) ya no sirve: esa URL redirige al dominio propio. Procedimiento en `guias/ENTREGA-CLIENTE.md` (sección 10).
- [ ] **Google Business Profile:** alta y reclamo de la ficha del local (nombre, dirección, teléfono, horarios, fotos, categoría "Tienda de mascotas") → es el factor #1 para búsquedas locales del tipo "pet shop cerca mío". La verificación puede tardar días o semanas.
- [ ] **Guía del cliente:** video o PDF corto con la rutina del panel (entrar → editar → publicar).
- [ ] **Transferir el dominio a nombre del cliente:** hoy `laboutiquecatydog.com.ar` está a nombre del desarrollador. Requiere el **CUIT del cliente** (transferencia en NIC.ar: $8.500, el destinatario tiene 4 días corridos para aceptarla y debe haber entrado antes a Trámites a Distancia). Mientras tanto, se firma la **autorización** (`guias/AUTORIZACION-DOMINIO.md`).
- [ ] **Firmar el contrato de licencia de uso** con el cliente (modelo en `guias/CONTRATO-LICENCIA-USO.md`; se completa e imprime **fuera de este repositorio**, que es público). La reserva de derechos del software ya está cubierta por el `LICENSE`; el contrato agrega lo económico, el soporte y el traspaso de cuentas. Orden de la entrega: autorización → traspaso de dominio y cuentas → contrato.
- [ ] **Datos de inscripción del cliente** (CUIT, Clave Fiscal nivel 2, razón social, domicilio legal, teléfono, email, DNI del representante) → también hacen falta para el dominio.
- [ ] **Validar con el contador** el texto del libro de reclamos virtual (Ley 27.266: no se pudo verificar en fuente oficial) antes de publicarlo como exacto.
- [ ] **Datos de Estalingrado Corp**: cuando la empresa tenga inscripción en ARCA, completar domicilio y CUIT en el contrato, la carta y los documentos legales.
- [x] ~~Verificar si los filtros comparten bien "Camas" y "Accesorios" (mapeo `mascotas` es supuesto)~~ → **hecho el 2026-11-06**: el mapeo dejó de ser supuesto. Cada producto declara sus `categorias` y sus `mascotas`, las listas son administrables desde el panel y el agrupamiento se verifica con pruebas automáticas (141 checks).
- [ ] Verificar resolución de `assets/img/local.jpg` (449×660, podría verse baja como fondo).
- [ ] Revisar recorte/encuadre de las fotos de producto.
- [ ] Decidir si se limpia el Worker accidental `laboutiquecatydog-github-io` (ya no se usa; la web va por GitHub Pages).

> **Dominio propio: hecho ✓** — `https://laboutiquecatydog.com.ar/` en producción (registrado en NIC.ar a nombre del desarrollador, DNS en Cloudflare con los registros CNAME del ápex y de `www`, `CNAME` de GitHub Pages, HTTPS forzado, `www` redirigiendo al ápex sin loops).

---

## Licencia y contacto

**El software de este sitio (código fuente, diseño y panel) pertenece a Estalingrado Corp** y se licencia al negocio **La Boutique Cat & Dog** para uso no exclusivo e intransferible. Ver `LICENSE` (copyright de Estalingrado Corp, autoría del desarrollador con su derecho moral de paternidad) y `guias/CONTRATO-LICENCIA-USO.md` (modelo del contrato, interno).

La **marca, el logotipo, las fotografías y los contenidos** son del negocio. La web se publica en <https://laboutiquecatydog.com.ar/>.

Para consultas: `laboutiquecatydog@gmail.com`.
