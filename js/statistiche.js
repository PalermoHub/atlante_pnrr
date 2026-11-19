/* Atlante PNRR · pagina Statistiche. Tutti i numeri vengono dai JSON già esportati (data/*.json),
   qui si fanno solo somme, rapporti e ordinamenti. */
(() => {
  'use strict';
  const G = window.GraficiPNRR;
  const nf = (n, d = 0) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
  const eur = (v) => (Math.abs(v) >= 1e9 ? nf(v / 1e9, 1) + ' mld €' : Math.abs(v) >= 1e6 ? nf(v / 1e6, v >= 1e8 ? 0 : 1) + ' mln €' : nf(v / 1e3) + ' mila €');
  const pc = (q, d = 0) => nf(100 * q, d) + '%';
  const el = (id) => document.getElementById(id);
  const H = (tag, a = {}, kids = []) => { const e = document.createElement(tag); for (const k in a) { if (k === 'text') e.textContent = a[k]; else if (a[k] != null) e.setAttribute(k, a[k]); } [].concat(kids).forEach((c) => c != null && e.append(c.nodeType ? c : document.createTextNode(c))); return e; };
  const NOMI_MIS = { M1: 'Digitalizzazione, innovazione, cultura', M2: 'Rivoluzione verde e transizione ecologica', M3: 'Infrastrutture per la mobilità', M4: 'Istruzione e ricerca', M5: 'Inclusione e coesione', M6: 'Salute', M7: 'REPowerEU' };
  const RIP = { 'Nord-ovest': '--c1', 'Nord-est': '--c2', Centro: '--c3', Sud: '--c4', Isole: '--c5' };
  const mediana = (a) => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };
  const quant = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];

  /* tooltip unico, posizionato sul puntatore o sul nodo se c'è il focus */
  const tip = H('div', { class: 'tip', 'aria-hidden': 'true', hidden: '' }); document.body.append(tip);
  function conTip(nodo, titolo, righe) {
    const mostra = (x, y) => {
      tip.replaceChildren(H('b', { text: titolo }), ...righe.filter(Boolean).map((r) => H('div', {}, [r[0] ? H('span', { text: r[0] + ': ' }) : null, r[1]])));
      tip.hidden = false;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.min(Math.max(8, x + 14), innerWidth - w - 8) + 'px';
      tip.style.top = Math.min(y + 14, innerHeight - h - 8) + 'px';
    };
    nodo.addEventListener('pointermove', (e) => mostra(e.clientX, e.clientY));
    nodo.addEventListener('pointerleave', () => { tip.hidden = true; });
    nodo.addEventListener('focus', () => { const b = nodo.getBoundingClientRect(); mostra(b.left + b.width / 2, b.top + b.height / 2); });
    nodo.addEventListener('blur', () => { tip.hidden = true; });
  }
  const cap = (id, titolo, corpo, opz = {}) => {
    const s = H('figure', { class: 'grafico' + (opz.largo ? ' largo' : '') }, [H('figcaption', {}, [H('b', { text: titolo }), opz.sub ? H('small', { text: opz.sub }) : null])]);
    el(id).append(s); corpo(s); if (opz.nota) s.append(H('p', { class: 'grafico-nota', text: opz.nota })); return s;
  };

  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });

  Promise.all(['italia', 'regioni', 'province', 'comuni', 'meta', 'cubo_c'].map((n) => get(`data/${n}.json`))).then(([it, reg, prov, com, meta, cubo]) => {
    el('caric').remove();
    const regs = Object.entries(reg).map(([id, r]) => ({ id, ...r }));
    const provs = Object.entries(prov).map(([id, p]) => ({ id, ...p }));
    const fin = it.fin, conc = it.fs[4];

    /* ---- per comune: somme dal cubo (solo la parte localizzata al comune) ---- */
    const C = [];
    for (const [id, c] of Object.entries(cubo)) {
      let n = 0, f = 0, pg = 0, cn = 0;
      for (let o = 0; o < c.length; o += 9) { n += c[o + 4]; f += c[o + 5]; pg += c[o + 7]; if (c[o + 2] === 4) cn += c[o + 5]; }
      const info = com[id]; if (!info) continue;
      C.push({ id, nome: info.nm, pop: info.pop, rg: info.rg, n, fin: f, pag: pg, conc: cn, pc: info.pop > 0 ? f / info.pop : null });
    }
    const totCom = C.reduce((s, c) => s + c.fin, 0);

    /* ---- sintesi ---- */
    const sud = regs.filter((r) => r.rip === 'Sud' || r.rip === 'Isole');
    const sudFin = sud.reduce((s, r) => s + r.fin, 0), regFin = regs.reduce((s, r) => s + r.fin, 0), sudPop = sud.reduce((s, r) => s + r.pop, 0), popTot = regs.reduce((s, r) => s + r.pop, 0);
    const ord = C.slice().sort((a, b) => a.fin - b.fin);
    let cum = 0, g = 0; const lor = [[0, 0]];
    ord.forEach((c, i) => { cum += c.fin; lor.push([(i + 1) / ord.length, cum / totCom]); });
    for (let i = 1; i < lor.length; i++) g += (lor[i][0] - lor[i - 1][0]) * (lor[i][1] + lor[i - 1][1]);
    const gini = 1 - g;
    const top10 = 1 - lor[Math.floor(0.9 * ord.length)][1], top1 = 1 - lor[Math.floor(0.99 * ord.length)][1];
    const cifre = [
      ['Finanziamento PNRR', eur(fin), `${nf(it.n)} progetti · estrazione ${meta.estrazione}`],
      ['Per abitante', nf(fin / it.pop) + ' €', `popolazione ISTAT ${nf(it.pop)}`],
      ['Pagato', pc(it.pag / fin), eur(it.pag) + ' sul finanziato'],
      ['Concluso (stato ufficiale)', pc(conc / fin), eur(conc) + ' · ' + nf(it.ns[4]) + ' progetti'],
      ['In ritardo sulla fine prevista', pc(it.rit[1] / fin), `${nf(it.rit[0])} progetti non conclusi`],
      ['Iter concluso, stato «in corso»', pc(it.icc[1] / fin), `${nf(it.icc[0])} progetti: dato da aggiornare`],
    ];
    el('cifre').append(...cifre.map(([n, v, s]) => H('div', { class: 'cifra' }, [H('p', { class: 'cifra-nome', text: n }), H('p', { class: 'cifra-val', text: v }), H('p', { class: 'cifra-nota', text: s })])));

    const prima = (k) => regs.slice().sort((a, b) => k(b) - k(a));
    const rPc = prima((r) => r.fin / r.pop), rPag = prima((r) => r.pag / r.fin);
    el('sintesi').append(H('ul', {}, [
      `Le regioni del Mezzogiorno (Sud e Isole) hanno il ${pc(sudFin / regFin, 1)} dei fondi localizzati in una regione, con il ${pc(sudPop / popTot, 1)} degli abitanti: ${(sudFin / regFin) >= 0.4 ? 'sopra' : 'sotto'} la soglia del 40% prevista per il PNRR.`,
      `Per abitante, la regione con più fondi è ${rPc[0].nome} (${nf(rPc[0].fin / rPc[0].pop)} €), l'ultima è ${rPc[rPc.length - 1].nome} (${nf(rPc[rPc.length - 1].fin / rPc[rPc.length - 1].pop)} €); la media italiana è ${nf(fin / it.pop)} €.`,
      `La quota già pagata va dal ${pc(rPag[rPag.length - 1].pag / rPag[rPag.length - 1].fin)} (${rPag[rPag.length - 1].nome}) al ${pc(rPag[0].pag / rPag[0].fin)} (${rPag[0].nome}).`,
      `Tra i comuni la distribuzione è molto diseguale: il 10% dei comuni riceve il ${pc(top10)} dei fondi assegnati ai comuni, l'1% ne riceve il ${pc(top1)} (indice di Gini ${nf(gini, 2)}). Dipende molto dalle grandi opere e dalla dimensione demografica.`,
      `Solo il ${pc(it.liv[0] / fin, 1)} dell'importo è localizzato a livello di comune; il resto è assegnato a provincia, regione o Italia intera (${pc(it.liv[3] / fin, 1)}): i grafici sui comuni non coprono tutto il PNRR.`,
    ].map((t) => H('li', { text: t }))));

    /* ---- 1 imbuto ---- */
    const somma = (a, da) => a.slice(da, 5).reduce((s, x) => s + x, 0);
    cap('g-imbuto', 'Dal finanziamento al progetto concluso', (h) => G.imbuto(h, {
      formatta: eur, conTip,
      passi: [
        { nome: 'Finanziato', sub: 'progetti con avanzamento rilevato', val: somma(it.fs, 0) },
        { nome: 'Gara aggiudicata o oltre', val: somma(it.fs, 2) },
        { nome: 'Lavori o attività avviati', val: somma(it.fs, 3) },
        { nome: 'Concluso (stato ufficiale)', val: it.fs[4] },
        { nome: 'Pagato', sub: 'tutte le fasi', val: it.pag },
      ],
    }), { largo: true, nota: `Esclusi ${eur(it.fs[5])} di misure nazionali senza progetto (N/A), come l'Ecobonus. «Pagato» riguarda tutti i progetti e non è un sottoinsieme dei precedenti.` });

    /* ---- 2 composizioni ---- */
    const MIS = Object.keys(it.mis).sort();
    cap('g-comp', 'Per missione', (h) => G.ciambella(h, { voci: MIS.map((m) => ({ nome: m, sub: NOMI_MIS[m], val: it.mis[m][1] })).sort((a, b) => b.val - a.val), formatta: eur, conTip, nome: 'Finanziamento per missione', centro: { valore: eur(fin), etichetta: 'PNRR' } }), { sub: 'importo finanziato' });
    cap('g-comp', 'Per natura dell’intervento', (h) => G.ciambella(h, { voci: meta.nature.map((n, i) => ({ nome: n.charAt(0) + n.slice(1).toLowerCase().replace(/ \(.*\)/, ''), val: it.nat[i] })).sort((a, b) => b.val - a.val), formatta: eur, conTip, nome: 'Finanziamento per natura', centro: { valore: eur(fin), etichetta: 'PNRR' } }), { sub: 'importo finanziato' });
    cap('g-comp', 'Per stadio di avanzamento', (h) => G.ciambella(h, { voci: meta.stadi.map((n, i) => ({ nome: n, val: it.fs[i], sub: nf(it.ns[i]) + ' progetti' })).sort((a, b) => b.val - a.val), formatta: eur, conTip, nome: 'Finanziamento per stadio', centro: { valore: eur(fin), etichetta: 'PNRR' } }), { sub: 'importo finanziato' });

    /* ---- 3 missioni: pagato e concluso ---- */
    cap('g-mis', 'Quota pagata per missione', (h) => G.colonne(h, { voci: MIS.map((m) => ({ nome: m, val: it.mis[m][2] / it.mis[m][1], sub: NOMI_MIS[m] })), formatta: (v) => pc(v), conTip, nome: 'Quota pagata per missione', soglia: it.pag / fin, sogliaNome: 'media ' + pc(it.pag / fin) }), { sub: 'pagato ÷ finanziato' });
    cap('g-mis', 'Quota di importo concluso per missione', (h) => G.colonne(h, { voci: MIS.map((m) => ({ nome: m, val: it.mis[m][5] / it.mis[m][1], sub: `${nf(it.mis[m][4])} progetti conclusi su ${nf(it.mis[m][0])}`, col: '--s3' })), formatta: (v) => pc(v), conTip, nome: 'Quota conclusa per missione', soglia: conc / fin, sogliaNome: 'media ' + pc(conc / fin) }), { sub: 'concluso ÷ finanziato' });

    /* ---- 4 regioni, con selettore ---- */
    const METR = {
      pc: { n: 'Euro per abitante', f: (r) => r.fin / r.pop, fmt: (v) => nf(v) + ' €', rif: fin / it.pop },
      fin: { n: 'Importo totale', f: (r) => r.fin, fmt: eur, rif: null },
      pag: { n: 'Quota pagata', f: (r) => r.pag / r.fin, fmt: (v) => pc(v), rif: it.pag / fin },
      conc: { n: 'Quota di importo concluso', f: (r) => r.fs[4] / r.fin, fmt: (v) => pc(v), rif: conc / fin },
      rit: { n: 'Quota in ritardo', f: (r) => r.rit[1] / r.fin, fmt: (v) => pc(v, 1), rif: it.rit[1] / fin },
    };
    const selReg = el('sel-metrica'), boxReg = el('g-reg');
    Object.entries(METR).forEach(([k, m]) => selReg.append(H('option', { value: k, text: m.n })));
    const disegnaReg = () => {
      const m = METR[selReg.value]; boxReg.replaceChildren();
      const voci = regs.map((r) => ({ nome: r.nome, sub: r.rip, val: m.f(r), col: RIP[r.rip], righe: [['Finanziato', eur(r.fin)], ['Abitanti', nf(r.pop)]] })).sort((a, b) => b.val - a.val);
      G.barre(boxReg, { voci, formatta: m.fmt, conTip, riferimento: m.rif, rifNome: 'Italia', nome: m.n + ' per regione' });
    };
    selReg.addEventListener('change', disegnaReg); disegnaReg();
    el('leg-rip').append(...Object.entries(RIP).map(([n, c]) => H('span', {}, [H('i', { style: `background:var(${c})` }), n])));

    /* ---- 5 Mezzogiorno ---- */
    cap('g-sud', 'Quota del Mezzogiorno per missione', (h) => {
      const voci = MIS.map((m) => { const s = sud.reduce((t, r) => t + (r.mis[m]?.[1] || 0), 0), t = regs.reduce((x, r) => x + (r.mis[m]?.[1] || 0), 0); return { nome: m, val: s / t, sub: `${NOMI_MIS[m]} · ${eur(s)} su ${eur(t)}`, col: '--c4' }; });
      voci.push({ nome: 'Totale', val: sudFin / regFin, sub: 'tutte le missioni', col: '--s7' });
      G.colonne(h, { voci, formatta: (v) => pc(v), conTip, nome: 'Quota Mezzogiorno', soglia: 0.4, sogliaNome: 'soglia 40%' });
    }, { sub: 'Sud + Isole, sui fondi localizzati in una regione', nota: `Il Mezzogiorno ha il ${pc(sudPop / popTot, 1)} della popolazione. La soglia del 40% vale per il PNRR nel suo complesso; qui è mostrata a titolo di confronto per ogni missione.` });

    /* ---- 6 calore regioni × missioni ---- */
    const righe = regs.slice().sort((a, b) => (a.rip === b.rip ? a.nome.localeCompare(b.nome) : Object.keys(RIP).indexOf(a.rip) - Object.keys(RIP).indexOf(b.rip))).map((r) => ({ id: r.id, nome: r.nome }));
    const valori = (f) => { const o = {}; regs.forEach((r) => { o[r.id] = f(r); }); return o; };
    cap('g-calore', 'Quota di importo concluso, regione per missione', (h) => G.calore(h, {
      righe, capo: 'Regione',
      colonne: MIS.map((m) => ({ nome: m, sub: 'concluso', valori: valori((r) => (r.mis[m]?.[1] > 0 ? r.mis[m][5] / r.mis[m][1] : null)), formatta: (v) => pc(v) }))
        .concat([{ nome: 'Tutte', sub: 'concluso', valori: valori((r) => r.fs[4] / r.fin), formatta: (v) => pc(v) }, { nome: 'Pagato', sub: 'tutte', valori: valori((r) => r.pag / r.fin), formatta: (v) => pc(v) }]),
    }), { largo: true, nota: 'Il colore va dal più basso al più alto di ciascuna colonna (scala propria): serve a confrontare le regioni, non le missioni tra loro.' });

    /* ---- 7 comuni: fasce demografiche ---- */
    const FASCE = [['< 1.000', 0, 1e3], ['1–5 mila', 1e3, 5e3], ['5–20 mila', 5e3, 2e4], ['20–100 mila', 2e4, 1e5], ['> 100 mila', 1e5, 1e12]];
    const perFascia = FASCE.map(([n, a, b]) => { const c = C.filter((x) => x.pop >= a && x.pop < b); const f = c.reduce((s, x) => s + x.fin, 0); return { n, c, f, pop: c.reduce((s, x) => s + x.pop, 0), med: mediana(c.filter((x) => x.pc != null).map((x) => x.pc)), pag: f ? c.reduce((s, x) => s + x.pag, 0) / f : 0, cn: f ? c.reduce((s, x) => s + x.conc, 0) / f : 0 }; });
    cap('g-comuni', 'Euro per abitante, mediana per fascia di popolazione', (h) => G.colonne(h, { voci: perFascia.map((x) => ({ nome: x.n, sub: `${nf(x.c.length)} comuni · ${eur(x.f)}`, val: x.med, sotto: nf(x.c.length) + ' comuni', col: '--s4' })), formatta: (v) => nf(v) + ' €', conTip, nome: 'Mediana euro per abitante per fascia' }), { sub: 'comuni, solo importi localizzati al comune' });
    cap('g-comuni', 'Quota pagata per fascia di popolazione', (h) => G.colonne(h, { voci: perFascia.flatMap((x) => [{ nome: x.n, val: x.pag, sub: 'quota pagata', col: '--s5' }]), formatta: (v) => pc(v), conTip, nome: 'Quota pagata per fascia' }), { sub: 'pagato ÷ finanziato, per fascia' });

    /* ---- 8 dispersione ---- */
    const punti = C.filter((c) => c.pc > 0 && c.pop > 0).map((c) => ({ x: c.pop, y: c.pc, g: Object.keys(RIP).indexOf(regs.find((r) => r.id === c.rg)?.rip) }));
    const bin = []; for (let e = 2; e < 6.4; e += 0.5) { const v = C.filter((c) => c.pc > 0 && c.pop >= 10 ** e && c.pop < 10 ** (e + 0.5)).map((c) => c.pc); if (v.length >= 5) bin.push({ x: 10 ** (e + 0.25), y: mediana(v) }); }
    cap('g-disp', 'Ogni comune: popolazione e fondi per abitante', (h) => G.dispersione(h, {
      punti, mediane: bin, nome: 'Dispersione comuni', xNome: 'abitanti (scala logaritmica)', yNome: '€ per abitante (log)',
      xFmt: (v) => (v >= 1e3 ? nf(v / 1e3) + ' mila' : nf(v)), yFmt: (v) => nf(v) + ' €',
      gruppi: Object.entries(RIP).map(([nome, col]) => ({ nome, col })),
    }), { largo: true, sub: `${nf(punti.length)} comuni con progetti`, nota: 'I piccoli comuni stanno molto sopra e molto sotto la mediana: bastano pochi progetti per spostare il valore per abitante.' });

    /* ---- 9 concentrazione ---- */
    cap('g-conc', 'Quanto sono diseguali i comuni', (h) => G.lorenz(h, {
      curva: lor.filter((_, i) => i % Math.ceil(lor.length / 400) === 0 || i === lor.length - 1), xNome: 'quota di comuni (dal meno al più finanziato)', yNome: 'quota cumulata dei fondi', conTip,
      evidenzia: [{ x: 0.9, y: lor[Math.floor(0.9 * ord.length)][1], titolo: 'Il 90% dei comuni più piccoli per importo', testo: `riceve il ${pc(1 - top10)} dei fondi` }],
    }), { sub: `curva di Lorenz · Gini ${nf(gini, 2)}`, nota: `Più la curva si allontana dalla diagonale, più i fondi sono concentrati. Il 10% dei comuni con più fondi ne riceve il ${pc(top10)}.` });
    cap('g-conc', 'Chi riceve di più: i soggetti attuatori', (h) => G.barre(h, { voci: it.conc.top.map(([n, v, k]) => ({ nome: n.replace(/\s+-\s*$/, '').replace(/^\(|\)$/g, '').toLowerCase().replace(/^./, (c) => c.toUpperCase()), sub: nf(k) + ' progetti', val: v, col: '--s5' })), formatta: eur, conTip, nome: 'Primi cinque soggetti' }), { sub: `primi 5 = ${pc(it.conc.top5, 0)} del totale · HHI ${nf(it.conc.hhi, 3)}`, nota: 'Nomi troncati dalla fonte.' });

    /* ---- 10 province ---- */
    const pp = provs.filter((p) => p.pop > 0).map((p) => ({ nome: `${p.nome} (${p.sigla})`, sub: reg[p.reg]?.nome, val: p.fin / p.pop, col: RIP[reg[p.reg]?.rip] }));
    pp.sort((a, b) => b.val - a.val);
    cap('g-prov', 'Le 12 province con più fondi per abitante', (h) => G.barre(h, { voci: pp.slice(0, 12), formatta: (v) => nf(v) + ' €', conTip, riferimento: fin / it.pop, nome: 'Province in testa' }));
    cap('g-prov', 'Le 12 province con meno fondi per abitante', (h) => G.barre(h, { voci: pp.slice(-12), formatta: (v) => nf(v) + ' €', conTip, riferimento: fin / it.pop, nome: 'Province in coda' }), { nota: 'La tacca verticale è la media italiana. Gli importi assegnati a più province o a una regione intera non sono attribuiti a nessuna provincia.' });

    /* ---- 11 ritardi per provincia ---- */
    el('leg-rip2').append(...Object.entries(RIP).map(([n, c]) => H('span', {}, [H('i', { style: `background:var(${c})` }), n])));
    const vp = (f) => provs.filter((p) => p.fin > 0 && p.rit).map((p) => ({ nome: `${p.nome} (${p.sigla})`, sub: reg[p.reg]?.nome, val: f(p), col: RIP[reg[p.reg]?.rip], righe: [['Progetti in ritardo', nf(p.rit[0])], ['Importo in ritardo', eur(p.rit[1])], ['Finanziato', eur(p.fin)]] })).sort((a, b) => b.val - a.val);
    const rit = vp((p) => p.rit[1] / p.fin);
    cap('g-rit', 'Le 15 province con più importo in ritardo', (h) => G.barre(h, { voci: rit.slice(0, 15), formatta: (v) => pc(v, 1), conTip, riferimento: it.rit[1] / fin, rifNome: 'Italia', nome: 'Province con più ritardo' }), { sub: 'importo in ritardo ÷ finanziato · tacca = Italia', nota: 'La quota dipende dalla data di estrazione (13/06/2026): non dice chi sia in ritardo oggi.' });
    cap('g-rit', 'Le 15 province con meno importo in ritardo', (h) => G.barre(h, { voci: rit.slice(-15), formatta: (v) => pc(v, 1), conTip, riferimento: it.rit[1] / fin, rifNome: 'Italia', nome: 'Province con meno ritardo' }), { sub: 'importo in ritardo ÷ finanziato · tacca = Italia', nota: `Mediana delle province: ${pc(mediana(rit.map((x) => x.val)), 1)}. Pochi grandi progetti possono spostare molto la quota di una provincia piccola. La quota dipende dalla data di estrazione (13/06/2026): non dice chi sia in ritardo oggi.` });
    const icc = vp((p) => p.icc[1] / p.fin);
    cap('g-icc', 'Chiusura da formalizzare: le 15 province con la quota più alta', (h) => G.barre(h, { voci: icc.slice(0, 15).map((x) => ({ ...x, righe: [] })), formatta: (v) => pc(v, 1), conTip, riferimento: it.icc[1] / fin, rifNome: 'Italia', nome: 'Iter concluso ma stato in corso' }), { largo: true, sub: 'iter concluso ma stato ancora «in corso» ÷ finanziato · tacca = Italia', nota: 'Questi progetti hanno finito l’iter ma non risultano «Concluso» in ReGiS: non sono contati come conclusi. Il dato dipende dalla data di estrazione (13/06/2026).' });
  }).catch((e) => { el('caric').textContent = 'Errore di caricamento dei dati: ' + e.message; });
})();
