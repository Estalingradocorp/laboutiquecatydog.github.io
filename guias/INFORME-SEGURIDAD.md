# Informe de seguridad — La Boutique Cat & Dog

**Fecha:** 3 de noviembre de 2026 · **Alcance:** sitio público, panel de administración, login con GitHub, Worker de OAuth · **Resultado global: APROBADO con recomendaciones** (16 hallazgos corregidos en esta auditoría).

> Este informe es documentación interna: **no se publica** en el sitio (queda excluida por `_config.yml` y bloqueada en `robots.txt`).

---

## 1. Resumen ejecutivo (para el cliente)

La página y el panel están construidos para que **solo personas autorizadas** (con la cuenta de GitHub del negocio) puedan cambiar el contenido. Se hicieron pruebas simulando un atacante y **todas fueron bloqueadas**. Además, el sistema tiene varias capas de recuperación: deshacer, descartar, copias de seguridad y el historial completo de GitHub, así que **es prácticamente imposible perder contenido** por un error.

En esta auditoría (la más completa, con 31 pruebas automatizadas en navegador real) se encontraron y corrigieron **16 problemas**: 2 críticos de exposición de información, 5 de seguridad, 4 de estabilidad y 5 de experiencia de uso.

**Lo más importante que debe saber el cliente:**

- El **código fuente es público** (GitHub Pages gratuito lo exige). Eso **no permite editar nada**: solo permite leer.
- Lo que se protege es **la escritura**: el panel verifica contra la API de GitHub que tu cuenta tenga permiso `push` en ese repositorio, y GitHub rechaza cualquier escritura de otra cuenta.
- La **cuenta de GitHub del negocio es la llave del negocio**. Sin 2FA, un phishing a ese correo sería el único camino real de ataque.

---

## 2. Qué se protege y cómo (modelo de seguridad)

| Activo | Protección |
|---|---|
| **Escritura** del contenido | **Solo la cuenta con permiso de escritura** en GitHub (`laboutiquecatydog`) puede publicar: el panel verifica el permiso `push` contra la API de GitHub antes de abrirse, y GitHub rechaza cualquier escritura de otra cuenta. Cada cambio queda como commit con autor y fecha. |
| **Lectura** del contenido | El repositorio de GitHub Pages es **público** (el plan gratuito de GitHub Pages lo exige): cualquiera puede ver el código fuente, los textos del sitio y el historial de commits. Esto **no** permite editar nada. Si en el futuro se quiere ocultar el código, hace falta un plan pago de GitHub o alojar el sitio en otro proveedor. |
| **Rama `main`** | Protegida: **no se puede hacer force-push ni borrar la rama**. GitHub Pages publica desde `main`, así que nadie puede "romper" la web con un push forzado. |
| Login del panel | OAuth oficial de GitHub (contraseñas nunca pasan por el sitio) + Worker de Cloudflare que valida el dominio y devuelve el token **solo al panel** (nunca en la barra de direcciones ni en cookies legibles) |
| Token de sesión | Vive en `sessionStorage`: **se borra al cerrar la pestaña**, no queda guardado en la computadora, y solo se envía a `api.github.com` (verificado con instrumentación) |
| Alcance del OAuth | El Worker ya **no pide** permiso sobre todos los repositorios privados de la cuenta: pide solo `public_repo` + `user`. |
| Página del panel | Marcada `noindex` + bloqueada en `robots.txt`: no aparece en Google |
| Documentación interna | Excluida de la publicación (`_config.yml`) **y** bloqueada en `robots.txt`: bitácora, README, guías, código del Worker y scripts `.cmd` responden 404 en producción |
| Datos personales | El sitio **no usa cookies**, no tiene analítica ni publicidad, y no tiene formularios que guarden datos. El aviso de privacidad está en `privacidad.html` |

---

## 3. Pruebas de vulnerabilidad ejecutadas

### 3.1 Inyección de código malicioso a través del contenido (XSS) — **BLOQUEADO**

