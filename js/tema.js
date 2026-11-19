/* Temi dell'interfaccia: la scelta resta nel browser e batte la preferenza di sistema ("auto" la segue).
   data-theme = nome del tema per il CSS; data-tone = chiaro/scuro, usato dalle scale colore della mappa. */
window.SCALE_PNRR = {
  blu: ['Blu', ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b']],
  viridis: ['Viridis (daltonici)', ['#fde725', '#a0da39', '#4ac16d', '#1fa187', '#277f8e', '#46337e', '#440154']],
  cividis: ['Cividis (daltonici)', ['#ffea46', '#d1c05f', '#a59c6e', '#7c7b78', '#575c6d', '#31446b', '#00204d']],
  magma: ['Magma', ['#fcfdbf', '#fec287', '#fa8657', '#e75263', '#b73779', '#721f81', '#2c115f']],
  giallorosso: ['Giallo → rosso', ['#ffffb2', '#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026', '#800026']],
  arancio: ['Arancio', ['#fff1d6', '#fdd49e', '#fdbb84', '#fc8d59', '#e34a33', '#b30000', '#7f0000']],
  verde: ['Verde', ['#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32']],
  acqua: ['Acqua', ['#e0f7f4', '#b2e8e0', '#7fd6cc', '#4cbdb5', '#2a9d9a', '#17787a', '#0b4f55']],
  viola: ['Viola', ['#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#3f007d']],
  grigi: ['Grigi', ['#f0f0f0', '#d9d9d9', '#bdbdbd', '#969696', '#737373', '#525252', '#252525']],
};

/* Le scale colore valgono anche per i grafici: --s1…--s7 seguono la scala scelta (stessa preferenza della mappa).
   «Blu» lascia i valori scritti a mano nel CSS di ogni tema. */
window.applicaScalaPNRR = (k) => {
  const r = document.documentElement, tema = window.SCALE_PNRR[k];
  for (let i = 1; i <= 7; i++) r.style.removeProperty('--s' + i);
  if (tema && k !== 'blu') {
    const rampa = tema[1].slice(); if (r.getAttribute('data-tone') === 'dark') rampa.reverse();
    rampa.forEach((c, i) => r.style.setProperty('--s' + (i + 1), c));
  }
  document.dispatchEvent(new CustomEvent('tema-cambia', { detail: { scala: k, tono: r.getAttribute('data-tone') } }));
};
const scalaSalvata = () => { try { const k = JSON.parse(localStorage.getItem('atlante-pnrr-mappa') || '{}').scala; return window.SCALE_PNRR[k] ? k : 'blu'; } catch (e) { return 'blu'; } };
(() => {
  const CHIAVE = 'atlante-pnrr-tema';
  const TEMI = { chiaro: ['light', 'light'], scuro: ['dark', 'dark'], seppia: ['sepia', 'light'], contrasto: ['contrast', 'light'], oceano: ['ocean', 'dark'] };
  const sistema = matchMedia('(prefers-color-scheme: dark)');
  const scelto = () => { try { const v = localStorage.getItem(CHIAVE); return TEMI[v] ? v : null; } catch (e) { return null; } };
  const decidi = () => scelto() || (sistema.matches ? 'scuro' : 'chiaro');
  function applica(t) {
    const [nome, tono] = TEMI[t];
    const r = document.documentElement; r.setAttribute('data-theme', nome); r.setAttribute('data-tone', tono);
    const s = document.getElementById('sel-tema'); if (s) s.value = scelto() || 'auto';
    const k = scalaSalvata(); r.style.removeProperty('--s1');
    if (k !== 'blu') { const rampa = window.SCALE_PNRR[k][1].slice(); if (tono === 'dark') rampa.reverse(); rampa.forEach((c, i) => r.style.setProperty('--s' + (i + 1), c)); } else for (let i = 1; i <= 7; i++) r.style.removeProperty('--s' + i);
    document.dispatchEvent(new CustomEvent('tema-cambia', { detail: { tema: t, tono } }));
  }
  applica(decidi());
  addEventListener('DOMContentLoaded', () => {
    applica(decidi());
    document.getElementById('sel-tema').addEventListener('change', (e) => {
      try { e.target.value === 'auto' ? localStorage.removeItem(CHIAVE) : localStorage.setItem(CHIAVE, e.target.value); } catch (err) {}
      applica(decidi());
    });
  });
  sistema.addEventListener('change', () => { if (!scelto()) applica(decidi()); });
})();
