/* La lente dentro l'app (index.html): modalità della mappa «Mappa e schede».
   Si accende dal chip «Lente». La mappa, i colori e la scheda restano quelli dell'app: la lente prende il comune che sta
   sotto la croce, disegna attorno all'anello una raggiera per missione (un raggio per progetto, lungo quanto l'importo,
   scala logaritmica, più chiaro quanto lo stadio è indietro) e, a spostamento finito, apre la scheda di quel comune.
   Stadi e missioni della lente sono locali: attenuano i raggi, non cambiano i filtri dell'app.
   Dall'app usa solo il ponte window.AtlantePNRR (vedi in fondo a js/app.js). */
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
const NM = MIS.length, MAXRAGGI = 90;
const ZMIN = 8; /* sotto questo zoom il comune sotto la croce è arbitrario: la lente chiede di avvicinarsi */
const ZVISTA = 9.2, VISTA = [13.4, 38.0];
const mobile = matchMedia('(max-width: 720px)'); /* stessa soglia del foglio inferiore (guscio.js): sul telefono la lente è fissa al centro, sempre accesa, senza impostazioni */

const L = { on: false, libera: !mobile.matches, pos: null, stadio: null, hidM: new Set(), cur: null, prog: null, dati: null, rid: 0, ultimo: null, cent: null, fisso: null };
let A, S, m, svg, tipEl;

/* progetti del comune -> oggetti */
function leggi(d) {
  return d.progetti.map((r) => ({ cup: r[0], tit: r[2], att: r[3], sub: r[4], nat: S.meta.nature[r[5]], stato: r[6], st: r[7], fin: r[8], pag: r[9], agg: r[10], quota: r[11], fine: r[12], icc: r[13], m: parseInt(String(r[4]).slice(1, 2), 10) - 1 }))
    .filter((p) => p.m >= 0 && p.m < NM && p.st >= 0 && p.st <= 4);
}

