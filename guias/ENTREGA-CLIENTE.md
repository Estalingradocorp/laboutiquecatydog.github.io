# Guía de entrega — cómo pasarle el proyecto al cliente

> Documentación interna: **no se publica** en el sitio (excluida por `_config.yml`).

Respondé las preguntas clave antes de la entrega. Regla general que lo explica todo:

> **El cliente NO necesita instalar NADA en su computadora.** Su página y su panel viven en internet (GitHub Pages + GitHub + Cloudflare) y se usan desde el navegador, igual que Gmail o WhatsApp Web. La copia local del proyecto es solo para desarrolladores.

---

## 0. La llave del login: decisión tomada

La **OAuth App** y el **Worker de login** viven en la cuenta del **desarrollador**. Es la "llave de la puerta" del panel, no el contenido: el contenido y el derecho a publicar son **del cliente** (es dueño del repo), y sus commits quedan a su nombre.

> **Decisión (2026-11-03): la llave se queda en la cuenta del desarrollador.** Motivos: el cliente no tiene por qué administrar Cloudflare, ya está todo andando y probado, y el traspaso queda documentado por si algún día lo pide. El plan B (PAT de alcance fino) cubre el escenario de que el desarrollador desaparezca.

**Estado al 2026-11-03 (todo verificado):**

| Qué | Estado |
|---|---|
| Worker re-desplegado con scope `public_repo` (ya no pide acceso a repos privados) | ✅ hecho y verificado |
| `main` protegida (sin force-push ni borrado) | ✅ activa |
| Documentación interna oculta (404 en producción) | ✅ verificado |
| Login real end-to-end (OAuth → canje de token → panel) | ✅ verificado |
| Cuenta sin permiso de escritura → rechazada con mensaje claro | ✅ verificado (4/4 pruebas) |
| Desarrollador con acceso de escritura al repo (rol `push`) | ✅ activo |

### Traspaso opcional — si el cliente quiere ser 100 % autónomo (35 minutos)

Solo si el cliente lo pide. Se hace con estos 3 pasos, en este orden.

### Paso 1 — Crear la OAuth App en la cuenta del cliente

1. Entrar a la cuenta de GitHub **del cliente** → Settings → Developer settings → OAuth Apps → **New OAuth App**.
2. Application name: `La Boutique Cat & Dog` · Homepage URL: `https://laboutiquecatydog.github.io/` · Authorization callback URL: `https://<SU-WORKER>.workers.dev/callback`.
3. GitHub muestra un **Client ID** y un **Client Secret**. Guardarlos: el Secret se muestra **una sola vez**.

### Paso 2 — Crear el Worker en la cuenta de Cloudflare del cliente

1. Entrar a la cuenta de Cloudflare **del cliente** → Workers & Pages → Create → Worker → nombre `sveltia-cms-auth` (o el que se prefiera).
2. Pegar el contenido de `tools/worker-editor.js` **actualizado** (ya trae el scope reducido a `public_repo` y los mensajes de error claros).
3. Edit → Deploy.
4. Editar las **variables de entorno** del Worker (Settings → Variables and Secrets) — con estos nombres exactos:
   - `GITHUB_CLIENT_ID` = el Client ID del paso 1
   - `GITHUB_CLIENT_SECRET` = el Client Secret del paso 1 (tipo **Secret**, no texto plano)
   - `ALLOWED_DOMAINS` = `laboutiquecatydog.github.io, localhost` (dominios desde los que se acepta volver al panel, separados por coma)

> Al pegar el código **no** borres las variables: si las sacás, el login deja de funcionar. Verificalo después del Deploy entrando a Settings → Variables.

### Paso 3 — Apuntar el panel al Worker nuevo

En `admin/editor.js`, línea 19, cambiar una sola constante:

```js
var WORKER_BASE = "https://<EL-WORKER-DEL-CLIENTE>.workers.dev";
```

Después: commit → push → esperar 1 minuto → probar el login con la cuenta del cliente.

> **Verificación obligatoria:** iniciar sesión con una cuenta **sin** permiso de escritura en el repo tiene que ser rechazado con el mensaje "tu cuenta no tiene permiso para editar este sitio". Si esa cuenta puede entrar, algo quedó mal.

### Plan B — si el cliente no quiere administrar Cloudflare

Se deja el Worker del desarrollador (funciona) y se le da al cliente un **token personal (PAT) de alcance fino** como alternativa de login:

