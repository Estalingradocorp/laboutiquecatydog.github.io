# Estado actual del proyecto — informe para revisión

> **Documento interno** (no se publica en la web: `guias/` está excluido de la publicación y bloqueado en `robots.txt`).
> Última actualización: **2026-11-08**. Estado del código: rama `main` del repo `Estalingradocorp/laboutiquecatydog.github.io` (migración del 2026-11-07), con la tanda de acceso visible + modo local + pulido del panel y la web.
> Para el detalle de cada cambio, día por día: `BITACORA.md`. Para el uso diario: `README.md`.

---

## 1. Qué es el proyecto en una página

Sitio web de una sola página para **La Boutique Cat & Dog** (tienda de productos para perros y gatos, Salta), más un **panel de administración visual** para que el negocio edite el contenido con su navegador, sin tocar código.

| Dato | Valor |
|---|---|
| Sitio en producción | <https://laboutiquecatydog.com.ar/> |
| Panel de administración | `https://laboutiquecatydog.com.ar/admin/editor.html` (login con usuario y contraseña; en `localhost` entra en **modo local** sin login) |
| Páginas legales | `/privacidad.html` · `/terminos.html` |
| Tecnología | HTML + CSS + JavaScript **vanilla**, sin frameworks, sin dependencias y **sin paso de build** |
| Hosting | GitHub Pages (rama `main`, raíz) con dominio propio detrás de Cloudflare |
| Publicación | El panel publica con un **commit** a `data/*.json`; Pages reconstruye solo (~1 min) |
| Titularidad del software | **Estalingrado Corp** (ver `LICENSE`); la marca, las fotos y los contenidos son del negocio |
| Documentación interna | `README.md` (técnico), `BITACORA.md` (historial), `guias/` (este informe, entrega, seguridad, contratos) |

---

## 2. Cómo está hecho

```
data/sitio.json  ─┐
                  ├─►  js/render.js  ─►  HTML de header, <main> y footer
data/pagina.json ─┘        │
                           ▼
                   js/main.js  ─►  interacciones (menú, carruseles, filtros, WhatsApp…)

admin/editor.html + editor.js + editor-form.js + editor-inline.js + editor-media.js
                  │
                  ├─ login ─► Cloudflare Worker (OAuth) ─► GitHub
                  └─ publicar ─► commit a data/*.json en GitHub ─► GitHub Pages ─► web
```

**Las tres piezas y qué controla cada una:**

1. **Los datos** (`data/sitio.json`, `data/pagina.json`): todo el texto, las imágenes, los enlaces, las secciones, los productos y sus categorías. **El HTML no tiene contenido escrito a mano**: `index.html` es un esqueleto con el `<head>` (SEO, fuentes, JSON-LD) y contenedores vacíos. Los borradores viejos del navegador se **migran solos** al abrir el panel (ver §5).
2. **El render** (`js/render.js`): arma el HTML de la página a partir de esos JSON. Todos los textos se escapan antes de insertarse (nunca se inyecta HTML crudo).
3. **El panel** (`admin/`): editor tipo constructor — lista de secciones a la izquierda, **vista previa en vivo** del sitio real (iframe) con **edición directa sobre el texto**, formularios por campo, subida de imágenes, historial de versiones, copias de seguridad, deshacer/rehacer y publicación por commits.

**Consecuencia práctica:** el contenido **no está en el código**. Cambiar un precio o una foto es cambiar un JSON, y el sitio se entera solo.

---

## 3. Cómo funciona (lo que hay que saber para usarlo)

### 3.1 El ciclo de edición y publicación

```
Editar en el panel  ─►  queda como borrador en el navegador  ─►  «Publicar cambios»
                                                                      │
                                              commit a data/pagina.json y/o data/sitio.json
                                                                      │
                                              GitHub Pages reconstruye  ─►  la web ya está actualizada
```

- El **borrador** vive en el `localStorage` del navegador (se recupera si se cierra la pestaña). Nada se publica solo.
- **Publicar** pide confirmación y crea **un commit por archivo modificado** (portada y/o datos del local).
- Si el archivo cambió en GitHub mientras se editaba, el panel **detecta el conflicto** y ofrece recargar o conservar el borrador.
- Antes de cada publicación se guarda una **copia de seguridad automática** (hasta 15, descargables).
- La **subida de imágenes** sí se commitea al momento (una imagen en borrador no tiene sentido).
- La sesión de login vive solo en la pestaña (`sessionStorage`); al cerrar sesión se borra, **los borradores quedan**.

