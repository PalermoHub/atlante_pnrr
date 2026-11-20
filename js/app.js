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
/* Gerarchia del piano: Missione (M1) > Componente (M1C1) > Misura, cioè Investimento o Riforma (M1C1I1.04) > Sub-misura (M1C1I1.04.01).
   Le celle dei cubi sono indicizzate per sub-misura: gli altri livelli si ricavano dal codice. */
const LIV = ['mis', 'comp', 'msr', 'sub'];
const compDi = (c) => (String(c).match(/^M\d+C\d+/) || [''])[0];
const msrDi = (c) => String(c).replace(/\.[^.]+$/, '');
const livDi = (c) => (/^M\d$/.test(c) ? 'mis' : /^M\d+C\d+$/.test(c) ? 'comp' : /^M\d+C\d+[IR]\d+\.\d+$/.test(c) ? 'msr' : 'sub');
const su = (v, L) => (L === 'mis' ? v.slice(0, 2) : L === 'comp' ? compDi(v) : L === 'msr' ? (livDi(v) === 'sub' ? msrDi(v) : v) : v);
/* «M1C1I1.04.01» -> «Investimento 1.4.1»; la sub-misura «.00» è la misura stessa */
function etich(c) {
  const m = String(c).match(/^M\d+C\d+([IR])(\d+)\.(\d+)(?:\.(\w+))?$/); if (!m) return c;
  const sub = m[4] && !/^0+$/.test(m[4]) ? '.' + (/^\d+$/.test(m[4]) ? +m[4] : m[4]) : '';
  return `${m[1] === 'I' ? 'Investimento' : 'Riforma'} ${+m[2]}.${+m[3]}${sub}`;
}
const nomeProg = (c) => S.meta?.nomi?.[c] || '';
const labProg = (c) => { const l = livDi(c); return l === 'mis' ? NOMI_MIS[c] || c : l === 'comp' ? `${c} ${nomeProg(c)}` : `${etich(c)} · ${nomeProg(c)}`; };
const LIV_NOME = { mis: 'Missione', comp: 'Componente', msr: 'Misura', sub: 'Sub-misura' };

const S = { meta: null, it: null, reg: null, prov: null, com: null, bbox: null, cube: {}, map: null, indic: 'fin_pc', adatta: true, scala: 'blu', classi: 'quantili', inverti: false, breaks: [], cache: new Map(), cur: null, vals: null, det: {} };
const get = async (u) => { if (!S.cache.has(u)) { S.cache.set(u, fetch(u + '?d=2').then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); })); } return S.cache.get(u); };

/* ---------- stato nell'indirizzo ---------- */
const F0 = () => ({ mis: null, comp: null, msr: null, sub: null, nat: null, st: null, fl: null, k: null, x: false });
/* Confronto tra comuni: «k» è la selezione (comuni «082053», o gruppi «p082» = tutta la provincia, «r19» = tutta la regione),
   «x» dice se il confronto è aperto al posto della scheda. Vivono dentro F, quindi seguono ogni cambio di territorio o filtro. */