1. GitHub del cliente → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate.
2. **Only select repositories** → marcar **únicamente** `laboutiquecatydog.github.io`.
3. Permisos: **Contents → Read and write**. Nada más.
4. Guardar el token en un gestor de contraseñas.

Este PAT es más simple de usar pero **no se puede revocar desde el panel**: si se filtra, hay que ir a GitHub a borrarlo. El login por OAuth es mejor; el PAT es el plan B.

### El dominio: se compra aparte, en NIC.ar

El cliente pidió un dominio propio. **No se compra en Cloudflare ni en GitHub**: los dominios `.ar` solo se registran en **NIC Argentina** (`nic.ar`), y Cloudflare después lo usa como zona de DNS.

- **Candidatos libres** (verificado por WHOIS de NIC.ar): `laboutiquecatydog.com.ar` ($8.500/año, **el recomendado**), `laboutiquecatydog.ar` ($25.500/año), `laboutiquecatydog.net.ar`, `boutiquecatydog.com.ar`, `la-boutique-cat-y-dog.com.ar`. `laboutique.com.ar` está ocupado. `laboutiquecatydog.com` también está libre, pero ese se compra en un registrador internacional (Cloudflare Registrar, a costo).
- **Quién es el titular:** el cliente (el nombre es su marca). El desarrollador puede registrarlo a nombre del cliente **como apoderado** (NIC.ar exige Clave Fiscal nivel 3 para operar en representación de otra persona) o, si el cliente no quiere compartir su Clave Fiscal, en una videollamada guiada. Si se registra a nombre del desarrollador, hace falta la autorización firmada de `guias/AUTORIZACION-DOMINIO.md` y luego se transfiere ($8.500).
- **Estalingrado Corp todavía no puede ser titular**: sin inscripción en ARCA no tiene CUIT y NIC.ar no tramita sin él. Es un pendiente de la empresa, no del sitio.
- **Datos que hay que pedirle al cliente:** CUIT, Clave Fiscal nivel 2, nombre o razón social, domicilio legal, teléfono, email y DNI del representante.
- **Configuración (en este orden):** NIC.ar *Delegar* → los 2 nameservers de Cloudflare → Cloudflare DNS (4 registros A `185.199.108.153`, `.109`, `.110`, `.111` para `@`; CNAME `www` → `laboutiquecatydog.github.io`; SSL "Full (strict)"; regla 301 de `www`) → GitHub Pages *Custom domain* + TXT `_github-pages-challenge-laboutiquecatydog.github.io` → **agregar el dominio a `ALLOWED_DOMAINS` del Worker** (sin esto el login del panel rebota con "error de acceso") → cambiar las URLs absolutas del repo.
- **Renovación:** anual y **en NIC.ar**, no en Cloudflare → recordatorio en el calendario.

---

## 1. ¿Qué necesita el cliente SÍ o SÍ?

| Elemento | ¿Dónde se consigue? | Nota |
|---|---|---|
| **Cuenta de GitHub** (la de `laboutiquecatydog`) | Ya existe | Debe quedar **a nombre del cliente**, con su correo y su celular para recuperación |
| **Contraseña + 2FA activado** | GitHub → Settings → Password and authentication | El 2FA es la llave del negocio: sin él, su mail es el único candado |
| **Cuenta de Cloudflare** (la del Worker del login) | Solo si quiere ser autónomo | Hoy el login vive en la cuenta del desarrollador: **no la necesita** |
| Un navegador | Chrome/Edge/Safari | Celular o PC, indistinto |

Con eso y el link `https://laboutiquecatydog.github.io/admin/editor.html` el cliente puede **editar TODO su sitio desde cualquier dispositivo, para siempre**. No hay nada que instalar, mantener ni actualizar.

## 2. ¿Le instalo Node.js? ¿Git? ¿GitHub Desktop?

- **Node.js: NO** — solo sirve para el servidor de desarrollo local (el `preview.cmd`). El cliente jamás lo necesita.
- **Git (línea de comandos): NO** — el panel hace los commits por ella.
- **GitHub Desktop: NO recomendado** — es TU herramienta de desarrollador. En manos del cliente agrega riesgo (un push accidental fuera del panel puede romper el sitio) y complejidad. El editor visual ES su "git".