### 3.2 La web

| Sección | Qué hace |
|---|---|
| Portada (`hero`) | Carrusel de fotos con autoplay, título con efecto de escritura, botones de WhatsApp y «Ver productos» |
| Categorías (`categorias`) | Tarjetas **Perros** y **Gatos** que llevan a la sección de productos |
| Productos (`productos`) | **Catálogo**: dos grupos de filtros (mascota y categoría de producto), buscador, contador de resultados, estado vacío, **precio formateado** (`12000` → `$12.000`), **productos destacados** (salen primero, con aro y etiqueta) y paginación automática |
| Nosotros (`imagenTexto`) | Foto + texto + viñetas + botón |
| Contacto (`contacto`) | WhatsApp, redes, mapa, horarios, teléfono y correo |
| Pie | Marca, secciones, datos de contacto, redes, **aviso de privacidad** y **términos**, año dinámico y la huella legal como enlace |

Además: menú móvil con overlay y scroll-spy, animaciones al hacer scroll, barra de progreso, SEO dinámico desde los datos (título, descripción, Open Graph y JSON-LD `PetStore`), `manifest.json`, página `404` propia y diseño responsive que respeta `prefers-reduced-motion`.

### 3.3 El panel

Todo lo anterior se edita desde el navegador: textos (en la vista previa o en formularios), imágenes, productos, categorías, orden de secciones, datos del local, redes sociales (también desde el modo Textos de Contacto), SEO y campos técnicos. Acceso: **ícono de usuario en la esquina superior derecha** de la web, o el enlace directo (conviene guardarlo como marcador en el celular). En `localhost`, el panel abre en **modo local** (sin login): «Guardar en esta carpeta» escribe los JSON en disco y la galería/subida de imágenes también es local; publicar en internet se hace desde el dominio publicado.

**El catálogo y sus categorías — la idea que hay que explicar:**

- Una **categoría no es una carpeta con productos dentro**: es una **etiqueta** que se le pone a cada producto.
- Se administran en la sección **Productos** → bloque **«Categorías de producto»** (se agregan, se renombran y se borran ahí mismo).
- En la ventanita de cada producto se marca **«Para qué mascotas»** y **«Categorías de producto»** (un producto puede llevar varias).
- Los filtros de la web se arman solos: entre grupos va **Y** (mascota **y** categoría) y dentro de un grupo va **O** (perros **o** gatos).

### 3.4 El login

El panel **no tiene usuario propio**: el login es OAuth contra **GitHub**, y sólo funciona con una cuenta que tenga **permiso de escritura** en el repositorio. El token viaja en el fragmento de la URL (nunca se guarda en un servidor) y se usa contra `api.github.com`. La llave (OAuth App + Worker de Cloudflare) está hoy en la cuenta del desarrollador; el traspaso al cliente está documentado en `guias/ENTREGA-CLIENTE.md` (sección 0) y es opcional.

---

## 4. Qué se verificó (resultados, no promesas)

Todo lo que sigue se comprobó con pruebas automáticas sobre la **web publicada** (no solo en local).

**En producción — `https://laboutiquecatydog.com.ar` (2026-11-06/07):**

| Suite | Resultado | Qué cubrió |
|---|---|---|
| `prod-check.js` | **9/9** | La web renderiza, el carrusel avanza solo, todas las imágenes con medidas, `manifest` + aviso de privacidad + enlaces de WhatsApp, login del panel lleva a GitHub con el scope correcto, 404 con salida, aviso de privacidad completo. **0 errores de JavaScript** |
| `web-test.js` | **28/28** | Catálogo: filtros por mascota y por categoría, buscador, contador, estado vacío, destacados, precio formateado, paginación |
| `web-layout-check.js` | **15/15** | Escritorio y móvil: sin desbordes ni superposiciones |
| `panel-categorias-test.js` | **27/27** | Panel de producción: bloque de categorías de producto, píldoras de mascotas y categorías, interruptor de destacado, identificadores estables |
| `huella-test.js` | **10/10** | Huella legal: es un enlace, apunta a `https://estalingradocorp.com.ar/`, abre en pestaña nueva con `rel="noopener"`, conserva el texto, el panel expone el campo para cambiarla |

