#!/usr/bin/env node
/* Actualiza data/results.js con los marcadores más recientes del Mundial 2026
   tomados de openfootball/worldcup.json. Lo ejecuta GitHub Actions de forma
   programada (ver .github/workflows/update-results.yml). Requiere Node 18+. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const SRC = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// Carga un archivo `window.VAR = <json>;` y devuelve el json
function loadWindowJs(file) {
  const txt = readFileSync(join(DATA, file), "utf8");
  const start = txt.indexOf("=");
  const json = txt.slice(start + 1).trim().replace(/;\s*$/, "");
  return JSON.parse(json);
}

const fixtures = loadWindowJs("fixtures.js");
const pairIndex = {};
for (const f of fixtures) pairIndex[[f.homeEN, f.awayEN].sort().join("|")] = f;

const res = await fetch(SRC, { headers: { "cache-control": "no-cache" } });
if (!res.ok) { console.error("Error al descargar:", res.status); process.exit(1); }
const data = await res.json();

const matches = {};
let played = 0;
for (const m of data.matches || []) {
  if (!String(m.group || "").startsWith("Group")) continue;
  const ft = m.score && m.score.ft;
  if (!ft) continue;
  const fx = pairIndex[[m.team1, m.team2].sort().join("|")];
  if (!fx) continue;
  const [h, a] = m.team1 === fx.homeEN ? [ft[0], ft[1]] : [ft[1], ft[0]];
  matches[fx.id] = { h, a, status: "FT" };
  played++;
}

const out = {
  updated: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  source: "openfootball/worldcup.json",
  matches,
};
writeFileSync(join(DATA, "results.js"),
  "window.RESULTS = " + JSON.stringify(out, null, 1) + ";\n");
console.log(`results.js actualizado: ${played}/72 partidos con marcador`);
