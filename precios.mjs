/* Genera precios.json junto a la app.
 *
 * Corre en los servidores de GitHub, no en tu celular, así que aquí no aplica
 * el bloqueo del navegador que impide consultar estas fuentes desde la app.
 *
 * La TRM viene de datos abiertos y es estable. Los precios de bolsa se leen de
 * una página pública: eso puede dejar de funcionar si cambian el diseño. Si un
 * precio no se consigue, se conserva el anterior y la app sigue con ese.
 */

import { readFileSync, writeFileSync } from "node:fs";

// ── Escribe aquí los símbolos que tengas en la app ──
const SIMBOLOS = ["ICOLCAP", "CSPXCO"];

const ARCHIVO = "precios.json";

function leerPrevio() {
  try {
    return JSON.parse(readFileSync(ARCHIVO, "utf8"));
  } catch {
    return { actualizado: null, trm: 0, precios: {} };
  }
}

async function trm() {
  const url = "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=60&$order=vigenciadesde%20DESC";
  const filas = await (await fetch(url)).json();
  const validas = filas
    .map((f) => ({ valor: Number(f.valor), desde: String(f.vigenciadesde || "").slice(0, 10) }))
    .filter((f) => f.valor > 500 && f.valor < 50000)
    .sort((a, b) => (a.desde < b.desde ? 1 : -1));
  if (!validas.length) throw new Error("TRM no disponible");
  return validas[0].valor;
}

/* La República publica el movimiento accionario de cada especie.
   Se busca el primer valor con formato de precio colombiano en la página. */
async function precioBVC(simbolo) {
  const url = `https://www.larepublica.co/indicadores-economicos/movimiento-accionario/${simbolo.toLowerCase()}`;
  const html = await (await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (actualizador de precios personal)" },
  })).text();

  // Formato "$ 22.833" o "$ 2.584.000"
  const candidatos = [...html.matchAll(/\$\s?([\d.]{4,})/g)]
    .map((m) => Number(m[1].replace(/\./g, "")))
    .filter((v) => v > 100 && v < 100000000);

  if (!candidatos.length) throw new Error("sin precio en la página");
  return candidatos[0];
}

const salida = leerPrevio();

try {
  salida.trm = await trm();
  console.log("TRM:", salida.trm);
} catch (err) {
  console.log("TRM falló, se conserva la anterior:", err.message);
}

for (const s of SIMBOLOS) {
  try {
    const p = await precioBVC(s);
    salida.precios[s] = p;
    console.log(s, "→", p);
  } catch (err) {
    console.log(s, "falló, se conserva el anterior:", err.message);
  }
}

salida.actualizado = new Date().toISOString();
writeFileSync(ARCHIVO, JSON.stringify(salida, null, 2) + "\n");
console.log("Escrito", ARCHIVO);
