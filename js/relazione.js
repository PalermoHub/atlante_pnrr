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
  const get = (n) => fetch(`data/${n}.json`).then((r) => { if (!r.ok) throw new Error(n + ' ' + r.status); return r.json(); });

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

  Promise.all(['italia', 'regioni', 'province', 'comuni', 'meta', 'cubo_c', 'cubo_i', 'cubo_r', 'verifiche'].map(get)).then(([it, reg, prov, com, meta, cc, ci, cr, ver]) => {
    el('caric').remove();

    /* ================= calcoli di base ================= */
    const fin = it.fin, pag = it.pag, NA = it.fs[5];
    const celle = (c) => { const r = []; for (let o = 0; o < c.length; o += 9) r.push({ m: c[o], na: c[o + 1], s: c[o + 2], f: c[o + 3], n: c[o + 4], fin: c[o + 5], pag: c[o + 7] }); return r; };
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
      const o = { id, nm: info.nm, pop: info.pop || 0, rg: info.rg, pv: info.pv, fin: 0, pag: 0, conc: 0, rit: 0 };
      celle(c).forEach((x) => { o.fin += x.fin; o.pag += x.pag; if (x.s === 4) o.conc += x.fin; if (x.f & 2) o.rit += x.fin; });
      CF[id] = o;
    }
    const C = Object.values(CF), totCom = C.reduce((s, c) => s + c.fin, 0);

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
    };
    const DATI = {
      c: () => CF,
      p: () => Object.fromEntries(provs.map((p) => [p.id, { fin: p.fin, pag: p.pag, conc: p.fs[4], rit: p.rit[1], pop: p.pop }])),
      r: () => Object.fromEntries(regs.map((r) => [r.id, { fin: r.fin, pag: r.pag, conc: r.fs[4], rit: r.rit[1], pop: r.pop }])),
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
        map.on('mousemove', 'comuni', (e) => {
          const f = e.features && e.features[0]; if (!f) return;
          const cid = f.properties.pro_com_t, id = st.liv === 'c' ? cid : st.liv === 'p' ? cid.slice(0, 3) : String(f.properties.cod_reg);
          const v = vals[id]; tip.hidden = false;
          tip.replaceChildren(H('b', { text: NOME[st.liv](id) || id }), H('span', { text: v == null ? 'nessun dato' : `${IND[st.ind].nome}: ${IND[st.ind].fmt(v)}` }));
          tip.style.left = Math.min(e.point.x + 12, tela.clientWidth - 230) + 'px'; tip.style.top = Math.max(4, e.point.y - 8) + 'px';
        });
        map.on('mouseleave', 'comuni', () => { tip.hidden = true; });
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
        H('p', { class: 'grafico-nota', text: 'Verde: pagato. Giallo: già su progetti ma non ancora pagato. Grigio: senza progetto nei dati. Il perché non è nei dati ufficiali.' })]));
      calc(s, `Dotazione = «Importo» del file «Spesa per misura» (aggiornato al 30/04/2026). Progetti = somma dei progetti (estrazione del 13/06/2026). Le due date sono diverse. Cifre ricavate nel controllo indipendente descritto in <code>docs/PIANO_PROFONDITA.md</code> e raccolte in <code>data/verifiche.json</code>.`);
      limiti(s, ['La differenza può dipendere da fondi non ancora assegnati, ma anche da ritardi nell’inserire i progetti nel sistema. I dati non permettono di distinguere i due casi.', 'Un altro file ufficiale, il «Quadro finanziario di programmazione», somma 134,3 miliardi e lascia vuote molte voci: per questo non l’abbiamo usato come totale.']);
    }

    /* ================= 8. Ritardi ================= */
    {
      const s = sezione('ritardi', 'I ritardi: attenzione alla data');
      P(s, `Nei dati un progetto è «in ritardo» se è ancora «in corso» e la sua fine prevista è <b>prima del 13 giugno 2026</b>, data dell'estrazione. Sono <b>${nf(it.rit[0])} progetti</b> (${pc(it.rit[0] / it.n, 1)} del totale), per <b>${mld(it.rit[1])}</b> (${pc(it.rit[1] / fin, 1)} dei soldi). In media un progetto in ritardo vale <b>${eur(it.rit[1] / it.rit[0])}</b>, contro ${eur(fin / it.n)} di un progetto qualsiasi: i ritardi sono molti per numero ma pesano meno per euro.`);
      const rr = provs.filter((p) => p.fin > 0).map((p) => ({ nome: p.nome, sub: `${p.sigla} · ${nf(p.rit[0])} progetti in ritardo`, val: p.rit[1] / p.fin, col: RIP[reg[p.reg].rip] })).sort((a, b) => b.val - a.val);
      fig(s, 'Le 10 province con la quota più alta di soldi in ritardo', `contro ${pc(it.rit[1] / fin, 1)} nazionale · colore = zona`, (h) => G.barre(h, { voci: rr.slice(0, 10), formatta: (v) => pc(v, 1), conTip, riferimento: it.rit[1] / fin, rifNome: 'Italia', nome: 'Province con più ritardo' }));
      P(s, `Anche i ritardi sono sulla mappa: scegli «in ritardo» nella mappa del capitolo sul Sud, oppure apri la mappa completa dell'atlante.`);
      calc(s, `In ritardo = stato «In corso» e data di fine prevista anteriore al 13/06/2026 (campo <code>rit</code> di <code>data/italia.json</code> e delle province). Quota = importo in ritardo ÷ finanziamento della provincia.`);
      limiti(s, ['La data di fine prevista è dichiarata dagli enti e può essere stata spostata. Il programma si è chiuso il 30 giugno 2026: una parte di questi progetti sarà stata chiusa nelle ultime settimane.', 'Un progetto in ritardo nei dati non è per forza un progetto bloccato.']);
    }

    /* ================= 9. Chiusura ================= */
    {
      const s = sezione('conclusione', 'Che cosa possiamo dire, e che cosa no');
      const u = H('ul'); [
        `<b>Possiamo dire</b> che, nei dati pubblici al ${meta.estrazione}, i progetti conclusi valgono ${pc(stg[4].fin / finSenzaNA, 1)} dei fondi dei progetti veri, e che il pagato è il ${pc(pagSenzaNA / finSenzaNA, 1)}.`,
        `<b>Possiamo dire</b> che il Sud e le Isole hanno una quota pagata più bassa delle altre zone, e che il tipo di progetti non basta a spiegarlo.`,
        `<b>Possiamo dire</b> che i fondi sono concentrati: pochi comuni e pochi enti ne ricevono una parte molto grande.`,
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