Se simuló un atacante que lograra editar el contenido con **código malicioso en todos los campos de texto** (títulos, botones, precios, redes, menú, WhatsApp, dirección, etc.), incluyendo scripts que intentaban robar la sesión del panel.

**Resultado:**
- Cero scripts ejecutados; cero elementos maliciosos en la página.
- Todos los textos se convierten en texto plano visible (inerte).
- Los enlaces con esquemas peligrosos (`javascript:…`) quedan **neutralizados en `#`** — corrección aplicada en la auditoría de octubre.
- Los enlaces **protocol-relative** (`//sitio-malicioso.com`) también quedan neutralizados — corrección aplicada en esta auditoría (antes pasaban y sacaban al visitante del sitio).
- Los intentos de inyectar scripts por consola también fueron **bloqueados por la CSP** (ver 3.3).

### 3.2 Acceso a archivos de la computadora desde el servidor local (path traversal) — **BLOQUEADO**

Se atacó el servidor de desarrollo con 10 variantes de rutas maliciosas (incluyendo codificaciones `%2e%2e`, barras invertidas para Windows y doble codificación) intentando leer archivos fuera de la carpeta del proyecto (p. ej. archivos del sistema).

**Resultado:** todas bloqueadas con "403 Prohibido". El servidor solo puede servir la carpeta del proyecto. Se agregó además la cabecera `X-Content-Type-Options: nosniff` como refuerzo.

> Nota técnica de la prueba: algunos clientes HTTP "aplana" las rutas antes de enviarlas, lo que produce falsos 200; la batería se re-corrió con `curl --path-as-is` (ruta literal) y dio 403 en todos los intentos.

### 3.3 Content Security Policy (CSP) — **ACTIVA Y VERIFICADA**

Se agregó CSP al sitio y al panel (solo scripts propios + API de GitHub + fuentes de Google; todo lo demás prohibido).

**Resultado de las pruebas:**
- Scripts inline no autorizados: **bloqueados**.
- Scripts externos inyectados: **bloqueados**.
- El sitio funciona al 100 % (render, carruseles, SEO, tipografías) — **cero violaciones en consola** (31/31 pruebas, 0 excepciones, 0 errores de consola propios).

### 3.4 Higiene del token de sesión — **APROBADO**

| Prueba | Resultado |
|---|---|
| ¿Queda el token en la URL después del login? | No — se limpia automáticamente |
| ¿Se guarda en almacenamiento persistente (localStorage)? | No — solo en `sessionStorage` (se borra al cerrar la pestaña) |
| ¿Se envía a algún servidor que no sea la API de GitHub? | No — instrumentación registró todas las peticiones con token: solo `api.github.com` |
| ¿Sale en logs, copias o borradores? | No — verificado por escaneo |

### 3.5 Control de acceso al panel — **APROBADO**

Se probó el panel con una cuenta **sin** permiso de escritura sobre el repositorio: el panel la rechaza con un mensaje claro ("tu cuenta no tiene permiso para editar este sitio") y borra la sesión. Solo `laboutiquecatydog` (administrador) puede entrar.

### 3.6 Otros escaneos — **LIMPIO**

- **Secretos hardcodeados** (tokens, contraseñas, client secrets): 0 hallazgos en todo el proyecto.
- **Contenido mixto** (carga HTTP en sitio HTTPS): 0 (solo namespaces XML internos, que no son recursos de red).
- **Enlaces externos**: todos abren con `rel="noopener"` (evita que la página abierta pueda manipular la nuestra).
- **Subida de imágenes**: solo imágenes reales re-codificadas por canvas (un archivo disfrazado se re-procesa y queda limpio); extensiones controladas (`.jpg`/`.png`/`.webp`/`.svg`); **tamaño máximo 8 MB** con aviso claro.
- **Archivos subidos**: los nombres se normalizan (solo letras, números y guiones) — imposible inyectar rutas.
- **Panel antiguo (Sveltia)**: retirado — menos superficie de ataque.

---

