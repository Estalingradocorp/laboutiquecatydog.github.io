/* ==========================================================================
   La Boutique Cat & Dog — Motor de imágenes del editor (W3)
   --------------------------------------------------------------------------
   Selector de imágenes con dos orígenes:
   - Galería: las imágenes que ya viven en assets/img/ del repositorio
     (vía API de GitHub, funciona también con el repo privado).
   - Subida: archivo de la PC → canvas lo optimiza (JPEG 82 %, máximo
     1600 px de ancho + variante -900 cuando el campo la necesita) y lo
     sube con la API de Git Data en UN solo commit por imagen.
   El logo mantiene PNG (transparencia) con máximo 600 px.
   Al elegir, devuelve { imagen, srcset?, ancho, alto } y quien llamó
   decide en qué campo del modelo se aplica.
   ========================================================================== */
(function () {
  "use strict";

  var REPO = "Estalingradocorp/laboutiquecatydog.github.io";
  var BRANCH = "main";
  var API = "https://api.github.com";
  var CARPETA = "assets/img";
  var CLAVE_TOKEN = "BQ_TOKEN";

  /* Modo local: en localhost/127.0.0.1 sin token, la galería y la
     subida usan esta carpeta (assets/img/) en vez de la API de
     GitHub, para poder probar imágenes sin credenciales. */
  function esLocal() {
    var h = location.hostname;
    return (h === "localhost" || h === "127.0.0.1") && !token();
  }

  var EXTENSIONES = ["jpg", "jpeg", "png", "webp", "svg"];
  var TAMANO_MAX = 8 * 1024 * 1024;

  /* Estado del selector abierto */
  var ACTUAL = null;          /* configuración de la llamada en curso */
  var listaGaleria = null;     /* [{name, path, size}] */
  var miniaturas = {};         /* path -> objectURL */
  var pendiente = null;        /* archivo procesado listo para subir */
  var seleccion = [];          /* ítems de galería marcados (uno o varios) */

  /* ----------------------------- Base API ------------------------------- */
  function token() { return sessionStorage.getItem(CLAVE_TOKEN) || ""; }

  function apiFetch(ruta, opciones) {
    var ini = opciones || {};
    var cabeceras = {
      Authorization: "Bearer " + token(),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    Object.keys(ini.headers || {}).forEach(function (k) { cabeceras[k] = ini.headers[k]; });
    return fetch(API + ruta, { method: ini.method || "GET", headers: cabeceras, body: ini.body });
  }

  function alFallar(res) {
    if (res.status === 401) { throw new Error("La sesión venció: volvé a iniciar sesión."); }
    if (res.status === 403) { throw new Error("Tu cuenta no tiene permiso para publicar en este repositorio."); }
    if (res.status === 404) { throw new Error("No se encontró el archivo o la carpeta en GitHub."); }
    if (res.status === 409 || res.status === 422) { throw new Error("El repositorio cambió mientras subías (reintentá)."); }
    if (res.status === 429) { throw new Error("GitHub te pidió esperar un momento. Volvé a intentar en un minuto."); }
    if (res.status >= 500) { throw new Error("GitHub está teniendo problemas ahora. Probá de nuevo en unos minutos."); }
    throw new Error("No se pudo completar la operación con GitHub (código " + res.status + ").");
  }

  /* ----------------------------- Galería -------------------------------- */
  function listarGaleria() {
    if (listaGaleria) { return Promise.resolve(listaGaleria); }
    if (esLocal()) {
      return fetch("/__local/imagenes").then(function (res) {
        if (!res.ok) { throw new Error("No se pudo leer la galería local (código " + res.status + ")."); }
        return res.json();
      }).then(function (items) {
        listaGaleria = items;
        return listaGaleria;
      });
    }
    return apiFetch("/repos/" + REPO + "/contents/" + CARPETA + "?ref=" + BRANCH)
      .then(function (res) { if (!res.ok) { alFallar(res); } return res.json(); })
      .then(function (items) {
        listaGaleria = (Array.isArray(items) ? items : [])
          .filter(function (it) { return it.type === "file"; })
          .filter(function (it) {
            var ext = (it.name.split(".").pop() || "").toLowerCase();
            return EXTENSIONES.indexOf(ext) !== -1 && (it.size || 0) < TAMANO_MAX;
          })
          .map(function (it) { return { name: it.name, path: it.path, size: it.size }; });
        return listaGaleria;
      });
  }

  /* Miniatura de la galería. Antes se retenía el archivo ORIGINAL completo
     en memoria (un objectURL por imagen) y se cargaban todas de una vez:
     con muchas fotos eso hundía la memoria del navegador. Ahora:
     - se descarga, se mide la imagen original (para completar ancho/alto),
     - se genera una miniatura liviana en canvas,
     - se libera el original (revokeObjectURL),
     - y cada miniatura se pide solo cuando la miniatura entra en pantalla. */
  function miniaturaDe(item) {
    if (miniaturas[item.path]) { return Promise.resolve(miniaturas[item.path]); }
    var pedir;
    if (esLocal()) {
      /* En local la imagen ya está en este disco: se pide al servidor */
      pedir = fetch("/" + item.path).then(function (res) {
        if (!res.ok) { throw new Error("No se pudo leer la imagen local."); }
        return res.blob();
      });
    } else {
      pedir = apiFetch("/repos/" + REPO + "/contents/" + item.path + "?ref=" + BRANCH,
        { headers: { Accept: "application/vnd.github.raw" } })
        .then(function (res) { if (!res.ok) { alFallar(res); } return res.blob(); });
    }
    return pedir
      .then(function (blob) {
        return new Promise(function (ok) {
          var url = URL.createObjectURL(blob);
          var im = new Image();
          im.onload = function () {
            var ancho = im.naturalWidth || 0;
            var alto = im.naturalHeight || 0;
            var resultado = { url: "", ancho: ancho, alto: alto };
            if (ancho && alto) {
              try {
                var max = 400;
                var esc = Math.min(1, max / ancho);
                var cv = document.createElement("canvas");
                cv.width = Math.max(1, Math.round(ancho * esc));
                cv.height = Math.max(1, Math.round(alto * esc));
                var ctx = cv.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, cv.width, cv.height);
                ctx.drawImage(im, 0, 0, cv.width, cv.height);
                resultado.url = cv.toDataURL("image/jpeg", 0.72);
              } catch (e2) {
                /* Si el canvas no puede generarse (SVG raro, etc.) se usa
                   el original, pero igual se libera el objectURL al cerrar. */
                resultado.url = url;
                resultado.usaOriginal = true;
              }
            } else {
              resultado.url = url;
              resultado.usaOriginal = true;
            }
            if (!resultado.usaOriginal) { URL.revokeObjectURL(url); }
            miniaturas[item.path] = resultado;
            ok(resultado);
          };
          im.onerror = function () {
            URL.revokeObjectURL(url);
            ok({ url: "", ancho: 0, alto: 0 });
          };
          im.src = url;
        });
      });
  }

  /* Variante -900 de una foto de galería (convención de nombres del sitio) */
  function variantesGaleria(item, ancho) {
    var m = item.name.match(/^(.*)(\.[a-z0-9]+)$/i);
    if (!m) { return null; }
    var candidata = m[1] + "-900" + m[2];
    var existe = listaGaleria && listaGaleria.some(function (o) { return o.name === candidata; });
    if (!existe) { return null; }
    return CARPETA + "/" + candidata + " 900w, " + item.path + " " + ancho + "w";
  }

  /* Carga diferida: cada miniatura se pide recién cuando entra en pantalla.
     Con 40 fotos en el repo, antes se descargaban todas de golpe. */
  var observador = null;

  function observarMiniatura(boton, item) {
    var cargar = function () {
      miniaturaDe(item).then(function (r) {
        var img = boton.querySelector("img");
        if (img && r.url) { img.src = r.url; }
        boton.dataset.ancho = r.ancho || "";
        boton.dataset.alto = r.alto || "";
      }).catch(function () {
        var img = boton.querySelector("img");
        if (img) { img.removeAttribute("src"); }
      });
    };
    if (!("IntersectionObserver" in window)) { cargar(); return; }
    if (!observador) {
      observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) { return; }
          observador.unobserve(e.target);
          if (e.target._cargarMiniatura) { e.target._cargarMiniatura(); }
        });
      }, { rootMargin: "200px" });
    }
    boton._cargarMiniatura = cargar;
    observador.observe(boton);
  }

  function pintarGaleria() {
    var zona = document.getElementById("media-galeria");
    zona.innerHTML = '<p class="form-vacio">Cargando la galería…</p>';
    listarGaleria().then(function (items) {
      if (!ACTUAL) { return; }
      zona.innerHTML = "";
      if (!items.length) {
        zona.innerHTML = '<p class="form-vacio">Todavía no hay imágenes: usá la pestaña «Subir desde la PC».</p>';
        return;
      }
      items.forEach(function (item) {
        var boton = document.createElement("button");
        boton.type = "button";
        boton.className = "media-item";
        boton.title = item.name;
        var img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        boton.appendChild(img);
        var pie = document.createElement("small");
        pie.textContent = item.name;
        boton.appendChild(pie);
        boton.addEventListener("click", function () {
          /* Tocar marca o desmarca: se pueden elegir varias imágenes
             de una vez y confirmar con el botón de arriba. */
          var i = seleccion.indexOf(item);
          if (i === -1) {
            seleccion.push(item);
            boton.classList.add("is-seleccionada");
          } else {
            seleccion.splice(i, 1);
            boton.classList.remove("is-seleccionada");
          }
          actualizarSeleccion();
        });
        zona.appendChild(boton);
        observarMiniatura(boton, item);
      });
    }).catch(function (err) {
      zona.innerHTML = "";
      var aviso = document.createElement("p");
      aviso.className = "form-vacio";
      aviso.textContent = err.message;
      zona.appendChild(aviso);
    });
  }

  /* --------------------- Selección múltiple de la galería ---------------- */
  function actualizarSeleccion() {
    var grupo = document.getElementById("media-seleccion");
    var contador = document.getElementById("media-contador");
    var boton = document.getElementById("media-confirmar");
    var n = seleccion.length;
    if (grupo) { grupo.hidden = n === 0; }
    if (contador) { contador.textContent = n + (n === 1 ? " imagen" : " imágenes"); }
    if (boton) { boton.textContent = n > 1 ? "Agregar " + n : "Usar imagen"; }
    if (boton) { boton.hidden = n === 0; }
  }

  /* Carga la imagen de un ítem de galería para editarla. */
  function cargarImagenRuta(ruta) {
    var pedir;
    if (esLocal()) {
      pedir = fetch("/" + ruta).then(function (res) {
        if (!res.ok) { throw new Error("No se pudo leer la imagen."); }
        return res.blob();
      });
    } else {
      pedir = apiFetch("/repos/" + REPO + "/contents/" + ruta + "?ref=" + BRANCH,
        { headers: { Accept: "application/vnd.github.raw" } })
        .then(function (res) { if (!res.ok) { alFallar(res); } return res.blob(); });
    }
    return pedir.then(function (blob) { return cargarImagen(blob); });
  }

  /* Las imágenes de la galería también se editan (recorte + zoom) una
     por una antes de confirmar: cada recorte genera un archivo nuevo
     que se sube y, al terminar la cola, se aplican todas juntas. */
  function confirmarSeleccion() {
    var cfg = ACTUAL;
    if (!cfg || !seleccion.length) { return; }
    var cola = seleccion.slice();
    var total = cola.length;
    var hechas = [];
    seleccion = [];
    actualizarSeleccion();
    activarPestana("subir");

    var siguiente = function () {
      var item = cola.shift();
      var numero = hechas.length + 1;
      if (!item) {
        listaGaleria = null;
        miniaturas = {};
        cerrar();
        if (cfg.alElegirMultiple) { cfg.alElegirMultiple(hechas); }
        else if (cfg.alElegir && hechas.length) { cfg.alElegir(hechas[0]); }
        return;
      }
      cargarImagenRuta(item.path).then(function (r) {
        abrirRecorte(r.img, cfg, function (principal, chica) {
          var formato = cfg.tipo === "logo" ? "image/png" : "image/jpeg";
          var ext = cfg.tipo === "logo" ? ".png" : ".jpg";
          var nombre = slug(item.name) + "-" + sufijo();
          var archivos = [{
            ruta: CARPETA + "/" + nombre + ext,
            b64: principal.toDataURL(formato, 0.82).split(",")[1],
            ancho: principal.width,
            alto: principal.height
          }];
          if (chica) {
            archivos.push({
              ruta: CARPETA + "/" + nombre + "-900" + ext,
              b64: chica.toDataURL(formato, 0.82).split(",")[1]
            });
          }
          var datos = {
            archivos: archivos,
            nombre: nombre + ext,
            ancho: archivos[0].ancho,
            alto: archivos[0].alto,
            srcset: archivos.length > 1
              ? archivos[1].ruta + " 900w, " + archivos[0].ruta + " " + archivos[0].ancho + "w"
              : null,
            prevista: principal.toDataURL(formato, 0.82)
          };
          subirDatos(datos).then(function () {
            hechas.push(resultadoDe(datos));
            siguiente();
          }).catch(function (err) {
            alerta(err.message);
            siguiente();
          });
        }, { i: numero, total: total });
      }).catch(function (err) {
        alerta(err.message);
        siguiente();
      });
    };
    siguiente();
  }

  /* ------------------------------ Subida -------------------------------- */
  function slug(nombre) {
    var base = nombre.replace(/\.[a-z0-9]+$/i, "");
    base = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    base = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!base) { base = "imagen"; }
    if (base.length > 40) { base = base.slice(0, 40); }
    return base;
  }

  function sufijo() {
    var bytes = new Uint8Array(3);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var j = 0; j < bytes.length; j++) { bytes[j] = Math.floor(Math.random() * 256); }
    }
    var s = "";
    for (var i = 0; i < bytes.length; i++) { s += ("0" + bytes[i].toString(16)).slice(-2); }
    return s;
  }

  function cargarImagen(archivo) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(archivo);
      var im = new Image();
      im.onload = function () { ok({ img: im, url: url }); };
      im.onerror = function () { URL.revokeObjectURL(url); no(new Error("No se pudo leer la imagen.")); };
      im.src = url;
    });
  }

  function dibujar(im, anchoMax, tipo) {
    var w = im.naturalWidth || 1;
    var h = im.naturalHeight || 1;
    var escala = Math.min(1, anchoMax / w);
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * escala));
    canvas.height = Math.max(1, Math.round(h * escala));
    var ctx = canvas.getContext("2d");
    if (tipo !== "logo") {
      /* El JPEG no tiene transparencia: fondo blanco */
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /* ------------------------- Editor de recorte -------------------------- */
  /* La imagen se encuadra y se elige el zoom ANTES de subir: la vista
     es el recorte exacto que se guarda. La escala base cubre el
     viewport (nada se corta sin querer) y el paneo se limita para que
     nunca queden huecos: la foto no se "rompe" al encuadrar. */
  var REC = null;

  function abrirRecorte(im, config, alListo, progreso) {
    REC = {
      img: im,
      config: config,
      alListo: alListo,
      ratio: config.tipo === "logo" ? "1:1" : "4:3",
      zoom: 1,
      ox: 0,
      oy: 0,
      arrastrando: null
    };
    var caja = document.getElementById("media-recorte");
    var viewport = document.getElementById("media-recorte-viewport");
    var zoom = document.getElementById("media-recorte-zoom");
    var paso = document.getElementById("media-recorte-paso");
    document.getElementById("media-prevista").hidden = true;
    caja.hidden = false;
    zoom.value = 100;
    if (paso) {
      if (progreso && progreso.total > 1) {
        paso.textContent = "Imagen " + progreso.i + " de " + progreso.total;
        paso.hidden = false;
      } else {
        paso.hidden = true;
      }
    }
    REC.ox = 0; REC.oy = 0; REC.zoom = 1;
    aplicarRatioVista();
    caja.querySelectorAll(".recorte-ratio").forEach(function (b) {
      b.classList.toggle("is-activo", b.getAttribute("data-ratio") === REC.ratio);
    });
    pintarRecorte();
  }

  function cerrarRecorte() {
    var caja = document.getElementById("media-recorte");
    if (caja) { caja.hidden = true; }
    document.getElementById("media-archivo").value = "";
    REC = null;
  }

  function aplicarRatioVista() {
    var viewport = document.getElementById("media-recorte-viewport");
    if (REC.ratio === "libre") {
      var w = REC.img.naturalWidth || 1;
      var h = REC.img.naturalHeight || 1;
      viewport.style.aspectRatio = (w / h).toFixed(3);
    } else {
      viewport.style.aspectRatio = REC.ratio.replace(":", " / ");
    }
  }

  /* Escala base que cubre el viewport (cover) y recorte en fuente.
     Con zoom menor a 100% la foto se aleja y entra entera (con fondo
     neutro alrededor): así se encuadra sin cortar nada. */
  function medidaRecorte() {
    var viewport = document.getElementById("media-recorte-viewport");
    var vw = viewport.clientWidth || 1;
    var vh = viewport.clientHeight || 1;
    var w = REC.img.naturalWidth || 1;
    var h = REC.img.naturalHeight || 1;
    var base = Math.max(vw / w, vh / h);
    var escala = base * REC.zoom;
    var anchoVisible = vw / escala;
    var altoVisible = vh / escala;
    return { vw: vw, vh: vh, escala: escala, anchoVisible: anchoVisible, altoVisible: altoVisible };
  }

  function limitarRecorte() {
    var m = medidaRecorte();
    var w = REC.img.naturalWidth || 1;
    var h = REC.img.naturalHeight || 1;
    /* Si la foto entra entera en un eje, se centra; si no, se limita
       al borde para que nunca queden huecos al paneo. */
    function eje(pos, visible, total) {
      if (visible >= total) { return (total - visible) / 2; }
      return Math.min(total - visible, Math.max(0, pos));
    }
    REC.ox = eje(REC.ox, m.anchoVisible, w);
    REC.oy = eje(REC.oy, m.altoVisible, h);
  }

  function pintarRecorte() {
    if (!REC) { return; }
    limitarRecorte();
    var m = medidaRecorte();
    var canvas = document.getElementById("media-recorte-canvas");
    canvas.width = m.vw;
    canvas.height = m.vh;
    var ctx = canvas.getContext("2d");
    /* Fondo blanco como el JPG final: lo que se ve acá es lo que se guarda */
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, m.vw, m.vh);
    ctx.drawImage(REC.img, -REC.ox * m.escala, -REC.oy * m.escala,
      (REC.img.naturalWidth || 1) * m.escala, (REC.img.naturalHeight || 1) * m.escala);
  }

  function confirmarRecorte() {
    if (!REC) { return; }
    var config = REC.config;
    var m = medidaRecorte();
    var anchoMax = config.tipo === "logo" ? 600 : 1600;
    var formato = config.tipo === "logo" ? "image/png" : "image/jpeg";

    function dibujarRecorte(anchoSalida) {
      var escalaSalida = anchoSalida / m.anchoVisible;
      var canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(m.anchoVisible * escalaSalida));
      canvas.height = Math.max(1, Math.round(m.altoVisible * escalaSalida));
      var ctx = canvas.getContext("2d");
      if (config.tipo !== "logo") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(REC.img, REC.ox, REC.oy, m.anchoVisible, m.altoVisible,
        0, 0, canvas.width, canvas.height);
      return canvas;
    }

    var recortada = (REC.img.naturalWidth || 1) > anchoMax
      ? dibujarRecorte(anchoMax)
      : dibujarRecorte(REC.img.naturalWidth || 1);
    var variante = null;
    if (config.conSrcset && recortada.width > 900) {
      variante = dibujarRecorte(900);
    }
    var listo = REC.alListo;
    cerrarRecorte();
    if (listo) { listo(recortada, variante); }
  }

  /* Procesa el archivo elegido y deja todo listo para subir */
  function procesarPendiente(archivo) {
    var config = ACTUAL;
    /* Límite de tamaño: antes solo filtraba la galería y la subida no
       tenía control (una foto de 40 MB colapsaba el navegador). */
    if (!archivo) { return; }
    if (archivo.size > TAMANO_MAX) {
      alerta("La imagen pesa " + Math.round(archivo.size / 1024 / 1024) +
        " MB. El máximo es " + Math.round(TAMANO_MAX / 1024 / 1024) +
        " MB. Bajala o recortala antes de subirla.");
      return;
    }
    var extArchivo = (archivo.name.split(".").pop() || "").toLowerCase();
    if (EXTENSIONES.indexOf(extArchivo) === -1) {
      alerta("Ese tipo de archivo no se puede subir. Usá JPG, PNG, WEBP o SVG.");
      return;
    }
    cargarImagen(archivo).then(function (r) {
      /* Primero se encuadra y se elige el zoom; recién ahí se genera
         la imagen final (así nada queda cortado sin querer). */
      abrirRecorte(r.img, config, function (principal, chica) {
        var formato = config.tipo === "logo" ? "image/png" : "image/jpeg";
        var ext = config.tipo === "logo" ? ".png" : ".jpg";
        var nombre = slug(archivo.name) + "-" + sufijo();
        var archivos = [{
          ruta: CARPETA + "/" + nombre + ext,
          b64: principal.toDataURL(formato, 0.82).split(",")[1],
          ancho: principal.width,
          alto: principal.height
        }];
        var prevista = principal.toDataURL(formato, 0.82);

        /* Variante -900 solo cuando el campo la usa (fotos del carrusel) */
        if (chica) {
          archivos.push({
            ruta: CARPETA + "/" + nombre + "-900" + ext,
            b64: chica.toDataURL(formato, 0.82).split(",")[1]
          });
        }

      pendiente = {
        archivos: archivos,
        nombre: nombre + ext,
        ancho: archivos[0].ancho,
        alto: archivos[0].alto,
        srcset: archivos.length > 1
          ? archivos[1].ruta + " 900w, " + archivos[0].ruta + " " + archivos[0].ancho + "w"
          : null,
        prevista: prevista
      };

      document.getElementById("media-prevista").hidden = false;
      document.getElementById("media-prevista-img").src = prevista;
      document.getElementById("media-prevista-info").textContent =
        "Se subirá como " + pendiente.nombre + " (" + pendiente.ancho + "×" + pendiente.alto +
        (archivos.length > 1 ? " + variante -900" : "") + ")";
      }); /* fin de abrirRecorte */
    }).catch(function (err) {
      document.getElementById("media-prevista").hidden = true;
      alerta(err.message);
    });
  }

  /* Sube los archivos ya preparados (en local: a esta carpeta; en
     producción: un commit por imagen en GitHub). */
  function subirDatos(datos) {
    if (esLocal()) {
      return datos.archivos.reduce(function (cadena, arch) {
        return cadena.then(function () {
          return fetch("/__local/subir-imagen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ruta: arch.ruta, b64: arch.b64 })
          }).then(function (res) {
            if (!res.ok) { throw new Error("No se pudo guardar la imagen en local (código " + res.status + ")."); }
            return res.json();
          });
        });
      }, Promise.resolve());
    }
    return subirAGithub(datos);
  }

  function resultadoDe(datos) {
    var resultado = {
      imagen: datos.archivos[0].ruta,
      srcset: datos.srcset,
      ancho: datos.ancho,
      alto: datos.alto
    };
    window.BQ_SUBIDAS = window.BQ_SUBIDAS || {};
    window.BQ_SUBIDAS[resultado.imagen] = datos.prevista;
    return resultado;
  }

  /* Un solo commit por imagen: blobs + árbol + commit + ref */
  function subirPendiente() {
    if (!pendiente || !ACTUAL) { return; }
    /* Se capturan los datos acá: si el cliente cierra el modal mientras se
       sube, "pendiente" y "ACTUAL" se vacían y el código reventaba con
       "Cannot read properties of null" al final de la subida. */
    var datos = pendiente;
    var cfg = ACTUAL;
    var boton = document.getElementById("media-subir-btn");
    boton.disabled = true;
    boton.textContent = "Subiendo…";

    var subida = subirDatos(datos);

    subida
      .then(function () {
        /* La galería cambió: que la próxima apertura la vuelva a leer */
        listaGaleria = null;
        miniaturas = {};
        var resultado = resultadoDe(datos);
        /* Si el modal se cerró durante la subida, la imagen queda subida
           pero no se aplica a ningún campo: se avisa para que la clienta
           sepa que puede elegirla desde la galería. */
        var seguir = document.getElementById("modal-imagenes").hidden;
        cerrar();
        if (seguir) {
          alerta("La imagen se subió (" + datos.nombre + "), pero el selector se había cerrado: " +
            "abrí de nuevo el campo y elegila desde la galería.");
          return;
        }
        if (cfg && cfg.alElegir) { cfg.alElegir(resultado); }
      })
      .catch(function (err) {
        var b = document.getElementById("media-subir-btn");
        if (b) {
          b.disabled = false;
          b.textContent = "Subir y usar";
        }
        alerta(err.message);
      });
  }

  /* Subida publicada: un solo commit por imagen con la API de Git Data
     (blobs + árbol + commit + actualizar la referencia). */
  function subirAGithub(datos) {
    var shas = [];
    var paso = Promise.resolve();

    datos.archivos.forEach(function (arch) {
      paso = paso.then(function () {
        return apiFetch("/repos/" + REPO + "/git/blobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: arch.b64, encoding: "base64" })
        }).then(function (res) {
          if (!res.ok) { alFallar(res); }
          return res.json();
        }).then(function (blob) { shas.push({ path: arch.ruta, sha: blob.sha }); });
      });
    });

    var base = null;
    return paso
      .then(function () {
        return apiFetch("/repos/" + REPO + "/git/ref/heads/" + BRANCH);
      })
      .then(function (res) { if (!res.ok) { alFallar(res); } return res.json(); })
      .then(function (ref) {
        base = ref.object.sha;
        return apiFetch("/repos/" + REPO + "/git/commits/" + base);
      })
      .then(function (res) { if (!res.ok) { alFallar(res); } return res.json(); })
      .then(function (commit) {
        return apiFetch("/repos/" + REPO + "/git/trees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base_tree: commit.tree.sha,
            tree: shas.map(function (s) {
              return { path: s.path, mode: "100644", type: "blob", sha: s.sha };
            })
          })
        });
      })
      .then(function (res) { if (!res.ok) { alFallar(res); } return res.json(); })
      .then(function (tree) {
        return apiFetch("/repos/" + REPO + "/git/commits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "Editor visual: subir imagen " + datos.nombre,
            tree: tree.sha,
            parents: [base]
          })
        });
      })
      .then(function (res) { if (!res.ok) { alFallar(res); } return res.json(); })
      .then(function (commit) {
        return apiFetch("/repos/" + REPO + "/git/refs/heads/" + BRANCH, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sha: commit.sha, force: false })
        });
      })
      .then(function (res) { if (!res.ok) { alFallar(res); } return res.json(); });
  }

  function alerta(texto) {
    /* Si el modal está cerrado, el aviso no se vería: se muestra como
       notificación para que el error nunca se pierda en silencio. */
    var modal = document.getElementById("modal-imagenes");
    if (modal && modal.hidden) {
      if (window.BQToast) { window.BQToast(texto, "error", 6000); }
      return;
    }
    var aviso = document.getElementById("media-aviso");
    if (!aviso) {
      aviso = document.createElement("p");
      aviso.id = "media-aviso";
      aviso.className = "auth-error";
      document.querySelector("#modal-imagenes .modal-caja").appendChild(aviso);
    }
    aviso.textContent = texto;
    aviso.hidden = false;
    window.setTimeout(function () { aviso.hidden = true; }, 6000);
  }

  /* --------------------------- Interfaz pública ------------------------- */
  function activarPestana(cual) {
    var galeria = document.getElementById("media-galeria");
    var subir = document.getElementById("media-subir");
    document.getElementById("media-tab-galeria").classList.toggle("is-activo", cual === "galeria");
    document.getElementById("media-tab-subir").classList.toggle("is-activo", cual === "subir");
    if (cual === "galeria") {
      subir.hidden = true;
      galeria.hidden = false;
      pintarGaleria();
    } else {
      galeria.hidden = true;
      subir.hidden = false;
    }
  }

  function cerrar() {
    pendiente = null;
    ACTUAL = null;
    seleccion = [];
    actualizarSeleccion();
    cerrarRecorte();
    if (window.BQModales && window.BQModales.cerrar) {
      window.BQModales.cerrar(document.getElementById("modal-imagenes"));
    } else {
      document.getElementById("modal-imagenes").hidden = true;
    }
    document.getElementById("media-prevista").hidden = true;
    document.getElementById("media-archivo").value = "";
    var b = document.getElementById("media-subir-btn");
    b.disabled = false;
    b.textContent = "Subir y usar";
    /* Se libera la galería: las miniaturas generadas se quedan en memoria
       si no, y el observador sigue mirando nodos que ya no existen. */
    if (observador) { observador.disconnect(); observador = null; }
    Object.keys(miniaturas).forEach(function (ruta) {
      var m = miniaturas[ruta];
      if (m && m.usaOriginal && m.url && m.url.indexOf("blob:") === 0) {
        URL.revokeObjectURL(m.url);
      }
    });
    miniaturas = {};
    var zona = document.getElementById("media-galeria");
    if (zona) { zona.innerHTML = ""; }
  }

  var conectado = false;
  function conectarUnaVez() {
    if (conectado) { return; }
    conectado = true;
    document.getElementById("media-tab-galeria").addEventListener("click", function () { activarPestana("galeria"); });
    document.getElementById("media-tab-subir").addEventListener("click", function () { activarPestana("subir"); });
    document.getElementById("media-confirmar").addEventListener("click", confirmarSeleccion);

    /* Editor de recorte: proporciones, zoom y paneo por arrastre */
    var cajaRecorte = document.getElementById("media-recorte");
    cajaRecorte.querySelectorAll(".recorte-ratio").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!REC) { return; }
        REC.ratio = b.getAttribute("data-ratio");
        cajaRecorte.querySelectorAll(".recorte-ratio").forEach(function (o) {
          o.classList.toggle("is-activo", o === b);
        });
        aplicarRatioVista();
        pintarRecorte();
      });
    });
    document.getElementById("media-recorte-zoom").addEventListener("input", function (ev) {
      if (!REC) { return; }
      REC.zoom = Math.max(0.25, Number(ev.target.value) / 100);
      pintarRecorte();
    });
    document.getElementById("media-recorte-confirmar").addEventListener("click", confirmarRecorte);
    document.getElementById("media-recorte-cancelar").addEventListener("click", function () {
      cerrarRecorte();
      alerta("Se canceló la subida de la imagen.");
    });

    var viewport = document.getElementById("media-recorte-viewport");
    viewport.addEventListener("pointerdown", function (ev) {
      if (!REC) { return; }
      REC.arrastrando = { x: ev.clientX, y: ev.clientY, ox: REC.ox, oy: REC.oy };
      viewport.setPointerCapture(ev.pointerId);
    });
    viewport.addEventListener("pointermove", function (ev) {
      if (!REC || !REC.arrastrando) { return; }
      var m = medidaRecorte();
      REC.ox = REC.arrastrando.ox - (ev.clientX - REC.arrastrando.x) / m.escala;
      REC.oy = REC.arrastrando.oy - (ev.clientY - REC.arrastrando.y) / m.escala;
      pintarRecorte();
    });
    viewport.addEventListener("pointerup", function () {
      if (REC) { REC.arrastrando = null; }
    });
    viewport.addEventListener("pointercancel", function () {
      if (REC) { REC.arrastrando = null; }
    });
    document.getElementById("media-archivo").addEventListener("change", function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (f && ACTUAL) { procesarPendiente(f); }
    });
    document.getElementById("media-subir-btn").addEventListener("click", subirPendiente);
  }

  window.BQMedia = {
    /* config: { titulo, tipo: "foto"|"logo", conSrcset, alElegir(media) } */
    abrir: function (config) {
      ACTUAL = config || {};
      conectarUnaVez();
      document.getElementById("modal-imagenes-titulo").textContent = ACTUAL.titulo || "Elegir imagen";
      /* Reset del estado de una apertura anterior */
      pendiente = null;
      seleccion = [];
      actualizarSeleccion();
      document.getElementById("media-prevista").hidden = true;
      document.getElementById("media-prevista-img").removeAttribute("src");
      document.getElementById("media-prevista-info").textContent = "";
      document.getElementById("media-archivo").value = "";
      var aviso = document.getElementById("media-aviso");
      if (aviso) { aviso.hidden = true; }
      var b = document.getElementById("media-subir-btn");
      b.disabled = false;
      b.textContent = "Subir y usar";
      if (window.BQModales && window.BQModales.abrir) {
        window.BQModales.abrir(document.getElementById("modal-imagenes"));
      } else {
        document.getElementById("modal-imagenes").hidden = false;
      }
      /* Editar una imagen que ya está: va directo al recorte */
      if (ACTUAL.edicionDe) {
        activarPestana("subir");
        cargarImagenRuta(ACTUAL.edicionDe).then(function (r) {
          abrirRecorte(r.img, ACTUAL, function (principal, chica) {
            var formato = ACTUAL.tipo === "logo" ? "image/png" : "image/jpeg";
            var ext = ACTUAL.tipo === "logo" ? ".png" : ".jpg";
            var nombre = slug(ACTUAL.edicionDe.split("/").pop()) + "-" + sufijo();
            var archivos = [{
              ruta: CARPETA + "/" + nombre + ext,
              b64: principal.toDataURL(formato, 0.82).split(",")[1],
              ancho: principal.width,
              alto: principal.height
            }];
            if (chica) {
              archivos.push({
                ruta: CARPETA + "/" + nombre + "-900" + ext,
                b64: chica.toDataURL(formato, 0.82).split(",")[1]
              });
            }
            var datos = {
              archivos: archivos,
              nombre: nombre + ext,
              ancho: archivos[0].ancho,
              alto: archivos[0].alto,
              srcset: archivos.length > 1
                ? archivos[1].ruta + " 900w, " + archivos[0].ruta + " " + archivos[0].ancho + "w"
                : null,
              prevista: principal.toDataURL(formato, 0.82)
            };
            subirDatos(datos).then(function () {
              listaGaleria = null;
              miniaturas = {};
              var resultado = resultadoDe(datos);
              var elegir = ACTUAL.alElegir;
              cerrar();
              if (elegir) { elegir(resultado); }
            }).catch(function (err) { alerta(err.message); });
          });
        }).catch(function (err) { alerta(err.message); });
        return;
      }
      activarPestana("galeria");
    },
    cerrar: cerrar
  };
})();
