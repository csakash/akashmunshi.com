// akashmunshi.com behaviour: reveals, header, counters, pencil sketches, product glimpses.
// Loaded with defer after vendor/rough-4.6.6.js. No other dependencies.
(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- header ---------- */
const hdr = $('#hdr'), menu = $('#menu');
addEventListener('scroll', () => hdr.classList.toggle('scrolled', scrollY > 8), { passive: true });
menu && menu.addEventListener('click', () => {
  const open = hdr.classList.toggle('open');
  menu.setAttribute('aria-expanded', open);
  menu.textContent = open ? 'Close' : 'Menu';
});
$$('.nav a').forEach(a => a.addEventListener('click', () => { hdr.classList.remove('open'); menu.textContent = 'Menu'; menu.setAttribute('aria-expanded', false); }));

/* ---------- reveals ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  $$('.bl', e.target).forEach(b => b.classList.add('in'));
  io.unobserve(e.target);
}), { rootMargin: '0px 0px -8% 0px', threshold: .05 });
$$('[data-r], .bl, .h2, .h1').forEach(el => io.observe(el));
// headlines live inside cells: reveal their line masks with the cell
$$('.h1, .h2').forEach(h => h.setAttribute('data-r', ''));

/* ---------- counters ---------- */
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || '';
  cio.unobserve(el);
  if (REDUCED) return;
  const t0 = performance.now(), D = 1400;
  const tick = t => { const p = Math.min(1, (t - t0) / D), v = Math.round(to * (1 - Math.pow(1 - p, 3))); el.textContent = v + suf; if (p < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}), { threshold: .4 });
$$('[data-count]').forEach(el => cio.observe(el));

/* ---------- pencil sketches (rough.js) ---------- */
const SVGNS = 'http://www.w3.org/2000/svg', PENCIL = '#2b2b29', PAPER = '#fcfbf8';
const HAND = '"Architects Daughter", "Comic Sans MS", cursive';
function sketch(svg, w, h, seed, draw){
  if (!svg || !window.rough) return;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.textContent = '';
  const rc = rough.svg(svg); let s = seed;
  const opt = e => Object.assign({ stroke: PENCIL, strokeWidth: 1.2, roughness: 1.3, bowing: 1, seed: s++, hachureGap: 5, hachureAngle: -41, fillWeight: .8 }, e);
  const put = n => (svg.appendChild(n), n);
  const k = {
    rect: (x, y, w, h, e) => put(rc.rectangle(x, y, w, h, opt(e))),
    card: (x, y, w, h, e) => put(rc.rectangle(x, y, w, h, opt(Object.assign({ fill: PAPER, fillStyle: 'solid' }, e)))),
    line: (x1, y1, x2, y2, e) => put(rc.line(x1, y1, x2, y2, opt(e))),
    circle: (x, y, d, e) => put(rc.circle(x, y, d, opt(e))),
    ellipse: (x, y, w, h, e) => put(rc.ellipse(x, y, w, h, opt(e))),
    path: (d, e) => put(rc.path(d, opt(e))),
    hatch: (x, y, w, h, e) => put(rc.rectangle(x, y, w, h, opt(Object.assign({ stroke: 'none', fill: PENCIL, fillStyle: 'hachure' }, e)))),
    scribble: (x, y, w, e) => { const n = Math.max(2, Math.round(w / 9)); let d = `M${x} ${y}`; for (let i = 0; i < n; i++) d += ` q ${w/n/2} ${i % 2 ? 2.4 : -2.4} ${w/n} 0`; return put(rc.path(d, opt(Object.assign({ roughness: .8, strokeWidth: 1 }, e)))); },
    text: (x, y, str, o = {}) => { const t = document.createElementNS(SVGNS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('font-family', HAND); t.setAttribute('font-size', o.size || 15); t.setAttribute('fill', PENCIL); if (o.anchor) t.setAttribute('text-anchor', o.anchor); if (o.rot) t.setAttribute('transform', `rotate(${o.rot} ${x} ${y})`); t.textContent = str; return put(t); },
    arrow: (x1, y1, x2, y2, bend = .25, e) => {
      const mx = (x1 + x2)/2 - (y2 - y1)*bend, my = (y1 + y2)/2 + (x2 - x1)*bend;
      put(rc.path(`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, opt(Object.assign({ roughness: .9 }, e))));
      const a = Math.atan2(y2 - my, x2 - mx), L = 9;
      put(rc.linearPath([[x2 - L*Math.cos(a - .45), y2 - L*Math.sin(a - .45)], [x2, y2], [x2 - L*Math.cos(a + .45), y2 - L*Math.sin(a + .45)]], opt(Object.assign({ roughness: .6 }, e))));
    },
  };
  draw(k);
  const ps = [...svg.querySelectorAll('path')];
  ps.forEach((p, i) => { p.setAttribute('pathLength', '1'); p.style.setProperty('--dl', (i/ps.length*1.6).toFixed(2) + 's'); });
}

// fig. 1: a laptop with six loops running, a coffee, a person with nothing left to do
function drawDesk(){
  sketch($('#sk-desk'), 300, 375, 11, k => {
    k.text(22, 40, '6 loops running', { size: 15, rot: -4 });
    k.arrow(80, 50, 118, 104, -.25);
    // laptop screen with six terminal panes
    k.card(60, 100, 180, 118);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const x = 70 + c * 56, y = 110 + r * 52;
      k.rect(x, y, 48, 44, { roughness: 1 });
      k.scribble(x + 6, y + 12, 34, { strokeWidth: .8 });
      k.scribble(x + 6, y + 22, 26, { strokeWidth: .8 });
      k.text(x + 8, y + 38, (r * 3 + c) % 3 === 0 ? '✓ PR' : '...', { size: 10 });
    }
    k.path('M44 218 L256 218 L272 240 L28 240 Z', { fill: PAPER, fillStyle: 'solid' });
    // coffee
    k.rect(232, 270, 34, 40, { roughness: 1.1 });
    k.path('M266 280 q 14 4 0 18', { strokeWidth: 1 });
    k.path('M240 262 q 4 -8 0 -14 M252 262 q 4 -8 0 -14', { strokeWidth: .8 });
    // person, arms crossed, watching
    k.circle(120, 296, 34);
    k.path('M88 362 q 32 -40 64 0', {});
    k.text(150, 340, 'me, waiting', { size: 14, rot: 3 });
    k.text(22, 262, '15-20 PRs/day', { size: 13, rot: -6 });
  });
}
const skio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); skio.unobserve(e.target); } }), { threshold: .2 });
function sketches(){ drawDesk(); $$('.sk').forEach(s => skio.observe(s)); }
(document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]) : Promise.resolve()).then(sketches);

})();