## 4. Hallazgos corregidos en esta auditoría (noviembre 2026)

### Seguridad

| # | Hallazgo | Riesgo | Corrección |
|---|---|---|---|
| 1 | Documentación interna publicada en producción (`/BITACORA.md`, `/README.md`, `/guias/*`, `/tools/*`, `*.cmd` respondían 200) | **Crítico**: exponía notas internas, rutas y código del login | `_config.yml` con `exclude` + `robots.txt` con `Disallow` para esas rutas |
| 2 | El informe decía "Repositorio privado" cuando es público | **Crítico**: documentation falsa sobre el modelo de seguridad | Informe corregido (sección 2 de este documento) |
| 3 | Rama `main` sin protección: cualquier colaborador podía hacer force-push o borrarla | Alto | Protección de rama: force-push y borrado deshabilitados |
| 4 | El OAuth pedía `repo,user` (acceso a **todos** los repositorios privados de la cuenta) | Alto | Scope reducido a `public_repo,user` en `tools/worker-editor.js` (**requiere re-desplegar el Worker**, paso 6) |
| 5 | `hrefSeguro` aceptaba URLs protocol-relative (`//sitio-malicioso.com`) | Medio | Ahora se neutralizan en `#` junto con `javascript:` |

### Estabilidad

| # | Hallazgo | Riesgo | Corrección |
|---|---|---|---|
| 6 | Los errores de GitHub se mostraban como "HTTP 409" al cliente | Medio | Mensajes en lenguaje claro por código (401/403/404/409/422/429/5xx) |
| 7 | Cerrar el modal mientras se sube una imagen rompía el panel (`TypeError`) | Medio | Se captura el estado de la operación antes de subir; si el modal se cerró, se avisa que la imagen quedó subida |
| 8 | El panel acumulaba listeners globales en cada re-render de la vista previa (fuga de memoria y timers huérfanos) | Medio | Puente de listeners globales: uno por evento, siempre apuntando al DOM actual |
| 9 | La galería cargaba **todas** las fotos originales y las retenía en memoria | Medio | Miniaturas generadas en canvas (livianas), carga diferida al entrar en pantalla y liberación de memoria al cerrar |
| 10 | Sin límite de tamaño en la subida de imágenes | Medio | Máximo 8 MB con aviso claro y validación de tipo |

### Experiencia de uso

| # | Hallazgo | Riesgo | Corrección |
|---|---|---|---|
| 11 | Al editar un texto en "Textos" y volver a la vista previa, se veía el texto **viejo** (parecía que no se había guardado) | Alto | La vista previa se actualiza al instante al cambiar cualquier campo |
| 12 | Lo que se escribía después de 220 ms en la edición directa **se perdía** | Alto | El re-render espera a que termine la edición en curso |
| 13 | Ctrl+Z no deshacía los cambios hechos en el formulario | Alto | Los cambios del formulario entran al historial de deshacer |
| 14 | La tecla Escape no cerraba el modal de imágenes | Alto | Escape cierra cualquier modal (desde cualquier lugar) + gestión de foco + trampa de Tab |
| 15 | Los datos del local se editaban **a ciegas** (sin vista previa visible) | Medio | La vista previa queda visible en "Datos del local" y se actualiza al instante |
| 16 | El pie de la web editaba los datos del local **por posición**: si faltaba un dato, se editaba el campo equivocado | Medio | Cada dato lleva su clave; además el teléfono ahora es editable |
| 17 | Las etiquetas de los campos no apuntaban a su control (`for`/`id` ausente) | Medio | 39/39 campos con `label[for]` + `id` único (lector de pantalla) |
| 18 | El botón de elegir archivo estaba oculto del teclado | Medio | Input invisible pero enfocable + el input de archivo acepta JPG/PNG/WEBP |
| 19 | El modelo completo se guardaba en `localStorage` en **cada tecla** (panel lento con textos largos) | Medio | Guardado con retardo de 400 ms + volcado al cerrar la pestaña |

### Sitio público

