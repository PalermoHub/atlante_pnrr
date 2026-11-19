/* Pulsante «Porta in cima»: compare dopo un po' di scorrimento, sulla colonna delle schede (desktop) o sulla pagina (mobile, statistiche). */
(function () {
  /* altezza della testata fissa: serve ai salti d'ancora e alle intestazioni di tabella */
  const top = document.querySelector(".top");
  if (top) { const m = () => document.documentElement.style.setProperty("--top-h", top.offsetHeight + "px"); m(); if (window.ResizeObserver) new ResizeObserver(m).observe(top); else addEventListener("resize", m); }
  const scheda = document.getElementById("scheda");
  const b = document.createElement("button");
  b.type = "button"; b.className = "in-cima"; b.hidden = true;
  b.setAttribute("aria-label", "Porta in cima"); b.title = "Porta in cima";
  b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(b);
  const scorre = () => scheda && scheda.scrollHeight > scheda.clientHeight + 4 && getComputedStyle(scheda).overflowY !== "visible";
  const pos = () => Math.max(window.scrollY, scorre() ? scheda.scrollTop : 0);
  const aggiorna = () => { b.hidden = pos() < 400; };
  window.addEventListener("scroll", aggiorna, { passive: true });
  if (scheda) scheda.addEventListener("scroll", aggiorna, { passive: true });
  b.addEventListener("click", () => {
    const riduci = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const o = { top: 0, behavior: riduci ? "auto" : "smooth" };
    if (scorre()) scheda.scrollTo(o);
    window.scrollTo(o);
    (scheda || document.querySelector("main")).focus?.({ preventScroll: true });
  });
})();