> **¿Y los archivos `preview.cmd` y `Abrir panel (local).cmd`?** Son herramientas **del desarrollador** (levantan un servidor local para probar cambios ANTES de publicar). El cliente NO los usa ni los necesita: su panel está en internet, en `https://laboutiquecatydog.github.io/admin/editor.html`. No tiene que levantar ningún "localhost" nunca. Si encontra esos archivos en la copia de respaldo, que los ignore.

> Si algún día otro desarrollador continúa el proyecto, ESE desarrollador instala git/Node — y encuentra todo documentado en el README.

## 3. ¿Es mejor que ejecute todo en local con git?

**No — el flujo del cliente es 100 % web.** Ella edita en el panel de producción, publica, y listo. Ejecutar en local solo tiene sentido para desarrollar (vos). Para el cliente, "local" es agregar pasos y confusiones sin ningún beneficio.

## 4. ¿Para qué sirve el pendrive entonces?

Como **respaldo físico** de entrega (buena práctica), NO como requisito. Grabale:

1. **Copia completa del proyecto** (la carpeta, sin `_backup/`) — por si algún día quiere auditoría o cambio de proveedor.
2. `guias/` — el manual del panel, el informe de seguridad y la guía de presentación.
3. **Un archivo de credenciales** (o mejor: un sobre cerrado) con: usuario/contraseña de GitHub + códigos de recuperación del 2FA, usuario/contraseña de Cloudflare, y el mail asociado.

> Aclarale: "esto es un respaldo; tu página funciona igual sin el pendrive".

## 5. El acceso al panel

- **Ícono de usuario (arriba a la derecha de la web):** abre el panel. Sigue pidiendo login con usuario y contraseña.
- **Botón «Filtros»** junto al buscador del catálogo: pliega/despliega los grupos de filtros (Perros/Gatos + categorías) para que no ocupen pantalla; la selección elegida no se pierde.
- **Soporte:** ícono de auriculares en el pie de la web, en la barra superior del panel y «¿Problemas para entrar? Ir a soporte» en el login → `estalingradocorp.com.ar/soporte/soporte.html` (pestaña nueva).
- **Forma principal:** el link `…/admin/editor.html` guardado como **marcador/favorito** en su navegador y su celu (enseñale a guardarlo en la pantalla de inicio del celu — es un atajo de navegador, se llama "Agregar a la pantalla principal").
- `/admin/` también redirige al panel.
- Recordale: la sesión vive en la pestaña; si la cierra, vuelve a "Iniciar sesión".

## 5.b — Cómo carga y clasifica productos el cliente (para explicarle en la reunión)

El catálogo de la web tiene **dos grupos de filtros** (por mascota y por categoría de producto), **buscador**, **contador** y aviso cuando no hay resultados. Todo eso se arma solo a partir de lo que el cliente marca en el panel.

**Dónde se hace cada cosa:**

| Qué quiere hacer | Dónde lo hace en el panel |
|---|---|
| Cargar un producto | Sección **Productos** → «+ Agregar producto» (elige la foto, depois completás título, descripción, precio, fotos y WhatsApp) |
| Marcar para qué mascotas sirve | En la ventanita del producto → **«Para qué mascotas»** → casillas **Perros** / **Gatos**. Si no marca ninguna, sirve para todas (botón «Todos») |
| Marcar a qué categoría pertenece | En la ventanita del producto → **«Categorías de producto»** → casillas (Alimentos, Descanso, Transporte, Accesorios, Juguetes…). Un producto puede estar en **varias** a la vez |
| Crear una categoría nueva | En la sección **Productos** (modo **Textos**), bloque **«Categorías de producto»** → «+ Nueva categoría», y le ponés el nombre. Las categorías se ven como píldoras, igual que los filtros de la web |
| Renombrar una categoría | En ese mismo bloque: escribís el nombre nuevo en la píldora y listo (no se rompe lo que ya está cargado) |
| Quitar una categoría | En ese mismo bloque: botón **✕** de la píldora. Los productos que la usaban quedan sin esa categoría |
| Agregar varias fotos de una vez | Al elegir una foto, tocás varias en la galería (✓) y confirmás con el contador + botón junto a «Subir desde la PC»: la primera va al campo y el resto se agrega como fotos nuevas |
| Poner un producto arriba de todo | En la ventanita del producto → interruptor **«Destacado»** |
| Poner el precio | Campo **«Precio (opcional)»**: si escribe un número (12000) sale `$12.000`; si escribe texto («Consultar») sale tal cual |

