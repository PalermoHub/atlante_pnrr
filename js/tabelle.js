/* Riordino per colonna delle tabelle statiche (clic o Invio sull'intestazione).
   Il valore per ordinare è `data-v` della cella, se c'è; altrimenti il testo.
   Le tabelle con intestazioni già gestite (th[data-k], th[data-o]) o `data-nosort` restano com'erano. */
(() => {
  const val = (td) => { if (!td) return ''; const v = td.dataset.v; if (v != null && v !== '' && isFinite(+v)) return +v; return (td.textContent || '').trim(); };
  const cmp = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'it', { numeric: true }));
  function rendi(t) {
    t.dataset.ord = '1';
    const tb = t.tBodies[0]; if (!tb) return;
    const ths = [...t.tHead.rows[0].cells];
    ths.forEach((th, i) => {
      if (!th.textContent.trim()) return;
      th.tabIndex = 0; th.setAttribute('role', 'button'); th.setAttribute('aria-sort', 'none'); th.title = 'Riordina per questa colonna';
      const go = () => {
        const dir = th.getAttribute('aria-sort') === 'ascending' ? -1 : th.classList.contains('n') && th.getAttribute('aria-sort') === 'none' ? -1 : 1;
        ths.forEach((h) => h.setAttribute('aria-sort', 'none'));
        th.setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
        [...tb.rows].map((r, n) => [r, val(r.cells[i]), n]).sort((a, b) => cmp(a[1], b[1]) * dir || a[2] - b[2]).forEach(([r]) => tb.appendChild(r));
      };
      th.addEventListener('click', go);
      th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }
  const scan = (root) => root.querySelectorAll('table:not([data-ord]):not([data-nosort])').forEach((t) => { if (t.tHead && !t.querySelector('th[data-k], th[data-o]')) rendi(t); });
  new MutationObserver(() => scan(document)).observe(document.body, { childList: true, subtree: true });
  scan(document);
})();
