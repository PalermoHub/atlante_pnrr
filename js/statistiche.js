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

    /* ---- dotazione ufficiale per componente: quanto è su progetti e quanto è stato pagato ---- */
    const dotC = {}; Object.entries(meta.dot).forEach(([k, v]) => { const c = k.slice(0, 4); dotC[c] = (dotC[c] || 0) + v; });
    const CD = COMP.filter((c) => dotC[c] > 0);
    const dotTot = CD.reduce((s, c) => s + dotC[c], 0), finTot = CD.reduce((s, c) => s + it.comp[c][1], 0), pagTot = CD.reduce((s, c) => s + it.comp[c][2], 0);
    cap('g-dot', 'Quanta dotazione è già su progetti, per componente', (h) => {
      const voci = CD.map((c) => ({ nome: c, id: c, val: it.comp[c][1] / dotC[c], sub: `${nomeC(c)} · progetti ${eur(it.comp[c][1])} su una dotazione di ${eur(dotC[c])}`, col: '--c2' }));
      voci.push({ nome: 'Totale', val: finTot / dotTot, sub: 'tutti i componenti', col: '--s7' });
      G.colonne(h, { voci, clic: (x) => x.id && mappa('?c=' + x.id), formatta: (v) => pc(v), conTip, nome: 'Progetti sulla dotazione, per componente', soglia: 1, sogliaNome: 'dotazione = 100%' });
    }, { sub: 'finanziamento dei progetti ÷ dotazione ufficiale', nota: 'Sopra il 100% i progetti superano la dotazione della componente (cofinanziamenti o spostamenti di fondi: i dati non lo spiegano). Sotto, la differenza è denaro che nei dati non ha ancora un progetto. Dotazione: «Spesa per misura» al ' + meta.spesa_misura + '.' });
    cap('g-dot', 'Quanta dotazione è già stata pagata, per componente', (h) => {
      const voci = CD.map((c) => ({ nome: c, id: c, val: it.comp[c][2] / dotC[c], sub: `${nomeC(c)} · pagato ${eur(it.comp[c][2])} su ${eur(dotC[c])}`, col: '--c4' }));
      voci.push({ nome: 'Totale', val: pagTot / dotTot, sub: 'tutti i componenti', col: '--s7' });
      G.colonne(h, { voci, clic: (x) => x.id && mappa('?c=' + x.id), formatta: (v) => pc(v), conTip, nome: 'Pagato sulla dotazione, per componente' });
    }, { sub: 'pagato ÷ dotazione ufficiale', nota: 'Il pagato è quello dei progetti registrati al ' + meta.estrazione + '; la quota è calcolata sulla dotazione, non sul finanziato, quindi include il denaro ancora senza progetto.' });

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

    /* ---- giovani 0-24: dati ricalcolati da scrpits/giovani.py (data/giovani.json) ---- */
    get('data/giovani.json').then((gio) => {
      const rip = (id) => reg[com[id]?.rg]?.rip;
      /* colonne di data/giovani.json: 0 giovani 2024, 1 abitanti 2024, 2/3 euro stretti/larghi, 4 altre misure,
         5 pagato stretto, 6-8 stretti per asilo/scuola/università, 9-11 giovani per fascia,
         12/13 giovani e abitanti 2022, 14-16 pagato per fascia, 17/18 finanziato e pagato dei progetti conclusi.
         Le colonne nuove si aggiungono solo in coda: gli indici qui sopra non vanno spostati. */
      const nuovo = () => ({ n: 0, g: 0, tot: 0, ad: 0, s: 0, l: 0, altri: 0, pag: 0, zl: 0, a: 0, sc: 0, u: 0, g05: 0, g618: 0, g1924: 0, g22: 0, t22: 0, ap: 0, scp: 0, up: 0, conc: 0, concp: 0 });
      const add = (t, r) => { t.n++; t.g += r[0]; t.tot += r[1]; t.ad += r[1] - r[0]; t.s += r[2]; t.l += r[3]; t.altri += r[4]; t.pag += r[5]; t.a += r[6]; t.sc += r[7]; t.u += r[8]; t.g05 += r[9]; t.g618 += r[10]; t.g1924 += r[11]; t.g22 += r[12] || 0; t.t22 += r[13] || 0; t.ap += r[14] || 0; t.scp += r[15] || 0; t.up += r[16] || 0; t.conc += r[17] || 0; t.concp += r[18] || 0; if (r[3] === 0) t.zl++; };
      const R = {}, D = {}, T = nuovo(), V = {}, TV = nuovo(); const CG = [];
      const DIM = [['meno di 1.000', 0, 1e3], ['1.000-5.000', 1e3, 5e3], ['5.000-20.000', 5e3, 2e4], ['20.000-100.000', 2e4, 1e5], ['oltre 100.000', 1e5, 1e12]];
      for (const [id, r] of Object.entries(gio.c)) {
        const k = rip(id); if (!k) continue; CG.push([id, r]); add(R[k] = R[k] || nuovo(), r); add(T, r);
        const d = DIM.findIndex(([, a, b]) => r[1] >= a && r[1] < b); add(D[d] = D[d] || nuovo(), r);
        /* confronto 2022-2024: solo i comuni che nel 2022 esistevano già (sei sono nati dopo) */
        if (r[12] > 0) { add(V[k] = V[k] || nuovo(), r); add(TV, r); }
      }
      const e = (x, y) => (y > 0 ? x / y : 0), E = (v) => nf(Math.round(v)) + ' €', X = (v) => nf(v, 2) + '×';
      const var0 = (a, b) => (a > 0 ? 100 * (b - a) / a : 0), SGN = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), 1) + '%';
      const calo = (t) => (t.g22 > 0 ? 1000 * (t.g22 - t.g) / t.g22 : 0);
      const ordRip = Object.keys(RIP).filter((k) => R[k]);
      /* comuni con almeno 50 residenti 0-24: sotto quella soglia un solo progetto produce valori enormi (fino a maxEG) */
      const EG = CG.filter(([, r]) => r[0] >= 50).map(([, r]) => r[2] / r[0]).sort((a, b) => a - b);
      const sommaEG = EG.reduce((s, v) => s + v, 0) || 1;
      let cum = 0, giniEG = 0, prec = 0;
      EG.forEach((v, i) => { cum += v; const q0 = i / EG.length, q1 = (i + 1) / EG.length; giniEG += (q1 - q0) * (cum / sommaEG + prec); prec = cum / sommaEG; });
      giniEG = 1 - giniEG;
      const taglio = EG.length - Math.floor(0.1 * EG.length);
      const top10EG = EG.slice(taglio).reduce((s, v) => s + v, 0) / sommaEG, metaEG = EG.slice(0, Math.floor(EG.length / 2)).reduce((s, v) => s + v, 0) / sommaEG;
      const lorEG = [[0, 0]]; { let c2 = 0; EG.forEach((v, i) => { c2 += v; if (i % Math.max(1, Math.ceil(EG.length / 300)) === 0 || i === EG.length - 1) lorEG.push([(i + 1) / EG.length, c2 / sommaEG]); }); }
      const maxEG = CG.reduce((m, [, r]) => Math.max(m, r[0] >= 50 ? r[2] / r[0] : 0), 0);
      const maxTuttiEG = CG.reduce((m, [, r]) => Math.max(m, r[0] > 0 ? r[2] / r[0] : 0), 0);
      cap('g-gio', 'Euro per giovane, per ripartizione', (h) => G.colonne(h, {
        voci: [...ordRip.map((k) => ({ nome: k, val: e(R[k].l, R[k].g), sotto: 'adulti ' + E(e(R[k].altri, R[k].ad)), sub: `senso stretto ${E(e(R[k].s, R[k].g))} · adulti ${E(e(R[k].altri, R[k].ad))}`, col: RIP[k] })),
               { nome: 'Italia', val: e(T.l, T.g), sotto: 'adulti ' + E(e(T.altri, T.ad)), sub: `senso stretto ${E(e(T.s, T.g))} · adulti ${E(e(T.altri, T.ad))}`, col: '--s7' }],
        formatta: E, conTip, nome: 'Euro per giovane, senso largo' }),
        { sub: 'misure per i giovani in senso largo, importi localizzati nei comuni', nota: 'Sotto ogni colonna: euro per adulto (25 anni e più) con tutte le altre misure. Passando alla definizione stretta i valori scendono, ma l\'ordine tra le ripartizioni non cambia.' });
      cap('g-gio', 'Il giovane riceve più dell\'adulto?', (h) => G.colonne(h, {
        voci: [...ordRip.map((k) => ({ nome: k, val: e(e(R[k].l, R[k].g), e(R[k].altri, R[k].ad)), sotto: 'larga', sub: `euro per giovane ${E(e(R[k].l, R[k].g))} su euro per adulto ${E(e(R[k].altri, R[k].ad))}`, col: RIP[k] })),
               ...ordRip.map((k) => ({ nome: k, val: e(e(R[k].s, R[k].g), e(R[k].altri, R[k].ad)), sotto: 'stretta', sub: `euro per giovane ${E(e(R[k].s, R[k].g))} su euro per adulto ${E(e(R[k].altri, R[k].ad))}`, col: '--s5' }))],
        formatta: X, conTip, nome: 'Rapporto euro per giovane su euro per adulto', soglia: 1, sogliaNome: 'parità' }),
        { sub: 'sopra la linea il giovane riceve più dell\'adulto', nota: 'Con la definizione stretta (le ultime cinque colonne) solo il Sud sta sopra la parità; con quella larga si aggiungono Centro e Isole, mentre il Nord resta in parità o sotto. La risposta dipende da cosa si conta come «misura per i giovani».' });
      cap('g-gio', 'Il peso della dimensione del comune', (h) => G.colonne(h, {
        voci: DIM.map(([n], i) => ({ nome: n, val: e(D[i]?.l || 0, D[i]?.g || 0), sotto: nf(100 * e(D[i]?.zl || 0, D[i]?.n || 0), 0) + '% senza', sub: `${nf(D[i]?.n || 0)} comuni · ${nf(100 * e(D[i]?.zl || 0, D[i]?.n || 0), 1)}% senza alcun progetto per i giovani · adulti ${E(e(D[i]?.altri || 0, D[i]?.ad || 0))}`, col: '--c1' })),
        formatta: E, conTip, nome: 'Euro per giovane per dimensione del comune' }),
        { sub: 'abitanti del comune; sotto: quota di comuni senza alcun progetto', nota: 'Nei comuni piccoli la media nasconde molti zeri: l\'importo si concentra dove c\'è una scuola, un asilo o un ITS.' });
      cap('g-gio', 'Per fascia d\'età', (h) => G.colonne(h, {
        voci: [['0-5 anni', 'asili', T.a, T.g05], ['6-18 anni', 'scuola', T.sc, T.g618], ['19-24 anni', 'università e lavoro', T.u, T.g1924]].map(([n, s, v, p]) => ({ nome: n, val: e(v, p), sotto: s, sub: `${eur(v)} su ${nf(p)} residenti`, col: '--c3' })),
        formatta: E, conTip, nome: 'Euro per giovane per fascia d\'età, senso stretto' }),
        { sub: 'misure in senso stretto, sui residenti di ciascuna fascia', nota: 'Università e ITS servono bacini più larghi del comune: nei comuni sede il valore per giovane residente è sovrastimato, altrove sottostimato.' });
      cap('g-gio', 'I giovani calano, e i comuni piccoli ne perdono di più', (h) => G.barre(h, {
        voci: [...ordRip.map((k) => ({ nome: k, val: calo(V[k]), col: RIP[k], sub: `da ${nf(V[k].g22)} a ${nf(V[k].g)} (${SGN(var0(V[k].g22, V[k].g))})`, righe: [['Residenti di tutte le età', SGN(var0(V[k].t22, V[k].tot))]] })),
               { nome: 'Italia', val: calo(TV), col: '--s7', sub: `da ${nf(TV.g22)} a ${nf(TV.g)} (${SGN(var0(TV.g22, TV.g))})`, righe: [['Residenti di tutte le età', SGN(var0(TV.t22, TV.tot))]] }],
        formatta: (v) => nf(Math.round(v)) + ' per 1.000', conTip, nome: 'Giovani 0-24 in meno ogni 1.000 dal 2022 al 2024' }),
        { sub: 'residenti 0-24 nel 2022 (anno dei bandi PNRR) e nel 2024', nota: `In Italia i residenti 0-24 sono passati da ${nf(TV.g22)} a ${nf(TV.g)} (${SGN(var0(TV.g22, TV.g))}), mentre i residenti di tutte le età sono ${SGN(var0(TV.t22, TV.tot))}. Il calo è più forte al Sud e nelle Isole. Popolazione ISTAT al 1° gennaio, singole età; sei comuni nati dopo il 2022 restano fuori dal confronto.` });
      cap('g-gio', 'La perdita di giovani per dimensione del comune', (h) => G.barre(h, {
        voci: DIM.map(([n], i) => ({ nome: n, val: D[i] ? calo(D[i]) : 0, col: '--c1', sub: D[i] ? `da ${nf(D[i].g22)} a ${nf(D[i].g)} (${SGN(var0(D[i].g22, D[i].g))})` : '', righe: D[i] ? [['Residenti di tutte le età', SGN(var0(D[i].t22, D[i].tot))]] : [] })),
        formatta: (v) => nf(Math.round(v)) + ' per 1.000', conTip, nome: 'Giovani 0-24 in meno ogni 1.000, per dimensione del comune' }),
        { sub: 'abitanti del comune nel 2024 · per 1.000 residenti 0-24 del 2022', nota: 'I comuni sotto i 1.000 abitanti perdono più giovani di tutti gli altri, e sono anche quelli in cui calano di più i residenti di tutte le età. Nei comuni piccoli il denominatore è piccolo: pochi giovani in meno spostano molto la percentuale.' });
      cap('g-gio', 'Pagato contro assegnato, per ripartizione', (h) => G.colonne(h, {
        voci: [...ordRip.map((k) => ({ nome: k, val: e(R[k].pag, R[k].s), col: RIP[k], sub: `${eur(R[k].pag)} pagati su ${eur(R[k].s)} assegnati` })),
               { nome: 'Italia', val: e(T.pag, T.s), col: '--s7', sub: `${eur(T.pag)} pagati su ${eur(T.s)} assegnati` }],
        formatta: (v) => pc(v, 1), conTip, nome: 'Quota pagata delle misure per i giovani, per ripartizione' }),
        { sub: 'pagato ÷ assegnato, misure per i giovani in senso stretto', nota: `In Italia è stato pagato il ${pc(e(T.pag, T.s), 1)}. Il Nord-est è al ${pc(e(R['Nord-est'].pag, R['Nord-est'].s), 1)}, il Nord-ovest al ${pc(e(R['Nord-ovest'].pag, R['Nord-ovest'].s), 1)}; le Isole al ${pc(e(R['Isole'].pag, R['Isole'].s), 1)}. Come per il PNRR nel suo complesso, il pagato è più basso dove i progetti sono più indietro, non dove sono stati assegnati meno soldi.` });
      cap('g-gio', 'Pagato contro assegnato, per fascia d\'età', (h) => G.colonne(h, {
        voci: [['0-5 anni', 'asili', T.ap, T.a], ['6-18 anni', 'scuola', T.scp, T.sc], ['19-24 anni', 'università e lavoro', T.up, T.u]].map(([n, s, pg, f]) => ({ nome: n, val: e(pg, f), sotto: s, sub: `${eur(pg)} pagati su ${eur(f)} assegnati`, col: '--c3' })),
        formatta: (v) => pc(v, 1), conTip, nome: 'Quota pagata per fascia d\'età' }),
        { sub: 'misure in senso stretto, pagato ÷ assegnato', nota: `Le misure per i più piccoli sono le più avanti (${pc(e(T.ap, T.a), 1)}), quelle per i 19-24 anni le più indietro (${pc(e(T.up, T.u), 1)}): università, ITS e borse di studio pagano a stati di avanzamento più lenti degli asili.` });
      cap('g-gio', 'Progetti conclusi e progetti in corso', (h) => G.colonne(h, {
        voci: [{ nome: 'Conclusi', val: e(T.concp, T.conc), col: '--c2', sub: `${eur(T.concp)} pagati su ${eur(T.conc)} (stadio «concluso»)` },
               { nome: 'In corso', val: e(T.pag - T.concp, T.s - T.conc), col: '--c4', sub: `${eur(T.pag - T.concp)} pagati su ${eur(T.s - T.conc)} (tutti gli altri stadi)` }],
        formatta: (v) => pc(v, 1), conTip, nome: 'Quota pagata dei progetti conclusi e di quelli in corso' }),
        { sub: 'misure per i giovani in senso stretto · pagato ÷ assegnato', nota: `I progetti conclusi valgono ${eur(T.conc)} e risultano pagati all'${pc(e(T.concp, T.conc), 1)}; quelli in corso valgono ${eur(T.s - T.conc)} e sono pagati al ${pc(e(T.pag - T.concp, T.s - T.conc), 1)}. La differenza è normale: un progetto concluso ha finito di essere pagato, uno in corso no.` });
      cap('g-gio', 'Come si distribuiscono gli euro per giovane tra i comuni', (h) => G.lorenz(h, {
        curva: lorEG, xNome: 'comuni, dal meno al più finanziato per giovane', yNome: 'quota cumulata degli euro per giovane', conTip,
        evidenzia: [{ x: 0.9, y: 1 - top10EG, titolo: 'Il 90% dei comuni', testo: `riceve il ${pc(1 - top10EG, 1)} degli euro per giovane` }],
      }), { sub: `curva di Lorenz · Gini ${nf(giniEG, 2)} · comuni con almeno 50 residenti 0-24`, nota: `Il 10% dei comuni con più euro per giovane ne riceve il ${pc(top10EG, 1)}, mentre la metà dei comuni con meno euro ne riceve il ${pc(metaEG, 1)}. Un solo asilo o una sola scuola possono pesare molto in un comune piccolo.` });
      cap('g-gio', 'La mediana, comune per comune', (h) => G.colonne(h, {
        voci: DIM.map(([n], i) => {
          const vv = CG.filter(([, r]) => r[1] >= DIM[i][1] && r[1] < DIM[i][2] && r[0] >= 50);
          const media = e(vv.reduce((s, [, r]) => s + r[2], 0), vv.reduce((s, [, r]) => s + r[0], 0));
          return { nome: n, val: mediana(vv.map(([, r]) => r[2] / r[0])), col: '--c1', sub: `${nf(vv.length)} comuni · media ${E(media)}` };
        }),
        formatta: E, conTip, nome: 'Mediana degli euro per giovane, per dimensione del comune' }),
        { sub: 'metà dei comuni sta sopra, metà sotto · almeno 50 residenti 0-24', nota: `La media ponderata è più alta della mediana perché pochi comuni con un progetto grande tirano su il valore: ${E(e(T.s, T.g))} contro ${E(mediana(EG))} per giovane in Italia. Tra i comuni con almeno 50 residenti 0-24 il caso estremo arriva a ${E(maxEG)} per giovane; sotto quella soglia si arriva a ${E(maxTuttiEG)}, e per questo li teniamo fuori dal calcolo. Un progetto non basta a dire che i giovani di quel comune ricevano quei soldi.` });
    }).catch(() => {});
    /* ---- salute: Missione 6 del Piano, dati ricalcolati da scrpits/sanita.py (data/sanita.json) ---- */
    get('data/sanita.json').then((san) => {
      /* colonne di data/sanita.json: 0 abitanti, 1 residenti 65+, 2/3 finanziato e pagato M6,
         4/5 finanziato e pagato M6C1 (prossimità), 6 finanziato M6C2, 7/8 finanziato e pagato dei progetti conclusi,
         9 progetti, 10/11 finanziato e numero di Case della Comunità, 12/13 quota non attribuibile ai comuni. */
      const zero = () => ({ n: 0, pop: 0, o65: 0, fin: 0, pag: 0, c1: 0, c2: 0, conc: 0, concp: 0, nprog: 0, ncdc: 0, ncf: 0 });
      const add = (t, r) => { t.n++; t.pop += r[0]; t.o65 += r[1]; t.fin += r[2]; t.pag += r[3]; t.c1 += r[4]; t.c2 += r[6]; t.conc += r[7]; t.concp += r[8]; t.nprog += r[9]; t.ncdc += r[11]; t.ncf += r[12] || 0; };
      const RR = {}, T = zero();
      for (const [id, r] of Object.entries(san.r)) { const k = reg[id]?.rip; if (!k) continue; add(RR[k] = RR[k] || zero(), r); add(T, r); }
      const ordRip = Object.keys(RIP).filter((k) => RR[k]);
      const e = (x, y) => (y > 0 ? x / y : 0), E = (v) => nf(Math.round(v)) + ' €';
      /* comuni: solo la parte di Missione 6 localizzata nel comune */
      const CG = Object.entries(san.c).map(([id, r]) => ({ id, pop: r[0], o65: r[1], fin: r[2], pag: r[3], c1: r[4], ncdc: r[11] }));
      const totC = CG.reduce((s, c) => s + c.fin, 0), conProgetti = CG.filter((c) => c.fin > 0).length;
      const DIM = [['meno di 1.000', 0, 1e3], ['1.000-5.000', 1e3, 5e3], ['5.000-20.000', 5e3, 2e4], ['20.000-100.000', 2e4, 1e5], ['oltre 100.000', 1e5, 1e12]];
      const DD = DIM.map(() => ({ n: 0, pop: 0, fin: 0, con: 0 }));
      CG.forEach((c) => { const i = DIM.findIndex(([, a, b]) => c.pop >= a && c.pop < b); if (i < 0) return; const d = DD[i]; d.n++; d.pop += c.pop; d.fin += c.fin; if (c.fin > 0) d.con++; });
      /* concentrazione: comuni ordinati per importo della Missione 6 (gli 8 comuni su 10 a zero pesano) */
      const ord = CG.slice().sort((a, b) => a.fin - b.fin);
      let cum = 0; const lor = [[0, 0]];
      ord.forEach((c, i) => { cum += c.fin; lor.push([(i + 1) / ord.length, totC > 0 ? cum / totC : 0]); });
      let g = 0; for (let i = 1; i < lor.length; i++) g += (lor[i][0] - lor[i - 1][0]) * (lor[i][1] + lor[i - 1][1]);
      const gini = 1 - g, top10 = 1 - lor[Math.floor(0.9 * ord.length)][1], meta10 = lor[Math.floor(0.5 * ord.length)][1];
      /* il bisogno: comuni da 1.000 abitanti in su, divisi in quartili di residenti 65+ */
      const an = CG.filter((c) => c.pop >= 1000).map((c) => ({ o: c.o65 / c.pop, fin: c.fin, pop: c.pop, pag: c.pag }));
      an.sort((a, b) => a.o - b.o);
      const QQ = [0, 1, 2, 3].map((i) => an.slice(Math.floor(i * an.length / 4), Math.floor((i + 1) * an.length / 4)));
      const NOMI_Q = ['1° quartile · meno anziani', '2° quartile', '3° quartile', '4° quartile · più anziani'];
      cap('g-san', 'Euro per abitante, per ripartizione', (h) => G.colonne(h, {
        voci: [...ordRip.map((k) => ({ nome: k, val: e(RR[k].fin, RR[k].pop), col: RIP[k], sotto: 'pagato ' + pc(e(RR[k].pag, RR[k].fin)), sub: `${eur(RR[k].fin)} su ${nf(RR[k].pop)} abitanti · prossimità ${pc(e(RR[k].c1, RR[k].fin))} · ${eur(RR[k].fin / RR[k].pop)} per abitante` })),
               { nome: 'Italia', val: e(T.fin, T.pop), col: '--s7', sotto: 'pagato ' + pc(e(T.pag, T.fin)), sub: `${eur(T.fin)} su ${nf(T.pop)} abitanti · prossimità ${pc(e(T.c1, T.fin))}` }],
        formatta: E, conTip, nome: 'PNRR per la salute per abitante' }),
        { sub: 'Missione 6, importi attribuibili al territorio (comuni più quota regionale) · sotto: quota pagata', nota: `L'ordine è quasi l'opposto di quello dei giovani: qui il Sud e le Isole ricevono più per abitante del Nord-est (${E(e(RR.Sud.fin, RR.Sud.pop))} contro ${E(e(RR['Nord-est'].fin, RR['Nord-est'].pop))}). Pesano i ${eur(T.ncf)} attribuiti alle regioni e non a un singolo comune (fascicolo sanitario, telemedicina, assistenza domiciliare), che vanno in gran parte al Mezzogiorno e che nella scheda del comune non compaiono. Restano fuori da questo confronto i ${eur(san.i[2] - T.fin)} di progetti indicati a livello nazionale.` });
      cap('g-san', 'Quanta parte va alla sanità di prossimità', (h) => G.colonne(h, {
        voci: [...ordRip.map((k) => ({ nome: k, val: e(RR[k].c1, RR[k].fin), col: RIP[k], sub: `${eur(RR[k].c1)} per Case e Ospedali di Comunità, COT, assistenza domiciliare e telemedicina` })),
               { nome: 'Italia', val: e(T.c1, T.fin), col: '--s7', sub: `${eur(T.c1)} di sanità territoriale su ${eur(T.fin)}` }],
        formatta: (v) => pc(v, 1), conTip, nome: 'Quota della Missione 6 per la sanità di prossimità' }),
        { sub: 'M6C1 (territorio) sul totale della Missione 6', nota: `La Missione 6 è divisa in due: la componente 1 porta l'assistenza sul territorio (Case della Comunità, Ospedali di Comunità, centrali operative, assistenza domiciliare, telemedicina), la componente 2 resta su ospedali, grandi apparecchiature, fascicolo sanitario e ricerca. Il Nord-est destina alla prossimità ${pc(e(RR['Nord-est'].c1, RR['Nord-est'].fin), 1)} dei fondi, il Centro ${pc(e(RR.Centro.c1, RR.Centro.fin), 1)}.` });
      cap('g-san', 'Prossimità e ospedali: euro per abitante', (h) => G.colonne(h, {
        voci: [...ordRip.map((k) => ({ nome: k, val: e(RR[k].c1, RR[k].pop), col: RIP[k], sotto: 'prossimità', sub: `prossimità ${eur(RR[k].c1 / RR[k].pop)} per abitante` })),
               ...ordRip.map((k) => ({ nome: k, val: e(RR[k].c2, RR[k].pop), col: '--s5', sotto: 'ospedali', sub: `ospedali, innovazione e ricerca ${eur(RR[k].c2 / RR[k].pop)} per abitante` }))],
        formatta: E, conTip, nome: 'Euro per abitante: prossimità e ospedali' }),
        { sub: 'prima colonna: M6C1 territorio · seconda: M6C2 ospedali, innovazione, ricerca', nota: `Ogni ripartizione ha due colonne: la prima è la sanità di prossimità, la seconda ospedali, grandi apparecchiature, fascicolo sanitario e ricerca. Non sono soldi alternativi: sono due modi di spendere, e il rapporto fra i due cambia di regione in regione.` });
      cap('g-san', 'Pagato contro assegnato, per ripartizione', (h) => G.colonne(h, {
        voci: [...ordRip.map((k) => ({ nome: k, val: e(RR[k].pag, RR[k].fin), col: RIP[k], sub: `${eur(RR[k].pag)} pagati su ${eur(RR[k].fin)}` })),
               { nome: 'Italia', val: e(T.pag, T.fin), col: '--s7', sub: `${eur(T.pag)} pagati su ${eur(T.fin)}` }],
        formatta: (v) => pc(v, 1), conTip, nome: 'Quota pagata della Missione 6, per ripartizione' }),
        { sub: 'pagato ÷ assegnato, importi attribuibili al territorio', nota: `In Italia è stato pagato il ${pc(e(T.pag, T.fin), 1)} della Missione 6. Il divario è netto: Nord-ovest ${pc(e(RR['Nord-ovest'].pag, RR['Nord-ovest'].fin), 1)}, Nord-est ${pc(e(RR['Nord-est'].pag, RR['Nord-est'].fin), 1)}, Isole ${pc(e(RR.Isole.pag, RR.Isole.fin), 1)}, Sud ${pc(e(RR.Sud.pag, RR.Sud.fin), 1)}. Come nel resto del Piano, il Sud ha più fondi per abitante e li ha pagati meno.` });
      cap('g-san', 'Il peso della dimensione del comune', (h) => G.colonne(h, {
        voci: DIM.map(([n], i) => ({ nome: n, val: e(DD[i].fin, DD[i].pop), sotto: pc(e(DD[i].con, DD[i].n)), sub: `${nf(DD[i].con)} comuni su ${nf(DD[i].n)} con almeno un progetto · ${eur(DD[i].fin)} in tutto` })),
        formatta: E, conTip, nome: 'Euro per abitante per dimensione del comune' }),
        { sub: 'solo importi localizzati nel comune · sotto: quota di comuni con almeno un progetto', nota: `La sanità è la missione più concentrata: solo ${nf(conProgetti)} comuni su ${nf(CG.length)} (${pc(conProgetti / CG.length, 1)}) hanno almeno un progetto. Sopra i 100.000 abitanti ce l'hanno tutti, sotto i mille meno dell'uno per cento. Ospedali e Case della Comunità si costruiscono dove ci sono le aziende sanitarie, non dove ci sono i residenti.` });
      cap('g-san', 'Il denaro segue il bisogno?', (h) => G.colonne(h, {
        voci: QQ.map((q, i) => ({ nome: NOMI_Q[i].split(' · ')[0], val: e(q.reduce((s, x) => s + x.fin, 0), q.reduce((s, x) => s + x.pop, 0)), col: i < 2 ? '--c2' : '--c4', sotto: `65+ ${pc(q.reduce((s, x) => s + x.o, 0) / q.length, 1)}`, sub: `${NOMI_Q[i]} · ${nf(q.length)} comuni · ${pc(q.reduce((s, x) => s + x.o, 0) / q.length, 1)} di residenti over 65` })),
        formatta: E, conTip, nome: 'Euro per abitante per quartile di residenti anziani' }),
        { sub: 'comuni da 1.000 abitanti in su, divisi in quattro gruppi di uguale numero', nota: `Gli euro per abitante salgono dal primo al terzo quartile e poi calano: ${E(e(QQ[0].reduce((s, x) => s + x.fin, 0), QQ[0].reduce((s, x) => s + x.pop, 0)))} dove gli anziani sono il ${pc(QQ[0].reduce((s, x) => s + x.o, 0) / QQ[0].length, 1)} dei residenti e ${E(e(QQ[3].reduce((s, x) => s + x.fin, 0), QQ[3].reduce((s, x) => s + x.pop, 0)))} dove sono il ${pc(QQ[3].reduce((s, x) => s + x.o, 0) / QQ[3].length, 1)}. Non è una misura del bisogno: è soprattutto l'effetto della dimensione del comune. Un ospedale serve un'area, non i soli abitanti del comune in cui si trova.` });
      cap('g-san', 'Come si concentrano i soldi tra i comuni', (h) => G.lorenz(h, {
        curva: lor.filter((_, i) => i % Math.ceil(lor.length / 400) === 0 || i === lor.length - 1), xNome: 'comuni, dal meno al più finanziato', yNome: 'quota cumulata dei fondi della Missione 6', conTip,
        evidenzia: [{ x: 0.9, y: 1 - top10, titolo: 'Il 90% dei comuni con meno fondi', testo: `riceve il ${pc(1 - top10, 1)} della Missione 6` }],
      }), { sub: `curva di Lorenz · Gini ${nf(gini, 2)} · importi localizzati nei comuni`, nota: `Il 10% dei comuni con più fondi riceve il ${pc(top10, 1)} della Missione 6 localizzata nei comuni, la metà dei comuni con meno ne riceve il ${pc(meta10, 1)}. Il comune con più fondi in assoluto è una città capoluogo con l'azienda ospedaliera: per questo il valore per abitante dei comuni piccoli non va letto come «quanto ricevono i residenti».` });
      cap('g-san', 'Progetti conclusi e progetti in corso', (h) => G.colonne(h, {
        voci: [{ nome: 'Conclusi', val: e(san.i[8], san.i[7]), col: '--c2', sub: `${eur(san.i[8])} pagati su ${eur(san.i[7])} (stadio «concluso»)` },
               { nome: 'In corso', val: e(san.i[3] - san.i[8], san.i[2] - san.i[7]), col: '--c4', sub: `${eur(san.i[3] - san.i[8])} pagati su ${eur(san.i[2] - san.i[7])} (tutti gli altri stadi)` }],
        formatta: (v) => pc(v, 1), conTip, nome: 'Quota pagata dei progetti conclusi e di quelli in corso' }),
        { sub: 'Missione 6 · pagato ÷ assegnato', nota: `I progetti conclusi valgono ${eur(san.i[7])} e sono pagati al ${pc(e(san.i[8], san.i[7]), 1)}; quelli in corso valgono ${eur(san.i[2] - san.i[7])} e sono pagati al ${pc(e(san.i[3] - san.i[8], san.i[2] - san.i[7]), 1)}. La differenza è normale: un progetto concluso ha finito di essere pagato.` });
    }).catch(() => {});

  }).catch((e) => { el('caric').textContent = 'Errore di caricamento dei dati: ' + e.message; });
})();