| # | Hallazgo | Riesgo | Corrección |
|---|---|---|---|
| 20 | El carrusel de portada **no se movía solo**: el control "Velocidad del carrusel" del panel no hacía nada | Alto | Autoplay activado (respeta `prefers-reduced-motion`, se pausa al pasar el mouse y al cambiar de pestaña) |
| 21 | Sin JavaScript el sitio quedaba en blanco | Alto | `<noscript>` con nombre, actividad, WhatsApp, dirección y horario |
| 22 | El `preload` de la foto de portada pedía la imagen equivocada (`100vw` vs `50vw`) | Medio | La regla `sizes` del preload ahora coincide con la de la imagen |
| 23 | 10 de 18 imágenes sin `width`/`height` | Medio | Medidas reales en todas (18/18) |
| 24 | Sin página de error 404, sin aviso de privacidad, sin `manifest.json` | Bajo | `404.html`, `privacidad.html` y `manifest.json` creados y enlazados |
| 25 | Imágenes pesadas y 3 fotos huérfanas (no usadas) | Bajo | Re-codificación (mozjpeg/paleta): **-760 KB** y 3 huérfanas borradas |

---

## 5. Recomendaciones para el cliente

1. **Activa la verificación en dos pasos (2FA) en tu cuenta de GitHub** — es la única "llave" del negocio. Sin 2FA, un phishing a tu mail de GitHub sería el único camino real de ataque. (GitHub → Settings → Password and authentication → Two-factor authentication.)
2. **No compartas tu cuenta**: si mañana alguien más edita, invitalo como **colaborador** del repositorio (Settings → Collaborators), nunca prestes tu usuario.
3. **Cerrá sesión ("Salir") en computadoras compartidas** — aunque la sesión muere al cerrar la pestaña, es una costumbre sana.
4. **Traslada el login a tu propia cuenta** (ver `ENTREGA-CLIENTE.md`): hoy la OAuth App y el Worker de login son del desarrollador. Mientras no se traslade, el login del panel depende de un servicio de un tercero.
5. Si un día usan dominio propio, mantener **HTTPS** (ya es el estándar del sitio).

---

## 6. Pendiente operativo (antes de publicar)

- [ ] **Re-desplegar el Worker** en Cloudflare con `tools/worker-editor.js` actualizado (scope reducido a `public_repo` + mensajes de error claros). Workers & Pages → `sveltia-cms-auth` → Edit code → pegar → Deploy.
- [ ] **Trasladar la OAuth App y el Worker** a la cuenta del cliente (pasos en `ENTREGA-CLIENTE.md`).
- [ ] Push a producción (cuando el cliente dé el visto bueno).
- [ ] Después del push: verificar que `/BITACORA.md`, `/README.md`, `/guias/`, `/tools/` y `/*.cmd` devuelvan **404**, y que `privacidad.html`, `404.html` y `manifest.json` devuelvan 200.
- [ ] Después del push: Search Console + Google Business Profile.

---

## 7. Metodología

Auditoría de caja blanca (revisión de código + pruebas automatizadas en navegador real vía protocolo CDP, con GitHub simulado) ejecutada el 3/11/2026 sobre todo el código del proyecto.

- **31 pruebas automatizadas**: 25 de sitio+panel (`fase4-check.js`) y 6 de UX del editor (`fase2-check.js`), todas en verde.
- Batería XSS de 25+ payloads en todos los campos editables.
- Sanitización de enlaces (incluido protocol-relative).
- Path traversal (10 variantes).
- Inyección de scripts con CSP activa.
- Higiene del token (URL, sessionStorage, localStorage, destinos de red).
- Escaneo de secretos, contenido mixto y revisión de todos los `innerHTML` del panel.
- Control de acceso con cuenta sin permiso de escritura.
- Revisión de la rama `main` (protección) y del alcance del OAuth.

Código de prueba reutilizable en `%TEMP%\opencode\fase4-check.js` y `%TEMP%\opencode\fase2-check.js`.
