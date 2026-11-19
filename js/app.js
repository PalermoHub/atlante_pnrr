/* Atlante del PNRR: mappa dei comuni + schede collegate (Italia > regione > provincia > comune).
   Territorio (regione/provincia/comune) e filtri (missione, natura, stadio, segnalazioni) vivono nell'indirizzo
   (#/c/082053?m=M2&n=0&s=2.3.4&f=2) e si applicano insieme a mappa, scheda, tabelle e progetti. */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('it-IT', { useGrouping: 'always' });
const pct = (a, b, d = 0) => (b > 0 ? (100 * a / b).toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d }) + ' %' : '–');
const eur = (v) => {
  if (v == null) return '–'; const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toLocaleString('it-IT', { maximumFractionDigits: 2 }) + ' mld €';
  if (a >= 1e6) return (v / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' mln €';
  if (a >= 1e3) return (v / 1e3).toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' mila €';
  return nf.format(Math.round(v)) + ' €';
};
const eurAb = (v, pop) => (pop > 0 ? nf.format(Math.round(v / pop)) + ' €' : '–');
const NOMI_MIS = { M1: 'M1 Digitalizzazione, innovazione, cultura', M2: 'M2 Rivoluzione verde e transizione ecologica', M3: 'M3 Infrastrutture per la mobilità', M4: 'M4 Istruzione e ricerca', M5: 'M5 Inclusione e coesione', M6: 'M6 Salute', M7: 'M7 REPowerEU' };
/* colori delle missioni (M1–M6 come nella mappa onData/ixMaps «Universo ReGiS»; M7 scelto per distinguersi) */
const COL_MIS = { M1: '#5BBBEB', M2: '#92C151', M3: '#EA425B', M4: '#F49E4B', M5: '#B671DC', M6: '#FACB49', M7: '#8D6E63' };
const STADI = ['Da attivare', 'In corso, senza gara né lavori', 'Gara aggiudicata', 'Lavori o attività avviati', 'Concluso (stato ufficiale)', 'Misura nazionale senza progetto (N/A)'];
const FASI = [{ k: 'base', lab: 'Finanziato (con avanzamento rilevato)', set: [0, 1, 2, 3, 4] }, { k: 'agg', lab: 'Gara aggiudicata o oltre', set: [2, 3, 4] }, { k: 'lav', lab: 'Lavori / attività avviati o oltre', set: [3, 4] }, { k: 'fin', lab: 'Concluso (stato ufficiale)', set: [4] }];
const FL = { 1: 'Iter concluso, stato «in corso»', 2: 'In ritardo sulla fine prevista' };
const ESTR = '2026-06-13';

const S = { meta: null, it: null, reg: null, prov: null, com: null, bbox: null, cube: {}, map: null, indic: 'fin_pc', adatta: true, scala: 'blu', classi: 'quantili', inverti: false, breaks: [], cache: new Map(), cur: null, vals: null };
const get = async (u) => { if (!S.cache.has(u)) { S.cache.set(u, fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); })); } return S.cache.get(u); };

