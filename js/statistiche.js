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
    nodo.addEventListener('focus', () => { if (!nodo.matches(':focus-visible')) return; const b = nodo.getBoundingClientRect(); mostra(b.left + b.width / 2, b.top + b.height / 2); });
    nodo.addEventListener('blur', () => { tip.hidden = true; });
    nodo.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') tip.hidden = true; });
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape') tip.hidden = true; }); addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
  const cap = (id, titolo, corpo, opz = {}) => {
    const s = H('figure', { class: 'grafico' + (opz.largo ? ' largo' : '') }, [H('figcaption', {}, [H('b', { text: titolo }), opz.sub ? H('small', { text: opz.sub }) : null])]);
    el(id).append(s); corpo(s); if (opz.nota) s.append(H('p', { class: 'grafico-nota', text: opz.nota })); return s;
  };

  const get = (u) => fetch(u + "?d=2").then((r) => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });

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

    el('sintesi').append(H('ul', {}, [
      `Le regioni del Mezzogiorno (Sud e Isole) hanno il ${pc(sudFin / regFin, 1)} dei fondi localizzati in una regione, con il ${pc(sudPop / popTot, 1)} degli abitanti: ${(sudFin / regFin) >= 0.4 ? 'sopra' : 'sotto'} la soglia del 40% prevista per il PNRR.`,
      `Tra i comuni la distribuzione è molto diseguale: il 10% dei comuni riceve il ${pc(top10)} dei fondi assegnati ai comuni, l'1% ne riceve il ${pc(top1)} (indice di Gini ${nf(gini, 2)}). Dipende molto dalle grandi opere e dalla dimensione demografica.`,
      `Solo il ${pc(it.liv[0] / fin, 1)} dell'importo è localizzato a livello di comune; il resto è assegnato a provincia, regione o Italia intera (${pc(it.liv[3] / fin, 1)}): i grafici sui comuni non coprono tutto il PNRR.`,
    ].map((t) => H('li', { text: t }))));

    const MIS = Object.keys(it.mis).sort();
    /* i grafici sono filtri: un clic apre la mappa dell'atlante già filtrata (stesso indirizzo, stessi filtri) */
    const mappa = (hash) => { location.href = 'index.html#/' + hash; };
    /* ---- Mezzogiorno ---- */
    cap('g-sud', 'Quota del Mezzogiorno per missione', (h) => {
      const voci = MIS.map((m) => { const s = sud.reduce((t, r) => t + (r.mis[m]?.[1] || 0), 0), t = regs.reduce((x, r) => x + (r.mis[m]?.[1] || 0), 0); return { nome: m, id: m, val: s / t, sub: `${NOMI_MIS[m]} · ${eur(s)} su ${eur(t)}`, col: '--c4' }; });
      voci.push({ nome: 'Totale', val: sudFin / regFin, sub: 'tutte le missioni', col: '--s7' });
      G.colonne(h, { voci, clic: (x) => mappa('?m=' + x.id), formatta: (v) => pc(v), conTip, nome: 'Quota Mezzogiorno', soglia: 0.4, sogliaNome: 'soglia 40%' });
    }, { sub: 'Sud + Isole, sui fondi localizzati in una regione', nota: `Il Mezzogiorno ha il ${pc(sudPop / popTot, 1)} della popolazione. La soglia del 40% vale per il PNRR nel suo complesso; qui è mostrata a titolo di confronto per ogni missione.` });

    /* ---- 6 calore regioni × missioni ---- */
    const righe = regs.slice().sort((a, b) => (a.rip === b.rip ? a.nome.localeCompare(b.nome) : Object.keys(RIP).indexOf(a.rip) - Object.keys(RIP).indexOf(b.rip))).map((r) => ({ id: r.id, nome: r.nome }));
    const valori = (f) => { const o = {}; regs.forEach((r) => { o[r.id] = f(r); }); return o; };
    cap('g-calore', 'Quota di importo concluso, regione per missione', (h) => G.calore(h, {
      righe, capo: 'Regione', apri: (r) => 'index.html#/r/' + r.id, cella: (r, c) => mappa('r/' + r.id + '?m=' + c.id),
      colonne: MIS.map((m) => ({ nome: m, id: m, sub: 'concluso', valori: valori((r) => (r.mis[m]?.[1] > 0 ? r.mis[m][5] / r.mis[m][1] : null)), formatta: (v) => pc(v) }))
        .concat([{ nome: 'Tutte', sub: 'concluso', valori: valori((r) => r.fs[4] / r.fin), formatta: (v) => pc(v) }, { nome: 'Pagato', sub: 'tutte', valori: valori((r) => r.pag / r.fin), formatta: (v) => pc(v) }]),
    }), { largo: true, nota: 'Il colore va dal più basso al più alto di ciascuna colonna (scala propria): serve a confrontare le regioni, non le missioni tra loro.' });

    /* ---- per componente (Missione > Componente): stessi due grafici, un livello più in basso ---- */
    const COMP = Object.keys(it.comp).sort(), nomeC = (c) => meta.nomi[c] || c;
    cap('g-sud-comp', 'Quota del Mezzogiorno per componente', (h) => {
      const voci = COMP.map((c) => { const s = sud.reduce((t, r) => t + (r.comp[c]?.[1] || 0), 0), t = regs.reduce((x, r) => x + (r.comp[c]?.[1] || 0), 0); return { nome: c, id: c, val: t > 0 ? s / t : 0, sub: `${nomeC(c)} · ${eur(s)} su ${eur(t)}`, col: '--c4' }; });
      voci.push({ nome: 'Totale', val: sudFin / regFin, sub: 'tutti i componenti', col: '--s7' });
      G.colonne(h, { voci, clic: (x) => mappa('?c=' + x.id), formatta: (v) => pc(v), conTip, nome: 'Quota Mezzogiorno per componente', soglia: 0.4, sogliaNome: 'soglia 40%' });
    }, { sub: 'Sud + Isole, sui fondi localizzati in una regione', nota: 'Ogni componente è una parte di una missione (M1C2 = missione 1, componente 2). La soglia del 40% vale per il PNRR nel suo complesso.' });
    cap('g-calore-comp', 'Quota di importo concluso, regione per componente', (h) => G.calore(h, {
      righe, capo: 'Regione', apri: (r) => 'index.html#/r/' + r.id, cella: (r, c) => mappa('r/' + r.id + '?c=' + c.id),
      colonne: COMP.map((c) => ({ nome: c, id: c, sub: 'concluso', valori: valori((r) => (r.comp[c]?.[1] > 0 ? r.comp[c][5] / r.comp[c][1] : null)), formatta: (v) => pc(v) })),
    }), { largo: true, nota: 'Il colore va dal più basso al più alto di ciascuna colonna (scala propria): serve a confrontare le regioni, non i componenti tra loro. Celle vuote: nessun progetto del componente in quella regione.' });

    /* ---- 9 concentrazione ---- */
    cap('g-conc', 'Quanto sono diseguali i comuni', (h) => G.lorenz(h, {
      curva: lor.filter((_, i) => i % Math.ceil(lor.length / 400) === 0 || i === lor.length - 1), xNome: 'quota di comuni (dal meno al più finanziato)', yNome: 'quota cumulata dei fondi', conTip,
      evidenzia: [{ x: 0.9, y: lor[Math.floor(0.9 * ord.length)][1], titolo: 'Il 90% dei comuni più piccoli per importo', testo: `riceve il ${pc(1 - top10)} dei fondi` }],
    }), { sub: `curva di Lorenz · Gini ${nf(gini, 2)}`, nota: `Più la curva si allontana dalla diagonale, più i fondi sono concentrati. Il 10% dei comuni con più fondi ne riceve il ${pc(top10)}.` });
    cap('g-conc', 'Chi riceve di più: i soggetti attuatori', (h) => G.barre(h, { voci: it.conc.top.map(([n, v, k]) => ({ nome: n.replace(/\s+-\s*$/, '').replace(/^\(|\)$/g, '').toLowerCase().replace(/^./, (c) => c.toUpperCase()), sub: nf(k) + ' progetti', val: v, col: '--s5' })), formatta: eur, conTip, nome: 'Primi cinque soggetti' }), { sub: `primi 5 = ${pc(it.conc.top5, 0)} del totale · HHI ${nf(it.conc.hhi, 3)}`, nota: 'Nomi troncati dalla fonte.' });

    /* ---- 11 ritardi per provincia ---- */
    el('leg-rip2').append(...Object.entries(RIP).map(([n, c]) => H('span', {}, [H('i', { style: `background:var(${c})` }), n])));
    const vp = (f) => provs.filter((p) => p.fin > 0 && p.rit).map((p) => ({ id: p.id, nome: `${p.nome} (${p.sigla})`, sub: reg[p.reg]?.nome, val: f(p), col: RIP[reg[p.reg]?.rip], righe: [['Progetti in ritardo', nf(p.rit[0])], ['Importo in ritardo', eur(p.rit[1])], ['Finanziato', eur(p.fin)]] })).sort((a, b) => b.val - a.val);
    const rit = vp((p) => p.rit[1] / p.fin);
    cap('g-rit', 'Le 15 province con più importo in ritardo', (h) => G.barre(h, { voci: rit.slice(0, 15), apri: (x) => mappa('p/' + x.id), formatta: (v) => pc(v, 1), conTip, riferimento: it.rit[1] / fin, rifNome: 'Italia', nome: 'Province con più ritardo' }), { sub: 'importo in ritardo ÷ finanziato · tacca = Italia', nota: 'La quota dipende dalla data di estrazione (13/06/2026): non dice chi sia in ritardo oggi.' });
    cap('g-rit', 'Le 15 province con meno importo in ritardo', (h) => G.barre(h, { voci: rit.slice(-15), apri: (x) => mappa('p/' + x.id), formatta: (v) => pc(v, 1), conTip, riferimento: it.rit[1] / fin, rifNome: 'Italia', nome: 'Province con meno ritardo' }), { sub: 'importo in ritardo ÷ finanziato · tacca = Italia', nota: `Mediana delle province: ${pc(mediana(rit.map((x) => x.val)), 1)}. Pochi grandi progetti possono spostare molto la quota di una provincia piccola. La quota dipende dalla data di estrazione (13/06/2026): non dice chi sia in ritardo oggi.` });
    const icc = vp((p) => p.icc[1] / p.fin);
    cap('g-icc', 'Chiusura da formalizzare: le 15 province con la quota più alta', (h) => G.barre(h, { voci: icc.slice(0, 15).map((x) => ({ ...x, righe: [] })), apri: (x) => mappa('p/' + x.id), formatta: (v) => pc(v, 1), conTip, riferimento: it.icc[1] / fin, rifNome: 'Italia', nome: 'Iter concluso ma stato in corso' }), { largo: true, sub: 'iter concluso ma stato ancora «in corso» ÷ finanziato · tacca = Italia', nota: 'Questi progetti hanno finito l’iter ma non risultano «Concluso» in ReGiS: non sono contati come conclusi. Il dato dipende dalla data di estrazione (13/06/2026).' });
  }).catch((e) => { el('caric').textContent = 'Errore di caricamento dei dati: ' + e.message; });
})();
