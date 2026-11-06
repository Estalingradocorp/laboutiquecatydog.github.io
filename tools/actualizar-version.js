/* ==========================================================================
   Actualiza la versión (?v=) de los CSS/JS en los HTML del sitio.
   --------------------------------------------------------------------------
   Por qué: Cloudflare y los navegadores cachean los .js/.css hasta 4 horas.
   Si se sube un cambio de código sin cambiar la URL, los visitantes (y el
   cliente) pueden seguir viendo la versión anterior durante ese rato.

   Uso:  node tools/actualizar-version.js
   Genera una versión a partir del contenido de los archivos (hash corto) y la
   escribe en index.html y admin/editor.html. Si nada cambió, no modifica nada.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAIZ = path.resolve(__dirname, "..");

/* Archivos whose content defines the version (the ones served with ?v=) */
const ASSETS = [
  "css/styles.css",
  "js/render.js",
  "js/main.js",
  "admin/editor.css",
  "admin/editor-form.js",
  "admin/editor-inline.js",
  "admin/editor-media.js",
  "admin/editor.js"
];

const HTML = ["index.html", path.join("admin", "editor.html")];

/* References that get ?v= (path in the HTML -> file in the repo) */
const REFERENCIAS = {
  "css/styles.css": "css/styles.css",
  "js/render.js": "js/render.js",
  "js/main.js": "js/main.js",
  "editor.css": "admin/editor.css",
  "editor-form.js": "admin/editor-form.js",
  "editor-inline.js": "admin/editor-inline.js",
  "editor-media.js": "admin/editor-media.js",
  "editor.js": "admin/editor.js"
};

function hashDeVersion() {
  const h = crypto.createHash("sha256");
  ASSETS.forEach((rel) => {
    const p = path.join(RAIZ, rel);
    h.update(rel);
    h.update(fs.readFileSync(p));
  });
  return h.digest("hex").slice(0, 8);
}

const version = hashDeVersion();
let cambios = 0;

HTML.forEach((rel) => {
  const p = path.join(RAIZ, rel);
  let texto = fs.readFileSync(p, "utf8");
  const original = texto;

  Object.keys(REFERENCIAS).forEach((ref) => {
    /* Solo toca la referencia si apunta a un archivo local (no CDN) */
    const escapada = ref.replace(/[.\/]/g, "\\$&");
    const re = new RegExp('(["\'])([^"\']*\\b' + escapada + ')(\\?v=[a-z0-9]+)?\\1', "gi");
    texto = texto.replace(re, (todo, comilla, url) => {
      if (/^https?:/i.test(url)) { return todo; }
      return comilla + url + "?v=" + version + comilla;
    });
  });

  if (texto !== original) {
    fs.writeFileSync(p, texto, "utf8");
    cambios += 1;
    console.log("  actualizado: " + rel);
  }
});

console.log("Versión de assets: " + version);
console.log(cambios ? "Se escribieron " + cambios + " archivo(s)." : "No había cambios (la versión ya estaba al día).");
