/* Guscio dell'interfaccia: ricerca del comune, pannelli dei chip, foglio inferiore (mobile) e modalità incorporata.
   Non conosce i dati dell'app: legge il DOM che app.js disegna (briciole, legenda, menu) e cambia solo l'indirizzo (#/c/ID). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const mobile = matchMedia('(max-width: 720px)');
  const embed = document.documentElement.hasAttribute('data-embed');

  /* ---------- pannelli dei chip: se ne apre uno alla volta ---------- */
  const chip = { 'chip-terr': 'pan-terr', 'chip-prog': 'pan-prog', 'chip-ind': 'pan-ind', 'chip-mappa': 'pan-mappa' };
  function chiudiPannelli(salvo) {
    for (const [c, p] of Object.entries(chip)) if (p !== salvo) { $('#' + p).hidden = true; $('#' + c).setAttribute('aria-expanded', 'false'); }
  }
  for (const [c, p] of Object.entries(chip)) {
    $('#' + c).addEventListener('click', () => {
      const pan = $('#' + p), apri = pan.hidden;
      chiudiPannelli(apri ? p : null); pan.hidden = !apri; $('#' + c).setAttribute('aria-expanded', String(apri));
      if (apri) { chiudiLista(); pan.querySelector('select,input,button')?.focus({ preventScroll: true }); }
    });
  }
  /* un clic fuori, o Esc, chiude i pannelli; una scelta fatta nei menu territoriali chiude il pannello del territorio */
  document.addEventListener('click', (e) => { if (!e.target.closest('.mapbar')) { chiudiPannelli(null); chiudiLista(); } });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const aperto = Object.entries(chip).find(([, p]) => !$('#' + p).hidden);
    if (aperto) { chiudiPannelli(null); $('#' + aperto[0]).focus(); }
    else if (!$('#q-lista').hidden) { chiudiLista(); }
    else if (document.activeElement === $('#maniglia') || $('#foglio').dataset.stato === 'aperto') { stato('medio'); }
  });
  for (const id of ['f-reg', 'f-prov', 'f-com']) $('#' + id).addEventListener('change', () => setTimeout(() => chiudiPannelli(null), 0));
  $('#f-reset').addEventListener('click', () => setTimeout(() => chiudiPannelli(null), 0));
  $('#indic').addEventListener('change', () => chiudiPannelli(null));

  /* ---------- etichette dei chip, lette da ciò che app.js disegna ---------- */
  const terr = () => { $('#chip-terr-t').textContent = $('#crumbs .cur')?.textContent || 'Italia'; };
  const ind = () => { const o = $('#indic'); $('#chip-ind-t').textContent = (o.selectedOptions[0]?.textContent || $('#leg-t')?.textContent || '').replace(/ \(.*/, ''); };
  new MutationObserver(terr).observe($('#crumbs'), { childList: true, subtree: true, characterData: true });
  new MutationObserver(ind).observe($('#indic'), { childList: true, subtree: true });
  $('#indic').addEventListener('change', ind);
  terr(); ind();

  /* ---------- «Nel riquadro…» sta nel pannello «Mappa» su mobile, sulla mappa su desktop ---------- */
  function posizionaQuadro() {
    const q = $('#quadro'); if (!q) return;
    if (mobile.matches) $('#pan-quadro').append(q); else $('.sovra').prepend(q);
  }
  mobile.addEventListener('change', () => { posizionaQuadro(); stato(mobile.matches ? 'chiuso' : $('#foglio').dataset.stato); });
  posizionaQuadro();
  if (mobile.matches) $('#legenda').open = false; /* su mobile la legenda parte chiusa: una riga sola sulla mappa */

  /* ---------- ricerca generale: comuni, province, regioni e voci del Piano (per parola o per codice) ---------- */
  const lista = $('#q-lista'), q = $('#q-cerca');
  let dati = null, sel = -1, vis = [];
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const LIVELLO = (c) => (/^M\d$/.test(c) ? 'Missione' : /^M\d+C\d+$/.test(c) ? 'Componente' : /^M\d+C\d+[IR]\d+\.\d+$/.test(c) ? 'Misura' : 'Sub-misura');
  const NOMI_MIS = { M1: 'Digitalizzazione, innovazione, cultura', M2: 'Rivoluzione verde e transizione ecologica', M3: 'Infrastrutture per la mobilità', M4: 'Istruzione e ricerca', M5: 'Inclusione e coesione', M6: 'Salute', M7: 'REPowerEU' };
  async function carica() {
    if (dati) return dati;
    const j = (n) => fetch('data/' + n + '.json').then((r) => r.json());
    const [com, prov, reg, meta] = await Promise.all([j('comuni'), j('province'), j('regioni'), j('meta')]);
    const sigla = (pv) => prov[pv]?.sigla || '';
    const comuni = Object.entries(com).map(([id, c]) => ({ t: 'c', id, nm: c.nm, n: norm(c.nm), det: sigla(c.pv), pop: c.pop || 0 })).sort((a, b) => b.pop - a.pop);
    const province = Object.entries(prov).map(([id, p]) => ({ t: 'p', id, nm: p.nome, n: norm(p.nome), det: 'provincia · ' + p.sigla, pop: p.n || 0 })).sort((a, b) => b.pop - a.pop);
    const regioni = Object.entries(reg).map(([id, r]) => ({ t: 'r', id, nm: r.nome, n: norm(r.nome), det: 'regione', pop: r.n || 0 })).sort((a, b) => b.pop - a.pop);
    const piano = Object.entries(meta.nomi || {}).map(([cod, nome]) => ({ t: 'g', id: cod, nm: nome, n: norm(nome + ' ' + cod), det: LIVELLO(cod) + ' ' + cod }));
    for (const [m, nome] of Object.entries(NOMI_MIS)) piano.push({ t: 'g', id: m, nm: nome, n: norm(nome + ' ' + m + ' missione'), det: 'Missione ' + m });
    piano.sort((a, b) => a.id.length - b.id.length || (a.id < b.id ? -1 : 1));
    dati = { comuni, province, regioni, piano };
    return dati;
  }
  function chiudiLista() { lista.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); sel = -1; }
  function evid() { [...lista.querySelectorAll('li[role=option]')].forEach((li, i) => li.setAttribute('aria-selected', String(i === sel))); const li = lista.querySelectorAll('li[role=option]')[sel]; if (li) { q.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); } }
  /* tutte le parole digitate devono comparire; chi inizia con la parola passa avanti */
  function trova(lista_, t, max) {
    const w = t.split(' ');
    const ok = lista_.filter((c) => w.every((x) => c.n.includes(x)));
    const ini = ok.filter((c) => c.n.startsWith(t) || c.n.split(' ').some((x) => x.startsWith(w[0])));
    return [...new Set(ini.concat(ok))].slice(0, max);
  }
  async function cerca() {
    const t = norm(q.value); if (t.length < 2) { chiudiLista(); return; }
    const d = await carica(); if (norm(q.value) !== t) return;
    const gruppi = [['Regioni', trova(d.regioni, t, 2)], ['Province', trova(d.province, t, 2)], ['Comuni', trova(d.comuni, t, 5)], ['Piano: missioni, componenti, misure', trova(d.piano, t, 6)]].filter((g) => g[1].length);
    vis = []; let h = '';
    for (const [tit, righe] of gruppi) {
      h += `<li class="gr" role="presentation">${tit}</li>`;
      for (const c of righe) {
        const i = vis.push(c) - 1;
        h += `<li id="q-o${i}" role="option" aria-selected="false" data-t="${c.t}" data-id="${c.id}"><b>${esc(c.nm)}</b> <span>${esc(c.det)}</span>${c.t === 'c' ? `<button type="button" class="q-piu" data-piu="${c.id}" tabindex="-1" aria-label="Aggiungi ${esc(c.nm)} al confronto" title="Aggiungi al confronto">+</button>` : ''}</li>`;
      }
    }
    lista.innerHTML = h || '<li class="vuoto" role="presentation">Nessun risultato: prova con un\'altra parola, un comune o un codice come M4C1</li>';
    lista.hidden = false; q.setAttribute('aria-expanded', 'true'); sel = -1; chiudiPannelli(null);
  }
  /* la selezione per il confronto resta quando si passa a un altro comune; con l'app non ancora pronta si va all'indirizzo semplice */
  function vai(id, t = 'c') {
    chiudiLista(); q.value = ''; q.blur(); const A = window.AtlantePNRR;
    if (t === 'g') { if (A?.vaiPiano) A.vaiPiano(id); }
    else if (t === 'c') { if (A?.vaiComune) A.vaiComune(id); else location.hash = '#/c/' + id; }
    else if (A?.vaiTerritorio) A.vaiTerritorio(t, id); else location.hash = '#/' + t + '/' + id;
    if (mobile.matches) stato('medio');
  }
  /* «+» (o Maiusc+Invio) aggiunge il comune al confronto senza cambiare scheda; la ricerca resta pronta per il prossimo */
  function aggiungi(id) { document.dispatchEvent(new CustomEvent('conf-aggiungi', { detail: { id } })); q.value = ''; chiudiLista(); q.focus(); }
  q.addEventListener('input', cerca);
  q.addEventListener('focus', () => { carica(); if (q.value) cerca(); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!lista.hidden && vis.length) { sel = (sel + 1) % vis.length; evid(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!lista.hidden && vis.length) { sel = (sel - 1 + vis.length) % vis.length; evid(); } }
    else if (e.key === 'Enter') { e.preventDefault(); const c = vis[sel >= 0 ? sel : 0]; if (c && !lista.hidden) { if (e.shiftKey && c.t === 'c') aggiungi(c.id); else vai(c.id, c.t); } }
  });
  lista.addEventListener('pointerdown', (e) => e.preventDefault());
  lista.addEventListener('click', (e) => { const piu = e.target.closest('button[data-piu]'); if (piu) { aggiungi(piu.dataset.piu); return; } const li = e.target.closest('li[data-id]'); if (li) vai(li.dataset.id, li.dataset.t); });

  /* ---------- foglio inferiore: tre altezze, trascinabile o a tocchi ---------- */
  const foglio = $('#foglio'), man = $('#maniglia'), ORDINE = ['chiuso', 'medio', 'aperto'];
  const etich = { chiuso: 'Apri la scheda', medio: 'Allarga la scheda', aperto: 'Riduci la scheda' };
  /* altezza massima: sotto la barra dei comandi (ricerca e filtri), che altrimenti coprirebbe la maniglia */
  const tetto = () => { const b = document.querySelector('.mapbar'); return (b ? b.offsetHeight : 100) + 8; };
  const aggTetto = () => foglio.parentElement.style.setProperty('--tetto', tetto() + 'px');
  addEventListener('resize', aggTetto);
  function stato(s) {
    if (!mobile.matches) s = 'aperto';
    aggTetto();
    foglio.dataset.stato = s; foglio.style.removeProperty('height');
    man.setAttribute('aria-expanded', String(s !== 'chiuso')); man.setAttribute('aria-label', etich[s] || 'Scheda');
    document.body.dataset.foglio = s;
    if (s === 'chiuso') $('#scheda').scrollTop = 0;
  }
  let drag = null;
  man.addEventListener('pointerdown', (e) => {
    if (!mobile.matches) return;
    const r = foglio.getBoundingClientRect(); drag = { y0: e.clientY, h0: r.height, mosso: false, max: foglio.parentElement.clientHeight - tetto(), id: e.pointerId };
    man.setPointerCapture(e.pointerId);
  });
  man.addEventListener('pointermove', (e) => {
    if (!drag) return; const dy = drag.y0 - e.clientY;
    if (!drag.mosso && Math.abs(dy) < 6) return;
    drag.mosso = true; foglio.classList.add('trascina');
    foglio.style.height = Math.max(120, Math.min(drag.max, drag.h0 + dy)) + 'px';
  });
  const fine = (e) => {
    if (!drag) return; const d = drag; drag = null; foglio.classList.remove('trascina');
    if (!d.mosso) { const i = ORDINE.indexOf(foglio.dataset.stato); stato(ORDINE[(i + 1) % 3]); return; }
    const h = foglio.getBoundingClientRect().height, P = foglio.parentElement.clientHeight;
    const cand = { chiuso: 184, medio: P * 0.55, aperto: d.max };
    stato(Object.entries(cand).sort((a, b) => Math.abs(a[1] - h) - Math.abs(b[1] - h))[0][0]);
  };
  man.addEventListener('pointerup', fine); man.addEventListener('pointercancel', () => { if (drag) { drag = null; foglio.classList.remove('trascina'); stato(foglio.dataset.stato); } });
  man.addEventListener('keydown', (e) => {
    const i = ORDINE.indexOf(foglio.dataset.stato);
    if (e.key === 'ArrowUp') { e.preventDefault(); stato(ORDINE[Math.min(2, i + 1)]); } else if (e.key === 'ArrowDown') { e.preventDefault(); stato(ORDINE[Math.max(0, i - 1)]); }
  });
  /* chi sceglie un territorio sulla mappa o da un elenco vuole leggerne la scheda (non con la lente accesa, cioè sul telefono: il foglio si apre solo al tocco sulla maniglia) */
  let prima = location.hash.split('?')[0];
  addEventListener('hashchange', () => { const ora = location.hash.split('?')[0]; if (ora !== prima && mobile.matches && foglio.dataset.stato === 'chiuso' && !window.AtlantePNRR?.S.lente) stato('medio'); prima = ora; });
  stato(mobile.matches ? 'chiuso' : 'aperto');

  /* ---------- modalità incorporata: schermo intero ---------- */
  if (embed && document.fullscreenEnabled) {
    const b = document.createElement('button'); b.type = 'button'; b.id = 'btn-schermo'; b.className = 'btn-schermo';
    b.setAttribute('aria-label', 'Schermo intero'); b.title = 'Schermo intero';
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    b.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {})));
    $('.tools')?.append(b);
  }
  /* l'indirizzo dell'app autonoma, per «Condividi» quando l'app è dentro un'altra pagina */
  if (embed) document.documentElement.dataset.autonoma = 'https://palermohub.github.io/atlante_pnrr/';
})();
