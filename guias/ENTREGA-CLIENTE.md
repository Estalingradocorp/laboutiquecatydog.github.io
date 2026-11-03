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

- **Atajo discreto (nuevo):** tres clics seguidos en el logo de la web → abre el panel. Sigue pidiendo login con GitHub.
- **Forma principal:** el link `…/admin/editor.html` guardado como **marcador/favorito** en su navegador y su celu (enseñale a guardarlo en la pantalla de inicio del celu — es un atajo de navegador, se llama "Agregar a la pantalla principal").
- `/admin/` también redirige al panel.
- Recordale: la sesión vive en la pestaña; si la cierra, vuelve a "Iniciar sesión".

## 6. Checklist de la reunión de entrega

### Antes de la reunión (técnico)

- [x] **Re-desplegar el Worker** con `tools/worker-editor.js` actualizado (scope `public_repo` + mensajes claros). → **Hecho 2026-11-03** por API (Cloudflare), bindings y secrets conservados, verificado: el redirect a GitHub ahora pide `public_repo,user`.
- [x] Push a producción y **verificar los 404** de la documentación interna: `/BITACORA.md`, `/README.md`, `/guias/*`, `/tools/*` y `/preview.cmd` → **404 verificado en producción**.
- [x] Verificar que dan **200**: `/privacidad.html`, `/404.html`, `/manifest.json` → **verificado**.
- [x] Verificar que la rama `main` está protegida (force-push y borrado bloqueados) → **verificado**.
- [x] Probar el login con una cuenta **sin** permiso de escritura → la rechaza con el mensaje claro y borra el token de la sesión → **4/4 pruebas OK**.
- [x] Login real end-to-end con el scope nuevo: `/auth` → GitHub → `/callback` (código canjeado) → panel → **verificado en el log del Worker**.
- [ ] ~~Trasladar la OAuth App y el Worker a las cuentas del cliente~~ → **descartado**: la llave se queda en la cuenta del desarrollador (sección 0). Queda documentado por si el cliente lo pide.
- [ ] **Prueba de escritura** con el token del scope `public_repo`: confirmar que el panel puede publicar (ver nota abajo).
- [ ] Dar de alta al cliente en el panel con su propia cuenta y **practicar un cambio real** (texto + foto) → ver checklist de la reunión.

> **Prueba de escritura (sin dejar rastro):** en el navegador donde ya entró el panel, abrir la consola y ejecutar la creación y el borrado de una rama de prueba. Si el POST y el DELETE devuelven 201 y 204, el token tiene permiso de escritura sobre el repo público y el botón **Publicar** va a funcionar.

### En la reunión (con el cliente)

- [ ] Entregar credenciales (sobre cerrado o gestor de contraseñas) y verificar que el cliente **inicia sesión él mismo** desde su propio celu.
- [ ] Activar 2FA juntos y guardar los códigos de recuperación.
- [ ] Guardar el marcador del panel en el celu del cliente.
- [ ] Practicar con él/ella un cambio real (un texto + una foto) y publicarlo.
- [ ] Mostrar el botón **«?»** del panel y regalarle el `guias/` impreso o en PDF.
- [ ] Dejar el pendrive de respaldo.
- [ ] Aclarar el plan de soporte acordado (ej.: ajustes incluidos por 30 dias).
- [ ] Explicar el modelo de seguridad en 30 segundos: "la web es pública (se puede ver el código), lo único protegido es **quién puede publicar**, y eso lo decide GitHub con tu cuenta".

## 7. Qué hacer si mañana te llamás "desaparecido"

Nada se pierde: el cliente es dueño del repositorio y de su cuenta de GitHub (por eso sus commits quedan a su nombre y puede seguir publicando aunque el desarrollador se borre); el código es estándar (HTML/CSS/JS sin dependencias) y está documentado (README + bitácora). Cualquier desarrollador puede continuar. Ese es justamente el argumento de venta.

Lo único que hoy depende del desarrollador es la **llave del login** (OAuth App + Worker): si desaparece, el cliente entra con el **PAT de alcance fino** (plan B de la sección 0) y sigue publicando. El traspaso de la llave al cliente está documentado en 3 pasos por si el cliente quiere cerrarlo del todo.
