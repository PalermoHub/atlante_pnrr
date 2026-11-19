/* Atlante PNRR · «Salva come immagine PNG» su ogni grafico (figure.grafico), in tutte le pagine.
   Il grafico si disegna con html2canvas, caricato dal sito stesso solo al primo clic. Nella copia usata per l'immagine
   (onclone) si aggiungono testata con il logo dell'app e piede con fonte e data, così l'originale in pagina non cambia. */
(() => {
  'use strict';
  const SITO = 'palermohub.github.io/atlante_pnrr';
  const FONTE = 'Dati: Italia Domani, Catalogo Open Data (CC-BY 4.0), estrazione del 13 giugno 2026. Non è un prodotto ufficiale del Governo né di Italia Domani.';
  const fData = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' });
  const ICONA = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/></svg>';

  let h2c = null;
  const carica = () => h2c || (h2c = new Promise((ok, ko) => {
    if (window.html2canvas) return ok(window.html2canvas);
    const s = document.createElement('script'); s.src = 'js/vendor/html2canvas.min.js?v=2';
    s.onload = () => ok(window.html2canvas); s.onerror = () => { h2c = null; ko(new Error('html2canvas non caricato')); };
    document.head.append(s);
  }));

  /* Il logo entra come data URL: l'immagine è già decodificata quando html2canvas la legge e il canvas non si «sporca». */
  let logo = null;
  const caricaLogo = () => logo || (logo = fetch('img/logo-pnrr.png').then((r) => r.blob()).then((b) => new Promise((ok, ko) => {
    const f = new FileReader(); f.onload = () => ok(f.result); f.onerror = ko; f.readAsDataURL(b);
  })).catch(() => { logo = null; return ''; }));

  const nodo = (doc, tag, stile, testo) => { const e = doc.createElement(tag); if (stile) e.style.cssText = stile; if (testo != null) e.textContent = testo; return e; };

  /* html2canvas ignora i fogli di stile sugli SVG inline: si copiano nell'attributo style i valori calcolati. */
  const fissaSvg = (doc) => {
    const PROP = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'letter-spacing'];
    const cs = doc.defaultView.getComputedStyle.bind(doc.defaultView);
    doc.querySelectorAll('svg *').forEach((n) => { const c = cs(n); PROP.forEach((p) => { const v = c.getPropertyValue(p); if (v) n.style.setProperty(p, v); }); });
  };

  /* html2canvas 1.4 non legge `color(srgb r g b / a)`, in cui il browser trasforma color-mix(): lo riscriviamo in rgba(). */
  const PROP_COL = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color'];
  const aRgba = (v) => {
    const m = /^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.e-]+%?))?\s*\)$/.exec(v); if (!m) return null;
    const c = [m[1], m[2], m[3]].map((x) => Math.round(255 * parseFloat(x)));
    const a = m[4] == null ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
  };
  const fissaColori = (doc) => {
    const cs = doc.defaultView.getComputedStyle.bind(doc.defaultView);
    doc.querySelectorAll('*').forEach((n) => { const c = cs(n); PROP_COL.forEach((p) => { const v = c.getPropertyValue(p); if (v.startsWith('color(')) { const r = aRgba(v); if (r) n.style.setProperty(p, r); } }); });
  };

  const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'grafico';

  async function salva(fig, btn) {
    const etichetta = btn.innerHTML; btn.disabled = true; btn.textContent = 'Preparo l’immagine…';
    try {
      const [html2canvas, logoUrl] = await Promise.all([carica(), caricaLogo()]);
      if (document.fonts?.ready) await document.fonts.ready;
      const titolo = fig.querySelector('figcaption b')?.textContent?.trim() || 'Grafico';
      const canvas = await html2canvas(fig, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff',
        scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)), useCORS: true, logging: false,
        ignoreElements: (e) => e.classList?.contains('salva-png'),
        onclone: (doc, el) => {
          fissaSvg(doc); fissaColori(doc);
          el.style.boxShadow = 'none'; el.style.margin = '0'; el.style.paddingBottom = '.8rem';
          const testata = nodo(doc, 'div', 'display:flex;align-items:center;gap:.6rem;margin:-.2rem 0 .8rem;padding-bottom:.6rem;border-bottom:1px solid var(--line)');
          if (logoUrl) { const i = doc.createElement('img'); i.src = logoUrl; i.width = 34; i.height = 34; i.style.cssText = 'display:block;flex:none;border-radius:50%'; testata.append(i); }
          const t = nodo(doc, 'div', 'display:flex;flex-direction:column;line-height:1.2');
          t.append(nodo(doc, 'strong', 'font-size:1rem', 'Atlante del PNRR'), nodo(doc, 'small', 'font-size:.74rem;color:var(--ink3)', 'un progetto di OpenDataSicilia'));
          testata.append(t);
          el.insertBefore(testata, el.firstChild);
          const piede = nodo(doc, 'div', 'margin-top:.8rem;padding-top:.5rem;border-top:1px solid var(--line);font-size:.68rem;line-height:1.4;color:var(--ink3)');
          piede.append(nodo(doc, 'div', null, FONTE), nodo(doc, 'div', 'font-weight:700;color:var(--ink2);margin-top:.15rem', `${SITO} · immagine creata il ${fData.format(new Date())}`));
          el.append(piede);
        },
      });
      const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
      if (!blob) throw new Error('PNG vuoto');
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `atlante-pnrr-${slug(titolo)}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
      btn.textContent = 'Immagine salvata';
    } catch (e) { console.warn('[salva-png]', e); btn.textContent = 'Non riesco a creare l’immagine'; }
    setTimeout(() => { btn.innerHTML = etichetta; btn.disabled = false; }, 2500);
  }

  function aggiungi(fig) {
    if (fig.dataset.png) return; fig.dataset.png = '1';
    const titolo = fig.querySelector('figcaption b')?.textContent?.trim(); if (!titolo) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'salva-png';
    b.innerHTML = ICONA + ' PNG';
    b.title = 'Salva questo grafico come immagine PNG'; b.setAttribute('aria-label', `Salva come immagine PNG: ${titolo}`);
    b.addEventListener('click', () => salva(fig, b));
    fig.append(b);
  }
  const scan = (r) => r.querySelectorAll('figure.grafico:not([data-png])').forEach(aggiungi);
  new MutationObserver(() => scan(document)).observe(document.body, { childList: true, subtree: true });
  scan(document);
})();
