/* Atlante PNRR · grafici a mano in SVG/canvas, nessuna libreria.
   Colori dalle variabili del tema (--s1…--s7, --c1…--c5), così seguono i 6 temi.
   Ogni funzione riceve `host` e `conTip(nodo, titolo, righe)` dalla pagina. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const nf = (n, d = 0) => Number(n).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
  const S = (tag, a = {}) => { const e = document.createElementNS(NS, tag); for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); return e; };
  const H = (tag, a = {}, kids = []) => {
    const e = document.createElement(tag);
    for (const k in a) if (a[k] != null) { if (k === 'text') e.textContent = a[k]; else e.setAttribute(k, a[k]); }
    [].concat(kids).forEach((c) => { if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  };
  const SC = ['--s7', '--s6', '--s5', '--s4', '--s3', '--s2', '--s1'];
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /* ---------- ciambella con legenda ---------- */
  function ciambella(host, { voci, formatta, centro = null, conTip = null, nome = 'Composizione' }) {
    const v = voci.filter((x) => x.val > 0);
    const tot = v.reduce((s, x) => s + x.val, 0) || 1;
    const R = 92, r = 56, C = 110;
    const svg = S('svg', { viewBox: '0 0 220 220', class: 'ciambella', role: 'img' });
    svg.setAttribute('aria-label', `${nome}: ` + v.map((x) => `${x.nome} ${formatta(x.val)} (${nf(100 * x.val / tot, 1)}%)`).join('; '));
    let a0 = -Math.PI / 2;
    const pt = (a, rg) => [C + rg * Math.cos(a), C + rg * Math.sin(a)];
    v.forEach((x, i) => {
      const q = x.val / tot, col = SC[Math.min(i, SC.length - 1)];
      const a1 = a0 + q * 2 * Math.PI - (v.length > 1 ? 0.012 : 0);
      let d;
      if (v.length === 1) d = `M${C} ${C - R}A${R} ${R} 0 1 1 ${C - 0.01} ${C - R}Z M${C} ${C - r}A${r} ${r} 0 1 0 ${C - 0.01} ${C - r}Z`;
      else {
        const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, r), [x3, y3] = pt(a0, r), g = q > 0.5 ? 1 : 0;
        d = `M${x0} ${y0}A${R} ${R} 0 ${g} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${g} 0 ${x3} ${y3}Z`;
      }
      const p = S('path', { d, class: 'fetta', 'fill-rule': 'evenodd', style: `fill:var(${col})`, tabindex: '0' });
      p.setAttribute('aria-label', `${x.nome}: ${formatta(x.val)}, ${nf(100 * q, 1)}%`);
      if (conTip) conTip(p, x.nome, [['Valore', formatta(x.val)], ['Quota', nf(100 * q, 1) + '%'], x.sub ? ['Dettaglio', x.sub] : null]);
      svg.append(p);
      x._col = col; a0 += q * 2 * Math.PI;
    });
    if (centro) {
      const t1 = S('text', { x: C, y: C - 1, 'text-anchor': 'middle', class: 'cia-centro', 'aria-hidden': 'true' }); t1.textContent = centro.valore;
      const t2 = S('text', { x: C, y: C + 16, 'text-anchor': 'middle', class: 'cia-sotto', 'aria-hidden': 'true' }); t2.textContent = centro.etichetta;
      svg.append(t1, t2);
    }
    const leg = H('ul', { class: 'cia-legenda' }, v.map((x) => H('li', {}, [
      H('span', { class: 'pastiglia', style: `background:var(${x._col})` }),
      H('span', { class: 'cia-nome' }, [H('b', { text: x.nome }), x.sub ? H('small', { text: x.sub }) : null]),
      H('span', { class: 'cia-val' }, [H('b', { text: formatta(x.val) }), H('small', { text: nf(100 * x.val / tot, 1) + '%' })]),
    ])));
    host.append(H('div', { class: 'cia-box' }, [svg, leg]));
  }

  /* ---------- barre orizzontali ordinate, colore per gruppo, tacca di riferimento ---------- */
  function barre(host, { voci, formatta, conTip = null, riferimento = null, rifNome = 'Italia', apri = null, nome = 'Barre' }) {
    const mx = Math.max(...voci.map((x) => x.val || 0), riferimento || 0) || 1;
    const box = H('div', { class: 'barre', role: 'list', 'aria-label': nome });
    voci.forEach((x) => {
      const w = 100 * (x.val || 0) / mx;
      const pista = H('div', { class: 'b-pista' }, [
        H('i', { class: 'b-riempi', style: `width:${Math.max(w, 0.4)}%;background:var(${x.col || '--s5'})` }),
        riferimento != null ? H('i', { class: 'b-rif', style: `left:${100 * riferimento / mx}%`, title: `${rifNome}: ${formatta(riferimento)}` }) : null,
      ]);
      const riga = H('div', { class: 'b-riga' + (apri ? ' clic' : ''), role: 'listitem', tabindex: '0' }, [
        H('span', { class: 'b-nome' }, [x.nome, x.sub ? H('small', { text: x.sub }) : null]), pista, H('b', { class: 'b-val', text: formatta(x.val) })]);
      riga.setAttribute('aria-label', `${x.nome}: ${formatta(x.val)}${x.sub ? ', ' + x.sub : ''}`);
      if (conTip) conTip(riga, x.nome, [['Valore', formatta(x.val)], riferimento != null ? [rifNome, formatta(riferimento)] : null, x.sub ? ['Dettaglio', x.sub] : null, ...(x.righe || [])]);
      if (apri) { riga.addEventListener('click', () => apri(x)); riga.addEventListener('keydown', (e) => { if (e.key === 'Enter') apri(x); }); }
      box.append(riga);
    });
    host.append(box);
  }

  /* ---------- colonne verticali (anche con tacca di soglia) ---------- */
  function colonne(host, opz) {
    const box = H('div', { class: 'col-scroll' }); host.append(box);
    let w0 = 0;
    const ridisegna = () => { const w = Math.round(box.clientWidth); if (w && w === w0) return; w0 = w; colonneSvg(box, opz, w); };
    ridisegna();
    if (window.ResizeObserver) new ResizeObserver(ridisegna).observe(box);
  }
  function colonneSvg(box, { voci, formatta, conTip = null, nome = 'Colonne', soglia = null, sogliaNome = '' }, avail) {
    const n = voci.length, mx = Math.max(...voci.map((x) => x.val || 0), soglia || 0) || 1;
    const larg0 = n <= 3 ? 88 : n <= 5 ? 76 : 64, larg = Math.max(larg0, Math.min(200, Math.floor(((avail || 0) - 16) / n))), W = n * larg + 16, x0 = 8, top = 26, h = 150, bot = 34;
    const svg = S('svg', { viewBox: `0 0 ${W} ${top + h + bot}`, class: 'colonne', role: 'img' });
    if (avail && W > avail) { svg.style.width = '100%'; svg.style.height = 'auto'; } else { svg.style.width = W + 'px'; } svg.style.maxWidth = '100%'; /* se non ci sta, si rimpicciolisce: niente scroll orizzontale */ /* dimensione naturale: i caratteri non si ingrandiscono con poche colonne */
    svg.setAttribute('aria-label', `${nome}: ` + voci.map((x) => `${x.nome} ${formatta(x.val)}`).join('; '));
    svg.append(S('line', { x1: x0, x2: W - x0, y1: top + h, y2: top + h, class: 'col-asse' }));
    voci.forEach((x, i) => {
      const bw = larg - 22, bx = x0 + i * larg + 11, bh = Math.max(1.5, h * (x.val || 0) / mx);
      const g = S('g', { class: 'col', tabindex: '0' });
      g.setAttribute('aria-label', `${x.nome}: ${formatta(x.val)}${x.sub ? ', ' + x.sub : ''}`);
      g.append(S('rect', { x: bx, y: top + h - bh, width: bw, height: bh, rx: 2, class: 'col-barra', style: `fill:var(${x.col || '--s5'})` }));
      const v = S('text', { x: bx + bw / 2, y: top + h - bh - 6, 'text-anchor': 'middle', class: 'col-val', 'aria-hidden': 'true' }); v.textContent = formatta(x.val);
      const l = S('text', { x: bx + bw / 2, y: top + h + 17, 'text-anchor': 'middle', class: 'col-nome', 'aria-hidden': 'true' }); l.textContent = x.nome;
      g.append(v, l, S('rect', { x: bx - 11, y: 0, width: larg, height: top + h + bot, fill: 'transparent' }));
      if (x.sotto) { const l2 = S('text', { x: bx + bw / 2, y: top + h + 30, 'text-anchor': 'middle', class: 'col-sotto', 'aria-hidden': 'true' }); l2.textContent = x.sotto; g.append(l2); }
      if (conTip) conTip(g, x.nome, [['Valore', formatta(x.val)], x.sub ? ['Dettaglio', x.sub] : null]);
      svg.append(g);
    });
    if (soglia != null) {
      const y = top + h - h * soglia / mx;
      svg.append(S('line', { x1: x0, x2: W - x0, y1: y, y2: y, class: 'col-soglia' }));
      const t = S('text', { x: W - x0, y: y - 4, 'text-anchor': 'end', class: 'col-soglia-t' }); t.textContent = sogliaNome; svg.append(t);
    }
    box.replaceChildren(svg);
  }

  /* ---------- tabella a colori: righe × colonne, scala propria per colonna ---------- */
  function calore(host, { righe, colonne: cols, apri = null, capo = 'Territorio' }) {
    const sc = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7'];
    const t = H('table', { class: 'calore' });
    t.append(H('thead', {}, H('tr', {}, [H('th', { scope: 'col', text: capo })].concat(cols.map((c) => H('th', { scope: 'col', class: 'num' }, [H('span', { text: c.nome }), c.sub ? H('small', { text: c.sub }) : null]))))));
    const lim = cols.map((c) => { const v = righe.map((r) => c.valori[r.id]).filter((x) => x != null); return [Math.min(...v), Math.max(...v)]; });
    const corpo = H('tbody');
    righe.forEach((r) => {
      const tr = H('tr'); tr.append(H('th', { scope: 'row' }, apri ? H('a', { href: apri(r), text: r.nome }) : r.nome));
      cols.forEach((c, k) => {
        const v = c.valori[r.id], [mn, mx] = lim[k];
        if (v == null) { tr.append(H('td', { class: 'num vuota', text: '–' })); return; }
        const b = mx > mn ? Math.min(6, Math.floor(7 * (v - mn) / (mx - mn))) : 3;
        const td = H('td', { class: 'num cal-' + (b + 1), style: `background:var(${sc[b]})`, text: c.formatta(v) });
        td.title = `${r.nome} · ${c.nome}: ${c.formatta(v)}`; tr.append(td);
      });
      corpo.append(tr);
    });
    t.append(corpo);
    host.append(H('div', { class: 'cal-scroll' }, t), H('div', { class: 'cal-leg' }, [H('span', { text: 'più basso' })].concat(sc.map((x) => H('i', { style: `background:var(${x})` })), [H('span', { text: 'più alto' })])));
  }

  /* ---------- dispersione su canvas (migliaia di punti), assi logaritmici ---------- */
  function dispersione(host, { punti, xNome, yNome, xFmt, yFmt, nome = 'Dispersione', mediane = null, gruppi = [], evidenzia = null }) {
    const W = 760, Hh = 400, m = { l: 62, r: 14, t: 12, b: 44 };
    const cv = H('canvas', { width: W * 2, height: Hh * 2, class: 'disp', role: 'img' });
    cv.style.aspectRatio = `${W} / ${Hh}`;
    cv.setAttribute('aria-label', nome);
    const ctx = cv.getContext('2d'); ctx.scale(2, 2);
    const xs = punti.map((p) => p.x), ys = punti.map((p) => p.y);
    const lx = (v) => Math.log10(v);
    let x0 = Math.floor(lx(Math.min(...xs))), x1 = Math.ceil(lx(Math.max(...xs)));
    let y0 = Math.floor(lx(Math.max(1, Math.min(...ys)))), y1 = Math.ceil(lx(Math.max(...ys)));
    if (x1 <= x0) x1 = x0 + 1; if (y1 <= y0) y1 = y0 + 1;
    const X = (v) => m.l + (lx(v) - x0) / (x1 - x0) * (W - m.l - m.r), Y = (v) => Hh - m.b - (lx(Math.max(v, 1)) - y0) / (y1 - y0) * (Hh - m.t - m.b);
    const ink = css('--ink2') || '#555', line = css('--line') || '#ddd';
    ctx.font = '11px system-ui'; ctx.fillStyle = ink; ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (let e = x0; e <= x1; e++) { const x = X(10 ** e); ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, Hh - m.b); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(xFmt(10 ** e), x, Hh - m.b + 15); }
    for (let e = y0; e <= y1; e++) { const y = Y(10 ** e); ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(W - m.r, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(yFmt(10 ** e), m.l - 6, y + 4); }
    ctx.textAlign = 'center'; ctx.fillText(xNome, (m.l + W - m.r) / 2, Hh - 6);
    ctx.save(); ctx.translate(12, (m.t + Hh - m.b) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yNome, 0, 0); ctx.restore();
    const cols = gruppi.map((g) => css(g.col));
    ctx.globalAlpha = 0.5;
    punti.forEach((p) => { ctx.fillStyle = cols[p.g] || ink; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 2, 0, 6.3); ctx.fill(); });
    ctx.globalAlpha = 1;
    if (evidenzia) {
      const ex = X(evidenzia.x), ey = Y(evidenzia.y), rosso = css('--bad') || '#c00';
      ctx.strokeStyle = rosso; ctx.fillStyle = rosso; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, 6.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0, 6.3); ctx.fill();
      ctx.font = 'bold 12px system-ui'; ctx.textAlign = ex > W - 140 ? 'right' : 'left'; ctx.fillText(evidenzia.nome, ex + (ex > W - 140 ? -11 : 11), ey - 9);
    }
    if (mediane) { ctx.strokeStyle = css('--ink') || '#000'; ctx.lineWidth = 2.2; ctx.beginPath(); mediane.forEach((q, i) => { i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)); }); ctx.stroke(); }
    const leg = H('div', { class: 'disp-leg' }, gruppi.map((g) => H('span', {}, [H('i', { style: `background:var(${g.col})` }), g.nome])).concat(mediane ? [H('span', {}, [H('i', { class: 'linea' }), 'mediana per fascia'])] : []));
    host.append(H('div', { class: 'disp-box' }, [cv, leg]));
  }

  /* ---------- curva di Lorenz ---------- */
  function lorenz(host, { curva, evidenzia = [], nome = 'Curva di Lorenz', xNome, yNome, conTip = null }) {
    const W = 360, Hh = 330, m = { l: 46, r: 14, t: 12, b: 42 };
    const svg = S('svg', { viewBox: `0 0 ${W} ${Hh}`, class: 'lorenz', role: 'img' });
    svg.setAttribute('aria-label', nome);
    const X = (v) => m.l + v * (W - m.l - m.r), Y = (v) => Hh - m.b - v * (Hh - m.t - m.b);
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      svg.append(S('line', { x1: X(0), x2: X(1), y1: Y(t), y2: Y(t), class: 'l-gr' }), S('line', { x1: X(t), x2: X(t), y1: Y(0), y2: Y(1), class: 'l-gr' }));
      const a = S('text', { x: m.l - 6, y: Y(t) + 4, 'text-anchor': 'end', class: 'l-tk' }); a.textContent = nf(100 * t) + '%';
      const b = S('text', { x: X(t), y: Hh - m.b + 15, 'text-anchor': 'middle', class: 'l-tk' }); b.textContent = nf(100 * t) + '%'; svg.append(a, b);
    });
    svg.append(S('line', { x1: X(0), y1: Y(0), x2: X(1), y2: Y(1), class: 'l-eq' }));
    const d = curva.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
    svg.append(S('path', { d: d + `L${X(1)} ${Y(0)}L${X(0)} ${Y(0)}Z`, class: 'l-area' }), S('path', { d, class: 'l-curva' }));
    evidenzia.forEach((e) => {
      const c = S('circle', { cx: X(e.x), cy: Y(e.y), r: 4.5, class: 'l-pt', tabindex: '0' });
      c.setAttribute('aria-label', e.testo);
      if (conTip) conTip(c, e.titolo, [['', e.testo]]);
      svg.append(c);
    });
    const tx = S('text', { x: (m.l + W - m.r) / 2, y: Hh - 6, 'text-anchor': 'middle', class: 'l-ax' }); tx.textContent = xNome;
    const ty = S('text', { x: 12, y: (m.t + Hh - m.b) / 2, 'text-anchor': 'middle', class: 'l-ax', transform: `rotate(-90 12 ${(m.t + Hh - m.b) / 2})` }); ty.textContent = yNome;
    svg.append(tx, ty);
    host.append(H('div', { class: 'lorenz-box' }, svg));
  }

  /* ---------- imbuto: barre decrescenti con salto tra un passo e il successivo ---------- */
  function imbuto(host, { passi, formatta, conTip = null }) {
    const mx = Math.max(...passi.map((p) => p.val)) || 1;
    const box = H('div', { class: 'imb' });
    passi.forEach((p, i) => {
      const prec = i ? passi[i - 1].val : null;
      const riga = H('div', { class: 'imb-riga', tabindex: '0' }, [
        H('span', { class: 'imb-nome' }, [p.nome, p.sub ? H('small', { text: p.sub }) : null]),
        H('div', { class: 'imb-pista' }, H('i', { style: `width:${Math.max(100 * p.val / mx, 0.5)}%;background:var(${SC[Math.min(i * 1 + 1, 5)]})` })),
        H('span', { class: 'imb-val' }, [H('b', { text: formatta(p.val) }), H('small', { text: nf(100 * p.val / passi[0].val, 1) + '% del finanziato' + (prec ? ` · ${nf(100 * p.val / prec, 0)}% del passo prima` : '') })]),
      ]);
      riga.setAttribute('aria-label', `${p.nome}: ${formatta(p.val)}, ${nf(100 * p.val / passi[0].val, 1)}% del finanziato`);
      if (conTip) conTip(riga, p.nome, [['Importo', formatta(p.val)], ['Sul finanziato', nf(100 * p.val / passi[0].val, 1) + '%'], p.sub ? ['Nota', p.sub] : null]);
      box.append(riga);
    });
    host.append(box);
  }

  /* tooltip condiviso: un solo nodo, sul puntatore o sul fuoco da tastiera */
  let tip = null;
  function conTip(nodo, titolo, righe) {
    const mostra = (x, y) => {
      if (!tip) { tip = H('div', { class: 'tip', 'aria-hidden': 'true', hidden: '' }); document.body.append(tip); }
      tip.replaceChildren(H('b', { text: titolo }), ...righe.filter(Boolean).map((r) => H('div', {}, [r[0] ? H('span', { text: r[0] + ': ' }) : null, r[1]])));
      tip.hidden = false;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.min(Math.max(8, x + 14), innerWidth - w - 8) + 'px'; tip.style.top = Math.min(y + 14, innerHeight - h - 8) + 'px';
    };
    nodo.addEventListener('pointermove', (e) => mostra(e.clientX, e.clientY));
    nodo.addEventListener('pointerleave', () => { if (tip) tip.hidden = true; });
    nodo.addEventListener('focus', () => { const b = nodo.getBoundingClientRect(); mostra(b.left + b.width / 2, b.top + b.height / 2); });
    nodo.addEventListener('blur', () => { if (tip) tip.hidden = true; });
  }

  window.GraficiPNRR = { conTip, ciambella, barre, colonne, calore, dispersione, lorenz, imbuto };
})();
