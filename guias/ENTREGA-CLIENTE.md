# Guía de entrega — cómo pasarle el proyecto al cliente

> Documentación interna: **no se publica** en el sitio (excluida por `_config.yml`).

Respondé las preguntas clave antes de la entrega. Regla general que lo explica todo:

> **El cliente NO necesita instalar NADA en su computadora.** Su página y su panel viven en internet (GitHub Pages + GitHub + Cloudflare) y se usan desde el navegador, igual que Gmail o WhatsApp Web. La copia local del proyecto es solo para desarrolladores.

---

## 0. Lo que hay que hacer ANTES de la entrega (35 minutos)

Hoy la **OAuth App** y el **Worker de login** son cuentas del **desarrollador**, no del cliente. Funcionan, pero dejan una dependencia: si mañana el desarrollador deja de pagar Cloudflare o cierra la cuenta, el cliente se queda sin panel. Se arregla con 3 pasos, en este orden.

### Paso 1 — Crear la OAuth App en la cuenta del cliente

1. Entrar a la cuenta de GitHub **del cliente** → Settings → Developer settings → OAuth Apps → **New OAuth App**.
2. Application name: `La Boutique Cat & Dog` · Homepage URL: `https://laboutiquecatydog.github.io/` · Authorization callback URL: `https://<SU-WORKER>.workers.dev/callback`.
3. GitHub muestra un **Client ID** y un **Client Secret**. Guardarlos: el Secret se muestra **una sola vez**.

### Paso 2 — Crear el Worker en la cuenta de Cloudflare del cliente

1. Entrar a la cuenta de Cloudflare **del cliente** → Workers & Pages → Create → Worker → nombre `sveltia-cms-auth` (o el que se prefiera).
2. Pegar el contenido de `tools/worker-editor.js` **actualizado** (ya trae el scope reducido a `public_repo` y los mensajes de error claros).
3. Edit → Deploy.
4. Editar las **variables de entorno** del Worker (Settings → Variables and Secrets):
   - `CLIENT_ID` = el Client ID del paso 1
   - `CLIENT_SECRET` = el Client Secret del paso 1
   - `ORIGIN` = `https://laboutiquecatydog.github.io`
   - `ALLOWED_REPOS` = `laboutiquecatydog/laboutiquecatydog.github.io`

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
| **Cuenta de Cloudflare** (la del Worker del login) | Ya existe | También a su nombre (es el correo que creó el worker) |
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

- [ ] **Re-desplegar el Worker** con `tools/worker-editor.js` actualizado (scope `public_repo` + mensajes claros). Workers & Pages → `sveltia-cms-auth` → Edit code → pegar → Deploy.
- [ ] **Trasladar la OAuth App y el Worker** a las cuentas del cliente (sección 0, pasos 1 a 3) — o, si no, dejar el Worker del desarrollador y entregar un PAT de alcance fino como plan B.
- [ ] Push a producción y **verificar los 404** de la documentación interna: `/BITACORA.md`, `/README.md`, `/guias/INFORME-SEGURIDAD.html`, `/tools/worker-editor.js` y `/preview.cmd` deben dar **404**.
- [ ] Verificar que dan **200**: `/privacidad.html`, `/404.html`, `/manifest.json`.
- [ ] Verificar que la rama `main` está protegida (Settings → Branches → `main` → "Branch protection rule" activa).
- [ ] Probar el login con una cuenta **sin** permiso de escritura → debe rechazarla.

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

Nada se pierde: el cliente es dueño de las cuentas y del repositorio; el código es estándar (HTML/CSS/JS sin dependencias) y está documentado (README + bitácora). Cualquier desarrollador puede continuar. Ese es justamente el argumento de venta.
