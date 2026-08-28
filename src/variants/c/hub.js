/* ═══ C · Dissolve ══════════════════════════════════════════
   Each panel owns a small canvas and paints its own ordered-dithered fill. The
   panel is drawn at a third of its CSS size and scaled back up with
   image-rendering:pixelated, which is exactly how the sky behind it is drawn -
   so the two share a pixel grid and the panel's edge dissolves into the star
   field rather than ending on a border.

   Hover, focus and touch all set the same `lit` target. A panel animates toward
   it, and only panels still moving are redrawn, so a still page costs nothing. */
(() => {
  const host = document.getElementById('panels');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  host.innerHTML = ORDER.map(a => `
    <a class="panel" href="${a.url}" data-lit="false">
      <canvas class="panel-bg" aria-hidden="true"></canvas>
      <span class="panel-inner">
        <span class="panel-icon">${iconSVG(a.id)}</span>
        <span class="panel-copy">
          <span class="panel-name">${a.name}</span>
          <span class="panel-desc">${a.desc}</span>
          ${a.note ? `<span class="panel-note">${a.note}</span>` : ''}
        </span>
      </span>
    </a>`).join('');

  /* Same recurrence the sky uses. Repeated here rather than shared because the
     engine's matrix is sized by its own options and this one must stay 8x8:
     the panels want visible grain, the sky does not. */
  const BAY = (() => {
    let m = [[0]];
    while (m.length < 8){
      const k = m.length, out = [];
      for (let y=0; y<k*2; y++){
        out[y] = [];
        for (let x=0; x<k*2; x++)
          out[y][x] = m[y%k][x%k]*4 + (y<k ? (x<k?0:2) : (x<k?3:1));
      }
      m = out;
    }
    return m.map(r => r.map(v => (v+0.5)/64));
  })();

  const DIV = 3;                       // CSS pixels per drawn pixel
  const FEATHER = 10;                  // drawn pixels the edge dissolves over
  /* Cool at rest, warm when lit: the fill crosses the same ground the sky does
     between its deep ramp and the limb's glow. */
  /* The plate sits DARKER than the sky at rest and brighter than it when lit.
     A fill that merely tints the sky disappears against the deep field and goes
     mushy over the bright limb; a dark plate reads against both, and gives the
     white type one consistent ground wherever the panel happens to sit. */
  const COLD = [12, 17, 32], WARM = [44, 60, 98], RIM = [232, 193, 112];

  const panels = [...host.querySelectorAll('.panel')].map(el => ({
    el, cv: el.querySelector('.panel-bg'), ctx: null,
    w: 0, h: 0, lit: 0, target: 0
  }));

  function paint(p){
    const { ctx, w, h, lit } = p;
    if (!ctx || !w || !h) return;
    const img = ctx.createImageData(w, h), px = img.data;
    /* The dither governs two things, and transparency is not one of them past
       the edge. Inside FEATHER of a border it thresholds coverage, so the plate
       breaks up into the sky; everywhere inside that band it modulates
       brightness instead, which gives the surface its grain while staying
       opaque. Letting it punch holes through the interior looked right over the
       deep field and fell apart over the limb, where the holes are near-white.

       Lighting a panel raises both: coverage recruits pixels outward at the
       edge, and the grain and base both brighten. */
    const gain = 0.72 + 0.28*lit;
    const grain = 12 + 10*lit;
    for (let y=0; y<h; y++){
      for (let x=0; x<w; x++){
        const edge = Math.min(x, y, w-1-x, h-1-y);
        const f = Math.min(1, (edge + 1) / FEATHER);
        const t = BAY[y & 7][x & 7];
        const o = (y*w + x)*4;
        if (f < 1 && f * gain <= t) continue;          // dithered away at the edge
        /* A brighter seam one drawn-pixel in from the top and left edges, which
           is where the glass tiles carry their specular. Same read, made of
           dither instead of a gradient border. */
        const seam = (edge <= 1) ? 1 : 0;
        const k = 0.7 + 0.3*f;                         // edges sit slightly darker
        const g = (t - 0.5) * grain;
        for (let i=0; i<3; i++){
          const base = COLD[i] + (WARM[i] - COLD[i]) * lit;
          px[o+i] = seam ? Math.min(255, base + RIM[i]*(0.20 + 0.40*lit))
                         : Math.max(0, Math.min(255, base * k + g));
        }
        px[o+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function measure(p){
    const r = p.el.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width / DIV));
    const h = Math.max(1, Math.round(r.height / DIV));
    if (w === p.w && h === p.h) return false;
    p.w = w; p.h = h;
    p.cv.width = w; p.cv.height = h;
    p.ctx = p.cv.getContext('2d');
    return true;
  }

  /* Only panels whose lit value is still moving get repainted, so a page nobody
     is pointing at draws nothing at all. */
  let running = false;
  function step(){
    let moving = false;
    for (const p of panels){
      if (Math.abs(p.target - p.lit) < 0.004){ p.lit = p.target; continue; }
      p.lit += (p.target - p.lit) * 0.28;
      paint(p);
      moving = true;
    }
    running = moving;
    if (moving) requestAnimationFrame(step);
  }
  function light(p, on){
    p.target = on ? 1 : 0;
    p.el.dataset.lit = String(on);
    if (reduce){ p.lit = p.target; paint(p); return; }
    if (!running){ running = true; requestAnimationFrame(step); }
  }

  for (const p of panels){
    p.el.addEventListener('mouseenter', () => light(p, true));
    p.el.addEventListener('mouseleave', () => light(p, false));
    p.el.addEventListener('focus',      () => light(p, true));
    p.el.addEventListener('blur',       () => light(p, false));
  }

  function layout(){ for (const p of panels) if (measure(p)) paint(p); }
  layout();
  /* Panel height follows its copy, which follows the column width, so the
     observer catches reflows a resize listener would miss. */
  if (window.ResizeObserver) new ResizeObserver(layout).observe(host);
  else addEventListener('resize', layout);
  /* Web fonts land after first paint and change the copy's height. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