**En local (navegador Edge headless sobre el servidor local, con la API de GitHub simulada):** **151 comprobaciones** — panel de productos 36/36 · otras secciones 15/15 · pulido visual 10/10 · categorías 27/27 · web 28/28 · maquetación 15/15 · edición en la vista previa 10/10 · huella 10/10.

**Tanda 2026-11-08 (todo local, headless):** modo local sin login (editor + secciones + Guardar a disco) · borrador viejo migrado (bloque aparece, etiquetas conservadas, marcado como borrador) · píldoras de categorías + Guardar · galería local (24) + subida a disco + ruta `..` rechazada · multiselección (3 imágenes → contador + fotos agregadas) · Destacado alineado + orden fijo de campos · redes en Textos del contacto (edición → borrador de sitio) · buscador web y del panel (tipeo real) · carrusel: fotos agregadas visibles (slides/puntos) + buscador en vista previa · paginación con clic real (paginación anclada, 0 px de corrimiento) · aviso de vista previa auto-oculto · ícono visible en web y ausente en vista previa, Salir → web · **0 errores de JavaScript** en todos los casos.

**Segunda tanda 2026-11-08 (local):** escaneo de estrés sobre copia (34 productos, carrusel de 10 fotos, textos extremos, 5 payloads XSS sin ejecutar) + **auditoría de seguridad** (2 hallazgos corregidos y verificados con exploit simulado; detalle en `guias/INFORME-SEGURIDAD.md`); editor de recorte con zoom 25–400 % (también desde la galería, una por una) y lápiz para editar la foto existente; zoom de tarjetas contenido en el marco; buscador sin doble «✕»; tipear ya no mueve el scroll; botones «Consultar disponibilidad» minimalistas (aprobado); **botón «Filtros»** que pliega/despliega los grupos del catálogo conservando la selección, y **enlaces de soporte** a `estalingradocorp.com.ar/soporte/soporte.html` (pie de la web, barra del panel y login).

**Tanda 2026-11-09 (local, luego publicada):** corrección del bug «al agregar un producto con 4 imágenes solo se cargaba la primera». Causa raíz confirmada con prueba A/B (stash temporal): (a) las listas del panel no implementaban el callback `alElegirMultiple` del selector, así que al confirmar varias imágenes se aplicaba solo la primera; (b) el input de archivos de la PC era de una sola imagen (`files[0]`, sin atributo `multiple`). Corrección: las tres listas que reciben imágenes (productos, fotos de un producto, carrusel/tarjetas) aplican el lote completo — en un producto, **todas las fotos quedan como fotos suyas** — y el input de la PC acepta varios archivos con cola de recorte («Imagen N de M») que los aplica juntos al terminar. Verificado con 4 pruebas headless: galería con 4 (→ 4 fotos), PC con 4 archivos (→ 4 fotos), editar un producto existente (3 → 7 fotos), más regresión de imagen única y del lápiz ✎; **0 errores de JavaScript**. Publicado en `c37ed09` (merge `6d92813` con las publicaciones del panel del cliente, sin conflictos); assets del panel `?v=1cbf82d2`.

**Estabilidad e infraestructura verificadas:** GitHub Pages reconstruye y despliega sin intervención · Cloudflare con SSL válido, `www` → ápex sin loops · HTTPS forzado · documentación interna responde **404** en producción (no es pública) · el repo tiene `main` protegido (no se puede forzar push ni borrar) · existe un **repo privado de respaldo** con el mismo contenido.

---

## 5. Problemas conocidos (estado honesto)