/* ---------- stato nell'indirizzo ---------- */
const F0 = () => ({ mis: null, nat: null, st: null, fl: null });
function parseHash() {
  const [path, qs = ''] = location.hash.split('?'); const m = path.match(/^#\/(r|p|c)\/(\w+)$/); const F = F0();
  const q = new URLSearchParams(qs);
  if (q.get('m') && /^M\d$/.test(q.get('m'))) F.mis = q.get('m');
  if (q.get('n') != null && /^\d+$/.test(q.get('n'))) F.nat = +q.get('n');
  if (q.get('s')) F.st = q.get('s').split('.').map(Number).filter((x) => x >= 0 && x <= 5);
  if (q.get('f') === '1' || q.get('f') === '2') F.fl = +q.get('f');
  return { liv: m ? m[1] : null, id: m ? m[2] : null, F };
}
function fStr(F) {
  const q = new URLSearchParams(); if (F.mis) q.set('m', F.mis); if (F.nat != null) q.set('n', F.nat); if (F.st) q.set('s', F.st.join('.')); if (F.fl) q.set('f', F.fl);
  const s = q.toString(); return s ? '?' + s : '';
}
/* Vista della mappa nell'indirizzo: parametro «v=zoom/lat/lon» accanto ai filtri; si scrive con replaceState (nessun nuovo route). */
const vistaDaHash = () => { const v = new URLSearchParams(location.hash.split('?')[1] || '').get('v'); const a = v ? v.split('/').map(Number) : []; return a.length === 3 && a.every(isFinite) && a[0] >= 0 && a[0] <= 22 && Math.abs(a[1]) <= 90 && Math.abs(a[2]) <= 180 ? a : null; };
const senzaV = (h) => { const [p, qs = ''] = h.split('?'); const q = new URLSearchParams(qs); q.delete('v'); const t = q.toString(); return t ? p + '?' + t : p; };
function scriviVista() {
  const m = S.map; if (!m || !S.cur) return; const c = m.getCenter(); const q = new URLSearchParams(location.hash.split('?')[1] || '');
  q.set('v', `${m.getZoom().toFixed(2)}/${c.lat.toFixed(4)}/${c.lng.toFixed(4)}`);
  try { history.replaceState(null, '', location.pathname + location.search + (senzaV(location.hash).split('?')[0] || '#/') + '?' + q.toString().replace(/%2F/g, '/')); } catch (e) {}
}
const href = (liv, id, F) => (liv ? `#/${liv}/${id}` : '#/') + fStr(F || S.cur?.F || F0());
const go = (liv, id, F) => { const h = href(liv, id, F); if (senzaV(location.hash) === h) route(); else location.hash = h; };
const nFiltri = (F) => (F.mis ? 1 : 0) + (F.nat != null ? 1 : 0) + (F.st ? 1 : 0) + (F.fl ? 1 : 0);
const sameSet = (a, b) => a && b.length === a.length && b.every((x) => a.includes(x));

/* ---------- cubo ---------- */
// cella = [missione, natura, stadio, segnalazioni, n, fin, fin_tot, pag, agg] (9 interi consecutivi)
const cells = (liv, id) => (liv === null ? S.cube.i.IT : S.cube[liv]?.[id]) || [];
function ok(c, o, F, ign) {
  if (F.mis && ign !== 'mis' && S.meta.missioni[c[o]] !== F.mis) return false;
  if (F.nat != null && ign !== 'nat' && c[o + 1] !== F.nat) return false;
  if (F.st && ign !== 'st' && !F.st.includes(c[o + 2])) return false;
  if (F.fl && ign !== 'fl' && !(c[o + 3] & F.fl)) return false;
  return true;
}
const Z = () => ({ n: 0, fin: 0, ft: 0, pag: 0, agg: 0 });
const add = (t, c, o) => { t.n += c[o + 4]; t.fin += c[o + 5]; t.ft += c[o + 6]; t.pag += c[o + 7]; t.agg += c[o + 8]; };
function sumCells(c, F, ign) { const t = Z(); for (let o = 0; o < c.length; o += 9) if (ok(c, o, F, ign)) add(t, c, o); return t; }
function analisi(c, F) {
  const tot = sumCells(c, F), mis = {}, nat = {}, st = [0, 1, 2, 3, 4, 5].map(Z), fl = { 1: Z(), 2: Z() };
  for (let o = 0; o < c.length; o += 9) {
    if (ok(c, o, F, 'mis')) add(mis[S.meta.missioni[c[o]]] ??= Z(), c, o);
    if (ok(c, o, F, 'nat')) add(nat[c[o + 1]] ??= Z(), c, o);
    if (ok(c, o, F, 'st')) add(st[c[o + 2]], c, o);
    if (ok(c, o, F, 'fl')) { if (c[o + 3] & 1) add(fl[1], c, o); if (c[o + 3] & 2) add(fl[2], c, o); }
  }
  const fase = FASI.map((f) => { const t = Z(); f.set.forEach((s) => { for (const k of ['n', 'fin', 'ft', 'pag', 'agg']) t[k] += st[s][k]; }); return t; });
  return { tot, mis, nat, st, fl, fase };
}

/* ---------- indicatori della mappa ---------- */
function valoriComuni(F) {
  const out = {};
  for (const id of Object.keys(S.com)) {
    const c = cells('c', id); let n = 0, fin = 0, pag = 0, conc = 0, rit = 0, chi = 0;
    const ms = new Array(S.meta.missioni.length).fill(0), mn = ms.slice();
    for (let o = 0; o < c.length; o += 9) {
      if (!ok(c, o, F)) continue; n += c[o + 4]; fin += c[o + 5]; pag += c[o + 7]; ms[c[o]] += c[o + 5]; mn[c[o]] += c[o + 4];
      if (c[o + 2] === 4) conc += c[o + 5]; if (c[o + 3] & 2) rit += c[o + 5]; if (c[o + 3] & 1) chi += c[o + 5];
    }
    let dom = null, best = 0; ms.forEach((v, i) => { if (v > best) { best = v; dom = S.meta.missioni[i]; } });
    out[id] = { n, fin, pag, conc, rit, chi, ms, mn, dom, pop: S.com[id].pop };
  }
  return out;
}
const INDIC = {
  fin_pc: { nome: 'Finanziamento PNRR per abitante (€)', f: (c) => (c.n && c.pop > 0 ? c.fin / c.pop : null), fmt: (v) => nf.format(Math.round(v)) + ' €' },
  fin: { nome: 'Finanziamento PNRR totale (€)', f: (c) => (c.n ? c.fin : null), fmt: eur },
  pag: { nome: 'Quota pagata sul finanziamento (%)', f: (c) => (c.fin > 0 ? c.pag / c.fin : null), fmt: (v) => (100 * v).toFixed(0) + ' %' },
  conc: { nome: 'Quota di importo di progetti conclusi (%)', f: (c) => (c.fin > 0 ? c.conc / c.fin : null), fmt: (v) => (100 * v).toFixed(0) + ' %' },
  rit: { nome: 'Quota di importo in ritardo sulla fine prevista (%)', f: (c) => (c.fin > 0 ? c.rit / c.fin : null), fmt: (v) => (100 * v).toFixed(0) + ' %' },
  chius: { nome: 'Quota con iter concluso ma stato «in corso» (%)', f: (c) => (c.fin > 0 ? c.chi / c.fin : null), fmt: (v) => (100 * v).toFixed(0) + ' %' },
  dom: { nome: 'Missione prevalente (per importo)', cat: true, f: (c) => (c.fin > 0 ? c.dom : null), fmt: (k) => NOMI_MIS[k] || k },
};
/* Scale colore: definite in js/tema.js (condivise con le pagine dei grafici). */
const SCALE = window.SCALE_PNRR;
const PREF = (() => { try { return JSON.parse(localStorage.getItem('atlante-pnrr-mappa') || '{}'); } catch (e) { return {}; } })();
if (SCALE[PREF.scala]) S.scala = PREF.scala;
if (['quantili', 'uguali', 'jenks'].includes(PREF.classi)) S.classi = PREF.classi;
S.inverti = !!PREF.inverti;
const salvaPref = () => { try { localStorage.setItem('atlante-pnrr-mappa', JSON.stringify({ scala: S.scala, classi: S.classi, inverti: S.inverti })); } catch (e) {} };
const ramp = () => {
  const r = SCALE[S.scala][1].slice();
  if (document.documentElement.getAttribute('data-tone') === 'dark') r.reverse();
  return S.inverti ? r.reverse() : r;
};
/* Rotture naturali (Fisher-Jenks) su un campione dei valori ordinati: k-1 soglie. */
function jenks(v, k) {
  const n0 = v.length; if (n0 <= k) return v.slice(1);
  const d = n0 > 400 ? Array.from({ length: 400 }, (_, i) => v[Math.floor((i * (n0 - 1)) / 399)]) : v;
  const n = d.length, lc = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0)), vr = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(Infinity));
  for (let j = 1; j <= k; j++) { lc[1][j] = 1; vr[1][j] = 0; }
  for (let l = 2; l <= n; l++) {
    let s1 = 0, s2 = 0, w = 0;
    for (let m = 1; m <= l; m++) {
      const i3 = l - m + 1, val = d[i3 - 1]; s2 += val * val; s1 += val; w++;
      const varc = s2 - (s1 * s1) / w, i4 = i3 - 1;
      if (i4 !== 0) for (let j = 2; j <= k; j++) if (vr[l][j] >= varc + vr[i4][j - 1]) { lc[l][j] = i3; vr[l][j] = varc + vr[i4][j - 1]; }
    }
    lc[l][1] = 1;
    let s1b = 0, s2b = 0; for (let i = 0; i < l; i++) { s1b += d[i]; s2b += d[i] * d[i]; } vr[l][1] = s2b - (s1b * s1b) / l;
  }
  const out = []; let kk = n;
  for (let j = k; j >= 2; j--) { const id = lc[kk][j] - 2; out.unshift(d[id + 1] ?? d[id]); kk = lc[kk][j] - 1; }
  return out;
}
function soglie(v, k) {
  if (!v.length) return [];
  let b = [];
  if (S.classi === 'uguali') { const a = v[0], z = v[v.length - 1]; for (let i = 1; i < k; i++) b.push(a + (i * (z - a)) / k); }
  else if (S.classi === 'jenks') b = jenks(v, k);
  else for (let i = 1; i < k; i++) b.push(v[Math.floor((i * v.length) / k)]);
  return b.filter((x, i, a) => x != null && isFinite(x) && (i === 0 || x > a[i - 1]));
}
const ambito = (liv, id) => {
  if (liv === null) return Object.keys(S.com);
  const prov = liv === 'c' ? S.com[id].pv : liv === 'p' ? id : null;
  return Object.entries(S.com).filter(([, v]) => (liv === 'r' ? v.rg === id : v.pv === prov)).map(([k]) => k);
};
/* Etichetta del territorio selezionato e dell'insieme su cui è calcolata la scala dei colori */
function terrEtichetta() {
  const { liv, id } = S.cur || {};
  if (liv === 'c') return `Comune di ${S.com[id].nm} (${S.prov[S.com[id].pv]?.sigla ?? ''})`;
  if (liv === 'p') return `Provincia di ${S.prov[id]?.nome}`;
  if (liv === 'r') return `Regione ${S.reg[id]?.nome}`;
  return 'Italia';
}
function ambitoEtichetta() {
  const { liv, id } = S.cur || {};
  if (!S.adatta || !liv) return 'tutti i comuni d’Italia';
  if (liv === 'r') return `i comuni della regione ${S.reg[id]?.nome}`;
  return `i comuni della provincia di ${S.prov[liv === 'c' ? S.com[id].pv : id]?.nome}`;
}
/* legenda chiudibile: il titolo (indicatore) resta nel <summary>, il resto nel corpo */
const setLegenda = (I, corpo) => { $('#leg-t').textContent = I.nome; $('#leg-c').innerHTML = `<div class="leg-terr">Territorio: <b>${esc(terrEtichetta())}</b><br>Fasce calcolate su: ${esc(ambitoEtichetta())}</div>` + corpo; };
function aggiornaMappa() {
  if (!S.map || !S.map.getLayer('comuni') || !S.cur || !S.cube.c) return;
  const { liv, id, F } = S.cur; S.vals = valoriComuni(F); const I = INDIC[S.indic];
  if (I.cat) { S.cls = null; S.clsMap = null; S.clsKey = null; mappaCategorie(I, F); aggiornaQuadro(); return; }
  S.map.setPaintProperty('comuni', 'fill-opacity', 0.85);
  const ids = S.adatta ? ambito(liv, id) : Object.keys(S.com);
  const v = ids.map((k) => I.f(S.vals[k])).filter((x) => x != null && isFinite(x)).sort((a, b) => a - b);
  const k = ramp().length; S.breaks = soglie(v, k); const nc = S.breaks.length + 1;
  const cls = (x) => { if (x == null || !isFinite(x)) return -1; let i = 0; while (i < S.breaks.length && x >= S.breaks[i]) i++; return i; };
  /* le classi scelte nella legenda valgono finché indicatore, scala, classi, territorio e filtri restano gli stessi */
  const chiave = [S.indic, S.adatta, S.classi, liv, id, fStr(F)].join('|'); if (chiave !== S.clsKey) { S.clsKey = chiave; S.cls = null; }
  const nessuno = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#ccc';
  const r = ramp(), expr = ['match', ['get', 'pro_com_t']], cont = new Array(nc).fill(0); S.clsMap = {}; let cnt = 0;
  for (const [cid, c] of Object.entries(S.vals)) { const i = cls(I.f(c)); if (i < 0) continue; S.clsMap[cid] = i; cont[i]++; expr.push(cid, !S.cls || S.cls.has(i) ? r[Math.min(i, k - 1)] : nessuno); cnt++; }
  expr.push(nessuno); S.map.setPaintProperty('comuni', 'fill-color', cnt ? expr : nessuno);
  const lim = (i) => `${I.fmt(i === 0 ? v[0] : S.breaks[i - 1])} – ${I.fmt(i === nc - 1 ? v[v.length - 1] : S.breaks[i])}`;
  const mio = S.cur.liv === 'c' ? S.clsMap[S.cur.id] : undefined, cn = S.cur.liv === 'c' ? S.com[S.cur.id].nm : '';
  setLegenda(I, (v.length ? `<ul class="cat">${cont.map((n, i) => `<li><button type="button" data-k="${i}" class="${S.cls?.has(i) ? 'on' : ''}${mio === i ? ' qui' : ''}" aria-pressed="${!!S.cls?.has(i)}" title="Mostra solo i comuni di questa classe"><i style="background:${r[Math.min(i, k - 1)]}"></i>${esc(lim(i))}<small>${nf.format(n)} comuni</small></button></li>`).join('')}</ul>` : '')
    + (mio !== undefined ? `<div class="leg-fascia"><b>${esc(cn)}</b>: ${esc(I.fmt(I.f(S.vals[S.cur.id])))} → fascia ${mio + 1} di ${nc}</div>` : S.cur.liv === 'c' ? `<div class="leg-fascia"><b>${esc(cn)}</b>: nessun progetto, resta grigio</div>` : '')
    + `<div class="nota-leg">${S.cls ? '<button type="button" data-k="tutte" class="tutte">Mostra tutte le classi</button> · ' : 'Clic su una classe per isolarla · '}${S.adatta ? 'scala adattata al territorio' : 'scala su tutta Italia'}${nFiltri(F) ? ' · con i filtri attivi' : ''}. Grigio: nessun progetto${S.cls ? ' o classe esclusa' : ''}.</div>`);
  aggiornaQuadro();
}
/* Modo «missione prevalente»: colore = missione con più importo nel comune, trasparenza = importo (più pieno = più finanziato) */
function mappaCategorie(I, F) {
  const nessuno = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#ccc';
  const ids = (S.adatta ? ambito(S.cur.liv, S.cur.id) : Object.keys(S.com)).filter((k) => S.vals[k]?.fin > 0);
  const ord = ids.map((k) => [k, S.vals[k].fin]).sort((a, b) => a[1] - b[1]);
  const colori = ['match', ['get', 'pro_com_t']], opac = ['match', ['get', 'pro_com_t']];
  ord.forEach(([k], i) => { colori.push(k, COL_MIS[S.vals[k].dom] || nessuno); opac.push(k, 0.4 + 0.55 * (ord.length > 1 ? i / (ord.length - 1) : 1)); });
  colori.push(nessuno); opac.push(0.85);
  S.map.setPaintProperty('comuni', 'fill-color', ord.length ? colori : nessuno);
  S.map.setPaintProperty('comuni', 'fill-opacity', ord.length ? opac : 0.85);
  const tot = {}; ord.forEach(([k]) => { const d = S.vals[k].dom; tot[d] = (tot[d] || 0) + 1; });
  const dom = S.cur.liv === 'c' && S.vals[S.cur.id]?.fin > 0 ? S.vals[S.cur.id].dom : null, cn = S.cur.liv === 'c' ? S.com[S.cur.id].nm : '';
  setLegenda(I, `<ul class="cat">${S.meta.missioni.map((k) => `<li><button type="button" data-f="mis" data-v="${k}" class="${F.mis === k ? 'on' : ''}${dom === k ? ' qui' : ''}" aria-pressed="${F.mis === k}" title="Filtra per ${esc(NOMI_MIS[k])}"><i style="background:${COL_MIS[k]}"></i>${esc(NOMI_MIS[k])}<small>${nf.format(tot[k] || 0)} comuni</small></button></li>`).join('')}</ul>
   <div class="nota-leg">Trasparenza: più il colore è pieno, più il comune ha finanziamento${nFiltri(F) ? ' · con i filtri attivi' : ''}. Grigio: nessun progetto.</div>`);
}
/* Contatori sul riquadro visibile: comuni, progetti, importo e quota per missione (clic = filtro) */
function aggiornaQuadro() {
  const m = S.map, box = $('#quadro'); if (!m || !box || !S.vals || !m.getLayer('comuni')) return;
  const ids = new Set(); for (const f of m.queryRenderedFeatures({ layers: ['comuni'] })) { const i = f.properties.pro_com_t; if (S.vals[i] && (!S.cls || S.cls.has(S.clsMap?.[i]))) ids.add(i); }
  let n = 0, fin = 0, nc = 0; const ms = new Array(S.meta.missioni.length).fill(0);
  ids.forEach((i) => { const c = S.vals[i]; if (c.n) { nc++; n += c.n; fin += c.fin; c.ms.forEach((v, j) => { ms[j] += v; }); } });
  $('#q-t').innerHTML = `<span class="q-terr">${esc(terrEtichetta())}</span> · nel riquadro: <b>${nf.format(nc)}</b> comuni · <b>${nf.format(n)}</b> progetti · <b>${eur(fin)}</b>`;
  const F = S.cur?.F || F0();
  $('#q-l').innerHTML = fin > 0 ? S.meta.missioni.map((mk, j) => [mk, ms[j]]).filter(([, v]) => v > 0).sort((a, b2) => b2[1] - a[1]).map(([mk, v]) => `<li><button type="button" data-f="mis" data-v="${mk}" class="${F.mis === mk ? 'on' : ''}" aria-pressed="${F.mis === mk}" title="Filtra per ${esc(NOMI_MIS[mk])}"><span class="qn"><i style="background:${COL_MIS[mk]}"></i>${esc(mk)}</span><span class="qb"><span style="width:${(100 * v / fin).toFixed(1)}%;background:${COL_MIS[mk]}"></span></span><span class="qv">${pct(v, fin)}</span></button></li>`).join('') : '<li class="vuoto">Nessun progetto nel riquadro.</li>';
}
const NESSUNO = ['==', ['get', 'pro_com_t'], '__nessuno__'];
function evidenzia(liv, id, noFit) {
  const m = S.map; if (!m || !m.getLayer('vela')) return;
  const eq = liv === 'c' ? ['get', 'pro_com_t'] : liv === 'p' ? ['slice', ['get', 'pro_com_t'], 0, 3] : ['to-string', ['get', 'cod_reg']];
  m.setFilter('vela', liv ? ['!=', eq, id] : NESSUNO); m.setFilter('contorno', liv ? ['==', eq, id] : NESSUNO);
  m.setPaintProperty('contorno', 'line-width', liv === 'c' ? 2 : 0.6);
  if (noFit) return;
  const b = liv ? S.bbox[liv][id] : ITALIA;
  if (b) m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 30, duration: 600, maxZoom: 11 });
}
/* Mappa di base OpenFreeMap (gratuita, senza chiave): «positron» per i toni chiari, «dark» per gli scuri. */
const ITALIA = [6.6, 35.5, 18.6, 47.1];
const STILI = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
const tono = () => (document.documentElement.getAttribute('data-tone') === 'dark' ? 'dark' : 'light');
/* Limite di spostamento automatico: l'estensione dell'Italia allargata del 30% per lato, così si vede anche un po' di mare e di confine. */
const limiti = () => { const [w, s, e, n] = ITALIA, dx = (e - w) * 0.3, dy = (n - s) * 0.3; return [[w - dx, s - dy], [e + dx, n + dy]]; };
class HomeControl {
  onAdd(m) {
    this.m = m; const d = this.d = document.createElement('div'); d.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    d.innerHTML = '<button type="button" class="ctrl-home" title="Tutta Italia" aria-label="Zoom su tutta Italia"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 10v10h4.5v-6h4v6h4.5V10" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    d.firstChild.addEventListener('click', () => m.fitBounds([[ITALIA[0], ITALIA[1]], [ITALIA[2], ITALIA[3]]], { padding: 30, duration: 600 }));
    return d;
  }
  onRemove() { this.d.remove(); }
}
class LogoControl {
  onAdd() {
    const d = this.d = document.createElement('div'); d.className = 'maplibregl-ctrl ctrl-logo';
    d.innerHTML = '<a href="https://opendatasicilia.it/" target="_blank" rel="noopener" title="https://opendatasicilia.it/"><img src="img/opendatasicilia.png" alt="OpenDataSicilia" width="44" height="51"></a>';
    return d;
  }
  onRemove() { this.d.remove(); }
}
function aggiungiLivelli(m, url) {
  const st = getComputedStyle(document.documentElement);
  /* i livelli dei comuni stanno sotto le etichette della mappa di base, che restano leggibili */
  const prima = (m.getStyle().layers.find((l) => l.type === 'symbol') || {}).id;
  m.addSource('c', { type: 'vector', url: 'pmtiles://' + url, attribution: 'Confini: ISTAT/ANNCSU · Dati: Italia Domani (CC-BY 4.0)' });
  m.addLayer({ id: 'comuni', type: 'fill', source: 'c', 'source-layer': 'comuni', paint: { 'fill-color': '#ccc', 'fill-opacity': 0.85 } }, prima);
  m.addLayer({ id: 'bordi', type: 'line', source: 'c', 'source-layer': 'comuni', minzoom: 7, paint: { 'line-color': st.getPropertyValue('--surface'), 'line-width': 0.4 } }, prima);
  m.addLayer({ id: 'vela', type: 'fill', source: 'c', 'source-layer': 'comuni', filter: NESSUNO, paint: { 'fill-color': st.getPropertyValue('--bg'), 'fill-opacity': 0.7 } }, prima);
  m.addLayer({ id: 'contorno', type: 'line', source: 'c', 'source-layer': 'comuni', filter: NESSUNO, paint: { 'line-color': '#e8590c', 'line-width': 1.6 } }, prima);
}
function creaMappa() {
  const proto = new pmtiles.Protocol(); maplibregl.addProtocol('pmtiles', proto.tile);
  S.tonoMappa = tono();
  const m = new maplibregl.Map({ container: 'map', style: STILI[S.tonoMappa], bounds: [[ITALIA[0], ITALIA[1]], [ITALIA[2], ITALIA[3]]], maxBounds: limiti(), attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxPitch: 0, pitch: 0, bearing: 0 });
  m.touchZoomRotate.disableRotation(); m.touchPitch.disable(); m.keyboard.disableRotation();
  S.map = m; m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right'); m.addControl(new HomeControl(), 'top-right'); m.addControl(new LogoControl(), 'bottom-right');
  /* le info sulla mappa (attribuzioni) partono chiuse: si apre solo con l'icona i */
  const chiudiInfo = () => { const a = m.getContainer().querySelector('.maplibregl-ctrl-attrib'); if (a) { a.classList.remove('maplibregl-compact-show'); a.removeAttribute('open'); } };
  chiudiInfo(); m.on('load', chiudiInfo);
  const url = new URL('data/geo/comuni.pmtiles', location.href).href;
  /* «style.load» scatta al primo caricamento e a ogni cambio di stile (tema chiaro/scuro): i livelli si riaggiungono sempre */
  m.on('style.load', () => {
    if (!S.avviata) { S.avviata = true; m.resize(); if (S.vista0) m.jumpTo({ zoom: S.vista0[0], center: [S.vista0[2], S.vista0[1]] }); else m.fitBounds([[ITALIA[0], ITALIA[1]], [ITALIA[2], ITALIA[3]]], { padding: 30, duration: 0 }); S.vista0 = null; }
    aggiungiLivelli(m, url);
    if (S.cur) { evidenzia(S.cur.liv, S.cur.id, true); aggiornaMappa(); }
  });
  m.on('moveend', scriviVista);
  m.on('idle', () => aggiornaQuadro());
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; $('#map').append(tip);
  m.on('mousemove', 'comuni', (e) => {
    const f = e.features[0]; if (!f || !S.vals) return; const id = f.properties.pro_com_t; const c = S.vals[id]; if (!c) return;
    m.getCanvas().style.cursor = 'pointer'; tip.hidden = false; tip.style.left = e.point.x + 12 + 'px'; tip.style.top = e.point.y + 12 + 'px';
    const v = INDIC[S.indic].f(c), cm = S.com[id];
    const mis = Object.entries(analisi(cells('c', id), S.cur.F).mis).filter(([, t]) => t.fin > 0).sort((a, b) => b[1].fin - a[1].fin);
    tip.innerHTML = `<b class="tip-nome">${esc(cm.nm)}</b><br><span class="tip-geo">${esc(S.prov[cm.pv]?.nome || '')} · ${esc(S.reg[cm.rg]?.nome || '')}</span><br><span class="tip-ind">${esc(INDIC[S.indic].nome.replace(/ \(.*/, ''))}: ${v == null ? 'nessun progetto' : INDIC[S.indic].fmt(v)}</span>`
      + (mis.length ? `<table class="tip-mis"><caption>Finanziato per missione</caption>${mis.map(([k, t]) => `<tr><td>${esc(NOMI_MIS[k] || k)}</td><td>${eur(t.fin)}</td></tr>`).join('')}</table>` : '');
  });
  m.on('mouseleave', 'comuni', () => { tip.hidden = true; m.getCanvas().style.cursor = ''; });
  m.on('click', 'comuni', (e) => { const f = e.features[0]; if (f && S.com[f.properties.pro_com_t]) go('c', f.properties.pro_com_t, S.cur?.F); });
}