/* ---------- disegno ---------- */
const el = (n, a = {}, t) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; };
const stadioOk = (p) => L.stadio == null || p.st === L.stadio;
/* centro della lente: al centro della mappa, oppure dove l'hai trascinata (modalità libera) */
function centro() {
  const W = svg.clientWidth, H = svg.clientHeight;
  if (!L.libera || !L.pos) return [W / 2, H / 2];
  return [Math.max(40, Math.min(W - 40, L.pos[0])), Math.max(40, Math.min(H - 40, L.pos[1]))];
}
function disegna() {
  if (!L.on) return;
  const W = svg.clientWidth, H = svg.clientHeight, [cx, cy] = centro();
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.replaceChildren();
  const avail = (Math.min(W, H) / 2 - 34) * (W < 640 ? 0.68 : 0.56), Rin = Math.max(32, Math.min(64, avail * 0.27)), Rout = Rin + 24, rb = Rout + 5, Hm = Math.max(36, avail - Rout - 5), Rl = rb + Hm + 14;
  const P = (r, a) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const arc = (r, a0, a1) => { const [x0, y0] = P(r, a0), [x1, y1] = P(r, a1), cw = a1 > a0; return `M${x0} ${y0} A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${cw ? 1 : 0} ${x1} ${y1}`; };
  const anello = (r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const foro = (r) => `M${cx - r} ${cy} a${r} ${r} 0 1 1 ${2 * r} 0 a${r} ${r} 0 1 1 ${-2 * r} 0`;
  const defs = el('defs'); svg.append(defs); const g = el('g'); svg.append(g);
  const mess = (t) => { g.append(el('rect', { x: cx - 120, y: cy - 20, width: 240, height: 40, rx: 10, class: 'msg-bg' }), el('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', class: 'msg' }, t)); };
  /* troppo lontano: la lente è un bersaglio vuoto con un invito ad avvicinarsi */
  if (m.getZoom() < ZMIN) {
    g.append(el('circle', { cx, cy, r: 34, fill: 'none', class: 'lente-bordo' }), el('path', { d: `M${cx - 6} ${cy} h12 M${cx} ${cy - 6} v12`, class: 'croce' }));
    if (L.libera) presa(g, cx, cy, 34);
    mess('Avvicina la mappa per usare la lente'); return;
  }
  const prog = L.prog, nome = L.cur ? S.com[L.cur].nm : null;
  if (!nome) { g.append(el('circle', { cx, cy, r: 34, fill: 'none', class: 'lente-bordo' }), el('path', { d: `M${cx - 6} ${cy} h12 M${cx} ${cy - 6} v12`, class: 'croce' })); if (L.libera) presa(g, cx, cy, 34); mess('Porta la lente su un comune'); return; }
  /* velo semitrasparente dietro la raggiera: nasconde i poligoni sotto, lascia vedere la mappa dentro la lente */
  g.append(el('path', { d: anello(Rl + 13) + foro(Rin), 'fill-rule': 'evenodd', class: 'velo' }));
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
  MIS.forEach((mi, a) => {
    const aS = A0 + a * SET, aM = aS + SET / 2, nasc = L.hidM.has(mi);
    const tutti = (prog || []).filter((p) => p.m === a && p.fin > 0).sort((p, q) => p.fin - q.fin), tag = tutti.slice(-MAXRAGGI), nasconde = tutti.length - tag.length;
    conteggi[mi] = { n: tutti.length, nasconde };
    const step = Math.min(2.2, SET * 0.82 / Math.max(1, tag.length)), hs = step * 0.38; const gb = el('g'); g.append(gb);
    if (!nasc) tag.forEach((p, k) => {
      const ang = aM - tag.length * step / 2 + (k + 0.5) * step, len = lun(p.fin), dim = !stadioOk(p), h2 = dim ? hs * 0.35 : hs;
      const pts = [P(rb, ang - h2), P(rb + len, ang - h2), P(rb + len, ang + h2), P(rb, ang + h2)].map((q) => q.join(',')).join(' ');
      const r = el('polygon', { points: pts, fill: COL_MIS[mi], 'fill-opacity': dim ? 0.3 : OPAC[p.st], class: 'rag' });
      const mostra = () => { if (!L.fisso) tip(p, P(rb + len, ang)); };
      r.addEventListener('mouseenter', mostra);
      /* il clic fissa la scheda (resta aperta, con il link a OpenCUP); un secondo clic sullo stesso raggio la chiude */
      r.addEventListener('click', (e) => { e.stopPropagation(); if (L.fisso === p) { tip(null); return; } L.fisso = null; tip(p, P(rb + len, ang), true); });
      r.addEventListener('mouseleave', () => { if (!L.fisso && !matchMedia('(hover: none)').matches) tip(null); });
      gb.append(r);
    });
    /* nastro della missione */
    const mid = (aM % 360 + 360) % 360, basso = mid > 90 && mid < 270, id = `lnastro${a}`, lungo = Rl * SET * Math.PI / 180;
    const nastro = el('path', { d: arc(Rl, aS + 2, aS + SET - 2), fill: 'none', stroke: nasc ? 'var(--line)' : COL_MIS[mi], 'stroke-width': 17, class: 'nastro' + (nasc ? ' spento' : ''), role: 'button', tabindex: '0', 'aria-pressed': String(!nasc), 'aria-label': `${mi} ${NOMI_MIS[mi]}: ${conteggi[mi].n} progetti. Clic per ${nasc ? 'mostrarla' : 'nasconderla'}` });
    nastro.append(el('title', {}, `${mi} ${NOMI_MIS[mi]} · ${conteggi[mi].n} progetti${nasconde ? ` (mostrati i ${MAXRAGGI} più grandi)` : ''} · clic per ${nasc ? 'mostrarla' : 'nasconderla'}`));
    g.append(nastro); defs.append(el('path', { id, d: basso ? arc(Rl, aS + SET - 2, aS + 2) : arc(Rl, aS + 2, aS + SET - 2), fill: 'none' }));
    const tx = el('text', { class: 'nastrot' + (mi === 'M7' ? ' chiaro' : ''), dy: 4, 'text-anchor': 'middle' }); tx.append(el('textPath', { href: `#${id}`, startOffset: '50%' }, `${mi}${lungo > 190 ? ' · ' + CORTI[mi] : ''} · ${conteggi[mi].n}`)); g.append(tx);
    const fn = () => { L.hidM.has(mi) ? L.hidM.delete(mi) : L.hidM.add(mi); tip(null); disegna(); };
    nastro.addEventListener('click', fn); nastro.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  });
  /* anello della lente */
  g.append(el('path', { d: anello(Rout) + foro(Rin), 'fill-rule': 'evenodd', class: 'anello' }), el('circle', { cx, cy, r: Rin, fill: 'none', class: 'lente-bordo' }), el('path', { d: `M${cx - 6} ${cy} h12 M${cx} ${cy - 6} v12`, class: 'croce' }));
  if (L.libera) presa(g, cx, cy, Rin);
  defs.append(el('path', { id: 'larco-nome', d: arc(Rin + 7.5, -62, 62), fill: 'none' }));
  const fs = Math.max(8.5, Math.min(14, ((Rin + 7.5) * 124 * Math.PI / 180) / (Math.max(6, nome.length) * 0.58))), tn = el('text', { class: 'nome', 'text-anchor': 'middle', style: `font-size:${fs}px` }); tn.append(el('textPath', { href: '#larco-nome', startOffset: '50%' }, nome), el('title', {}, `Apri la scheda di ${nome}`)); tn.setAttribute('role', 'link'); tn.setAttribute('tabindex', '0'); tn.setAttribute('aria-label', `Apri la scheda di ${nome}`);
  const apri = () => { const cur = S.cur; if (!(cur && cur.liv === 'c' && cur.id === L.cur)) A.go('c', L.cur, cur?.F); if (document.body.dataset.foglio === 'chiuso') $('#maniglia')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); };
  tn.addEventListener('click', apri); tn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apri(); } }); g.append(tn);
  /* stadi: numero di progetti e attenuazione dei raggi degli altri stadi */
  const nst = [0, 0, 0, 0, 0]; (prog || []).forEach((p) => { if (!L.hidM.has(MIS[p.m])) nst[p.st]++; });
  const span = Rin < 60 ? 104 : 88;
  STADI.forEach(([lungo, , breve], s) => {
    const on = L.stadio === s, c0 = 180 - (s - 2) * (span * 2 / 5), sa = c0 + span / 5 - 0.5, sb = c0 - span / 5 + 0.5, idn = `lst${s}`;
    defs.append(el('path', { id: idn, d: arc(Rout - 6.5, sa, sb), fill: 'none' }));
    const settore = `${arc(Rout, sa, sb)} L${P(Rin, sb).join(' ')} ${arc(Rin, sb, sa).replace('M', 'L')} Z`;
    const gs = el('g', { class: 'segm', role: 'button', tabindex: '0', 'aria-pressed': String(on), 'aria-label': `Stadio ${lungo}: ${nst[s]} progetti` });
    gs.append(el('path', { d: settore, class: 'sfondo' }));
    const t = el('text', { class: 'stadio' + (on ? ' on' : ''), 'text-anchor': 'middle' }); t.append(el('textPath', { href: `#${idn}`, startOffset: '50%' }, Rin < 60 ? breve : `${breve} ${nst[s]}`)); gs.append(t, el('title', {}, `${lungo}: ${nst[s]} progetti · clic per ${on ? 'tornare a tutti gli stadi' : 'evidenziare solo questo stadio'}`));
    const fn = () => { L.stadio = on ? null : s; disegna(); };
    gs.addEventListener('click', fn); gs.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    g.append(gs);
  });
  if (!prog) g.append(el('text', { x: cx, y: cy + Rout + 16, 'text-anchor': 'middle', class: 'livt' }, 'Carico i progetti…'));
}
/* presa per trascinare la lente (modalità libera); i gesti si seguono sulla finestra perché il disegno si rifà a ogni passo */
function presa(g, cx, cy, r) {
  const grab = el('circle', { cx, cy, r, fill: 'transparent', class: 'presa', 'aria-hidden': 'true' });
  grab.addEventListener('pointerdown', (e) => {
    e.preventDefault(); tip(null); const b = svg.getBoundingClientRect();
    const mv = (ev) => { L.pos = [ev.clientX - b.left, ev.clientY - b.top]; pianifica(); };
    const su = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', su); removeEventListener('pointercancel', su); assesta(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', su); addEventListener('pointercancel', su);
  });
  g.append(grab);
}
/* scheda del progetto sotto il puntatore */
const cupOk = (c) => /^[A-Z0-9]{15}$/i.test(String(c || '').trim());
const opencup = (c) => `https://www.opencup.gov.it/portale/web/opencup/home/progetto/-/cup/${encodeURIComponent(String(c).trim())}`;
function tip(p, xy, fisso) {
  L.fisso = fisso ? p : null;
  if (!p) { tipEl.hidden = true; return; }
  const col = COL_MIS[MIS[p.m]], inc = !p.att;
  tipEl.innerHTML = `<b>${esc(p.tit || 'Incentivo a imprese o persone (dato riservato)')}</b><span class="k">${MIS[p.m]} · ${esc(NOMI_MIS[MIS[p.m]])}</span><dl><dt>Stadio</dt><dd>${esc(STADI[p.st][0])}</dd><dt>Finanziato</dt><dd>${eur(p.fin)}</dd><dt>Pagato</dt><dd>${eur(p.pag)} (${pc(p.pag, p.fin)})</dd>${p.agg ? `<dt>Aggiudicato</dt><dd>${eur(p.agg)}</dd>` : ''}${p.fine ? `<dt>Fine prevista</dt><dd>${esc(p.fine)}</dd>` : ''}<dt>Tipo</dt><dd>${esc(p.nat)}</dd>${inc ? '' : `<dt>Attuatore</dt><dd>${esc(p.att)}</dd>`}<dt>CUP</dt><dd>${esc(p.cup)}</dd></dl>${fisso ? (cupOk(p.cup) ? `<a class="oc" href="${opencup(p.cup)}" target="_blank" rel="noopener">Apri su OpenCUP ↗</a>` : '<small>Nessuna scheda OpenCUP: il CUP non è un codice valido.</small>') : '<small class="inv">Clic sul raggio per aprire la scheda</small>'}${p.quota < 1 ? `<small>Progetto su più comuni: quota ${Math.round(p.quota * 100)} %.</small>` : ''}`;
  tipEl.style.borderColor = col; tipEl.classList.toggle('fisso', !!fisso); tipEl.hidden = false;
  const W = svg.clientWidth, H = svg.clientHeight, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const x = Math.max(6, Math.min(W - w - 6, xy[0] - w / 2)), y0 = xy[1] > H / 2 ? xy[1] - h - 14 : xy[1] + 14;
  tipEl.style.left = x + 'px'; tipEl.style.top = Math.max(6, Math.min(H - h - 6, y0)) + 'px';
}

