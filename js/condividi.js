/* Condivisione dall'intestazione (icona accanto a Info e Tema, uguale in tutte le pagine).
   L'indirizzo condiviso è quello corrente, con territorio, filtri e vista della mappa. Solo link: nessuno script di terzi. */
(() => {
  const tools = document.querySelector('.tools'); if (!tools) return;
  const box = document.createElement('div'); box.className = 'cond';
  box.innerHTML = '<button id="btn-cond" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="cond-menu" aria-label="Condividi" title="Condividi questa pagina">'
    + '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg></button>'
    + '<ul id="cond-menu" class="cond-menu" hidden></ul>';
  tools.prepend(box);
  const btn = box.querySelector('button'), menu = box.querySelector('ul');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const chiudi = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  const apri = () => {
    const url = location.href, titolo = document.title, testo = titolo + ' – dove vanno i fondi del PNRR, per comune';
    const u = encodeURIComponent(url), t = encodeURIComponent(testo);
    const voci = [
      ['WhatsApp', `https://wa.me/?text=${t}%20${u}`], ['Telegram', `https://t.me/share/url?url=${u}&text=${t}`],
      ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`], ['X', `https://twitter.com/intent/tweet?text=${t}&url=${u}`],
      ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`], ['E-mail', `mailto:?subject=${encodeURIComponent(titolo)}&body=${t}%0A${u}`],
    ];
    menu.innerHTML = (navigator.share ? '<li><button type="button" data-az="nativo">Condividi con…</button></li>' : '')
      + voci.map(([n, h]) => `<li><a href="${esc(h)}" target="_blank" rel="noopener noreferrer">${n}</a></li>`).join('')
      + '<li><button type="button" data-az="copia">Copia link</button></li>';
    menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); menu.querySelector('a,button')?.focus();
  };
  btn.addEventListener('click', () => (menu.hidden ? apri() : chiudi()));
  menu.addEventListener('click', async (e) => {
    if (e.target.closest('a')) { chiudi(); return; }
    const b = e.target.closest('button[data-az]'); if (!b) return;
    if (b.dataset.az === 'nativo') { try { await navigator.share({ title: document.title, url: location.href }); } catch (err) { /* annullato */ } chiudi(); return; }
    try { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copiato'; } catch (err) { prompt('Copia il link:', location.href); chiudi(); return; }
    setTimeout(chiudi, 900);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudi(); btn.focus(); } });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.cond')) chiudi(); });
})();
