/* Consenso alle statistiche (GDPR + linee guida del Garante). Google Analytics NON parte all'avvio: solo dopo un consenso esplicito.
   La scelta sta in localStorage (nessun cookie proprio) e si cambia in ogni momento da «Preferenze cookie» (Info, Privacy). */
(() => {
  const ID = 'G-KHR1GHDRQS', CHIAVE = 'atlante-pnrr-consenso'; /* 'accettato' | 'rifiutato' */
  const leggi = () => { try { return localStorage.getItem(CHIAVE); } catch (e) { return null; } };
  const salva = (v) => { try { localStorage.setItem(CHIAVE, v); } catch (e) { /* navigazione privata: vale per questa visita */ } };

  function caricaAnalytics() {
    if (document.querySelector('script[data-analytics]')) return;
    const s = document.createElement('script'); s.async = true; s.dataset.analytics = '1'; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID; document.head.append(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ID, { anonymize_ip: true, cookie_expires: 13 * 30 * 86400, cookie_flags: 'SameSite=None;Secure' });
  }
  function eliminaCookie() {
    for (const p of document.cookie.split(';')) {
      const n = p.split('=')[0].trim();
      if (n === '_ga' || n.startsWith('_ga_') || n.startsWith('_gid')) {
        for (const d of [location.hostname, '.' + location.hostname]) document.cookie = n + '=; Max-Age=0; path=/; domain=' + d;
        document.cookie = n + '=; Max-Age=0; path=/';
      }
    }
  }

  let riquadro = null;
  function mostra(subito) {
    if (riquadro) return;
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; return e; };
    riquadro = el('section', 'consenso');
    riquadro.setAttribute('role', 'dialog'); riquadro.setAttribute('aria-modal', 'false'); riquadro.setAttribute('aria-labelledby', 'cons-t'); riquadro.setAttribute('aria-describedby', 'cons-d');
    const t = el('h2', 'consenso-t', 'Statistiche di uso: decidi tu'); t.id = 'cons-t';
    const d = el('p', 'consenso-d'); d.id = 'cons-d';
    const a1 = el('a', '', 'Google Analytics'); a1.href = 'https://policies.google.com/privacy'; a1.target = '_blank'; a1.rel = 'noopener';
    const a2 = el('a', '', 'informativa privacy'); a2.href = 'privacy.html';
    d.append('L’atlante funziona senza cookie. Se accetti, usiamo ', a1, ' in forma anonima per capire quali pagine servono. Puoi cambiare idea quando vuoi: ', a2, '.');
    const az = el('div', 'consenso-az');
    const si = el('button', 'consenso-si', 'Accetto le statistiche'); si.type = 'button';
    const no = el('button', 'consenso-no', 'Solo necessario'); no.type = 'button';
    const chiudi = () => { riquadro.remove(); riquadro = null; };
    si.addEventListener('click', () => { salva('accettato'); caricaAnalytics(); chiudi(); });
    no.addEventListener('click', () => { salva('rifiutato'); eliminaCookie(); chiudi(); });
    az.append(si, no); riquadro.append(t, d, az); document.body.append(riquadro);
    if (subito) si.focus();
  }
  window.apriPreferenzeCookie = () => mostra(true);

  function avvia() {
    const s = leggi();
    if (s === 'accettato') caricaAnalytics(); else if (s !== 'rifiutato') mostra(false);
    document.addEventListener('click', (e) => { if (e.target.closest('[data-preferenze-cookie]')) { e.preventDefault(); document.querySelector('dialog[open]')?.close(); mostra(true); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