/* ---------- comune sotto la croce ---------- */
function centroidi() {
  if (L.cent) return L.cent;
  const ids = [], xy = []; for (const [id, b] of Object.entries(S.bbox.c || {})) if (S.com[id]) { ids.push(id); xy.push((b[0] + b[2]) / 2, (b[1] + b[3]) / 2); }
  return (L.cent = { ids, xy });
}
function comuneSotto() {
  const [cx, cy] = centro();
  const f = m.getLayer('comuni') ? m.queryRenderedFeatures([cx, cy], { layers: ['comuni'] }) : [];
  const id = f.length ? f[0].properties.pro_com_t : null; if (id && S.com[id]) return id;
  /* tessere non ancora caricate: il centroide più vicino, ma solo se è davvero vicino (altrimenti è mare o estero) */
  const c = m.unproject([cx, cy]), { ids, xy } = centroidi(); let best = null, bd = 0.0064;
  for (let i = 0; i < ids.length; i++) { const dx = xy[2 * i] - c.lng, dy = xy[2 * i + 1] - c.lat, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = ids[i]; } }
  return best;
}
/* il disegno segue la mappa a ogni fotogramma; la scheda dell'app si aggiorna solo a spostamento finito */
function ricalcola() {
  L.rid = 0; if (!L.on) return;
  const id = m.getZoom() < ZMIN ? null : comuneSotto();
  if (id !== L.cur) {
    L.cur = id; L.prog = null; L.dati = null; tip(null);
    if (id) A.get(`data/comuni/${id}.json`).then((d) => { if (L.cur === id) { L.dati = d; L.prog = leggi(d); disegna(); } }).catch(() => { if (L.cur === id) { L.prog = []; disegna(); } });
  }
  disegna();
}
const pianifica = () => { if (L.on && !L.rid) L.rid = requestAnimationFrame(ricalcola); };
function assesta() {
  if (!L.on) return; ricalcola();
  const id = L.cur, cur = S.cur; if (!id || (cur && cur.liv === 'c' && cur.id === id)) return;
  L.ultimo = id; A.go('c', id, cur?.F);
}