const TOK = /^(\d{6}|x\d{6}|p\d{3}|r\d{1,2})$/, MAXTOK = 60, MAXCOM = 2000;
const tokOk = (t) => TOK.test(t) && !!(t[0] === 'p' ? S.prov?.[t.slice(1)] : t[0] === 'r' ? S.reg?.[t.slice(1)] : S.com?.[t[0] === 'x' ? t.slice(1) : t]);
function comuniDi(toks) {
  const out = new Set();
  for (const t of toks || []) {
    if (t[0] === 'x') continue;
    if (t[0] === 'p' || t[0] === 'r') { const ch = t[0] === 'p' ? 'pv' : 'rg', v = t.slice(1); for (const [id, c] of Object.entries(S.com)) if (c[ch] === v) out.add(id); } else out.add(t);
    if (out.size >= MAXCOM) break;
  }
  for (const t of toks || []) if (t[0] === 'x') out.delete(t.slice(1));
  return [...out].slice(0, MAXCOM);
}
/* imposta (o toglie) un livello del piano: i livelli superiori si allineano, quelli inferiori si azzerano */
function setProg(F, L, v) {
  const i = LIV.indexOf(L); LIV.forEach((l, j) => { if (j > i) F[l] = null; });
  if (v) LIV.forEach((l, j) => { if (j <= i) F[l] = su(v, l); }); else F[L] = null;
  return F;
}
function parseHash() {
  const [path, qs = ''] = location.hash.split('?'); const m = path.match(/^#\/(r|p|c)\/(\w+)$/); const F = F0();
  const q = new URLSearchParams(qs);
  const prog = [['m', /^M\d$/, 'mis'], ['c', /^M\d+C\d+$/, 'comp'], ['i', /^M\d+C\d+[IR]\d+\.\d+$/, 'msr'], ['u', /^M\d+C\d+[IR]\d+\.\d+\.\w+$/, 'sub']];
  for (const [k, re, L] of prog) if (re.test(q.get(k) || '')) setProg(F, L, q.get(k)); /* dal più alto al più basso: il livello più profondo vince */
  if (q.get('n') != null && /^\d+$/.test(q.get('n'))) F.nat = +q.get('n');
  if (q.get('s')) F.st = q.get('s').split('.').map(Number).filter((x) => x >= 0 && x <= 5);
  if (q.get('f') === '1' || q.get('f') === '2') F.fl = +q.get('f');
  if (q.get('k')) { const t = [...new Set(q.get('k').split('.').filter(tokOk))].slice(0, MAXTOK); if (t.length) F.k = t; } /* indirizzi vecchi o manomessi: i codici sconosciuti si scartano */
  F.x = q.get('x') === '1' && !!F.k;
  return { liv: m ? m[1] : null, id: m ? m[2] : null, F };
}
function fStr(F, soloFiltri) {
  const q = new URLSearchParams(); if (F.mis) q.set('m', F.mis); if (F.comp) q.set('c', F.comp); if (F.msr) q.set('i', F.msr); if (F.sub) q.set('u', F.sub); if (F.nat != null) q.set('n', F.nat); if (F.st) q.set('s', F.st.join('.')); if (F.fl) q.set('f', F.fl);
  if (!soloFiltri && F.k?.length) { q.set('k', F.k.join('.')); if (F.x) q.set('x', '1'); }
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
const nFiltri = (F) => LIV.filter((l) => F[l]).length + (F.nat != null ? 1 : 0) + (F.st ? 1 : 0) + (F.fl ? 1 : 0);
const sameSet = (a, b) => a && b.length === a.length && b.every((x) => a.includes(x));

/* ---------- cubo ---------- */
// cella = [sub-misura, natura, stadio, segnalazioni, n, fin, fin_tot, pag, agg] (9 interi consecutivi)
const cells = (liv, id) => (liv === null ? S.cube.i.IT : S.cube[liv]?.[id]) || [];
function ok(c, o, F, ign) {
  /* «ign» = livello del piano da escludere (con i livelli sotto): serve a mostrare i fratelli di quello scelto */
  const k = LIV.includes(ign) ? LIV.indexOf(ign) : 9;
  for (let l = 0; l < 4 && l < k; l++) if (F[LIV[l]] && S.sx[LIV[l]][c[o]] !== F[LIV[l]]) return false;
  if (F.nat != null && ign !== 'nat' && c[o + 1] !== F.nat) return false;
  if (F.st && ign !== 'st' && !F.st.includes(c[o + 2])) return false;
  if (F.fl && ign !== 'fl' && !(c[o + 3] & F.fl)) return false;
  return true;
}
const Z = () => ({ n: 0, fin: 0, ft: 0, pag: 0, agg: 0 });
const add = (t, c, o) => { t.n += c[o + 4]; t.fin += c[o + 5]; t.ft += c[o + 6]; t.pag += c[o + 7]; t.agg += c[o + 8]; };
function sumCells(c, F, ign) { const t = Z(); for (let o = 0; o < c.length; o += 9) if (ok(c, o, F, ign)) add(t, c, o); return t; }
function analisi(c, F) {
  const tot = sumCells(c, F), prog = { mis: {}, comp: {}, msr: {}, sub: {} }, nat = {}, st = [0, 1, 2, 3, 4, 5].map(Z), fl = { 1: Z(), 2: Z() };
  for (let o = 0; o < c.length; o += 9) {
    for (const L of LIV) if (ok(c, o, F, L)) add(prog[L][S.sx[L][c[o]]] ??= Z(), c, o);
    if (ok(c, o, F, 'nat')) add(nat[c[o + 1]] ??= Z(), c, o);
    if (ok(c, o, F, 'st')) add(st[c[o + 2]], c, o);
    if (ok(c, o, F, 'fl')) { if (c[o + 3] & 1) add(fl[1], c, o); if (c[o + 3] & 2) add(fl[2], c, o); }
  }
  const fase = FASI.map((f) => { const t = Z(); f.set.forEach((s) => { for (const k of ['n', 'fin', 'ft', 'pag', 'agg']) t[k] += st[s][k]; }); return t; });
  return { tot, mis: prog.mis, comp: prog.comp, msr: prog.msr, sub: prog.sub, nat, st, fl, fase };
}

/* ---------- indicatori della mappa ---------- */
function valoriComuni(F) {
  const out = {};
  for (const id of Object.keys(S.com)) {
    const c = cells('c', id); let n = 0, fin = 0, pag = 0, conc = 0, rit = 0, chi = 0;
    const ms = new Array(S.meta.missioni.length).fill(0), mn = ms.slice();
    for (let o = 0; o < c.length; o += 9) {
      if (!ok(c, o, F)) continue; n += c[o + 4]; fin += c[o + 5]; pag += c[o + 7]; const mi = S.sx.mi[c[o]]; ms[mi] += c[o + 5]; mn[mi] += c[o + 4];
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
  const chiave = [S.indic, S.adatta, S.classi, liv, id, fStr(F, true)].join('|'); if (chiave !== S.clsKey) { S.clsKey = chiave; S.cls = null; }
  const nessuno = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#ccc';
  const r = ramp(), expr = ['match', ['get', 'pro_com_t']], cont = new Array(nc).fill(0); S.clsMap = {}; let cnt = 0; const inTerr = new Set(ambito(liv, id));
  for (const [cid, c] of Object.entries(S.vals)) { const i = cls(I.f(c)); if (i < 0) continue; S.clsMap[cid] = i; if (inTerr.has(cid)) cont[i]++; expr.push(cid, !S.cls || S.cls.has(i) ? r[Math.min(i, k - 1)] : nessuno); cnt++; }
  expr.push(nessuno); S.map.setPaintProperty('comuni', 'fill-color', cnt ? expr : nessuno);
  const lim = (i) => `${I.fmt(i === 0 ? v[0] : S.breaks[i - 1])} – ${I.fmt(i === nc - 1 ? v[v.length - 1] : S.breaks[i])}`;
  S.legTip = { cat: false, voci: cont.map((n, i) => ({ col: r[Math.min(i, k - 1)], txt: lim(i), n })), tot: nc };
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
  const tot = {}, inTerr = new Set(ambito(S.cur.liv, S.cur.id)); ord.forEach(([k]) => { if (!inTerr.has(k)) return; const d = S.vals[k].dom; tot[d] = (tot[d] || 0) + 1; });
  S.legTip = { cat: true, voci: S.meta.missioni.map((k) => ({ k, col: COL_MIS[k], txt: NOMI_MIS[k] || k, n: tot[k] || 0 })), tot: S.meta.missioni.length };
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
  m.setFilter('vela', liv && !S.lente ? ['!=', eq, id] : NESSUNO); m.setFilter('contorno', liv ? ['==', eq, id] : NESSUNO);
  m.setPaintProperty('contorno', 'line-width', liv === 'c' ? 2 : 0.6);
  if (noFit || S.lente) return; /* con la lente accesa è lei a scegliere il comune: la mappa non deve spostarsi da sola */
  const b = liv ? S.bbox[liv][id] : ITALIA;
  if (b) m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 30, duration: 600, maxZoom: 11 });
}
/* Mappa di base OpenFreeMap (gratuita, senza chiave): «positron» per i toni chiari, «dark» per gli scuri. */
const ITALIA = [6.6, 35.5, 18.6, 47.1];
const STILI = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
const tono = () => (document.documentElement.getAttribute('data-tone') === 'dark' ? 'dark' : 'light');
/* Limite di spostamento automatico: l'estensione dell'Italia allargata del 30% per lato, così si vede anche un po' di mare e di confine. */
const limiti = () => { const [w, s, e, n] = ITALIA, dx = (e - w) * 0.3, dy = (n - s) * 0.3; return [[w - dx, s - dy], [e + dx, n + dy]]; };
/* Il limite deve contenere sempre la vista che inquadra tutta l'Italia: su schermi grandi (32" e oltre) quella vista è più larga
   dei limiti fissi e MapLibre la sposta fuori centro. Si unisce quindi il limite fisso all'area visibile a «tutta Italia». */
/* Su telefono la scheda (foglio) copre la parte bassa della mappa: «tutta Italia» si inquadra nella parte libera sopra il foglio
   (sotto i comandi in alto), e il limite di zoom lascia spazio anche per il foglio a mezza altezza, così il Sud non resta nascosto. */
const telefono = matchMedia('(max-width: 720px)');
function padItalia(m, frac) {
  if (!telefono.matches) return 30;
  const c = m.getContainer(), bar = document.querySelector('.mapbar'), f = document.getElementById('foglio');
  const sotto = frac != null ? c.clientHeight * frac : (f ? f.offsetHeight : 184);
  return { top: (bar ? bar.offsetHeight : 110) + 10, bottom: Math.round(sotto) + 10, left: 20, right: 20 };
}
function limitiPer(m) {
  const [[w, s], [e, n]] = limiti();
  try {
    const cam = m.cameraForBounds([[ITALIA[0], ITALIA[1]], [ITALIA[2], ITALIA[3]]], { padding: padItalia(m, 0.55) }), c = m.getContainer();
    if (!cam || !c.clientWidth || !c.clientHeight) return [[w, s], [e, n]];
    const sc = 512 * Math.pow(2, cam.zoom), mc = maplibregl.MercatorCoordinate.fromLngLat(cam.center), hx = c.clientWidth / 2 / sc, hy = c.clientHeight / 2 / sc;
    const a = new maplibregl.MercatorCoordinate(mc.x - hx, mc.y + hy, 0).toLngLat(), b = new maplibregl.MercatorCoordinate(mc.x + hx, mc.y - hy, 0).toLngLat();
    return [[Math.min(w, a.lng), Math.max(Math.min(s, a.lat), -85)], [Math.max(e, b.lng), Math.min(Math.max(n, b.lat), 85)]];
  } catch (_) { return [[w, s], [e, n]]; }
}
class HomeControl {
  onAdd(m) {
    this.m = m; const d = this.d = document.createElement('div'); d.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    d.innerHTML = '<button type="button" class="ctrl-home" title="Tutta Italia" aria-label="Zoom su tutta Italia"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 10v10h4.5v-6h4v6h4.5V10" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    d.firstChild.addEventListener('click', () => m.fitBounds([[ITALIA[0], ITALIA[1]], [ITALIA[2], ITALIA[3]]], { padding: padItalia(m), duration: 600 }));
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
  /* comuni scelti per il confronto: sopra la velina, così restano visibili anche fuori dal territorio aperto */
  m.addLayer({ id: 'self', type: 'fill', source: 'c', 'source-layer': 'comuni', filter: NESSUNO, paint: { 'fill-color': COL_SEL, 'fill-opacity': 0.22 } }, prima);
  m.addLayer({ id: 'selb', type: 'line', source: 'c', 'source-layer': 'comuni', filter: NESSUNO, paint: { 'line-color': COL_SEL, 'line-width': 2.2 } }, prima);
}
const COL_SEL = '#d6336c';
function aggiornaSel() {
  const m = S.map; if (!m || !m.getLayer('selb')) return;
  const ids = comuniDi(S.cur?.F.k), f = ids.length ? ['match', ['get', 'pro_com_t'], ids, true, false] : NESSUNO; /* «match» non accetta elenchi vuoti */
  m.setFilter('self', f); m.setFilter('selb', f);
}
/* inquadra l'insieme dei comuni scelti (unione dei loro riquadri) */
function inquadraSel(ids) {
  const m = S.map; if (!m || !ids.length) return; let b = null;
  for (const id of ids) { const x = S.bbox.c?.[id]; if (x) b = b ? [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])] : [...x]; }
  if (b) m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: padItalia(m), duration: 600, maxZoom: 11 });
}
function creaMappa() {
  const proto = new pmtiles.Protocol(); maplibregl.addProtocol('pmtiles', proto.tile);
  S.tonoMappa = tono();
  const m = new maplibregl.Map({ container: 'map', style: STILI[S.tonoMappa], bounds: [[ITALIA[0], ITALIA[1]], [ITALIA[2], ITALIA[3]]], attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxPitch: 0, pitch: 0, bearing: 0 });
  m.touchZoomRotate.disableRotation(); m.touchPitch.disable(); m.keyboard.disableRotation();
  S.map = m; m.addControl(new HomeControl(), 'top-right'); m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right'); m.addControl(new LogoControl(), 'bottom-right');
  /* le info sulla mappa (attribuzioni) partono chiuse: si apre solo con l'icona i */
  const chiudiInfo = () => { const a = m.getContainer().querySelector('.maplibregl-ctrl-attrib'); if (a) { a.classList.remove('maplibregl-compact-show'); a.removeAttribute('open'); } };
  chiudiInfo(); m.on('load', chiudiInfo);
  const url = new URL('data/geo/comuni.pmtiles', location.href).href;
  /* «style.load» scatta al primo caricamento e a ogni cambio di stile (tema chiaro/scuro): i livelli si riaggiungono sempre */
  m.on('style.load', () => {
    if (!S.avviata) { S.avviata = true; m.resize(); m.setMaxBounds(limitiPer(m)); m.on('resize', () => m.setMaxBounds(limitiPer(m))); if (S.vista0) m.jumpTo({ zoom: S.vista0[0], center: [S.vista0[2], S.vista0[1]] }); else m.fitBounds([[ITALIA[0], ITALIA[1]], [ITALIA[2], ITALIA[3]]], { padding: padItalia(m), duration: 0 }); S.vista0 = null; }
    aggiungiLivelli(m, url);
    if (S.cur) { evidenzia(S.cur.liv, S.cur.id, true); aggiornaMappa(); aggiornaSel(); }
  });
  m.on('moveend', scriviVista);
  m.on('idle', () => aggiornaQuadro());
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; $('#map').append(tip);
  const senzaHover = matchMedia('(hover: none)');
  /* contenuto del tooltip; false se il comune non ha dati */
  const riempiTip = (id) => {
    const c = S.vals?.[id]; if (!c) return false;
    const v = INDIC[S.indic].f(c), cm = S.com[id];
    const mis = Object.entries(analisi(cells('c', id), S.cur.F).mis).filter(([, t]) => t.fin > 0).sort((a, b) => b[1].fin - a[1].fin);
    tip.innerHTML = `<b class="tip-nome">${esc(cm.nm)}</b><br><span class="tip-geo">${esc(S.prov[cm.pv]?.nome || '')} · ${esc(S.reg[cm.rg]?.nome || '')}</span><br><span class="tip-ind">${esc(INDIC[S.indic].nome.replace(/ \(.*/, ''))}: ${v == null ? 'nessun progetto' : INDIC[S.indic].fmt(v)}</span>`
      + (mis.length ? `<table class="tip-mis"><caption>Finanziato per missione</caption>${mis.map(([k, t]) => `<tr><td>${esc(NOMI_MIS[k] || k)}</td><td>${eur(t.fin)}</td></tr>`).join('')}</table>` : '');
    /* sul telefono la legenda non sta più sulla mappa: la fascia di colore del comune sta qui, in forma compatta */
    if (senzaHover.matches && S.legTip) {
      const L = S.legTip, mio = L.cat ? L.voci.findIndex((x) => x.k === c.dom) : S.clsMap?.[id];
      const chip = L.voci.map((x, i) => `<i class="${i === mio ? 'qui' : ''}" style="background:${x.col}"></i>`).join('');
      const cap = mio == null || mio < 0 ? 'Nessun progetto: resta grigio' : L.cat ? `Missione prevalente: ${esc(L.voci[mio].txt)}` : `Fascia ${mio + 1} di ${L.tot}: ${esc(L.voci[mio].txt)}`;
      tip.insertAdjacentHTML('beforeend', `<div class="tip-leg"><div class="tip-rampa">${chip}</div><span>${cap}</span></div>`);
    }
    return true;
  };
  /* mouse: segue il puntatore. Tocco: non esiste «mouseleave», quindi il tooltip compare al tap, in alto a sinistra, e si chiude da solo */
  let tipTocco = null, timerTocco = 0;
  /* sul telefono il foglio si abbassa finché il popup è aperto, così non lo copre; poi torna com'era */
  const foglioTip = document.getElementById('foglio'); let foglioRidotto = false;
  const ripristinaFoglio = () => { if (foglioRidotto) { foglioTip.style.removeProperty('height'); foglioRidotto = false; } };
  const chiudiTip = () => { tip.hidden = true; tipTocco = null; clearTimeout(timerTocco); m.getCanvas().style.cursor = ''; ripristinaFoglio(); };
  const mostraTocco = () => {
    if (!tipTocco || !riempiTip(tipTocco)) return chiudiTip();
    tip.style.left = '8px'; tip.style.top = '112px'; tip.hidden = false; /* sotto la barra di ricerca e filtri */
    if (foglioTip && foglioTip.dataset.stato !== 'chiuso') {
      const P = foglioTip.parentElement.getBoundingClientRect(), T = tip.getBoundingClientRect();
      const libero = P.bottom - T.bottom - 8, h = foglioTip.getBoundingClientRect().height;
      if (libero < h) { foglioTip.style.height = Math.max(120, libero) + 'px'; foglioRidotto = true; }
    }
    clearTimeout(timerTocco); timerTocco = setTimeout(chiudiTip, 9000);
  };
  m.on('mousemove', 'comuni', (e) => {
    if (senzaHover.matches) return;
    const f = e.features[0]; if (!f || !S.vals) return chiudiTip(); const id = f.properties.pro_com_t;
    /* con un comune selezionato il tooltip compare solo su quello: sugli altri cambierebbe a ogni movimento del mouse */
    if (S.cur?.liv === 'c' && S.cur.id !== id) return chiudiTip();
    if (!riempiTip(id)) return;
    m.getCanvas().style.cursor = 'pointer'; tip.hidden = false; tip.style.left = e.point.x + 12 + 'px'; tip.style.top = e.point.y + 12 + 'px';
  });
  m.on('mouseleave', 'comuni', () => { if (!senzaHover.matches) chiudiTip(); });
  /* uscita dalla tela, spostamenti fatti dall'utente, Esc, finestra che perde il fuoco: il tooltip si chiude sempre */
  m.getCanvas().addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') chiudiTip(); });
  m.on('movestart', (e) => { if (e.originalEvent || !tipTocco) chiudiTip(); });
  m.on('moveend', () => { if (tipTocco) mostraTocco(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiTip(); }); addEventListener('blur', chiudiTip);
  m.on('click', (e) => { if (!m.queryRenderedFeatures(e.point, { layers: ['comuni'] }).length) chiudiTip(); });
  m.on('click', 'comuni', (e) => {
    if (S.lente) return; /* con la lente accesa il clic sposta la lente (js/lente-app.js) */
    const f = e.features[0]; const id = f && f.properties.pro_com_t; if (!id || !S.com[id]) return;
    const oe = e.originalEvent; /* modo «scegli sulla mappa», oppure Maiusc/Ctrl/Cmd+clic: il comune entra o esce dal confronto, senza cambiare scheda */
    if (S.selMode || oe?.shiftKey || oe?.ctrlKey || oe?.metaKey) { chiudiTip(); alternaComune(id); return; }
    if (senzaHover.matches) { tipTocco = id; go('c', id, S.cur?.F); mostraTocco(); } else go('c', id, S.cur?.F);
  });
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
/* Piano: Missione > Componente > Misura > Sub-misura. Ogni menu elenca solo le voci sotto quella scelta sopra (con i dati presenti). */
function riempiProg(F) {
  const opt = (v, t, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;
  const tutti = S.meta.sub, sotto = (L) => { const i = LIV.indexOf(L); return tutti.filter((c) => LIV.every((l, j) => j >= i || !F[l] || su(c, l) === F[l])); };
  const voci = (L) => [...new Set(sotto(L).map((c) => su(c, L)))].sort();
  const vuoto = { mis: 'Tutte le missioni', comp: 'Tutti i componenti', msr: 'Tutte le misure', sub: 'Tutte le sub-misure' };
  for (const L of LIV) {
    const k = voci(L), padreL = LIV[LIV.indexOf(L) - 1];
    let h = opt('', vuoto[L], !F[L]);
    if (L === 'msr' || L === 'sub') { /* molte voci: raggruppate per livello superiore */
      const gr = new Map(); k.forEach((c) => { const g = su(c, padreL); (gr.get(g) || gr.set(g, []).get(g)).push(c); });
      h += [...gr].map(([g, v]) => `<optgroup label="${esc(labProg(g))}">${v.map((c) => opt(c, labProg(c), c === F[L])).join('')}</optgroup>`).join('');
    } else h += k.map((c) => opt(c, labProg(c), c === F[L])).join('');
    $('#f-' + L).innerHTML = h;
  }
  const f = F.sub || F.msr || F.comp || F.mis; $('#chip-prog-t').textContent = !f ? 'Tutte le missioni' : livDi(f) === 'mis' ? f : livDi(f) === 'comp' ? f : etich(f);
}
function filtriInit() {
  for (const L of LIV) $('#f-' + L).addEventListener('change', (e) => { S.det = {}; go(S.cur.liv, S.cur.id, setProg({ ...S.cur.F }, L, e.target.value || null)); });
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
  const prima = S.cur; S.cur = { liv, id, F }; const n = nodo(liv, id); const nome = liv === 'c' ? n.nm : n.nome;
  const g = liv ? genitori(liv, id) : [];
  const Fs = { ...F, x: false }; /* i link al territorio portano alla scheda, non al confronto */
  const nSel = comuniDi(F.k).length, conf = F.x && nSel > 0;
  $('#crumbs').innerHTML = g.map((x) => `<a href="${href(x.liv, x.id, Fs)}">${esc(x.nome)}</a><span class="sep">›</span>`).join('') + `<span class="cur">${esc(liv ? nome : 'Italia')}</span>`;
  document.title = (conf ? 'Confronto di ' + nf.format(nSel) + ' comuni · ' : liv ? nome + ' · ' : '') + 'Atlante del PNRR';
  riempiFiltri(liv, id); riempiProg(F); $('#f-reset').disabled = !liv && !nFiltri(F) && !F.k;
  /* se cambia solo la selezione la mappa non deve spostarsi: chi tocca i comuni uno dopo l'altro perderebbe la vista */
  const senzaSel = (x) => fStr({ ...x, k: null, x: false }, true), kk = (x) => (x?.k || []).join('.');
  const soloSel = !!prima && prima.liv === liv && prima.id === id && senzaSel(prima.F) === senzaSel(F) && (kk(prima.F) !== kk(F) || !!prima.F.x !== !!F.x);
  evidenzia(liv, id, soloSel || conf); aggiornaSel(); aggiornaMappa();
  pillConf(); aggiornaPanConf();
  if (conf) {
    if (!S.lente && !(soloSel && prima.F.x && kk(prima.F) === kk(F))) inquadraSel(comuniDi(F.k));
    disegnaConfronto(F); $('#scheda').scrollTop = 0; return;
  }
  let det = n; if (liv === 'c') det = { ...n, ...(await get(`data/comuni/${id}.json`).catch(() => ({}))) };
  if (S.cur.F !== F) return; /* nel frattempo è arrivato un altro indirizzo */
  disegnaScheda(liv, id, det, nome, F); $('#scheda').scrollTop = 0;
}


/* ---------- confronto tra comuni ---------- */
function setConf(mod, x) {
  if (!S.cur) return; const F = { ...S.cur.F };
  const k = [...new Set(mod([...(F.k || [])]))].slice(0, MAXTOK);
  F.k = k.length ? k : null; F.x = !!F.k && (x == null ? F.x : x);
  go(S.cur.liv, S.cur.id, F);
}
/* un comune entra o esce; se esce ma un gruppo (provincia/regione) lo contiene ancora, si aggiunge un'esclusione «xCODICE» */
function alternaComune(id) {
  setConf((k) => {
    const ex = 'x' + id;
    if (comuniDi(k).includes(id)) { k = k.filter((t) => t !== id); return comuniDi(k).includes(id) ? [...k, ex] : k; }
    k = k.filter((t) => t !== ex); return comuniDi(k).includes(id) ? k : [...k, id];
  });
}
function azioneConf(az, d) {
  if (!S.cur) return;
  if (az === 'sel') { S.selMode = !S.selMode; pillConf(); aggiornaPanConf(); return; }
  if (az === 'apri') setConf((k) => k, true);
  else if (az === 'esci') setConf((k) => k, false);
  else if (az === 'svuota') setConf(() => []);
  else if (az === 'alterna') alternaComune(d.id);
  else if (az === 'gruppo') setConf((k) => (k.includes(d.tok) ? k : [...k, d.tok]));
  else if (az === 'rimuovi') setConf((k) => k.filter((t) => t !== d.tok));
  else if (az === 'csv') scaricaConfronto();
}
const nComuni = (n) => `${nf.format(n)} ${n === 1 ? 'comune' : 'comuni'}`;
function tokEtich(t) {
  if (t[0] === 'p') return `Provincia di ${S.prov[t.slice(1)].nome} · ${nComuni(comuniDi([t]).length)}`;
  if (t[0] === 'r') return `Regione ${S.reg[t.slice(1)].nome} · ${nComuni(comuniDi([t]).length)}`;
  const c = S.com[t[0] === 'x' ? t.slice(1) : t]; return `${t[0] === 'x' ? 'senza ' : ''}${c.nm} (${S.prov[c.pv]?.sigla ?? ''})`;
}
/* riga sotto la mappa: quanti comuni sono scelti e i comandi; serve anche quando la scheda è chiusa (telefono) */
function pillConf() {
  const p = $('#conf-pill'); if (!p || !S.cur) return;
  const n = comuniDi(S.cur.F.k).length, aperto = S.cur.F.x && n > 0;
  p.hidden = (!n && !S.selMode) || (aperto && !S.selMode); if (p.hidden) return;
  p.innerHTML = `<span class="cp-t">${S.selMode ? `Clic sui comuni della mappa per aggiungerli o toglierli${S.lente ? ' (spegni la Lente)' : ''} · ` : ''}<b>${nComuni(n)}</b> nel confronto</span><span class="cp-b">${n ? `<button type="button" data-conf="apri"${n < 2 || aperto ? ' disabled' : ''}>Confronta</button><button type="button" data-conf="svuota">Svuota</button>` : ''}${S.selMode ? '<button type="button" data-conf="sel">Fatto</button>' : ''}</span>`;
}
/* pannello «Territorio»: scelta sulla mappa e aggiunta di intere province o regioni */
function aggiornaPanConf() {
  const cur = S.cur, bm = $('#conf-mappa'); if (!cur || !bm) return;
  bm.setAttribute('aria-pressed', String(!!S.selMode)); bm.textContent = S.selMode ? 'Fine scelta sulla mappa' : 'Scegli i comuni sulla mappa';
  const c = cur.liv === 'c' ? S.com[cur.id] : null, pv = cur.liv === 'p' ? cur.id : c?.pv, rg = cur.liv === 'r' ? cur.id : cur.liv === 'p' ? S.prov[cur.id]?.reg : c?.rg;
  const imp = (b, tok, def, nome) => { b.dataset.tok = tok || ''; if (!tok) { b.disabled = true; b.textContent = def; return; } b.disabled = !!cur.F.k?.includes(tok); b.textContent = `Aggiungi i ${nComuni(comuniDi([tok]).length)} ${nome}`; };
  imp($('#conf-prov'), pv && 'p' + pv, 'Aggiungi i comuni della provincia', `della provincia di ${S.prov[pv]?.nome}`);
  imp($('#conf-reg'), rg && 'r' + rg, 'Aggiungi i comuni della regione', `della regione ${S.reg[rg]?.nome}`);
}
function confBarra(liv, id, F) {
  const sel = comuniDi(F.k), n = sel.length; let a = '';
  if (liv === 'c') a = `<button type="button" data-conf="alterna" data-id="${id}">${sel.includes(id) ? 'Togli dal confronto' : 'Aggiungi al confronto'}</button>`;
  else if (liv === 'p' || liv === 'r') { const tok = liv + id; a = `<button type="button" data-conf="gruppo" data-tok="${tok}"${F.k?.includes(tok) ? ' disabled' : ''}>Aggiungi i ${nComuni(comuniDi([tok]).length)} al confronto</button>`; }
  if (!a && !n) return '';
  return `<div class="conf-barra" role="group" aria-label="Confronto tra comuni">${a}${n ? `<span>${nComuni(n)} nel confronto</span><button type="button" data-conf="apri"${n < 2 ? ' disabled' : ''}>Apri il confronto</button><button type="button" data-conf="svuota">Svuota</button>` : ''}</div>`;
}

const CONF_COL = 6; /* fino a questo numero i comuni stanno in colonna, uno accanto all'altro; oltre, la tabella si gira: un comune per riga */
const rapp = (a, b) => (b > 0 ? a / b : null);
const pc1 = (v) => pct(v, 1);
function metricheConf(D, conPro) {
  const m = [
    { k: 'pop', lab: 'Abitanti', c: 'Abitanti', f: (x) => x.pop, fmt: (v) => nf.format(v) },
    { k: 'n', lab: 'Progetti', c: 'Progetti', f: (x) => x.A.tot.n, fmt: (v) => nf.format(v), bar: 1 },
    { k: 'fin', lab: 'Finanziamento PNRR', c: 'Finanziamento', f: (x) => x.A.tot.fin, fmt: eur, bar: 1 },
    { k: 'pc', lab: '€ per abitante', c: '€/abitante', f: (x) => (x.pop > 0 && x.A.tot.n ? x.A.tot.fin / x.pop : null), fmt: (v) => nf.format(Math.round(v)) + ' €', bar: 1, fragile: 1 },
    { k: 'pcnaz', sez: 'Posizione rispetto ai comuni italiani', lab: '€ per abitante: percentile tra tutti i comuni con progetti', c: 'Percentile It.', f: (x) => D.perc(D.tutti, x.pc), fmt: (v) => Math.round(100 * v) + '°', nonsum: 1, perc: 1 },
    { k: 'fascia', lab: 'Fascia di popolazione', c: 'Fascia', f: (x) => (x.fascia >= 0 ? x.fascia : null), fmt: (v) => FASCE_POP[v][2], testo: 1, nonsum: 1 },
    { k: 'pcpari', lab: '€ per abitante: percentile tra i comuni della stessa fascia', c: 'Percentile fascia', f: (x) => (x.fascia >= 0 ? D.perc(D.pari[x.fascia], x.pc) : null), fmt: (v) => Math.round(100 * v) + '°', nonsum: 1, perc: 1 },
    { k: 'medpari', lab: '€ per abitante: mediana della stessa fascia', c: 'Mediana fascia', f: (x) => (x.fascia >= 0 && D.pari[x.fascia].length ? mediana(D.pari[x.fascia]) : null), fmt: (v) => nf.format(Math.round(v)) + ' €', nonsum: 1 },
    { k: 'pag', sez: 'Stato dei progetti', lab: 'Pagato (sul finanziamento)', c: 'Pagato', f: (x) => rapp(x.A.tot.pag, x.A.tot.fin), fmt: pc1, bar: 1, p: 1 },
    { k: 'agg', lab: 'Gara aggiudicata o oltre', c: 'Gara agg.', f: (x) => rapp(x.A.fase[1].fin, x.A.fase[0].fin), fmt: pc1, bar: 1, p: 1 },
    { k: 'lav', lab: 'Lavori o attività avviati o oltre', c: 'Lavori', f: (x) => rapp(x.A.fase[2].fin, x.A.fase[0].fin), fmt: pc1, bar: 1, p: 1 },
    { k: 'conc', lab: 'Conclusi', c: 'Conclusi', f: (x) => rapp(x.A.fase[3].fin, x.A.fase[0].fin), fmt: pc1, bar: 1, p: 1 },
    { k: 'fer', lab: 'Fermi (da attivare o senza gara né lavori)', c: 'Fermi', f: (x) => rapp(x.A.st[0].fin + x.A.st[1].fin, x.A.tot.fin), fmt: pc1, bar: 1, p: 1 },
    { k: 'rit', lab: 'In ritardo sulla fine prevista', c: 'In ritardo', f: (x) => rapp(x.A.fl[2].fin, x.A.tot.fin), fmt: pc1, bar: 1, p: 1 },
    { k: 'ferE', lab: 'Fermi, in euro', c: 'Fermi €', f: (x) => x.A.st[0].fin + x.A.st[1].fin, fmt: eur, bar: 1 },
    { k: 'ritE', lab: 'In ritardo, in euro', c: 'In ritardo €', f: (x) => x.A.fl[2].fin, fmt: eur, bar: 1 },
  ];
  S.meta.missioni.forEach((k, i) => m.push({ k, sez: i ? null : 'Finanziamento per missione', lab: NOMI_MIS[k] || k, c: k, f: (x) => x.A.mis[k]?.fin || 0, fmt: eur, bar: 1 }));
  nomiNat().forEach((nm, i) => m.push({ k: 'nat' + i, sez: i ? null : 'Che cosa è finanziato (tipo di intervento)', lab: nm, c: nm, f: (x) => x.A.nat[i]?.fin || 0, fmt: eur, bar: 1, vuoto: 1 }));
  if (conPro) {
    const at = (k, lab, c, f, fmt, extra = {}) => m.push({ k, lab, c, f: (x) => (x.pr ? f(x.pr) : null), fmt, ...extra });
    at('att1n', 'Primo soggetto attuatore', 'Primo attuatore', (r) => r.top1n, (v) => esc(v), { sez: 'Chi realizza (dall\'elenco dei progetti)', testo: 1, nonsum: 1 });
    at('att1', 'Quota del primo attuatore', 'Quota 1° att.', (r) => r.top1, pc1, { bar: 1 });
    at('att5', 'Quota dei primi cinque attuatori', 'Quota 5 att.', (r) => r.top5, pc1, { bar: 1 });
    at('hhi', 'Concentrazione (indice di Herfindahl, 0 = frammentato, 1 = un solo soggetto)', 'HHI', (r) => r.hhi, (v) => v.toLocaleString('it-IT', { maximumFractionDigits: 2, minimumFractionDigits: 2 }), { bar: 1 });
    at('big', 'Progetto più grande, in quota del finanziamento', 'Progetto max', (r) => r.big, pc1, { bar: 1 });
    at('com', 'Quota realizzata dal comune stesso (riconosciuto dal nome)', 'Comune att.', (r) => r.com, pc1, { bar: 1 });
    at('priv', 'Quota senza soggetto pubblicato (incentivi a imprese e persone)', 'Senza soggetto', (r) => r.priv, pc1, { bar: 1 });
  }
  /* avanzamento: dove si trova il finanziamento, stadio per stadio (non cumulativo) */
  const corti = ['Da attivare', 'Senza gara né lavori', 'Gara aggiudicata', 'Lavori avviati', 'Concluso', 'Senza progetto (N/A)'];
  STADI.forEach((lab, i) => m.push({ k: 'st' + i, sez: i ? null : 'Stato di avanzamento: finanziamento per stadio', lab, c: corti[i], f: (x) => x.A.st[i].fin, fmt: eur, bar: 1, vuoto: 1 }));
  /* componenti del piano (M1C1, M1C2…) */
  [...new Set(S.meta.sub.map(compDi))].sort().forEach((k, i) => m.push({ k, sez: i ? null : 'Finanziamento per componente', lab: labProg(k), c: k, f: (x) => x.A.comp[k]?.fin || 0, fmt: eur, bar: 1, vuoto: 1 }));
  return m;
}
const FASCE_POP = [[0, 1e3, 'fino a 1.000 ab.'], [1e3, 5e3, '1.000–5.000 ab.'], [5e3, 2e4, '5.000–20.000 ab.'], [2e4, 1e5, '20.000–100.000 ab.'], [1e5, 1e12, 'oltre 100.000 ab.']];
const fasciaDi = (pop) => FASCE_POP.findIndex(([a, b]) => pop >= a && pop < b);
let confSort = ['fin', -1];
const MAXDET = 60; /* l'elenco progetti si legge comune per comune: oltre questo numero non lo si scarica */
function calcolaAtt(prog, F, nomi) {
  const g = new Map(); let T = 0, big = 0;
  for (const r of prog) { if (!progOk(r, F)) continue; const v = r[8] || 0, a = r[3] || '(soggetto non pubblicato)'; g.set(a, (g.get(a) || 0) + v); T += v; if (v > big) big = v; }
  if (T <= 0) return null;
  const ord = [...g].sort((a, b) => b[1] - a[1]); let hhi = 0, com = 0, priv = 0;
  for (const [a, v] of g) { hhi += (v / T) ** 2; const u = a.toUpperCase(); if (nomi.some((n) => u.startsWith('COMUNE DI ' + n))) com += v; if (u.startsWith('(SOGGETTI PRIVATI') || u.startsWith('(SOGGETTO NON PUBBLICATO')) priv += v; }
  return { top1n: ord[0][0], top1: ord[0][1] / T, top5: ord.slice(0, 5).reduce((a, x) => a + x[1], 0) / T, hhi, big: big / T, com: com / T, priv: priv / T };
}
const COL_ST = ['#9aa0a6', '#e0a13a', '#7fb0ee', '#3987e5', '#0f7b3f'];
/* barre impilate al 100 %: profilo per missione e per stadio di ogni comune */
function graficiConf(cols, ins) {
  if (cols.length > 12) return '';
  const righe = ins ? [...cols, ins] : cols;
  const barra = (parti, tot) => (tot > 0 ? `<span class="sb">${parti.filter((p) => p.v > 0).map((p) => `<i style="width:${(100 * p.v / tot).toFixed(2)}%;background:${p.col}" title="${esc(p.lab)}: ${pct(p.v, tot)} · ${eur(p.v)}"></i>`).join('')}</span>` : '<span class="sb vuoto">nessun progetto</span>');
  const blocco = (tit, voci, fv, tot) => `<div class="conf-graf" role="group" aria-label="${esc(tit)}"><h2>${esc(tit)} <small>quota del finanziamento</small></h2>${righe.map((c) => `<div class="sbr"><span class="sbn">${esc(c.nome)}</span>${barra(voci.map((v) => ({ v: fv(c, v), col: v.col, lab: v.lab })), tot(c))}</div>`).join('')}<ul class="sbl">${voci.map((v) => `<li><i style="background:${v.col}"></i>${esc(v.lab)}</li>`).join('')}</ul></div>`;
  const mis = S.meta.missioni.map((k) => ({ k, col: COL_MIS[k], lab: NOMI_MIS[k] || k }));
  const st = [0, 1, 2, 3, 4].map((i) => ({ i, col: COL_ST[i], lab: STADI[i] }));
  return blocco('Profilo per missione', mis, (c, v) => c.A.mis[v.k]?.fin || 0, (c) => c.A.tot.fin) + blocco('Dove si trova il finanziamento', st, (c, v) => c.A.st[v.i].fin, (c) => c.A.st.slice(0, 5).reduce((a, t) => a + t.fin, 0));
}
/* distribuzione del €/abitante tra i comuni italiani con progetti (con i filtri attivi), totale e per fascia di popolazione */
function distribuzioneConf(F) {
  const V = valoriC(F), tutti = [], pari = FASCE_POP.map(() => []);
  for (const k of Object.keys(S.com)) { const c = S.com[k], v = V[k]; if (v?.n && c.pop > 0) { const x = v.fin / c.pop; tutti.push(x); pari[fasciaDi(c.pop)].push(x); } }
  tutti.sort((a, b) => a - b); pari.forEach((a) => a.sort((x, y) => x - y));
  /* percentile = quota di comuni con un valore più basso (come nella scheda) */
  const perc = (arr, v) => { if (v == null || !arr.length) return null; let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo / arr.length; };
  return { tutti, pari, perc };
}
function disegnaConfronto(F) {
  const ids = comuniDi(F.k), Fs = { ...F, x: false }, nfil = nFiltri(F); const DI = distribuzioneConf(F), conPro = ids.length <= MAXDET; let met = metricheConf(DI, conPro);
  const cols = ids.map((id) => { const c = S.com[id]; const A = analisi(cells('c', id), F), pop = c.pop || 0; return { id, nome: c.nm, sig: S.prov[c.pv]?.sigla ?? '', pop, A, pc: pop > 0 && A.tot.n ? A.tot.fin / pop : null, fascia: pop > 0 ? fasciaDi(pop) : -1 }; });
  let ins = null;
  if (cols.length > 1) { const all = []; for (const id of ids) for (const v of cells('c', id)) all.push(v); ins = { nome: 'Insieme', sig: '', pop: cols.reduce((a, c) => a + c.pop, 0), A: analisi(all, F), pc: null, fascia: -1 }; }
  /* componenti e stadi senza nemmeno un euro in nessun comune non si mostrano; l'intestazione di sezione passa alla prima riga rimasta */
  { const tutti = ins ? [...cols, ins] : cols; let pend = null, nuovo = [];
    for (const m of met) { if (m.sez) pend = m.sez; if (m.vuoto && !tutti.some((c) => (m.f(c) || 0) > 0)) continue; nuovo.push(pend ? { ...m, sez: pend } : m); pend = null; }
    met = nuovo; }
  const val = (c) => met.map((m) => m.f(c)); cols.forEach((c) => { c.v = val(c); }); if (ins) ins.v = val(ins);
  const mx = met.map((m, i) => (m.bar ? Math.max(0, ...cols.map((c) => c.v[i] ?? 0)) : 0));
  const D = S.confDati = { cols, ins, met };
  const cella = (c, i, w) => { const m = met[i], v = c.v[i]; const top = m.bar && !m.nonsum && c !== ins && mx[i] > 0 && v === mx[i] && cols.length > 1;
    return `<td class="n${top ? ' max' : ''}${m.testo ? ' txt' : ''}">${v == null ? '–' : m.fmt(v)}${m.fragile && v != null && c.A.tot.n < 10 ? ' <sup title="Meno di 10 progetti: il dato per abitante è poco stabile">†</sup>' : ''}${m.bar && v > 0 && mx[i] > 0 ? ` <span class="mini" style="width:${Math.max(1, w * v / mx[i]).toFixed(0)}px"></span>` : ''}</td>`; };
  const nome = (c) => (c === ins ? `<b>Insieme</b>` : `<a href="${href('c', c.id, Fs)}">${esc(c.nome)}</a> <small>${esc(c.sig)}</small>`);
  const disegnaTab = () => {
    let h;
    if (cols.length <= CONF_COL) {
      const tutti = ins ? [...cols, ins] : cols;
      h = `<div class="conf-scroll"><table class="conf conf-col" data-nosort><thead><tr><th scope="col">Indicatore</th>${tutti.map((c) => `<th class="n" scope="col">${nome(c)}</th>`).join('')}</tr></thead><tbody>${met.map((m, i) => `${m.sez ? `<tr class="sez"><th colspan="${tutti.length + 1}" scope="colgroup">${esc(m.sez)}</th></tr>` : ''}<tr><th scope="row">${esc(m.lab)}</th>${tutti.map((c) => cella(c, i, 36)).join('')}</tr>`).join('')}</tbody></table></div>`;
    } else {
      const i0 = Math.max(0, met.findIndex((m) => m.k === confSort[0])), dir = confSort[1];
      const righe = cols.slice().sort((a, b) => { if (confSort[0] === 'nome') return a.nome.localeCompare(b.nome, 'it') * dir; const x = a.v[i0] ?? -Infinity, y = b.v[i0] ?? -Infinity; return (x > y ? 1 : x < y ? -1 : 0) * dir; });
      const th = (k, t, n, tit) => `<th class="n-ord${n ? ' n' : ''}" scope="col" data-ord="${k}" tabindex="0" role="button" title="${esc(tit || t)}" aria-sort="${confSort[0] === k ? (dir > 0 ? 'ascending' : 'descending') : 'none'}">${esc(t)}</th>`;
      h = `<div class="conf-scroll"><table class="conf conf-riga" data-nosort><thead><tr>${th('nome', 'Comune', 0)}${met.map((m) => th(m.k, m.c, 1, m.lab)).join('')}</tr></thead><tbody>${ins ? `<tr class="ins"><td>${nome(ins)}</td>${met.map((m, i) => cella(ins, i, 30)).join('')}</tr>` : ''}${righe.slice(0, 400).map((c) => `<tr><td>${nome(c)}</td>${met.map((m, i) => cella(c, i, 30)).join('')}</tr>`).join('')}</tbody></table></div>${righe.length > 400 ? `<p class="nota">Mostrati i primi 400 di ${nf.format(righe.length)}: ordina per un altro indicatore, oppure scarica il CSV con tutti.</p>` : ''}`;
    }
    $('#conf-tab').innerHTML = h;
    $('#conf-tab').querySelectorAll('th[data-ord]').forEach((t) => { const go2 = () => { const k = t.dataset.ord; confSort = [k, confSort[0] === k ? -confSort[1] : (k === 'nome' ? 1 : -1)]; disegnaTab(); $('#conf-tab').querySelector(`th[data-ord="${k}"]`)?.focus(); }; t.addEventListener('click', go2); t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go2(); } }); });
  };
  const lv = S.it?.liv, tl = lv ? lv.reduce((a, b) => a + b, 0) : 0;
  const perimetro = !nfil && tl > 0 ? `<p class="nota conf-perim"><b>Perimetro:</b> in questa tabella entra solo il finanziamento localizzato a livello di comune, il ${(100 * lv[0] / tl).toLocaleString('it-IT', { maximumFractionDigits: 0 })} % di quello nazionale. Il resto è assegnato a province, regioni o all'ambito nazionale: un comune con pochi progetti qui non è un comune senza fondi.</p>` : '';
  $('#scheda').innerHTML = `<div class="testa"><div><h1>Confronto tra ${nComuni(cols.length)}</h1><p class="sotto">Comuni a confronto · ${nf.format(cols.reduce((a, c) => a + c.A.tot.n, 0))} progetti · estrazione del 13/06/2026</p></div></div>
  <div class="conf-az-riga"><button type="button" data-conf="esci">← Torna alla scheda</button><button type="button" data-conf="csv">Scarica CSV</button><button type="button" data-conf="svuota">Svuota il confronto</button></div>
  <div class="chips" role="group" aria-label="Comuni scelti">${(F.k || []).map((t) => `<button type="button" class="chip-conf" data-conf="rimuovi" data-tok="${t}" title="Togli dal confronto">${esc(tokEtich(t))} <span aria-hidden="true">×</span></button>`).join('')}</div>
  ${nfil ? chips(F) : ''}
  ${spiegaConf(cols)}${perimetro}
  ${graficiConf(cols, ins)}
  <div id="conf-att" class="nota"></div><div id="conf-tab"></div>
  <p class="nota">${cols.length > CONF_COL ? 'Un comune per riga: clic sull\'intestazione di una colonna per ordinare. ' : ''}${ins ? '«Insieme» somma i comuni scelti. ' : ''}Pagato, Fermi e In ritardo sono quote del finanziamento; Gara aggiudicata, Lavori e Conclusi sono quote del finanziamento dei progetti con avanzamento rilevato, come nella scheda. ${nfil ? 'I filtri attivi valgono anche qui. ' : ''}Il valore più alto di ogni indicatore è in grassetto. I percentili sono la quota di comuni italiani con un valore più basso (50° = mediana); † = meno di 10 progetti, dato per abitante poco stabile. Gli importi dei progetti localizzati solo a livello di provincia, regione o nazionale non compaiono nei comuni. <a href="#" id="l-metodo">Metodo e limiti</a>.</p>`;
  $('#l-metodo').addEventListener('click', (e) => { e.preventDefault(); apriInfo('metodo'); });
  disegnaTab();
  if (conPro) {
    $('#conf-att').textContent = 'Carico l\'elenco dei progetti per vedere chi li realizza…';
    Promise.all(ids.map((id) => get(`data/comuni/${id}.json`).then((d) => d.progetti || []).catch(() => null))).then((P) => {
      if (S.confDati !== D) return; /* nel frattempo la vista è cambiata */
      $('#conf-att').textContent = P.some((x) => x === null) ? 'Non tutti gli elenchi dei progetti si sono caricati: le righe «Chi realizza» possono mancare.' : '';
      cols.forEach((c, i) => { c.pr = P[i] ? calcolaAtt(P[i], F, [c.nome.toUpperCase()]) : null; c.v = val(c); });
      if (ins) { ins.pr = calcolaAtt(P.flatMap((x) => x || []), F, cols.map((c) => c.nome.toUpperCase())); ins.v = val(ins); }
      disegnaTab();
    });
  }
}
/* scarto di €/abitante tra il comune più alto e il più basso, scomposto per missione: i contributi sommano allo scarto */
function spiegaConf(cols) {
  const c = cols.filter((x) => x.pc != null && x.pop > 0); if (c.length < 2) return '';
  const hi = c.reduce((a, b) => (b.pc > a.pc ? b : a)), lo = c.reduce((a, b) => (b.pc < a.pc ? b : a)); if (hi === lo) return '';
  const q = (v) => nf.format(Math.round(v)) + ' €';
  const co = S.meta.missioni.map((k) => ({ k, d: (hi.A.mis[k]?.fin || 0) / hi.pop - (lo.A.mis[k]?.fin || 0) / lo.pop })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 2).filter((x) => Math.abs(x.d) >= 1);
  return `<p class="conf-spiega"><b>Da dove viene la differenza.</b> ${esc(hi.nome)} ha ${q(hi.pc)} per abitante, ${esc(lo.nome)} ${q(lo.pc)}: ${q(hi.pc - lo.pc)} di scarto.${co.length ? ` Pesano soprattutto ${co.map((x) => `${esc(NOMI_MIS[x.k] || x.k)} (${x.d >= 0 ? '+' : '−'}${q(Math.abs(x.d))} per abitante)`).join(' e ')}.` : ''}</p>`;
}
function scaricaConfronto() {
  const D = S.confDati; if (!D) return; const c = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const riga = (x, cod) => [cod, x.nome, x.sig, ...D.met.map((m, i) => { const v = x.v[i]; return v == null ? '' : m.testo ? m.fmt(v) : m.p || m.perc ? +(100 * v).toFixed(2) : m.k === 'pc' || m.k === 'medpari' ? +v.toFixed(2) : v; })].map(c).join(';');
  const head = ['Codice ISTAT', 'Comune', 'Provincia', ...D.met.map((m) => m.lab + (m.p ? ' (%)' : m.perc ? ' (percentile)' : m.k === 'pc' || m.testo ? '' : m.k === 'medpari' ? ' (€)' : m.bar && m.k !== 'n' ? ' (€)' : ''))].map(c).join(';');
  const righe = D.cols.map((x) => riga(x, x.id)); if (D.ins) righe.push(riga(D.ins, ''));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [head, ...righe].join('\n')], { type: 'text/csv' })); a.download = `pnrr_confronto_${D.cols.length}_comuni.csv`; a.click();
}

