/* Menù da mobile (≤720px): un pulsante ☰ apre un pannello laterale con sezioni, Info, tema e crediti.
   Sulla home il pulsante sta nella barra di ricerca e la testata sparisce (la mappa prende tutto lo schermo);
   nelle altre pagine sta nella testata, che resta di una riga. Vale anche in modalità incorporata (iframe di atlante_pnrr.html, ?embed=1). Sul desktop non cambia nulla:
   .nav e .tools vengono spostati nel pannello solo su mobile e tornano al loro posto sopra i 720px. */
(() => {
  /* dentro un iframe (atlante_pnrr.html) la linguetta ☰ di PalermoHub copre l'angolo in alto a sinistra: le testate lasciano posto (atlante.css) */
  try { if (self !== top) document.documentElement.setAttribute('data-iframe', ''); } catch (e) { document.documentElement.setAttribute('data-iframe', ''); }
  const mobile = matchMedia('(max-width: 720px)');
  const top = document.querySelector('header.top');
  const nav = document.querySelector('header.top .nav');
  if (!top || !nav) return;
  const tools = top.querySelector('.tools');
  const home = document.body.classList.contains('home');
  const embed = document.documentElement.hasAttribute('data-embed'); /* in embed la linguetta ☰ della testata PalermoHub sta in alto a sinistra: il nostro va a destra */
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; return e; };

  /* pulsante */
  const btn = el('button', 'menu-btn'); btn.type = 'button';
  btn.setAttribute('aria-label', 'Apri il menù'); btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'menu-pan');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  const riga = document.querySelector('.cerca-riga');
  if (home && riga) { if (embed) riga.append(btn); else riga.prepend(btn); } else {
    /* pagine che scorrono (Statistiche, Cosa dicono i dati, Privacy): × per chiuderle e tornare alla mappa */
    const x = el('a', 'menu-chiudi-pag'); x.href = 'index.html'; x.setAttribute('aria-label', 'Chiudi la pagina e torna alla mappa'); x.title = 'Chiudi e torna alla mappa';
    x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    top.append(x, btn);
  }

  /* pannello */
  const vela = el('div', 'menu-vela'); vela.hidden = true;
  const pan = el('div', 'menu-pan'); pan.id = 'menu-pan'; pan.hidden = true; pan.dataset.lato = home && !embed ? 'sx' : 'dx';
  pan.setAttribute('role', 'dialog'); pan.setAttribute('aria-modal', 'true'); pan.setAttribute('aria-label', 'Menù');
  const testa = el('div', 'menu-testa');
  const marchio = top.querySelector('.brand').cloneNode(true); marchio.classList.add('menu-marchio'); marchio.removeAttribute('id');
  const mst = marchio.querySelector('strong'); if (mst) mst.textContent += ' Italia';
  const msp = marchio.querySelector('span'); if (msp) msp.innerHTML = msp.textContent.split(' · ').join('<br>'); /* data su due righe */
  const chiudiBtn = el('button', 'menu-x'); chiudiBtn.type = 'button'; chiudiBtn.setAttribute('aria-label', 'Chiudi il menù');
  chiudiBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  testa.append(marchio, chiudiBtn);
  const corpo = el('div', 'menu-corpo');
  const segnaposto = (e) => { const s = document.createComment('menu'); e.before(s); return s; };
  const posNav = segnaposto(nav), posTools = tools ? segnaposto(tools) : null;
  const piede = el('div', 'menu-piede');
  const lnk = el('div', 'menu-lnk');
  if (document.querySelector('.piede-lnk') || document.querySelector('.piede')) {
    const cr = el('button', '', 'Credits e Fonti'); cr.type = 'button';
    cr.addEventListener('click', () => { chiudi(false); if (window.apriInfo) window.apriInfo('credits'); else location.href = 'index.html#info'; });
    const pr = el('a', '', 'Privacy'); pr.href = 'privacy.html';
    lnk.append(cr, pr);
  }
  const ods = el('p', 'menu-ods');
  ods.innerHTML = '<a href="https://opendatasicilia.it/" target="_blank" rel="noopener"><img src="img/opendatasicilia.png" width="26" height="30" alt="OpenDataSicilia"></a><span><strong>Atlante del PNRR</strong> è un progetto di OpenDataSicilia · © 2026</span>';
  piede.append(ods);
  pan.append(testa, corpo, piede);
  document.body.append(vela, pan);

  function sistema() {
    if (mobile.matches) { corpo.append(nav); if (tools) corpo.append(tools); corpo.append(lnk); }
    else { posNav.after(nav); if (tools && posTools) posTools.after(tools); chiudi(false); }
  }
  let ritorno = null;
  function apri() {
    ritorno = document.activeElement; pan.hidden = vela.hidden = false; btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { pan.classList.add('aperto'); vela.classList.add('aperto'); });
    (nav.querySelector('[aria-current]') || nav.querySelector('a'))?.focus({ preventScroll: true });
  }
  function chiudi(torna = true) {
    if (pan.hidden) return;
    pan.classList.remove('aperto'); vela.classList.remove('aperto'); btn.setAttribute('aria-expanded', 'false');
    const fine = () => { pan.hidden = vela.hidden = true; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) fine(); else setTimeout(fine, 200);
    if (torna) (ritorno || btn).focus?.({ preventScroll: true });
  }
  btn.addEventListener('click', () => (pan.hidden ? apri() : chiudi()));
  chiudiBtn.addEventListener('click', () => chiudi());
  vela.addEventListener('click', () => chiudi());
  pan.addEventListener('click', (e) => { if (e.target.closest('a[href]') && !e.target.closest('[target="_blank"]')) chiudi(false); if (e.target.closest('#btn-info')) chiudi(false); });
  document.addEventListener('keydown', (e) => {
    if (pan.hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); chiudi(); return; }
    if (e.key === 'Tab') { /* il focus resta dentro il pannello */
      const f = [...pan.querySelectorAll('a[href],button,select')].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const p = f[0], u = f[f.length - 1];
      if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); } else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); }
    }
  }, true);
  mobile.addEventListener('change', sistema); sistema();
})();
