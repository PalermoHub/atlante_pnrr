/* La lente (prototipo 3): un comune alla volta.
   La lente prende il comune che sta sotto la croce. Attorno all'anello, a ventaglio, una raggiera per missione:
   un raggio per progetto, lungo quanto l'importo finanziato (scala logaritmica, cerchi a 10 mila, 100 mila, 1 mln…),
   più chiaro quanto lo stadio è indietro. L'anello in basso riporta gli stadi con il numero di progetti e li filtra.
   Nel pannello: scheda del comune, tabella missione × stadio, tipi di intervento, soggetti attuatori principali.
   Dati dell'app: data/comuni/<istat>.json (progetti e aggregati), cubo_c + comuni + bbox (colore dei poligoni). */
(() => {
const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const nf = new Intl.NumberFormat('it-IT');
const eur = (v) => {
  if (v == null) return '–'; const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toLocaleString('it-IT', { maximumFractionDigits: 2 }) + ' mld €';
  if (a >= 1e6) return (v / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' mln €';
  if (a >= 1e3) return (v / 1e3).toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' mila €';
  return nf.format(Math.round(v)) + ' €';
};
const pc = (a, b) => (b > 0 ? Math.round(100 * a / b) + ' %' : '–');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MIS = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
const NOMI_MIS = { M1: 'Digitalizzazione, innovazione, cultura', M2: 'Rivoluzione verde e transizione ecologica', M3: 'Infrastrutture per la mobilità', M4: 'Istruzione e ricerca', M5: 'Inclusione e coesione', M6: 'Salute', M7: 'REPowerEU' };
const CORTI = { M1: 'Digitale e cultura', M2: 'Transizione verde', M3: 'Mobilità', M4: 'Istruzione', M5: 'Inclusione', M6: 'Salute', M7: 'REPowerEU' };
const COL_MIS = { M1: '#5BBBEB', M2: '#92C151', M3: '#EA425B', M4: '#F49E4B', M5: '#B671DC', M6: '#FACB49', M7: '#8D6E63' };
const STADI = [['Da attivare', 'Da attivare', 'Da att.'], ['In corso, senza gara né lavori', 'In corso', 'In corso'], ['Gara aggiudicata', 'Gara', 'Gara'], ['Lavori o attività avviati', 'Lavori', 'Lavori'], ['Concluso (stato ufficiale)', 'Concluso', 'Fine']];
const OPAC = [0.3, 0.46, 0.64, 0.82, 1]; /* stadio più avanzato = colore più pieno */
const NM = MIS.length, NSTA = STADI.length, NC = NM * NSTA, MAXRAGGI = 90;
const VISTA = { centro: [13.4, 38.0], zoom: 9.2 };

const S = { stadio: null, libera: !matchMedia('(max-width: 640px)').matches, pos: null, hidM: new Set(), ids: [], nome: [], lon: null, lat: null, pop: null, F: null, idx: new Map(), meta: null, cur: null, prog: null, dati: null, map: null, rid: 0, quotaComuni: 0, cache: new Map() };

/* ---------- dati ---------- */
const get = (u) => { if (!S.cache.has(u)) S.cache.set(u, fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); })); return S.cache.get(u); };
async function carica() {
  const [com, bbox, cc, it, meta] = await Promise.all(['comuni', 'bbox', 'cubo_c', 'italia', 'meta'].map((n) => get(`data/${n}.json`)));
  const ids = Object.keys(cc).filter((id) => bbox.c[id] && com[id] && com[id].pop > 0), n = ids.length;
  S.meta = meta; S.ids = ids; S.nome = ids.map((id) => com[id].nm); S.lon = new Float64Array(n); S.lat = new Float64Array(n); S.pop = new Float64Array(n);
  S.F = new Float64Array(n * NC);
  ids.forEach((id, i) => {
    S.idx.set(id, i); const b = bbox.c[id]; S.lon[i] = (b[0] + b[2]) / 2; S.lat[i] = (b[1] + b[3]) / 2; S.pop[i] = com[id].pop;
    const c = cc[id]; for (let o = 0; o < c.length; o += 9) { const st = c[o + 2]; if (st <= 4) S.F[i * NC + c[o] * NSTA + st] += c[o + 5]; }
  });
  S.quotaComuni = it.liv[0] / (it.liv[0] + it.liv[1] + it.liv[2] + it.liv[3]);
  $('#elenco').innerHTML = S.nome.map((nm) => `<option value="${esc(nm)}"></option>`).join('');
}
function finTot(i) { let t = 0; for (let k = 0; k < NC; k++) if (S.stadio == null || k % NSTA === S.stadio) t += S.F[i * NC + k]; return t; }
function classi() {
  const v = S.ids.map((_, i) => finTot(i) / S.pop[i]).filter((x) => x > 0).sort((a, b) => a - b), br = [];
  for (let k = 1; k < 7; k++) br.push(v[Math.floor(v.length * k / 7)]);
  const st = getComputedStyle(document.documentElement), col = [1, 2, 3, 4, 5, 6, 7].map((k) => st.getPropertyValue('--s' + k).trim());
  const gruppi = col.map(() => []);
  S.ids.forEach((id, i) => { const x = finTot(i) / S.pop[i]; let c = 0; while (c < 6 && x > br[c]) c++; if (x > 0) gruppi[c].push(id); });
  const e = ['match', ['get', 'pro_com_t']]; gruppi.forEach((g, c) => { if (g.length) e.push(g, col[c]); }); e.push('rgba(0,0,0,0)');
  return e;
}
function colora() { if (S.map && S.map.getLayer('com')) S.map.setPaintProperty('com', 'fill-color', classi()); }
/* progetti del comune -> oggetti */
function leggi(d) {
  return d.progetti.map((r) => ({ cup: r[0], tit: r[2], att: r[3], sub: r[4], nat: S.meta.nature[r[5]], stato: r[6], st: r[7], fin: r[8], pag: r[9], agg: r[10], quota: r[11], fine: r[12], icc: r[13], m: parseInt(String(r[4]).slice(1, 2), 10) - 1 }))
    .filter((p) => p.m >= 0 && p.m < NM && p.st >= 0 && p.st <= 4);
}