/* ---------- filtri territoriali (a cascata e interconnessi) ---------- */
const byName = (a, b) => a[1].localeCompare(b[1], 'it');
function riempiFiltri(liv, id) {
  const c = liv === 'c' ? S.com[id] : null; const p = liv === 'p' ? S.prov[id] : null;
  const reg = liv === 'r' ? id : c ? c.rg : p ? p.reg : ''; const prov = liv === 'p' ? id : c ? c.pv : ''; const com = liv === 'c' ? id : '';
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
  $('#f-reg').innerHTML = opt('', 'Tutte le regioni', !reg) + Object.entries(S.reg).map(([k, v]) => [k, v.nome]).sort(byName).map(([k, n]) => opt(k, n, k === reg)).join('');
  $('#f-prov').innerHTML = opt('', reg ? 'Tutte le province' : 'Tutte le province', !prov) + Object.entries(S.prov).filter(([, v]) => !reg || v.reg === reg).map(([k, v]) => [k, `${v.nome} (${v.sigla})`]).sort(byName).map(([k, n]) => opt(k, n, k === prov)).join('');
  $('#f-com').innerHTML = opt('', 'Tutti i comuni', !com) + Object.entries(S.com).filter(([, v]) => (!prov || v.pv === prov) && (!reg || v.rg === reg)).map(([k, v]) => [k, v.nm]).sort(byName).map(([k, n]) => opt(k, n, k === com)).join('');
}
function filtriInit() {
  $('#f-reg').addEventListener('change', (e) => go(e.target.value ? 'r' : null, e.target.value || null, S.cur.F));
  $('#f-prov').addEventListener('change', (e) => { const v = e.target.value; const reg = $('#f-reg').value; go(v ? 'p' : reg ? 'r' : null, v || reg || null, S.cur.F); });
  $('#f-com').addEventListener('change', (e) => { const v = e.target.value; const prov = $('#f-prov').value, reg = $('#f-reg').value; go(v ? 'c' : prov ? 'p' : reg ? 'r' : null, v || prov || reg || null, S.cur.F); });
  $('#f-reset').addEventListener('click', () => go(null, null, F0()));
  $('#f-adatta').addEventListener('change', (e) => { S.adatta = e.target.checked; aggiornaMappa(); });
  for (const sel of ['#legenda', '#quadro']) $(sel).addEventListener('click', (e) => { const b = e.target.closest('button[data-f="mis"]'); if (b && S.cur) { toggle('mis', b.dataset.v); return; }
    const c = e.target.closest('button[data-k]'); if (!c) return; const k = c.dataset.k;
    if (k === 'tutte') S.cls = null; else { const n = new Set(S.cls || []); n.has(+k) ? n.delete(+k) : n.add(+k); S.cls = n.size ? n : null; }
    aggiornaMappa(); });
  $('#indic').innerHTML = Object.entries(INDIC).map(([k, v]) => `<option value="${k}">${esc(v.nome)}</option>`).join('');
  $('#indic').addEventListener('change', (e) => { S.indic = e.target.value; aggiornaMappa(); evidenziaIndicatore(); });
  $('#f-scala').innerHTML = Object.entries(SCALE).map(([k, v]) => `<option value="${k}">${esc(v[0])}</option>`).join('');
  $('#f-scala').value = S.scala; $('#f-classi').value = S.classi; $('#f-inverti').checked = S.inverti;
  $('#f-scala').addEventListener('change', (e) => { S.scala = e.target.value; salvaPref(); window.applicaScalaPNRR(S.scala); });
  $('#f-classi').addEventListener('change', (e) => { S.classi = e.target.value; salvaPref(); aggiornaMappa(); });
  $('#f-inverti').addEventListener('change', (e) => { S.inverti = e.target.checked; salvaPref(); aggiornaMappa(); });
}

