"use strict";

const lista = document.getElementById("lista");
const estado = document.getElementById("estado");
const resumen = document.getElementById("resumen");
const recuento = document.getElementById("recuento");

async function mostrarRecuento() {
  recuento.replaceChildren();
  let datos;
  try {
    const [pestana] = await api.tabs.query({ active: true, currentWindow: true });
    datos = await api.tabs.sendMessage(pestana.id, "estadisticas");
    if (!datos) throw new Error("sin respuesta");
  } catch {
    resumen.textContent = "Abre Menéame en esta pestaña para ver el recuento.";
    return;
  }
  const pct = datos.total ? Math.round((datos.ocultas / datos.total) * 100) : 0;
  resumen.textContent = `Ocultas: ${datos.ocultas} de ${datos.total} (${pct} %)`;
  // De más a menos apariciones; empates, alfabético
  const filas = Object.entries(datos.porPalabra).sort(
    ([a, na], [b, nb]) => nb - na || a.localeCompare(b, "es", { sensitivity: "base" })
  );
  for (const [palabra, n] of filas) {
    const fila = recuento.insertRow();
    fila.insertCell().textContent = palabra;
    const celda = fila.insertCell();
    celda.className = "n";
    celda.textContent = n;
  }
}

api.storage.sync.get("palabras").then(({ palabras = PALABRAS_POR_DEFECTO }) => {
  lista.value = ordenar(palabras).join("\n");
});

document.getElementById("guardar").addEventListener("click", async () => {
  const palabras = ordenar([...new Set(
    lista.value.split("\n").map((p) => p.trim()).filter((p) => p.length > 0)
  )]);
  await api.storage.sync.set({ palabras });
  lista.value = palabras.join("\n");
  estado.textContent = `Guardado (${palabras.length})`;
  setTimeout(() => (estado.textContent = ""), 2000);
  // La página se refiltra al recibir el cambio; luego se actualiza el recuento
  setTimeout(mostrarRecuento, 300);
});

mostrarRecuento();
