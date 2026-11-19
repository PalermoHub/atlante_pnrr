/* Piede fisso, uguale in tutte le pagine: scorre solo il resto. Si apre da qui anche «Credits e Fonti». */
(() => {
  const f = document.createElement('footer'); f.className = 'piede';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; return e; };
  const ods = el('a', 'piede-logo'); ods.href = 'https://opendatasicilia.it/'; ods.target = '_blank'; ods.rel = 'noopener'; ods.title = 'OpenDataSicilia';
  ods.innerHTML = '<img src="img/opendatasicilia.png" width="26" height="30" alt="OpenDataSicilia">';
  const testo = el('div', 'piede-testo');
  const r1 = el('p', 'piede-r1');
  const prog = el('span', 'piede-prog'); const b = el('strong', '', 'Atlante del PNRR'); prog.append(b, ' è un progetto di OpenDataSicilia');
  const copy = el('span', 'piede-copy', '© 2026 OpenDataSicilia');
  const info = el('button', 'piede-lnk', 'Credits e Fonti'); info.type = 'button';
  info.addEventListener('click', () => { if (window.apriInfo) window.apriInfo('credits'); else location.href = 'index.html#info'; });
  const priv = el('a', 'piede-lnk', 'Privacy'); priv.href = 'privacy.html';
  r1.append(prog, copy, info, priv);
  const r2 = el('p', 'piede-r2', 'Dati: Italia Domani, Catalogo Open Data (CC-BY 4.0), estrazione del 13 giugno 2026. Non è un prodotto ufficiale del Governo né di Italia Domani.');
  testo.append(r1, r2); f.append(ods, testo); document.body.append(f);
  const misura = () => document.documentElement.style.setProperty('--piede-h', f.offsetHeight + 'px');
  misura(); if (window.ResizeObserver) new ResizeObserver(misura).observe(f); else addEventListener('resize', misura);
})();