/* ---------- navigazione ---------- */
const nodo = (liv, id) => (liv === 'r' ? S.reg[id] : liv === 'p' ? S.prov[id] : liv === 'c' ? S.com[id] : S.it);
function genitori(liv, id) {
  const out = [{ liv: null, id: null, nome: 'Italia' }];
  if (liv === 'c') { const c = S.com[id]; out.push({ liv: 'r', id: c.rg, nome: S.reg[c.rg]?.nome }, { liv: 'p', id: c.pv, nome: S.prov[c.pv]?.nome }); }
  if (liv === 'p') { const p = S.prov[id]; out.push({ liv: 'r', id: p.reg, nome: S.reg[p.reg]?.nome }); }
  return out;
}
async function route() {
  if (!S.it || !S.cube.i) return;
  const { liv, id, F } = parseHash();
  if (liv && !nodo(liv, id)) { location.hash = '#/'; return; }
  S.cur = { liv, id, F }; const n = nodo(liv, id); const nome = liv === 'c' ? n.nm : n.nome;
  const g = liv ? genitori(liv, id) : [];
  $('#crumbs').innerHTML = g.map((x) => `<a href="${href(x.liv, x.id, F)}">${esc(x.nome)}</a><span class="sep">›</span>`).join('') + `<span class="cur">${esc(liv ? nome : 'Italia')}</span>`;
  document.title = (liv ? nome + ' · ' : '') + 'Atlante del PNRR';
  riempiFiltri(liv, id); $('#f-reset').disabled = !liv && !nFiltri(F);
  evidenzia(liv, id); aggiornaMappa();
  let det = n; if (liv === 'c') det = { ...n, ...(await get(`data/comuni/${id}.json`).catch(() => ({}))) };
  if (S.cur.liv !== liv || S.cur.id !== id) return;
  disegnaScheda(liv, id, det, nome, F); $('#scheda').scrollTop = 0;
}

/* ---------- scheda ---------- */
const nomiNat = () => S.meta.nature.map((n) => n.charAt(0) + n.slice(1).toLowerCase());
function chips(F) {
  const l = [];
  if (F.mis) l.push(['mis', NOMI_MIS[F.mis] || F.mis]); if (F.nat != null) l.push(['nat', nomiNat()[F.nat]]);
  if (F.st) l.push(['st', FASI.find((f) => sameSet(F.st, f.set))?.lab || F.st.map((s) => STADI[s]).join(' + ')]); if (F.fl) l.push(['fl', FL[F.fl]]);
  if (!l.length) return '<p class="nota filtri-hint">Clic su una missione, uno stadio, un tipo di intervento o un avviso per filtrare tutto (mappa, schede, elenchi) a qualunque scala territoriale.</p>';
  return `<div class="chips" role="group" aria-label="Filtri attivi">${l.map(([k, t]) => `<button type="button" class="chip" data-x="${k}" title="Rimuovi il filtro">${esc(t)} <span aria-hidden="true">×</span></button>`).join('')}<button type="button" class="chip azzera" data-x="all">Reset filtri</button></div>`;
}
const riga = (lab, n, v, tot, attr, att, extra = '') => `<div class="riga cl${att ? ' on' : ''}" role="button" tabindex="0" aria-pressed="${!!att}" ${attr}><span>${lab}</span><div class="barra"><i style="width:${tot > 0 ? Math.max(0.5, 100 * v / tot) : 0}%"></i></div><span class="v">${extra || eur(v)}${n != null ? ` · ${nf.format(n)}` : ''}</span></div>`;

