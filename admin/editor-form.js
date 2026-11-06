/* ==========================================================================
   La Boutique Cat & Dog — Motor de formularios del editor visual (W2/W3)
   --------------------------------------------------------------------------
   Construye formularios a partir del propio JSON: recorre los campos,
   aplica reglas por nombre de campo (etiquetas legibles, textarea para
   textos largos, selects, checks, listas) y escribe los cambios directo
   en el objeto de datos que le pasan. Solo actualiza claves existentes:
   nunca agrega ni borra campos de texto, así el JSON conserva su forma.
   Los campos de imagen (imagen, foto, logo) abren el selector BQMedia;
   los internos de tamaño (srcset, sizes, ancho, alto) los gestiona el
   editor automáticamente y quedan ocultos aquí.
   Las listas (fotos del carrusel, tarjetas, productos, fotos de producto)
   permiten agregar (eligiendo imagen), quitar y reordenar.
   ========================================================================== */
(function () {
  "use strict";

  /* Nombres legibles de grupos (objetos anidados) */
  var GRUPOS = {
    hero: "Portada de la sección hero",
    botonPrincipal: "Botón principal (WhatsApp)",
    botonSecundario: "Botón secundario",
    boton: "Botón de consulta",
    botonWhatsapp: "Botón de WhatsApp",
    marca: "Marca",
    negocio: "Datos del negocio",
    instagram: "Instagram",
    tiktok: "TikTok",
    facebook: "Facebook",
    footer: "Pie de página",
    nav: "Menú de navegación",
    seo: "SEO — cómo te encuentra Google"
  };

  /* Títulos legibles para las listas dentro de una sección */
  var DICT_LISTAS = {
    slides: "Fotos del carrusel",
    tarjetas: "Tarjetas de categoría",
    productos: "Productos",
    fotos: "Fotos del producto",
    nav: "Ítems del menú"
  };

  /* Campos técnicos de las imágenes: se administran solos al elegir una
     foto (el editor completa srcset, tamaños, etc.). Se muestran igual,
     pero aparte, en «Campos avanzados» — el editor ya cubre todo lo que
     hacía el panel antiguo. */
  var AVANZADOS = {
    srcset: 1, sizes: 1, ancho: 1, alto: 1,
    prioridad: 1, imagenAncho: 1, imagenAlto: 1
  };

  /* Listas que se pueden editar estructuralmente (agregar/quitar/mover) */
  var EDITABLES = { slides: 1, tarjetas: 1, productos: 1, fotos: 1 };
  var AGREGAR_TEXTO = {
    slides: "Agregar foto al carrusel",
    tarjetas: "Agregar tarjeta de categoría",
    productos: "Agregar producto (con su primera foto)",
    fotos: "Agregar foto al producto"
  };
  var AGREGAR_TITULO = {
    slides: "Foto del carrusel",
    tarjetas: "Foto de la tarjeta",
    productos: "Primera foto del producto",
    fotos: "Foto del producto"
  };

  /* Plantilla de cada item nuevo según la lista (la imagen la elige el
     usuario primero, así ninguna sección queda sin foto) */
  function plantillaDe(clave, media) {
    if (clave === "slides") {
      return {
        imagen: media.imagen,
        srcset: media.srcset || "",
        sizes: "(max-width: 860px) 100vw, 50vw",
        alt: "",
        ancho: media.ancho || 0,
        alto: media.alto || 0
      };
    }
    if (clave === "tarjetas") {
      return {
        imagen: media.imagen,
        alt: "",
        ancho: media.ancho || 0,
        alto: media.alto || 0,
        titulo: "Nueva categoría",
        texto: "",
        enlace: "#productos"
      };
    }
    if (clave === "fotos") {
      return { foto: media.imagen, alt: "", ancho: media.ancho || 0, alto: media.alto || 0 };
    }
    if (clave === "productos") {
      return {
        etiqueta: "Nuevo",
        titulo: "Producto nuevo",
        descripcion: "",
        mascotas: "perro gato",
        precio: "",
        mensajeWhatsApp: "",
        fotos: [{ foto: media.imagen, alt: "", ancho: media.ancho || 0, alto: media.alto || 0 }]
      };
    }
    return {};
  }

  /* Reglas por campo. Clave = nombre del campo en el JSON. Lo que no está
     acá recibe una etiqueta genérica derivada del nombre. */
  var REGLAS = {
    id: {
      etiqueta: "Identificador (ancla de la sección)",
      pista: "Con cuidado: los enlaces del menú apuntan a esta ancla (ej.: #productos). Cambiarla los rompe."
    },
    mostrarFiltros: { tipo: "check", etiqueta: "Mostrar los filtros de categoría" },
    srcset: { tipo: "textarea", filas: 2, etiqueta: "srcset (variantes de tamaño)", pista: "Lo completa solo el editor al subir la foto. Solo tocar si sabés lo que hacés." },
    sizes: { tipo: "textarea", filas: 2, etiqueta: "sizes (regla de elección)", pista: "Lo completa solo el editor al subir la foto. Solo tocar si sabés lo que hacés." },
    ancho: { tipo: "numero", etiqueta: "Ancho de la foto (px)" },
    alto: { tipo: "numero", etiqueta: "Alto de la foto (px)" },
    imagenAncho: { tipo: "numero", etiqueta: "Ancho de la imagen (px)" },
    imagenAlto: { tipo: "numero", etiqueta: "Alto de la imagen (px)" },
    prioridad: { tipo: "check", etiqueta: "Prioridad de carga (primera foto)" },
    eyebrow: { etiqueta: "Antetítulo (línea chica sobre el título)" },
    titulo: { etiqueta: "Título" },
    texto: { tipo: "textarea", filas: 3, etiqueta: "Texto" },
    intro: { tipo: "textarea", filas: 2, etiqueta: "Introducción" },
    descripcion: { tipo: "textarea", filas: 3, etiqueta: "Descripción" },
    aria: { tipo: "textarea", filas: 2, etiqueta: "Etiqueta técnica (para lectores de pantalla)" },
    ariaLabel: { tipo: "textarea", filas: 2, etiqueta: "Nombre técnico (para lectores de pantalla)" },
    carruselAria: { etiqueta: "Etiqueta técnica del carrusel" },
    mensaje: { tipo: "textarea", filas: 2, etiqueta: "Mensaje de WhatsApp pre-cargado" },
    mensajeWhatsApp: { tipo: "textarea", filas: 2, etiqueta: "Mensaje de WhatsApp pre-cargado" },
    whatsappMensaje: { tipo: "textarea", filas: 2, etiqueta: "Mensaje de WhatsApp pre-cargado" },
    ctaTexto: { etiqueta: "Texto del botón" },
    botonMapsTexto: { etiqueta: "Texto del botón de Maps" },
    enlace: { etiqueta: "Enlace", pista: "Ej.: #productos o https://…" },
    ancla: { etiqueta: "Ancla del menú", pista: "Ej.: #inicio" },
    alt: { etiqueta: "Texto alternativo de la foto" },
    imagenAlt: { etiqueta: "Texto alternativo de la foto" },
    logoAlt: { etiqueta: "Texto alternativo del logo" },
    etiqueta: { etiqueta: "Rótulo (etiqueta chica)" },
    mascotas: { etiqueta: "Para qué mascotas", pista: "palabras separadas por espacio: perro, gato" },
    precio: { etiqueta: "Precio (opcional)", pista: "se muestra con «$»: dejá vacío si no aplica" },
    whatsapp: { etiqueta: "WhatsApp (solo números)", pista: "con código de país, ej.: 543874578676" },
    whatsappDisplay: { etiqueta: "WhatsApp (cómo se muestra)", pista: "ej.: +54 9 387 457-8676" },
    phone: { etiqueta: "Teléfono (opcional, para datos estructurados)" },
    email: { etiqueta: "Correo electrónico" },
    address: { tipo: "textarea", filas: 2, etiqueta: "Dirección del local" },
    hours: { tipo: "textarea", filas: 2, etiqueta: "Horarios" },
    mapsQuery: { etiqueta: "Ubicación en Maps", pista: "“latitud,longitud” — ej.: -24.8445,-65.4390" },
    carouselDelay: { tipo: "numero", etiqueta: "Velocidad del carrusel (ms)", minimo: 1000, paso: 500 },
    vinetas: { tipo: "lista-texto", etiqueta: "Viñetas (una por línea)", pista: "Cada línea es una viñeta de la lista" },
    ordenSocial: { tipo: "orden-redes", etiqueta: "Redes mostradas y su orden", pista: "valores válidos: instagram, tiktok, facebook", opciones: ["instagram", "tiktok", "facebook"] },
    navCtaTexto: { etiqueta: "Texto del botón del menú" },
    seccionesTitulo: { etiqueta: "Título de la columna «Secciones»" },
    contactoTitulo: { etiqueta: "Título de la columna «Contacto»" },
    seguinosTitulo: { etiqueta: "Título de la columna «Seguinos»" },
    whatsappTexto: { etiqueta: "Texto del botón de WhatsApp del pie" },
    copyright: { tipo: "textarea", filas: 2, etiqueta: "Aviso de copyright" },
    nombre: { etiqueta: "Nombre" },
    nombreSecundario: { etiqueta: "Nombre secundario" },
    url: { etiqueta: "Dirección (URL)" }
  };

  /* Claves técnicas que no se muestran en ningún formulario. `huella` quedó
     en desuso (se retiró el camino decorativo de huellas): si algún
     borrador viejo la trae, no se muestra. */
  var TECNICOS = { tipo: 1, oculto: 1, huella: 1 };

  /* Configuración del selector de imágenes según el campo y su contexto */
  function configImagen(clave, contexto) {
    var lista = (contexto && contexto.lista) || "";
    if (clave === "logo") {
      return { titulo: "Logo", tipo: "logo", dims: null };
    }
    if (clave === "foto") {
      return { titulo: "Foto del producto", tipo: "foto", dims: null };
    }
    if (lista === "slides") {
      return { titulo: "Foto del carrusel", tipo: "foto", conSrcset: true, dims: ["ancho", "alto"] };
    }
    if (lista === "tarjetas") {
      return { titulo: "Foto de la tarjeta", tipo: "foto", dims: ["ancho", "alto"] };
    }
    /* imagen a nivel de sección (imagenTexto) */
    return { titulo: "Imagen de la sección", tipo: "foto", dims: ["imagenAncho", "imagenAlto"] };
  }

  function esCampoImagen(clave) {
    return clave === "imagen" || clave === "foto" || clave === "logo";
  }

  /* ------------------------- Utilidades DOM ------------------------------ */
  function crear(tag) { return document.createElement(tag); }

  function etiquetaDe(clave) {
    var r = REGLAS[clave];
    if (r && r.etiqueta) { return r.etiqueta; }
    var legible = String(clave).replace(/([a-z0-9])([A-Z])/g, "$1 $2");
    return legible.charAt(0).toUpperCase() + legible.slice(1);
  }

  function pistaDe(clave, contexto) {
    var r = REGLAS[clave];
    if (r && r.pista) { return r.pista; }
    if (contexto && contexto.esHero && clave === "titulo" && contexto.nivel === "raiz") {
      return "Podés marcar negritas entre doble asterisco, ej.: Todo para **perros** y **gatos**";
    }
    if (contexto && contexto.grupo === "seo") {
      if (clave === "titulo") { return "El título que muestra Google. Ideal: hasta 60 caracteres, con la ciudad."; }
      if (clave === "descripcion") { return "El resumen que muestra Google. Ideal: hasta 155 caracteres, con qué vendés y la ciudad."; }
    }
    return "";
  }

  /* Acceso por ruta: ["botonPrincipal","texto"] dentro del objeto raíz */
  function asignarValor(raiz, ruta, valor) {
    var actual = raiz;
    for (var i = 0; i < ruta.length - 1; i++) { actual = actual[ruta[i]]; }
    actual[ruta[ruta.length - 1]] = valor;
  }

  /* ------------------------ Campo simple ---------------------------------- */
  var CONTADOR_CAMPOS = 0;

  /* Identificador único para cada control, para asociar la etiqueta con
     su campo (sin "for" el lector de pantalla no anuncia la etiqueta). */
  function idCampo() {
    CONTADOR_CAMPOS += 1;
    return "bq-campo-" + CONTADOR_CAMPOS;
  }

  function crearCampo(clave, valor, raiz, ruta, alCambiar, contexto) {
    var regla = REGLAS[clave] || {};
    var tipo = regla.tipo || "input";
    var caja = crear("div");
    caja.className = "campo";

    /* Solo lectura (p. ej. el id/ancla) */
    if (tipo === "solo-lectura") {
      var rot = crear("span");
      rot.className = "campo-etiqueta";
      rot.textContent = etiquetaDe(clave);
      caja.appendChild(rot);
      var valorLectura = crear("p");
      valorLectura.className = "campo-lectura";
      valorLectura.textContent = valor == null || valor === "" ? "(vacío)" : String(valor);
      caja.appendChild(valorLectura);
      return caja;
    }

    /* Checkbox (booleanos) */
    if (tipo === "check") {
      var envoltura = crear("label");
      envoltura.className = "campo-check";
      var chk = crear("input");
      chk.type = "checkbox";
      chk.checked = !!valor;
      chk.addEventListener("change", function () {
        asignarValor(raiz, ruta, chk.checked);
        alCambiar();
      });
      envoltura.appendChild(chk);
      envoltura.appendChild(document.createTextNode(" " + etiquetaDe(clave)));
      caja.appendChild(envoltura);
      return caja;
    }

    /* Etiqueta común */
    var rotulo = crear("label");
    rotulo.className = "campo-etiqueta";
    rotulo.textContent = etiquetaDe(clave);
    caja.appendChild(rotulo);

    var control;
    var extraer = function (elm) { return elm.value; };

    if (tipo === "select") {
      control = crear("select");
      (regla.opciones || []).forEach(function (op) {
        var o = crear("option");
        o.value = op;
        o.textContent = op;
        if (op === valor) { o.selected = true; }
        control.appendChild(o);
      });
    } else if (tipo === "textarea") {
      control = crear("textarea");
      control.rows = regla.filas || 3;
      control.value = valor == null ? "" : String(valor);
    } else if (tipo === "numero") {
      control = crear("input");
      control.type = "number";
      if (regla.minimo != null) { control.min = String(regla.minimo); }
      if (regla.paso != null) { control.step = String(regla.paso); }
      control.value = valor == null ? "" : String(valor);
      extraer = function (elm) {
        var n = parseFloat(elm.value);
        return isNaN(n) ? valor : n;
      };
    } else if (tipo === "lista-texto") {
      control = crear("textarea");
      control.rows = Math.max(3, ((valor || []).length || 0) + 1);
      control.value = (valor || []).join("\n");
      extraer = function (elm) {
        return elm.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      };
    } else if (tipo === "orden-redes") {
      control = crear("input");
      control.type = "text";
      control.value = (valor || []).join(", ");
      var permitidas = regla.opciones || [];
      extraer = function (elm) {
        return elm.value.split(/[\s,]+/).filter(Boolean).map(function (t) {
          return t.toLowerCase();
        }).filter(function (t) {
          return permitidas.indexOf(t) !== -1;
        });
      };
    } else {
      control = crear("input");
      control.type = "text";
      control.value = valor == null ? "" : String(valor);
    }

    var alTocar = function () {
      asignarValor(raiz, ruta, extraer(control));
      alCambiar();
    };
    control.addEventListener("input", alTocar);
    control.addEventListener("change", alTocar);

    /* La etiqueta apunta a su control */
    control.id = idCampo();
    rotulo.htmlFor = control.id;

    caja.appendChild(control);

    var pista = pistaDe(clave, contexto);
    if (pista) {
      var ayuda = crear("p");
      ayuda.className = "campo-pista";
      ayuda.textContent = pista;
      caja.appendChild(ayuda);
    }

    return caja;
  }

  /* ------------------------ Campo de imagen (W3) -------------------------- */
  function crearCampoImagen(clave, valor, ruta, alCambiarImagen, contexto) {
    var config = configImagen(clave, contexto);
    var caja = crear("div");
    caja.className = "campo campo-imagen";

    /* No es un <label>: acá no hay un control de formulario al que
       apuntar, es el título del botón de elegir imagen. */
    var rotulo = crear("span");
    rotulo.className = "campo-etiqueta";
    rotulo.textContent = config.titulo;
    caja.appendChild(rotulo);

    var fila = crear("div");
    fila.className = "img-fila";

    if (valor) {
      var im = crear("img");
      im.className = "img-thumb";
      im.alt = "";
      try { im.src = new URL(valor, location.origin).href; } catch (e2) { im.hidden = true; }
      /* Imágenes recién subidas: mostrar la copia local en la miniatura
         (todavía no están en este disco) */
      if (window.BQ_SUBIDAS && window.BQ_SUBIDAS[valor]) {
        im.src = window.BQ_SUBIDAS[valor];
      }
      im.onerror = function () { im.hidden = true; };
      fila.appendChild(im);
    }

    var nombre = crear("span");
    nombre.className = "img-nombre";
    nombre.textContent = valor || "(sin imagen)";
    fila.appendChild(nombre);

    var boton = crear("button");
    boton.type = "button";
    boton.className = "btn-borde btn-chico";
    boton.textContent = valor ? "Cambiar…" : "Elegir imagen…";
    boton.addEventListener("click", function () {
      if (alCambiarImagen) { alCambiarImagen(ruta, config); }
    });
    fila.appendChild(boton);

    caja.appendChild(fila);
    return caja;
  }

  /* ======================================================================
     LISTAS COMPACTAS: íconos + ventana de edición
     ----------------------------------------------------------------------
     Las tarjetas largas ocupaban todo el ancho, había que scrollear para
     llegar al item buscado y al reconstruir el formulario se desplegaban
     todas juntas. Ahora cada lista editable se ve como íconos chicos, en
     filas o en carrusel cuando son muchos, y cada uno se edita en una
     ventana chica y minimalista.
     ====================================================================== */
  var TEXTO_BUSQUEDA = "";
  var MODAL_ITEM = null;

  /* Cómo se muestra cada tipo de lista en la tira de íconos */
  var TIPOS_LISTA = {
    productos: {
      singular: "Producto",
      plural: "productos",
      conMascotas: true,
      conBuscador: true,
      thumb: function (item) { return (item.fotos && item.fotos[0]) ? item.fotos[0].foto : null; },
      nombre: function (item, i) { return (item && (item.titulo || item.etiqueta)) || ("Producto " + (i + 1)); },
      meta: function (item) {
        var partes = [];
        if (item && item.precio && String(item.precio).trim()) { partes.push(String(item.precio)); }
        var n = (item && item.fotos) ? item.fotos.length : 0;
        partes.push(n === 1 ? "1 foto" : n + " fotos");
        return partes.join(" · ");
      },
      buscable: function (item) {
        if (!item || typeof item !== "object") { return ""; }
        return [item.titulo, item.etiqueta, item.descripcion, item.precio]
          .filter(function (v) { return !!v; }).join(" ").toLowerCase();
      },
      quitarTexto: function (item) {
        var nombre = (item && (item.titulo || item.etiqueta)) || "este producto";
        return "¿Quitar el producto «" + nombre + "»? Deja de mostrarse cuando publiques.";
      }
    },
    slides: {
      singular: "Foto",
      plural: "fotos",
      thumb: function (item) { return item ? item.imagen : null; },
      nombre: function (item, i) { return "Foto " + (i + 1); },
      meta: function (item) {
        if (!item) { return ""; }
        return item.alt || (item.ancho ? item.ancho + "×" + item.alto : "");
      },
      quitarTexto: function () { return "¿Quitar esta foto del carrusel?"; }
    },
    tarjetas: {
      singular: "Tarjeta",
      plural: "tarjetas",
      thumb: function (item) { return item ? item.imagen : null; },
      nombre: function (item, i) { return (item && item.titulo) || ("Tarjeta " + (i + 1)); },
      meta: function (item) { return (item && item.texto) || ""; },
      quitarTexto: function (item) {
        var nombre = (item && item.titulo) || "esta tarjeta";
        return "¿Quitar la tarjeta «" + nombre + "»?";
      }
    }
  };

  function tipoDe(clave) { return TIPOS_LISTA[clave] || TIPOS_LISTA.productos; }

  function urlImagen(ruta) {
    try { return new URL(ruta, location.origin).href; } catch (e) { return ""; }
  }

  /* Un item se ve como un ícono: foto + nombre + un dato. */
  function crearTileItem(clave, item, i, alAbrir) {
    var tipo = tipoDe(clave);
    item = item || {};
    var tile = crear("button");
    tile.type = "button";
    tile.className = "prod-tile" +
      (tipo.conMascotas ? " " + (claseMascota(item) || "pet-ambos") : "");
    tile.setAttribute("data-indice", String(i));
    tile.setAttribute("aria-label", "Editar " + nombreDeItem(clave, item, i));

    var thumb = crear("span");
    thumb.className = "prod-tile-thumb";
    var ruta = tipo.thumb(item);
    if (ruta) {
      var im = crear("img");
      im.alt = "";
      im.loading = "lazy";
      im.src = urlImagen(ruta);
      if (window.BQ_SUBIDAS && window.BQ_SUBIDAS[ruta]) { im.src = window.BQ_SUBIDAS[ruta]; }
      im.onerror = function () { im.hidden = true; };
      thumb.appendChild(im);
    } else {
      thumb.classList.add("is-vacia");
    }
    tile.appendChild(thumb);

    var nombre = crear("span");
    nombre.className = "prod-tile-nombre";
    nombre.textContent = tipo.nombre(item, i);
    tile.appendChild(nombre);

    var meta = crear("span");
    meta.className = "prod-tile-meta";
    meta.textContent = tipo.meta(item);
    tile.appendChild(meta);

    tile.addEventListener("click", function () { alAbrir(i); });
    return tile;
  }

  /* Filtra los íconos (solo donde hay buscador) y actualiza el contador. */
  function aplicarBusqueda(caja, clave, valor) {
    var tipo = tipoDe(clave);
    var texto = tipo.conBuscador ? (TEXTO_BUSQUEDA || "").toLowerCase().trim() : "";
    var tiles = Array.prototype.slice.call(caja.querySelectorAll(".prod-tile"));
    var visibles = 0;
    tiles.forEach(function (tile) {
      var i = parseInt(tile.getAttribute("data-indice"), 10);
      var ok = !texto || (tipo.buscable ? tipo.buscable(valor[i]) : "").indexOf(texto) !== -1;
      tile.hidden = !ok;
      if (ok) { visibles++; }
    });

    var contador = caja.querySelector(".bloque-contador");
    if (contador) {
      contador.textContent = texto
        ? visibles + " de " + valor.length
        : (valor.length ? valor.length + " " + tipo.plural : "");
    }

    var vacio = caja.querySelector(".nota-vacia");
    if (vacio) {
      if (!valor.length) {
        vacio.textContent = "Todavía no hay " + tipo.plural + ". Agregá el primero con el botón de abajo.";
        vacio.hidden = false;
      } else if (texto && !visibles) {
        vacio.textContent = "Ningún resultado coincide con «" + TEXTO_BUSQUEDA + "».";
        vacio.hidden = false;
      } else {
        vacio.hidden = true;
      }
    }
  }

  function construirListaCompacta(clave, valor, raiz, ruta, contenedor, alCambiar, alCambiarImagen, contexto) {
    var tipo = tipoDe(clave);
    var caja = crear("div");
    caja.className = "lista-campo bloque-productos";

    /* --- Encabezado del bloque (nombre + contador) --- */
    var cabecera = crear("div");
    cabecera.className = "bloque-cabecera";
    var titulo = crear("h3");
    titulo.className = "lista-titulo";
    titulo.textContent = DICT_LISTAS[clave] || tipo.plural;
    cabecera.appendChild(titulo);
    var contador = crear("span");
    contador.className = "bloque-contador";
    cabecera.appendChild(contador);
    caja.appendChild(cabecera);

    /* --- Buscador: bloque propio, separado del nombre --- */
    if (tipo.conBuscador) {
      var bloqueBuscar = crear("div");
      bloqueBuscar.className = "bloque-buscar";
      var lupa = crear("span");
      lupa.className = "buscar-lupa";
      lupa.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
      var buscar = crear("input");
      buscar.type = "text";
      buscar.className = "lista-buscar";
      buscar.placeholder = "Buscar " + tipo.singular.toLowerCase() + " por nombre…";
      buscar.value = TEXTO_BUSQUEDA;
      buscar.setAttribute("aria-label", "Buscar " + tipo.singular.toLowerCase() + " por nombre");
      bloqueBuscar.appendChild(lupa);
      bloqueBuscar.appendChild(buscar);
      caja.appendChild(bloqueBuscar);
      buscar.addEventListener("input", function () {
        TEXTO_BUSQUEDA = buscar.value;
        aplicarBusqueda(caja, clave, valor);
      });
    }

    /* --- Íconos: rejilla con filas, o carrusel si son muchos --- */
    var esCarrusel = valor.length > 10;
    var wrap = crear("div");
    wrap.className = "prod-tira-wrap";
    var tira = crear("div");
    tira.className = "prod-tira" + (esCarrusel ? " es-carrusel" : "");
    valor.forEach(function (item, i) {
      tira.appendChild(crearTileItem(clave, item, i, function (indice) {
        abrirModalItem(indice, clave, valor, raiz, ruta, alCambiar, alCambiarImagen, contexto);
      }));
    });
    wrap.appendChild(tira);

    if (esCarrusel) {
      var izq = crear("button");
      izq.type = "button";
      izq.className = "prod-flecha prod-flecha-izq";
      izq.setAttribute("aria-label", tipo.plural + " anteriores");
      izq.innerHTML = "&lsaquo;";
      var der = crear("button");
      der.type = "button";
      der.className = "prod-flecha prod-flecha-der";
      der.setAttribute("aria-label", tipo.plural + " siguientes");
      der.innerHTML = "&rsaquo;";
      var paso = function (dir) {
        tira.scrollBy({ left: dir * Math.max(220, Math.round(tira.clientWidth * 0.8)), behavior: "smooth" });
      };
      izq.addEventListener("click", function () { paso(-1); });
      der.addEventListener("click", function () { paso(1); });
      wrap.appendChild(izq);
      wrap.appendChild(der);
    }
    caja.appendChild(wrap);

    var vacio = crear("p");
    vacio.className = "nota nota-vacia";
    caja.appendChild(vacio);

    /* --- Agregar item --- */
    if (window.BQMedia) {
      var agregar = crear("button");
      agregar.type = "button";
      agregar.className = "btn-borde btn-bloque lista-agregar";
      agregar.textContent = "+ " + (AGREGAR_TEXTO[clave] || "Agregar");
      agregar.addEventListener("click", function () {
        window.BQMedia.abrir({
          titulo: AGREGAR_TITULO[clave] || "Elegir imagen",
          tipo: "foto",
          conSrcset: clave === "slides",
          alElegir: function (media) {
            valor.push(plantillaDe(clave, media));
            alCambiar(true);
            /* El item nuevo se abre directo para completar los datos */
            abrirModalItem(valor.length - 1, clave, valor, raiz, ruta, alCambiar, alCambiarImagen, contexto);
          }
        });
      });
      caja.appendChild(agregar);
    }

    contenedor.appendChild(caja);
    aplicarBusqueda(caja, clave, valor);
  }

  /* -------------------- Ventana de edición del item --------------------- */
  function abrirModalItem(indice, clave, valor, raiz, ruta, alCambiar, alCambiarImagen, contexto) {
    var modal = document.getElementById("modal-item");
    if (!modal || !valor[indice]) { return; }
    MODAL_ITEM = {
      indice: indice, clave: clave, valor: valor, raiz: raiz, ruta: ruta,
      alCambiar: alCambiar, alCambiarImagen: alCambiarImagen, contexto: contexto
    };
    pintarModalItem();
    if (window.BQModales && window.BQModales.abrir) {
      window.BQModales.abrir(modal);
    } else {
      modal.hidden = false;
    }
  }

  function cerrarModalItem() {
    var modal = document.getElementById("modal-item");
    MODAL_ITEM = null;
    if (modal) {
      if (window.BQModales && window.BQModales.cerrar) { window.BQModales.cerrar(modal); }
      else { modal.hidden = true; }
    }
  }

  function pintarModalItem() {
    var m = MODAL_ITEM;
    if (!m) { return; }
    var tipo = tipoDe(m.clave);
    var cuerpo = document.getElementById("modal-item-cuerpo");
    var titulo = document.getElementById("modal-item-titulo");
    var item = m.valor[m.indice];
    if (!item) { cerrarModalItem(); return; }

    if (titulo) {
      titulo.textContent = tipo.nombre(item, m.indice);
    }
    var posicion = document.getElementById("modal-item-posicion");
    if (posicion) {
      posicion.textContent = tipo.singular + " " + (m.indice + 1) + " de " + m.valor.length;
    }

    if (cuerpo) {
      cuerpo.innerHTML = "";
      construirObjeto(item, m.raiz, m.ruta.concat([m.indice]), cuerpo,
        m.alCambiar, m.alCambiarImagen, { lista: m.clave, fotosCompactas: true });
      /* Al escribir, el ícono de la lista y el título de la ventana se
         actualizan al instante: si no, el cliente edita "Transporte" y ve
         que el ícono sigue diciendo el nombre viejo. */
      cuerpo.addEventListener("input", function () { sincronizarItem(m.indice); });
    }

    var acciones = document.getElementById("modal-item-acciones");
    if (acciones) {
      acciones.innerHTML = "";
      acciones.appendChild(botonMini("↑", "Subir en la lista", function () { moverItem(-1); }));
      acciones.appendChild(botonMini("↓", "Bajar en la lista", function () { moverItem(1); }));
      var quitar = crear("button");
      quitar.type = "button";
      quitar.className = "lista-quitar";
      quitar.textContent = "Quitar " + tipo.singular.toLowerCase();
      quitar.addEventListener("click", function () { quitarItem(); });
      acciones.appendChild(quitar);
    }
  }

  /* Refleja en el ícono y en el título de la ventana los cambios hechos
     dentro de la ventana (sin esperar a que se reconstruya el formulario). */
  function sincronizarItem(indice) {
    var m = MODAL_ITEM;
    if (!m) { return; }
    var tipo = tipoDe(m.clave);
    var item = m.valor[indice];
    if (!item) { return; }

    var tile = document.querySelector(".prod-tile[data-indice=\"" + indice + "\"]");
    if (tile) {
      var etiqueta = tile.querySelector(".prod-tile-nombre");
      if (etiqueta) { etiqueta.textContent = tipo.nombre(item, indice); }
      var meta = tile.querySelector(".prod-tile-meta");
      if (meta) { meta.textContent = tipo.meta(item); }
    }

    var titulo = document.getElementById("modal-item-titulo");
    if (titulo) { titulo.textContent = tipo.nombre(item, indice); }
  }

  function moverItem(delta) {
    var m = MODAL_ITEM;
    if (!m) { return; }
    var i = m.indice;
    if (delta < 0 && i <= 0) { return; }
    if (delta > 0 && i >= m.valor.length - 1) { return; }
    var sacado = m.valor.splice(i, 1)[0];
    m.valor.splice(i + delta, 0, sacado);
    m.indice = i + delta;
    m.alCambiar(true);
  }

  function quitarItem() {
    var m = MODAL_ITEM;
    if (!m) { return; }
    var item = m.valor[m.indice] || {};
    var quitar = function () {
      m.valor.splice(m.indice, 1);
      cerrarModalItem();
      m.alCambiar(true);
    };
    if (window.BQConfirmar) {
      window.BQConfirmar(tipoDe(m.clave).quitarTexto(item), quitar);
    } else {
      quitar();
    }
  }

  /* -------------------- Fotos del producto (compactas) -------------------- */
  function construirListaFotos(clave, valor, raiz, ruta, contenedor, alCambiar, alCambiarImagen, contexto) {
    var caja = crear("div");
    caja.className = "lista-campo lista-fotos";

    var cabecera = crear("div");
    cabecera.className = "bloque-cabecera";
    var titulo = crear("h3");
    titulo.className = "lista-titulo";
    titulo.textContent = DICT_LISTAS[clave] || "Fotos";
    cabecera.appendChild(titulo);
    var contador = crear("span");
    contador.className = "bloque-contador";
    contador.textContent = valor.length ? valor.length + " fotos" : "";
    cabecera.appendChild(contador);
    caja.appendChild(cabecera);

    valor.forEach(function (foto, i) {
      var fila = crear("div");
      fila.className = "foto-fila";

      var thumb = crear("img");
      thumb.className = "foto-thumb";
      thumb.alt = "";
      if (foto && foto.foto) {
        thumb.src = urlImagen(foto.foto);
        if (window.BQ_SUBIDAS && window.BQ_SUBIDAS[foto.foto]) { thumb.src = window.BQ_SUBIDAS[foto.foto]; }
        thumb.onerror = function () { thumb.hidden = true; };
      }
      fila.appendChild(thumb);

      var info = crear("div");
      info.className = "foto-info";
      var nombre = crear("strong");
      nombre.textContent = "Foto " + (i + 1);
      info.appendChild(nombre);
      var detalle = crear("small");
      var medidas = (foto && foto.ancho) ? (foto.ancho + "×" + foto.alto) : "sin medidas";
      detalle.textContent = medidas + (foto && foto.alt ? " · " + foto.alt : "");
      info.appendChild(detalle);
      fila.appendChild(info);

      fila.appendChild(botonMini("✎", "Editar los datos de esta foto", function () {
        var campos = fila.nextElementSibling;
        if (campos) { campos.hidden = !campos.hidden; }
      }));
      fila.appendChild(botonMini("✕", "Quitar esta foto", function () {
        valor.splice(i, 1);
        alCambiar(true);
      }, true));

      caja.appendChild(fila);

      /* Los datos de la foto se despliegan debajo al pedirlos */
      var campos = crear("div");
      campos.className = "foto-campos";
      campos.hidden = true;
      construirObjeto(foto, raiz, ruta.concat([i]), campos, alCambiar, alCambiarImagen, { lista: "fotos" });
      caja.appendChild(campos);
    });

    if (window.BQMedia) {
      var agregar = crear("button");
      agregar.type = "button";
      agregar.className = "btn-borde btn-bloque lista-agregar";
      agregar.textContent = "+ Agregar foto";
      agregar.addEventListener("click", function () {
        window.BQMedia.abrir({
          titulo: "Foto del producto",
          tipo: "foto",
          alElegir: function (media) {
            valor.push({ foto: media.imagen, alt: "", ancho: media.ancho || 0, alto: media.alto || 0 });
            alCambiar(true);
          }
        });
      });
      caja.appendChild(agregar);
    }

    contenedor.appendChild(caja);
  }

  /* ------------------------ Listas de items -------------------------------- */
  function nombreDeItem(clave, item, i) {
    if (clave === "slides") { return "Foto " + (i + 1); }
    if (clave === "fotos") { return "Foto " + (i + 1); }
    if (item && typeof item === "object") {
      if (item.titulo) { return (i + 1) + ". " + item.titulo; }
      if (item.etiqueta) { return (i + 1) + ". " + item.etiqueta; }
      if (item.texto) { return (i + 1) + ". " + item.texto; }
    }
    return "Ítem " + (i + 1);
  }

  /* Resumen visual del item: miniatura + título + badges — hace que el
     header del collapsed ya cuente la historia sin abrirlo. */
  function crearResumenItem(clave, item, i) {
    var wrap = crear("div");
    wrap.className = "item-resumen";

    /* Miniatura según el tipo de item */
    var rutaImagen = null;
    if (clave === "productos" && item.fotos && item.fotos[0]) { rutaImagen = item.fotos[0].foto; }
    else if (clave === "tarjetas" && item.imagen) { rutaImagen = item.imagen; }
    else if (clave === "slides" && item.imagen) { rutaImagen = item.imagen; }
    else if (clave === "fotos" && item.foto) { rutaImagen = item.foto; }
    else if (item.imagen) { rutaImagen = item.imagen; }
    else if (item.foto) { rutaImagen = item.foto; }

    if (rutaImagen) {
      var im = crear("img");
      im.className = "item-resumen-thumb";
      im.alt = "";
      try { im.src = new URL(rutaImagen, location.origin).href; } catch (e2) { im.hidden = true; }
      if (window.BQ_SUBIDAS && window.BQ_SUBIDAS[rutaImagen]) { im.src = window.BQ_SUBIDAS[rutaImagen]; }
      im.onerror = function () { im.hidden = true; };
      wrap.appendChild(im);
    }

    var info = crear("div");
    info.className = "item-resumen-info";

    var titulo = crear("strong");
    titulo.textContent = nombreDeItem(clave, item, i);
    info.appendChild(titulo);

    var meta = crear("div");
    meta.className = "item-resumen-meta";

    /* Badges de mascota con color (solo productos) */
    if (clave === "productos" && item.mascotas) {
      var m = String(item.mascotas).split(/\s+/);
      if (m.indexOf("perro") !== -1) {
        var bPerro = crear("span");
        bPerro.className = "pet-badge pet-perro";
        bPerro.textContent = "Perro";
        meta.appendChild(bPerro);
      }
      if (m.indexOf("gato") !== -1) {
        var bGato = crear("span");
        bGato.className = "pet-badge pet-gato";
        bGato.textContent = "Gato";
        meta.appendChild(bGato);
      }
    }

    /* Precio visible en el header */
    if (item.precio && String(item.precio).trim()) {
      var precio = crear("span");
      precio.className = "item-resumen-precio";
      precio.textContent = String(item.precio);
      meta.appendChild(precio);
    }

    /* Contador de fotos */
    var numFotos = 0;
    if (clave === "productos" && item.fotos) { numFotos = item.fotos.length; }
    if (numFotos > 0) {
      var fotos = crear("span");
      fotos.className = "item-resumen-fotos";
      fotos.textContent = numFotos + (numFotos === 1 ? " foto" : " fotos");
      meta.appendChild(fotos);
    }

    if (meta.childNodes.length) { info.appendChild(meta); }
    wrap.appendChild(info);
    return wrap;
  }

  /* Clase de mascota para el borde de color del card */
  function claseMascota(item) {
    if (!item || !item.mascotas) { return ""; }
    var m = String(item.mascotas).split(/\s+/);
    var tienePerro = m.indexOf("perro") !== -1;
    var tieneGato = m.indexOf("gato") !== -1;
    if (tienePerro && tieneGato) { return "pet-ambos"; }
    if (tienePerro) { return "pet-perro"; }
    if (tieneGato) { return "pet-gato"; }
    return "";
  }

  function botonMini(texto, titulo, alClic, peligro) {
    var b = crear("button");
    b.type = "button";
    b.className = "mini-btn" + (peligro ? " is-peligro" : "");
    b.textContent = texto;
    b.title = titulo;
    b.setAttribute("aria-label", titulo);
    b.addEventListener("click", alClic);
    return b;
  }

  function construirLista(clave, valor, raiz, ruta, contenedor, alCambiar, alCambiarImagen, contexto) {
    var regla = REGLAS[clave];

    /* Productos, fotos del carrusel y tarjetas: íconos + ventana de
       edición (ya no tarjetas largas que se desplegaban todas juntas) */
    if (TIPOS_LISTA[clave]) {
      construirListaCompacta(clave, valor, raiz, ruta, contenedor, alCambiar, alCambiarImagen, contexto);
      return;
    }

    /* Listas de texto plano (viñetas, redes) usan un solo campo */
    if (regla && (regla.tipo === "lista-texto" || regla.tipo === "orden-redes")) {
      contenedor.appendChild(crearCampo(clave, valor, raiz, ruta, alCambiar, contexto));
      return;
    }

    var caja = crear("div");
    caja.className = "lista-campo";

    var titulo = crear("h3");
    titulo.className = "lista-titulo";
    titulo.textContent = (DICT_LISTAS[clave] || etiquetaDe(clave)) +
      (Array.isArray(valor) && valor.length ? " (" + valor.length + ")" : "");
    caja.appendChild(titulo);

    if (!valor || valor.length === 0) {
      var vacio = crear("p");
      vacio.className = "nota";
      vacio.textContent = "(sin elementos todavía)";
      caja.appendChild(vacio);
    }

    var esEditable = EDITABLES[clave] && Array.isArray(valor);

    (valor || []).forEach(function (item, i) {
      var cajaItem = crear("details");
      cajaItem.className = "item-lista";
      /* El primero abre solo: entrar y ver 5 cerrados da pereza.
         En listas de un solo item, también abre. */
      cajaItem.open = i === 0 || (valor || []).length === 1;

      /* Borde de color según mascota (productos) */
      var petClase = claseMascota(item);
      if (petClase) { cajaItem.classList.add(petClase); }

      /* Resumen visual: miniatura + título + badges + precio */
      var resumen = crear("summary");
      if (item && typeof item === "object") {
        resumen.appendChild(crearResumenItem(clave, item, i));
      } else {
        resumen.textContent = nombreDeItem(clave, item, i);
      }
      cajaItem.appendChild(resumen);

      if (item && typeof item === "object") {
        var cuerpo = crear("div");
        cuerpo.className = "item-lista-cuerpo";
        construirObjeto(item, raiz, ruta.concat([i]), cuerpo, alCambiar, alCambiarImagen, { lista: clave });
        cajaItem.appendChild(cuerpo);
      }

      /* Acciones del item: mover y quitar (solo listas editables) */
      if (esEditable) {
        var acciones = crear("div");
        acciones.className = "item-lista-acciones";
        acciones.appendChild(botonMini("↑", "Subir", function () {
          if (i === 0) { return; }
          var sacado = valor.splice(i, 1)[0];
          valor.splice(i - 1, 0, sacado);
          alCambiar(true);
        }));
        acciones.appendChild(botonMini("↓", "Bajar", function () {
          if (i >= valor.length - 1) { return; }
          var sacado2 = valor.splice(i, 1)[0];
          valor.splice(i + 1, 0, sacado2);
          alCambiar(true);
        }));
        acciones.appendChild(botonMini("✕", "Quitar", function () {
          valor.splice(i, 1);
          alCambiar(true);
        }, true));

        cajaItem.appendChild(acciones);
      }

      caja.appendChild(cajaItem);
    });

    /* Aviso para fotos internas sin edición de imagen directa */
    if (clave === "slides" || clave === "fotos") {
      /* (las fotos ya se administran acá: el aviso anterior quedó para
         campos internos como srcset/sizes, ocultos más arriba) */
    }

    /* Agregar: primero se elige la imagen, después se crea el item */
    if (esEditable && window.BQMedia) {
      var agregar = crear("button");
      agregar.type = "button";
      agregar.className = "btn-borde btn-bloque lista-agregar";
      agregar.textContent = "+ " + AGREGAR_TEXTO[clave];
      agregar.addEventListener("click", function () {
        window.BQMedia.abrir({
          titulo: AGREGAR_TITULO[clave],
          tipo: "foto",
          conSrcset: clave === "slides",
          alElegir: function (media) {
            valor.push(plantillaDe(clave, media));
            alCambiar(true);
          }
        });
      });
      caja.appendChild(agregar);
    }

    contenedor.appendChild(caja);
  }

  /* ------------------------ Recorrido del objeto --------------------------- */
  function construirGrupo(clave, objeto, raiz, ruta, contenedor, alCambiar, alCambiarImagen, contexto) {
    var fieldset = crear("fieldset");
    fieldset.className = "grupo";
    var leyenda = crear("legend");
    leyenda.textContent = GRUPOS[clave] || etiquetaDe(clave);
    fieldset.appendChild(leyenda);
    construirObjeto(objeto, raiz, ruta, fieldset, alCambiar, alCambiarImagen,
      { lista: contexto && contexto.lista, grupo: clave });
    contenedor.appendChild(fieldset);
  }

  function construirObjeto(objeto, raiz, ruta, contenedor, alCambiar, alCambiarImagen, contexto, excluidas) {
    /* Los campos técnicos van aparte, al final, en «Campos avanzados»:
      el día a día se edita sin ruido, pero nada queda fuera del panel. */
    var avanzados = [];

    Object.keys(objeto).forEach(function (clave) {
      if (TECNICOS[clave]) { return; }
      if (excluidas && excluidas[clave]) { return; }
      if (AVANZADOS[clave] && typeof objeto[clave] !== "object") {
        avanzados.push(clave);
        return;
      }
      var valor = objeto[clave];
      var subRuta = ruta.concat([clave]);

      if (Array.isArray(valor)) {
        /* Separador visual antes de listas (el bloque de íconos ya trae su
           propio título, así que ahí no hace falta) */
        if (EDITABLES[clave] && !TIPOS_LISTA[clave] &&
            !(clave === "fotos" && contexto && contexto.fotosCompactas)) {
          var separador = crear("div");
          separador.className = "form-separador";
          var sepLabel = crear("span");
          sepLabel.textContent = DICT_LISTAS[clave] || etiquetaDe(clave);
          separador.appendChild(sepLabel);
          contenedor.appendChild(separador);
        }
        /* Las fotos del producto se listan compactas, no como tarjetas */
        if (clave === "fotos" && contexto && contexto.fotosCompactas) {
          construirListaFotos(clave, valor, raiz, subRuta, contenedor, alCambiar, alCambiarImagen, contexto);
          return;
        }
        construirLista(clave, valor, raiz, subRuta, contenedor, alCambiar, alCambiarImagen, contexto);
        return;
      }
      if (valor && typeof valor === "object") {
        construirGrupo(clave, valor, raiz, subRuta, contenedor, alCambiar, alCambiarImagen, contexto);
        return;
      }
      if (esCampoImagen(clave)) {
        contenedor.appendChild(crearCampoImagen(clave, valor, subRuta, alCambiarImagen, contexto));
        return;
      }

      var campo = crearCampo(clave, valor, raiz, subRuta, alCambiar, contexto);
      /* Campos cortos van lado a lado (menos scroll, más densidad) */
      if (clave === "precio" || clave === "mascotas" || clave === "etiqueta" || clave === "mostrarFiltros") {
        campo.classList.add("campo-medio");
      }
      contenedor.appendChild(campo);
    });

    if (avanzados.length) {
      var cajaAv = crear("details");
      cajaAv.className = "grupo-avanzado";
      var resumen = crear("summary");
      resumen.textContent = "Campos avanzados (" + avanzados.length + ")";
      resumen.title = "Campos técnicos de la imagen: el editor los completa solo al elegir una foto.";
      cajaAv.appendChild(resumen);
      var cuerpoAv = crear("div");
      cuerpoAv.className = "item-lista-cuerpo";
      avanzados.forEach(function (clave) {
        var valor = objeto[clave];
        var subRuta = ruta.concat([clave]);
        cuerpoAv.appendChild(crearCampo(clave, valor, raiz, subRuta, alCambiar, contexto));
      });
      cajaAv.appendChild(cuerpoAv);
      contenedor.appendChild(cajaAv);
    }
  }

  /* --------------------------- API pública -------------------------------- */
  /* La ventana de edición se cierra desde el botón «Listo» y desde los
     atajos globales del panel (X, clic afuera, Escape). El editor avisa
     cuando la cierra para soltar el estado. */
  window.BQItemCerrar = function () { MODAL_ITEM = null; };

  function conectarModalItem() {
    var listo = document.getElementById("modal-item-listo");
    if (listo && !listo.getAttribute("data-conectado")) {
      listo.setAttribute("data-conectado", "1");
      listo.addEventListener("click", function () { cerrarModalItem(); });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", conectarModalItem);
  } else {
    conectarModalItem();
  }

  window.BQForm = {
    /* Formulario de una sección de la portada (data/pagina.json)
       alCambiar(esEstructural) · alCambiarImagen(ruta, config) */
    construirSeccion: function (seccion, contenedor, alCambiar, alCambiarImagen) {
      contenedor.innerHTML = "";
      var contexto = { esHero: seccion.tipo === "hero", nivel: "raiz" };

      /* Header pegajoso con el nombre de la sección */
      var encabezado = crear("header");
      encabezado.className = "form-encabezado";
      var h2 = crear("h2");
      h2.textContent = "Textos de la sección";
      encabezado.appendChild(h2);
      var sub = crear("p");
      sub.className = "form-sub";
      sub.textContent = seccion.id ? "Ancla: #" + seccion.id : "Sección sin ancla";
      encabezado.appendChild(sub);
      contenedor.appendChild(encabezado);

      /* --- Zona 1: Identidad (título, antetítulo, descripción) --- */
      var identidadKeys = { eyebrow: 1, titulo: 1, texto: 1, intro: 1 };
      var tieneIdentidad = Object.keys(seccion).some(function (k) {
        return identidadKeys[k] && typeof seccion[k] === "string";
      });

      if (tieneIdentidad) {
        var identidad = crear("div");
        identidad.className = "form-identidad";
        var identLabel = crear("h3");
        identLabel.textContent = "Título y descripción";
        identidad.appendChild(identLabel);

        ["eyebrow", "titulo", "texto", "intro"].forEach(function (clave) {
          if (seccion[clave] === undefined || typeof seccion[clave] !== "string") return;
          identidad.appendChild(crearCampo(clave, seccion[clave], seccion, [clave], alCambiar, contexto));
        });

        contenedor.appendChild(identidad);
      }

      /* --- Zona 2: Resto del contenido (botones, listas, ajustes) --- */
      var cuerpo = crear("div");
      cuerpo.className = "form-cuerpo";
      construirObjeto(seccion, seccion, [], cuerpo, alCambiar, alCambiarImagen, contexto, identidadKeys);
      contenedor.appendChild(cuerpo);

      /* Si el formulario se reconstruye con la ventana de producto abierta,
         su contenido se repinta para que no quede desactualizado. */
      if (MODAL_ITEM) { pintarModalItem(); }
    },

    /* Formulario de datos del local (data/sitio.json) */
    construirSitio: function (datosSitio, contenedor, alCambiar, alCambiarImagen) {
      contenedor.innerHTML = "";
      var contexto = { nivel: "raiz" };
      construirObjeto(datosSitio, datosSitio, [], contenedor, alCambiar, alCambiarImagen, contexto);
    }
  };
})();
