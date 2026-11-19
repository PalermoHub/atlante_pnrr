/* La lente (prototipo): sposta la mappa, il cerchio al centro somma i comuni che ci stanno sotto.
   Anello alto = missioni M1–M7, anello basso = stadi di avanzamento; ogni barra è la quota sul totale sotto la lente,
   il trattino è la stessa quota per l'Italia intera. Clic su una barra: la nasconde e ricalcola l'altra metà.
   Dati: cubo_c.json (comune × missione × natura × stadio), comuni.json (popolazione), bbox.json (centro del riquadro
   come posizione del comune), cubo_i.json (Italia). Nessun dato nuovo, nessun calcolo lato server. */
(() => {
const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const nf = new Intl.NumberFormat('it-IT');
const pc = (a, b, d = 0) => (b > 0 ? (100 * a / b).toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d }) + ' %' : '–');
const eur = (v) => {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toLocaleString('it-IT', { maximumFractionDigits: 2 }) + ' mld €';
  if (a >= 1e6) return (v / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' mln €';
  if (a >= 1e3) return (v / 1e3).toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' mila €';
  return nf.format(Math.round(v)) + ' €';
};
const MIS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
const NOMI_MIS = { M1: 'Digitalizzazione, innovazione, cultura', M2: 'Rivoluzione verde e transizione ecologica', M3: 'Infrastrutture per la mobilità', M4: 'Istruzione e ricerca', M5: 'Inclusione e coesione', M6: 'Salute', M7: 'REPowerEU' };
const COL_MIS = { M1: '#5BBBEB', M2: '#92C151', M3: '#EA425B', M4: '#F49E4B', M5: '#B671DC', M6: '#FACB49', M7: '#8D6E63' };
const STADI = [['Da attivare', 'Da attivare'], ['In corso, senza gara né lavori', 'In corso'], ['Gara aggiudicata', 'Gara'], ['Lavori o attività avviati', 'Lavori'], ['Concluso (stato ufficiale)', 'Concluso']];
const NM = MIS.length, NS_ = STADI.length, NC = NM * NS_;
const GAP = 6, LMAX_BASE = 78;

const S = { misura: 'fin', R: matchMedia('(max-width: 640px)').matches ? 70 : 100, hidM: new Set(), hidS: new Set(), ids: [], lon: null, lat: null, F: null, N: null, P: null, pop: null, it: null, dentro: [], map: null, rid: 0 };

/* ---------- dati ---------- */
const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
function matrici(celle, F, N, P, base) {
  for (let o = 0; o < celle.length; o += 9) {
    const st = celle[o + 2]; if (st > 4) continue; /* stadio 5 = misura nazionale senza progetto: mai nei comuni */
    const k = base + celle[o] * NS_ + st;
    N[k] += celle[o + 4]; F[k] += celle[o + 5]; P[k] += celle[o + 7];
  }
}
async function carica() {
  const [com, bbox, cc, ci, it] = await Promise.all(['comuni', 'bbox', 'cubo_c', 'cubo_i', 'italia'].map((n) => get(`data/${n}.json`)));
  const ids = Object.keys(cc).filter((id) => bbox.c[id] && com[id]); const n = ids.length;
  S.ids = ids; S.lon = new Float64Array(n); S.lat = new Float64Array(n); S.pop = new Float64Array(n);
  S.F = new Float64Array(n * NC); S.N = new Float64Array(n * NC); S.P = new Float64Array(n * NC);
  ids.forEach((id, i) => {
    const b = bbox.c[id]; S.lon[i] = (b[0] + b[2]) / 2; S.lat[i] = (b[1] + b[3]) / 2; S.pop[i] = com[id].pop || 0;
    matrici(cc[id], S.F, S.N, S.P, i * NC);
  });
  const F = new Float64Array(NC), N = new Float64Array(NC), P = new Float64Array(NC);
  matrici(ci.IT, F, N, P, 0); S.it = { F, N, P };
  S.quotaComuni = it.liv[0] / (it.liv[0] + it.liv[1] + it.liv[2] + it.liv[3]);
}

/* ---------- calcolo sotto la lente ---------- */
const val = (src, base, k) => (S.misura === 'fin' ? src.F[base + k] : src.N[base + k]);
function somma(dentro) {
  const T = new Float64Array(NC), P = new Float64Array(NC), N = new Float64Array(NC), F = new Float64Array(NC);
  let pop = 0;
  for (const i of dentro) {
    const b = i * NC; pop += S.pop[i];
    for (let k = 0; k < NC; k++) { T[k] += val(S, b, k); P[k] += S.P[b + k]; N[k] += S.N[b + k]; F[k] += S.F[b + k]; }
  }
  return { T, P, N, F, pop };
}
/* quote: per missione (sugli stadi non nascosti) e per stadio (sulle missioni non nascoste) */
function quote(T) {
  const m = new Float64Array(NM), s = new Float64Array(NS_);
  for (let a = 0; a < NM; a++) for (let b = 0; b < NS_; b++) {
    const v = T[a * NS_ + b];
    if (!S.hidS.has(b)) m[a] += v;
    if (!S.hidM.has(MIS[a])) s[b] += v;
  }
  const tm = m.reduce((x, y, a) => x + (S.hidM.has(MIS[a]) ? 0 : y), 0), ts = s.reduce((x, y, b) => x + (S.hidS.has(b) ? 0 : y), 0);
  return { m, s, tm, ts };
}
function totaleIt() { const T = new Float64Array(NC); for (let k = 0; k < NC; k++) T[k] = S.misura === 'fin' ? S.it.F[k] : S.it.N[k]; return T; }

/* ---------- disegno ---------- */
const el = (n, a = {}, t) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; };
function barre(g, cx, cy, R, L, defs) {
  /* defs: [{ ang, v, vit, col, cod, sub, spento, on, titolo }] */
  for (const d of defs) {
    const len = d.v > 0 ? Math.max(3, d.v * L) : 0, lit = d.vit * L;
    const a = (d.ang * Math.PI) / 180, ux = Math.sin(a), uy = -Math.cos(a);
    const gr = el('g', { class: 'barra' + (d.spento ? ' spento' : ''), role: 'button', tabindex: '0', 'aria-pressed': String(!d.spento), 'aria-label': d.titolo });
    const rot = el('g', { transform: `translate(${cx} ${cy}) rotate(${d.ang})` });
    rot.append(el('rect', { x: -9, y: -(R + GAP + 74 + 12), width: 18, height: 74 + 12 + 2 + 0.01 + len, fill: 'transparent' }));
    if (len) rot.append(el('rect', { class: 'bar', x: -7, y: -(R + GAP + len), width: 14, height: len, rx: 2, fill: d.col }));
    rot.append(el('rect', { x: -7, y: -(R + GAP), width: 14, height: 1, fill: 'var(--line)' }));
    if (d.vit > 0) rot.append(el('line', { x1: -11, x2: 11, y1: -(R + GAP + lit), y2: -(R + GAP + lit), stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-linecap': 'round' }));
    gr.append(rot);
    const tx = cx + ux * (R + GAP + Math.max(len, lit) + 13), ty = cy + uy * (R + GAP + Math.max(len, lit) + 13);
    const t = el('text', { x: tx, y: ty - 1, 'text-anchor': 'middle', class: 'cod' }, d.cod); const t2 = el('text', { x: tx, y: ty + 11, 'text-anchor': 'middle', class: 'piccolo' }, d.sub);
    gr.append(t, t2);
    const tit = el('title', {}, d.titolo); gr.append(tit);
    const fn = () => d.on(); gr.addEventListener('click', fn); gr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    g.append(gr);
  }
}
function disegna() {
  const svg = $('#lente'), W = svg.clientWidth, H = svg.clientHeight, cx = W / 2, cy = H / 2, R = S.R;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.replaceChildren();
  const dentro = S.dentro, ag = somma(dentro), q = quote(ag.T), qi = quote(totaleIt());
  const space = Math.max(30, Math.min(LMAX_BASE, cy - R - GAP - 30, cx - 10));
  const nmax = (arr, tot) => arr.map((v) => (tot > 0 ? v / tot : 0));
  const sm = nmax(q.m, q.tm), si = nmax(qi.m, qi.tm), ss = nmax(q.s, q.ts), sit = nmax(qi.s, qi.ts);
  const Lm = space / Math.max(0.05, ...sm, ...si), Ls = space / Math.max(0.05, ...ss, ...sit);
  const g = el('g'); svg.append(g);
  g.append(el('circle', { cx, cy, r: R, fill: 'var(--acc)', 'fill-opacity': 0.07, stroke: 'var(--acc)', 'stroke-width': 2.5 }));
  const um = S.misura === 'fin' ? (v) => eur(v) : (v) => nf.format(v) + ' progetti';
  const defM = MIS.map((m, a) => ({ ang: -72 + a * 24, v: sm[a], vit: si[a], col: COL_MIS[m], cod: m, sub: pc(q.m[a], q.tm), spento: S.hidM.has(m),
    titolo: `${m} ${NOMI_MIS[m]}: ${pc(q.m[a], q.tm, 1)} sotto la lente (Italia ${pc(qi.m[a], qi.tm, 1)}), ${um(q.m[a])}. ${S.hidM.has(m) ? 'Nascosta: clic per mostrarla' : 'Clic per nasconderla'}`,
    on: () => { S.hidM.has(m) ? S.hidM.delete(m) : S.hidM.add(m); disegna(); testo(); } }));
  const defS = STADI.map(([lungo, corto], b) => ({ ang: 120 + b * 30, v: ss[b], vit: sit[b], col: `var(--s${b + 2})`, cod: corto, sub: pc(q.s[b], q.ts), spento: S.hidS.has(b),
    titolo: `${lungo}: ${pc(q.s[b], q.ts, 1)} sotto la lente (Italia ${pc(qi.s[b], qi.ts, 1)}), ${um(q.s[b])}. ${S.hidS.has(b) ? 'Nascosto: clic per mostrarlo' : 'Clic per nasconderlo'}`,
    on: () => { S.hidS.has(b) ? S.hidS.delete(b) : S.hidS.add(b); disegna(); testo(); } }));
  barre(g, cx, cy, R, Lm, defM); barre(g, cx, cy, R, Ls, defS);
  /* centro: totali sotto la lente (tutte le missioni e tutti gli stadi, senza i nascosti) */
  let n = 0, fin = 0, pag = 0;
  for (let a = 0; a < NM; a++) for (let b = 0; b < NS_; b++) { if (S.hidM.has(MIS[a]) || S.hidS.has(b)) continue; const k = a * NS_ + b; n += ag.N[k]; fin += ag.F[k]; pag += ag.P[k]; }
  const grande = R >= 70;
  g.append(el('text', { x: cx, y: cy - (grande ? 6 : 2), 'text-anchor': 'middle', class: 'centro-n', style: grande ? '' : 'font-size:16px' }, S.misura === 'fin' ? eur(fin) : nf.format(n)));
  g.append(el('text', { x: cx, y: cy + 12, 'text-anchor': 'middle', class: 'centro-s' }, S.misura === 'fin' ? `${nf.format(n)} progetti` : eur(fin)));
  if (grande) g.append(el('text', { x: cx, y: cy + 27, 'text-anchor': 'middle', class: 'centro-s' }, `${nf.format(dentro.length)} comuni · ${pc(pag, fin)} pagato`));
  /* maniglia per ridimensionare */
  const man = el('g', { class: 'manico', role: 'slider', tabindex: '0', 'aria-label': 'Raggio della lente', 'aria-valuemin': 50, 'aria-valuemax': 220, 'aria-valuenow': Math.round(R) });
  man.append(el('circle', { cx: cx + R, cy, r: 13, fill: 'var(--surface)', stroke: 'var(--acc)', 'stroke-width': 2.5 }));
  man.append(el('path', { d: `M${cx + R - 5} ${cy - 3.5} l-3 3.5 l3 3.5 M${cx + R + 5} ${cy - 3.5} l3 3.5 l-3 3.5`, fill: 'none', stroke: 'var(--acc)', 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
  man.addEventListener('pointerdown', (e) => {
    e.preventDefault(); man.setPointerCapture(e.pointerId);
    const mv = (ev) => { const r = svg.getBoundingClientRect(); setR(Math.hypot(ev.clientX - r.left - r.width / 2, ev.clientY - r.top - r.height / 2)); };
    const su = () => { man.removeEventListener('pointermove', mv); man.removeEventListener('pointerup', su); man.removeEventListener('pointercancel', su); };
    man.addEventListener('pointermove', mv); man.addEventListener('pointerup', su); man.addEventListener('pointercancel', su);
  });
  man.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setR(S.R + 10); } if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setR(S.R - 10); } });
  g.append(man);
  S.agg = { ag, q, qi };
}
function testo() {
  const { ag, q, qi } = S.agg || {}; if (!q) return;
  const um = (v) => (S.misura === 'fin' ? eur(v) : nf.format(v) + ' progetti');
  const riga = (col, nome, v, vi, tot, toti) => `<li><i style="background:${col}"></i><span><strong>${nome}</strong> ${pc(v, tot, 1)} · ${um(v)} <small>(Italia ${pc(vi, toti, 1)})</small></span></li>`;
  const lm = MIS.map((m, a) => riga(COL_MIS[m], m + ' ' + NOMI_MIS[m], q.m[a], qi.m[a], q.tm, qi.tm)).join('');
  const ls = STADI.map(([lungo], b) => riga(`var(--s${b + 2})`, lungo, q.s[b], qi.s[b], q.ts, qi.ts)).join('');
  const nasc = S.hidM.size + S.hidS.size;
  $('#lente-testo').innerHTML = `<p><strong>${nf.format(S.dentro.length)} comuni</strong> sotto la lente${ag.pop ? `, ${nf.format(ag.pop)} abitanti` : ''}. Barra = quota sul totale sotto la lente; trattino nero = stessa quota per l'Italia. ${nasc ? 'Hai nascosto ' + nasc + (nasc === 1 ? ' voce. ' : ' voci. ') : ''}Clic su una barra per nasconderla.</p><ul>${lm}</ul><ul>${ls}</ul><p><small>Qui ci sono solo i fondi localizzati su un comune (circa ${Math.round(100 * S.quotaComuni)} % dell'importo PNRR): il resto è assegnato a province, regioni o all'Italia intera e non compare sotto la lente. La posizione di un comune è il centro del suo riquadro.</small></p>`;
}

/* ---------- mappa ---------- */
function ricalcola() {
  S.rid = 0; const m = S.map, svg = $('#lente'), W = svg.clientWidth, H = svg.clientHeight, cx = W / 2, cy = H / 2, R2 = S.R * S.R, dentro = [];
  for (let i = 0; i < S.ids.length; i++) { const p = m.project([S.lon[i], S.lat[i]]); const dx = p.x - cx, dy = p.y - cy; if (dx * dx + dy * dy <= R2) dentro.push(i); }
  S.dentro = dentro; disegna(); testo();
  if (m.getLayer('pt-in')) m.setFilter('pt-in', ['in', ['get', 'id'], ['literal', dentro.map((i) => S.ids[i])]]);
  const nota = $('#nota-map'); nota.hidden = dentro.length > 0; if (!dentro.length) nota.textContent = 'Nessun comune sotto la lente: sposta la mappa o allarga il cerchio.';
}
const pianifica = () => { if (!S.rid) S.rid = requestAnimationFrame(ricalcola); };
function setR(r) { const w = $('#lente'); S.R = Math.max(50, Math.min(220, r, Math.min(w.clientWidth, w.clientHeight) / 2 - 30)); $('#raggio').value = Math.round(S.R); pianifica(); }
const STILI = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
const tono = () => (document.documentElement.getAttribute('data-tone') === 'dark' ? 'dark' : 'light');
function livelli() {
  const m = S.map; if (m.getSource('pt')) return;
  const prima = (m.getStyle().layers.find((l) => l.type === 'symbol') || {}).id;
  m.addSource('pt', { type: 'geojson', data: { type: 'FeatureCollection', features: S.ids.map((id, i) => ({ type: 'Feature', properties: { id }, geometry: { type: 'Point', coordinates: [S.lon[i], S.lat[i]] } })) } });
  const st = getComputedStyle(document.documentElement);
  m.addLayer({ id: 'pt-out', type: 'circle', source: 'pt', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 1.2, 9, 3], 'circle-color': st.getPropertyValue('--ink3').trim() || '#777', 'circle-opacity': 0.5 } }, prima);
  m.addLayer({ id: 'pt-in', type: 'circle', source: 'pt', filter: ['in', ['get', 'id'], ['literal', []]], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.2, 9, 5], 'circle-color': st.getPropertyValue('--acc').trim() || '#1f5fb4', 'circle-opacity': 0.9, 'circle-stroke-width': 0.6, 'circle-stroke-color': '#fff' } }, prima);
}
function avvia() {
  const m = S.map = new maplibregl.Map({ container: 'map', style: STILI[tono()], bounds: [[6.6, 35.5], [18.6, 47.1]], fitBoundsOptions: { padding: 10 }, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxPitch: 0 });
  m.touchZoomRotate.disableRotation(); m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  m.on('style.load', () => { livelli(); ricalcola(); });
  m.on('move', pianifica); m.on('resize', () => { setR(S.R); pianifica(); });
  document.addEventListener('tema-cambia', () => { if (tono() !== S.tono) { S.tono = tono(); m.setStyle(STILI[S.tono], { diff: false }); } });
  S.tono = tono(); $('#raggio').value = S.R;
  $('#raggio').addEventListener('input', (e) => setR(+e.target.value));
  document.querySelectorAll('[data-misura]').forEach((b) => b.addEventListener('click', () => {
    S.misura = b.dataset.misura; document.querySelectorAll('[data-misura]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); pianifica();
  }));
  $('#azzera').addEventListener('click', () => { S.hidM.clear(); S.hidS.clear(); setR(matchMedia('(max-width: 640px)').matches ? 70 : 100); m.fitBounds([[6.6, 35.5], [18.6, 47.1]], { padding: 10, duration: 500 }); pianifica(); });
}
carica().then(avvia).catch((e) => { $('#lente-testo').textContent = 'Errore nel caricamento dei dati: ' + e.message; console.error(e); });
})();
