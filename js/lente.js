/* La lente (prototipo 2). Meccanismo: la mappa seleziona, la lente confronta il vicinato su una scala comune.
   - Poligoni dei comuni colorati per € PNRR per abitante (scala dell'Atlante).
   - Sotto il cerchio: i comuni più vicini al centro; per ogni missione una colonna di barre, una per comune:
     altezza = € per abitante (scala a radice quadrata, uguale per tutte), larghezza = numero di progetti.
     Il comune al centro è nero; il trattino è la media dei comuni italiani per quella missione.
   - Anello in basso: stadio di avanzamento, sceglie quale parte dei fondi si conta.
   Dati già nell'app: cubo_c (comune × missione × natura × stadio), comuni (popolazione), bbox (centro del riquadro). */
(() => {
const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const nf = new Intl.NumberFormat('it-IT');
const eur = (v) => `${Math.round(v).toLocaleString('it-IT')} €`;
const MIS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
const NOMI_MIS = { M1: 'Digitalizzazione, innovazione, cultura', M2: 'Rivoluzione verde e transizione ecologica', M3: 'Infrastrutture per la mobilità', M4: 'Istruzione e ricerca', M5: 'Inclusione e coesione', M6: 'Salute', M7: 'REPowerEU' };
const COL_MIS = { M1: '#5BBBEB', M2: '#92C151', M3: '#EA425B', M4: '#F49E4B', M5: '#B671DC', M6: '#FACB49', M7: '#8D6E63' };
const STADI = [['Da attivare', 'Da attivare'], ['In corso, senza gara né lavori', 'In corso'], ['Gara aggiudicata', 'Gara'], ['Lavori o attività avviati', 'Lavori'], ['Concluso (stato ufficiale)', 'Concluso']];
const NM = MIS.length, NSTA = STADI.length, NC = NM * NSTA;
const CAP = 1500, LIVELLI = [100, 300, 600, 1000], K = 8;
const VISTA = { centro: [13.4, 38.0], zoom: 8.6 };
const piccolo = () => matchMedia('(max-width: 640px)').matches;

const S = { stadio: null, hidM: new Set(), R: piccolo() ? 112 : 150, ids: [], nome: [], lon: null, lat: null, pop: null, F: null, N: null, P: null, media: null, dentro: [], d2: new Map(), centro: null, map: null, rid: 0, quotaComuni: 0, idx: new Map() };

/* ---------- dati ---------- */
const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
async function carica() {
  const [com, bbox, cc, it] = await Promise.all(['comuni', 'bbox', 'cubo_c', 'italia'].map((n) => get(`data/${n}.json`)));
  const ids = Object.keys(cc).filter((id) => bbox.c[id] && com[id] && com[id].pop > 0), n = ids.length;
  S.ids = ids; S.nome = ids.map((id) => com[id].nm); S.lon = new Float64Array(n); S.lat = new Float64Array(n); S.pop = new Float64Array(n);
  S.F = new Float64Array(n * NC); S.N = new Float64Array(n * NC); S.P = new Float64Array(n * NC);
  ids.forEach((id, i) => {
    S.idx.set(id, i); const b = bbox.c[id]; S.lon[i] = (b[0] + b[2]) / 2; S.lat[i] = (b[1] + b[3]) / 2; S.pop[i] = com[id].pop;
    const c = cc[id];
    for (let o = 0; o < c.length; o += 9) { const st = c[o + 2]; if (st > 4) continue; const k = i * NC + c[o] * NSTA + st; S.N[k] += c[o + 4]; S.F[k] += c[o + 5]; S.P[k] += c[o + 7]; }
  });
  S.quotaComuni = it.liv[0] / (it.liv[0] + it.liv[1] + it.liv[2] + it.liv[3]);
  ricalcolaMedia();
}
/* € di un comune: missione m (o tutte se m = -1), stadio scelto (o tutti) */
function fin(i, m) { let t = 0; const a0 = m < 0 ? 0 : m, a1 = m < 0 ? NM : m + 1; for (let a = a0; a < a1; a++) for (let s = 0; s < NSTA; s++) if (S.stadio == null || S.stadio === s) t += S.F[i * NC + a * NSTA + s]; return t; }
function nprog(i, m) { let t = 0; for (let s = 0; s < NSTA; s++) if (S.stadio == null || S.stadio === s) t += S.N[i * NC + m * NSTA + s]; return t; }
function ricalcolaMedia() {
  /* media dei comuni italiani: € totali / abitanti, per missione */
  const f = new Float64Array(NM); let pop = 0;
  for (let i = 0; i < S.ids.length; i++) { pop += S.pop[i]; for (let m = 0; m < NM; m++) f[m] += fin(i, m); }
  S.media = Array.from(f, (x) => x / pop);
}

/* ---------- colore dei poligoni ---------- */
function classi() {
  const v = S.ids.map((_, i) => fin(i, -1) / S.pop[i]).filter((x) => x > 0).sort((a, b) => a - b), br = [];
  for (let k = 1; k < 7; k++) br.push(v[Math.floor(v.length * k / 7)]);
  const st = getComputedStyle(document.documentElement), col = [1, 2, 3, 4, 5, 6, 7].map((k) => st.getPropertyValue('--s' + k).trim());
  const gruppi = col.map(() => []);
  S.ids.forEach((id, i) => { const x = fin(i, -1) / S.pop[i]; let c = 0; while (c < 6 && x > br[c]) c++; if (x > 0) gruppi[c].push(id); });
  const e = ['match', ['get', 'pro_com_t']]; gruppi.forEach((g, c) => { if (g.length) e.push(g, col[c]); }); e.push('rgba(0,0,0,0)');
  return e;
}
function colora() { if (S.map && S.map.getLayer('com')) S.map.setPaintProperty('com', 'fill-color', classi()); }

/* ---------- lente ---------- */
const el = (n, a = {}, t) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; };
const alt = (v, H) => Math.sqrt(Math.min(v, CAP) / CAP) * H;
function arco(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  return `M${x0} ${y0} A${r1} ${r1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 0 0 ${x3} ${y3} Z`;
}
const tasto = (g, fn) => { g.addEventListener('click', fn); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); };
function disegna() {
  /* la lente è solo il cerchio di selezione: i grafici stanno nel pannello accanto alla mappa */
  const svg = $('#lente'), W = svg.clientWidth, H = svg.clientHeight, cx = W / 2, cy = H / 2, R = S.R;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.replaceChildren();
  const g = el('g'); svg.append(g);
  g.append(el('circle', { cx, cy, r: R, fill: 'var(--acc)', 'fill-opacity': 0.05, stroke: 'var(--acc)', 'stroke-width': 2.5 }));
  g.append(el('circle', { cx, cy, r: 4, fill: 'var(--ink)', stroke: 'var(--surface)', 'stroke-width': 1.5 }));
  manico(g, cx, cy, R, svg);
  grafico();
}
function grafico() {
  const box = $('#grafico'), centro = S.centro;
  const sel = STADI.map(([lungo, corto], s) => `<button type="button" class="stad${S.stadio === s ? ' on' : ''}" data-s="${s}" aria-pressed="${S.stadio === s}" title="${lungo}">${corto}</button>`).join('');
  if (centro == null) { box.innerHTML = '<p class="vuoto">Nessun comune sotto la lente: sposta la mappa o allarga il cerchio.</p>'; return; }
  const vic = S.dentro.slice().sort((a, b) => S.d2.get(a) - S.d2.get(b)).slice(0, K);
  let n = 0, f = 0, p = 0;
  for (let m = 0; m < NM; m++) { if (S.hidM.has(MIS[m])) continue; for (let s = 0; s < NSTA; s++) if (S.stadio == null || S.stadio === s) { const k = centro * NC + m * NSTA + s; n += S.N[k]; f += S.F[k]; p += S.P[k]; } }
  const Wt = 340, Hm = 170, y0 = 196, x00 = 14, gap = 8;
  const grp = MIS.map((m, a) => ({ m, a, barre: vic.map((i) => ({ i, v: fin(i, a) / S.pop[i], n: nprog(i, a) })).filter((b) => b.n > 0 && b.v > 0).sort((p1, q) => p1.v - q.v) })).filter((x) => x.barre.length && !S.hidM.has(x.m));
  const nb = grp.reduce((t, x) => t + x.barre.length, 0), tot = Wt - gap * Math.max(0, grp.length - 1);
  const somma = grp.reduce((t, x) => t + x.barre.reduce((u, b) => u + Math.sqrt(b.n), 0), 0) || 1, sc = Math.max(0.1, (tot - 2 * nb) / somma * 0.85);
  const parti = [];
  LIVELLI.forEach((lv) => { const y = y0 - alt(lv, Hm); parti.push(`<line x1="${x00}" x2="${x00 + Wt}" y1="${y}" y2="${y}" class="liv"/><text x="${x00}" y="${y - 3}" class="piccolo">${eur(lv)}</text>`); });
  parti.push(`<line x1="${x00}" x2="${x00 + Wt}" y1="${y0}" y2="${y0}" class="base"/>`);
  let x = x00;
  grp.forEach((G) => {
    const x0 = x;
    G.barre.forEach((b) => {
      const bw = Math.min(24, Math.max(3, Math.sqrt(b.n) * sc)), hh = Math.max(1.5, alt(b.v, Hm)), c = b.i === centro, over = b.v > CAP;
      parti.push(`<g class="bar"><rect x="${x}" y="${y0 - hh}" width="${bw}" height="${hh}" fill="${c ? 'var(--ink)' : COL_MIS[G.m]}"/>${over ? `<rect x="${x}" y="${y0 - hh}" width="${bw}" height="7" fill="url(#righe)"/>` : ''}<title>${S.nome[b.i]} · ${G.m}: ${eur(b.v)} per abitante, ${nf.format(b.n)} progetti${over ? ' (barra tagliata)' : ''}</title></g>`);
      x += bw + 2;
    });
    const xe = x - 2, ym = y0 - alt(S.media[G.a], Hm), wf = Math.max(24, xe - x0);
    parti.push(`<line x1="${x0 - 1}" x2="${xe + 1}" y1="${ym}" y2="${ym}" class="media"/><g class="bandiera" role="button" tabindex="0" data-m="${G.m}" aria-pressed="true" aria-label="${G.m} ${NOMI_MIS[G.m]}: clic per nasconderla"><rect x="${x0}" y="${y0 + 4}" width="${wf}" height="18" rx="3" fill="${COL_MIS[G.m]}"/><text x="${x0 + wf / 2}" y="${y0 + 17}" text-anchor="middle" class="bnd">${G.m}</text><title>${G.m} ${NOMI_MIS[G.m]} · clic per nasconderla</title></g>`);
    x = Math.max(xe, x0 + wf) + gap;
  });
  box.innerHTML = `<div class="comune"><strong>${S.nome[centro]}</strong><span>${eur(f / S.pop[centro])} per abitante · ${nf.format(n)} progetti · ${f > 0 ? Math.round(100 * p / f) : 0} % pagato</span></div>
  <div class="stadi" role="group" aria-label="Stadio di avanzamento">${sel}</div>
  <svg viewBox="0 0 ${Math.max(368, x - gap + x00)} 232" class="sky" role="img" aria-label="Euro per abitante per missione nei comuni vicini al centro della lente"><defs><pattern id="righe" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--surface)"/><rect width="2.5" height="5" fill="var(--ink)"/></pattern></defs>${parti.join('')}</svg>
  <p class="legg">${nf.format(S.dentro.length)} comuni sotto la lente; barre dei ${Math.min(K, S.dentro.length)} più vicini al centro. Altezza = € PNRR per abitante (scala a radice quadrata); larghezza = progetti; barra nera = ${S.nome[centro]}; trattino = media dei comuni italiani.</p>`;
  box.querySelectorAll('.stad').forEach((b) => b.addEventListener('click', () => { const s = +b.dataset.s; S.stadio = S.stadio === s ? null : s; ricalcolaMedia(); colora(); grafico(); testo(); }));
  box.querySelectorAll('.bandiera').forEach((b) => tasto(b, () => { S.hidM.add(b.dataset.m); grafico(); testo(); }));
}
function manico(g, cx, cy, R, svg) {
  const man = el('g', { class: 'manico', role: 'slider', tabindex: '0', 'aria-label': 'Raggio della lente', 'aria-valuemin': 80, 'aria-valuemax': 260, 'aria-valuenow': Math.round(R) });
  man.append(el('circle', { cx: cx + R, cy, r: 13, fill: 'var(--surface)', stroke: 'var(--acc)', 'stroke-width': 2.5 }), el('path', { d: `M${cx + R - 5} ${cy - 3.5} l-3 3.5 l3 3.5 M${cx + R + 5} ${cy - 3.5} l3 3.5 l-3 3.5`, fill: 'none', stroke: 'var(--acc)', 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
  man.addEventListener('pointerdown', (e) => {
    e.preventDefault(); man.setPointerCapture(e.pointerId);
    const mv = (ev) => { const r = svg.getBoundingClientRect(); setR(Math.hypot(ev.clientX - r.left - r.width / 2, ev.clientY - r.top - r.height / 2)); };
    const su = () => { man.removeEventListener('pointermove', mv); man.removeEventListener('pointerup', su); man.removeEventListener('pointercancel', su); };
    man.addEventListener('pointermove', mv); man.addEventListener('pointerup', su); man.addEventListener('pointercancel', su);
  });
  man.addEventListener('keydown', (e) => { if (/Arrow(Right|Up)/.test(e.key)) { e.preventDefault(); setR(S.R + 10); } if (/Arrow(Left|Down)/.test(e.key)) { e.preventDefault(); setR(S.R - 10); } });
  g.append(man);
}
function testo() {
  const nasc = [...S.hidM];
  const chips = MIS.map((m) => `<button type="button" class="chip-m${S.hidM.has(m) ? ' off' : ''}" data-m="${m}" aria-pressed="${!S.hidM.has(m)}" title="${NOMI_MIS[m]}"><i style="background:${COL_MIS[m]}"></i>${m}<span>${NOMI_MIS[m]}</span></button>`).join('');
  $('#lente-testo').innerHTML = `<div class="chips" role="group" aria-label="Missioni">${chips}</div><p><small>Colore dei comuni: € PNRR per abitante, sette classi con lo stesso numero di comuni (tutte le missioni; stadio scelto). Qui ci sono solo i fondi localizzati su un comune (circa ${Math.round(100 * S.quotaComuni)} % dell'importo PNRR): il resto è di province, regioni o nazionale. La posizione di un comune è il centro del suo riquadro.${nasc.length ? ' Missioni nascoste: ' + nasc.join(', ') + '.' : ''}</small></p>`;
  $('#lente-testo').querySelectorAll('.chip-m').forEach((b) => b.addEventListener('click', () => { const m = b.dataset.m; S.hidM.has(m) ? S.hidM.delete(m) : S.hidM.add(m); grafico(); testo(); }));
}

/* ---------- mappa ---------- */
function ricalcola() {
  S.rid = 0; const m = S.map, svg = $('#lente'), cx = svg.clientWidth / 2, cy = svg.clientHeight / 2, R2 = S.R * S.R, dentro = [], d2 = new Map();
  for (let i = 0; i < S.ids.length; i++) { const p = m.project([S.lon[i], S.lat[i]]), dx = p.x - cx, dy = p.y - cy, d = dx * dx + dy * dy; if (d <= R2) { dentro.push(i); d2.set(i, d); } }
  S.dentro = dentro; S.d2 = d2; S.centro = dentro.length ? dentro.reduce((a, b) => (d2.get(b) < d2.get(a) ? b : a)) : null;
  disegna(); testo();
  if (m.getLayer('in')) { m.setFilter('in', ['in', ['get', 'pro_com_t'], ['literal', dentro.map((i) => S.ids[i])]]); m.setFilter('qui', ['==', ['get', 'pro_com_t'], S.centro != null ? S.ids[S.centro] : '__nessuno__']); }
}
const pianifica = () => { if (!S.rid) S.rid = requestAnimationFrame(ricalcola); };
function setR(r) { const w = $('#lente'); S.R = Math.max(80, Math.min(260, r, Math.min(w.clientWidth, w.clientHeight) / 2 - 48)); $('#raggio').value = Math.round(S.R); pianifica(); }
const STILI = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
const tono = () => (document.documentElement.getAttribute('data-tone') === 'dark' ? 'dark' : 'light');
function livelli() {
  const m = S.map; if (m.getSource('c')) return;
  const st = getComputedStyle(document.documentElement), prima = (m.getStyle().layers.find((l) => l.type === 'symbol') || {}).id;
  m.addSource('c', { type: 'vector', url: 'pmtiles://' + new URL('data/geo/comuni.pmtiles', location.href).href, attribution: 'Confini: ISTAT/ANNCSU · Dati: Italia Domani (CC-BY 4.0)' });
  m.addLayer({ id: 'com', type: 'fill', source: 'c', 'source-layer': 'comuni', paint: { 'fill-color': '#ccc', 'fill-opacity': 0.62 } }, prima);
  m.addLayer({ id: 'bordi', type: 'line', source: 'c', 'source-layer': 'comuni', minzoom: 6, paint: { 'line-color': st.getPropertyValue('--surface').trim(), 'line-width': 0.4 } }, prima);
  m.addLayer({ id: 'in', type: 'line', source: 'c', 'source-layer': 'comuni', filter: ['==', ['get', 'pro_com_t'], '__nessuno__'], paint: { 'line-color': st.getPropertyValue('--acc').trim(), 'line-width': 1.4 } }, prima);
  m.addLayer({ id: 'qui', type: 'line', source: 'c', 'source-layer': 'comuni', filter: ['==', ['get', 'pro_com_t'], '__nessuno__'], paint: { 'line-color': st.getPropertyValue('--ink').trim(), 'line-width': 3 } }, prima);
  colora();
}
function avvia() {
  maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile);
  const m = S.map = new maplibregl.Map({ container: 'map', style: STILI[tono()], center: VISTA.centro, zoom: VISTA.zoom, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxPitch: 0 });
  m.touchZoomRotate.disableRotation(); m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  m.on('style.load', () => { livelli(); ricalcola(); });
  m.on('move', pianifica); m.on('resize', () => { setR(S.R); pianifica(); });
  /* un clic su un comune lo porta sotto il centro della lente */
  m.on('click', 'com', (e) => { const i = S.idx.get(e.features[0].properties.pro_com_t); if (i != null) m.easeTo({ center: [S.lon[i], S.lat[i]], duration: 500 }); });
  m.on('mouseenter', 'com', () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', 'com', () => { m.getCanvas().style.cursor = ''; });
  S.tono = tono();
  document.addEventListener('tema-cambia', () => { if (tono() !== S.tono) { S.tono = tono(); m.setStyle(STILI[S.tono], { diff: false }); } else { colora(); } });
  $('#raggio').value = S.R; $('#raggio').addEventListener('input', (e) => setR(+e.target.value));
  $('#azzera').addEventListener('click', () => { S.hidM.clear(); S.stadio = null; ricalcolaMedia(); colora(); setR(piccolo() ? 112 : 150); m.easeTo({ center: VISTA.centro, zoom: VISTA.zoom, duration: 500 }); pianifica(); });
}
carica().then(avvia).catch((e) => { $('#lente-testo').textContent = 'Errore nel caricamento dei dati: ' + e.message; console.error(e); });
})();