**La idea clave para explicarlo:** una categoría **no es una carpeta con productos dentro**: es una **etiqueta** que se le pone a cada producto. Si sube tres marcas de alimento, son tres productos sueltos y a los tres les tilda «Alimentos»; el filtro «Alimentos» de la web los muestra juntos sin que haya que armar nada más. Los filtros se combinan: **mascota Y categoría** (perros + alimentos), y **Perros O Gatos** dentro del mismo grupo.

**Tip para la reunión:** carguen un producto real con el cliente (una marca de alimento que venda) y muéstrenle cómo aparece cuando toca el filtro. Es la forma más rápida de que se entienda.

### Borradores viejos (ya se adaptan solos)

El panel guarda un **borrador automático en el navegador**. Si ese navegador se usó antes del cambio de categorías, el borrador tiene el **formato anterior** (sin bloque de categorías). Desde el 2026-11-08 el panel **lo migra solo al abrir**: el bloque aparece, las etiquetas viejas se conservan como categorías y queda marcado como borrador («Cambios sin publicar») para revisarlo antes de publicar. Nada se pierde ni se publica solo. Si aun así no aparece el bloque, pulsar **«Descartar»** (borra el borrador y recarga lo publicado) y volver a abrir la sección Productos en modo **Textos**.

## 6. Checklist de la reunión de entrega

### Antes de la reunión (técnico)

- [x] **Re-desplegar el Worker** con `tools/worker-editor.js` actualizado (scope `public_repo` + mensajes claros). → **Hecho 2026-11-03** por API (Cloudflare), bindings y secrets conservados, verificado: el redirect a GitHub ahora pide `public_repo,user`.
- [x] Push a producción y **verificar los 404** de la documentación interna: `/BITACORA.md`, `/README.md`, `/guias/*`, `/tools/*` y `/preview.cmd` → **404 verificado en producción**.
- [x] Verificar que dan **200**: `/privacidad.html`, `/404.html`, `/manifest.json` → **verificado**.
- [x] Verificar que la rama `main` está protegida (force-push y borrado bloqueados) → **verificado**.
- [x] Probar el login con una cuenta **sin** permiso de escritura → la rechaza con el mensaje claro y borra el token de la sesión → **4/4 pruebas OK**.
- [x] Login real end-to-end con el scope nuevo: `/auth` → GitHub → `/callback` (código canjeado) → panel → **verificado en el log del Worker**.
- [ ] ~~Trasladar la OAuth App y el Worker a las cuentas del cliente~~ → **descartado**: la llave se queda en la cuenta del desarrollador (sección 0). Queda documentado por si el cliente lo pide.
- [x] **Prueba de escritura** con el token del scope `public_repo`: el camino real de escritura contra la API de GitHub quedó verificado (rama de prueba + `PUT /contents` con el mismo formato que usa el panel → commit `b81b5b23`, rama borrada después, `main` intacto). El scope `public_repo` cubre lectura y escritura de código en repos públicos (documentación oficial de GitHub).
- [ ] Dar de alta al cliente en el panel con su propia cuenta y **practicar un cambio real** (texto + foto) → ver checklist de la reunión.
- [ ] **Verificar en el navegador del cliente que el panel muestra el bloque «Categorías de producto»** en la sección Productos. Si no aparece, pulsar **«Descartar»** (borra el borrador viejo) y recargar → ver la sección 5.b. Con el cliente delante, para que lo practice él mismo.

> **El sitio publicado no necesita que se actualice nada a mano:** el panel publica con un commit a `data/pagina.json` o `data/sitio.json`, y GitHub Pages reconstruye solo en ~1 minuto. La documentación interna (bitácora, README, guías) **no se publica** y no influye en la web.

### En la reunión (con el cliente)

