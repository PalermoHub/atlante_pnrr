/* Atlante PNRR · «Cosa dicono i dati». Tutti i numeri del testo, dei grafici e delle mappe vengono dai JSON in data/
   (gli stessi dell'atlante): qui si fanno solo somme, rapporti e ordinamenti. Nessuna cifra è scritta a mano
   nella prosa. Controllo indipendente: scrpits/relazione_numeri.py. */
(() => {
  'use strict';
  const G = window.GraficiPNRR;
  const nf = (n, d = 0) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
  const mld = (v, d = 1) => nf(v / 1e9, d) + ' miliardi';
  const eur = (v) => (Math.abs(v) >= 1e9 ? nf(v / 1e9, 1) + ' mld €' : Math.abs(v) >= 1e6 ? nf(v / 1e6, v >= 1e8 ? 0 : 1) + ' mln €' : nf(v / 1e3) + ' mila €');
  const eab = (v) => nf(v) + ' €';
  const pc = (q, d = 0) => nf(100 * q, d) + '%';
  const el = (id) => document.getElementById(id);
  const H = (tag, a = {}, kids = []) => { const e = document.createElement(tag); for (const k in a) { if (k === 'text') e.textContent = a[k]; else if (a[k] != null) e.setAttribute(k, a[k]); } [].concat(kids).forEach((c) => c != null && e.append(c.nodeType ? c : document.createTextNode(c))); return e; };
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, a = {}) => { const e = document.createElementNS(NS, tag); for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); return e; };
  const RIP = { 'Nord-ovest': '--c1', 'Nord-est': '--c2', Centro: '--c3', Sud: '--c4', Isole: '--c5' };
  const ORD_RIP = ['Nord-ovest', 'Nord-est', 'Centro', 'Sud', 'Isole'];
  const NOMI_MIS = { M1: 'Digitale, innovazione, cultura', M2: 'Transizione verde', M3: 'Infrastrutture e mobilità', M4: 'Istruzione e ricerca', M5: 'Inclusione e coesione', M6: 'Salute', M7: 'REPowerEU (energia)' };
  const conTip = G.conTip;
  const get = (n) => fetch(`data/${n}.json?d=2`).then((r) => { if (!r.ok) throw new Error(n + ' ' + r.status); return r.json(); });

  const art = el('rel');
  const sez = (id, n, titolo) => { const s = H('section', { class: 'rsez', id }, [H('h2', { id: id + '-t', 'data-n': n, text: titolo })]); s.setAttribute('aria-labelledby', id + '-t'); art.append(s); return s; };
  const P = (s, html) => { const p = H('p'); p.innerHTML = html; s.append(p); return p; };
  const fig = (s, titolo, sub, corpo, nota) => {
    const f = H('figure', { class: 'grafico' }, [H('figcaption', {}, [H('b', { text: titolo }), sub ? H('small', { text: sub }) : null])]);
    s.append(f); corpo(f); if (nota) f.append(H('p', { class: 'grafico-nota', text: nota })); return f;
  };
  const calc = (s, html) => { const d = H('details', { class: 'calc' }, [H('summary', { text: 'Come l’abbiamo calcolato' }), H('div')]); d.lastChild.innerHTML = html; s.append(d); };
  const limiti = (s, voci) => { const a = H('aside', { class: 'limiti' }, [H('b', { text: 'Cosa i dati non dicono' })]); const u = H('ul'); voci.forEach((v) => { const li = H('li'); li.innerHTML = v; u.append(li); }); a.append(u); s.append(a); };
  function seg(host, voci, iniziale, cb) {
    const w = H('div', { class: 'seg', role: 'group' });
    voci.forEach(([k, t]) => {
      const b = H('button', { type: 'button', 'aria-pressed': String(k === iniziale), text: t });
      b.addEventListener('click', () => { [...w.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); cb(k); });
      w.append(b);
    });
    host.append(w); return w;
  }

  Promise.all(['italia', 'regioni', 'province', 'comuni', 'meta', 'cubo_c', 'cubo_i', 'cubo_r', 'verifiche', 'giovani', 'contesto', 'sanita', 'pa_digitale', 'acqua'].map(get)).then(([it, reg, prov, com, meta, cc, ci, cr, ver, gio, cont, san, pa, acq]) => {
    el('caric').remove();

    /* ================= calcoli di base ================= */
    const fin = it.fin, pag = it.pag, NA = it.fs[5];
    const subMis = meta.sub.map((c) => meta.missioni.indexOf(c.slice(0, 2))); /* le celle dei cubi sono per sub-misura: qui serve la missione */
    const celle = (c) => { const r = []; for (let o = 0; o < c.length; o += 9) r.push({ m: subMis[c[o]], na: c[o + 1], s: c[o + 2], f: c[o + 3], n: c[o + 4], fin: c[o + 5], pag: c[o + 7] }); return r; };
    const cellaI = celle(ci.IT);
    const stg = Array.from({ length: 6 }, () => ({ n: 0, fin: 0, pag: 0 }));
    let icc3 = { n: 0, fin: 0 };
    cellaI.forEach((c) => { stg[c.s].n += c.n; stg[c.s].fin += c.fin; stg[c.s].pag += c.pag; if (c.s === 3 && (c.f & 1)) { icc3.n += c.n; icc3.fin += c.fin; } });
    const finSenzaNA = fin - NA, pagSenzaNA = pag - stg[5].pag;
    const privNA = it.conc.top.find((t) => /privati/.test(t[0]))[1], ambNA = it.conc.top.find((t) => /AMBIENTE/.test(t[0]))[1];

    const regs = Object.entries(reg).map(([id, r]) => ({ id, ...r }));
    const provs = Object.entries(prov).map(([id, p]) => ({ id, ...p }));

    /* comuni: solo la parte di progetti localizzata al comune (dal cubo) */
    const CF = {};
    for (const [id, c] of Object.entries(cc)) {
      const info = com[id]; if (!info) continue;
      const o = { id, nm: info.nm, pop: info.pop || 0, rg: info.rg, pv: info.pv, fin: 0, pag: 0, conc: 0, rit: 0, gio: gio.c[id] };
      celle(c).forEach((x) => { o.fin += x.fin; o.pag += x.pag; if (x.s === 4) o.conc += x.fin; if (x.f & 2) o.rit += x.fin; });
      CF[id] = o;
    }
    const C = Object.values(CF), totCom = C.reduce((s, c) => s + c.fin, 0);
    /* giovani 0-24: per comune come in data/giovani.json; per province e regioni si sommano i comuni (stesse colonne) */
    const GIOP = {}, GIOR = {};
    for (const [id, r] of Object.entries(gio.c)) {
      const c = com[id]; if (!c) continue;
      for (const [m, k] of [[GIOP, c.pv], [GIOR, c.rg]]) { const t = m[k] || (m[k] = new Array(19).fill(0)); for (let i = 0; i < 19; i++) t[i] += r[i]; }
    }

    /* ripartizioni */
    const rip = {};
    regs.forEach((r) => { const d = rip[r.rip] || (rip[r.rip] = { fin: 0, pag: 0, pop: 0, conc: 0 }); d.fin += r.fin; d.pag += r.pag; d.pop += r.pop; d.conc += r.fs[4]; });
    const totReg = regs.reduce((s, r) => s + r.fin, 0), popReg = regs.reduce((s, r) => s + r.pop, 0);
    const sudFin = rip.Sud.fin + rip.Isole.fin, sudPop = rip.Sud.pop + rip.Isole.pop;
    /* quota pagata «attesa»: stessa quota pagata nazionale per ogni coppia missione × tipo d'intervento (N/A esclusi) */
    const nm = {};
    cellaI.forEach((c) => { if (c.s === 5) return; const d = nm[c.m + '_' + c.na] || (nm[c.m + '_' + c.na] = [0, 0]); d[0] += c.fin; d[1] += c.pag; });
    regs.forEach((r) => { let a = 0; celle(cr[r.id]).forEach((c) => { a += c.fin * nm[c.m + '_' + c.na][1] / nm[c.m + '_' + c.na][0]; }); r.att = a; });
    const attRip = {}; regs.forEach((r) => { attRip[r.rip] = (attRip[r.rip] || 0) + r.att; });

    /* ================= componenti ================= */

    /* dispersione province: fondi per abitante (x) e pagato per abitante (y), colore = zona */
    function scatter(h) {
      const pts = provs.filter((p) => p.pop > 0 && p.fin > 0).map((p) => ({ p, x: p.fin / p.pop, y: p.pag / p.pop, rip: reg[p.reg].rip }));
      const W = 720, Hh = 420, m = { l: 56, r: 12, t: 12, b: 42 };
      const mx = Math.ceil(Math.max(...pts.map((q) => Math.max(q.x, q.y))) / 1000) * 1000;
      const X = (v) => m.l + v / mx * (W - m.l - m.r), Y = (v) => Hh - m.b - v / mx * (Hh - m.t - m.b);
      const svg = S('svg', { viewBox: `0 0 ${W} ${Hh}`, class: 'sc', role: 'img' });
      svg.setAttribute('aria-label', 'Province: fondi per abitante e pagato per abitante');
      for (let v = 0; v <= mx; v += 1000) {
        svg.append(S('line', { x1: X(0), x2: X(mx), y1: Y(v), y2: Y(v), class: 'sc-gr' }), S('line', { x1: X(v), x2: X(v), y1: Y(0), y2: Y(mx), class: 'sc-gr' }));
        const a = S('text', { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }); a.textContent = nf(v); const b = S('text', { x: X(v), y: Hh - m.b + 15, 'text-anchor': 'middle' }); b.textContent = nf(v); svg.append(a, b);
      }
      svg.append(S('line', { x1: X(0), y1: Y(0), x2: X(mx), y2: Y(mx), class: 'sc-eq' }));
      pts.forEach((q) => {
        const c = S('circle', { cx: X(q.x), cy: Y(q.y), r: 5, tabindex: '0', style: `fill:var(${RIP[q.rip]})` });
        c.setAttribute('aria-label', `${q.p.nome}: fondi ${nf(q.x)} euro a testa, pagato ${nf(q.y)} euro a testa`);
        conTip(c, `${q.p.nome} (${q.p.sigla})`, [['Zona', q.rip], ['Fondi a testa', nf(q.x) + ' €'], ['Pagato a testa', nf(q.y) + ' €'], ['Quota pagata', pc(q.p.pag / q.p.fin, 1)]]);
        svg.append(c);
      });
      const tx = S('text', { x: (m.l + W - m.r) / 2, y: Hh - 6, 'text-anchor': 'middle' }); tx.textContent = 'fondi assegnati, euro per abitante';
      const ty = S('text', { x: 12, y: (m.t + Hh - m.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${(m.t + Hh - m.b) / 2})` }); ty.textContent = 'già pagato, euro per abitante';
      svg.append(tx, ty);
      h.append(svg, H('div', { class: 'leg-rip' }, ORD_RIP.map((k) => H('span', {}, [H('i', { style: `background:var(${RIP[k]})` }), k]))));
    }

    /* mappa: comuni / province / regioni, quattro indicatori, caricata solo quando entra in vista */
    const IND = {
      pc: { nome: 'Fondi per abitante', fmt: (v) => nf(v) + ' €', desc: 'Finanziamento PNRR diviso per gli abitanti del territorio. Attenzione ai piccoli comuni: un solo grande progetto fa salire il valore.', v: (o) => (o.pop > 0 && o.fin > 0 ? o.fin / o.pop : null) },
      pag: { nome: 'Quota già pagata', fmt: (v) => pc(v, 0), desc: 'Quanta parte dei fondi è già stata pagata. Più è alta, più soldi sono già stati versati a chi realizza i progetti.', v: (o) => (o.fin > 0 ? o.pag / o.fin : null) },
      conc: { nome: 'Quota di soldi di progetti conclusi', fmt: (v) => pc(v, 0), desc: 'Quanta parte dei fondi riguarda progetti con stato «concluso».', v: (o) => (o.fin > 0 ? o.conc / o.fin : null) },
      rit: { nome: 'Quota di soldi in ritardo', fmt: (v) => pc(v, 0), desc: 'Quanta parte dei fondi riguarda progetti «in corso» con fine prevista già passata al 13 giugno 2026. Può essere cambiata nelle ultime settimane.', v: (o) => (o.fin > 0 ? o.rit / o.fin : null) },
      gio_l: { gio: 1, nome: 'Euro per giovane (senso largo)', fmt: (v) => nf(Math.round(v)) + ' €', desc: 'Misure per i giovani in senso largo, divise per i residenti di 0-24 anni (ISTAT 1/1/2024). Nei comuni con meno di 50 giovani un solo progetto produce valori enormi: guardare la mappa con prudenza.', v: (o) => (o.gio && o.gio[0] > 0 ? o.gio[3] / o.gio[0] : null) },
      gio_s: { gio: 1, nome: 'Euro per giovane (senso stretto)', fmt: (v) => nf(Math.round(v)) + ' €', desc: 'Solo le misure quasi esclusive per i giovani, divise per i residenti di 0-24 anni (ISTAT 1/1/2024).', v: (o) => (o.gio && o.gio[0] > 0 ? o.gio[2] / o.gio[0] : null) },
      gio_quota: { gio: 1, nome: 'Quota di residenti 0-24', fmt: (v) => pc(v, 1), desc: 'Quanta parte degli abitanti ha tra 0 e 24 anni (ISTAT 1/1/2024).', v: (o) => (o.gio && o.gio[1] > 0 ? o.gio[0] / o.gio[1] : null) },
      gio_pag: { gio: 1, nome: 'Quota pagata delle misure per i giovani', fmt: (v) => pc(v, 1), desc: 'Pagato diviso assegnato per le misure quasi esclusive per i giovani.', v: (o) => (o.gio && o.gio[2] > 0 ? o.gio[5] / o.gio[2] : null) },
      san_pc: { san: 1, nome: 'Euro per abitante (Missione 6, salute)', fmt: (v) => nf(v) + ' €', desc: 'Finanziamento della Missione 6 «Salute» diviso per gli abitanti. Nei comuni solo la quota localizzata nel comune; nelle regioni anche i fondi attribuiti alla regione (fascicolo sanitario, telemedicina, assistenza domiciliare).', v: (o) => (o.san && o.san[0] > 0 && o.san[2] > 0 ? o.san[2] / o.san[0] : null) },
      san_c1: { san: 1, nome: 'Quota per la sanità di prossimità', fmt: (v) => pc(v, 1), desc: 'Quanta parte della Missione 6 va alla componente 6.1: Case e Ospedali di Comunità, centrali operative, assistenza domiciliare, telemedicina. Il resto è su ospedali, grandi apparecchiature, fascicolo sanitario e ricerca.', v: (o) => (o.san && o.san[2] > 0 ? o.san[4] / o.san[2] : null) },
      san_pag: { san: 1, nome: 'Quota già pagata della Missione 6', fmt: (v) => pc(v, 1), desc: 'Pagato diviso assegnato per la Missione 6 «Salute».', v: (o) => (o.san && o.san[2] > 0 ? o.san[3] / o.san[2] : null) },
      san_cdc: { san: 1, nome: 'Abitanti per Casa della Comunità', fmt: (v) => nf(v) + ' ab.', desc: 'Abitanti del territorio diviso il numero di Case della Comunità finanziate (sub-misura M6C1I1.01.00). È una media, non un obiettivo di Piano.', v: (o) => (o.san && o.san[11] > 0 ? o.san[0] / o.san[11] : null) },
      pa_pc: { pa: 1, nome: 'Euro per abitante (PA digitale)', fmt: (v) => nf(Math.round(v)) + ' €', desc: 'Finanziamento della Missione 1.1 «Digitalizzazione, innovazione e sicurezza nella PA» diviso per gli abitanti. Comprende anche giustizia e ministeri, che è in gran parte spesa per il personale dei tribunali.', v: (o) => (o.pa && o.pa[0] > 0 && o.pa[1] > 0 ? o.pa[1] / o.pa[0] : null) },
      pa_pc2: { pa: 1, nome: 'Euro per abitante (PA digitale, senza giustizia e ministeri)', fmt: (v) => nf(Math.round(v)) + ' €', desc: 'La stessa componente senza le sub-misure di giustizia e ministeri: è la digitalizzazione che arriva ai comuni e ai cittadini. L&apos;Ufficio del Processo, che è spesa per il personale dei tribunali, è escluso.', v: (o) => { if (!o.pa || !(o.pa[0] > 0)) return null; const x = o.pa[1] - o.pa[13]; return x > 0 ? x / o.pa[0] : null; } },
      pa_pag: { pa: 1, nome: 'Quota già pagata della PA digitale', fmt: (v) => pc(v, 0), desc: 'Pagato diviso assegnato per la Missione 1.1.', v: (o) => (o.pa && o.pa[1] > 0 ? o.pa[2] / o.pa[1] : null) },
      pa_serv: { pa: 1, nome: 'Quota per i servizi digitali al cittadino', fmt: (v) => pc(v, 0), desc: 'Quanta parte dei soldi va ai servizi digitali al cittadino: sito del comune, accessibilità, PagoPA e app IO, SPID/CIE/ANPR, avvisi pubblici.', v: (o) => (o.pa && o.pa[1] > 0 ? o.pa[3] / o.pa[1] : null) },
      pa_giust: { pa: 1, nome: 'Quota per giustizia e ministeri', fmt: (v) => pc(v, 0), desc: 'Quanta parte dei soldi va alla digitalizzazione interna di tribunali e ministeri, compreso l&apos;Ufficio del Processo.', v: (o) => (o.pa && o.pa[1] > 0 ? o.pa[13] / o.pa[1] : null) },
      acq_pc: { acq: 1, nome: 'Euro per abitante (acqua e dissesto)', fmt: (v) => nf(Math.round(v)) + ' €', desc: 'Finanziamento della Missione 2.4 «Tutela del territorio e della risorsa idrica» diviso per gli abitanti. Nei comuni solo la quota localizzata nel comune: invasi, fiumi e acquedotti servono territori più larghi.', v: (o) => (o.acq && o.acq[0] > 0 && o.acq[1] > 0 ? o.acq[1] / o.acq[0] : null) },
      acq_alluv: { acq: 1, nome: 'Quota per alluvioni e dissesto', fmt: (v) => pc(v, 0), desc: 'Quanta parte dei soldi va alle misure per il rischio di alluvione e idrogeologico.', v: (o) => (o.acq && o.acq[1] > 0 ? o.acq[7] / o.acq[1] : null) },
      acq_pag: { acq: 1, nome: 'Quota già pagata (acqua e dissesto)', fmt: (v) => pc(v, 0), desc: 'Pagato diviso assegnato per la Missione 2.4.', v: (o) => (o.acq && o.acq[1] > 0 ? o.acq[2] / o.acq[1] : null) },
      acq_com: { acq: 1, nome: 'Quota con un comune come attuatore', fmt: (v) => pc(v, 0), desc: 'Quanta parte dei soldi ha un comune come soggetto attuatore. Il resto passa da ministeri, regioni, consorzi di bonifica e gestori del servizio idrico.', v: (o) => (o.acq && o.acq[1] > 0 ? o.acq[18] / o.acq[1] : null) },
    };
    const DATI = {
      c: () => Object.fromEntries(Object.entries(CF).map(([id, o]) => [id, { ...o, san: san.c[id], pa: pa.c[id], acq: acq.c[id] }])),
      p: () => Object.fromEntries(provs.map((p) => [p.id, { fin: p.fin, pag: p.pag, conc: p.fs[4], rit: p.rit[1], pop: p.pop, gio: GIOP[p.id], san: san.p[p.id], pa: pa.p[p.id], acq: acq.p[p.id] }])),
      r: () => Object.fromEntries(regs.map((r) => [r.id, { fin: r.fin, pag: r.pag, conc: r.fs[4], rit: r.rit[1], pop: r.pop, gio: GIOR[r.id], san: san.r[r.id], pa: pa.r[r.id], acq: acq.r[r.id] }])),
    };
    const NOME = { c: (id) => `${CF[id]?.nm} (${prov[CF[id]?.pv]?.sigla || ''})`, p: (id) => prov[id]?.nome, r: (id) => reg[id]?.nome };
    let protocollo = false;
    function mappa(host, { def, livello }) {
      const st = { liv: livello, ind: def };
      const sel = (opts, val, cb, label) => { const s = H('select', { 'aria-label': label }, opts.map(([k, t]) => H('option', { value: k, text: t }))); s.value = val; s.addEventListener('change', () => cb(s.value)); return H('label', {}, [label + ' ', s]); };
      const desc = H('p', { class: 'mappa-desc' }), leg = H('div', { class: 'mappa-leg', 'aria-live': 'polite' }), tela = H('div', { class: 'mappa-tela' }), mp = H('div', { class: 'mp' }), tip = H('div', { class: 'mappa-tip', hidden: '' });
      tela.append(mp, leg, tip);
      const barra = H('div', { class: 'mappa-barra' }, [
        sel([['c', 'Comuni'], ['p', 'Province'], ['r', 'Regioni']], st.liv, (v) => { st.liv = v; colora(); }, 'Livello'),
        sel(Object.entries(IND).map(([k, v]) => [k, v.nome]), st.ind, (v) => { st.ind = v; colora(); }, 'Colora per'),
      ]);
      host.append(H('div', { class: 'mappa-box' }, [barra, tela, desc]));
      let map = null, tono = null, vals = {}, brk = [];
      const ramp = () => { const cs = getComputedStyle(document.documentElement); return [1, 2, 3, 4, 5, 6, 7].map((i) => cs.getPropertyValue('--s' + i).trim()); };
      const stile = () => (document.documentElement.getAttribute('data-tone') === 'dark' ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/positron');
      function colora() {
        const I = IND[st.ind], D = DATI[st.liv]();
        vals = {}; Object.entries(D).forEach(([id, o]) => { const v = I.v(o); if (v != null && isFinite(v)) vals[id] = v; });
        const arr = Object.values(vals).sort((a, b) => a - b), k = 7; brk = [];
        for (let i = 1; i < k; i++) brk.push(arr[Math.min(arr.length - 1, Math.floor(i * arr.length / k))]);
        const r = ramp(), classe = (v) => { let i = 0; while (i < brk.length && v >= brk[i]) i++; return r[i]; };
        desc.textContent = I.desc + (st.liv !== 'c' ? ' Per province e regioni il valore include anche i progetti indicati solo a quel livello.' : ' Per i comuni sono considerati solo i progetti localizzati nel comune.');
        const lo = arr[0], hi = arr[arr.length - 1];
        leg.replaceChildren(H('div', { text: `${I.nome} · ${{ c: 'comuni', p: 'province', r: 'regioni' }[st.liv]}` }), H('div', { class: 'rampa' }, r.map((c) => H('i', { style: `background:${c}` }))), H('div', { class: 'estr' }, [H('span', { text: arr.length ? I.fmt(lo) : '' }), H('span', { text: arr.length ? I.fmt(hi) : '' })]), H('div', { class: 'estr' }, [H('span', { text: 'meno' }), H('span', { text: 'più' })]));
        if (!map || !map.getLayer('comuni')) return;
        const chiave = st.liv === 'c' ? ['get', 'pro_com_t'] : st.liv === 'p' ? ['slice', ['get', 'pro_com_t'], 0, 3] : ['to-string', ['get', 'cod_reg']];
        const nessuno = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#ccc';
        const expr = ['match', chiave]; let n = 0;
        for (const [id, v] of Object.entries(vals)) { expr.push(id, classe(v)); n++; }
        expr.push(nessuno); map.setPaintProperty('comuni', 'fill-color', n ? expr : nessuno);
      }
      function livelli() {
        const prima = (map.getStyle().layers.find((l) => l.type === 'symbol') || {}).id;
        map.addSource('c', { type: 'vector', url: 'pmtiles://' + new URL('data/geo/comuni.pmtiles', location.href).href, attribution: 'Confini: ISTAT/ANNCSU · Dati: Italia Domani (CC-BY 4.0)' });
        map.addLayer({ id: 'comuni', type: 'fill', source: 'c', 'source-layer': 'comuni', paint: { 'fill-color': '#ccc', 'fill-opacity': 0.88 } }, prima);
        map.addLayer({ id: 'bordi', type: 'line', source: 'c', 'source-layer': 'comuni', minzoom: 7, paint: { 'line-color': getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(), 'line-width': 0.4 } }, prima);
        colora();
      }
      function avvia() {
        if (typeof maplibregl === 'undefined' || typeof pmtiles === 'undefined') { mp.append(H('div', { class: 'mappa-ko', text: 'La mappa non si è caricata (servono le librerie esterne). Il resto della relazione funziona.' })); return; }
        if (!protocollo) { maplibregl.addProtocol('pmtiles', new pmtiles.Protocol().tile); protocollo = true; }
        tono = stile();
        map = new maplibregl.Map({
          container: mp, style: tono, bounds: [[6.6, 35.5], [18.6, 47.1]], fitBoundsOptions: { padding: 20 }, attributionControl: { compact: true }, dragRotate: false, maxPitch: 0, cooperativeGestures: true,
          locale: { 'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rotellina per ingrandire la mappa', 'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rotellina per ingrandire la mappa', 'CooperativeGesturesHandler.MobileHelpText': 'Usa due dita per spostare la mappa' },
        });
        map.touchZoomRotate.disableRotation(); map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        map.on('style.load', livelli);
        const senzaHover = matchMedia('(hover: none)'); const chiudiTip = () => { tip.hidden = true; };
        map.on('mousemove', 'comuni', (e) => {
          if (senzaHover.matches) return chiudiTip();
          const f = e.features && e.features[0]; if (!f) return chiudiTip();
          const cid = f.properties.pro_com_t, id = st.liv === 'c' ? cid : st.liv === 'p' ? cid.slice(0, 3) : String(f.properties.cod_reg);
          const v = vals[id]; tip.hidden = false;
          tip.replaceChildren(H('b', { text: NOME[st.liv](id) || id }), H('span', { text: v == null ? 'nessun dato' : `${IND[st.ind].nome}: ${IND[st.ind].fmt(v)}` }));
          tip.style.left = Math.min(e.point.x + 12, tela.clientWidth - 230) + 'px'; tip.style.top = Math.max(4, e.point.y - 8) + 'px';
        });
        map.on('mouseleave', 'comuni', chiudiTip); map.getCanvas().addEventListener('pointerleave', chiudiTip); map.on('movestart', chiudiTip);
        addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiTip(); });
        map.on('error', (e) => { if (e && e.error && /pmtiles|404|Failed/i.test(String(e.error.message))) console.warn('mappa:', e.error.message); });
      }
      colora();
      document.addEventListener('tema-cambia', () => { if (!map) return; if (stile() !== tono) { tono = stile(); map.setStyle(tono, { diff: false }); } else colora(); });
      if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); avvia(); } }, { rootMargin: '300px' }); io.observe(tela); } else avvia();
    }

    /* ================= testata e «in breve» ================= */
    const ord = C.slice().sort((a, b) => a.fin - b.fin), nC = ord.length;
    const quotaDa = (q) => { const k = Math.floor(nC * q); return ord.slice(k).reduce((s, c) => s + c.fin, 0) / totCom; };
    const top1n = nC - Math.floor(nC * 0.99), top1 = quotaDa(0.99), meta50 = 1 - quotaDa(0.5);
    const roma = C.slice().sort((a, b) => b.fin - a.fin)[0];
    const sudPag = (rip.Sud.pag + rip.Isole.pag) / sudFin, nordPag = (rip['Nord-ovest'].pag + rip['Nord-est'].pag) / (rip['Nord-ovest'].fin + rip['Nord-est'].fin);
    const concMedio = stg[4].fin / stg[4].n, altroMedio = stg[3].fin / stg[3].n;

    art.append(H('header', { class: 'testata' }, [
      H('h1', { text: 'Dove vanno a finire i soldi del PNRR?' }),
      H('p', { class: 'sottotitolo', text: 'Una lettura dei dati ufficiali, in parole semplici. Ogni cifra si può controllare.' }),
      H('p', { class: 'firma', text: `Atlante del PNRR · OpenDataSicilia · dati Italia Domani, estrazione del ${meta.estrazione}` }),
    ]));
    const breve = H('section', { class: 'inbreve', 'aria-labelledby': 'breve-t' }, [H('h2', { id: 'breve-t', text: 'In breve' })]);
    const ol = H('ol'); [
      `Dei <b>${mld(fin)} di euro</b> del PNRR, <b>${mld(NA)}</b> (${pc(NA / fin)}) non sono progetti: sono due misure nazionali, sconti fiscali per imprese e famiglie.`,
      `Contando solo i progetti veri (${mld(finSenzaNA)}), ne è stato <b>pagato il ${pc(pagSenzaNA / finSenzaNA, 1)}</b>. Sul totale di 171 miliardi la quota sale al ${pc(pag / fin, 1)}, perché le due misure risultano già pagate per intero.`,
      `I progetti <b>finiti</b> sono tanti (${pc(stg[4].n / it.n)} del totale) ma valgono poco: ${pc(stg[4].fin / fin, 1)} dei soldi. Un progetto finito vale in media ${eur(concMedio)}, gli altri ${eur(altroMedio)}.`,
      `Il Sud e le Isole hanno il <b>${pc(sudFin / totReg, 1)}</b> dei fondi divisi per regione, con il ${pc(sudPop / popReg, 1)} degli abitanti. Ma hanno pagato meno: <b>${pc(sudPag, 1)}</b> contro il ${pc(nordPag, 1)} del Nord. Il tipo di progetti non basta a spiegarlo.`,
      `Tra i comuni, l'<b>1%</b> più ricco (${top1n} comuni) riceve il ${pc(top1, 1)} dei soldi arrivati ai comuni. ${roma.nm} da sola ne riceve il ${pc(roma.fin / totCom, 1)}.`,
      `La dotazione ufficiale delle misure supera i progetti registrati di <b>${mld(ver.senza_progetto)}</b>: soldi che, nei dati, non hanno ancora un progetto.`,
    ].forEach((t) => { const li = H('li'); li.innerHTML = t; ol.append(li); });
    breve.append(ol); art.append(breve);
    const indice = H('nav', { class: 'indice', 'aria-label': 'In questa pagina' }, [H('b', { text: 'In questa pagina' })]);
    art.append(indice);
    const voci = [];
    const sezione = (id, titolo) => { voci.push([id, titolo]); return sez(id, 'Capitolo ' + voci.length, titolo); };

    /* ================= 1. Il totale ================= */
    {
      const s = sezione('totale', `Un sesto dei ${nf(fin / 1e9, 0)} miliardi non è fatto di progetti`);
      P(s, `Nell'elenco ufficiale ci sono <b>${nf(it.n)} progetti</b>, per <b>${mld(fin)} di euro</b> di finanziamento PNRR. Ma due sole righe dell'elenco valgono <b>${mld(NA)}</b>, il ${pc(NA / fin)} del totale. Non hanno un codice progetto (il «CUP», la targa di ogni opera pubblica): al suo posto c'è scritto «N/A». Sono i crediti d'imposta nazionali: <b>${mld(ambNA, 2)}</b> per l'Ecobonus e <b>${mld(privNA, 2)}</b> per «Transizione 4.0», il piano di incentivi alle imprese.`);
      P(s, `Nei dati queste due righe risultano <b>già pagate per intero</b> (${mld(stg[5].pag)}). Questo conta, perché fa sembrare il PNRR più avanti di quanto sia. Scegli come guardarlo:`);
      const kp = H('div', { class: 'cifre' });
      const disegna = (k) => {
        const tutti = k === 'tutti', f = tutti ? fin : finSenzaNA, p = tutti ? pag : pagSenzaNA, n = tutti ? it.n : it.n - stg[5].n;
        const c = (nome, val, nota) => H('div', { class: 'cifra' }, [H('p', { class: 'cifra-nome', text: nome }), H('p', { class: 'cifra-val', text: val }), H('p', { class: 'cifra-nota', text: nota })]);
        kp.replaceChildren(c('Finanziato', mld(f), `${nf(n)} ${tutti ? 'righe' : 'progetti'}`), c('Già pagato', mld(p), 'soldi versati a chi realizza il progetto'), c('Quota pagata', pc(p / f, 1), tutti ? 'con le due misure nazionali' : 'solo progetti veri'));
      };
      seg(s, [['tutti', `Tutti i ${nf(fin / 1e9, 0)} miliardi`], ['progetti', 'Solo i progetti (senza le due misure)']], 'tutti', disegna);
      s.append(kp); disegna('tutti');
      fig(s, 'Di che cosa sono fatti i soldi', `${mld(fin)} di finanziamento PNRR`, (h) => G.ciambella(h, {
        voci: [{ nome: 'Progetti veri e propri', sub: `${nf(it.n - stg[5].n)} progetti`, val: finSenzaNA }, { nome: 'Due misure nazionali senza progetto', sub: 'Ecobonus e Transizione 4.0', val: NA }],
        formatta: eur, conTip, nome: 'Composizione del finanziamento', centro: { valore: mld(fin, 0).replace(' miliardi', ' mld'), etichetta: 'PNRR' },
      }));
      calc(s, `Finanziamento = somma del campo «Finanziamento PNRR» di tutti i progetti (<code>data/italia.json</code>, campo <code>fin</code>). Le due misure sono le righe con CUP «N/A» e «N/A2» (stadio 5 nei dati). Quota pagata = pagato ÷ finanziato, con e senza quelle due righe.`);
      limiti(s, ['«Pagato» vuol dire soldi già versati a chi realizza il progetto, anche come anticipo. Non dice quanti lavori sono stati fatti.', 'I dati sono quelli che gli enti dichiarano nel sistema ReGiS: qui non sono stati verificati uno per uno.']);
    }

    /* ================= 1 bis. Come è organizzato il Piano ================= */
    {
      const codComp = (k) => k.slice(0, 4), codMsr = (k) => k.replace(/\.[^.]+$/, '');
      const nMis = meta.missioni.length, nComp = Object.keys(it.comp).length, nMsr = new Set(meta.sub.map(codMsr)).size, nSub = meta.sub.length;
      const dotC = {}; Object.entries(meta.dot).forEach(([k, v]) => { dotC[codComp(k)] = (dotC[codComp(k)] || 0) + v; });
      const dotTot = Object.values(meta.dot).reduce((a, b) => a + b, 0);
      const rc = Object.entries(it.comp).map(([k, v]) => ({ k, nome: meta.nomi[k] || k, n: v[0], fin: v[1], pag: v[2], dot: dotC[k] || 0, vuoto: (dotC[k] || 0) - v[1] })).sort((a, b) => a.k.localeCompare(b.k, 'it', { numeric: true }));
      const grandi = rc.filter((x) => x.fin >= 1e9);
      const vuotoMax = rc.slice().sort((a, b) => b.vuoto - a.vuoto)[0];
      const pagMax = grandi.slice().sort((a, b) => b.pag / b.fin - a.pag / a.fin)[0], pagMin = grandi.slice().sort((a, b) => a.pag / a.fin - b.pag / b.fin)[0];
      const oltre = rc.filter((x) => x.vuoto < 0);
      const senzaProg = Object.keys(meta.dot).filter((k) => !meta.sub.includes(k));
      const dotSenza = senzaProg.reduce((a, k) => a + meta.dot[k], 0);
      const s = sezione('organizzazione', 'Come è fatto il Piano: quattro livelli, uno dentro l’altro');
      P(s, `Il PNRR non è un unico elenco di progetti. È organizzato a scatole cinesi, in <b>quattro livelli</b>: ${nMis} <b>missioni</b> (i grandi capitoli, come «Salute» o «Transizione verde»), ${nComp} <b>componenti</b> (le parti di ogni missione), ${nf(nMsr)} <b>misure</b> (un investimento o una riforma) e ${nf(nSub)} <b>sub-misure</b>, le articolazioni più fini. Ogni progetto sta dentro una sub-misura. Il codice lo mostra: <b>M1C1I1.04.01</b> vuol dire Missione 1, Componente 1, Investimento 1.4, sub-misura 1.`);
      P(s, `Perché conta: guardare solo le missioni nasconde le differenze. Dentro la stessa missione ci sono componenti che vanno molto diversamente. Nell'<a href="index.html">atlante</a> i quattro livelli si scelgono a cascata dal pulsante «Piano», e mappa, schede ed elenchi seguono la scelta.`);
      fig(s, 'La dotazione ufficiale e quanto è già su progetti', 'per componente · miliardi di euro, dotazione = 100%', (h) => {
        const box = H('div', { class: 'miss-conti' });
        rc.forEach((x) => {
          const base = Math.max(x.dot, x.fin), w = (v) => (100 * v / base).toFixed(1) + '%', fermo = Math.max(0, x.fin - x.pag), sp = Math.max(0, x.dot - x.fin);
          box.append(H('div', { class: 'mc' }, [
            H('h3', {}, [H('b', { text: x.k }), ' ' + x.nome]),
            H('div', { class: 'mc-bar', role: 'img', 'aria-label': `${x.k}: pagato ${eur(x.pag)}, su progetti ma non ancora pagato ${eur(fermo)}, senza progetto ${eur(sp)}, su una dotazione di ${eur(x.dot)}` }, [H('i', { class: 'mc-p', style: 'width:' + w(x.pag) }), H('i', { class: 'mc-f', style: 'width:' + w(fermo) }), H('i', { class: 'mc-s', style: 'width:' + w(sp) })]),
            H('dl', {}, [H('dt', { text: 'Dotazione' }), H('dd', { text: eur(x.dot) }), H('dt', { text: 'Pagato' }), H('dd', { text: `${eur(x.pag)} (${pc(x.pag / x.dot)})` }), H('dt', { text: sp > 0 ? 'Senza progetto' : 'Oltre la dotazione' }), H('dd', { text: eur(sp > 0 ? sp : x.fin - x.dot) })])]));
        });
        h.append(box, (() => { const u = H('ul', { class: 'leg-tri' }); [['tp', 'Pagato'], ['tf', 'Già su progetti, non ancora pagato'], ['ts', 'Senza progetto nei dati']].forEach(([c, t]) => u.append(H('li', {}, [H('i', { class: c }), t]))); return u; })());
      });
      P(s, `Il divario più grande tra dotazione e progetti è nella componente <b>${vuotoMax.k}</b> (${vuotoMax.nome}): <b>${eur(vuotoMax.vuoto)}</b> senza progetto. Tra le componenti con almeno un miliardo di finanziamento, quella che ha pagato di più rispetto ai progetti registrati è <b>${pagMax.k}</b> (${pc(pagMax.pag / pagMax.fin)} dei soldi dei suoi progetti), quella che ha pagato meno è <b>${pagMin.k}</b> (${pc(pagMin.pag / pagMin.fin)}). ${oltre.length ? `In ${oltre.length} componenti (${oltre.map((x) => x.k).join(', ')}) i progetti superano la dotazione.` : ''} Sono differenze che a livello di missione si perdono.`);
      calc(s, `Dotazione = somma delle dotazioni ufficiali delle sub-misure, raggruppate per componente (<code>data/meta.json</code>, campo <code>dot</code>, «Spesa per misura» al ${meta.spesa_misura}). Finanziato e pagato per componente: <code>data/italia.json</code>, campo <code>comp</code> (estrazione del ${meta.estrazione}). Misura = codice della sub-misura senza l'ultimo segmento.`);
      limiti(s, [`Dotazione e progetti hanno date diverse (${meta.spesa_misura} e ${meta.estrazione}): le differenze piccole possono dipendere da questo.`, `${nf(senzaProg.length)} voci del Piano hanno una dotazione (${eur(dotSenza)}) ma nessun progetto nei dati. Sono già comprese nei «senza progetto» qui sopra.`, `La dotazione totale delle sub-misure qui è ${mld(dotTot)}: può non coincidere con altre cifre ufficiali, che usano altre fonti e altre date.`]);
    }

    /* ================= 2. A che punto siamo ================= */
    {
      const s = sezione('avanzamento', 'Molti progetti finiti, ma sono quelli piccoli');
      P(s, `Il ${pc(stg[4].n / it.n)} dei progetti risulta <b>concluso</b>: ${nf(stg[4].n)} su ${nf(it.n)}. Ma pesano soltanto il <b>${pc(stg[4].fin / fin, 1)}</b> dei soldi (${pc(stg[4].fin / finSenzaNA, 1)} se si tolgono le due misure nazionali). Il motivo è semplice: un progetto concluso vale in media <b>${eur(concMedio)}</b>, uno con i lavori avviati <b>${eur(altroMedio)}</b>. I grandi cantieri sono ancora aperti.`);
      P(s, `C'è poi un dettaglio importante. Altri <b>${nf(icc3.n)} progetti</b> (${mld(icc3.fin)}, il ${pc(icc3.fin / fin)} del totale) hanno già finito tutto il percorso previsto (iter), ma nel sistema sono ancora segnati «in corso». Se fossero davvero finiti, i soldi dei progetti conclusi salirebbero da ${mld(stg[4].fin)} a <b>${mld(stg[4].fin + icc3.fin)}</b>. I dati non permettono di dire quale dei due numeri sia quello giusto: per questo li teniamo separati.`);
      const host = H('div'); const modo = { v: 'euro' };
      const voci2 = () => {
        const e = modo.v === 'euro', g = (a, b) => (e ? a : b);
        return [
          { nome: 'Concluso (stato ufficiale)', val: g(stg[4].fin, stg[4].n), col: '--ok', sub: 'il sistema lo segna «concluso»' },
          { nome: 'Lavori avviati, percorso già finito', val: g(icc3.fin, icc3.n), col: '--c3', sub: 'ma ancora segnati «in corso»' },
          { nome: 'Lavori avviati, percorso aperto', val: g(stg[3].fin - icc3.fin, stg[3].n - icc3.n), col: '--bar', sub: 'cantieri e attività in corso' },
          { nome: 'Non ancora partiti', val: g(stg[0].fin + stg[1].fin + stg[2].fin, stg[0].n + stg[1].n + stg[2].n), col: '--warn', sub: 'da attivare, in corso senza gara né lavori, gara aggiudicata' },
          ...(e ? [{ nome: 'Due misure nazionali senza progetto', val: stg[5].fin, col: '--ink3', sub: 'Ecobonus e Transizione 4.0' }] : []),
        ];
      };
      const pila = () => {
        const v = voci2(), tot = v.reduce((s, x) => s + x.val, 0), e = modo.v === 'euro', f = e ? eur : (x) => nf(x);
        const barra = H('div', { class: 'pila', role: 'img', 'aria-label': v.map((x) => `${x.nome}: ${f(x.val)}`).join('; ') });
        v.forEach((x) => { const i = H('i', { style: `width:${100 * x.val / tot}%;background:var(${x.col})`, tabindex: '0' }); conTip(i, x.nome, [['Valore', f(x.val) + (e ? '' : ' progetti')], ['Quota', pc(x.val / tot, 1)], ['Nota', x.sub]]); barra.append(i); });
        const leg = H('ul', { class: 'pila-leg' }, v.map((x) => H('li', {}, [H('i', { style: `background:var(${x.col})` }), H('span', {}, [x.nome, H('small', { text: x.sub })]), H('span', { class: 'v' }, [H('b', { text: f(x.val) }), H('small', { text: pc(x.val / tot, 1) })])])));
        host.replaceChildren(barra, leg);
      };
      const f = fig(s, 'A che punto sono i progetti', 'passa da euro a numero di progetti per vedere la differenza', () => {});
      seg(f, [['euro', 'In euro'], ['num', 'In numero di progetti']], 'euro', (k) => { modo.v = k; pila(); });
      f.append(host); pila();
      calc(s, `Gli stadi vengono dallo stato ufficiale del progetto in ReGiS: «concluso» è il suo stato, non una nostra deduzione dalle date. «Percorso già finito» = progetto con lavori avviati e iter concluso ma stato «in corso» (campo «iter concluso ma in corso» di <code>data/cubo_i.json</code>). Valore medio = euro ÷ numero di progetti dello stesso stadio.`);
      limiti(s, ['Un progetto «concluso» può essere un computer o una scuola intera: contare i progetti senza guardare gli euro dà un quadro falsato, e viceversa.', 'I dati si fermano al 13 giugno 2026. Il PNRR si è chiuso il 30 giugno: non vediamo le ultime settimane.']);
    }

    /* ================= 3. Dove arrivano i soldi ================= */
    {
      const s = sezione('dove', 'Solo la metà dei soldi arriva a un comune preciso');
      const L = it.liv;
      P(s, `Ogni progetto dice dove si fa. Ma non sempre indica un comune. Dei ${mld(fin)}, <b>${pc(L[0] / fin, 1)}</b> (${mld(L[0])}) sono localizzati in un comune preciso. Il ${pc(L[1] / fin, 1)} è indicato solo a livello di provincia, il ${pc(L[2] / fin, 1)} solo di regione e il <b>${pc(L[3] / fin, 1)}</b> (${mld(L[3])}) è «ambito nazionale», cioè su tutta l'Italia: dentro ci sono le due misure fiscali e altri grandi programmi. Perciò le mappe per comune guardano solo una parte dei soldi.`);
      fig(s, 'A che livello è indicato il progetto', 'quota del finanziamento PNRR', (h) => G.barre(h, {
        voci: [['Comune', L[0], '--s6'], ['Provincia', L[1], '--s4'], ['Regione', L[2], '--s3'], ['Tutta Italia', L[3], '--s2']].map(([nome, val, col]) => ({ nome, val, col, sub: pc(val / fin, 1) })),
        formatta: eur, conTip, nome: 'Livello di localizzazione',
      }));
      P(s, `Ecco la mappa. Puoi cambiare il livello (comuni, province, regioni) e che cosa colorare. I colori dividono i territori in sette gruppi uguali, dal più basso al più alto.`);
      mappa(s, { def: 'pc', livello: 'c' });
      const piccoli = C.filter((c) => c.pop >= 5000).sort((a, b) => b.fin / b.pop - a.fin / a.pop)[0];
      P(s, `Attenzione ai piccoli numeri. Tra i comuni con almeno 5.000 abitanti, il primo per fondi a testa è <b>${piccoli.nm}</b>: <b>${nf(piccoli.fin / piccoli.pop)} euro</b> per ognuno dei suoi ${nf(piccoli.pop)} abitanti. Succede perché lì c'è un singolo progetto molto grande. Un valore alto per abitante non vuol dire che quel comune sia stato «favorito».`);
      calc(s, `Per i comuni: somma del finanziamento localizzato al comune (<code>data/cubo_c.json</code>) ÷ abitanti ISTAT al 1° gennaio 2026 (<code>data/comuni.json</code>). Un progetto su più comuni è diviso secondo la percentuale dichiarata. Per province e regioni si usano i totali di <code>province.json</code> e <code>regioni.json</code>, che includono anche i progetti indicati solo a quel livello.`);
      limiti(s, [`${mld(L[2] + L[3] + L[1])} non possono essere messi su una mappa dei comuni. Non sappiamo dove vadano esattamente.`, `Restano ${nf(ver.localizzazioni_non_assegnabili.righe)} localizzazioni (${nf(ver.localizzazioni_non_assegnabili.mln, 1)} milioni) con un codice comune che oggi non esiste e non si riesce a ricondurre a un comune attuale: sono attribuite alla regione.`]);
    }

    /* ================= 4. Nord e Sud ================= */
    {
      const s = sezione('sud', 'Il Sud ha più fondi per abitante, ma ha pagato meno');
      const pcR = (k) => rip[k].fin / rip[k].pop;
      P(s, `Dei <b>${mld(totReg)}</b> che si possono attribuire a una regione, il Sud e le Isole hanno il <b>${pc(sudFin / totReg, 1)}</b>. Gli abitanti sono il ${pc(sudPop / popReg, 1)}. Per abitante, vuol dire <b>${eab(pcR('Sud'))}</b> al Sud e <b>${eab(pcR('Isole'))}</b> nelle Isole, contro ${eab(pcR('Nord-ovest'))} nel Nord-ovest.`);
      const comSud = C.filter((c) => ['Sud', 'Isole'].includes(reg[c.rg] && reg[c.rg].rip)).reduce((x, c) => x + c.fin, 0) / totCom;
      s.append(H('h3', { text: 'E la regola del 40%?' }));
      P(s, `La legge impone una quota minima al Mezzogiorno. L'articolo 2, comma 6-bis, del decreto-legge 77/2021 (convertito dalla legge 108/2021) dice che le amministrazioni devono garantire che «almeno il 40 per cento delle risorse allocabili territorialmente» sia destinato alle regioni del Mezzogiorno, «salve le specifiche allocazioni territoriali già previste nel PNRR».`);
      P(s, `Nei dati, le otto regioni del Mezzogiorno (Abruzzo, Molise, Campania, Puglia, Basilicata, Calabria, Sicilia, Sardegna) hanno il <b>${pc(sudFin / totReg, 1)}</b> dei fondi attribuiti a una regione, e il ${pc(comSud, 1)} se si contano solo i progetti localizzati nei comuni. Per arrivare al 40% sui ${mld(totReg)} servirebbero circa <b>${mld(0.4 * totReg - sudFin)}</b> in più. Siamo quindi <b>molto vicini alla soglia, ma un po' sotto</b>. Questo però non basta per dire che la regola sia stata violata: la legge parla di «risorse allocabili», e nei dati non c'è un elenco ufficiale di quali lo siano. Inoltre ${mld(it.liv[3])} sono «tutta Italia» e non finiscono in nessuna regione, e la legge ammette eccezioni. Il controllo spetta al Dipartimento per le politiche di coesione.`);
      P(s, `Il quadro cambia guardando i soldi già <b>pagati</b>. Nel Nord-est è stato pagato il ${pc(rip['Nord-est'].pag / rip['Nord-est'].fin, 1)} dei fondi, nel Nord-ovest il ${pc(rip['Nord-ovest'].pag / rip['Nord-ovest'].fin, 1)}, al Sud il ${pc(rip.Sud.pag / rip.Sud.fin, 1)}, nelle Isole il <b>${pc(rip.Isole.pag / rip.Isole.fin, 1)}</b>. Si potrebbe pensare che dipenda dal tipo di progetti: i lavori ferroviari, per esempio, pagano più lentamente dei bonus. Abbiamo controllato. Se ogni zona avesse pagato come la media italiana per lo stesso tipo di progetto (stessa missione e stessa natura), la quota pagata sarebbe stata fra il ${pc(Math.min(...ORD_RIP.map((k) => attRip[k] / rip[k].fin)), 1)} e il ${pc(Math.max(...ORD_RIP.map((k) => attRip[k] / rip[k].fin)), 1)} dappertutto. <b>Il tipo di progetti non spiega il divario.</b>`);
      fig(s, 'Quota pagata: com’è e come sarebbe', 'in ogni zona, sui fondi divisi per regione', (h) => {
        const box = H('div', { class: 'cp' });
        ORD_RIP.forEach((k) => {
          const o = rip[k].pag / rip[k].fin, a = attRip[k] / rip[k].fin;
          const riga = H('div', { class: 'cp-riga', tabindex: '0' }, [H('span', {}, [k, H('small', { text: `${mld(rip[k].fin)} · ${nf(rip[k].pop / 1e6, 1)} mln abitanti` })]), H('div', {}, [
            H('div', { class: 'cp-b' }, [H('div', { class: 'pista' }, H('i', { style: `width:${100 * o}%;background:var(${RIP[k]})` })), H('b', { text: pc(o, 1) })]),
            H('div', { class: 'cp-b atteso' }, [H('div', { class: 'pista' }, H('i', { style: `width:${100 * a}%` })), H('b', { text: pc(a, 1) })])])]);
          conTip(riga, k, [['Pagato davvero', pc(o, 1)], ['Atteso dal tipo di progetti', pc(a, 1)], ['Differenza', nf(100 * (o - a), 1) + ' punti']]);
          box.append(riga);
        });
        h.append(box, H('div', { class: 'cp-leg' }, [H('span', {}, [H('i', { style: 'background:var(--s5)' }), 'pagato davvero']), H('span', {}, [H('i', { style: 'background:repeating-linear-gradient(45deg,var(--ink3) 0 4px,transparent 4px 8px);opacity:.6' }), 'atteso, a parità di tipo di progetti'])]));
      });
      fig(s, 'Le province: soldi ricevuti e soldi pagati, per abitante', 'ogni punto è una provincia · sotto la linea tratteggiata il pagato è più basso del finanziato', (h) => scatter(h));
      P(s, `Ecco la stessa differenza sulla mappa. Scegli «quota già pagata» per vedere dove il pagato è più basso.`);
      mappa(s, { def: 'pag', livello: 'p' });
      calc(s, `Fondi per regione = somma delle regioni di <code>data/regioni.json</code> (esclusa la parte «tutta Italia»). Zone: ripartizioni ISTAT. «Atteso»: per ogni coppia missione × natura dell'intervento si calcola la quota pagata nazionale (Italia, senza le due misure N/A), e la si applica ai fondi di quella coppia in ogni regione; poi si sommano. Così si toglie l'effetto del «mix» di progetti. Regola del 40%: testo dell'art. 2, comma 6-bis, DL 77/2021 letto su Brocardi (fonte non ufficiale, da riscontrare sul testo vigente su <a href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2021-05-31;77" target="_blank" rel="noopener">Normattiva</a>). Mezzogiorno = Sud e Isole della classificazione ISTAT (8 regioni). Quota = fondi delle 8 regioni ÷ fondi di tutte le regioni (<code>data/regioni.json</code>), oppure solo progetti localizzati nei comuni (<code>data/cubo_c.json</code>).`);
      limiti(s, ['La quota pagata dipende anche da come si organizzano gli anticipi e i pagamenti a stati di avanzamento. Misura il denaro versato, non l’avanzamento dei lavori.', 'I dati dicono <b>che</b> il divario c\'è e che non dipende dal tipo di progetti. Non dicono <b>perché</b>: per saperlo servirebbero i dati dei singoli enti.']);
    }

    /* ================= 4 bis. Giovani ================= */
    {
      const s = sezione('giovani', 'Quanto PNRR per ogni giovane');
      /* aggregati per ripartizione e per classe dimensionale, ricalcolati da data/giovani.json (stesse colonne della mappa) */
      const R = {}, T = { g: 0, ad: 0, s: 0, l: 0, altri: 0, pag: 0 }, CG = [];
      const DIM = [['sotto 1.000 abitanti', 0, 1e3], ['1.000–5.000', 1e3, 5e3], ['5.000–20.000', 5e3, 2e4], ['20.000–100.000', 2e4, 1e5], ['oltre 100.000', 1e5, 1e12]];
      const D = DIM.map(() => ({ g: 0, s: 0, l: 0, n: 0, zl: 0 }));
      for (const [id, r] of Object.entries(gio.c)) {
        const c = com[id]; if (!c) continue; const k = reg[c.rg]?.rip; if (!k) continue;
        const a = R[k] || (R[k] = { g: 0, ad: 0, s: 0, l: 0, altri: 0, pag: 0 });
        const d = DIM.findIndex(([, lo, hi]) => r[1] >= lo && r[1] < hi);
        for (const t of [a, T]) { t.g += r[0]; t.ad += r[1] - r[0]; t.s += r[2]; t.l += r[3]; t.altri += r[4]; t.pag += r[5]; }
        const z = D[d]; z.g += r[0]; z.s += r[2]; z.l += r[3]; z.n++; if (r[3] === 0) z.zl++;
        CG.push([id, r]);
      }
      const e = (x, y) => (y > 0 ? x / y : 0), eur0 = (v) => nf(Math.round(v)) + ' €', X = (v) => nf(v, 2) + '×';
      const ordRip = ORD_RIP.filter((k) => R[k]);
      const senza = CG.filter(([, r]) => r[3] === 0).length, senzaP = CG.filter(([, r]) => r[3] === 0 && r[1] < 1000).length, piccoliN = CG.filter(([, r]) => r[1] < 1000).length;
      const sPag = e(T.pag, T.s);
      P(s, `Nel PNRR non esiste una «missione giovani». Non c'è una riga del Piano che dica quanto spetta a chi ha meno di 25 anni: le misure che li riguardano sono sparse fra asili, scuole, università, borse di studio, servizio civile e altro. Per provare a misurarle abbiamo fatto una scelta nostra, e la dichiariamo. In <b>senso stretto</b> contiamo <b>sedici</b> sub-misure quasi esclusive per i giovani (asili, scuole, ITS, borse di studio, alloggi per studenti, sistema duale). In <b>senso largo</b> aggiungiamo <b>nove</b> misure miste, che servono anche agli adulti (servizio civile, dottorati, sport e inclusione, formazione dei docenti). I due risultati si leggono come un intervallo, non come due risposte che si contraddicono.`);
      P(s, `Il conto è semplice: gli euro dei progetti localizzati in un comune diviso i suoi residenti di 0-24 anni. In Italia fanno <b>${eur0(e(T.s, T.g))} per giovane</b> in senso stretto e <b>${eur0(e(T.l, T.g))}</b> in senso largo. Per gli adulti, con tutte le altre misure, sono ${eur0(e(T.altri, T.ad))}: in media il giovane riceve ${X(e(e(T.l, T.g), e(T.altri, T.ad)))} dell'adulto. Il dato nazionale però nasconde differenze grandi: al Sud il rapporto è <b>${X(e(e(R.Sud.l, R.Sud.g), e(R.Sud.altri, R.Sud.ad)))}</b> in senso largo (${X(e(e(R.Sud.s, R.Sud.g), e(R.Sud.altri, R.Sud.ad)))} in senso stretto), nelle Isole ${X(e(e(R.Isole.l, R.Isole.g), e(R.Isole.altri, R.Isole.ad)))}, mentre nel Nord-ovest scende a ${X(e(e(R['Nord-ovest'].l, R['Nord-ovest'].g), e(R['Nord-ovest'].altri, R['Nord-ovest'].ad)))}. La risposta alla domanda «il PNRR fa più per i giovani o per gli adulti?» dipende da dove si guarda e da cosa si conta.`);
      /* dato di contesto regionale (Eurostat): non entra nella mappa dei comuni */
      const neet = cont?.r?.neet_2024;
      if (neet && neet.zone?.length) {
        const z = neet.zone.slice().sort((a, b) => b[1] - a[1]);
        const ripDi = (nome) => regs.find((r) => r.nome === nome)?.rip;
        const sud = z.filter(([n]) => ['Sud', 'Isole'].includes(ripDi(n)));
        const sudSopra = sud.filter(([, v]) => v > neet.italia).length;
        P(s, `Un dato di contesto, che però non è comunale. Nel 2024 in Italia il <b>${nf(neet.italia, 1)}%</b> dei giovani tra 15 e 29 anni non studiava e non lavorava (NEET). La quota andava dal <b>${nf(z[z.length - 1][1], 1)}%</b> della ${z[z.length - 1][0]} al <b>${nf(z[0][1], 1)}%</b> della ${z[0][0]}. ${sudSopra === sud.length ? `Tutte le regioni del Sud e delle Isole (${sud.length} su ${sud.length}) erano sopra la media italiana` : `${sudSopra} delle ${sud.length} regioni del Sud e delle Isole era sopra la media italiana`}. È un dato regionale (NUTS 2, fonte Eurostat): non si può mettere sulla mappa dei comuni, e non dice quanti NEET ci siano in un singolo comune.`);
      }
      P(s, `La mappa mostra la stessa cosa comune per comune. Puoi passare dal senso stretto al largo e cambiare livello: le colonne si sommano dal comune alla regione.`);
      mappa(s, { def: 'gio_l', livello: 'c' });
      fig(s, 'Euro per giovane secondo la dimensione del comune', 'senso largo · sotto: quota di comuni senza alcun progetto per i giovani', (h) => G.colonne(h, {
        voci: DIM.map(([n], i) => ({ nome: n, val: e(D[i].l, D[i].g), sotto: nf(100 * D[i].zl / D[i].n, 0) + '% senza', sub: `${nf(D[i].n)} comuni · ${nf(100 * D[i].zl / D[i].n, 1)}% senza alcun progetto · euro per giovane ${eur0(e(D[i].l, D[i].g))}, in senso stretto ${eur0(e(D[i].s, D[i].g))}` })), formatta: eur0, conTip, nome: 'Euro per giovane per dimensione del comune',
      }), 'Nei comuni più piccoli il valore medio è più basso, ma è anche meno affidabile: lì un solo progetto può cambiare tutto. La quota di comuni senza nessun progetto per i giovani è invece altissima: quasi otto su dieci sotto i mille abitanti.');
      P(s, `In tutto, <b>${nf(senza)} comuni su ${nf(CG.length)}</b> (${pc(senza / CG.length)}) non hanno alcun progetto delle misure «giovani» in senso largo; sotto i mille abitanti sono ${pc(senzaP / piccoliN)}. Vuol dire che in quei comuni i giovani non hanno nessuna struttura finanziata dal PNRR fra quelle che abbiamo scelto: non vuol dire che non ne abbiano una, perché può essere stata costruita con altri fondi.`);
      const piccoliG = CG.filter(([, r]) => r[0] > 0 && r[0] < 50).map(([id, r]) => ({ nm: String(com[id]?.nm ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;'), eg: r[3] / r[0] })).sort((a, b) => b.eg - a.eg)[0];
      P(s, `Attenzione ai piccoli numeri. In un comune con una dozzina di giovani, un solo progetto da qualche milione di euro fa salire il valore per giovane a cifre enormi. Il caso più estremo fra i comuni con meno di 50 residenti di 0-24 anni è <b>${piccoliG.nm}</b>: <b>${eur0(piccoliG.eg)}</b> per giovane. Non è una misura di quanto ricevono quei ragazzi: è un progetto grande diviso per pochissime persone. Per questo nelle statistiche lasciamo fuori i comuni con meno di 50 giovani (nella scheda del comune sono segnati con «†»).`);
      calc(s, `Euro per giovane = importo PNRR localizzato nel comune ÷ residenti di 0-24 anni (<code>data/giovani.json</code>, calcolato da <code>scrpits/giovani.py</code>; residenti ISTAT al 1° gennaio 2024, singole età). Per gli adulti: tutte le misure che non sono nel gruppo «giovani», divise per i residenti di 25 anni e più. Province e regioni: somma dei comuni. Le sub-misure dei due gruppi sono elencate nella <a href="guida.html#giovani">Guida</a>; gli importi vengono dagli stessi <code>data/cubo_c.json</code> e <code>data/comuni.json</code> dell'atlante.`);
      limiti(s, [
        `Il progetto è contato dove sta l'<b>opera</b>, non dove vive chi ne beneficia: un'università o un ITS servono un bacino più largo del comune in cui hanno la sede. Nei comuni sede il valore per giovane è sovrastimato, altrove sottostimato.`,
        `L'importo è quello <b>finanziato</b>, non quello speso: dice quanto è stato assegnato, non quanto è stato realizzato. La quota pagata delle misure per i giovani in senso stretto è ${pc(sPag, 1)}.`,
        `La scelta delle misure è <b>nostra</b>: non esiste una classificazione ufficiale. Cambiando l'elenco cambiano i numeri, e per questo mostriamo sempre i due gruppi come intervallo.`,
      ]);
      P(s, `L'idea di confrontare il PNRR con l'età dei residenti viene dal contributo di Piero Boccardo, <a href="https://groundtruth.space/contributi/pnrr-giovani-2026/" rel="noopener">«Quanto PNRR per ogni giovane»</a> (Ground Truth). I numeri di questa pagina sono ricalcolati da noi con una classificazione nostra e non coincidono con i suoi: il confronto sensato è sull'ordine di grandezza, non sulla cifra singola.`);
    }


    /* ================= 4 ter. Salute ================= */
    {
      const s = sezione('sanita', 'Quanto PNRR per la salute');
      /* aggregati per ripartizione dalle righe di regione (comuni più quota regionale), come data/sanita.json */
      const R = {}, T = { n: 0, pop: 0, o65: 0, fin: 0, pag: 0, c1: 0, c2: 0, conc: 0, concp: 0, ncdc: 0, ncf: 0 };
      for (const [id, r] of Object.entries(san.r)) {
        const k = reg[id]?.rip; if (!k) continue;
        const a = R[k] || (R[k] = { n: 0, pop: 0, o65: 0, fin: 0, pag: 0, c1: 0, c2: 0, conc: 0, concp: 0, ncdc: 0, ncf: 0 });
        for (const t of [a, T]) { t.n++; t.pop += r[0]; t.o65 += r[1]; t.fin += r[2]; t.pag += r[3]; t.c1 += r[4]; t.c2 += r[6]; t.conc += r[7]; t.concp += r[8]; t.ncdc += r[11]; t.ncf += r[12] || 0; }
      }
      const CG = Object.entries(san.c).map(([id, r]) => ({ id, nm: String(com[id]?.nm ?? ''), pop: r[0], fin: r[2], pag: r[3] }));
      const con = CG.filter((c) => c.fin > 0).length, senza = CG.length - con;
      const e = (x, y) => (y > 0 ? x / y : 0), eur0 = (v) => nf(Math.round(v)) + ' €';
      const ordRip = ORD_RIP.filter((k) => R[k]);
      const roma = CG.slice().sort((a, b) => b.fin - a.fin)[0];
      const ord = CG.slice().sort((a, b) => a.fin - b.fin);
      const quotaDa = (q) => { const k = Math.floor(ord.length * q); return ord.slice(k).reduce((x, c) => x + c.fin, 0) / totC; };
      const totC = CG.reduce((x, c) => x + c.fin, 0);
      const top10 = quotaDa(0.9);
      P(s, `La salute è l'unico tema di questa lettura in cui la scelta delle misure non è nostra: il Piano ha una <b>missione 6 «Salute»</b>, con dentro <b>${nf(san.i[9])} progetti</b> e <b>${mld(san.i[2], 2)} di euro</b>. È divisa in due: la componente <b>6.1</b> porta l'assistenza sul territorio (Case della Comunità, Ospedali di Comunità, centrali operative, assistenza domiciliare, telemedicina), la <b>6.2</b> resta su ospedali, grandi apparecchiature, fascicolo sanitario e ricerca. È il tema più concentrato del Piano: <b>${nf(con)} comuni su ${nf(CG.length)}</b> (${pc(con / CG.length, 1)}) hanno almeno un progetto, e ${nf(senza)} non ne hanno nessuno.`);
      P(s, `Il conto più semplice è l'euro per abitante: in Italia sono <b>${eur0(e(san.i[2], san.i[0]))}</b> per la Missione 6, con il <b>${pc(e(san.i[3], san.i[2]), 1)}</b> già pagato (${eur0(e(T.fin, T.pop))} guardando solo gli importi attribuibili a un territorio, perché ${mld(san.i[2] - T.fin)} sono progetti indicati a livello nazionale). Il confronto tra ripartizioni va però fatto con attenzione, perché qui — al contrario dei giovani — il Sud non è indietro nella distribuzione: al Sud sono <b>${eur0(e(R.Sud.fin, R.Sud.pop))}</b> per abitante e nelle Isole ${eur0(e(R.Isole.fin, R.Isole.pop))}, contro ${eur0(e(R['Nord-est'].fin, R['Nord-est'].pop))} nel Nord-est. Contano anche i ${mld(T.ncf)} attribuiti alle regioni e non a un singolo comune — fascicolo sanitario, telemedicina, assistenza domiciliare — che vanno in gran parte al Mezzogiorno e che nella scheda del comune non si vedono.`);
      P(s, `Il divario vero non è dove i soldi sono assegnati, ma quanti ne sono stati pagati: <b>${pc(e(R['Nord-ovest'].pag, R['Nord-ovest'].fin), 1)}</b> nel Nord-ovest, ${pc(e(R['Nord-est'].pag, R['Nord-est'].fin), 1)} nel Nord-est, ${pc(e(R.Isole.pag, R.Isole.fin), 1)} nelle Isole e <b>${pc(e(R.Sud.pag, R.Sud.fin), 1)}</b> al Sud. Circa venti punti di distanza.`);
      mappa(s, { def: 'san_pc', livello: 'c' });
      fig(s, 'Il denaro segue il bisogno?', 'comuni da 1.000 abitanti in su, divisi in quattro gruppi di uguale numero per quota di residenti over 65', (h) => {
        const an = CG.filter((c) => c.pop >= 1000).map((c) => ({ o: san.c[c.id][1] / c.pop, fin: c.fin, pop: c.pop }));
        an.sort((a, b) => a.o - b.o);
        const QQ = [0, 1, 2, 3].map((i) => an.slice(Math.floor(i * an.length / 4), Math.floor((i + 1) * an.length / 4)));
        const NM = ['1° quartile', '2° quartile', '3° quartile', '4° quartile'];
        G.colonne(h, {
          voci: QQ.map((q, i) => ({ nome: NM[i], val: e(q.reduce((x, y) => x + y.fin, 0), q.reduce((x, y) => x + y.pop, 0)), col: i < 2 ? '--c2' : '--c4', sotto: `65+ ${pc(q.reduce((x, y) => x + y.o, 0) / q.length, 1)}`, sub: `${nf(q.length)} comuni · ${pc(q.reduce((x, y) => x + y.o, 0) / q.length, 1)} di residenti over 65 · ${eur0(e(q.reduce((x, y) => x + y.fin, 0), q.reduce((x, y) => x + y.pop, 0)))} per abitante` })),
          formatta: eur0, conTip, nome: 'Euro per abitante per quartile di residenti anziani',
        });
      }, `Gli euro per abitante crescono dal primo al terzo quartile e poi calano. Non è una curva del bisogno: è soprattutto l'effetto della dimensione del comune, perché i paesi più piccoli — quelli con la quota di anziani più alta — non hanno né ospedali né Case della Comunità. Un ospedale serve un territorio, non i soli abitanti del comune in cui si trova.`);
      P(s, `La concentrazione è la stessa che si vede nel resto del Piano, ma più forte: il <b>10%</b> dei comuni con più fondi prende il <b>${pc(top10, 1)}</b> della Missione 6 arrivata ai comuni, e <b>${roma.nm}</b> da sola il ${pc(roma.fin / totC, 1)}. Non è una scelta: è dove stanno le aziende ospedaliere e i policlinici. Per questo il valore per abitante dei comuni piccoli va letto come «quanto è stato finanziato qui», non come «quanto ricevono i residenti».`);
      calc(s, `Euro per abitante = importo della Missione 6 attribuito al territorio ÷ abitanti (<code>data/sanita.json</code>, calcolato da <code>scrpits/sanita.py</code>; abitanti ISTAT al 1° gennaio 2024, singole età). Nei comuni si conta solo la quota localizzata nel comune; nelle province i comuni più la quota provinciale; nelle regioni anche la quota regionale; l'Italia somma tutti i livelli. La quota di prossimità è la componente 6.1 divisa il totale. Gli importi vengono dagli stessi open data di Italia Domani usati dall'atlante; le sub-misure sono elencate nella <a href="guida.html#sanita">Guida</a>.`);
      limiti(s, [
        `L'opera è contata dove <b>sta</b> (ospedale, azienda sanitaria, Casa della Comunità), non dove vivono i pazienti: un policlinico serve un'intera regione, e i comuni vicini risultano senza fondi anche se i loro abitanti sono curati lì.`,
        `Un comune su cinque ha almeno un progetto: negli altri l'indicatore è zero, e zero non significa «nessun servizio sanitario», ma «nessun progetto PNRR localizzato qui».`,
        `La quota regionale (circa ${mld(T.ncf)} in tutta Italia) non è spalmata sui comuni: compare solo nella scheda della regione. Per questo la scheda del comune e quella della sua regione non tornano, e non devono tornare.`,
        `Il bisogno sanitario non si misura con l'età: quota di anziani e reddito sono le sole variabili di contesto disponibili per comune. Servono a farsi una domanda, non a dare una risposta.`,
        `L'importo è quello <b>finanziato</b>, non quello speso: la quota pagata dice a che punto sono i pagamenti, non se le opere funzionano.`,
      ]);
    }

    /* ================= 4 quater. PA digitale ================= */
    {
      const s = sezione('pa', 'Quanto PNRR per la PA digitale');
      /* sei gruppi della Missione 1.1, nell'ordine delle coppie fin/pag di data/pa_digitale.json */
      const GR = ['servizi al cittadino', 'cloud e piattaforme', 'cybersicurezza', 'facilitazione digitale', 'competenze e semplificazione', 'giustizia e ministeri'];
      const zero = () => ({ pop: 0, fin: 0, pag: 0, g: GR.map(() => 0), gp: GR.map(() => 0), ncf: 0 });
      const R = {}, T = zero();
      for (const [id, r] of Object.entries(pa.r)) {
        const k = reg[id]?.rip; if (!k) continue;
        const a = R[k] || (R[k] = zero());
        for (const t of [a, T]) { t.pop += r[0]; t.fin += r[1]; t.pag += r[2]; GR.forEach((_, i) => { t.g[i] += r[3 + 2 * i]; t.gp[i] += r[4 + 2 * i]; }); t.ncf += r[18]; }
      }
      const e = (x, y) => (y > 0 ? x / y : 0), eur0 = (v) => nf(Math.round(v)) + ' €', eurC = (v) => eur(v);
      const CG = Object.entries(pa.c).map(([id, r]) => ({ id, nm: String(com[id]?.nm ?? ''), pop: r[0], fin: r[1], pag: r[2], giust: r[13] }));
      const con = CG.filter((c) => c.fin > 0).length, senza = CG.length - con;
      const comFin = CG.reduce((x, c) => x + c.fin, 0);
      const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[v.length >> 1] : 0; };
      const mediana = med(CG.map((c) => c.fin)), media = e(comFin, CG.length);
      const DIM = [['meno di 1.000 abitanti', 0, 1e3], ['1.000-5.000', 1e3, 5e3], ['5.000-20.000', 5e3, 2e4], ['20.000-100.000', 2e4, 1e5], ['oltre 100.000', 1e5, 1e12]];
      const DD = DIM.map(() => ({ n: 0, pop: 0, fin: 0, con: 0 }));
      CG.forEach((c) => { const i = DIM.findIndex(([, a, b]) => c.pop >= a && c.pop < b); if (i < 0) return; const d = DD[i]; d.n++; d.pop += c.pop; d.fin += c.fin; if (c.fin > 0) d.con++; });
      const ordRip = ORD_RIP.filter((k) => R[k]);
      const rk = ordRip.slice().sort((a, b) => e(R[a].fin, R[a].pop) - e(R[b].fin, R[b].pop));
      const grk = GR.map((n, i) => ({ n, i, q: e(pa.i[4 + 2 * i], pa.i[3 + 2 * i]) })).sort((a, b) => a.q - b.q);
      const top = CG.slice().sort((a, b) => b.fin - a.fin)[0];
      P(s, `Nel tema sui giovani le misure le abbiamo scelte noi, in quello sulla salute le ha fissate il Piano con una missione intera. Qui le fissa il Piano: c'è una componente dedicata alla pubblica amministrazione, la <b>Missione 1.1 «Digitalizzazione, innovazione e sicurezza nella PA»</b>, con <b>${mld(pa.i[1], 2)} di euro</b> e <b>${nf(pa.i[15])} progetti</b>. Al 13 giugno 2026 ne era stato pagato il <b>${pc(e(pa.i[2], pa.i[1]), 1)}</b>. È il tema più diffuso del Piano: <b>${nf(con)} comuni su ${nf(CG.length)}</b> (${pc(con / CG.length, 1)}) hanno almeno un progetto, e solo ${nf(senza)} non ne hanno nessuno.`);
      P(s, `Attenzione a come si legge. I bandi «PA digitale» non finanziano un'opera proporzionata agli abitanti: danno una <b>cifra per amministrazione</b>. L'importo mediano per comune è <b>${eurC(mediana)}</b>, la media ${eurC(media)}: quindi un paese di 800 abitanti e una città di 8.000 ricevono più o meno lo stesso, e diviso per gli abitanti il paese sembra aver ricevuto dieci volte tanto. In Italia sono <b>${eur0(e(pa.i[1], pa.i[0]))}</b> per abitante, ma per un comune ${DIM[0][0].replace(' abitanti', '')} sono <b>${eur0(e(DD[0].fin, DD[0].pop))}</b> e per uno tra ${DIM[2][0]} abitanti <b>${eur0(e(DD[2].fin, DD[2].pop))}</b>. Non è una diseguaglianza: è la forma del bando.`);
      P(s, `Per la stessa ragione il Sud non è indietro nella distribuzione: al Sud sono <b>${eur0(e(R.Sud.fin, R.Sud.pop))}</b> per abitante e nelle Isole ${eur0(e(R.Isole.fin, R.Isole.pop))}, contro ${eur0(e(R['Nord-ovest'].fin, R['Nord-ovest'].pop))} nel Nord-ovest e ${eur0(e(R['Nord-est'].fin, R['Nord-est'].pop))} nel Nord-est. I comuni piccoli sono più diffusi nel Mezzogiorno, e ogni comune riceve comunque la sua parte. Nei pagamenti il divario è più stretto che nel resto del Piano: ${pc(e(R.Sud.pag, R.Sud.fin), 1)} al Sud contro ${pc(e(R['Nord-ovest'].pag, R['Nord-ovest'].fin), 1)} nel Nord-ovest.`);
      P(s, `C'è però un pezzo che non c'entra con i servizi ai cittadini: <b>giustizia e ministeri</b> vale <b>${pc(e(pa.i[13], pa.i[1]), 1)}</b> della componente, ed è in gran parte spesa per il personale dell'Ufficio del Processo e digitalizzazione interna di singole amministrazioni. Nelle città sedi di tribunale questa voce pesa molto: a <b>${top.nm}</b>, il comune con più fondi della componente (${eurC(top.fin)}), giustizia e ministeri è il <b>${pc(e(top.giust, top.fin), 1)}</b> del totale. Per questo la mappa che segue può escluderla: sono due indicatori distinti, e quello «senza giustizia e ministeri» è il più adatto a raccontare la digitalizzazione che arriva ai comuni.`);
      mappa(s, { def: 'pa_pc2', livello: 'c' });
      fig(s, 'Euro per abitante secondo la dimensione del comune', 'sotto: quota di comuni con almeno un progetto', (h) => G.colonne(h, {
        voci: DIM.map(([n], i) => ({ nome: n.replace(' abitanti', ''), val: e(DD[i].fin, DD[i].pop), sotto: pc(e(DD[i].con, DD[i].n), 0) + ' con progetti', sub: `${nf(DD[i].con)} comuni su ${nf(DD[i].n)} con almeno un progetto · ${eurC(DD[i].fin)} in tutto · ${nf(Math.round(e(DD[i].fin, DD[i].n)))} € per comune in media` })),
        formatta: eur0, conTip, nome: 'Euro per abitante per dimensione del comune',
      }), `Il valore più alto è nei comuni più piccoli (${eur0(e(DD[0].fin, DD[0].pop))}), il più basso tra ${DIM[2][0]} abitanti (${eur0(e(DD[2].fin, DD[2].pop))}); risale nelle grandi città (${eur0(e(DD[4].fin, DD[4].pop))}), che ospitano anche le opere sovracomunali. La quota di comuni con almeno un progetto è quasi il 100% in ogni classe: qui, a differenza della salute, la mappa non serve a trovare chi è rimasto fuori.`);
      fig(s, 'Che cosa è stato pagato', 'pagato ÷ assegnato per tipo di misura · Missione 1.1 intera', (h) => G.barre(h, {
        voci: GR.map((n, i) => ({ nome: n, val: e(pa.i[4 + 2 * i], pa.i[3 + 2 * i]), col: ['--c3', '--c2', '--c4', '--c5', '--s6', '--s4'][i], sub: `${eur(pa.i[4 + 2 * i])} pagati su ${eur(pa.i[3 + 2 * i])}` })),
        formatta: (v) => pc(v, 1), conTip, riferimento: e(pa.i[2], pa.i[1]), rifNome: 'Italia', nome: 'Quota pagata per tipo di misura',
      }), `I servizi al cittadino sono la parte più avanti (${pc(e(pa.i[4], pa.i[3]), 1)}), la parte più indietro è ${grk[0].n} (${pc(grk[0].q, 1)}). Il cloud è stato finanziato prima ed è stato pagato meno: i soldi ci sono, i pagamenti no.`);
      P(s, `In tutto, <b>${mld(pa.i[18])}</b> della componente (${pc(e(pa.i[18], pa.i[1]), 1)}) non è attribuibile a un singolo comune: sono piattaforme e progetti indicati a livello nazionale o di regione, che nella scheda del comune non si vedono. La scheda del comune e quella della sua regione non tornano, e non devono tornare.`);
      calc(s, `Euro per abitante = importo della Missione 1.1 attribuito al territorio ÷ abitanti (<code>data/pa_digitale.json</code>, calcolato da <code>scrpits/pa_digitale.py</code>; abitanti ISTAT al 1° gennaio 2024, la stessa fonte degli altri temi). Nei comuni si conta solo la quota localizzata nel comune; nelle province i comuni più la quota provinciale; nelle regioni anche la quota regionale; l'Italia somma tutti i livelli. «Senza giustizia e ministeri» toglie le sub-misure <code>M1C1I1.06.*</code>, <code>M1C1I3.*</code> e <code>M1C1R*</code>. I sei gruppi sono elencati nella <a href="guida.html#pa-digitale">Guida</a>; gli importi vengono dagli stessi open data di Italia Domani usati dall'atlante.`);
      limiti(s, [
        `Il bando è una <b>cifra per amministrazione</b>, non per abitante: nei comuni piccoli l'euro per abitante è molto più alto senza che il comune abbia ricevuto di più. Il valore serve a confrontare i territori, non a dire chi è stato trattato meglio.`,
        `La voce <b>giustizia e ministeri</b> (${pc(e(pa.i[13], pa.i[1]), 1)} della componente) è in gran parte personale e digitalizzazione interna: non passa dai comuni e non è un servizio ai cittadini. Sulla mappa si può escludere, ma nei totali della componente c'è.`,
        `L'importo è quello <b>finanziato</b>, non quello speso: la quota pagata dice a che punto sono i pagamenti, non se il servizio funziona. Quante persone usano SPID o PagoPA in un comune non è nei dati aperti.`,
        `La Missione 1 contiene anche reti ultraveloci, 5G, Transizione 4.0 e cultura: <b>non sono in questo tema</b>, che riguarda solo la pubblica amministrazione.`,
      ]);
    }

    /* ================= 4 quinquies. Acqua e dissesto ================= */
    {
      const s = sezione('acqua', 'Quanto PNRR per l’acqua e il dissesto');
      /* cinque gruppi della Missione 2.4, nell'ordine delle coppie fin/pag di data/acqua.json */
      const GR = ['reti idriche', 'perdite di rete', 'alluvioni e dissesto', 'irriguo e fognature', 'monitoraggio e natura'];
      const zero = () => ({ pop: 0, fin: 0, pag: 0, g: GR.map(() => 0), gp: GR.map(() => 0), comfin: 0, compag: 0, ncf: 0 });
      const R = {}, T = zero();
      for (const [id, r] of Object.entries(acq.r)) {
        const k = reg[id]?.rip; if (!k) continue;
        const a = R[k] || (R[k] = zero());
        for (const t of [a, T]) { t.pop += r[0]; t.fin += r[1]; t.pag += r[2]; GR.forEach((_, i) => { t.g[i] += r[3 + 2 * i]; t.gp[i] += r[4 + 2 * i]; }); t.comfin += r[18] || 0; t.compag += r[19] || 0; t.ncf += r[16] || 0; }
      }
      const I = acq.i;
      const e = (x, y) => (y > 0 ? x / y : 0), eur0 = (v) => nf(Math.round(v)) + ' €';
      const CG = Object.entries(acq.c).map(([id, r]) => ({ id, nm: String(com[id]?.nm ?? ''), pop: r[0], fin: r[1], pag: r[2], alluv: r[7], comfin: r[18] }));
      const con = CG.filter((c) => c.fin > 0).length, senza = CG.length - con;
      const DIM = [['meno di 1.000 abitanti', 0, 1e3], ['1.000-5.000', 1e3, 5e3], ['5.000-20.000', 5e3, 2e4], ['20.000-100.000', 2e4, 1e5], ['oltre 100.000', 1e5, 1e12]];
      const DD = DIM.map(() => ({ n: 0, pop: 0, fin: 0, con: 0 }));
      CG.forEach((c) => { const i = DIM.findIndex(([, a, b]) => c.pop >= a && c.pop < b); if (i < 0) return; const d = DD[i]; d.n++; d.pop += c.pop; d.fin += c.fin; if (c.fin > 0) d.con++; });
      const ordRip = ORD_RIP.filter((k) => R[k]);
      const rk = ordRip.slice().sort((a, b) => e(R[a].fin, R[a].pop) - e(R[b].fin, R[b].pop));
      const pk = ordRip.map((k) => ({ n: k, q: e(R[k].pag, R[k].fin) })).sort((a, b) => a.q - b.q);
      const ck = ordRip.map((k) => ({ n: k, q: e(R[k].comfin, R[k].fin) })).sort((a, b) => a.q - b.q);
      const fin = CG.map((c) => c.fin).sort((a, b) => a - b), totC = fin.reduce((a, b) => a + b, 0);
      let gg = 0, cum = 0, prec = 0;
      for (const v of fin) { cum += v / totC; gg += (1 / fin.length) * (cum + prec); prec = cum; }
      const gini = 1 - gg, top10 = 1 - fin.slice(Math.floor(0.9 * fin.length)).reduce((a, b) => a + b, 0) / totC;
      const alluvComuni = CG.filter((c) => c.alluv > 0).length;
      P(s, `C'è una componente del Piano che si chiama «Tutela del territorio e della risorsa idrica»: è la <b>Missione 2.4</b>, con <b>${mld(I[1], 2)} di euro</b> e <b>${nf(I[13])} progetti</b>, pagati al <b>${pc(e(I[2], I[1]), 1)}</b> al 13 giugno 2026. Dentro c'è di tutto: acquedotti e invasi, riduzione delle perdite di rete, difesa dalle alluvioni, irrigazione, fognature, bonifica dei siti orfani, rinaturazione del Po, verde urbano.`);
      P(s, `È il tema più concentrato letto finora: <b>${nf(con)} comuni su ${nf(CG.length)}</b> (${pc(con / CG.length, 1)}) hanno almeno un progetto, e ${nf(senza)} non ne hanno nessuno. Non è una svista: un invaso, un tratto di fiume, un acquedotto sono <b>opere di bacino</b>, e nei dati sono indicate in uno o pochi comuni anche se servono un territorio molto più largo. La concentrazione è alta anche tra chi ha progetti (Gini ${nf(gini, 2)}, il 10 % dei comuni con più fondi prende il ${pc(top10, 1)}).`);
      P(s, `La domanda che questo tema permette di fare e gli altri no è <b>«chi spende»</b>. Solo il <b>${pc(e(I[18], I[1]), 1)}</b> dei soldi ha un comune come soggetto attuatore; il resto passa da ministeri, regioni, consorzi di bonifica, agenzie interregionali e gestori del servizio idrico. E la parte dei comuni è anche la più indietro nei pagamenti: <b>${pc(e(I[19], I[18]), 1)}</b> contro il ${pc(e(I[2], I[1]), 1)} del totale. La geografia di questa differenza è netta: nei comuni del ${ck[ck.length - 1].n} il comune è attuatore per il ${pc(ck[ck.length - 1].q, 1)} dei fondi, nelle ${ck[0].n} per il ${pc(ck[0].q, 1)}.`);
      mappa(s, { def: 'acq_pc', livello: 'c' });
      fig(s, 'Euro per abitante secondo la dimensione del comune', 'sotto: quota di comuni con almeno un progetto', (h) => G.colonne(h, {
        voci: DIM.map(([n], i) => ({ nome: n.replace(' abitanti', ''), val: e(DD[i].fin, DD[i].pop), sotto: pc(e(DD[i].con, DD[i].n), 0) + ' con progetti', sub: `${nf(DD[i].con)} comuni su ${nf(DD[i].n)} con almeno un progetto · ${eur(DD[i].fin)} in tutto` })),
        formatta: eur0, conTip, nome: 'Euro per abitante per dimensione del comune',
      }), `Il valore per abitante è altissimo nei comuni piccoli (${eur0(e(DD[0].fin, DD[0].pop))}) e basso nelle grandi città (${eur0(e(DD[4].fin, DD[4].pop))}), ma la copertura è l'opposta: solo ${pc(e(DD[0].con, DD[0].n), 0)} dei comuni sotto i 1.000 abitanti ha un progetto, contro il ${pc(e(DD[4].con, DD[4].n), 0)} di quelli sopra i 100.000. Un'opera da decine di milioni in un paese di 800 abitanti produce un valore a testa enorme e non dice nulla su quanto ricevono i residenti.`);
      fig(s, 'Pagato contro assegnato, per ripartizione', 'importi attribuibili al territorio · il divario è di oltre venti punti', (h) => G.colonne(h, {
        voci: ordRip.map((k) => ({ nome: k, val: e(R[k].pag, R[k].fin), col: RIP[k], sub: `${eur(R[k].pag)} pagati su ${eur(R[k].fin)}` })),
        formatta: (v) => pc(v, 1), conTip, nome: 'Quota pagata della Missione 2.4, per ripartizione',
      }), `Il valore più alto è in ${pk[pk.length - 1].n} (${pc(pk[pk.length - 1].q, 1)}), il più basso nelle ${pk[0].n} (${pc(pk[0].q, 1)}). Come nel resto del Piano il Mezzogiorno ha più fondi per abitante e li ha pagati meno, ma qui pesa anche il tipo di opera: gli acquedotti e gli invasi si pagano a stati di avanzamento lenti.`);
      P(s, `Anche qui i soldi arrivano dove ci sono le opere, non dove ci sono gli abitanti: nel ${rk[rk.length - 1]} sono ${eur0(e(R[rk[rk.length - 1]].fin, R[rk[rk.length - 1]].pop))} per abitante, nel ${rk[0]} ${eur0(e(R[rk[0]].fin, R[rk[0]].pop))}. E solo ${nf(alluvComuni)} comuni hanno un progetto delle misure per le alluvioni (${mld(I[7])}, pagate al ${pc(e(I[8], I[7]), 1)}): la difesa del suolo si fa per bacini, non per confini comunali.`);
      calc(s, `Euro per abitante = importo della Missione 2.4 attribuito al territorio ÷ abitanti (<code>data/acqua.json</code>, calcolato da <code>scrpits/acqua.py</code>; abitanti ISTAT al 1° gennaio 2024, la stessa fonte degli altri temi). Nei comuni si conta solo la quota localizzata nel comune; nelle province i comuni più la quota provinciale; nelle regioni anche la quota regionale; l'Italia somma tutti i livelli. «Comune come attuatore» = progetti con soggetto attuatore il cui nome comincia per «COMUNE». I cinque gruppi sono elencati nella <a href="guida.html#acqua">Guida</a>; gli importi vengono dagli stessi open data di Italia Domani usati dall'atlante.`);
      limiti(s, [
        `L'opera è contata dove <b>è indicata</b>, non dove sta il bacino idrografico: un intervento sul fiume nel comune X serve anche i comuni a valle, che nei dati non compaiono. Il valore per abitante di un comune con un'invaso o una cassa di espansione non dice quanto ricevono i suoi residenti.`,
        `Il <b>83 %</b> dei soldi arriva a un comune come localizzazione, ma solo il ${pc(e(I[18], I[1]), 1)} ha un comune come soggetto attuatore: la localizzazione dice <b>dove</b> è l'opera, non <b>chi</b> la realizza e la paga.`,
        `L'importo è quello <b>finanziato</b>, non quello speso: la quota pagata dice a che punto sono i pagamenti, non se l'opera è utile o è stata fatta bene.`,
        `Il PNRR non copre tutta la spesa per l'acqua e il dissesto: mancano le risorse ordinarie, i fondi regionali, i PON e le risorse dei gestori. Questo tema dice quanto mette il PNRR, non quanto serve.`,
      ]);
    }

    /* ================= 5. Pochi comuni, molti soldi ================= */
    {
      const s = sezione('concentrazione', 'Pochi comuni prendono una fetta enorme');
      P(s, `I fondi localizzati nei comuni (${mld(totCom)}) non sono distribuiti in modo uniforme. L'<b>1%</b> dei comuni (${top1n} su ${nf(nC)}) riceve il <b>${pc(top1, 1)}</b>. All'altro estremo, la metà più piccola dei comuni (${nf(Math.floor(nC / 2))}) riceve in tutto il <b>${pc(meta50, 1)}</b>. ${roma.nm}, da sola, ne riceve il ${pc(roma.fin / totCom, 1)}. È normale che le grandi città ricevano di più, perché hanno più abitanti. Per saperlo conviene guardare i fondi per abitante.`);
      const fasce = [[0, 1000, 'sotto 1.000 abitanti'], [1000, 5000, '1.000–5.000'], [5000, 20000, '5.000–20.000'], [20000, 100000, '20.000–100.000'], [100000, 1e12, 'oltre 100.000']].map(([a, b, n]) => {
        const k = C.filter((c) => c.pop >= a && c.pop < b), f = k.reduce((x, c) => x + c.fin, 0), p = k.reduce((x, c) => x + c.pop, 0);
        return { nome: n, n: k.length, fin: f, pop: p, pc: f / p };
      });
      P(s, `Il risultato ha la forma di una «U»: i comuni più piccoli (<b>${eab(fasce[0].pc)}</b> a testa) e le grandi città (<b>${eab(fasce[4].pc)}</b>) ricevono più dei comuni di media grandezza (<b>${eab(fasce[2].pc)}</b>, tra 5.000 e 20.000 abitanti).`);
      const gr = H('div', { class: 'grafici' }); s.append(gr);
      const lorC = []; { let cum = 0; lorC.push([0, 0]); ord.forEach((c, i) => { cum += c.fin; if (i % 20 === 19 || i === nC - 1) lorC.push([(i + 1) / nC, cum / totCom]); }); }
      const y99 = (() => { const k = Math.floor(nC * 0.99); return ord.slice(0, k).reduce((x, c) => x + c.fin, 0) / totCom; })();
      fig(gr, 'La curva della disuguaglianza', 'quanta parte dei soldi va a quale parte dei comuni (curva di Lorenz)', (h) => G.lorenz(h, {
        curva: lorC, xNome: 'comuni, dal più piccolo importo al più grande', yNome: 'quota dei soldi ricevuti', conTip,
        evidenzia: [{ x: 0.5, y: meta50, titolo: 'Metà dei comuni', testo: `La metà dei comuni con meno fondi riceve il ${pc(meta50, 1)} dei soldi.` }, { x: 0.99, y: y99, titolo: 'Il 99% dei comuni', testo: `Il 99% dei comuni riceve il ${pc(y99, 1)}: il resto, il ${pc(top1, 1)}, va all'1% in cima.` }],
      }), 'Se i soldi fossero distribuiti in modo uguale, la curva sarebbe la diagonale tratteggiata.');
      fig(gr, 'Soldi per abitante, per dimensione del comune', 'euro a testa', (h) => G.colonne(h, { voci: fasce.map((x) => ({ nome: x.nome, sub: `${nf(x.n)} comuni`, val: x.pc, sotto: nf(x.n) + ' comuni' })), formatta: (v) => nf(v) + ' €', conTip, nome: 'Euro per abitante per fascia' }), 'Valori calcolati sulla somma di tutti i comuni della fascia, non sulla media dei comuni.');
      calc(s, `Comuni ordinati per finanziamento localizzato al comune (<code>data/cubo_c.json</code>). «1%» = i ${top1n} comuni con più fondi. Fasce di popolazione: ISTAT 1/1/2026. Euro a testa di una fascia = somma dei fondi dei suoi comuni ÷ somma dei suoi abitanti.`);
      limiti(s, ['Una città grande ospita opere di interesse regionale o nazionale (ferrovie, ospedali, università) che servono anche chi abita altrove. I «fondi per abitante» di una città non misurano quanto ricevono i suoi residenti.', 'Nei comuni piccolissimi basta un solo progetto per far salire molto il valore a testa.']);
    }

    /* ================= 6. Chi realizza ================= */
    {
      const s = sezione('enti', 'Pochi enti realizzano una parte enorme');
      const t = it.conc.top;
      const nomeEnte = (n) => n.replace(/\s+-\s*$/, '').replace(/^\(|\)$/g, '').toLowerCase().replace(/^./, (c) => c.toUpperCase());
      P(s, `Per ogni progetto c'è un ente che lo realizza (il «soggetto attuatore»). Il primo, <b>Rete Ferroviaria Italiana</b>, da solo ha <b>${mld(t[0][1])}</b>: il ${pc(it.conc.top1, 1)} di tutto il PNRR, in ${nf(t[0][2])} progetti. I primi cinque messi insieme hanno il <b>${pc(it.conc.top5, 1)}</b>. Fra loro ci sono due ministeri e il gruppo delle imprese che hanno ricevuto i crediti d'imposta.`);
      fig(s, 'I cinque «attuatori» con più soldi', 'finanziamento PNRR', (h) => G.barre(h, {
        voci: t.map(([n, v, k]) => ({ nome: nomeEnte(n), sub: `${nf(k)} progett${k === 1 ? 'o' : 'i'}`, val: v, col: '--s5' })), formatta: eur, conTip, nome: 'Attuatori con più fondi',
      }));
      calc(s, `Soggetti attuatori raggruppati per codice fiscale (<code>data/italia.json</code>, campo <code>conc</code>). I privati (imprese e persone fisiche beneficiarie di incentivi) sono riuniti in una sola voce per tutelare la privacy. Quota del primo = importo ÷ totale.`);
      limiti(s, ['Un ente grande non è un problema in sé: la rete ferroviaria è una sola. Il dato dice quanta parte del PNRR dipende da pochi attuatori, non che siano stati scelti male.']);
    }

    /* ================= 7. I conti che non tornano ================= */
    {
      const s = sezione('conti', `${mld(ver.senza_progetto)} che non hanno (ancora) un progetto`);
      P(s, `Ogni misura del PNRR ha una dotazione, cioè una cifra a disposizione. La somma delle dotazioni è <b>${mld(ver.dotazione)}</b>. I progetti registrati valgono <b>${mld(ver.su_progetti)}</b>. La differenza, <b>${mld(ver.senza_progetto)}</b>, non ha un progetto nei dati. Si trova soprattutto nella Missione 2 (transizione verde, ${nf(ver.per_missione_senza_progetto_mld.M2, 1)} mld) e nella Missione 1 (digitale, ${nf(ver.per_missione_senza_progetto_mld.M1, 1)} mld).`);
      P(s, `Le voci singole più grandi: ${ver.sottomisure_piu_grandi.map((x) => `<b>${x.codice}</b> (${nf(x.mld, 2)} mld)`).join(', ')}. Al contrario, in <b>${ver.sottomisure_oltre_dotazione.numero} sottomisure</b> i progetti superano la dotazione, per ${nf(ver.sottomisure_oltre_dotazione.mld, 2)} miliardi in tutto: forse cofinanziamenti o spostamenti di fondi, ma i dati non lo spiegano.`);
      fig(s, 'Le quattro voci con più soldi senza progetto', 'miliardi di euro', (h) => G.barre(h, { voci: ver.sottomisure_piu_grandi.map((x) => ({ nome: x.codice, val: x.mld * 1e9, col: '--warn' })), formatta: eur, conTip, nome: 'Sottomisure senza progetto' }));
      const pm = ver.per_missione;
      const box = H('div', { class: 'miss-conti' });
      Object.keys(pm).sort().forEach((k) => {
        const d = pm[k], sp = Math.max(0, d.dotazione - d.su_progetti), fermo = Math.max(0, d.su_progetti - d.pagato), base = Math.max(d.dotazione, d.su_progetti);
        const w = (v) => (100 * v / base).toFixed(1) + '%';
        box.append(H('div', { class: 'mc' }, [
          H('h3', {}, [H('b', { text: k }), ' ' + NOMI_MIS[k]]),
          H('div', { class: 'mc-bar', role: 'img', 'aria-label': `${k}: pagato ${eur(d.pagato)}, su progetti ma non ancora pagato ${eur(fermo)}, senza progetto ${eur(sp)}, su una dotazione di ${eur(d.dotazione)}` }, [
            H('i', { class: 'mc-p', style: 'width:' + w(d.pagato) }), H('i', { class: 'mc-f', style: 'width:' + w(fermo) }), H('i', { class: 'mc-s', style: 'width:' + w(sp) })]),
          H('dl', {}, [
            H('dt', { text: 'Dotazione' }), H('dd', { text: eur(d.dotazione) }),
            H('dt', { text: 'Pagato' }), H('dd', { text: `${eur(d.pagato)} (${pc(d.pagato / d.dotazione)})` }),
            H('dt', { text: 'Su progetti, non ancora pagato' }), H('dd', { text: eur(fermo) }),
            H('dt', { text: sp > 0 ? 'Senza progetto' : 'Oltre la dotazione' }), H('dd', { text: eur(sp > 0 ? sp : d.su_progetti - d.dotazione) })])]));
      });
      s.append(H('figure', { class: 'grafico' }, [H('figcaption', {}, [H('b', { text: 'Per missione: disponibile, pagato, fermo' }), H('small', { text: 'dotazione = 100%' })]), box,
        (() => { const u = H('ul', { class: 'leg-tri' }); [['tp', 'Pagato'], ['tf', 'Già su progetti, non ancora pagato'], ['ts', 'Senza progetto nei dati (dotazione meno progetti)']].forEach(([c, t]) => u.append(H('li', {}, [H('i', { class: c }), t]))); return u; })(), H('p', { class: 'grafico-nota', text: 'Il perché del mancato utilizzo non è nei dati ufficiali.' })]));
      calc(s, `Dotazione = «Importo» del file «Spesa per misura» (aggiornato al 30/04/2026). Progetti = somma dei progetti (estrazione del 13/06/2026). Le due date sono diverse. Cifre ricavate nel controllo indipendente descritto in <code>docs/PIANO_PROFONDITA.md</code> e raccolte in <code>data/verifiche.json</code>.`);
      limiti(s, ['La differenza può dipendere da fondi non ancora assegnati, ma anche da ritardi nell’inserire i progetti nel sistema. I dati non permettono di distinguere i due casi.', 'Un altro file ufficiale, il «Quadro finanziario di programmazione», somma 134,3 miliardi e lascia vuote molte voci: per questo non l’abbiamo usato come totale.']);
    }

    /* ================= 8. Ritardi ================= */
    {
      const s = sezione('ritardi', 'I ritardi: attenzione alla data');
      P(s, `Nei dati un progetto è «in ritardo» se è ancora «in corso» e la sua fine prevista è <b>prima del 13 giugno 2026</b>, data dell'estrazione. Sono <b>${nf(it.rit[0])} progetti</b> (${pc(it.rit[0] / it.n, 1)} del totale), per <b>${mld(it.rit[1])}</b> (${pc(it.rit[1] / fin, 1)} dei soldi). In media un progetto in ritardo vale <b>${eur(it.rit[1] / it.rit[0])}</b>, contro ${eur(fin / it.n)} di un progetto qualsiasi: i ritardi sono molti per numero ma pesano meno per euro.`);
      const rr = provs.filter((p) => p.fin > 0).map((p) => ({ id: p.id, nome: p.nome, sub: `${p.sigla} · ${nf(p.rit[0])} progetti in ritardo`, val: p.rit[1] / p.fin, col: RIP[reg[p.reg].rip] })).sort((a, b) => b.val - a.val);
      fig(s, 'Le 10 province con la quota più alta di soldi in ritardo', `contro ${pc(it.rit[1] / fin, 1)} nazionale · colore = zona`, (h) => G.barre(h, { voci: rr.slice(0, 10), apri: (x) => { location.href = 'index.html#/p/' + x.id; }, formatta: (v) => pc(v, 1), conTip, riferimento: it.rit[1] / fin, rifNome: 'Italia', nome: 'Province con più ritardo' }));
      P(s, `Anche i ritardi sono sulla mappa: scegli «in ritardo» nella mappa del capitolo sul Sud, oppure apri la mappa completa dell'atlante.`);
      calc(s, `In ritardo = stato «In corso» e data di fine prevista anteriore al 13/06/2026 (campo <code>rit</code> di <code>data/italia.json</code> e delle province). Quota = importo in ritardo ÷ finanziamento della provincia.`);
      limiti(s, ['La data di fine prevista è dichiarata dagli enti e può essere stata spostata. Il programma si è chiuso il 30 giugno 2026: una parte di questi progetti sarà stata chiusa nelle ultime settimane.', 'Un progetto in ritardo nei dati non è per forza un progetto bloccato.']);
    }

    /* ================= 8 bis. Cosa non dicono ================= */
    {
      const s = sezione('nondicono', 'Cosa non dicono');
      const sp = ver.stati_progetti, cc = ver.cup_chiuso_in_corso;
      P(s, `Una domanda naturale è: quanti progetti non sono stati realizzati, e quanti soldi si sono persi? <b>I dati pubblici non permettono di rispondere.</b> Nel sistema ufficiale lo stato di un progetto ha solo tre valori: «in corso» (${nf(sp.in_corso)}), «concluso» (${nf(sp.concluso)}) e «da attivare» (${nf(sp.da_attivare)}). Non esistono «revocato», «definanziato» o «non realizzato»: un progetto abbandonato o tolto dal piano non lascia traccia con un suo stato.`);
      P(s, `Non si può nemmeno dire quanto «spettava» a una regione o a un comune. La dotazione ufficiale è fissata per misura, a livello nazionale: i ${mld(ver.senza_progetto)} senza progetto del capitolo sui conti non hanno un territorio. Per questo il confronto tra dotazione, finanziato e pagato c'è per l'Italia e per missione, ma non per regioni, province e comuni.`);
      P(s, `Anche il tema della salute ha un limite di geografia. La Missione 6 è la più concentrata del Piano: i soldi stanno dove stanno le aziende ospedaliere, e gli abitanti dei comuni vicini sono curati lì. L'euro per abitante di un comune con un policlinico non dice quanto ricevono i suoi residenti, e quello del paese accanto non dice che non hanno servizi. In più una parte dei fondi (fascicolo sanitario, telemedicina, assistenza domiciliare) è attribuita alla regione e non a un comune: non si può spalmare senza inventare una ripartizione che i dati non hanno.`);
      P(s, `Anche la PA digitale ha un limite di lettura. I bandi sono una <b>cifra per amministrazione</b> e non per abitante, quindi i comuni piccoli risultano molto più «finanziati» a testa senza aver ricevuto di più. Un terzo della componente è giustizia e ministeri, cioè in gran parte personale e digitalizzazione interna che non passa dai comuni. E i dati dicono quanti comuni hanno attivato un servizio (SPID, PagoPA, il cloud), non quante persone lo usano: il numero di cittadini che hanno davvero fatto una pratica online non è in questi file.`);
      P(s, `Anche l'acqua ha un limite di geografia, e più forte degli altri. Le opere idriche e di difesa del suolo sono <b>di bacino</b>: un invaso, un tratto di fiume, un depuratore servono comuni che nei dati non compaiono, e il valore per abitante del comune in cui l'opera è indicata non dice quanto ricevono i suoi residenti. In più solo il ${pc(e(acq.i[18], acq.i[1]), 1)} dei soldi ha un comune come soggetto attuatore: la localizzazione dice dove sta l'opera, non chi la realizza e chi la paga. E i dati non dicono se le perdite di rete si sono ridotte o se il rischio di alluvione è diminuito: dicono quanti soldi sono stati assegnati e pagati.`);
      P(s, `Anche il confronto per età ha i suoi limiti. I residenti di 0-24 anni sono quelli del 1° gennaio 2024, l'ultimo dato ISTAT per singola età, mentre il totale degli abitanti nelle schede è del 2026: nei confronti tra anni diversi usiamo sempre la stessa fonte, ma i due totali non sono perfettamente sovrapponibili. E il PNRR non dice quante famiglie usano davvero un asilo o quante persone si iscrivono a un ITS: dice quanti posti e quante strutture sono state finanziate, non quante sono piene.`);
      P(s, `Ci sono solo indizi, da non scambiare per perdite. ${nf(cc.n)} progetti hanno il codice CUP «chiuso» ma risultano ancora «in corso», per ${nf(cc.mln, 0)} milioni di euro: forse sono stati interrotti, forse è solo una chiusura amministrativa. In più, ${nf(it.rit[0])} progetti sono «in ritardo» (${mld(it.rit[1])}, capitolo precedente) e ${nf(it.icc[0])} hanno l'iter concluso ma non sono ancora segnati come conclusi (${mld(it.icc[1])}). Sono soldi fermi o in attesa di una formalità, non soldi persi.`);
      calc(s, `Stati = campo «Stato Avanzamento Progetto» del file Progetti (estrazione del ${meta.estrazione}). CUP chiuso ma in corso = «Stato CUP» uguale a «Chiuso» e stato avanzamento «In Corso». Cifre raccolte in <code>data/verifiche.json</code> da <code>scrpits/verifiche_missioni.py</code>.`);
      limiti(s, ['Per sapere quanti fondi sono stati davvero persi servono fonti esterne: le relazioni della Ragioneria generale dello Stato, le decisioni del Consiglio dell’Unione europea sulle modifiche al Piano e i decreti di definanziamento. Di solito parlano di misure, non di comuni.']);
    }

    /* ================= 9. Chiusura ================= */
    {
      const s = sezione('conclusione', 'Che cosa possiamo dire, e che cosa no');
      /* numeri del tema PA digitale per la riga qui sotto */
      const conPa = Object.values(pa.c).filter((r) => r[1] > 0).length, CGPa = Object.keys(pa.c);
      const u = H('ul'); [
        `<b>Possiamo dire</b> che, nei dati pubblici al ${meta.estrazione}, i progetti conclusi valgono ${pc(stg[4].fin / finSenzaNA, 1)} dei fondi dei progetti veri, e che il pagato è il ${pc(pagSenzaNA / finSenzaNA, 1)}.`,
        `<b>Possiamo dire</b> che il Sud e le Isole hanno una quota pagata più bassa delle altre zone, e che il tipo di progetti non basta a spiegarlo.`,
        `<b>Possiamo dire</b> che i fondi sono concentrati: pochi comuni e pochi enti ne ricevono una parte molto grande.`,
        `<b>Possiamo dire</b> che il PNRR per giovane cambia molto con la definizione e con il territorio: in senso largo il Sud riceve più dei suoi adulti, il Nord-ovest no. Non esiste un solo numero che risponda alla domanda.`,
        `<b>Possiamo dire</b> che per la salute vale il contrario di quel che si sente dire sui ritardi: il Sud ha più euro per abitante del Nord, ma ha pagato meno (circa venti punti di distanza nelle quote pagate).`,
        `<b>Possiamo dire</b> che la PA digitale arriva in quasi tutti i comuni (${nf(conPa)} su ${nf(CGPa.length)}) e che il Sud ha più euro per abitante del Nord, ma che quella differenza non misura una diseguaglianza: il bando è una cifra per amministrazione, e nei paesi piccoli pesa di più.`,
        `<b>Possiamo dire</b> che sull'acqua e sul dissesto il tema più utile non è quanto arriva ma <b>chi spende</b>: solo il ${pc(e(acq.i[18], acq.i[1]), 1)} dei soldi ha un comune come soggetto attuatore, il resto passa da regioni, consorzi e gestori, e la parte dei comuni è la più indietro nei pagamenti (${pc(e(acq.i[19], acq.i[18]), 1)} contro il ${pc(e(acq.i[2], acq.i[1]), 1)}).`,
        `<b>Non possiamo dire</b> se il PNRR «ha funzionato»: i dati misurano soldi e stati amministrativi, non i risultati per i cittadini.`,
        `<b>Non possiamo dire</b> perché ci siano ritardi o divari: servirebbero informazioni sui singoli progetti e sugli enti.`,
        `<b>Non possiamo dire</b> che i dati siano giusti. Sono quelli dichiarati dagli enti. Dove abbiamo trovato scarti, li abbiamo scritti.`,
      ].forEach((t) => { const li = H('li'); li.innerHTML = t; u.append(li); }); s.append(u);
      P(s, `Controllare è facile. Tutti i dati usati sono nella cartella <code>data/</code> del sito, in formato aperto. Le cifre di questa pagina si possono rifare con lo script <code>scrpits/relazione_numeri.py</code>. Per ogni progetto puoi vedere la scheda ufficiale sull'<a href="https://www.opencup.gov.it/" target="_blank" rel="noopener">OpenCUP</a> dall'<a href="index.html">atlante</a>. Se trovi un errore, scrivici (vedi «Info → Credits»).`);
      const gl = H('dl', { class: 'glossario' });
      [['PNRR', 'Piano nazionale di ripresa e resilienza: i fondi europei (Next Generation EU) con cui l’Italia finanzia riforme e investimenti.'],
        ['Missione', `Uno dei sette grandi capitoli del piano: ${Object.entries(NOMI_MIS).map(([k, v]) => k + ' ' + v).join('; ')}.`],
        ['Finanziato', 'I soldi PNRR assegnati a un progetto.'],
        ['Pagato', 'I soldi già versati a chi realizza il progetto. Anche gli anticipi contano.'],
        ['Concluso', 'Il progetto ha lo stato «concluso» nel sistema ufficiale.'],
        ['CUP', 'Codice unico di progetto: la «targa» di ogni investimento pubblico.'],
        ['ReGiS', 'Il sistema informatico dove gli enti inseriscono i dati dei progetti PNRR.'],
        ['Soggetto attuatore', 'L’ente che realizza il progetto: un comune, una società, un ministero.'],
        ['Ambito nazionale', 'Progetti non legati a un luogo preciso, ma a tutta l’Italia.'],
        ['Per abitante', 'Il totale diviso per il numero di abitanti. Serve a confrontare territori di grandezza diversa.'],
        ['Quantili', 'Modo di colorare la mappa: ogni colore ha lo stesso numero di territori.']
      ].forEach(([t, d]) => gl.append(H('div', { class: 'g-voce' }, [H('dt', { text: t }), H('dd', { text: d })])));
      s.append(H('h3', { text: 'Parole difficili' }), gl);
    }

    /* indice */
    const ind = H('ol'); voci.forEach(([id, t]) => ind.append(H('li', {}, H('a', { href: '#' + id, text: t })))); indice.append(ind);
    if (location.hash && el(location.hash.slice(1))) el(location.hash.slice(1)).scrollIntoView();

  }).catch((e) => { const c = el('caric') || art.appendChild(H('p', { id: 'caric', class: 'caric' })); c.textContent = 'Qualcosa è andato storto: ' + e.message; console.error(e); });
})();