| # | Problema | Qué pasa | Impacto | Estado / qué hacer |
|---|---|---|---|---|
| 1 | **Borrador viejo en el navegador** | El panel recuperaba el borrador local **tal cual**, sin adaptarlo al formato nuevo: con un borrador anterior a las categorías, el panel **no mostraba el bloque «Categorías de producto»** | **Alto** (era): si se publicaba desde ahí, se pisaba el catálogo nuevo sin aviso | **Resuelto el 2026-11-08**: `migrarDatos()` adapta borradores, versiones y copias al abrir el panel (categorías, `mascotas[]`, `categorias[]`, `destacado`, sin `etiqueta`) y queda marcado como borrador para revisar |
| 7 | **Login del Worker en blanco** | Si las credenciales no coinciden, el Worker responde `401` con cuerpo vacío → **página en blanco** sin mensaje (solo en el login publicado) | Medio | **Abierto**: el Worker está fuera de este repo. El **modo local** lo rodea para probar; convendría que el Worker devuelva el formulario con mensaje de error |
| 8 | **Auditoría de seguridad 2026-11-08** | Dos hallazgos corregidos: **CSRF local** (endpoints `/__local/*` sin chequeo de origen: cualquier web podía escribir archivos mientras corre el servidor local; también aceptaba `svg`) y **XSS vía `empresaUrl`** (esquema `javascript:` sin validar). Verificado con exploit simulado | Medio | **Resuelto**; detalle en `guias/INFORME-SEGURIDAD.md` |
| 2 | **Caché de Cloudflare** | Cloudflare y los navegadores cachean `.js` y `.css` **4 horas**; con código viejo y datos nuevos la web «no cambia» | Medio | **Mitigado**: los assets se piden con `?v=<hash>` (`node tools/actualizar-version.js` regenera el hash; hay que commitear el `index.html`/`admin/editor.html` con el código). Los **datos** no tienen el problema (`cache: "no-store"`) |
| 3 | **El navegador del usuario también cachea** | El HTML se cachea 10 minutos: tras publicar, puede seguir viendo la versión anterior | Bajo | Normal: un **Ctrl+F5** alcanza. En el panel, si no aparece algo nuevo, refrescar forzando |
| 4 | **Sin analítica de visitas** | Cloudflare Web Analytics está **apagado a propósito**: su beacon no carga (la CSP del sitio lo bloquea) y el aviso de privacidad declara que no hay cookies ni analítica | Bajo (informativo) | Decisión coherente con el aviso de privacidad. Si se quiere medir tráfico, hay que decidir entre un medidor **sin cookies** o actualizar el aviso de privacidad y la CSP |
| 5 | **Resolución de una foto** | `assets/img/local.jpg` (449×660) puede verse baja de resolución como fondo | Bajo | Revisar en el próximo pase de fotos |
| 6 | **Encuadre de las fotos de producto** | No se hizo un repaso fino de los recortes | Bajo | Pendiente de calidad visual |

> El punto 1 es el único que **puede romper algo publicado**; el resto son mejoras o decisiones informadas.

---

## 6. Lo que falta para la entrega

### 6.1 Código y calidad

- [x] ~~Migrar los borradores antiguos al abrir el panel~~ → **hecho el 2026-11-08** (`migrarDatos()`, ver §5).
- [ ] Que el Worker devuelva el formulario con mensaje de error ante credenciales incorrectas, en vez de `401` vacío (página en blanco). Es código del Worker, fuera de este repo; el modo local lo rodea para probar.
- [ ] Pase de calidad visual: encuadre de fotos de producto y resolución de `local.jpg`.
- [ ] Purga opcional de la caché de Cloudflare (dejaría de quedar código viejo servido con URLs sin `?v=`).

### 6.2 Marketing y presencia (fuera del código, requiere al cliente)

- [ ] **Google Search Console** con el dominio nuevo: propiedad de tipo **Dominio** (verificación con un registro **TXT** que da Google → se agrega en el DNS de Cloudflare), enviar `sitemap.xml` y pedir la indexación. La propiedad anterior ya no sirve (esa URL redirige).
- [ ] **Google Business Profile**: alta y reclamo de la ficha del local (nombre, dirección, teléfono, horarios, fotos, categoría «Tienda de mascotas»). Es el factor #1 para búsquedas locales del tipo *pet shop cerca mío*; la verificación puede tardar días o semanas.
- [ ] **Guía corta al cliente**: video o PDF con la rutina del panel (entrar → editar → publicar).

### 6.3 Legal, contratos y cuentas

- [ ] Firmar el **contrato de licencia de uso** (modelo en `guias/CONTRATO-LICENCIA-USO.md`; se completa **fuera del repositorio**, que es público).
- [ ] Firmar la **autorización de dominio** (`guias/AUTORIZACION-DOMINIO.md`).
- [ ] **Transferir el dominio** a nombre del cliente (NIC.ar: requiere el CUIT del cliente; $8.500; el destinatario tiene 4 días para aceptar la transferencia).
- [ ] Datos de inscripción del cliente (CUIT, Clave Fiscal nivel 2, razón social, domicilio legal, teléfono, email, DNI del representante).
- [ ] Validar con el contador el texto del **libro de reclamos virtual** (Ley 27.266: no se pudo verificar en fuente oficial).
- [ ] Cuando **Estalingrado Corp** tenga inscripción en ARCA: completar CUIT y domicilio en el contrato, la carta y los documentos legales.