function figli(liv, id) {
  if (liv === null) return { tit: 'Regioni', lista: Object.entries(S.reg).map(([k, v]) => ({ ...v, id: k, liv: 'r' })) };
  if (liv === 'r') return { tit: 'Province', lista: Object.entries(S.prov).filter(([, v]) => v.reg === id).map(([k, v]) => ({ ...v, id: k, liv: 'p' })) };
  if (liv === 'p') return { tit: 'Comuni', lista: Object.entries(S.com).filter(([, v]) => v.pv === id).map(([k, v]) => ({ ...v, id: k, liv: 'c', nome: v.nm })) };
  return null;
}
function posizione(liv, id, n, F) {
  if (!liv) return '';
  const lista = liv === 'r' ? Object.keys(S.reg) : liv === 'p' ? Object.keys(S.prov).filter((k) => S.prov[k].reg === n.reg) : Object.keys(S.com).filter((k) => S.com[k].pv === n.pv);
  const val = (k) => { const nd = nodo(liv, k); const t = sumCells(cells(liv, k), F); return nd.pop > 0 && t.n ? t.fin / nd.pop : -1; };
  const ord = lista.map((k) => [k, val(k)]).sort((a, b) => b[1] - a[1]); const pos = ord.findIndex(([k]) => k === id) + 1;
  const amb = liv === 'r' ? 'tra le regioni' : liv === 'p' ? `tra le province di ${S.reg[n.reg]?.nome}` : `tra i comuni della provincia di ${S.prov[n.pv]?.nome}`;
  return `<p class="nota">Per finanziamento per abitante${nFiltri(F) ? ' (con i filtri attivi)' : ''} è al <b>${pos}° posto</b> su ${ord.length} ${amb}.</p>`;
}

function disegnaScheda(liv, id, n, nome, F) {
  const A = analisi(cells(liv, id), F), T = A.tot, nfil = nFiltri(F);
  const livNome = { null: 'Italia', r: 'Regione', p: 'Provincia', c: 'Comune' }[liv];
  const sp = nome + (liv === 'c' ? ` (${S.prov[n.pv]?.sigla ?? ''})` : liv === 'p' ? ` (${n.sigla ?? ''})` : '');
  const base = A.fase[0];
  let h = `<h1>${esc(sp)}</h1><p class="sotto">${livNome} · ${n.pop ? nf.format(n.pop) + ' abitanti (ISTAT 1/1/2026)' : ''} · estrazione del 13/06/2026</p>${chips(F)}`;
  h += `<div class="kpi">
   <div><b>${eur(T.fin)}</b><span>Finanziamento PNRR${nfil ? ' (filtrato)' : ' dei progetti'}</span><em>${nf.format(T.n)} progetti</em></div>
   <div><b>${n.pop ? eurAb(T.fin, n.pop) : '–'}</b><span>per abitante</span></div>
   <div><b>${pct(T.pag, T.fin)}</b><span>pagato (${eur(T.pag)})</span><em>pagamenti / finanziamento PNRR</em></div>
   <div><b>${pct(A.fase[3].fin, base.fin)}</b><span>importo dei progetti conclusi</span><em>${nf.format(A.fase[3].n)} progetti · su quelli con avanzamento rilevato</em></div></div>`;
  h += posizione(liv, id, n, F);
  h += '<div id="analisi"></div>';
  /* imbuto: ogni riga è un filtro sullo stadio */
  h += `<h2>Dal finanziamento alla fine dei lavori <small>clic per filtrare</small></h2><div class="imbuto">`;
  FASI.forEach((f, i) => { h += riga(f.lab, A.fase[i].n, A.fase[i].fin, base.fin, `data-f="st" data-v="${f.set.join('.')}"`, sameSet(F.st, f.set)); });
  h += riga('Pagato', null, base.pag, base.fin, '', false) + `</div>`;
  if (A.st[5].fin > 0 || F.st?.includes(5)) h += `<div class="imbuto" style="margin-top:.5rem">${riga('Misure nazionali senza progetto (N/A)', A.st[5].n, A.st[5].fin, T.fin, 'data-f="st" data-v="5"', sameSet(F.st, [5]))}</div><p class="nota">Ecobonus e Transizione 4.0: misure a erogazione, pagate per intero, senza avanzamento per progetto. Sono fuori dall'imbuto.</p>`;
  h += `<p class="nota">Ogni progetto è nello stadio più avanzato raggiunto; le righe sono cumulative. «Concluso» è lo stato ufficiale di ReGiS, non dedotto dalle date. Importo aggiudicato nelle gare collegate: ${eur(T.agg)} (somma, tutte le fonti di finanziamento: non confrontabile con il solo finanziamento PNRR).</p>`;
  for (const k of [1, 2]) { const t = A.fl[k]; if (t.n > 0 || F.fl === k) h += `<div class="avviso${k === 2 ? ' alert' : ''} cl${F.fl === k ? ' on' : ''}" role="button" tabindex="0" aria-pressed="${F.fl === k}" data-f="fl" data-v="${k}">${k === 1 ? `Chiusura da formalizzare: <b>${nf.format(t.n)}</b> progetti (${eur(t.fin)}) hanno l'iter già concluso ma sono ancora «in corso». Non sono contati come conclusi.` : `In ritardo alla data di estrazione: <b>${nf.format(t.n)}</b> progetti (${eur(t.fin)}, ${pct(t.fin, T.fin)}) risultavano «in corso» con fine prevista anteriore al 13/06/2026. La fine del programma era il 30/06/2026: alcuni si saranno chiusi nel frattempo.`} <small>Clic per ${F.fl === k ? 'togliere il filtro' : 'filtrare'}.</small></div>`; }
  /* missioni */
  const mk = S.meta.missioni;
  /* dotazione ufficiale: esiste solo per l'Italia intera, quindi le colonne in più compaiono solo lì e senza filtri */
  const dot = liv === null && !nfil ? S.ver?.per_missione : null;
  const mt = Math.max(1, ...mk.map((k) => Math.max(A.mis[k]?.fin || 0, dot?.[k]?.dotazione || 0)));
  const bar = (m, k) => { const w = (v) => Math.max(0, 90 * v / mt).toFixed(1); const sp = dot?.[k] ? Math.max(0, dot[k].dotazione - m.fin) : 0; return `<span class="tri" role="img" aria-label="pagato ${eur(m.pag)}, su progetti non ancora pagato ${eur(Math.max(0, m.fin - m.pag))}${dot ? `, senza progetto ${eur(sp)}` : ''}"><i class="tp" style="width:${w(m.pag)}px"></i><i class="tf" style="width:${w(Math.max(0, m.fin - m.pag))}px"></i>${dot ? `<i class="ts" style="width:${w(sp)}px"></i>` : ''}</span>`; };
  h += `<h2>Per missione <small>clic per filtrare</small></h2><table><thead><tr><th>Missione</th><th class="n">Progetti</th>${dot ? '<th class="n" title="Importo della misura nel file «Spesa per misura»">Dotazione</th>' : ''}<th class="n">Finanziamento</th>${dot ? '<th class="n" title="Dotazione non ancora assegnata a progetti">Senza progetto</th>' : ''}<th class="n">Pagato</th><th></th></tr></thead><tbody>${mk.filter((k) => A.mis[k] || F.mis === k).map((k) => { const m = A.mis[k] || Z(); const d = dot?.[k]; return `<tr class="cl${F.mis === k ? ' on' : ''}" role="button" tabindex="0" aria-pressed="${F.mis === k}" data-f="mis" data-v="${k}"><td>${esc(NOMI_MIS[k] || k)}</td><td class="n">${nf.format(m.n)}</td>${dot ? `<td class="n">${d ? eur(d.dotazione) : '–'}</td>` : ''}<td class="n">${eur(m.fin)}</td>${dot ? `<td class="n">${d ? (d.dotazione >= m.fin ? eur(d.dotazione - m.fin) : '−' + eur(m.fin - d.dotazione)) : '–'}</td>` : ''}<td class="n">${pct(m.pag, m.fin)}</td><td>${bar(m, k)}</td></tr>`; }).join('')}</tbody></table><p class="nota">Barra: verde pagato, giallo già su progetti ma non ancora pagato${dot ? ', grigio senza progetto nei dati (dotazione al 30/04/2026, progetti al 13/06/2026). «−» = progetti oltre la dotazione' : ''}. Il motivo del mancato utilizzo non è nei dati ufficiali.</p>`;
  /* natura */
  const nat = nomiNat().map((nm, i) => [nm, i, A.nat[i] || Z()]).filter((x) => x[2].fin > 0 || F.nat === x[1]).sort((a, b) => b[2].fin - a[2].fin);
  const nt = Math.max(1, ...nat.map((x) => x[2].fin));
  h += `<h2>Che cosa è stato finanziato <small>clic per filtrare</small></h2><div class="imbuto">${nat.map(([nm, i, t]) => riga(esc(nm), t.n, t.fin, nt, `data-f="nat" data-v="${i}"`, F.nat === i)).join('')}</div>`;
  /* concentrazione e qualità: solo senza filtri (non ricostruibili dal cubo) */
  if (!nfil && n.conc) {
    const conc = n.conc;
    h += `<h2>Chi realizza <small>soggetti attuatori</small></h2><p class="nota">Il primo attuatore ha il ${(100 * conc.top1).toFixed(0)} % dell'importo, i primi cinque il ${(100 * conc.top5).toFixed(0)} % (indice di Herfindahl ${conc.hhi.toFixed(3)}; 0 = molto frammentato, 1 = un solo soggetto).</p><table><tbody>${conc.top.map((t) => `<tr><td>${esc(t[0])}</td><td class="n">${nf.format(t[2])} progetti</td><td class="n">${eur(t[1])}</td><td class="n">${pct(t[1], T.fin)}</td></tr>`).join('')}</tbody></table>`;
    if (liv !== 'c' && n.liv) {
      const nomi = ['a livello di comune', 'solo provincia', 'solo regione', 'senza localizzazione (ambito nazionale)']; const lt = n.liv.reduce((a, b) => a + b, 0);
      h += `<h2>Qualità dei dati <small>a che livello è nota la localizzazione</small></h2><div class="imbuto">${n.liv.map((v, i) => riga(nomi[i], null, v, lt, '', false)).join('')}</div><p class="nota">La quota che non arriva al livello di comune non compare sulla mappa. Gli importi dei progetti localizzati su più territori sono ripartiti secondo la percentuale dichiarata (nessun doppio conteggio).</p>`;
    }
  } else if (nfil) h += `<p class="nota">Le sezioni «Chi realizza» e «Qualità dei dati» si vedono senza filtri attivi.</p>`;
  if (liv === 'c') h += `<p class="nota">Gli importi dei progetti localizzati solo a livello di provincia, regione o nazionale non compaiono nelle schede dei comuni: vedi la scheda di provincia, regione e Italia.</p>`;
  /* figli */
  const FG = figli(liv, id);
  if (FG) { S.F = FG; h += `<h2>${FG.tit} <small>clic su una riga per aprire la scheda · i filtri restano attivi</small></h2><div class="filtri"><input id="f-q" type="search" placeholder="Cerca per nome" aria-label="Cerca per nome"></div><div id="tab-figli"></div>`; }
  if (liv === 'c') h += `<h2>Progetti nel comune <small id="p-cnt"></small></h2><div class="filtri"><input id="p-q" type="search" placeholder="Cerca titolo o soggetto attuatore" aria-label="Cerca nei progetti"><button id="p-csv" type="button">Scarica CSV (filtrati)</button><button id="p-csv-tutti" type="button">Scarica tutti i dati del comune</button></div><p class="filtri-hint" id="p-nota"></p><div id="tab-prog"></div>`;
  h += `<p class="nota" style="margin-top:2rem">Fonte: Italia Domani, Catalogo Open Data (CC-BY 4.0), estrazione del 13/06/2026 · confini comunali ISTAT/ANNCSU. Importi in euro correnti. <a href="#" id="l-metodo">Metodo e limiti</a> · <a href="#" id="l-fonti">Fonti</a>.</p>`;
  $('#scheda').innerHTML = h;
  $('#l-metodo').addEventListener('click', (e) => { e.preventDefault(); apriInfo('metodo'); });
  $('#l-fonti').addEventListener('click', (e) => { e.preventDefault(); apriInfo('fonti'); });
  try { analisiScheda(liv, id, n, nome, F, A); evidenziaIndicatore(); } catch (err) { console.error('analisi', err); }
  if (FG) { const q = $('#f-q'); const draw = () => tabFigli(FG, q.value, F); q.addEventListener('input', draw); draw(); }
  if (liv === 'c') iniziaProgetti(n, nome, F);
}

/* ---------- analisi con grafici nella scheda (stessa lettura della pagina Statistiche) ---------- */
const RIPCOL = { 'Nord-ovest': '--c1', 'Nord-est': '--c2', Centro: '--c3', Sud: '--c4', Isole: '--c5' };
const mediana = (a) => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };
const q0 = (v, d = 0) => (100 * v).toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d }) + '%';
function metriche(liv, id, pop, F) {
  const A = analisi(cells(liv, id), F), T = A.tot;
  return { A, pc: pop > 0 && T.n ? T.fin / pop : null, pag: T.fin > 0 ? T.pag / T.fin : null, conc: A.fase[0].fin > 0 ? A.fase[3].fin / A.fase[0].fin : null, rit: T.fin > 0 ? A.fl[2].fin / T.fin : null };
}
function valoriC(F) { const k = fStr(F); if (S.vc?.k !== k) S.vc = { k, v: valoriComuni(F) }; return S.vc.v; }
function concPerMis(c, F) { const o2 = {}; for (let o = 0; o < c.length; o += 9) if (ok(c, o, F, 'mis') && c[o + 2] === 4) o2[S.meta.missioni[c[o]]] = (o2[S.meta.missioni[c[o]]] || 0) + c[o + 5]; return o2; }

