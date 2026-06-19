"use strict";
/* Quiniela Rico · Mundial 2026
   Calcula los puntos de cada participante y se actualiza con los marcadores
   más recientes. Datos estáticos en data/*.js; resultados en vivo desde openfootball. */

// ----- Reglas de puntuación (editar aquí si cambian) -----
const PTS_RESULTADO = 3;     // acertar L / E / V
const PTS_MARCADOR  = 2;     // BONUS adicional por marcador exacto (total 5 si aciertas ambos)
const COSTO = 300;           // costo por participante
const REPARTO = [0.60, 0.30, 0.10];   // 1º, 2º, 3º
const LIVE_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// ----- Estado -----
const FIXTURES = window.FIXTURES || [];
const PARTICIPANTS = window.PARTICIPANTS || [];
let results = Object.assign({}, (window.RESULTS && window.RESULTS.matches) || {});
let updatedAt = (window.RESULTS && window.RESULTS.updated) || null;
let curView = "tabla";
let selParticipant = 0;
const openMatches = new Set();

// Índice por par de equipos (EN) -> fixture, para mapear los marcadores en vivo
const pairIndex = {};
const byId = {};
FIXTURES.forEach(f => {
  byId[f.id] = f;
  pairIndex[[f.homeEN, f.awayEN].sort().join("|")] = f;
});