### 6.4 Cuentas

- [ ] Que el cliente entre con su propia cuenta al panel y **practique un cambio real** (texto + foto + producto clasificado).
- [ ] Activar **2FA** en la cuenta de GitHub del negocio (la única llave de publicación).
- [ ] Guardar el marcador del panel en el celular del cliente.
- [ ] Opcional: traspaso de la llave del login (OAuth App + Worker) a la cuenta del cliente — está documentado y no es necesario para operar.

---

## 7. Cómo revisarlo en 10 minutos

1. **La web**: <https://laboutiquecatydog.com.ar/>
   - Abajo del buscador, los filtros de categoría (**Todas · Alimentos · Descanso · Transporte · Accesorios · Juguetes**) y los de mascota (**Todos · Perros · Gatos**): combinarlos, escribir en el buscador y ver el contador.
   - Verificar que el precio se formatea (`$12.000`) y que los **destacados** salen arriba con la etiqueta «Destacado».
   - En el pie, la línea **«© 2026 Estalingrado Corp…»** es un enlace que abre `https://estalingradocorp.com.ar/` en otra pestaña.
   - Revisar `/privacidad.html`, `/terminos.html` y una URL inexistente (debe dar la página 404 con salida a WhatsApp).
2. **El panel**: `https://laboutiquecatydog.com.ar/admin/editor.html` → «Entrar con usuario y contraseña» (o **ícono de usuario** arriba a la derecha de la web).
   - Sección **Productos** → modo **«Textos»** → debe verse el bloque **«Categorías de producto»** como píldoras (las mismas que ve la gente debajo del buscador).
   - Tocar el ícono de un producto → la ventanita con **«Para qué mascotas»**, **«Categorías de producto»**, **«Destacado»** y **«Precio»**, en ese orden.
   - En **local** (`localhost`): entra directo en **modo local** («Guardar en esta carpeta» escribe en disco; galería y subida de imágenes también locales).
   - Botón **«?»**: ayuda integrada del panel.
3. **Móvil**: repetir la revisión en pantalla chica (menú, carrusel, filtros, grilla de productos).

---

## 8. Decisiones de fondo (para no revisarlas de nuevo)

- **El contenido vive en JSON, no en el HTML**: permite editarlo todo desde un panel sin tocar código y sin build.
- **Un solo panel** (el visual). El CMS anterior (Sveltia) se retiró y quedó integrado en el visual; `/admin/` redirige allí.
- **El login es GitHub**: no hay contraseñas del negocio en el sitio, y **quién puede publicar lo decide GitHub** (permiso de escritura en el repo).
- **La llave del login (OAuth App + Worker) queda en la cuenta del desarrollador**: para que el cliente no tenga que administrar Cloudflare. El traspaso está documentado por si lo pide.
- **El dominio propio está a nombre del desarrollador por ahora**: por eso la carta de autorización es el documento clave antes de la entrega.
- **La reserva de derechos del software es de Estalingrado Corp**; la marca y el contenido del negocio siguen siendo del cliente.
- **El repo es público** (lo exige GitHub Pages en el plan gratuito): por eso la documentación interna no se publica y los documentos con datos del cliente se firman fuera del repositorio.
- **Sin analítica ni cookies**: es lo que declara el aviso de privacidad y lo que hace el sitio.

---

## 9. Estado de git

| Dato | Valor |
|---|---|
| Rama de publicación | `main` (protegida: no se permite force-push ni borrado) |
| Último commit | El de esta tanda (ver `git log`): acceso visible + modo local + pulido del panel y la web + documentación |
| Commits recientes | `f12ce5c` migración a Estalingradocorp · `35a97a2` URL completa al Worker · `04147cf` Worker nicotips27 · `a1dc0f2` login usuario/clave |
| Remotos | `origin` (GitHub Pages) y `respaldo` (repo privado de respaldo) — **contenido idéntico** |
| Publicación | `git push origin main` → GitHub Pages reconstruye solo (~1 min) |
| **Regla al tocar CSS o JS** | correr `node tools/actualizar-version.js` y **commitear el `index.html`/`admin/editor.html` junto con el código** (los assets se piden con `?v=<hash>` para vencer la caché de 4 h de Cloudflare) |
| Documentación | `README.md` (técnico) · `BITACORA.md` (historial por día) · `guias/` (este informe, entrega, seguridad, contratos) — **toda excluida de la publicación web** |
