"use strict";

// Bloque de cada noticia en Menéame
const SELECTOR = ".news-summary";
const CLASE = "msr-oculta";

// [{ palabra, re }]: una expresión por palabra, para poder contarlas
let reglas = [];

// Minúsculas y sin tildes, para comparar "Política" con "politica"
function normalizar(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function escapar(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Coincide solo con palabras completas
function construirReglas(palabras) {
  return palabras
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((palabra) => ({
      palabra,
      re: new RegExp(
        "(?<![\\p{L}\\p{N}])" +
          escapar(normalizar(palabra)).replace(/\s+/g, "\\s+") +
          "(?![\\p{L}\\p{N}])",
        "u"
      ),
    }));
}

// ---------- Filtrado ----------

function revisar(bloque) {
  const texto = normalizar(bloque.textContent);
  const coinciden = reglas.filter((r) => r.re.test(texto)).map((r) => r.palabra);
  bloque.dataset.msrPalabras = coinciden.join("\n");
  bloque.classList.toggle(CLASE, coinciden.length > 0);
}

// ---------- Línea de datos bajo el título: fuente, fecha, sub ----------

function fecha(bloque) {
  // La última marca de tiempo es la de publicación; si no hay, la de envío
  const marcas = bloque.querySelectorAll(".news-submitted .ts[data-ts]");
  if (marcas.length === 0) return null;
  const ts = Number(marcas[marcas.length - 1].dataset.ts);
  return new Date(ts * 1000).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function maquetar(bloque) {
  if (bloque.dataset.msrDatos) return;
  const h2 = bloque.querySelector("h2");
  const detalles = bloque.querySelector(".news-details");
  if (!h2 || !detalles) return; // aún sin cargar del todo

  const datos = document.createElement("div");
  datos.className = "msr-datos";

  const titulo = h2.querySelector("a");
  const dominio = bloque.querySelector(".news-submitted .showmytitle");
  if (titulo && dominio) {
    const a = document.createElement("a");
    a.className = "msr-fuente";
    a.href = titulo.href;
    a.textContent = dominio.textContent.trim();
    a.target = "_blank";
    a.rel = "noopener";
    datos.append(a);
  }

  const f = fecha(bloque);
  if (f) {
    const span = document.createElement("span");
    span.className = "msr-fecha";
    span.textContent = f;
    datos.append(span);
  }

  // Se mueve la pastilla original para conservar el color de cada sub
  const sub = detalles.querySelector(".sub-name a.subname");
  if (sub) datos.append(sub);

  if (datos.childElementCount === 0) return;
  h2.after(datos);
  bloque.dataset.msrDatos = "1";
}

// ---------- Barra lateral: Comunidades ----------

function comunidades() {
  const enlace = document.querySelector('#sidebar .header a[href="/subs"]');
  const caja = enlace?.closest(".sidebox");
  if (!caja) return;
  enlace.textContent = "Comunidades";
  // Cada nombre una sola vez
  const vistas = new Set();
  caja.querySelectorAll(".cell").forEach((celda) => {
    const nombre = normalizar(celda.querySelector(".subname")?.textContent.trim() || "");
    celda.classList.toggle("msr-repetida", vistas.has(nombre));
    vistas.add(nombre);
  });
}

// ---------- Recorrido ----------

const paginaCargada = () => document.readyState !== "loading";

function procesar(bloque) {
  revisar(bloque);
  if (paginaCargada()) maquetar(bloque);
}

function procesarTodo(raiz = document) {
  raiz.querySelectorAll(SELECTOR).forEach(procesar);
}

async function cargarLista() {
  const { palabras = PALABRAS_POR_DEFECTO } = await api.storage.sync.get("palabras");
  reglas = construirReglas(ordenar(palabras));
  procesarTodo();
}

// Noticias y texto que llegan mientras carga la página o después
const observador = new MutationObserver((cambios) => {
  for (const cambio of cambios) {
    for (const nodo of cambio.addedNodes) {
      const elemento =
        nodo.nodeType === Node.ELEMENT_NODE ? nodo : nodo.parentElement;
      if (!elemento || elemento.closest(".msr-datos")) continue;
      const bloque = elemento.closest(SELECTOR);
      if (bloque) procesar(bloque);
      if (nodo.nodeType === Node.ELEMENT_NODE) procesarTodo(nodo);
    }
  }
});
observador.observe(document.documentElement, { childList: true, subtree: true });

// Noticias que ya estaban al terminar de cargar
document.addEventListener("DOMContentLoaded", () => {
  procesarTodo();
  comunidades();
});

// Si cambias la lista, se aplica al momento
api.storage.onChanged.addListener((cambios, zona) => {
  if (zona === "sync" && cambios.palabras) cargarLista();
});

// Recuento para la ventana de la extensión
api.runtime.onMessage.addListener((mensaje, _remitente, responder) => {
  if (mensaje !== "estadisticas") return;
  const bloques = [...document.querySelectorAll(SELECTOR)];
  const porPalabra = Object.fromEntries(reglas.map((r) => [r.palabra, 0]));
  let ocultas = 0;
  for (const b of bloques) {
    if (!b.classList.contains(CLASE)) continue;
    ocultas++;
    for (const p of (b.dataset.msrPalabras || "").split("\n")) {
      if (p in porPalabra) porPalabra[p]++;
    }
  }
  responder({ total: bloques.length, ocultas, porPalabra });
});

cargarLista();