/* ---------- raggiera ---------- */
const el = (n, a = {}, t) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; };
const stadioOk = (p) => S.stadio == null || p.st === S.stadio;
/* centro della lente: al centro della mappa, oppure dove l'hai trascinata (modalità libera) */
function centroLente() {
  const svg = $('#lente'), W = svg.clientWidth, H = svg.clientHeight;
  if (!S.libera || !S.pos) return [W / 2, H / 2];
  return [Math.max(40, Math.min(W - 40, S.pos[0])), Math.max(40, Math.min(H - 40, S.pos[1]))];
}
function disegna() {
  const svg = $('#lente'), W = svg.clientWidth, H = svg.clientHeight, [cx, cy] = centroLente();
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.replaceChildren();
  const avail = (Math.min(W, H) / 2 - 34) * (W < 640 ? 0.68 : 0.56), Rin = Math.max(32, Math.min(64, avail * 0.27)), Rout = Rin + 24, rb = Rout + 5, Hm = Math.max(36, avail - Rout - 5), Rl = rb + Hm + 14;
  const P = (r, a) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const arc = (r, a0, a1) => { const [x0, y0] = P(r, a0), [x1, y1] = P(r, a1), cw = a1 > a0; return `M${x0} ${y0} A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${cw ? 1 : 0} ${x1} ${y1}`; };
  const defs = el('defs'); svg.append(defs); const g = el('g'); svg.append(g);
  const prog = S.prog, nome = S.cur != null ? S.nome[S.idx.get(S.cur)] : null;
  if (!nome) { g.append(el('text', { x: cx, y: cy, 'text-anchor': 'middle', class: 'nome' }, 'Sposta la mappa su un comune')); return; }
  /* velo semitrasparente dietro la raggiera: nasconde i poligoni sotto, lascia vedere la mappa dentro la lente */
  const Rv = Rl + 13; g.append(el('path', { d: `M${cx - Rv} ${cy} a${Rv} ${Rv} 0 1 0 ${2 * Rv} 0 a${Rv} ${Rv} 0 1 0 ${-2 * Rv} 0 M${cx - Rin} ${cy} a${Rin} ${Rin} 0 1 1 ${2 * Rin} 0 a${Rin} ${Rin} 0 1 1 ${-2 * Rin} 0`, 'fill-rule': 'evenodd', class: 'velo' }));
  /* scala logaritmica sull'importo dei progetti */
  const vals = (prog || []).map((p) => p.fin).filter((v) => v > 0), lo = vals.length ? Math.pow(10, Math.floor(Math.log10(Math.min(...vals)))) : 1e3;
  let hi = vals.length ? Math.pow(10, Math.ceil(Math.log10(Math.max(...vals)))) : 1e6; if (hi <= lo) hi = lo * 10;
  const lun = (v) => Hm * (0.12 + 0.88 * (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)));
  let ult = -99;
  for (let v = lo; v <= hi * 1.001; v *= 10) {
    const r = rb + lun(v); g.append(el('circle', { cx, cy, r, fill: 'none', class: 'liv' }));
    if (r - ult >= 13) { g.append(el('text', { x: cx, y: cy + r + 3.5, 'text-anchor': 'middle', class: 'livt' }, eur(v))); ult = r; }
  }
  /* settori: 7 da 48°, varco in basso per le etichette dei livelli */
  const SET = 48, A0 = 192, conteggi = {};
  MIS.forEach((m, a) => {
    const aS = A0 + a * SET, aM = aS + SET / 2, nasc = S.hidM.has(m);
    const tutti = (prog || []).filter((p) => p.m === a && p.fin > 0).sort((p, q) => p.fin - q.fin), tag = tutti.slice(-MAXRAGGI), nasconde = tutti.length - tag.length;
    conteggi[m] = { n: tutti.length, nasconde };
    const step = Math.min(2.2, SET * 0.82 / Math.max(1, tag.length)), hs = step * 0.38; const gb = el('g'); g.append(gb);
    if (!nasc) tag.forEach((p, k) => {
      const ang = aM - tag.length * step / 2 + (k + 0.5) * step, len = lun(p.fin), dim = !stadioOk(p), h2 = dim ? hs * 0.35 : hs;
      const pts = [P(rb, ang - h2), P(rb + len, ang - h2), P(rb + len, ang + h2), P(rb, ang + h2)].map((q) => q.join(',')).join(' ');
      const r = el('polygon', { points: pts, fill: COL_MIS[m], 'fill-opacity': dim ? 0.3 : OPAC[p.st], class: 'rag' });
      const mostra = () => tip(p, P(rb + len, ang));
      r.addEventListener('mouseenter', mostra); r.addEventListener('click', mostra); r.addEventListener('mouseleave', () => { if (!matchMedia('(hover: none)').matches) tip(null); });
      gb.append(r);
    });
    /* nastro della missione */
    const mid = (aM % 360 + 360) % 360, basso = mid > 90 && mid < 270, id = `nastro${a}`, lungo = Rl * SET * Math.PI / 180;
    const nastro = el('path', { d: arc(Rl, aS + 2, aS + SET - 2), fill: 'none', stroke: nasc ? 'var(--line)' : COL_MIS[m], 'stroke-width': 17, class: 'nastro' + (nasc ? ' spento' : ''), role: 'button', tabindex: '0', 'aria-pressed': String(!nasc), 'aria-label': `${m} ${NOMI_MIS[m]}: ${conteggi[m].n} progetti. Clic per ${nasc ? 'mostrarla' : 'nasconderla'}` });
    nastro.append(el('title', {}, `${m} ${NOMI_MIS[m]} · ${conteggi[m].n} progetti${nasconde ? ` (mostrati i ${MAXRAGGI} più grandi)` : ''} · clic per ${nasc ? 'mostrarla' : 'nasconderla'}`));
    g.append(nastro); defs.append(el('path', { id, d: basso ? arc(Rl, aS + SET - 2, aS + 2) : arc(Rl, aS + 2, aS + SET - 2), fill: 'none' }));
    const tx = el('text', { class: 'nastrot' + (m === 'M7' ? ' chiaro' : ''), dy: 4, 'text-anchor': 'middle' }); tx.append(el('textPath', { href: `#${id}`, startOffset: '50%' }, `${m}${lungo > 190 ? ' · ' + CORTI[m] : ''} · ${conteggi[m].n}`)); g.append(tx);
    const fn = () => { S.hidM.has(m) ? S.hidM.delete(m) : S.hidM.add(m); tip(null); disegna(); sintesi(); };
    nastro.addEventListener('click', fn); nastro.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  });
  /* anello della lente */
  g.append(el('path', { d: `M${cx - Rout} ${cy} a${Rout} ${Rout} 0 1 0 ${2 * Rout} 0 a${Rout} ${Rout} 0 1 0 ${-2 * Rout} 0 M${cx - Rin} ${cy} a${Rin} ${Rin} 0 1 1 ${2 * Rin} 0 a${Rin} ${Rin} 0 1 1 ${-2 * Rin} 0`, 'fill-rule': 'evenodd', class: 'anello' }), el('circle', { cx, cy, r: Rin, fill: 'none', class: 'lente-bordo' }), el('path', { d: `M${cx - 6} ${cy} h12 M${cx} ${cy - 6} v12`, class: 'croce' }));
  if (S.libera) {
    const grab = el('circle', { cx, cy, r: Rin, fill: 'transparent', class: 'presa', 'aria-hidden': 'true' });
    grab.addEventListener('pointerdown', (e) => {
      e.preventDefault(); const r = svg.getBoundingClientRect();
      /* il disegno viene rifatto a ogni spostamento: i gesti si seguono sulla finestra, non sull'elemento */
      const mv = (ev) => { S.pos = [ev.clientX - r.left, ev.clientY - r.top]; pianifica(); };
      const su = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', su); removeEventListener('pointercancel', su); };
      addEventListener('pointermove', mv); addEventListener('pointerup', su); addEventListener('pointercancel', su);
    });
    g.append(grab);
  }
  defs.append(el('path', { id: 'arco-nome', d: arc(Rin + 7.5, -62, 62), fill: 'none' }));
  const fs = Math.max(8.5, Math.min(14, ((Rin + 7.5) * 124 * Math.PI / 180) / (Math.max(6, nome.length) * 0.58))), tn = el('text', { class: 'nome', 'text-anchor': 'middle', style: `font-size:${fs}px` }); tn.append(el('textPath', { href: '#arco-nome', startOffset: '50%' }, nome)); g.append(tn);
  /* stadi: numero di progetti e filtro */
  const nst = [0, 0, 0, 0, 0]; (prog || []).forEach((p) => { if (!S.hidM.has(MIS[p.m])) nst[p.st]++; });
  const span = Rin < 60 ? 104 : 88;
  STADI.forEach(([lungo, , breve], s) => {
    const on = S.stadio === s, c0 = 180 - (s - 2) * (span * 2 / 5), sa = c0 + span / 5 - 0.5, sb = c0 - span / 5 + 0.5, idn = `st${s}`;
    defs.append(el('path', { id: idn, d: arc(Rout - 6.5, sa, sb), fill: 'none' }));
    const gs = el('g', { class: 'segm', role: 'button', tabindex: '0', 'aria-pressed': String(on), 'aria-label': `Stadio ${lungo}: ${nst[s]} progetti` });
    gs.append(el('path', { d: arc(Rout - 12, sa, sb), fill: 'none', stroke: 'transparent', 'stroke-width': 24 }));
    const t = el('text', { class: 'stadio' + (on ? ' on' : ''), 'text-anchor': 'middle' }); t.append(el('textPath', { href: `#${idn}`, startOffset: '50%' }, Rin < 60 ? breve : `${breve} ${nst[s]}`)); gs.append(t, el('title', {}, `${lungo}: ${nst[s]} progetti · clic per ${on ? 'tornare a tutti gli stadi' : 'evidenziare solo questo stadio'}`));
    const fn = () => { S.stadio = on ? null : s; colora(); disegna(); sintesi(); };
    gs.addEventListener('click', fn); gs.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    g.append(gs);
  });
  if (!prog) g.append(el('text', { x: cx, y: cy + Rout + 16, 'text-anchor': 'middle', class: 'livt' }, 'Carico i progetti…'));
}
/* scheda del progetto sotto il puntatore */
function tip(p, xy) {
  const t = $('#tip'); if (!p) { t.hidden = true; return; }
  const col = COL_MIS[MIS[p.m]], inc = !p.att;
  t.innerHTML = `<b>${esc(p.tit || 'Incentivo a imprese o persone (dato riservato)')}</b><span class="k">${MIS[p.m]} · ${esc(NOMI_MIS[MIS[p.m]])}</span><dl><dt>Stadio</dt><dd>${esc(STADI[p.st][0])}</dd><dt>Finanziato</dt><dd>${eur(p.fin)}</dd><dt>Pagato</dt><dd>${eur(p.pag)} (${pc(p.pag, p.fin)})</dd>${p.agg ? `<dt>Aggiudicato</dt><dd>${eur(p.agg)}</dd>` : ''}${p.fine ? `<dt>Fine prevista</dt><dd>${esc(p.fine)}</dd>` : ''}<dt>Tipo</dt><dd>${esc(p.nat)}</dd>${inc ? '' : `<dt>Attuatore</dt><dd>${esc(p.att)}</dd>`}<dt>CUP</dt><dd>${esc(p.cup)}</dd></dl>${p.quota < 1 ? `<small>Progetto su più comuni: quota ${Math.round(p.quota * 100)} %.</small>` : ''}`;
  t.style.borderColor = col; t.hidden = false;
  const m = $('.lente-mappa').getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  const x = Math.max(6, Math.min(m.width - w - 6, xy[0] - w / 2)), y0 = xy[1] > m.height / 2 ? xy[1] - h - 14 : xy[1] + 14;
  t.style.left = x + 'px'; t.style.top = Math.max(6, Math.min(m.height - h - 6, y0)) + 'px';
}
/* riga di sintesi nella barra in alto (la scheda completa è quella dell'Atlante) */
function sintesi() {
  const s = $('#sintesi'), d = S.dati;
  s.textContent = !S.cur ? 'Porta la lente su un comune' : !d ? 'Carico i dati del comune…' : `${d.nome} (${d.sigla}) · ${nf.format(d.n)} progetti · ${eur(d.fin)} finanziati · ${pc(d.pag, d.fin)} pagato · ${nf.format(Math.round(d.fin / d.pop))} € per abitante`;
}
/* ---------- mappa ---------- */
function comuneSotto() {
  const m = S.map, [cx, cy] = centroLente();
  const f = m.getLayer('com') ? m.queryRenderedFeatures([cx, cy], { layers: ['com'] }) : [];
  const id = f.length ? f[0].properties.pro_com_t : null; if (id && S.idx.has(id)) return id;
  let best = null, bd = Infinity; const c = m.unproject([cx, cy]);
  for (let i = 0; i < S.ids.length; i++) { const dx = S.lon[i] - c.lng, dy = S.lat[i] - c.lat, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
  return best != null ? S.ids[best] : null;
}
function ricalcola() {
  S.rid = 0; const id = comuneSotto(), m = S.map;
  if (id !== S.cur) {
    S.cur = id; S.prog = null; S.dati = null; tip(null);
    if (id) get(`data/comuni/${id}.json`).then((d) => { if (S.cur === id) { S.dati = d; S.prog = leggi(d); disegna(); sintesi(); } }).catch(() => { if (S.cur === id) { S.dati = null; S.prog = []; disegna(); sintesi(); } });
    if (m.getLayer('qui')) m.setFilter('qui', ['==', ['get', 'pro_com_t'], id || '__nessuno__']);
  }
  disegna(); sintesi();
}
const pianifica = () => { if (!S.rid) S.rid = requestAnimationFrame(ricalcola); };
const STILI = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
const tono = () => (document.documentElement.getAttribute('data-tone') === 'dark' ? 'dark' : 'light');
function livelli() {
  const m = S.map; if (m.getSource('c')) return;
  const st = getComputedStyle(document.documentElement), prima = (m.getStyle().layers.find((l) => l.type === 'symbol') || {}).id;
  m.addSource('c', { type: 'vector', url: 'pmtiles://' + new URL('data/geo/comuni.pmtiles', location.href).href, attribution: 'Confini: ISTAT/ANNCSU · Dati: Italia Domani (CC-BY 4.0)' });
  m.addLayer({ id: 'com', type: 'fill', source: 'c', 'source-layer': 'comuni', paint: { 'fill-color': '#ccc', 'fill-opacity': 0.62 } }, prima);
  m.addLayer({ id: 'bordi', type: 'line', source: 'c', 'source-layer': 'comuni', minzoom: 6, paint: { 'line-color': st.getPropertyValue('--surface').trim(), 'line-width': 0.4 } }, prima);
  m.addLayer({ id: 'qui', type: 'line', source: 'c', 'source-layer': 'comuni', filter: ['==', ['get', 'pro_com_t'], S.cur || '__nessuno__'], paint: { 'line-color': st.getPropertyValue('--ink').trim(), 'line-width': 3 } }, prima);
  colora();
}
function avvia() {
  maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile);
  const m = S.map = new maplibregl.Map({ container: 'map', style: STILI[tono()], center: VISTA.centro, zoom: VISTA.zoom, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxPitch: 0 });
  m.touchZoomRotate.disableRotation(); m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  m.on('style.load', () => { livelli(); S.cur = null; ricalcola(); });
  m.on('move', pianifica); m.on('moveend', pianifica); m.on('resize', pianifica);
  S.tono = tono();
  document.addEventListener('tema-cambia', () => { if (tono() !== S.tono) { S.tono = tono(); m.setStyle(STILI[S.tono], { diff: false }); } else { colora(); } });
  const modo = () => { document.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.modo === 'libera') === S.libera))); };
  document.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { const lib = b.dataset.modo === 'libera'; if (lib === S.libera) return; S.libera = lib; S.pos = lib ? centroLente() : null; modo(); pianifica(); }));
  modo();
  m.on('click', (e) => { if (S.libera) { S.pos = [e.point.x, e.point.y]; pianifica(); } });
  $('#azzera').addEventListener('click', () => { S.hidM.clear(); S.stadio = null; S.pos = null; colora(); m.easeTo({ center: VISTA.centro, zoom: VISTA.zoom, duration: 500 }); });
  $('#cerca').addEventListener('change', (e) => { const i = S.nome.findIndex((n) => n.toLowerCase() === e.target.value.trim().toLowerCase()); if (i >= 0) { m.easeTo({ center: [S.lon[i], S.lat[i]], zoom: Math.max(m.getZoom(), 10.5), duration: 700 }); e.target.blur(); } });
}
carica().then(avvia).catch((e) => { $('#sintesi').textContent = 'Errore nel caricamento dei dati: ' + e.message; console.error(e); });
})();