/* grafici della scheda che mostrano lo stesso indicatore del menu «Colora per» */
const IND_FIG = { 'Euro per abitante': 'fin_pc', 'Per missione': 'fin', 'Quota pagata': 'pag', 'Importo concluso': 'conc', 'Importo dei progetti conclusi': 'conc', 'Importo in ritardo': 'rit' };
function evidenziaIndicatore() {
  document.querySelectorAll('#analisi .grafico[data-ind]').forEach((f) => {
    const on = f.dataset.ind === S.indic; f.classList.toggle('ind-attivo', on);
    f.title = on ? 'È l’indicatore con cui è colorata la mappa («Colora per»)' : '';
  });
}
function analisiScheda(liv, id, n, nome, F, A) {
  const host = $('#analisi'); if (!host) return; host.replaceChildren();
  const G = window.GraficiPNRR; const T = A.tot;
  const mk = (t, a = {}, k = []) => { const e = document.createElement(t); for (const x in a) if (a[x] != null) (x === 'text' ? (e.textContent = a[x]) : e.setAttribute(x, a[x])); [].concat(k).forEach((c) => c != null && e.append(c.nodeType ? c : document.createTextNode(c))); return e; };
  if (!G || !T.n) { host.append(mk('p', { class: 'nota', text: T.n ? '' : 'Nessun progetto localizzato qui con i filtri attivi: non ci sono grafici da mostrare.' })); return; }
  const fig = (box, titolo, sub, corpo, nota) => { const f = mk('figure', { class: 'grafico', 'data-ind': IND_FIG[titolo] }, [mk('figcaption', {}, [mk('b', { text: titolo }), sub ? mk('small', { text: sub }) : null])]); box.append(f); corpo(f); if (nota) f.append(mk('p', { class: 'grafico-nota', text: nota })); };
  const blocco = (titolo, sub) => { host.append(mk('h2', {}, [titolo, sub ? mk('small', { text: sub }) : null])); const b = mk('div', { class: 'grafici' }); host.append(b); return b; };
  const tip = G.conTip, pop = n.pop || 0;
  const me = metriche(liv, id, pop, F), IT = metriche(null, null, S.it.pop, F);
  const prov = liv === 'c' ? S.prov[n.pv] : null, regn = liv === 'c' ? S.reg[n.rg] : liv === 'p' ? S.reg[n.reg] : null;
  const ctx = [{ nome: liv === 'c' ? 'Questo comune' : liv === 'p' ? 'Questa provincia' : liv === 'r' ? 'Questa regione' : 'Italia', m: me, mio: true }];
  if (liv === 'c') ctx.push({ nome: 'Provincia', sub: prov?.nome, m: metriche('p', n.pv, prov?.pop, F) });
  if (liv === 'c') ctx.push({ nome: 'Regione', sub: regn?.nome, m: metriche('r', n.rg, regn?.pop, F) });
  if (liv === 'p') ctx.push({ nome: 'Regione', sub: regn?.nome, m: metriche('r', n.reg, regn?.pop, F) });
  if (liv) ctx.push({ nome: 'Italia', m: IT });

  /* --- sintesi in parole --- */
  const dif = (a, b) => (b > 0 && a != null ? (a / b - 1) : null);
  const righe = [];
  if (liv && me.pc != null && IT.pc) { const d = dif(me.pc, IT.pc); righe.push(`Per abitante: ${nf.format(Math.round(me.pc))} € contro ${nf.format(Math.round(IT.pc))} € della media italiana (${d >= 0 ? '+' : '−'}${q0(Math.abs(d))}).`); }
  if (me.pag != null) righe.push(`Pagato il ${q0(me.pag)} del finanziamento${liv && IT.pag != null ? ` (Italia ${q0(IT.pag)})` : ''}; concluso il ${q0(me.conc ?? 0)} dell'importo con avanzamento rilevato${liv && IT.conc != null ? ` (Italia ${q0(IT.conc)})` : ''}.`);
  if (me.rit != null && me.rit > 0) righe.push(`In ritardo sulla fine prevista alla data di estrazione: ${q0(me.rit)} dell'importo${liv && IT.rit != null ? ` (Italia ${q0(IT.rit)})` : ''}.`);
  const mm = Object.entries(A.mis).sort((a, b) => b[1].fin - a[1].fin)[0]; if (mm) righe.push(`La missione più grande è ${NOMI_MIS[mm[0]] || mm[0]}: ${q0(mm[1].fin / T.fin)} dell'importo.`);
  const natm = Object.entries(A.nat).sort((a, b) => b[1].fin - a[1].fin)[0]; if (natm) righe.push(`Il tipo di intervento più pesante è «${nomiNat()[natm[0]].toLowerCase()}» (${q0(natm[1].fin / T.fin)}).`);

  /* --- comuni dell'ambito, per posizione e dispersione --- */
  let amb = null, ambNome = '';
  if (liv === 'r' || liv === 'p' || liv === 'c') {
    const V = valoriC(F), chiave = liv === 'r' ? ['rg', id] : liv === 'p' ? ['pv', id] : ['rg', n.rg];
    ambNome = liv === 'c' ? `comuni della regione ${regn?.nome}` : liv === 'p' ? `comuni della provincia di ${n.nome}` : `comuni della regione ${n.nome}`;
    amb = Object.keys(S.com).filter((k) => S.com[k][chiave[0]] === chiave[1]).map((k) => ({ k, nome: S.com[k].nm, pop: S.com[k].pop, pc: V[k].n && S.com[k].pop > 0 ? V[k].fin / S.com[k].pop : null })).filter((x) => x.pc > 0 && x.pop > 0);
  }
  if (liv === 'c' && me.pc != null) {
    const tutti = Object.keys(S.com).map((k) => { const v = valoriC(F)[k]; return v.n && S.com[k].pop > 0 ? v.fin / S.com[k].pop : null; }).filter((x) => x != null);
    const sotto = tutti.filter((x) => x < me.pc).length; righe.push(`Tra i ${nf.format(tutti.length)} comuni italiani con progetti è al ${Math.round(100 * sotto / tutti.length)}° percentile per euro per abitante (il 50° è la mediana: ${nf.format(Math.round(mediana(tutti)))} €).`);
    const f = [[0, 1e3], [1e3, 5e3], [5e3, 2e4], [2e4, 1e5], [1e5, 1e12]].find(([a, b]) => pop >= a && pop < b);
    const pari = Object.keys(S.com).filter((k) => S.com[k].pop >= f[0] && S.com[k].pop < f[1]).map((k) => { const v = valoriC(F)[k]; return v.n ? v.fin / S.com[k].pop : null; }).filter((x) => x != null);
    if (pari.length > 3) righe.push(`Tra i ${nf.format(pari.length)} comuni della stessa fascia di popolazione (${f[1] > 1e11 ? 'oltre 100.000' : nf.format(f[0]) + '–' + nf.format(f[1])} abitanti) la mediana è ${nf.format(Math.round(mediana(pari)))} €.`);
  }
  host.append(mk('h2', {}, ['In sintesi']), mk('div', { class: 'avviso' }, mk('ul', { class: 'sintesi' }, righe.map((t) => mk('li', { text: t })))));

  /* --- confronto con il contesto --- */
  if (liv) {
    const b = blocco('Confronto con il contesto', nFiltri(F) ? 'con i filtri attivi' : '');
    const M = [['Euro per abitante', 'pc', (v) => nf.format(Math.round(v)) + ' €'], ['Quota pagata', 'pag', (v) => q0(v)], ['Importo concluso', 'conc', (v) => q0(v)], ['Importo in ritardo', 'rit', (v) => q0(v, 1)]];
    M.forEach(([t, k, fm]) => fig(b, t, null, (f) => G.barre(f, { voci: ctx.filter((c) => c.m[k] != null).map((c) => ({ nome: c.nome, sub: c.sub, val: c.m[k], col: c.mio ? '--s6' : '--s3' })), formatta: fm, conTip: tip, nome: t }), k === 'rit' ? 'Dipende dalla data di estrazione (13/06/2026): non dice chi sia in ritardo oggi.' : null));
  }

  /* --- composizione --- */
  const bc = blocco('Come è fatto');
  const mk7 = S.meta.missioni.filter((k) => A.mis[k] && A.mis[k].fin > 0);
  fig(bc, 'Per missione', 'importo finanziato', (f) => G.ciambella(f, { voci: mk7.map((k) => ({ nome: k, sub: (NOMI_MIS[k] || k).replace(/^M\d /, ''), val: A.mis[k].fin })).sort((a, b) => b.val - a.val), formatta: eur, conTip: tip, nome: 'Per missione', centro: { valore: eur(T.fin), etichetta: 'PNRR' } }));
  fig(bc, 'Per stadio di avanzamento', 'importo finanziato', (f) => G.ciambella(f, { voci: STADI.map((s, i) => ({ nome: s, val: A.st[i].fin, sub: nf.format(A.st[i].n) + ' progetti' })).sort((a, b) => b.val - a.val), formatta: eur, conTip: tip, nome: 'Per stadio', centro: { valore: eur(T.fin), etichetta: 'PNRR' } }));
  const cp = concPerMis(cells(liv, id), F);
  const mAll = S.meta.missioni.filter((k) => { const t = A.mis[k]; return t && t.fin > 0; });
  const bm = blocco('Missione per missione');
  fig(bm, 'Quota pagata', 'pagato ÷ finanziato', (f) => G.colonne(f, { voci: mAll.map((k) => ({ nome: k, val: A.mis[k].pag / A.mis[k].fin, sub: NOMI_MIS[k] })), formatta: (v) => q0(v), conTip: tip, nome: 'Quota pagata per missione', soglia: me.pag, sogliaNome: 'tutte ' + q0(me.pag) }));
  fig(bm, 'Importo dei progetti conclusi', 'concluso ÷ finanziato', (f) => G.colonne(f, { voci: mAll.map((k) => ({ nome: k, val: (cp[k] || 0) / A.mis[k].fin, sub: NOMI_MIS[k], col: '--s3' })), formatta: (v) => q0(v), conTip: tip, nome: 'Quota conclusa per missione', soglia: T.fin > 0 ? A.fase[3].fin / T.fin : null, sogliaNome: 'tutte ' + q0(A.fase[3].fin / T.fin) }), 'Qui il «concluso» è sul finanziato totale della missione, non solo sui progetti con avanzamento rilevato.');

  /* --- posizione nel territorio --- */
  if (liv === null || liv === 'r') {
    const lista = liv === null ? Object.entries(S.reg).map(([k, v]) => ({ k, nome: v.nome, pop: v.pop, rip: v.rip, liv: 'r' })) : Object.entries(S.prov).filter(([, v]) => v.reg === id).map(([k, v]) => ({ k, nome: `${v.nome} (${v.sigla})`, pop: v.pop, liv: 'p' }));
    const voci = lista.map((x) => { const m = metriche(x.liv, x.k, x.pop, F); return { nome: x.nome, val: m.pc, col: x.rip ? RIPCOL[x.rip] : '--s5', mio: false }; }).filter((x) => x.val != null).sort((a, b) => b.val - a.val);
    const bp = blocco(liv === null ? 'Le regioni a confronto' : 'Le province della regione');
    fig(bp, 'Euro per abitante', 'tacca = media italiana', (f) => G.barre(f, { voci, formatta: (v) => nf.format(Math.round(v)) + ' €', conTip: tip, riferimento: IT.pc, rifNome: 'Italia', nome: 'Euro per abitante' }));
    const vr = lista.map((x) => { const m = metriche(x.liv, x.k, x.pop, F); return { nome: x.nome, val: m.rit, col: x.rip ? RIPCOL[x.rip] : '--s5' }; }).filter((x) => x.val != null && x.val > 0).sort((a, b) => b.val - a.val);
    if (vr.length) fig(bp, 'Importo in ritardo', 'tacca = Italia · ' + (liv === null ? 'regioni' : 'province'), (f) => G.barre(f, { voci: vr, formatta: (v) => q0(v, 1), conTip: tip, riferimento: IT.rit, rifNome: 'Italia', nome: 'Importo in ritardo' }), 'In ritardo = «in corso» con fine prevista prima del 13/06/2026. La quota dipende dalla data di estrazione: non dice chi sia in ritardo oggi.');
  }
  if (amb && amb.length > 2) {
    const bd = blocco('I comuni a confronto', ambNome);
    const bin = []; const xs = amb.map((c) => c.pop); const lo = Math.floor(2 * Math.log10(Math.min(...xs))) / 2, hi = Math.max(...xs);
    for (let e = lo; 10 ** e < hi; e += 0.5) { const v = amb.filter((c) => c.pop >= 10 ** e && c.pop < 10 ** (e + 0.5)).map((c) => c.pc); if (v.length >= 3) bin.push({ x: 10 ** (e + 0.25), y: mediana(v) }); }
    fig(bd, 'Popolazione e fondi per abitante', `${nf.format(amb.length)} comuni con progetti`, (f) => G.dispersione(f, {
      punti: amb.map((c) => ({ x: c.pop, y: c.pc, g: 0 })), mediane: bin.length > 1 ? bin : null, nome: 'Comuni a confronto', xNome: 'abitanti (scala log.)', yNome: '€ per abitante (log)',
      xFmt: (v) => (v >= 1e3 ? nf.format(v / 1e3) + ' mila' : nf.format(v)), yFmt: (v) => nf.format(v) + ' €', gruppi: [{ nome: 'comuni', col: '--s5' }],
      evidenzia: liv === 'c' && me.pc != null ? { x: pop, y: me.pc, nome: n.nm } : null,
    }), 'I piccoli comuni hanno valori molto dispersi: bastano pochi progetti per spostare il dato per abitante.');
    host.lastElementChild.lastElementChild.classList.add('largo');
  }
}