- [ ] Entregar credenciales (sobre cerrado o gestor de contraseñas) y verificar que el cliente **inicia sesión él mismo** desde su propio celu.
- [ ] Activar 2FA juntos y guardar los códigos de recuperación.
- [ ] Guardar el marcador del panel en el celu del cliente.
- [ ] Practicar con él/ella un cambio real (un texto + una foto) y publicarlo.
- [ ] Practicar la carga de un producto **clasificado** (mascota + categoría + precio) y mostrar cómo la web lo filtra.
- [ ] Mostrar el bloque **«Categorías de producto»** (crear una categoría nueva y asignársela a un producto) → dejar claro que esa es la lista que ve la gente en los filtros debajo del buscador.
- [ ] Mostrar el botón **«?»** del panel y regalarle el `guias/` impreso o en PDF.
- [ ] Dejar el pendrive de respaldo.
- [ ] Aclarar el plan de soporte acordado (ej.: ajustes incluidos por 30 dias).
- [ ] Explicar el modelo de seguridad en 30 segundos: "la web es pública (se puede ver el código), lo único protegido es **quién puede publicar**, y eso lo decide GitHub con tu cuenta".

## 7. Qué hacer si mañana te llamás "desaparecido"

Nada se pierde: el cliente es dueño del repositorio y de su cuenta de GitHub (por eso sus commits quedan a su nombre y puede seguir publicando aunque el desarrollador se borre); el código es estándar (HTML/CSS/JS sin dependencias) y está documentado (README + bitácora). Cualquier desarrollador puede continuar. Ese es justamente el argumento de venta.

Lo único que hoy depende del desarrollador es la **llave del login** (OAuth App + Worker): si desaparece, el cliente entra con el **PAT de alcance fino** (plan B de la sección 0) y sigue publicando. El traspaso de la llave al cliente está documentado en 3 pasos por si el cliente quiere cerrarlo del todo.

---

## 8. Si el negocio compra un dominio propio

El repositorio puede seguir llamándose `laboutiquecatydog.github.io`: el dominio propio se le **agrega**, no reemplaza nada del proyecto. GitHub Pages da el HTTPS (certificado automático) solo.

> Los `.ar` **solo se compran en NIC Argentina** (`nic.ar`), no en Cloudflare ni en GitHub. Cloudflare se usa después como zona de DNS. Detalle completo en la sección 0.

1. **Registrar en NIC.ar** con el CUIT del titular: `laboutiquecatydog.com.ar` ($8.500/año) es el recomendado; `laboutiquecatydog.ar` cuesta $25.500/año. El titular debe poder iniciar sesión en Trámites a Distancia (Clave Fiscal nivel 2) y, si el developer tramita en su nombre, necesita **nivel 3** + apoderamiento. Datos que hay que pedirle al cliente: CUIT, Clave Fiscal, razón social, domicilio legal, teléfono, email, DNI del representante.
2. **Delegar en Cloudflare**: NIC.ar → *Delegar* → los 2 nameservers que muestra la zona de Cloudflare. Ojo: los nameservers no se inventan, se leen de la zona.
3. **Cloudflare DNS** (solo A y CNAME; sin reglas de caché):
   - `@` → A → `185.199.108.153`, `185.199.108.109`, `185.199.108.110`, `185.199.108.111`
   - `www` → CNAME → `laboutiquecatydog.github.io`
   - SSL/TLS → **Full (strict)** · Rules → 301 de `www` → dominio naked (si no, "Too many redirects")
   - **Sin HSTS todavía** hasta que el HTTPS propio esté verificado.
4. **GitHub** → repo → Settings → Pages → **Custom domain** → el dominio naked → Save. GitHub crea el `CNAME` y pide verificar con el TXT `_github-pages-challenge-laboutiquecatydog.github.io`.
5. **Cloudflare Worker — el paso que no hay que olvidar**: Settings → Variables → `ALLOWED_DOMAINS` → agregar el dominio nuevo:
   `laboutiquecatydog.github.io, <TU-DOMINIO>, www.<TU-DOMINIO>`
   Sin esto, el login del panel rebota con *"error de acceso"*: el Worker valida desde qué dominio se vuelve al panel.
6. **Archivos del repo con URLs absolutas** (4 lugares):
   - `index.html`: `link rel="canonical"`, `og:url`, `og:image`, `twitter:image`
   - `robots.txt`: la línea `Sitemap: ...`
   - `sitemap.xml`: el `<loc>`
   - `js/main.js`: el link de ayuda que aparece si se abre el `index.html` con doble clic
   (las URLs de SEO que se calculan en vivo ya toman el dominio nuevo solas, pero conviene actualizarlas para los rastreadores que no ejecutan JavaScript).
