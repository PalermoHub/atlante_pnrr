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
const CAP = 1000, LIVELLI = [100, 250, 500, 1000];
const CORTI = { M1: 'Digitale e cultura', M2: 'Transizione verde', M3: 'Mobilità', M4: 'Istruzione', M5: 'Inclusione', M6: 'Salute', M7: 'REPowerEU' };
const N0 = () => (matchMedia('(max-width: 640px)').matches ? 30 : 48);
const VISTA = { centro: [13.4, 38.0], zoom: 8.6 };
const piccolo = () => matchMedia('(max-width: 640px)').matches;

const S = { stadio: null, hidM: new Set(), nv: N0(), sel: null, N: null, ids: [], nome: [], lon: null, lat: null, pop: null, F: null, N: null, P: null, media: null, dentro: [], d2: new Map(), centro: null, map: null, rid: 0, quotaComuni: 0, idx: new Map() };

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
  /* La lente è un anello con la mappa dentro: nome del comune in alto, selettore dello stadio in basso.
     Fuori dall'anello, a ventaglio, una raggiera per missione: un raggio per comune (i N più vicini al centro),
     lungo = € PNRR per abitante (scala a radice quadrata); cerchi tratteggiati = livelli; nastro = missione. */
  const svg = $('#lente'), W = svg.clientWidth, H = svg.clientHeight, cx = W / 2, cy = H / 2, centro = S.centro;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.replaceChildren();
  const avail = Math.min(W, H) / 2 - 34, Rin = Math.max(38, Math.min(84, avail * 0.27)), Rout = Rin + 24, rb = Rout + 5, Hm = Math.max(36, avail - Rout - 5), Rl = rb + Hm + 14;
  const P = (r, a) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const arc = (r, a0, a1) => { const [x0, y0] = P(r, a0), [x1, y1] = P(r, a1), cw = a1 > a0; return `M${x0} ${y0} A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${cw ? 1 : 0} ${x1} ${y1}`; };
  const defs = el('defs'), pat = el('pattern', { id: 'righe', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
  pat.append(el('rect', { width: 5, height: 5, fill: 'var(--surface)' }), el('rect', { width: 2.5, height: 5, fill: 'var(--ink)' })); defs.append(pat); svg.append(defs);
  const g = el('g'); svg.append(g);
  if (centro == null) { g.append(el('text', { x: cx, y: cy, 'text-anchor': 'middle', class: 'nome' }, 'Nessun comune qui')); return; }
  /* cerchi dei livelli */
  LIVELLI.forEach((lv) => {
    const r = rb + alt(lv, Hm); g.append(el('circle', { cx, cy, r, fill: 'none', class: 'liv' }));
    g.append(el('text', { x: cx, y: cy + r + 3.5, 'text-anchor': 'middle', class: 'livt' }, eur(lv)));
  });
  /* raggiere: 7 settori da 48°, con un varco in basso per le etichette dei livelli */
  const SET = 48, A0 = 192, step = Math.min(2.2, SET * 0.82 / S.nv), vic = S.vic;
  const calc = {}, callouts = [];
  MIS.forEach((m, a) => {
    const aS = A0 + a * SET, aM = aS + SET / 2, nasc = S.hidM.has(m);
    const barre = nasc ? [] : vic.map((i) => ({ i, v: fin(i, a) / S.pop[i], n: nprog(i, a) })).filter((b) => b.n > 0 && b.v > 0).sort((p, q) => p.v - q.v);
    const gb = el('g'); g.append(gb);
    barre.forEach((b, k) => {
      const ang = aM - barre.length * step / 2 + (k + 0.5) * step, len = Math.max(1.5, alt(b.v, Hm)), c = b.i === centro, over = b.v > CAP;
      const hs = step * 0.36, pts = [P(rb, ang - hs), P(rb + len, ang - hs), P(rb + len, ang + hs), P(rb, ang + hs)].map((p) => p.join(',')).join(' ');
      const ln = el('g', { class: 'rag' + (c ? ' qui' : '') });
      ln.append(el('polygon', { points: pts, fill: c ? 'var(--ink)' : COL_MIS[m], stroke: c ? 'var(--ink)' : COL_MIS[m], 'stroke-width': c ? 1.4 : 0, 'stroke-linejoin': 'round' }));
      if (over) { const q = [P(rb + len - 7, ang - hs), P(rb + len, ang - hs), P(rb + len, ang + hs), P(rb + len - 7, ang + hs)].map((p) => p.join(',')).join(' '); ln.append(el('polygon', { points: q, fill: 'url(#righe)' })); }
      ln.append(el('title', {}, `${S.nome[b.i]} · ${m}: ${eur(b.v)} per abitante, ${nf.format(b.n)} progetti${over ? ' (raggio tagliato)' : ''}`));
      const sel = () => { S.sel = { m: a, i: b.i }; callout(); };
      ln.addEventListener('mouseenter', sel); ln.addEventListener('click', sel);
      gb.append(ln);
      if (c) { calc[a] = { ang, len, v: b.v, n: b.n }; callouts.push(a); }
    });
    /* nastro della missione */
    const mid = (aM % 360 + 360) % 360, basso = mid > 90 && mid < 270, id = `nastro${a}`, lungo = Rl * SET * Math.PI / 180;
    const [p0, p1] = [aS + 2, aS + SET - 2];
    g.append(el('path', { d: arc(Rl, p0, p1), fill: 'none', stroke: nasc ? 'var(--line)' : COL_MIS[m], 'stroke-width': 17, class: 'nastro' + (nasc ? ' spento' : ''), role: 'button', tabindex: '0', 'aria-pressed': String(!nasc), 'aria-label': `${m} ${NOMI_MIS[m]}: clic per ${nasc ? 'mostrarla' : 'nasconderla'}` }));
    const tp = el('path', { id, d: basso ? arc(Rl, p1, p0) : arc(Rl, p0, p1), fill: 'none' }); defs.append(tp);
    const tx = el('text', { class: 'nastrot' + (m === 'M7' ? ' chiaro' : ''), dy: 4, 'text-anchor': 'middle' }); const tpa = el('textPath', { href: `#${id}`, startOffset: '50%' }, lungo > 190 ? `${m} · ${CORTI[m]}` : m); tx.append(tpa); g.append(tx);
    const nb = g.lastChild.previousSibling; const fn = () => { S.hidM.has(m) ? S.hidM.delete(m) : S.hidM.add(m); disegna(); testo(); };
    nb.addEventListener('click', fn); nb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    nb.append(el('title', {}, `${m} ${NOMI_MIS[m]} · clic per ${nasc ? 'mostrarla' : 'nasconderla'}`));
  });
  /* anello della lente */
  const ring = el('path', { d: `M${cx - Rout} ${cy} a${Rout} ${Rout} 0 1 0 ${2 * Rout} 0 a${Rout} ${Rout} 0 1 0 ${-2 * Rout} 0 M${cx - Rin} ${cy} a${Rin} ${Rin} 0 1 1 ${2 * Rin} 0 a${Rin} ${Rin} 0 1 1 ${-2 * Rin} 0`, 'fill-rule': 'evenodd', class: 'anello' });
  g.append(ring, el('circle', { cx, cy, r: Rin, fill: 'none', class: 'lente-bordo' }));
  g.append(el('path', { d: `M${cx - 6} ${cy} h12 M${cx} ${cy - 6} v12`, class: 'croce' }));
  const nome = el('path', { id: 'arco-nome', d: arc(Rin + 7.5, -62, 62), fill: 'none' }); defs.append(nome);
  const tn = el('text', { class: 'nome', 'text-anchor': 'middle' }); tn.append(el('textPath', { href: '#arco-nome', startOffset: '50%' }, S.nome[centro])); g.append(tn);
  /* selettore dello stadio (come l'anello degli anni nell'esempio) */
  const corto = Rin < 60 ? ['Da att.', 'In corso', 'Gara', 'Lavori', 'Fine'] : ['Da attivare', 'In corso', 'Gara', 'Lavori', 'Concluso'], span = Rin < 60 ? 104 : 88;
  STADI.forEach(([lungo], s) => {
    const am = 180 + span * (s - 2) / 2.5 * -1 * (1 / 2) * 2 / 2, on = S.stadio === s;
    const c0 = 180 - (s - 2) * (span * 2 / 5), sa = c0 + span / 5 - 0.5, sb = c0 - span / 5 + 0.5, idn = `st${s}`;
    defs.append(el('path', { id: idn, d: arc(Rout - 6.5, sa, sb), fill: 'none' }));
    const gs = el('g', { class: 'segm' + (on ? ' on' : ''), role: 'button', tabindex: '0', 'aria-pressed': String(on), 'aria-label': `Stadio: ${lungo}` });
    gs.append(el('path', { d: arc(Rout - 12, sa, sb), fill: 'none', stroke: 'transparent', 'stroke-width': 24 }));
    const t = el('text', { class: 'stadio' + (on ? ' on' : ''), 'text-anchor': 'middle' }); t.append(el('textPath', { href: `#${idn}`, startOffset: '50%' }, corto[s])); gs.append(t, el('title', {}, `${lungo} · clic per ${on ? 'tornare a tutti gli stadi' : 'contare solo questo stadio'}`));
    const fn = () => { S.stadio = on ? null : s; ricalcolaMedia(); colora(); disegna(); testo(); };
    gs.addEventListener('click', fn); gs.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    g.append(gs);
  });
  S.geo = { cx, cy, rb, Hm, P, W, H, calc };
  const gc = el('g', { id: 'call', class: 'call' }); svg.append(gc);
  if (!S.sel || S.sel.i !== centro && !vic.includes(S.sel.i)) S.sel = callouts.length ? { m: callouts.reduce((p, q) => (calc[q].v > calc[p].v ? q : p)), i: centro } : null;
  callout();
}
/* riquadro con i valori del raggio scelto (come il riquadro «median / sales» dell'esempio) */
function callout() {
  const gc = $('#call'), G = S.geo; if (!gc || !G || !S.sel) { if (gc) gc.replaceChildren(); return; }
  const { m, i } = S.sel, a = m; gc.replaceChildren();
  const v = fin(i, a) / S.pop[i], n = nprog(i, a); if (!(n > 0)) return;
  const barre = S.vic.map((j) => ({ j, v: fin(j, a) / S.pop[j], n: nprog(j, a) })).filter((b) => b.n > 0 && b.v > 0).sort((p, q) => p.v - q.v), k = barre.findIndex((b) => b.j === i); if (k < 0) return;
  const SET = 48, step = Math.min(2.2, SET * 0.82 / S.nv), aM = 192 + a * SET + SET / 2, ang = aM - barre.length * step / 2 + (k + 0.5) * step, len = Math.max(1.5, alt(v, G.Hm));
  const [tx, ty] = G.P(G.rb + len, ang), [bx, by] = G.P(G.rb + len + 34, ang), w = 142, h = 56;
  const x = Math.max(4, Math.min(G.W - w - 4, bx - w / 2)), y = Math.max(4, Math.min(G.H - h - 4, by - h / 2));
  gc.append(el('line', { x1: tx, y1: ty, x2: Math.max(x + 8, Math.min(x + w - 8, bx)), y2: Math.max(y, Math.min(y + h, by)), class: 'guida' }));
  gc.append(el('rect', { x, y, width: w, height: h, rx: 6, class: 'box', style: `stroke:${COL_MIS[MIS[a]]}` }));
  gc.append(el('text', { x: x + 9, y: y + 17, class: 'bx-n' }, S.nome[i]), el('text', { x: x + 9, y: y + 33, class: 'bx-k' }, `${MIS[a]} · PER ABITANTE`), el('text', { x: x + w - 9, y: y + 33, class: 'bx-v', 'text-anchor': 'end' }, eur(v)), el('text', { x: x + 9, y: y + 48, class: 'bx-k' }, 'PROGETTI'), el('text', { x: x + w - 9, y: y + 48, class: 'bx-v', 'text-anchor': 'end' }, nf.format(n)));
}
function testo() {
  const nasc = [...S.hidM];
  const chips = MIS.map((m) => `<button type="button" class="chip-m${S.hidM.has(m) ? ' off' : ''}" data-m="${m}" aria-pressed="${!S.hidM.has(m)}" title="${NOMI_MIS[m]}"><i style="background:${COL_MIS[m]}"></i>${m}<span>${NOMI_MIS[m]}</span></button>`).join('');
  $('#lente-testo').innerHTML = `<div class="chips" role="group" aria-label="Missioni">${chips}</div><p><small>Raggi: uno per comune (i ${S.nv} più vicini al centro), lungo quanto gli € PNRR per abitante (scala a radice quadrata); cerchi tratteggiati = 100, 300, 600, 1.000 €; raggio nero = comune al centro. Anello in basso: stadio di avanzamento. Colore dei comuni: € PNRR per abitante, sette classi con lo stesso numero di comuni (tutte le missioni; stadio scelto). Qui ci sono solo i fondi localizzati su un comune (circa ${Math.round(100 * S.quotaComuni)} % dell'importo PNRR): il resto è di province, regioni o nazionale. La posizione di un comune è il centro del suo riquadro.${nasc.length ? ' Missioni nascoste: ' + nasc.join(', ') + '.' : ''}</small></p>`;
  $('#lente-testo').querySelectorAll('.chip-m').forEach((b) => b.addEventListener('click', () => { const m = b.dataset.m; S.hidM.has(m) ? S.hidM.delete(m) : S.hidM.add(m); disegna(); testo(); }));
}

/* ---------- mappa ---------- */
function ricalcola() {
  S.rid = 0; const m = S.map, svg = $('#lente'), cx = svg.clientWidth / 2, cy = svg.clientHeight / 2, tutti = [], d2 = new Map();
  for (let i = 0; i < S.ids.length; i++) { const p = m.project([S.lon[i], S.lat[i]]), dx = p.x - cx, dy = p.y - cy; tutti.push(i); d2.set(i, dx * dx + dy * dy); }
  tutti.sort((a, b) => d2.get(a) - d2.get(b));
  S.vic = tutti.slice(0, S.nv); S.dentro = S.vic; S.d2 = d2; S.centro = S.vic.length ? S.vic[0] : null;
  disegna(); testo();
  if (m.getLayer('in')) { m.setFilter('in', ['in', ['get', 'pro_com_t'], ['literal', S.vic.map((i) => S.ids[i])]]); m.setFilter('qui', ['==', ['get', 'pro_com_t'], S.centro != null ? S.ids[S.centro] : '__nessuno__']); }
}
const pianifica = () => { if (!S.rid) S.rid = requestAnimationFrame(ricalcola); };
function setN(n) { S.nv = Math.max(8, Math.min(90, Math.round(n))); $('#raggio').value = S.nv; pianifica(); }
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
  m.on('move', pianifica); m.on('resize', pianifica);
  /* un clic su un comune lo porta sotto il centro della lente */
  m.on('click', 'com', (e) => { const i = S.idx.get(e.features[0].properties.pro_com_t); if (i != null) m.easeTo({ center: [S.lon[i], S.lat[i]], duration: 500 }); });
  m.on('mouseenter', 'com', () => { m.getCanvas().style.cursor = 'pointer'; }); m.on('mouseleave', 'com', () => { m.getCanvas().style.cursor = ''; });
  S.tono = tono();
  document.addEventListener('tema-cambia', () => { if (tono() !== S.tono) { S.tono = tono(); m.setStyle(STILI[S.tono], { diff: false }); } else { colora(); } });
  $('#raggio').value = S.nv; $('#raggio').addEventListener('input', (e) => setN(+e.target.value));
  $('#azzera').addEventListener('click', () => { S.hidM.clear(); S.stadio = null; ricalcolaMedia(); colora(); setN(N0()); m.easeTo({ center: VISTA.centro, zoom: VISTA.zoom, duration: 500 }); pianifica(); });
}
carica().then(avvia).catch((e) => { $('#lente-testo').textContent = 'Errore nel caricamento dei dati: ' + e.message; console.error(e); });
})();
