/* Galleria fotografica: ogni <a class="gal" data-gal="nome" href="grande.png"> si apre in una finestra a tutto schermo
   con frecce, miniature, contatore, didascalia, tastiera (← → Home End Esc) e scorrimento al tocco. Senza JS i link aprono l'immagine. */
(() => {
  const voci = [...document.querySelectorAll('a.gal[data-gal]')];
  if (!voci.length || !window.HTMLDialogElement) return;
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; return e; };
  const ico = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  let dlg, img, tit, num, descr, mini, lista = [], i = 0, ritorno = null;

  function crea() {
    dlg = el('dialog', 'lb'); dlg.setAttribute('aria-label', 'Galleria delle immagini');
    const testa = el('div', 'lb-testa'); num = el('span', 'lb-n'); tit = el('div', 'lb-tit');
    const x = el('button'); x.type = 'button'; x.setAttribute('aria-label', 'Chiudi la galleria'); x.innerHTML = ico('m6 6 12 12M18 6 6 18');
    testa.append(num, tit, x);
    const scena = el('div', 'lb-scena'); img = el('img');
    const pv = el('button', 'lb-prev'); pv.type = 'button'; pv.setAttribute('aria-label', 'Immagine precedente'); pv.innerHTML = ico('m15 5-7 7 7 7');
    const nx = el('button', 'lb-next'); nx.type = 'button'; nx.setAttribute('aria-label', 'Immagine successiva'); nx.innerHTML = ico('m9 5 7 7-7 7');
    scena.append(img, pv, nx);
    const piede = el('div', 'lb-piede'); descr = el('p', 'lb-descr'); descr.id = 'lb-descr'; mini = el('div', 'lb-mini');
    piede.append(descr, mini);
    dlg.append(testa, scena, piede); document.body.append(dlg);
    img.setAttribute('aria-describedby', 'lb-descr');
    x.addEventListener('click', () => dlg.close());
    pv.addEventListener('click', () => vai(i - 1)); nx.addEventListener('click', () => vai(i + 1));
    /* clic sullo sfondo (fuori da immagine e comandi) chiude */
    scena.addEventListener('click', (e) => { if (e.target === scena) dlg.close(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); vai(i - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); vai(i + 1); }
      else if (e.key === 'Home') { e.preventDefault(); vai(0); }
      else if (e.key === 'End') { e.preventDefault(); vai(lista.length - 1); }
    });
    dlg.addEventListener('close', () => { document.documentElement.style.overflow = ''; if (ritorno) ritorno.focus({ preventScroll: false }); });
    /* scorrimento al tocco */
    let x0 = null, y0 = 0;
    scena.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    scena.addEventListener('touchend', (e) => {
      if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) vai(i + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  function vai(n) {
    i = (n + lista.length) % lista.length;
    const a = lista[i];
    img.src = a.href; img.alt = a.querySelector('img')?.alt || a.dataset.tit || '';
    if (a.dataset.w) { img.width = +a.dataset.w; img.height = +a.dataset.h; }
    tit.textContent = a.dataset.tit || ''; descr.textContent = a.dataset.descr || '';
    num.textContent = `${i + 1} / ${lista.length}`;
    [...mini.children].forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    /* precarica la vicina */
    for (const k of [i + 1, i - 1]) { const v = lista[(k + lista.length) % lista.length]; if (v) new Image().src = v.href; }
  }

  function apri(a) {
    if (!dlg) crea();
    lista = voci.filter((v) => v.dataset.gal === a.dataset.gal);
    mini.replaceChildren(...lista.map((v, k) => {
      const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', `Vai all'immagine ${k + 1}: ${v.dataset.tit || ''}`);
      const m = el('img'); m.src = v.querySelector('img')?.src || v.href; m.alt = ''; m.loading = 'lazy'; b.append(m);
      b.addEventListener('click', () => vai(k)); return b;
    }));
    ritorno = a; vai(lista.indexOf(a));
    document.documentElement.style.overflow = 'hidden';
    if (!dlg.open) dlg.showModal();
  }

  voci.forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; /* nuova scheda: lascia fare al browser */
    e.preventDefault(); apri(a);
  }));
})();
