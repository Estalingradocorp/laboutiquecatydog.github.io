# Informe de seguridad — La Boutique Cat & Dog

> **Documento interno** (no se publica: `guias/` está excluido de la publicación y bloqueado en `robots.txt`).
> Fecha: **2026-11-08**. Alcance: código del repo (sitio público, panel visual, servidor local y los endpoints `/__local/*`). **No** se probaron endpoints de producción, el Worker desplegado ni infraestructura compartida (el Worker vive fuera de este repo): todo lo dinámico se verificó en loopback local.
> Metodología: análisis estático sobre el código + pruebas acotadas en local (Edge headless + peticiones directas). Un hallazgo requiere **frontera de confianza + resultado concreto**; lo demás se marca como observación o `needs_validation`.

---

## Resumen ejecutivo

| # | Hallazgo | Prioridad | Estado |
|---|---|---|---|
| 1 | **CSRF local**: cualquier web podía escribir archivos en la PC mientras corre el servidor local (y subir SVG con script) | **Media** | ✅ **Corregido** (origen + Content-Type + sin `svg`) |
| 2 | **XSS almacenado** vía `footer.empresaUrl` (esquema `javascript:` sin validar) | **Media** | ✅ **Corregido** (`hrefSeguro()`) |
| 3 | Worker `401` vacío ante credenciales incorrectas → página en blanco sin mensaje | Baja (UX) | ⏳ **Abierto** (código del Worker, fuera del repo) |

Verificado y **correcto**: escape sistemático de datos, CSP en sitio y panel, token solo en `sessionStorage` dirigido únicamente a `api.github.com`, servidor local en `127.0.0.1` con bloqueo de path traversal, sin secretos en el repo, documentación interna no publicada, cero dependencias.

---

## Hallazgo 1 — CSRF local: escritura de archivos desde cualquier web (Media)

**Dónde:** `tools/serve.js` — `POST /__local/guardar`, `POST /__local/subir-imagen`, `GET /__local/imagenes`.

**Frontera:** principal de menor confianza (un sitio web arbitrario que el usuario visita) → recurso de mayor confianza (archivos en disco de la máquina del desarrollador).

**Problema:** los handlers aceptaban cualquier `POST` sin validar `Origin`, `Referer` ni `Content-Type`. Un pedido cruzado con un `Content-Type` simple (`text/plain`) **no dispara preflight CORS** y llegaba al servidor, que parseaba el cuerpo como JSON y escribía el archivo. Además, la subida de imágenes aceptaba la extensión **`svg`**: un SVG con `<script>`, servido como `image/svg+xml` y abierto directo, ejecuta script en el origen `localhost:8080` (XSS almacenado en el origen local, que además puede llamar a `/__local/guardar`).

**Explotación (antes del arreglo):** usuario con `preview.cmd` corriendo visita una web trampa → la web hace `fetch("http://localhost:8080/__local/guardar", { method: "POST", headers: {"Content-Type":"text/plain"}, body: '{"archivo":"data/pagina.json","contenido":"…"}' })` → sobrescribe el catálogo local. O sube `assets/img/x.svg` con script y luego lo navega.

**Corrección aplicada:**
- Exigir **origen local** (`Origin` ausente o `http://localhost[:puerto]` / `http://127.0.0.1[:puerto]`) en los tres endpoints.
- Exigir **`Content-Type: application/json`** en los POST (un pedido cruzado con ese tipo dispara preflight, que el servidor no aprueba → bloqueado por el navegador).
- Rechazar `svg` en la subida (las subidas reales son JPEG/PNG generadas por canvas).

**Verificación:** con `Origin` forjado real (Node directo): cruzado → `403`, sin preflight (`text/plain`) → `403`, legítimo → `200`, `svg` → `400`. El navegador no permite forjar `Origin` desde JS (header prohibido); la prueba con navegador confirmó el resto.

## Hallazgo 2 — XSS almacenado vía `empresaUrl` (Media)

**Dónde:** `js/render.js` — `buildFooter()`.

**Problema:** el `href` de la huella legal usaba `a()` (solo escapa `& < > "`), que **no valida el esquema**. Todas las demás URL del sitio usan `hrefSeguro()` (solo `#`, rutas internas, `https:`, `mailto:`, `tel:`). Un valor `javascript:alert(document.domain)` en `footer.empresaUrl` (editable desde el panel «Datos del local») se renderizaba tal cual y ejecutaba script en el origen del sitio al hacer clic en el copyright.