7. **Verificar**: la web abre en el dominio nuevo con HTTPS, el panel entra con el login de GitHub, y `Publicar` sigue funcionando (el `CNAME` que crea GitHub hay que commitearlo si GitHub no lo hace solo).
8. **Search Console**: mover el sitemap al dominio nuevo (el sitio se mantiene en las dos direcciones; la canonical apunta a la nueva).

**Transferencia y renovación:** si el dominio quedó a nombre del desarrollador, se transfiere al cliente sin cargo una vez que entregue su CUIT (el arancel de transferencia de NIC es el mismo que el del alta). La **renovación es anual y se hace en NIC.ar**, no en Cloudflare → recordatorio en el calendario.

> **Estado 2026-11-05:** el dominio ya está en producción en `https://laboutiquecatydog.com.ar/` (registrado en NIC.ar, DNS en Cloudflare, `CNAME` de GitHub Pages, Worker con el dominio en `ALLOWED_DOMAINS` y URLs absolutas migradas). **Quedan 3 pasos en el panel de Cloudflare:** (1) registro **CNAME `www` → `laboutiquecatydog.github.io`** (hoy `www` no resuelve), (2) **Always Use HTTPS** activado (hoy `http://` sirve 200 sin saltar a `https://`), (3) **desactivar Web Analytics** (inyecta un beacon de seguimiento que la CSP bloquea y que contradice el aviso de privacidad).

---

## 9. Documentos legales y pendientes con el cliente

### Lo que ya está hecho (sin nada pendiente del cliente)

| Documento | Dónde | Para qué |
|---|---|---|
| `terminos.html` | publicado en la web |quién es el responsable, naturaleza del sitio, precios, propiedad intelectual, reclamos, ley aplicable |
| `privacidad.html` | publicado en la web | aviso de privacidad (Ley 25.326) con responsable, cookies y contacto |
| `LICENSE` | raíz del repo (**no se publica**) | evidencia pública de titularidad: copyright de Estalingrado Corp, autoría a nombre de la empresa (sin nominación personal), licencia de uso al negocio |
| `guias/CONTRATO-LICENCIA-USO.md` | interno (**no se publica**) | modelo en blanco del contrato entre Estalingrado Corp y el cliente |
| `guias/AUTORIZACION-DOMINIO.md` | interno (**no se publica**) | autorización para registrar/administrar el dominio + datos que hay que pedirle al cliente |
| `guias/ESTADO-ACTUAL.md` | interno (**no se publica**) | informe de estado para revisión: cómo está hecho el proyecto, cómo funciona, qué se verificó, **problemas conocidos** y pendientes por área |

### Los dos motivos por los que existen los documentos internos

1. **Reservar los derechos del software.** El código es estándar (HTML/CSS/JS sin dependencias) y el repo es público: sin documento, cualquiera puede copiarlo y publicarlo como propio. El `LICENSE` + el contrato lo cubren.
2. **Que el negocio no dependa del desarrollador.** Si mañana el developer "desaparece", el cliente tiene el contrato, el `LICENSE`, la autorización del dominio y el respaldo en la cuenta de la empresa.

### Pendientes que requieren al cliente

- [ ] **Firmar el contrato de licencia de uso** (se completa e imprime **fuera del repo**: el repositorio es público y no lleva CUIT, razón social, domicilio fiscal ni honorarios). **No se firma ahora**: la web funciona sin él y la reserva de derechos del software ya está cubierta por el `LICENSE` público. Se firma en la reunión de entrega, en este orden: autorización del dominio → traspaso de dominio y cuentas → contrato.
- [ ] **Entregar los datos de inscripción**: CUIT, Clave Fiscal nivel 2, razón social, domicilio legal, teléfono, email, DNI del representante.
- [ ] **Decidir la titularidad del dominio.** Hoy `laboutiquecatydog.com.ar` está **a nombre del desarrollador**. Dos caminos: (a) el cliente lo registra/transfiere a su nombre con su CUIT (NIC.ar: $8.500, tiene 4 días corridos para aceptar la transferencia y debe haber entrado antes a Trámites a Distancia) o (b) se mantiene a nombre del desarrollador y el cliente firma la **autorización** (`guias/AUTORIZACION-DOMINIO.md`), con compromiso de transferencia en 30 días una vez que entregue su CUIT.
- [ ] **Confirmar el texto del libro de reclamos virtual** con el contador (la Ley 27.266 no se pudo verificar en fuente oficial: `argentina.gob.ar` estaba caído) antes de darlo por exacto.
- [ ] **Completear los datos de la Empresa** cuando Estalingrado Corp tenga inscripción en ARCA: domicilio y CUIT (hoy no están en ningún documento público, a propósito).

