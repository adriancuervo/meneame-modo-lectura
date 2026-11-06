"use strict";

// API de extensiones: "browser" en Firefox, "chrome" en Chrome
const api = globalThis.browser ?? globalThis.chrome;

// Lista inicial, mientras no se guarde otra desde la ventana de la extensión
const PALABRAS_POR_DEFECTO = [
  "Congreso",
  "Frente Amplio",
  "Gobierno",
  "Ministra",
  "Ministras",
  "Ministro",
  "Ministros",
  "Podemos",
  "PP",
  "PSOE",
  "Senado",
  "Sumar",
  "Vox",
];

function ordenar(palabras) {
  return [...palabras].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}
