/* ==========================================================================
   Servidor local de previsualización — La Boutique Cat & Dog
   --------------------------------------------------------------------------
   Sirve la carpeta del proyecto por HTTP para poder ver el sitio en local
   (el contenido se carga con fetch, por lo que file:// no funciona).

   Uso:  node tools/serve.js [rutaRaiz] [puerto]
   Sin dependencias: solo módulos de Node.
   ========================================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const root = path.resolve(process.argv[2] || process.cwd());
let port = parseInt(process.argv[3], 10) || 8080;
const host = "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

/* Guardado local (solo servidor de previsualización): el panel en
   modo local puede escribir data/*.json en esta carpeta para ver los
   cambios en la web local. Solo estos dos archivos, nada más.
   Defensa CSRF: sin chequeo de origen, cualquier sitio web que el
   usuario visite podría POSTear a localhost y escribir archivos. Se
   exige origen local (o ausente, petición no-navegador) y
   Content-Type application/json (un pedido cruzado con ese tipo
   dispara preflight CORS, que el servidor no aprueba). */
function esOrigenLocal(req) {
  const origen = req.headers.origin;
  if (!origen) { return true; }
  return origen === "http://localhost" || origen.startsWith("http://localhost:") ||
    origen === "http://127.0.0.1" || origen.startsWith("http://127.0.0.1:");
}

function esPeticionLocal(req) {
  if (!esOrigenLocal(req)) { return false; }
  const tipo = String(req.headers["content-type"] || "");
  return tipo.indexOf("application/json") !== -1;
}

const ARCHIVOS_LOCALES = ["data/pagina.json", "data/sitio.json"];