**Nota de confianza:** el editor del panel ya tiene escritura sobre el repo, pero el dato es *contenido*, no código: un enlace `javascript:` supera esa confianza y ejecuta código en visitantes. Por eso se corrige en el lugar donde se construye la URL, no en el editor.

**Corrección aplicada:** `href="' + hrefSeguro(f.empresaUrl) + '"`. Verificado: el HTML servido no contiene `javascript:`.

## Hallazgo 3 — Worker: `401` vacío ante login incorrecto (Baja, externo)

**Dónde:** Worker desplegado (`sveltia-cms-auth.nicotips27.workers.dev`), fuera de este repo.

**Problema (observado):** POST con credenciales incorrectas → `401` sin cuerpo → el navegador muestra una página **totalmente en blanco**, sin mensaje. El usuario no puede distinguir «credenciales mal» de «algo roto».

**Corrección recomendada (en el repo del Worker):** devolver el formulario de login con el mensaje de error (la plantilla ya tiene `.err`) y status `401`, en vez de un cuerpo vacío.

**Estado:** `needs_validation` — no se auditó el código del Worker desplegado; el **modo local** del panel rodea este problema para probar sin login.

---

## Verificado correcto (con evidencia)

| Área | Sitio | Resultado |
|---|---|---|
| Escape de textos/atributos | `js/render.js` (`e()`, `a()`) | ✅ Todos los datos del JSON se escapan antes de interpolar |
| URL desde datos | `hrefSeguro()` en nav, tarjetas, redes, pie | ✅ Esquemas restringidos (excepción: Hallazgo 2, corregido) |
| WhatsApp / Maps | `js/main.js` | ✅ `encodeURIComponent` en número/mensaje/consulta |
| `innerHTML` | `render.js` | ✅ Solo asigna cadenas construidas con las funciones de escape |
| CSP del sitio | `index.html` | ✅ `script-src 'self'` + hash del único inline (verificado); JSON-LD exento correctamente |
| CSP del panel | `admin/editor.html` | ✅ `connect-src 'self' + api.github.com`; `frame-src 'self'` |
| Token de sesión | `admin/editor.js` | ✅ `sessionStorage`, se captura de `#` y se limpia con `replaceState`; destinos verificados: solo `api.github.com` (+ relativos locales) |
| Servidor local | `tools/serve.js` | ✅ Solo `127.0.0.1`; path traversal bloqueado (verificado con variantes codificadas); límite de tamaño por request |
| Secretos | repo completo | ✅ Barrido sin valores reales (solo nombres de variables); `.env` ignorado |
| Exposición | `_config.yml` + `robots.txt` | ✅ `guias/`, `tools/`, `LICENSE`, `*.cmd` no se publican |
| Dependencias | — | ✅ Ninguna (`node_modules` inexistente): superficie mínima; único tercero: Google Fonts (CDN, sin SRI) |
| Vista previa (iframe) | `admin/editor.js` | ✅ `same-origin` (`ORIGEN_SITIO = location.origin`); el ícono de acceso no se dibuja embebido |

## Observaciones (no vulnerabilidades)
- El repositorio es **público** (exigencia de GitHub Pages): código, datos e historial son visibles. Lo protegido es *quién puede publicar* (permiso `push`). Al cierre de este informe, la cuenta de esta PC no tenía `push` en `Estalingradocorp/laboutiquecatydog.github.io` (pendiente del dueño).
- El aviso de privacidad declara que no hay cookies ni analítica; Cloudflare Web Analytics está apagado — coherente.
- 2FA en la cuenta de GitHub sigue siendo la recomendación principal para el negocio (la única llave de publicación).

## Pendientes de validación externa
1. **HTTPS del dominio nuevo** (certificado pendiente según bitácora): verificar en el panel de GitHub Pages cuando se autorice el push.
2. **Código del Worker** desplegado (modo `password`): auditar `ADMIN_USER`/`ADMIN_PASS`/`GITHUB_TOKEN`, comparación de tiempo constante y respuesta `401` con mensaje (Hallazgo 3).