/* clic / tastiera sui filtri (delegato) */
function toggle(k, v) {
  const F = { ...S.cur.F };
  if (k === 'mis') F.mis = F.mis === v ? null : v;
  else if (k === 'nat') F.nat = F.nat === +v ? null : +v;
  else if (k === 'fl') F.fl = F.fl === +v ? null : +v;
  else if (k === 'st') { const s = v.split('.').map(Number); F.st = sameSet(F.st, s) ? null : s; }
  go(S.cur.liv, S.cur.id, F);
}
function scheda_click(e) {
  const ch = e.target.closest('.chip'); if (ch) { const F = { ...S.cur.F }; if (ch.dataset.x === 'all') Object.assign(F, F0()); else F[ch.dataset.x] = null; go(S.cur.liv, S.cur.id, F); return; }
  const el = e.target.closest('[data-f]'); if (el) toggle(el.dataset.f, el.dataset.v);
}

let figSort = ['fin', -1];
function tabFigli(FG, q, F) {
  const rows = FG.lista.filter((r) => !q || (r.nome || '').toLowerCase().includes(q.toLowerCase())).map((r) => { const A = analisi(cells(r.liv, r.id), F); return { ...r, t: A.tot, conc: A.fase[3].fin, base: A.fase[0].fin }; });
  const k = figSort[0], dir = figSort[1];
  const val = { nome: (r) => r.nome, n: (r) => r.t.n, fin: (r) => r.t.fin, ab: (r) => (r.pop > 0 ? r.t.fin / r.pop : -1), pag: (r) => (r.t.fin > 0 ? r.t.pag / r.t.fin : -1), conc: (r) => (r.base > 0 ? r.conc / r.base : -1) }[k];
  rows.sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
  const maxF = Math.max(1, ...rows.map((r) => r.t.fin));
  $('#tab-figli').innerHTML = `<table><thead><tr><th data-k="nome">Nome</th><th class="n" data-k="n">Progetti</th><th class="n" data-k="fin">Finanziamento</th><th class="n" data-k="ab">€/abitante</th><th class="n" data-k="pag">Pagato</th><th class="n" data-k="conc">Conclusi</th></tr></thead><tbody>${rows.slice(0, 400).map((r) => `<tr class="cl" tabindex="0" role="link" data-h="${href(r.liv, r.id, F)}"><td><a href="${href(r.liv, r.id, F)}">${esc(r.nome)}</a></td><td class="n">${nf.format(r.t.n)}</td><td class="n">${eur(r.t.fin)} <span class="mini" style="width:${Math.max(1, 40 * r.t.fin / maxF)}px"></span></td><td class="n">${r.pop > 0 && r.t.n ? eurAb(r.t.fin, r.pop) : '–'}</td><td class="n">${pct(r.t.pag, r.t.fin)}</td><td class="n">${pct(r.conc, r.base)}</td></tr>`).join('')}</tbody></table>${rows.length > 400 ? `<p class="nota">Mostrati i primi 400 di ${nf.format(rows.length)}: usa la ricerca.</p>` : ''}`;
  $('#tab-figli').querySelectorAll('th[data-k]').forEach((th) => th.addEventListener('click', () => { figSort = [th.dataset.k, figSort[0] === th.dataset.k ? -figSort[1] : -1]; tabFigli(FG, $('#f-q').value, F); }));
  $('#tab-figli').querySelectorAll('tr.cl').forEach((tr) => { const open = (e) => { if (e.target.tagName !== 'A') location.hash = tr.dataset.h; }; tr.addEventListener('click', open); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.hash = tr.dataset.h; }); });
}