/* ---------- accensione e impostazioni ---------- */
function accendi(on, auto) {
  if (on === L.on) return; L.on = on; S.lente = on;
  svg.hidden = !on; if (!on) { tip(null); svg.replaceChildren(); L.cur = null; L.prog = null; }
  chipLente();
  if (S.cur) A.evidenzia(S.cur.liv, S.cur.id, true); /* il velo dell'app si toglie con la lente accesa, si rimette da spenta */
  try { const u = new URL(location.href); on ? u.searchParams.set('lente', '1') : u.searchParams.delete('lente'); history.replaceState(null, '', u); } catch (e) {}
  /* legenda e riquadro dell'app si chiudono (restano come titoli) per non finire sotto la raggiera */
  if (on) { L.aperti = ['#quadro', '#legenda'].map((q) => { const d = $(q); const a = d.open; d.open = false; return [d, a]; }); }
  else if (L.aperti) { L.aperti.forEach(([d, a]) => { d.open = a; }); L.aperti = null; }
  if (on) {
    if (m.getZoom() < ZMIN && !auto) { const b = S.cur?.liv === 'c' ? S.bbox.c[S.cur.id] : null; m.easeTo(b ? { center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], zoom: 10.5, duration: 600 } : { center: VISTA, zoom: ZVISTA, duration: 600 }); }
    L.pos = null; ricalcola(); setTimeout(assesta, 700);
  }
}
const ICO = { libera: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>', centro: '<circle cx="12" cy="12" r="8"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>' };
const ETI = { libera: 'Libera', centro: 'Al centro' };
const NOME = { libera: 'libera: la mappa resta ferma e si trascina la lente', centro: 'al centro: la lente resta ferma e si sposta la mappa' };
/* il chip mostra l'icona della modalità in uso; l'altra compare solo con un clic prolungato */
function chipLente() {
  const c = $('#chip-lente'), mod = L.libera ? 'libera' : 'centro', alt = L.libera ? 'centro' : 'libera';
  c.classList.toggle('attiva', L.on); c.setAttribute('aria-pressed', String(L.on));
  c.title = (L.on ? 'Lente accesa' : 'Lente spenta') + ' (' + NOME[mod] + ')' + (mobile.matches ? '' : ' · tieni premuto per cambiare modalità');
  c.querySelector('.chip2-v').textContent = L.on ? 'Lente accesa' : 'Lente spenta';
  const a = $('#lente-alt'); a.querySelector('svg').innerHTML = ICO[alt]; a.querySelector('.chip2-v').textContent = ETI[alt]; a.dataset.modo = alt; a.title = 'Passa a ' + NOME[alt]; a.setAttribute('aria-label', 'Passa alla modalità ' + NOME[alt]);
}
function altNascondi() { $('#lente-alt').hidden = true; }
function impostaModo(lib) { if (lib === L.libera) return; L.libera = lib; L.pos = lib ? centro() : null; chipLente(); pianifica(); }
function avvia() {
  A = window.AtlantePNRR; S = A.S; m = S.map;
  svg = el('svg', { id: 'lente-svg', class: 'lente-svg', 'aria-label': 'Raggiera dei progetti del comune sotto la lente, per missione e stadio' }); svg.hidden = true;
  tipEl = document.createElement('div'); tipEl.className = 'lente-tip'; tipEl.hidden = true;
  m.getContainer().append(svg, tipEl);
  m.on('move', pianifica); m.on('moveend', assesta); m.on('resize', pianifica); m.on('idle', pianifica);
  m.on('click', (e) => { if (L.fisso) tip(null); if (!L.on) return; if (L.libera) { L.pos = [e.point.x, e.point.y]; assesta(); } else { m.easeTo({ center: e.lngLat, duration: 450 }); } });
  /* ricerca o scelta di un altro comune dall'app: la mappa va lì (con la lente accesa l'app non sposta la mappa da sola) */
  addEventListener('hashchange', () => {
    if (!L.on) return; const { liv, id } = A.parseHash();
    if (liv !== 'c' || id === L.ultimo || id === L.cur) { return; }
    const b = S.bbox.c[id]; if (!b) return; L.pos = null;
    m.easeTo({ center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], zoom: Math.max(m.getZoom(), 10.5), duration: 700 });
  });
  document.addEventListener('tema-cambia', () => setTimeout(pianifica, 400));
  /* telefono: sempre al centro; desktop: libera di default. Clic = accende/spegne, clic prolungato (o tasto destro, freccia giù) = l'altra modalità */
  const fissa = () => { if (mobile.matches) { L.libera = false; L.pos = null; altNascondi(); pianifica(); } chipLente(); };
  mobile.addEventListener('change', fissa); fissa();
  const chip = $('#chip-lente'), alt = $('#lente-alt'); let t = null, lungo = false;
  const mostraAlt = () => { if (mobile.matches) return; lungo = true; alt.hidden = false; alt.focus({ preventScroll: true }); };
  chip.addEventListener('pointerdown', () => { lungo = false; clearTimeout(t); t = setTimeout(mostraAlt, 500); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => chip.addEventListener(ev, () => clearTimeout(t)));
  chip.addEventListener('contextmenu', (e) => { e.preventDefault(); mostraAlt(); });
  chip.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); mostraAlt(); } });
  chip.addEventListener('click', () => { if (lungo) { lungo = false; return; } altNascondi(); accendi(!L.on, mobile.matches); });
  alt.addEventListener('click', () => { impostaModo(!L.libera); altNascondi(); if (!L.on) accendi(true); chip.focus({ preventScroll: true }); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#chip-lente, #lente-alt')) altNascondi(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { altNascondi(); tip(null); } });
  m.on('movestart', () => tip(null));
  if (new URLSearchParams(location.search).get('lente') === '1') { const via = () => accendi(true); m.loaded() ? via() : m.once('load', via); }
}
if (window.AtlantePNRR) avvia(); else document.addEventListener('atlante-pronto', avvia, { once: true });
})();