### Lo que se decidió del lado de la Empresa

- El pie de la web dice **"Desarrollo y operación: Estalingrado Corp"** y la línea de copyright la tiene Estalingrado Corp: la reserva de derechos es de la empresa, no del nombre comercial del negocio. El negocio sigue apareciendo con su marca en todo el sitio.
- **Nada sensible en el repositorio público**: ni CUIT, ni razón social, ni domicilio fiscal, ni honorarios, ni datos del cliente.

---

## 10. Que la gente encuentre el sitio: Search Console y Google Business Profile

El sitio ya está en producción con el dominio propio; lo que falta es que Google lo indexe y que el local aparezca en las búsquedas locales ("pet shop cerca mío"). Son dos tareas separadas: la primera la puede hacer el desarrollador en 10 minutos; la segunda requiere al cliente (o alguien de su confianza).

### 10.1 — Google Search Console (propiedad del dominio)

1. Entrar a <https://search.google.com/search-console> con la cuenta de Google que se vaya a administrar.
2. **"Agregar propiedad"** → tipo **"Dominio"** (no "Prefijo de URL") → escribir `laboutiquecatydog.com.ar` → **Continuar**.
3. Google muestra un **registro TXT** de verificación (tipo `google-site-verification=...`).
   - En Cloudflare: **DNS → Registros → Añadir registro** → **Tipo: TXT** · **Nombre: `@`** · **Contenido: el valor que dio Google** · TTL Automático → **Guardar**.
   - Los TXT **no** se proxied: la nube queda gris siempre.
4. Volver a Search Console → **Verificar**. Puede tardar unos minutos.
5. **Sitemaps** (menú lateral) → escribir `sitemap.xml` → **Enviar**. El archivo ya apunta al dominio nuevo (`https://laboutiquecatydog.com.ar/sitemap.xml`) ✓.
6. **Inspección de URL** → escribir `https://laboutiquecatydog.com.ar/` → **Solicitar indexación**.
7. **La propiedad anterior** (`https://laboutiquecatydog.github.io/`, tipo prefijo) ya no sirve para nada: esa URL ahora redirige al dominio propio. Se puede borrar de Search Console y dejar solo la del dominio.

### 10.2 — Google Business Profile (la ficha del local)

Es lo que hace que el negocio aparezca en el mapa cuando alguien busca "pet shop Salta" o "tienda de mascotas cerca mío".

1. Entrar en <https://www.google.com/business/> → **"Agregar ubicación"**.
2. **Nombre del negocio**: `La Boutique Cat & Dog` (tiene que coincidir **exactamente** con el letrero del local).
3. **Categoría principal**: "Tienda de mascotas" (y secundarias: "Tienda de productos para mascotas", "Veterinario" solo si realmente ofrecen ese servicio).
4. **Dirección y zona de servicio**: el local en Diario La Nación y Diario El Litoral, B.º Periodista, Salta.
5. **Teléfono** y **horarios** → deben ser **idénticos** a los de la web y a los de Instagram (NAP consistente: nombre, dirección y teléfono iguales en todos lados).
6. **Fotos**: logo, vidriera y productos. Google penaliza las fichas sin fotos.
7. **Verificación**: Google manda una postcard o un SMS/llamada → puede tardar días o semanas. Se puede hacer el alta antes y completar después.

### 10.3 — Otros pendientes de presencia digital

- **Bing Webmaster Tools**: se importa la web desde Search Console en 2 clics (recomendado, gratis).
- **Actualizar los enlaces viejos**: códigos QR impresos, cartelería, la bio de Instagram, el WhatsApp de contacto y los marcadores del panel → que apunten a `https://laboutiquecatydog.com.ar/`. La URL anterior sigue redirigiendo, pero conviene dejar todo en el dominio definitivo.
- **Recordatorio anual**: la renovación del `.com.ar` se hace en **NIC.ar** (no en Cloudflare) → poner un recordatorio en el calendario para renewing.
- **El dominio a nombre del cliente**: hasta que entregue su CUIT, el `.com.ar` sigue a nombre del desarrollador. Mientras tanto, la **autorización** firmada (`guias/AUTORIZACION-DOMINIO.md`) es lo que amarra el vínculo.