/* OpenCUP: scheda ufficiale del CUP (soggetto titolare, descrizione). I segnaposto tipo «N/A2» non sono CUP e non hanno link. */
const cupOk = (c) => /^[A-Z0-9]{15}$/i.test(String(c || '').trim());
const opencup = (c) => `https://www.opencup.gov.it/portale/web/opencup/home/progetto/-/cup/${encodeURIComponent(String(c).trim())}`;
const cupHtml = (c) => (cupOk(c) ? `<a href="${opencup(c)}" target="_blank" rel="noopener" title="Apri la scheda del CUP su OpenCUP (si apre in una nuova scheda; può riunire più progetti)">${esc(c)}</a>` : esc(c));

/* progetti del comune: stessi filtri della scheda */
const progOk = (r, F) => {
  if (F.mis && !r[4].startsWith(F.mis)) return false; if (F.nat != null && r[5] !== F.nat) return false; if (F.st && !F.st.includes(r[7])) return false;
  if (F.fl) { const rit = r[6] === 'In Corso' && r[12] && r[12] < ESTR; if (F.fl === 1 && !r[13]) return false; if (F.fl === 2 && !rit) return false; }
  return true;
};
function iniziaProgetti(n, nome, F) {
  const P = { page: 0, q: '' }; const all = (n.progetti || []).filter((r) => progOk(r, F)); let vis = all;
  const draw = () => {
    const q = P.q.toLowerCase(); vis = all.filter((r) => !q || ((r[2] || '') + ' ' + (r[3] || '') + ' ' + r[0]).toLowerCase().includes(q));
    const pp = 25, pages = Math.max(1, Math.ceil(vis.length / pp)); P.page = Math.min(P.page, pages - 1);
    $('#p-cnt').textContent = nf.format(vis.length) + (nFiltri(F) ? ' con i filtri attivi' : '');
    $('#tab-prog').innerHTML = `<table><thead><tr><th>Progetto</th><th>Misura</th><th>Stadio</th><th class="n">Finanziamento</th><th class="n">Pagato</th><th class="n">Aggiudicato</th></tr></thead><tbody>${vis.slice(P.page * pp, (P.page + 1) * pp).map((r) => {
      const quota = r[11] < 0.999 ? ` <span class="pill" title="Il progetto è localizzato su più territori: importi ripartiti">quota ${(100 * r[11]).toFixed(0)} %</span>` : '';
      return `<tr><td>${r[2] ? esc(r[2]) : '<i>Incentivo a imprese (titolo non pubblicato)</i>'}${quota}<br><small>${r[3] ? esc(r[3]) : '<i>soggetto non pubblicato</i>'} · CUP ${cupHtml(r[0])}${r[12] ? ' · fine prevista ' + esc(r[12]) : ''}</small></td><td>${esc(r[4])}</td><td><span class="pill ${r[7] === 4 ? 'ok' : r[13] ? 'warn' : ''}">${esc(STADI[r[7]])}${r[13] ? ' · iter concluso' : ''}</span></td><td class="n">${eur(r[8])}</td><td class="n">${eur(r[9])}</td><td class="n">${eur(r[10])}</td></tr>`;
    }).join('')}</tbody></table><div class="pager"><button id="pg-p" ${P.page ? '' : 'disabled'}>‹</button> pagina ${P.page + 1} di ${pages} (${nf.format(vis.length)} progetti) <button id="pg-n" ${P.page < pages - 1 ? '' : 'disabled'}>›</button></div>`;
    $('#pg-p').onclick = () => { P.page--; draw(); }; $('#pg-n').onclick = () => { P.page++; draw(); };
  };
  $('#p-q').addEventListener('input', (e) => { P.q = e.target.value; P.page = 0; draw(); });
  const scarica = (righe, suffisso) => {
    const c = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const head = ['CUP', 'Codice locale', 'Titolo', 'Soggetto attuatore', 'Sottomisura', 'Natura', 'Stadio', 'Finanziamento PNRR', 'Pagato PNRR', 'Aggiudicato', 'Quota localizzazione', 'Fine prevista', 'OpenCUP'];
    const lines = righe.map((r) => [r[0], r[1], r[2], r[3], r[4], S.meta.nature[r[5]], STADI[r[7]], r[8], r[9], r[10], r[11], r[12], cupOk(r[0]) ? opencup(r[0]) : ''].map(c).join(';'));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + [head.map(c).join(';'), ...lines].join('\n')], { type: 'text/csv' })); a.download = `pnrr_${nome.replace(/\W+/g, '_')}${suffisso}.csv`; a.click();
  };
  const tutti = n.progetti || [];
  $('#p-nota').textContent = `«Scarica CSV (filtrati)» esporta solo i progetti oggi in elenco, con i filtri della scheda e la ricerca. «Scarica tutti i dati del comune» esporta tutti i ${nf.format(tutti.length)} progetti, senza filtri.`;
  $('#p-csv').addEventListener('click', () => scarica(vis, ''));
  $('#p-csv-tutti').addEventListener('click', () => scarica(tutti, '_tutti'));
  draw();
}


/* ---------- avvio ---------- */
async function init() {
  try {
    const [meta, it, reg, prov, com, bbox, ci, cr, cp, cc, ver] = await Promise.all(['meta', 'italia', 'regioni', 'province', 'comuni', 'bbox', 'cubo_i', 'cubo_r', 'cubo_p', 'cubo_c', 'verifiche'].map((n) => get(`data/${n}.json`)));
    Object.assign(S, { meta, it, reg, prov, com, bbox, ver }); S.cube = { i: ci, r: cr, p: cp, c: cc };
  } catch (e) { $('#scheda').innerHTML = `<p class="avviso alert">Impossibile caricare i dati: ${esc(e.message)}</p>`; return; }
  filtriInit(); $('#scheda').addEventListener('click', scheda_click);
  $('#scheda').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-f][role="button"]')) { e.preventDefault(); toggle(e.target.dataset.f, e.target.dataset.v); } });
  document.addEventListener('tema-cambia', () => { if (S.map && tono() !== S.tonoMappa) { S.tonoMappa = tono(); S.map.setStyle(STILI[S.tonoMappa], { diff: false }); } else if (S.map?.getLayer('vela')) { const st = getComputedStyle(document.documentElement); S.map.setPaintProperty('vela', 'fill-color', st.getPropertyValue('--bg')); S.map.setPaintProperty('bordi', 'line-color', st.getPropertyValue('--surface')); aggiornaMappa(); } if (S.cur && S.cube.c) route(); });
  addEventListener('hashchange', route);
  S.vista0 = vistaDaHash(); creaMappa(); route();
}
init();
