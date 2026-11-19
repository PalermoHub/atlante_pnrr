/* Guscio dell'interfaccia: ricerca del comune, pannelli dei chip, foglio inferiore (mobile) e modalità incorporata.
   Non conosce i dati dell'app: legge il DOM che app.js disegna (briciole, legenda, menu) e cambia solo l'indirizzo (#/c/ID). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const mobile = matchMedia('(max-width: 720px)');
  const embed = document.documentElement.hasAttribute('data-embed');

  /* ---------- pannelli dei chip: se ne apre uno alla volta ---------- */
  const chip = { 'chip-terr': 'pan-terr', 'chip-ind': 'pan-ind', 'chip-mappa': 'pan-mappa' };
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

  /* ---------- ricerca del comune ---------- */
  const lista = $('#q-lista'), q = $('#q-cerca');
  let dati = null, sel = -1, vis = [];
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  async function carica() {
    if (dati) return dati;
    const [com, prov] = await Promise.all([fetch('data/comuni.json').then((r) => r.json()), fetch('data/province.json').then((r) => r.json())]);
    dati = Object.entries(com).map(([id, c]) => ({ id, nm: c.nm, n: norm(c.nm), sig: prov[c.pv]?.sigla || '', pop: c.pop || 0 })).sort((a, b) => b.pop - a.pop);
    return dati;
  }
  function chiudiLista() { lista.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); sel = -1; }
  function evid() { [...lista.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === sel))); const li = lista.children[sel]; if (li) { q.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); } }
  async function cerca() {
    const t = norm(q.value); if (t.length < 2) { chiudiLista(); return; }
    const d = await carica(); if (norm(q.value) !== t) return;
    const inizio = d.filter((c) => c.n.startsWith(t)), dentro = d.filter((c) => !c.n.startsWith(t) && c.n.includes(t));
    vis = inizio.concat(dentro).slice(0, 8);
    lista.innerHTML = vis.length ? vis.map((c, i) => `<li id="q-o${i}" role="option" aria-selected="false" data-id="${c.id}"><b>${c.nm.replace(/[&<>"']/g, '')}</b> <span>${c.sig}</span></li>`).join('') : '<li class="vuoto" role="presentation">Nessun comune con questo nome</li>';
    lista.hidden = false; q.setAttribute('aria-expanded', 'true'); sel = -1; chiudiPannelli(null);
  }
  function vai(id) { chiudiLista(); q.value = ''; q.blur(); location.hash = '#/c/' + id; if (mobile.matches) stato('medio'); }
  q.addEventListener('input', cerca);
  q.addEventListener('focus', () => { carica(); if (q.value) cerca(); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!lista.hidden && vis.length) { sel = (sel + 1) % vis.length; evid(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!lista.hidden && vis.length) { sel = (sel - 1 + vis.length) % vis.length; evid(); } }
    else if (e.key === 'Enter') { e.preventDefault(); const c = vis[sel >= 0 ? sel : 0]; if (c && !lista.hidden) vai(c.id); }
  });
  lista.addEventListener('pointerdown', (e) => e.preventDefault());
  lista.addEventListener('click', (e) => { const li = e.target.closest('li[data-id]'); if (li) vai(li.dataset.id); });

  /* ---------- foglio inferiore: tre altezze, trascinabile o a tocchi ---------- */
  const foglio = $('#foglio'), man = $('#maniglia'), ORDINE = ['chiuso', 'medio', 'aperto'];
  const etich = { chiuso: 'Apri la scheda', medio: 'Allarga la scheda', aperto: 'Riduci la scheda' };
  function stato(s) {
    if (!mobile.matches) s = 'aperto';
    foglio.dataset.stato = s; foglio.style.removeProperty('height');
    man.setAttribute('aria-expanded', String(s !== 'chiuso')); man.setAttribute('aria-label', etich[s] || 'Scheda');
    document.body.dataset.foglio = s;
    if (s === 'chiuso') $('#scheda').scrollTop = 0;
  }
  let drag = null;
  man.addEventListener('pointerdown', (e) => {
    if (!mobile.matches) return;
    const r = foglio.getBoundingClientRect(); drag = { y0: e.clientY, h0: r.height, mosso: false, max: foglio.parentElement.clientHeight - 56, id: e.pointerId };
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
  /* chi sceglie un territorio sulla mappa o da un elenco vuole leggerne la scheda */
  let prima = location.hash.split('?')[0];
  addEventListener('hashchange', () => { const ora = location.hash.split('?')[0]; if (ora !== prima && mobile.matches && foglio.dataset.stato === 'chiuso') stato('medio'); prima = ora; });
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