/* ---------- scheda ---------- */
const nomiNat = () => S.meta.nature.map((n) => n.charAt(0) + n.slice(1).toLowerCase());
function chips(F) {
  const l = [];
  for (const L of LIV) if (F[L]) l.push([L, labProg(F[L])]);
  if (F.nat != null) l.push(['nat', nomiNat()[F.nat]]);
  if (F.st) l.push(['st', FASI.find((f) => sameSet(F.st, f.set))?.lab || F.st.map((s) => STADI[s]).join(' + ')]); if (F.fl) l.push(['fl', FL[F.fl]]);
  if (!l.length) return '<p class="nota filtri-hint">Clic su una missione, un componente, una misura, uno stadio, un tipo di intervento o un avviso per filtrare tutto (mappa, schede, elenchi) a qualunque scala territoriale.</p>';
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

/* Componente, Misura (Investimento o Riforma) e Sub-misura: stesse colonne della tabella per missione, clic = filtro a cascata.
   Misure e sub-misure stanno in un blocco apribile (sono 122 e 164): si apre da solo quando il livello sopra è filtrato. */
function tabProg(L, A, F, dotOn) {
  const agg = A[L], dot = dotOn ? S.dotL[L] : null; const ks = Object.keys(agg); if (F[L] && !agg[F[L]]) ks.push(F[L]);
  if (!ks.length) return '';
  ks.sort();
  const mt = Math.max(1, ...ks.map((k) => Math.max(agg[k]?.fin || 0, dot?.[k] || 0))), w = (v) => Math.max(0, 90 * v / mt).toFixed(1);
  const bar = (m, k) => { const sp = dot?.[k] ? Math.max(0, dot[k] - m.fin) : 0; return `<span class="tri" role="img" aria-label="pagato ${eur(m.pag)}, su progetti non ancora pagato ${eur(Math.max(0, m.fin - m.pag))}${dot ? `, senza progetto ${eur(sp)}` : ''}"><i class="tp" style="width:${w(m.pag)}px"></i><i class="tf" style="width:${w(Math.max(0, m.fin - m.pag))}px"></i>${dot ? `<i class="ts" style="width:${w(sp)}px"></i>` : ''}</span>`; };
  const lab = (k) => (L === 'comp' ? `<b>${esc(k)}</b> ${esc(nomeProg(k))}` : `<b>${esc(etich(k))}</b> ${esc(nomeProg(k))} <small class="cod">${esc(k)}</small>`);
  const corpo = `<table><thead><tr><th>${LIV_NOME[L]}</th><th class="n">Progetti</th>${dot ? '<th class="n" title="Importo del livello nel file «Spesa per misura»">Dotazione</th>' : ''}<th class="n">Finanziamento</th>${dot ? '<th class="n" title="Dotazione non ancora assegnata a progetti">Senza progetto</th>' : ''}<th class="n">Pagato</th><th></th></tr></thead><tbody>${ks.map((k) => { const m = agg[k] || Z(); const d = dot?.[k]; return `<tr class="cl${F[L] === k ? ' on' : ''}" role="button" tabindex="0" aria-pressed="${F[L] === k}" data-f="${L}" data-v="${esc(k)}" title="${esc(k)}"><td>${lab(k)}</td><td class="n" data-v="${m.n}">${nf.format(m.n)}</td>${dot ? `<td class="n" data-v="${d ?? -1}">${d != null ? eur(d) : '–'}</td>` : ''}<td class="n" data-v="${m.fin}">${eur(m.fin)}</td>${dot ? `<td class="n" data-v="${d != null ? d - m.fin : -1e18}">${d != null ? (d >= m.fin ? eur(d - m.fin) : '−' + eur(m.fin - d)) : '–'}</td>` : ''}<td class="n" data-v="${m.fin > 0 ? m.pag / m.fin : -1}">${pct(m.pag, m.fin)}</td><td>${bar(m, k)}</td></tr>`; }).join('')}</tbody></table>`;
  const nota = L === 'comp' ? `<ul class="leg-tri"><li><i class="tp"></i>Pagato</li><li><i class="tf"></i>Già su progetti, non ancora pagato</li>${dot ? '<li><i class="ts"></i>Senza progetto nei dati</li>' : ''}</ul>` : '';
  if (L === 'comp') return `<h2>Per componente <small>${nf.format(ks.length)} · clic per filtrare</small></h2>${corpo}${nota}`;
  const tit = L === 'msr' ? 'Per misura' : 'Per sub-misura', sott = L === 'msr' ? 'investimenti e riforme' : 'le articolazioni più fini';
  const aperto = S.det[L] ?? !!(L === 'msr' ? F.comp : F.msr);
  return `<details class="prog-det" data-det="${L}"${aperto ? ' open' : ''}><summary><span>${tit}</span> <small>${sott} · ${nf.format(ks.length)} · clic per filtrare</small></summary>${corpo}</details>`;
}

/* sagoma del territorio accanto al titolo (data/sagome, generata da scrpits/sagome.py) */
async function disegnaSagoma(liv, id, n) {
  try {
    const f = !liv ? 'data/sagome/i.json' : liv === 'c' ? `data/sagome/c/${n.pv ?? id.slice(0, 3)}.json` : `data/sagome/${liv}.json`;
    const sg = (await get(f))[id ?? 'it']; const host = $('#sagoma');
    if (!sg || !host || S.cur.liv !== liv || S.cur.id !== id) return;
    host.innerHTML = `<svg viewBox="-2 -2 ${sg.w + 4} ${sg.h + 4}" role="img" aria-label="Sagoma del territorio"><path d="${sg.d}" fill-rule="evenodd"/></svg>`;
  } catch (e) { /* la sagoma è un abbellimento: senza, la scheda funziona uguale */ }
}
function disegnaScheda(liv, id, n, nome, F) {
  const A = analisi(cells(liv, id), F), T = A.tot, nfil = nFiltri(F);
  const livNome = { null: 'Italia', r: 'Regione', p: 'Provincia', c: 'Comune' }[liv];
  const sp = nome + (liv === 'c' ? ` (${S.prov[n.pv]?.sigla ?? ''})` : liv === 'p' ? ` (${n.sigla ?? ''})` : '');
  const base = A.fase[0];
  let h = `<div class="testa"><div><h1>${esc(sp)}</h1><p class="sotto">${livNome} · ${n.pop ? nf.format(n.pop) + ' abitanti (ISTAT 1/1/2026)' : ''} · estrazione del 13/06/2026</p></div><div class="sagoma" id="sagoma" aria-hidden="true"></div></div>${chips(F)}${confBarra(liv, id, F)}`;
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
  /* progetti a rischio: tre segnali dai dati ufficiali, non perdite accertate; le righe si sovrappongono (un progetto può essere fermo e in ritardo) */
  { const cu = !nfil && S.cupc ? (liv === null ? S.cupc.i.IT : S.cupc[liv]?.[id]) : null;
    const cupRiga = cu ? `<div class="riga"><span>CUP chiuso ma ancora «in corso»</span><div class="barra"><i style="width:${T.fin > 0 ? Math.max(0.5, 100 * cu[1] / T.fin) : 0}%"></i></div><span class="v">${eur(cu[1])} · ${pct(cu[1], T.fin)} · ${nf.format(cu[0])}</span></div>` : '';
    const fermi = { n: A.st[0].n + A.st[1].n, fin: A.st[0].fin + A.st[1].fin }, rit = A.fl[2], chi = A.fl[1], onF = sameSet(F.st, [0, 1]);
    if (fermi.n > 0 || rit.n > 0 || chi.n > 0 || cu || onF || F.fl) {
      h += `<h2>Progetti a rischio <small>clic per filtrare</small></h2><div class="imbuto largo">${riga('Fermi: da attivare o senza gara né lavori', fermi.n, fermi.fin, T.fin, 'data-f="st" data-v="0.1"', onF, `${eur(fermi.fin)} · ${pct(fermi.fin, T.fin)}`)}${riga('In ritardo sulla fine prevista', rit.n, rit.fin, T.fin, 'data-f="fl" data-v="2"', F.fl === 2, `${eur(rit.fin)} · ${pct(rit.fin, T.fin)}`)}${riga('Chiusura da formalizzare', chi.n, chi.fin, T.fin, 'data-f="fl" data-v="1"', F.fl === 1, `${eur(chi.fin)} · ${pct(chi.fin, T.fin)}`)}${cupRiga}</div>`;
      h += `<div class="avviso"><b>Perché potrebbero essere a rischio</b><ul><li><b>Fermi:</b> senza gara né lavori avviati, e la fase di attuazione è chiusa dal 30/06/2026. Senza un avvio è difficile che arrivino alla fine.</li><li><b>In ritardo:</b> la fine prevista era già passata al 13/06/2026 e il progetto risultava ancora «in corso». Alcuni si saranno chiusi nelle ultime settimane.</li><li><b>Chiusura da formalizzare:</b> l'iter risulta concluso ma lo stato è ancora «in corso». Rischio più basso: spesso manca solo la registrazione. Non sono contati come conclusi.</li>${cu ? '<li><b>CUP chiuso ma «in corso»:</b> il codice del progetto risulta chiuso, ma lo stato è ancora «in corso». Può essere un progetto interrotto oppure una semplice chiusura amministrativa: i dati non permettono di distinguere. Non si può filtrare, e compare solo senza filtri attivi.</li>' : ''}</ul><p class="nota">«A rischio» è un segnale, non una perdita accertata: i dati ufficiali non hanno uno stato «revocato» o «non realizzato», quindi non dicono se i fondi saranno persi. Le righe si sovrappongono: non vanno sommate. Percentuali sul finanziamento ${nfil ? 'filtrato' : 'dei progetti'}.</p></div>`;
    } }
  /* missioni */
  const mk = S.meta.missioni;
  /* dotazione ufficiale: esiste solo per l'Italia intera, quindi le colonne in più compaiono solo lì e senza filtri */
  const dotP = liv === null && F.nat == null && !F.st && !F.fl; /* la dotazione ufficiale è nazionale: si confronta solo senza filtri su territorio, natura, stadio */
  const dot = dotP ? S.ver?.per_missione : null;
  const mt = Math.max(1, ...mk.map((k) => Math.max(A.mis[k]?.fin || 0, dot?.[k]?.dotazione || 0)));
  const bar = (m, k) => { const w = (v) => Math.max(0, 90 * v / mt).toFixed(1); const sp = dot?.[k] ? Math.max(0, dot[k].dotazione - m.fin) : 0; return `<span class="tri" role="img" aria-label="pagato ${eur(m.pag)}, su progetti non ancora pagato ${eur(Math.max(0, m.fin - m.pag))}${dot ? `, senza progetto ${eur(sp)}` : ''}"><i class="tp" style="width:${w(m.pag)}px"></i><i class="tf" style="width:${w(Math.max(0, m.fin - m.pag))}px"></i>${dot ? `<i class="ts" style="width:${w(sp)}px"></i>` : ''}</span>`; };
  h += `<h2>Per missione <small>clic per filtrare</small></h2><table><thead><tr><th>Missione</th><th class="n">Progetti</th>${dot ? '<th class="n" title="Importo della misura nel file «Spesa per misura»">Dotazione</th>' : ''}<th class="n">Finanziamento</th>${dot ? '<th class="n" title="Dotazione non ancora assegnata a progetti">Senza progetto</th>' : ''}<th class="n">Pagato</th><th></th></tr></thead><tbody>${mk.filter((k) => A.mis[k] || F.mis === k).map((k) => { const m = A.mis[k] || Z(); const d = dot?.[k]; return `<tr class="cl${F.mis === k ? ' on' : ''}" role="button" tabindex="0" aria-pressed="${F.mis === k}" data-f="mis" data-v="${k}"><td>${esc(NOMI_MIS[k] || k)}</td><td class="n" data-v="${m.n}">${nf.format(m.n)}</td>${dot ? `<td class="n" data-v="${d ? d.dotazione : -1}">${d ? eur(d.dotazione) : '–'}</td>` : ''}<td class="n" data-v="${m.fin}">${eur(m.fin)}</td>${dot ? `<td class="n" data-v="${d ? d.dotazione - m.fin : -1e18}">${d ? (d.dotazione >= m.fin ? eur(d.dotazione - m.fin) : '−' + eur(m.fin - d.dotazione)) : '–'}</td>` : ''}<td class="n" data-v="${m.fin > 0 ? m.pag / m.fin : -1}">${pct(m.pag, m.fin)}</td><td>${bar(m, k)}</td></tr>`; }).join('')}</tbody></table><ul class="leg-tri"><li><i class="tp"></i>Pagato</li><li><i class="tf"></i>Già su progetti, non ancora pagato</li>${dot ? '<li><i class="ts"></i>Senza progetto nei dati (dotazione meno finanziamento)</li>' : ''}</ul><p class="nota">${dot ? 'Dotazione al 30/04/2026, progetti al 13/06/2026. «−» = progetti oltre la dotazione. ' : ''}Il motivo del mancato utilizzo non è nei dati ufficiali.</p>`;
  h += tabProg('comp', A, F, dotP) + tabProg('msr', A, F, dotP) + tabProg('sub', A, F, dotP);
  /* natura */
  const nat = nomiNat().map((nm, i) => [nm, i, A.nat[i] || Z()]).filter((x) => x[2].fin > 0 || F.nat === x[1]).sort((a, b) => b[2].fin - a[2].fin);
  const nt = Math.max(1, ...nat.map((x) => x[2].fin));
  h += `<h2>Che cosa è stato finanziato <small>clic per filtrare</small></h2><div class="imbuto">${nat.map(([nm, i, t]) => riga(esc(nm), t.n, t.fin, nt, `data-f="nat" data-v="${i}"`, F.nat === i)).join('')}</div>`;
  /* concentrazione e qualità: solo senza filtri (non ricostruibili dal cubo) */
  if (!nfil && n.conc) {
    const conc = n.conc;
    h += `<h2>Chi realizza <small>soggetti attuatori</small></h2><p class="nota">Il primo attuatore ha il ${(100 * conc.top1).toFixed(0)} % dell'importo, i primi cinque il ${(100 * conc.top5).toFixed(0)} % (indice di Herfindahl ${conc.hhi.toFixed(3)}; 0 = molto frammentato, 1 = un solo soggetto).</p><table><thead><tr><th>Soggetto attuatore</th><th class="n">Progetti</th><th class="n">Finanziamento</th><th class="n">Quota</th></tr></thead><tbody>${conc.top.map((t) => `<tr><td>${esc(t[0])}</td><td class="n" data-v="${t[2]}">${nf.format(t[2])} progetti</td><td class="n" data-v="${t[1]}">${eur(t[1])}</td><td class="n" data-v="${t[1]}">${pct(t[1], T.fin)}</td></tr>`).join('')}</tbody></table>`;
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
  disegnaSagoma(liv, id, n);
  $('#scheda').querySelectorAll('details[data-det]').forEach((d) => d.querySelector('summary').addEventListener('click', () => { S.det[d.dataset.det] = !d.open; }));
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
function valoriC(F) { const k = fStr(F, true); if (S.vc?.k !== k) S.vc = { k, v: valoriComuni(F) }; return S.vc.v; }
function concPerMis(c, F, L = 'mis') { const o2 = {}; for (let o = 0; o < c.length; o += 9) if (ok(c, o, F, L) && c[o + 2] === 4) { const k = S.sx[L][c[o]]; o2[k] = (o2[k] || 0) + c[o + 5]; } return o2; }

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
  const ctx = [{ nome: liv === 'c' ? 'Questo comune' : liv === 'p' ? 'Questa provincia' : liv === 'r' ? 'Questa regione' : 'Italia', m: me, mio: true, liv, id }];
  if (liv === 'c') ctx.push({ nome: 'Provincia', sub: prov?.nome, m: metriche('p', n.pv, prov?.pop, F), liv: 'p', id: n.pv });
  if (liv === 'c') ctx.push({ nome: 'Regione', sub: regn?.nome, m: metriche('r', n.rg, regn?.pop, F), liv: 'r', id: n.rg });
  if (liv === 'p') ctx.push({ nome: 'Regione', sub: regn?.nome, m: metriche('r', n.reg, regn?.pop, F), liv: 'r', id: n.reg });
  if (liv) ctx.push({ nome: 'Italia', m: IT, liv: null, id: null });

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
    M.forEach(([t, k, fm]) => fig(b, t, null, (f) => G.barre(f, { voci: ctx.filter((c) => c.m[k] != null).map((c) => ({ nome: c.nome, sub: c.sub, val: c.m[k], col: c.mio ? '--s6' : '--s3', liv: c.liv, id: c.id, mio: c.mio })), formatta: fm, conTip: tip, nome: t, apri: (x) => go(x.liv, x.id, F), attivo: (x) => x.mio }), k === 'rit' ? 'Dipende dalla data di estrazione (13/06/2026): non dice chi sia in ritardo oggi.' : null));
  }

  /* --- composizione --- */
  const bc = blocco('Come è fatto');
  const mk7 = S.meta.missioni.filter((k) => A.mis[k] && A.mis[k].fin > 0);
  fig(bc, 'Per missione', 'importo finanziato', (f) => G.ciambella(f, { voci: mk7.map((k) => ({ nome: k, sub: (NOMI_MIS[k] || k).replace(/^M\d /, ''), val: A.mis[k].fin })).sort((a, b) => b.val - a.val), formatta: eur, conTip: tip, nome: 'Per missione', centro: { valore: eur(T.fin), etichetta: 'PNRR' }, clic: (x) => toggle('mis', x.nome), attivo: (x) => x.nome === F.mis }));
  const kcomp = Object.keys(A.comp).filter((k) => A.comp[k].fin > 0);
  if (kcomp.length > mk7.length) bc.classList.add('tre-cia'); /* solo se i componenti sono più delle missioni: due anelli corti in una colonna, quello lungo nell'altra */
  if (kcomp.length > 1) fig(bc, 'Per componente', 'importo finanziato', (f) => G.ciambella(f, { voci: kcomp.map((k) => ({ nome: k, sub: nomeProg(k), val: A.comp[k].fin })).sort((a, b) => b.val - a.val), formatta: eur, conTip: tip, nome: 'Per componente', centro: { valore: eur(T.fin), etichetta: 'PNRR' }, clic: (x) => toggle('comp', x.nome), attivo: (x) => x.nome === F.comp }));
  fig(bc, 'Per stadio di avanzamento', 'importo finanziato', (f) => G.ciambella(f, { voci: STADI.map((s, i) => ({ nome: s, id: i, val: A.st[i].fin, sub: nf.format(A.st[i].n) + ' progetti' })).sort((a, b) => b.val - a.val), formatta: eur, conTip: tip, nome: 'Per stadio', centro: { valore: eur(T.fin), etichetta: 'PNRR' }, clic: (x) => toggle('st', String(x.id)), attivo: (x) => sameSet(F.st, [x.id]) }));
  const cp = concPerMis(cells(liv, id), F);
  const mAll = S.meta.missioni.filter((k) => { const t = A.mis[k]; return t && t.fin > 0; });
  const bm = blocco('Missione per missione');
  fig(bm, 'Quota pagata', 'pagato ÷ finanziato', (f) => G.colonne(f, { voci: mAll.map((k) => ({ nome: k, id: k, val: A.mis[k].pag / A.mis[k].fin, sub: NOMI_MIS[k] })), clic: (x) => toggle('mis', x.id), attivo: (x) => x.id === F.mis, formatta: (v) => q0(v), conTip: tip, nome: 'Quota pagata per missione', soglia: me.pag, sogliaNome: 'tutte ' + q0(me.pag) }));
  /* un livello più in basso di quello filtrato: componenti, poi misure di un componente, poi sub-misure di una misura */
  const Lc = F.msr ? 'sub' : F.comp ? 'msr' : 'comp', aggL = A[Lc];
  const kc = Object.keys(aggL).filter((k) => aggL[k].fin > 0).sort((a, b) => aggL[b].fin - aggL[a].fin).slice(0, 20);
  if (kc.length > 1) {
    const cpL = concPerMis(cells(liv, id), F, Lc), cort = (k) => (Lc === 'comp' ? k : etich(k).replace('Investimento', 'Inv.').replace('Riforma', 'Rif.')), nomeL = LIV_NOME[Lc];
    const bk = blocco(`${nomeL} per ${nomeL.toLowerCase()}`, kc.length < Object.keys(aggL).filter((k) => aggL[k].fin > 0).length ? 'le 20 più grandi per importo' : '');
    fig(bk, 'Quota pagata', 'pagato ÷ finanziato', (f) => G.colonne(f, { voci: kc.map((k) => ({ nome: cort(k), id: k, val: aggL[k].pag / aggL[k].fin, sub: labProg(k) })), clic: (x) => toggle(Lc, x.id), formatta: (v) => q0(v), conTip: tip, nome: 'Quota pagata per ' + nomeL.toLowerCase(), soglia: me.pag, sogliaNome: 'tutte ' + q0(me.pag) }));
    fig(bk, 'Importo dei progetti conclusi', 'concluso ÷ finanziato', (f) => G.colonne(f, { voci: kc.map((k) => ({ nome: cort(k), id: k, val: (cpL[k] || 0) / aggL[k].fin, sub: labProg(k), col: '--s3' })), clic: (x) => toggle(Lc, x.id), formatta: (v) => q0(v), conTip: tip, nome: 'Quota conclusa per ' + nomeL.toLowerCase(), soglia: T.fin > 0 ? A.fase[3].fin / T.fin : null, sogliaNome: 'tutte ' + q0(A.fase[3].fin / T.fin) }));
  }
  fig(bm, 'Importo dei progetti conclusi', 'concluso ÷ finanziato', (f) => G.colonne(f, { voci: mAll.map((k) => ({ nome: k, id: k, val: (cp[k] || 0) / A.mis[k].fin, sub: NOMI_MIS[k], col: '--s3' })), clic: (x) => toggle('mis', x.id), attivo: (x) => x.id === F.mis, formatta: (v) => q0(v), conTip: tip, nome: 'Quota conclusa per missione', soglia: T.fin > 0 ? A.fase[3].fin / T.fin : null, sogliaNome: 'tutte ' + q0(A.fase[3].fin / T.fin) }), 'Qui il «concluso» è sul finanziato totale della missione, non solo sui progetti con avanzamento rilevato.');

  /* --- posizione nel territorio --- */
  if (liv === null || liv === 'r') {
    const lista = liv === null ? Object.entries(S.reg).map(([k, v]) => ({ k, nome: v.nome, pop: v.pop, rip: v.rip, liv: 'r' })) : Object.entries(S.prov).filter(([, v]) => v.reg === id).map(([k, v]) => ({ k, nome: `${v.nome} (${v.sigla})`, pop: v.pop, liv: 'p' }));
    const voci = lista.map((x) => { const m = metriche(x.liv, x.k, x.pop, F); return { nome: x.nome, val: m.pc, col: x.rip ? RIPCOL[x.rip] : '--s5', mio: false, liv: x.liv, id: x.k }; }).filter((x) => x.val != null).sort((a, b) => b.val - a.val);
    const bp = blocco(liv === null ? 'Le regioni a confronto' : 'Le province della regione');
    fig(bp, 'Euro per abitante', 'tacca = media italiana', (f) => G.barre(f, { voci, apri: (x) => go(x.liv, x.id, F), formatta: (v) => nf.format(Math.round(v)) + ' €', conTip: tip, riferimento: IT.pc, rifNome: 'Italia', nome: 'Euro per abitante' }));
    const vr = lista.map((x) => { const m = metriche(x.liv, x.k, x.pop, F); return { nome: x.nome, val: m.rit, col: x.rip ? RIPCOL[x.rip] : '--s5', liv: x.liv, id: x.k }; }).filter((x) => x.val != null && x.val > 0).sort((a, b) => b.val - a.val);
    if (vr.length) fig(bp, 'Importo in ritardo', 'tacca = Italia · ' + (liv === null ? 'regioni' : 'province'), (f) => G.barre(f, { voci: vr, apri: (x) => go(x.liv, x.id, F), formatta: (v) => q0(v, 1), conTip: tip, riferimento: IT.rit, rifNome: 'Italia', nome: 'Importo in ritardo' }), 'In ritardo = «in corso» con fine prevista prima del 13/06/2026. La quota dipende dalla data di estrazione: non dice chi sia in ritardo oggi.');
  }
  if (amb && amb.length > 2) {
    const bd = blocco('I comuni a confronto', ambNome);
    const bin = []; const xs = amb.map((c) => c.pop); const lo = Math.floor(2 * Math.log10(Math.min(...xs))) / 2, hi = Math.max(...xs);
    for (let e = lo; 10 ** e < hi; e += 0.5) { const v = amb.filter((c) => c.pop >= 10 ** e && c.pop < 10 ** (e + 0.5)).map((c) => c.pc); if (v.length >= 3) bin.push({ x: 10 ** (e + 0.25), y: mediana(v) }); }
    fig(bd, 'Popolazione e fondi per abitante', `${nf.format(amb.length)} comuni con progetti`, (f) => G.dispersione(f, {
      punti: amb.map((c) => ({ x: c.pop, y: c.pc, g: 0, id: c.k })), clic: (p) => go('c', p.id, F), mediane: bin.length > 1 ? bin : null, nome: 'Comuni a confronto', xNome: 'abitanti (scala log.)', yNome: '€ per abitante (log)',
      xFmt: (v) => (v >= 1e3 ? nf.format(v / 1e3) + ' mila' : nf.format(v)), yFmt: (v) => nf.format(v) + ' €', gruppi: [{ nome: 'comuni', col: '--s5' }],
      evidenzia: liv === 'c' && me.pc != null ? { x: pop, y: me.pc, nome: n.nm } : null,
    }), 'I piccoli comuni hanno valori molto dispersi: bastano pochi progetti per spostare il dato per abitante.');
    host.lastElementChild.lastElementChild.classList.add('largo');
  }
}

/* clic / tastiera sui filtri (delegato) */
function toggle(k, v) {
  const F = { ...S.cur.F };
  if (LIV.includes(k)) { S.det = {}; setProg(F, k, F[k] === v ? null : v); }
  else if (k === 'nat') F.nat = F.nat === +v ? null : +v;
  else if (k === 'fl') F.fl = F.fl === +v ? null : +v;
  else if (k === 'st') { const s = v.split('.').map(Number); F.st = sameSet(F.st, s) ? null : s; }
  go(S.cur.liv, S.cur.id, F);
}
function scheda_click(e) {
  const ch = e.target.closest('.chip'); if (ch) { const F = { ...S.cur.F }; if (ch.dataset.x === 'all') Object.assign(F, F0(), { k: F.k, x: F.x }); else if (LIV.includes(ch.dataset.x)) setProg(F, ch.dataset.x, null); else F[ch.dataset.x] = null; go(S.cur.liv, S.cur.id, F); return; }
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
  $('#tab-figli').querySelectorAll('th[data-k]').forEach((th) => { const on = th.dataset.k === figSort[0]; th.setAttribute('aria-sort', on ? (figSort[1] > 0 ? 'ascending' : 'descending') : 'none'); th.tabIndex = 0; th.setAttribute('role', 'button'); th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); th.click(); } }); });
  $('#tab-figli').querySelectorAll('th[data-k]').forEach((th) => th.addEventListener('click', () => { figSort = [th.dataset.k, figSort[0] === th.dataset.k ? -figSort[1] : -1]; tabFigli(FG, $('#f-q').value, F); }));
  $('#tab-figli').querySelectorAll('tr.cl').forEach((tr) => { const open = (e) => { if (e.target.tagName !== 'A') location.hash = tr.dataset.h; }; tr.addEventListener('click', open); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') location.hash = tr.dataset.h; }); });
}

/* OpenCUP: scheda ufficiale del CUP (soggetto titolare, descrizione). I segnaposto tipo «N/A2» non sono CUP e non hanno link. */
const cupOk = (c) => /^[A-Z0-9]{15}$/i.test(String(c || '').trim());
const opencup = (c) => `https://www.opencup.gov.it/portale/web/opencup/home/progetto/-/cup/${encodeURIComponent(String(c).trim())}`;
const cupHtml = (c) => (cupOk(c) ? `<a href="${opencup(c)}" target="_blank" rel="noopener" title="Apri la scheda del CUP su OpenCUP (si apre in una nuova scheda; può riunire più progetti)">${esc(c)}</a>` : esc(c));

/* progetti del comune: stessi filtri della scheda */
const progOk = (r, F) => {
  if (F.mis && !r[4].startsWith(F.mis)) return false; if (F.comp && compDi(r[4]) !== F.comp) return false; if (F.msr && msrDi(r[4]) !== F.msr) return false; if (F.sub && r[4] !== F.sub) return false;
  if (F.nat != null && r[5] !== F.nat) return false; if (F.st && !F.st.includes(r[7])) return false;
  if (F.fl) { const rit = r[6] === 'In Corso' && r[12] && r[12] < ESTR; if (F.fl === 1 && !r[13]) return false; if (F.fl === 2 && !rit) return false; }
  return true;
};
const COLP = { t: (r) => r[2] || '', m: (r) => r[4] || '', s: (r) => r[7], f: (r) => r[8] || 0, p: (r) => r[9] || 0, a: (r) => r[10] || 0 };
function iniziaProgetti(n, nome, F) {
  const P = { page: 0, q: '', sort: null, dir: 1, pp: 25 }; const all = (n.progetti || []).filter((r) => progOk(r, F)); let vis = all;
  const draw = () => {
    const q = P.q.toLowerCase(); vis = all.filter((r) => !q || ((r[2] || '') + ' ' + (r[3] || '') + ' ' + r[0]).toLowerCase().includes(q));
    if (P.sort) { const g = COLP[P.sort]; vis = vis.slice().sort((a, b) => { const x = g(a), y = g(b); return (typeof x === 'string' ? x.localeCompare(y, 'it', { numeric: true }) : x - y) * P.dir; }); }
    const th = (k, t, n) => `<th${n ? ' class="n"' : ''} data-o="${k}" tabindex="0" role="button" aria-sort="${P.sort === k ? (P.dir > 0 ? 'ascending' : 'descending') : 'none'}">${t}</th>`;
    const pp = P.pp || Math.max(1, vis.length), pages = Math.max(1, Math.ceil(vis.length / pp)); P.page = Math.min(P.page, pages - 1);
    $('#p-cnt').textContent = nf.format(vis.length) + (nFiltri(F) ? ' con i filtri attivi' : '');
    $('#tab-prog').innerHTML = `<table><thead><tr><th class="n num" scope="col" title="Numero d'ordine">N.</th>${th('t', 'Progetto')}${th('m', 'Misura')}${th('s', 'Stadio')}${th('f', 'Finanziamento', 1)}${th('p', 'Pagato', 1)}${th('a', 'Aggiudicato', 1)}</tr></thead><tbody>${vis.slice(P.page * pp, (P.page + 1) * pp).map((r, i) => {
      const quota = r[11] < 0.999 ? ` <span class="pill" title="Il progetto è localizzato su più territori: importi ripartiti">quota ${(100 * r[11]).toFixed(0)} %</span>` : '';
      return `<tr><td class="n num">${P.page * pp + i + 1}</td><td>${r[2] ? esc(r[2]) : '<i>Incentivo a imprese (titolo non pubblicato)</i>'}${quota}<br><small>${r[3] ? esc(r[3]) : '<i>soggetto non pubblicato</i>'} · CUP ${cupHtml(r[0])}${r[12] ? ' · fine prevista ' + esc(r[12]) : ''}</small></td><td title="${esc(nomeProg(r[4]))}"><b>${esc(etich(r[4]))}</b><br><small>${esc(compDi(r[4]))} · ${esc(r[4])}</small></td><td><span class="pill ${r[7] === 4 ? 'ok' : r[13] ? 'warn' : ''}">${esc(STADI[r[7]])}${r[13] ? ' · iter concluso' : ''}</span></td><td class="n">${eur(r[8])}</td><td class="n">${eur(r[9])}</td><td class="n">${eur(r[10])}</td></tr>`;
    }).join('')}</tbody></table><div class="pager"><button id="pg-p" ${P.page ? '' : 'disabled'}>‹</button> pagina ${P.page + 1} di ${pages} (${nf.format(vis.length)} progetti) <button id="pg-n" ${P.page < pages - 1 ? '' : 'disabled'}>›</button><label class="pager-pp">Elementi per pagina: <select id="pg-pp">${[25, 50, 100, 0].map((v) => `<option value="${v}"${v === P.pp ? ' selected' : ''}>${v || 'Tutti'}</option>`).join('')}</select></label></div>`;
    $('#tab-prog').querySelectorAll('th[data-o]').forEach((h) => { const go = () => { const k = h.dataset.o; P.dir = P.sort === k ? -P.dir : (['f', 'p', 'a'].includes(k) ? -1 : 1); P.sort = k; P.page = 0; draw(); $('#tab-prog').querySelector(`th[data-o="${k}"]`)?.focus(); }; h.addEventListener('click', go); h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
    $('#pg-pp').onchange = (e) => { P.pp = +e.target.value; P.page = 0; draw(); $('#pg-pp').focus(); };
    $('#pg-p').onclick = () => { P.page--; draw(); }; $('#pg-n').onclick = () => { P.page++; draw(); };
  };
  $('#p-q').addEventListener('input', (e) => { P.q = e.target.value; P.page = 0; draw(); });
  const scarica = (righe, suffisso) => {
    const c = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const head = ['CUP', 'Codice locale', 'Titolo', 'Soggetto attuatore', 'Missione', 'Componente', 'Misura', 'Sottomisura', 'Nome sottomisura', 'Natura', 'Stadio', 'Finanziamento PNRR', 'Pagato PNRR', 'Aggiudicato', 'Quota localizzazione', 'Fine prevista', 'OpenCUP'];
    const lines = righe.map((r) => [r[0], r[1], r[2], r[3], r[4].slice(0, 2), compDi(r[4]), msrDi(r[4]), r[4], nomeProg(r[4]), S.meta.nature[r[5]], STADI[r[7]], r[8], r[9], r[10], r[11], r[12], cupOk(r[0]) ? opencup(r[0]) : ''].map(c).join(';'));
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
    const [meta, it, reg, prov, com, bbox, ci, cr, cp, cc, ver, cupc] = await Promise.all(['meta', 'italia', 'regioni', 'province', 'comuni', 'bbox', 'cubo_i', 'cubo_r', 'cubo_p', 'cubo_c', 'verifiche', 'cup_chiusi'].map((n) => get(`data/${n}.json`)));
    Object.assign(S, { meta, it, reg, prov, com, bbox, ver, cupc }); S.cube = { i: ci, r: cr, p: cp, c: cc };
    /* gerarchia del piano per ogni sub-misura (indice delle celle) e dotazione ufficiale aggregata per livello */
    S.sx = { mis: meta.sub.map((c) => c.slice(0, 2)), comp: meta.sub.map(compDi), msr: meta.sub.map(msrDi), sub: meta.sub.slice(), mi: meta.sub.map((c) => meta.missioni.indexOf(c.slice(0, 2))) };
    S.dotL = { comp: {}, msr: {}, sub: {} };
    for (const [c, v] of Object.entries(meta.dot)) { for (const L of ['comp', 'msr', 'sub']) { const k = su(c, L); S.dotL[L][k] = (S.dotL[L][k] || 0) + v; } }
  } catch (e) { $('#scheda').innerHTML = `<p class="avviso alert">Impossibile caricare i dati: ${esc(e.message)}</p>`; return; }
  filtriInit(); $('#scheda').addEventListener('click', scheda_click);
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-conf]'); if (b && !b.disabled) azioneConf(b.dataset.conf, b.dataset); });
  /* la ricerca (js/guscio.js) chiede di aggiungere un comune; «vaiComune» apre il comune tenendo la selezione */
  document.addEventListener('conf-aggiungi', (e) => { const id = e.detail?.id; if (id && S.com[id] && S.cur) setConf((k) => (comuniDi(k).includes(id) ? k : [...k.filter((t) => t !== 'x' + id), id])); });
  $('#scheda').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-f][role="button"]')) { e.preventDefault(); toggle(e.target.dataset.f, e.target.dataset.v); } });
  document.addEventListener('tema-cambia', () => { if (S.map && tono() !== S.tonoMappa) { S.tonoMappa = tono(); S.map.setStyle(STILI[S.tonoMappa], { diff: false }); } else if (S.map?.getLayer('vela')) { const st = getComputedStyle(document.documentElement); S.map.setPaintProperty('vela', 'fill-color', st.getPropertyValue('--bg')); S.map.setPaintProperty('bordi', 'line-color', st.getPropertyValue('--surface')); aggiornaMappa(); } if (S.cur && S.cube.c) route(); });
  addEventListener('hashchange', route);
  S.vista0 = vistaDaHash(); creaMappa(); route();
  /* ponte per la lente (js/lente-app.js), che vive in un file a parte */
  window.AtlantePNRR = { S, go, get, evidenzia, parseHash, vaiComune: (id) => go('c', id, { ...F0(), k: S.cur?.F.k || null }) };
  document.dispatchEvent(new Event('atlante-pronto'));
}
init();
