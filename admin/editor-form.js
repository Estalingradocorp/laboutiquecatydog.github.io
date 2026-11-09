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
    categoriasProducto: "Categorías de producto",
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
        id: "",
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
        titulo: "Producto nuevo",
        descripcion: "",
        mascotas: [],
        categorias: [],
        destacado: false,
        precio: "",
        mensajeWhatsApp: "",
        fotos: [{ foto: media.imagen, alt: "", ancho: media.ancho || 0, alto: media.alto || 0 }]
      };
    }
    return {};
  }

  /* Item nuevo de una lista: para las tarjetas de categoría se genera el
     identificador que usan los filtros de la web. */
  function nuevoItem(clave, media, lista) {
    var item = plantillaDe(clave, media);
    if (clave === "tarjetas") {
      item.id = idUnico(slug(item.titulo), lista);
    }
    return item;
  }

  /* Reglas por campo. Clave = nombre del campo en el JSON. Lo que no está
     acá recibe una etiqueta genérica derivada del nombre. */
  var REGLAS = {
    id: {
      etiqueta: "Identificador",
      pista: "Código interno. En las secciones es el ancla que usan los enlaces del menú (ej.: #productos); en las tarjetas de categorías es el que agrupa a los productos en los filtros. No lo cambies si ya está en uso."
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
    etiqueta: { etiqueta: "Etiqueta", pista: "Texto corto que acompaña al enlace." },
    mascotas: {
      tipo: "opciones-multiple",
      etiqueta: "Para qué mascotas",
      pista: "Elegí una o más de la sección «Categorías». Si no elegís ninguna, el producto sirve para todas.",
      fuente: "mascotas"
    },
    categorias: {
      tipo: "opciones-multiple",
      etiqueta: "Categorías de producto",
      pista: "Asigná el producto a una o varias categorías: son las que usan los filtros de la web.",
      fuente: "categorias-producto"
    },
    destacado: { tipo: "check", etiqueta: "Destacado (se muestra arriba de todo)" },
    buscador: { tipo: "check", etiqueta: "Mostrar el buscador en el catálogo" },
    precio: { etiqueta: "Precio (opcional)", pista: "si escribís un número se muestra con «$» (ej.: 12000 → $12.000). Dejalo vacío si no aplica." },
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
    empresaUrl: { etiqueta: "Enlace de la empresa (pie)", pista: "URL de la empresa del aviso de copyright. Al completarlo, la huella legal se abre en una pestaña nueva. Dejalo vacío para que sea solo texto." },
    nombre: { etiqueta: "Nombre" },
    nombreSecundario: { etiqueta: "Nombre secundario" },
    url: { etiqueta: "Dirección (URL)" }
  };

  /* Claves técnicas que no se muestran en ningún formulario. `huella` quedó
     en desuso (se retiró el camino decorativo de huellas): si algún
     borrador viejo la trae, no se muestra. `etiqueta` era el rótulo chico
     de las tarjetas de producto: se retiró del modelo y de la web. */
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

  function slug(txt) {
    return String(txt || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /* ---------------------- Opciones que salen del modelo ------------------- */
  /* El motor necesita ver el modelo entero para armar las opciones de
     «Para qué mascotas» (las tarjetas de la sección Categorías) y de
     «Categorías de producto» (la lista administrable de la sección
     Productos). El panel le pasa el modelo con BQForm.setDatos. */
  var DATOS = null;

  /* Datos del local (data/sitio.json): la sección «contacto» del modo
     Textos también edita las redes sociales, que viven ahí. El panel
     los pasa con BQForm.setSitio. */
  var SITIO = null;

  function seccionesDe(tipo) {
    if (!DATOS || !Array.isArray(DATOS.secciones)) { return []; }
    return DATOS.secciones.filter(function (s) { return s && s.tipo === tipo; });
  }

  function opcionesDe(fuente) {
    var out = [];
    var agregar = function (item, titulo) {
      if (!item || !titulo) { return; }
      out.push({ id: item.id || slug(titulo), titulo: titulo });
    };
    if (fuente === "mascotas") {
      seccionesDe("categorias").forEach(function (sec) {
        (sec.tarjetas || []).forEach(function (t) { agregar(t, t.titulo); });
      });
      return out;
    }
    if (fuente === "categorias-producto") {
      seccionesDe("productos").forEach(function (sec) {
        (sec.categoriasProducto || []).forEach(function (c) { agregar(c, c.titulo); });
      });
      return out;
    }
    return out;
  }

  /* Normaliza la selección: acepta el formato nuevo (array de ids) y el
     viejo (texto "perro gato"). */
  function normalizarSeleccion(valor, opciones) {
    var ids = [];
    if (Array.isArray(valor)) {
      ids = valor.slice();
    } else if (typeof valor === "string" && valor.trim()) {
      valor.toLowerCase().split(/[\s,]+/).forEach(function (t) {
        var op = opciones.filter(function (o) {
          return o.id === t || o.id.indexOf(t) === 0 || slug(o.titulo).indexOf(t) === 0;
        })[0];
        if (op) { ids.push(op.id); }
      });
    }
    return ids.filter(function (id) {
      return opciones.some(function (o) { return o.id === id; });
    });
  }

  function leerSeleccion(grupo) {
    return Array.prototype.slice.call(grupo.querySelectorAll("input[type=checkbox]"))
      .filter(function (c) { return c.checked; })
      .map(function (c) { return c.value; });
  }

  function actualizarEstadoTodos(caja, seleccion) {
    var todos = caja.querySelector(".opcion-todos");
    if (!todos) { return; }
    var marcado = !seleccion || !seleccion.length;
    todos.classList.toggle("is-activo", marcado);
    todos.setAttribute("aria-pressed", marcado ? "true" : "false");
  }

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

  /* Título anterior de una tarjeta de categoría (o null si no aplica) */
  function tituloPrevio(raiz, ruta) {
    if (!ruta || ruta.length !== 3 || ruta[0] !== "tarjetas" || ruta[2] !== "titulo") { return null; }
    var lista = (raiz && raiz.tarjetas) || [];
    var tarjeta = lista[ruta[1]];
    return tarjeta ? tarjeta.titulo : null;
  }

  /* Identificador único dentro de la lista de tarjetas */
  function idUnico(base, lista) {
    var raiz = base || "categoria";
    var usado = (lista || []).map(function (t) { return t && t.id; });
    var id = raiz;
    var n = 2;
    while (usado.indexOf(id) !== -1) { id = raiz + "-" + n; n += 1; }
    return id;
  }

  /* Si el id de la tarjeta era el generado a partir del título viejo y
     ningún producto lo usa, se rehace con el título nuevo. Si el cliente
     lo editó a mano o ya hay productos apuntando a él, se respeta. */
  function sincronizarIdTarjeta(raiz, ruta, tituloViejo) {
    var lista = (raiz && raiz.tarjetas) || [];
    var tarjeta = lista[ruta[1]];
    if (!tarjeta) { return; }
    var idViejo = tarjeta.id || "";
    /* Tarjeta vieja sin identificador: se le da uno ahora */
    if (!idViejo) {
      tarjeta.id = idUnico(slug(tarjeta.titulo), lista);
      return;
    }
    if (idViejo !== (slug(tituloViejo) || "")) { return; }
    var nuevo = slug(tarjeta.titulo);
    if (!nuevo || nuevo === idViejo) { return; }
    if (idEnUso(idViejo)) { return; }
    tarjeta.id = idUnico(nuevo, lista);
  }

  /* ¿Algún producto apunta a este identificador de mascota? */
  function idEnUso(id) {
    var secciones = (DATOS && DATOS.secciones) || [];
    var usado = false;
    secciones.forEach(function (sec) {
      if (!sec || sec.tipo !== "productos") { return; }
      (sec.productos || []).forEach(function (p) {
        if ((p.mascotas || []).indexOf(id) !== -1) { usado = true; }
      });
    });
    return usado;
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

    /* Selección múltiple con píldoras. Las opciones salen del modelo:
       «Para qué mascotas» usa las tarjetas de la sección Categorías y
       «Categorías de producto» usa la lista administrable de Productos. */
    if (tipo === "opciones-multiple") {
      var opciones = opcionesDe(regla.fuente);
      var eleccion = normalizarSeleccion(valor, opciones);
      var rotuloOpciones = crear("span");
      rotuloOpciones.className = "campo-etiqueta";
      rotuloOpciones.textContent = etiquetaDe(clave);
      caja.appendChild(rotuloOpciones);

      if (!opciones.length) {
        var aviso = crear("p");
        aviso.className = "campo-pista aviso-campo";
        aviso.textContent = regla.fuente === "mascotas"
          ? "No hay opciones todavía: agregá tarjetas en la sección «Categorías»."
          : "No hay opciones todavía: agregá categorías de producto en esta sección.";
        caja.appendChild(aviso);
        return caja;
      }

      var grupo = crear("div");
      grupo.className = "opciones-pildoras";
      grupo.setAttribute("role", "group");
      grupo.setAttribute("aria-label", etiquetaDe(clave));
      opciones.forEach(function (op) {
        var etiqueta = crear("label");
        etiqueta.className = "opcion-pildora";
        var chk = crear("input");
        chk.type = "checkbox";
        chk.value = op.id;
        chk.checked = eleccion.indexOf(op.id) !== -1;
        var texto = crear("span");
        texto.textContent = op.titulo;
        etiqueta.appendChild(chk);
        etiqueta.appendChild(texto);
        chk.addEventListener("change", function () {
          var actual = leerSeleccion(grupo);
          asignarValor(raiz, ruta, actual);
          alCambiar();
          actualizarEstadoTodos(caja, actual);
        });
        grupo.appendChild(etiqueta);
      });
      caja.appendChild(grupo);

      var todos = crear("button");
      todos.type = "button";
      todos.className = "opcion-todos";
      todos.textContent = regla.fuente === "mascotas" ? "Todos" : "Ninguna";
      todos.addEventListener("click", function () {
        Array.prototype.forEach.call(grupo.querySelectorAll("input[type=checkbox]"), function (c) {
          c.checked = false;
        });
        asignarValor(raiz, ruta, []);
        alCambiar();
        actualizarEstadoTodos(caja, []);
      });
      caja.appendChild(todos);
      actualizarEstadoTodos(caja, eleccion);
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
      var tituloViejo = tituloPrevio(raiz, ruta);
      asignarValor(raiz, ruta, extraer(control));
      /* Si el título de una tarjeta de categoría cambió y su identificador
         era el que se generó solo, se actualiza para que los filtros de la
         web sigan usando un id coherente. */
      if (tituloViejo != null) { sincronizarIdTarjeta(raiz, ruta, tituloViejo); }
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
      nombre: function (item, i) { return (item && item.titulo) || ("Producto " + (i + 1)); },
      meta: function (item) {
        var partes = [];
        var cats = item && Array.isArray(item.categorias) ? item.categorias : [];
        if (cats.length) {
          var titulos = opcionesDe("categorias-producto");
          var nombres = cats.map(function (id) {
            var op = titulos.filter(function (o) { return o.id === id; })[0];
            return op ? op.titulo : id;
          });
          partes.push(nombres.join(", "));
        }
        if (item && item.precio && String(item.precio).trim()) { partes.push(String(item.precio)); }
        var n = (item && item.fotos) ? item.fotos.length : 0;
        partes.push(n === 1 ? "1 foto" : n + " fotos");
        return partes.join(" · ");
      },
      buscable: function (item) {
        if (!item || typeof item !== "object") { return ""; }
        return [item.titulo, item.descripcion, item.precio]
          .filter(function (v) { return !!v; }).join(" ").toLowerCase();
      },
      quitarTexto: function (item) {
        var nombre = (item && item.titulo) || "este producto";
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
            /* Sin filtro activo: el item nuevo ("Producto nuevo") no
               coincidiría con la búsqueda y quedaría invisible,
               como si se hubiera borrado. */
            TEXTO_BUSQUEDA = "";
            valor.push(nuevoItem(clave, media, valor));
            alCambiar(true);
            /* El item nuevo se abre directo para completar los datos */
            abrirModalItem(valor.length - 1, clave, valor, raiz, ruta, alCambiar, alCambiarImagen, contexto);
          },
          /* Varias imágenes de una vez: para un producto, todas pasan a
             ser fotos SUyas (antes se aplicaba solo la primera y las
             demás se perdían). Para slides y tarjetas, cada imagen es
             un ítem nuevo de la lista. */
          alElegirMultiple: function (medias) {
            if (!medias || !medias.length) { return; }
            TEXTO_BUSQUEDA = "";
            if (clave === "productos") {
              var item = nuevoItem(clave, medias[0], valor);
              if (!Array.isArray(item.fotos)) { item.fotos = []; }
              for (var i = 1; i < medias.length; i++) {
                item.fotos.push({
                  foto: medias[i].imagen, alt: "",
                  ancho: medias[i].ancho || 0, alto: medias[i].alto || 0
                });
              }
              valor.push(item);
            } else {
              for (var j = 0; j < medias.length; j++) {
                valor.push(nuevoItem(clave, medias[j], valor));
              }
            }
            alCambiar(true);
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

      /* El lápiz edita la imagen que ya está (recorte + zoom), igual
         que antes de subirla; «Datos» despliega texto alt y medidas. */
      fila.appendChild(botonMini("✎", "Editar foto (recortar y zoom)", function () {
        if (!window.BQMedia || !foto.foto) { return; }
        window.BQMedia.abrir({
          titulo: "Editar foto " + (i + 1),
          tipo: "foto",
          edicionDe: foto.foto,
          alElegir: function (media) {
            foto.foto = media.imagen;
            if (media.ancho) { foto.ancho = media.ancho; }
            if (media.alto) { foto.alto = media.alto; }
            alCambiar(true);
          }
        });
      }));
      fila.appendChild(botonMini("···", "Datos de esta foto (texto alt y medidas)", function () {
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
          },
          /* Varias fotos de una vez: se agregan TODAS al producto.
             Antes, al elegir varias en la galería, solo entraba la
             primera (las demás se perdían sin avisar). */
          alElegirMultiple: function (medias) {
            if (!medias || !medias.length) { return; }
            for (var i = 0; i < medias.length; i++) {
              valor.push({
                foto: medias[i].imagen, alt: "",
                ancho: medias[i].ancho || 0, alto: medias[i].alto || 0
              });
            }
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
    var m = Array.isArray(item.mascotas)
      ? item.mascotas.map(function (x) { return String(x).toLowerCase(); })
      : String(item.mascotas).split(/\s+/);
    var tienePerro = m.some(function (x) { return x.indexOf("perro") === 0; });
    var tieneGato = m.some(function (x) { return x.indexOf("gato") === 0; });
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

  /* ------------ Lista de texto administrable (categorías de producto) ------ */
  /* Son solo nombres: no llevan foto, así que van como filas editables
     (con ↑ ↓ y quitar) en vez de íconos con ventana. El id de cada
     categoría no cambia cuando se renombra: los productos que la usan
     siguen apuntando a la misma. */
  function construirListaTexto(clave, valor, raiz, ruta, contenedor, alCambiar) {
    var caja = crear("div");
    caja.className = "lista-campo lista-texto";

    var cabecera = crear("div");
    cabecera.className = "bloque-cabecera";
    var titulo = crear("h3");
    titulo.className = "lista-titulo";
    titulo.textContent = DICT_LISTAS[clave] || etiquetaDe(clave);
    cabecera.appendChild(titulo);
    var contador = crear("span");
    contador.className = "bloque-contador";
    contador.textContent = valor.length ? valor.length + " categorías" : "";
    cabecera.appendChild(contador);
    caja.appendChild(cabecera);

    var nota = crear("p");
    nota.className = "campo-pista";
    nota.textContent = "Son los botones de filtro que ve la gente debajo del buscador (Todas, Alimentos, Descanso…). Desde acá se crean, renombran y borran; después se asignan a cada producto en su ventana.";
    caja.appendChild(nota);

    /* Píldoras como los filtros de la web: cada categoría es una
       etiqueta redondeada con el nombre editable, flechas mínimas al
       pasar el mouse y la cantidad de productos que la usan. */
    var filas = crear("div");
    filas.className = "lista-texto-filas lista-texto-pildoras";
    valor.forEach(function (item, i) {
      var fila = crear("div");
      fila.className = "fila-texto fila-pildora";

      var campo = crear("input");
      campo.type = "text";
      campo.className = "fila-texto-input";
      campo.value = item.titulo || "";
      campo.setAttribute("aria-label", "Nombre de la categoría");
      var ajustar = function () { campo.size = Math.max(3, campo.value.length + 1); };
      ajustar();
      campo.addEventListener("input", function () {
        item.titulo = campo.value;
        ajustar();
        alCambiar();
      });
      fila.appendChild(campo);

      var acciones = crear("div");
      acciones.className = "fila-pildora-acciones";
      acciones.appendChild(botonMini("↑", "Subir", function () {
        if (i === 0) { return; }
        var sacado = valor.splice(i, 1)[0];
        valor.splice(i - 1, 0, sacado);
        alCambiar(true);
      }));
      acciones.appendChild(botonMini("↓", "Bajar", function () {
        if (i >= valor.length - 1) { return; }
        var sacado = valor.splice(i, 1)[0];
        valor.splice(i + 1, 0, sacado);
        alCambiar(true);
      }));
      acciones.appendChild(botonMini("✕", "Quitar categoría", function () {
        var id = item.id;
        valor.splice(i, 1);
        /* Los productos que la tenían pierden la categoría: si no, el
           filtro mostraría una categoría que ya no existe. */
        seccionesDe("productos").forEach(function (sec) {
          (sec.productos || []).forEach(function (p) {
            if (Array.isArray(p.categorias)) {
              p.categorias = p.categorias.filter(function (c) { return c !== id; });
            }
          });
        });
        alCambiar(true);
      }, true));
      fila.appendChild(acciones);

      filas.appendChild(fila);
    });
    caja.appendChild(filas);

    var agregar = crear("button");
    agregar.type = "button";
    agregar.className = "lista-agregar-pildora";
    agregar.textContent = "+ Nueva categoría";
    agregar.addEventListener("click", function () {
      var n = valor.length + 1;
      var id = "categoria-" + n;
      while (valor.some(function (c) { return c.id === id; })) {
        n += 1;
        id = "categoria-" + n;
      }
      valor.push({ id: id, titulo: "Nueva categoría" });
      alCambiar(true);
    });
    filas.appendChild(agregar);

    contenedor.appendChild(caja);
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
            valor.push(nuevoItem(clave, media, valor));
            alCambiar(true);
          },
          /* Varias imágenes de una vez: cada una es un ítem nuevo. */
          alElegirMultiple: function (medias) {
            if (!medias || !medias.length) { return; }
            for (var i = 0; i < medias.length; i++) {
              valor.push(nuevoItem(clave, medias[i], valor));
            }
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

  /* Orden de presentación en la ventana de producto: el JSON puede
     traer las claves en otro orden (según cómo se creó cada producto)
     y el formulario las seguía tal cual — en algunos, «Categorías» y
     «Destacado» quedaban debajo de «+ Agregar foto». */
  var ORDEN_PRODUCTO = {
    titulo: 0, descripcion: 1, mascotas: 2, categorias: 3, destacado: 4,
    precio: 5, mensajeWhatsApp: 6, fotos: 7
  };

  function construirObjeto(objeto, raiz, ruta, contenedor, alCambiar, alCambiarImagen, contexto, excluidas) {
    /* Los campos técnicos van aparte, al final, en «Campos avanzados»:
      el día a día se edita sin ruido, pero nada queda fuera del panel. */
    var avanzados = [];

    var claves = Object.keys(objeto);
    if (contexto && contexto.lista === "productos") {
      claves.sort(function (a, b) {
        var pa = (a in ORDEN_PRODUCTO) ? ORDEN_PRODUCTO[a] : 99;
        var pb = (b in ORDEN_PRODUCTO) ? ORDEN_PRODUCTO[b] : 99;
        return pa - pb;
      });
    }
    claves.forEach(function (clave) {
      if (TECNICOS[clave]) { return; }
      if (excluidas && excluidas[clave]) { return; }
      /* El rótulo chico de los productos se retiró: si un borrador viejo lo
         trae, se borra en vez de mostrarlo. */
      if (clave === "etiqueta" && ruta[0] === "productos") {
        delete objeto[clave];
        return;
      }
      if (AVANZADOS[clave] && typeof objeto[clave] !== "object") {
        avanzados.push(clave);
        return;
      }
      var valor = objeto[clave];
      var subRuta = ruta.concat([clave]);

      /* Los campos de selección múltiple guardan un array de ids, pero no
         son listas: se editan con píldoras, no como bloques de ítems. */
      if (REGLAS[clave] && REGLAS[clave].tipo === "opciones-multiple") {
        contenedor.appendChild(crearCampo(clave, valor, raiz, subRuta, alCambiar, contexto));
        return;
      }

      if (Array.isArray(valor)) {
        /* La lista de categorías de producto se edita como filas de texto */
        if (clave === "categoriasProducto") {
          construirListaTexto(clave, valor, raiz, subRuta, contenedor, alCambiar);
          return;
        }
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
      /* Campos cortos van lado a lado (menos scroll, más densidad).
         Las listas de opciones (píldoras) ocupan la fila entera. */
      if (clave === "precio" || clave === "etiqueta" ||
          clave === "mostrarFiltros" || clave === "buscador") {
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
    /* El panel pasa el modelo completo: lo usan las opciones que salen de
       otras secciones (las tarjetas de «Categorías», la lista de
       «Categorías de producto»). */
    setDatos: function (datos) { DATOS = datos || null; },
    setSitio: function (sitio) { SITIO = sitio || null; },

    /* Formulario de una sección de la portada (data/pagina.json)
       alCambiar(esEstructural) · alCambiarImagen(ruta, config) ·
       alCambiarSitio() (para los campos que viven en datos del local) */
    construirSeccion: function (seccion, contenedor, alCambiar, alCambiarImagen, alCambiarSitio) {
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

      /* La sección «contacto» también edita las redes sociales, que
         viven en los datos del local (data/sitio.json): así el cliente
         no tiene que cambiar de pestaña para eso. */
      if (seccion.tipo === "contacto" && SITIO && SITIO.redes && alCambiarSitio) {
        var grupoRedes = crear("div");
        grupoRedes.className = "form-separador";
        var labelRedes = crear("span");
        labelRedes.textContent = "Redes sociales (Datos del local)";
        grupoRedes.appendChild(labelRedes);
        contenedor.appendChild(grupoRedes);

        var cajaRedes = crear("div");
        cajaRedes.className = "form-cuerpo";
        ["instagram", "tiktok", "facebook"].forEach(function (clave) {
          var red = SITIO.redes[clave] || { url: "", etiqueta: "" };
          var rot = crear("span");
          rot.className = "campo-etiqueta";
          rot.textContent = clave.charAt(0).toUpperCase() + clave.slice(1);
          cajaRedes.appendChild(rot);
          [["etiqueta", "Etiqueta"], ["url", "Dirección (URL)"]].forEach(function (par) {
            var campo = crear("input");
            campo.type = par[0] === "url" ? "url" : "text";
            campo.className = "fila-texto-input";
            campo.style.width = "100%";
            campo.style.boxSizing = "border-box";
            campo.value = red[par[0]] || "";
            campo.setAttribute("aria-label", par[1] + " de " + clave);
            campo.placeholder = par[1];
            campo.addEventListener("input", function () {
              if (!SITIO.redes[clave]) { SITIO.redes[clave] = { url: "", etiqueta: "" }; }
              SITIO.redes[clave][par[0]] = campo.value;
              alCambiarSitio();
            });
            cajaRedes.appendChild(campo);
          });
        });
        contenedor.appendChild(cajaRedes);
      }

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