function responderGuardarLocal(req, res) {
  if (!esPeticionLocal(req)) { return send(res, 403, "Origen no permitido"); }
  const chunks = [];
  let total = 0;
  req.on("data", (chunk) => {
    total += chunk.length;
    if (total > 5 * 1024 * 1024) { req.destroy(); return; }
    chunks.push(chunk);
  });
  req.on("end", () => {
    let datos;
    try { datos = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch (e) { return send(res, 400, "Solicitud inválida"); }
    if (!datos || ARCHIVOS_LOCALES.indexOf(datos.archivo) === -1 ||
        typeof datos.contenido !== "string") {
      return send(res, 400, "Archivo no permitido");
    }
    try { JSON.parse(datos.contenido); }
    catch (e) { return send(res, 400, "Contenido no es JSON válido"); }
    const destino = path.join(root, datos.archivo);
    if (!destino.startsWith(root + path.sep)) { return send(res, 403, "Prohibido"); }
    fs.writeFileSync(destino, datos.contenido, "utf8");
    send(res, 200, JSON.stringify({ ok: true, archivo: datos.archivo }), "application/json; charset=utf-8");
  });
}

/* Imágenes en modo local: listar assets/img/ y subir archivos ahí
   (para probar la carga de imágenes sin pasar por GitHub). */
function responderImagenesLocal(req, res) {
  if (!esOrigenLocal(req)) { return send(res, 403, "Origen no permitido"); }
  const carpeta = path.join(root, "assets", "img");
  fs.readdir(carpeta, (err, nombres) => {
    if (err) return send(res, 500, "No se pudo leer la carpeta de imágenes");
    const archivos = nombres
      .filter((n) => /\.(jpg|jpeg|png|webp|svg)$/i.test(n))
      .map((n) => {
        const ruta = "assets/img/" + n;
        let size = 0;
        try { size = fs.statSync(path.join(root, ruta)).size; } catch (e) {}
        return { name: n, path: ruta, size };
      });
    send(res, 200, JSON.stringify(archivos), "application/json; charset=utf-8");
  });
}

function responderSubirImagenLocal(req, res) {
  if (!esPeticionLocal(req)) { return send(res, 403, "Origen no permitido"); }
  const chunks = [];
  let total = 0;
  req.on("data", (chunk) => {
    total += chunk.length;
    if (total > 12 * 1024 * 1024) { req.destroy(); return; }
    chunks.push(chunk);
  });
  req.on("end", () => {
    let datos;
    try { datos = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch (e) { return send(res, 400, "Solicitud inválida"); }
    if (!datos || typeof datos.ruta !== "string" || typeof datos.b64 !== "string") {
      return send(res, 400, "Datos incompletos");
    }
    /* Sin svg: un SVG con script, servido como image/svg+xml y
       abierto directo, ejecuta script en el origen localhost (XSS
       almacenado local). Las subidas reales son JPEG/PNG del canvas. */
    if (datos.ruta.indexOf("..") !== -1 || datos.ruta.indexOf("assets/img/") !== 0 ||
        !/\.(jpg|jpeg|png|webp)$/i.test(datos.ruta)) {
      return send(res, 400, "Ruta no permitida");
    }
    const destino = path.join(root, datos.ruta);
    if (!destino.startsWith(path.join(root, "assets", "img") + path.sep)) {
      return send(res, 403, "Prohibido");
    }
    try {
      fs.writeFileSync(destino, Buffer.from(datos.b64, "base64"));
    } catch (e) {
      return send(res, 500, "No se pudo guardar la imagen");
    }
    send(res, 200, JSON.stringify({ ok: true, ruta: datos.ruta }), "application/json; charset=utf-8");
  });
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch (e) {
    return send(res, 400, "Solicitud inválida");
  }
  if (urlPath === "/") urlPath = "/index.html";

  if (req.method === "POST" && urlPath === "/__local/guardar") {
    return responderGuardarLocal(req, res);
  }
  if (req.method === "GET" && urlPath === "/__local/imagenes") {
    return responderImagenesLocal(req, res);
  }
  if (req.method === "POST" && urlPath === "/__local/subir-imagen") {
    return responderSubirImagenLocal(req, res);
  }

  const filePath = path.join(root, urlPath);
  /* Evita salir de la carpeta raíz (path traversal). */
  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    return send(res, 403, "Prohibido");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      /* Si la ruta es una carpeta, intenta servir su index.html (ej.: /admin/). */
      if (!err && stat.isDirectory()) {
        return serveFile(path.join(filePath, "index.html"), res, urlPath);
      }
      return send(res, 404, "404 — No encontrado: " + urlPath);
    }
    sendFile(filePath, stat, res);
  });

  function serveFile(fp, res, original) {
    fs.stat(fp, (e2, st2) => {
      if (e2 || !st2.isFile()) {
        return send(res, 404, "404 — No encontrado: " + original);
      }
      sendFile(fp, st2, res);
    });
  }

  function sendFile(fp, stat, res) {
    const type = TYPES[path.extname(fp).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      /* Evita que el navegador "adivine" tipos de contenido (MIME sniffing) */
      "X-Content-Type-Options": "nosniff"
    });
    fs.createReadStream(fp).pipe(res).on("error", () => send(res, 500, "Error de lectura"));
  }
});

function listen() {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && port < 8090) {
      port += 1;
      listen();
    } else {
      console.error("No se pudo iniciar el servidor:", err.message);
      process.exit(1);
    }
  });
  server.listen(port, host, () => {
    /* Se imprime "localhost" (no 127.0.0.1) porque el Worker de Cloudflare
       valida el dominio contra ALLOWED_DOMAINS que incluye "localhost" pero
       no "127.0.0.1" — usar 127.0.0.1 en el navegador rompe el login. */
    const url = "http://localhost:" + port + "/";
    console.log("");
    console.log("  La Boutique Cat & Dog — servidor local");
    console.log("  Raíz: " + root);
    console.log("  Abierto en: " + url);
    console.log("");
    console.log("  (Dejá esta ventana abierta mientras mirás el sitio. Ctrl+C para salir)");
    console.log("");
    if (!process.env.NO_OPEN) exec('start "" "' + url + '"');
  });
}

listen();