// ----- Utilidades -----
const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function titleCase(name) {  // "FERNANDO Y ERIKA" -> "Fernando y Erika"
  const small = new Set(["y", "e", "de", "del", "la", "los"]);
  return name.toLowerCase().split(/\s+/).map((w, i) => {
    if (i > 0 && small.has(w.replace(/,/g, ""))) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}

function outcome(h, a) { return h > a ? "L" : (h < a ? "V" : "E"); }
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
function fmtDate(iso) {
  if (!iso) return "Por definir";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const day = DIAS[dt.getDay()];
  return `${day.charAt(0).toUpperCase() + day.slice(1)} ${d} de ${MESES[m - 1]}`;
}
function money(n) { return "$" + Math.round(n).toLocaleString("es-MX"); }

// ----- Motor de puntos -----
function scoreParticipant(p) {
  let pts = 0, nRes = 0, nExact = 0, jugados = 0;
  const per = {};
  for (const f of FIXTURES) {
    const r = results[f.id];
    const pred = p.preds[f.id];
    if (!r) continue;
    jugados++;
    let mp = 0, isRes = false, isExa = false;
    if (pred && pred.pick) {
      if (pred.pick === outcome(r.h, r.a)) { mp += PTS_RESULTADO; nRes++; isRes = true; }
      if (pred.ph === r.h && pred.pa === r.a) { mp += PTS_MARCADOR; nExact++; isExa = true; }
    }
    pts += mp;
    per[f.id] = { pts: mp, res: isRes, exa: isExa };
  }
  return { pts, nRes, nExact, jugados, per };
}

function standings() {
  const rows = PARTICIPANTS.map((p, i) => ({ i, name: p.name, ...scoreParticipant(p) }));
  rows.sort((a, b) => b.pts - a.pts || b.nExact - a.nExact || b.nRes - a.nRes || a.name.localeCompare(b.name));
  let rank = 0, prev = null;
  rows.forEach((r, idx) => { if (prev === null || r.pts !== prev) rank = idx + 1; r.rank = rank; prev = r.pts; });
  return rows;
}

function playedCount() { return FIXTURES.filter(f => results[f.id]).length; }
function pool() { return PARTICIPANTS.length * COSTO; }

// ----- Vistas -----
function renderTabla() {
  const box = $("#view-tabla"); box.innerHTML = "";
  const rows = standings();
  const P = pool();

  // Podio / bolsa
  const pz = el("div", "pool");
  const medals = ["🥇", "🥈", "🥉"];
  for (let i = 0; i < 3; i++) {
    const w = rows[i];
    const c = el("div", "pz");
    c.innerHTML = `<div class="m">${medals[i]}</div>
      <div class="amt">${money(P * REPARTO[i])}</div>
      <div class="lbl">${["1er","2do","3er"][i]} lugar</div>
      <div class="nm">${w ? esc(titleCase(w.name)) : "—"}</div>`;
    pz.appendChild(c);
  }
  box.appendChild(pz);

  const head = el("div", "lead-head", `<h2>Clasificación</h2><span class="muted">${playedCount()} de 72 jugados</span>`);
  box.appendChild(head);
  box.appendChild(el("div", "legend",
    `<span><i class="dot res"></i> Resultado acertado (+${PTS_RESULTADO})</span>
     <span><i class="dot exa"></i> Marcador exacto (+${PTS_MARCADOR})</span>`));

  const card = el("div", "card");
  rows.forEach(r => {
    const row = el("div", "row" + (r.rank <= 3 ? " top" + r.rank : ""));
    const medal = r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank;
    const prize = r.rank <= 3 ? `<div class="prize">${money(P * REPARTO[r.rank - 1])}</div>` : "";
    row.innerHTML =
      `<div class="rank">${medal}</div>
       <div class="who">
         <div class="name">${esc(titleCase(r.name))}</div>
         <div class="sub"><span><b>${r.nRes}</b> result.</span><span><b>${r.nExact}</b> exactos</span></div>
       </div>
       <div class="pts"><span class="n">${r.pts}</span><span class="u">pts</span>${prize}</div>`;
    row.addEventListener("click", () => { selParticipant = r.i; switchView("participantes"); });
    card.appendChild(row);
  });
  box.appendChild(card);
}

function predList(f) {
  const r = results[f.id];
  const items = PARTICIPANTS.map(p => {
    const pred = p.preds[f.id];
    let cls = "", tag = "";
    if (r && pred && pred.pick) {
      const isRes = pred.pick === outcome(r.h, r.a);
      const isExa = pred.ph === r.h && pred.pa === r.a;
      if (isExa) { cls = "exa"; tag = `<span class="tag exa">EXACTO +${PTS_RESULTADO + PTS_MARCADOR}</span>`; }
      else if (isRes) { cls = "res"; tag = `<span class="tag res">+${PTS_RESULTADO}</span>`; }
    }
    const sc = pred && pred.ph != null ? `${pred.ph}-${pred.pa}` : "—";
    return { cls, html:
      `<div class="pred ${cls}">
         <span class="pn">${esc(titleCase(p.name))}</span>
         <span class="pp">${sc}</span>
         <span class="pg">${tag}</span>
       </div>`, score: cls === "exa" ? 2 : (cls === "res" ? 1 : 0) };
  });
  items.sort((a, b) => b.score - a.score);
  return items.map(i => i.html).join("");
}

function matchCard(f) {
  const r = results[f.id];
  const opened = openMatches.has(f.id);
  const card = el("div", "card match" + (opened ? " open" : ""));
  const scoreHtml = r
    ? `<div class="score ft">${r.h} - ${r.a}</div>`
    : `<div class="score pend">vs</div>`;
  const meta = `${fmtDate(f.date)}${f.ground ? " · " + esc(f.ground) : ""}`;
  card.innerHTML =
    `<div class="top">
       <span class="grp">${f.group}</span>
       <div class="teams">
         <span class="side"><span class="fl">${f.homeFlag}</span><span class="tn">${esc(f.homeES)}</span></span>
         ${scoreHtml}
         <span class="side away"><span class="tn">${esc(f.awayES)}</span><span class="fl">${f.awayFlag}</span></span>
       </div>
       <span class="caret">▼</span>
     </div>
     <div class="meta">${meta}${r ? "" : ' · <span>Pendiente</span>'}</div>
     <div class="preds ${opened ? "" : "hidden"}">${opened ? predList(f) : ""}</div>`;
  card.querySelector(".top").addEventListener("click", () => {
    if (openMatches.has(f.id)) openMatches.delete(f.id); else openMatches.add(f.id);
    renderPartidos();
  });
  return card;
}

function renderPartidos() {
  const box = $("#view-partidos"); box.innerHTML = "";
  // ordenar por fecha; jugados primero por fecha asc, pendientes al final
  const fs = FIXTURES.slice().sort((a, b) =>
    (a.date || "9999").localeCompare(b.date || "9999") || a.group.localeCompare(b.group));
  let lastDay = null;
  for (const f of fs) {
    const day = f.date || "zzz";
    if (day !== lastDay) {
      box.appendChild(el("div", "daysep", fmtDate(f.date)));
      lastDay = day;
    }
    box.appendChild(matchCard(f));
  }
}

function renderParticipantes() {
  const box = $("#view-participantes"); box.innerHTML = "";
  const sel = el("div", "psel");
  const ord = standings();
  ord.forEach(r => {
    const chip = el("button", "chip" + (r.i === selParticipant ? " active" : ""), esc(titleCase(r.name)));
    chip.addEventListener("click", () => { selParticipant = r.i; renderParticipantes(); });
    sel.appendChild(chip);
  });
  box.appendChild(sel);

  const p = PARTICIPANTS[selParticipant];
  const s = scoreParticipant(p);
  const myRank = ord.find(r => r.i === selParticipant).rank;
  const stat = el("div", "pstat");
  stat.innerHTML =
    `<div class="b"><div class="n">${s.pts}</div><div class="l">puntos</div></div>
     <div class="b"><div class="n">${myRank}°</div><div class="l">lugar</div></div>
     <div class="b"><div class="n">${s.nRes}</div><div class="l">resultados</div></div>
     <div class="b"><div class="n">${s.nExact}</div><div class="l">exactos</div></div>`;
  box.appendChild(stat);

  const card = el("div", "card");
  let lastG = null;
  const fs = FIXTURES.slice().sort((a, b) =>
    a.group.localeCompare(b.group) || (a.date || "").localeCompare(b.date || "") || a.id.localeCompare(b.id));
  for (const f of fs) {
    if (f.group !== lastG) { card.appendChild(el("div", "daysep", "Grupo " + f.group)); lastG = f.group; }
    const r = results[f.id];
    const pred = p.preds[f.id];
    const per = s.per[f.id];
    const cls = per ? (per.exa ? "exa" : (per.res ? "res" : "")) : "";
    const predSc = pred && pred.ph != null
      ? `${pred.ph}-${pred.pa}${pred.pick ? " (" + pred.pick + ")" : ""}` : "—";
    const realSc = r ? `${r.h}-${r.a}` : "—";
    const ptsCell = per && per.pts ? "+" + per.pts : (r ? "0" : "");
    const row = el("div", "pmatch " + cls);
    row.innerHTML =
      `<div class="g">${f.group}</div>
       <div class="mt">${f.homeFlag} ${esc(f.homeES)} – ${esc(f.awayES)} ${f.awayFlag}</div>
       <div class="pr">${predSc} <span class="${r ? "" : "pend"}">→ ${realSc}</span></div>
       <div class="pts-cell">${ptsCell}</div>`;
    card.appendChild(row);
  }
  box.appendChild(card);
}

function renderReglas() {
  const box = $("#view-reglas"); box.innerHTML = "";
  const P = pool();
  const card = el("div", "card card-pad rules");
  card.innerHTML =
    `<h2>¿Cómo se calculan los puntos?</h2>
     <div class="big-pts">
       <div class="p"><div class="n">${PTS_RESULTADO}</div><div class="l">por acertar el<br><b>resultado</b> (Local / Empate / Visitante)</div></div>
       <div class="p gold"><div class="n">+${PTS_MARCADOR}</div><div class="l">extra por acertar el<br><b>marcador exacto</b></div></div>
     </div>
     <div class="note">Si aciertas el marcador exacto ganas <b>${PTS_RESULTADO + PTS_MARCADOR} puntos</b> (3 del resultado + ${PTS_MARCADOR} del marcador).</div>
     <h2 style="margin-top:18px">Premios</h2>
     <ul>
       <li>🥇 <b>1er lugar:</b> 60% &rarr; <b>${money(P * 0.6)}</b></li>
       <li>🥈 <b>2do lugar:</b> 30% &rarr; <b>${money(P * 0.3)}</b></li>
       <li>🥉 <b>3er lugar:</b> 10% &rarr; <b>${money(P * 0.1)}</b></li>
     </ul>
     <p class="muted">Bolsa total: ${PARTICIPANTS.length} participantes × ${money(COSTO)} = <b>${money(P)}</b></p>
     <h2 style="margin-top:18px">Actualización automática</h2>
     <p>Los marcadores se toman de la base pública <a href="https://github.com/openfootball/worldcup.json" target="_blank" rel="noopener">openfootball/worldcup.json</a> y los puntos se recalculan solos. Toca <b>Actualizar</b> para traer los resultados más recientes.</p>`;
  box.appendChild(card);
}

// ----- Navegación -----
function switchView(v) {
  curView = v;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
  document.querySelectorAll(".view").forEach(s => s.classList.add("hidden"));
  $("#view-" + v).classList.remove("hidden");
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  if (curView === "tabla") renderTabla();
  else if (curView === "partidos") renderPartidos();
  else if (curView === "participantes") renderParticipantes();
  else if (curView === "reglas") renderReglas();
  // header
  const pc = playedCount();
  $("#playedCount").textContent = pc;
  $("#progressBar").style.width = (pc / 72 * 100) + "%";
  if (updatedAt) {
    const d = new Date(updatedAt);
    const ok = !isNaN(d);
    $("#updatedAt").textContent = "Marcadores al " +
      (ok ? d.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : updatedAt);
  }
}

// ----- Resultados en vivo (openfootball) -----
async function fetchLive() {
  const btn = $("#refreshBtn"); btn.classList.add("spin");
  try {
    const res = await fetch(LIVE_URL + "?_=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    let n = 0;
    for (const m of (data.matches || [])) {
      if (!String(m.group || "").startsWith("Group")) continue;
      const ft = m.score && m.score.ft;
      if (!ft) continue;
      const fx = pairIndex[[m.team1, m.team2].sort().join("|")];
      if (!fx) continue;
      const [h, a] = m.team1 === fx.homeEN ? [ft[0], ft[1]] : [ft[1], ft[0]];
      results[fx.id] = { h, a, status: "FT" };
      n++;
    }
    updatedAt = new Date().toISOString();
    render();
    toast(n ? "Marcadores actualizados ✓" : "Sin partidos nuevos");
  } catch (e) {
    toast("No se pudo actualizar (sin conexión)");
  } finally {
    btn.classList.remove("spin");
  }
}

let toastTimer;
function toast(msg) {
  let t = $("#toast");
  if (!t) { t = el("div", "toast"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

// ----- Compartir -----
async function share() {
  const data = { title: "Quiniela Rico · Mundial 2026", text: "Mira la clasificación de la quiniela familiar 🏆", url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(location.href); toast("Enlace copiado ✓"); }
  } catch (e) { /* cancelado */ }
}

// ----- Init -----
document.querySelectorAll(".tab").forEach(t =>
  t.addEventListener("click", () => switchView(t.dataset.view)));
$("#refreshBtn").addEventListener("click", fetchLive);
$("#shareBtn").addEventListener("click", share);

const leader = standings()[0];            // abrir la hoja en el líder actual
if (leader) selParticipant = leader.i;
render();
fetchLive();                              // traer lo más reciente al abrir
setInterval(fetchLive, 90 * 1000);        // y refrescar cada 90 s
