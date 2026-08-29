/* ═══ E · Constellation ═════════════════════════════════════
   Twelve app-stars in the real sky. Each is authored as a position in the
   frame, converted once through the engine's own unproject() into an altitude
   and azimuth, and from then on projected like any catalogue star: it is
   occluded by the Earth's limb, it sits in the same projection as everything
   around it, and its screen position is derived rather than stored.

   Authoring in frame coordinates and converting, rather than picking altitudes
   and hoping, is what makes the figure composed instead of scattered. */
(() => {
  const host   = document.getElementById('stars');
  const svg    = document.getElementById('lines');
  const call   = document.getElementById('call');
  const field  = document.getElementById('lines').parentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flat   = () => matchMedia('(max-width:900px)').matches;

  /* Frame coordinates: x across the half-width, y up the half-height, both
     -1..1. Composed to leave the right third clear for the callout and to stay
     off the Earth's limb along the bottom. */
  const FRAME = [
    [-0.72,  0.52], [-0.44,  0.74], [-0.14,  0.56], [ 0.16,  0.70],
    [ 0.30,  0.34], [ 0.06,  0.16], [-0.24,  0.22], [-0.54,  0.14],
    [-0.80, -0.12], [-0.36, -0.28], [ 0.00, -0.46], [ 0.30, -0.16]
  ];
  /* The figure. Index pairs into ORDER, chosen to read as one joined shape
     rather than a chain, so no app is a dead end. */
  const EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2],[6,7],[7,0],
                 [7,8],[8,9],[9,10],[10,5],[10,11],[11,4]];

  host.innerHTML = ORDER.map((a, i) => `
    <li>
      <a class="star" href="${a.url}" data-i="${i}" data-on="false">
        <span class="star-mark" aria-hidden="true"><span class="star-core"></span></span>
        <span>
          <span class="star-name">${a.name}</span>
          <span class="star-desc">${a.desc}</span>
        </span>
      </a>
    </li>`).join('');
  const els = [...host.querySelectorAll('.star')];

  /* ── Frame position to a real sky position, once ──────────
     unproject() takes projection-plane coordinates and returns a direction, so
     it is exactly the inverse of what places a catalogue star. Doing this once
     at startup fixes each app at an altitude and azimuth it then keeps. */
  const sky = FRAME.map(([nx, ny]) => {
    const half = Math.min(W, H) / 2;
    const v = unproject(nx * (W/2) / SCALE, ny * (half) / SCALE);
    return { alt: Math.asin(Math.max(-1, Math.min(1, v[2]))),
             az:  Math.atan2(v[0], v[1]) };
  });

  const DEGS = Math.PI/180;
  const COMPASS = ['N','NE','E','SE','S','SW','W','NW'];
  const pos = new Array(sky.length);

  function locate(){
    for (let i=0; i<sky.length; i++){
      const p = project(dirOf(sky[i].alt, sky[i].az));
      if (!p){ pos[i] = null; continue; }
      const sx = CX + p[0]*SCALE, sy = CY - p[1]*SCALE;
      pos[i] = [ sx/W*VIEW_W, sy/H*VIEW_H ];
    }
  }

  function layout(){
    if (flat()){ svg.textContent = ''; return; }
    locate();
    svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
    for (let i=0; i<els.length; i++){
      if (!pos[i]) continue;
      els[i].style.left = pos[i][0] + 'px';
      els[i].style.top  = pos[i][1] + 'px';
    }
    drawFigure();
    if (active >= 0) drawLead(active);
  }

  function drawFigure(){
    const segs = EDGES.map(([a, b]) => {
      if (!pos[a] || !pos[b]) return '';
      const on = active === a || active === b;
      return `<line class="seg" data-on="${on}" x1="${pos[a][0]}" y1="${pos[a][1]}"
                    x2="${pos[b][0]}" y2="${pos[b][1]}"/>`;
    }).join('');
    svg.innerHTML = segs;
  }

  /* The leader out to the callout: star, elbow, then a short run into the rule
     the callout is hung on. Same three-segment shape the engine draws for a
     planet, pointed at a panel instead of a margin. */
  function drawLead(i){
    if (!pos[i]) return;
    const box = call.getBoundingClientRect();
    const fx = field.getBoundingClientRect();
    const tx = box.left - fx.left, ty = box.top - fx.top + box.height/2;
    const [sx, sy] = pos[i];
    if (tx - sx < 40) return;                       // too close to bother
    const elbow = tx - 26;
    const d = `M ${sx + 9} ${sy} L ${elbow} ${sy} L ${elbow} ${ty} L ${tx - 4} ${ty}`;
    svg.insertAdjacentHTML('beforeend',
      `<path class="lead ${reduce ? '' : 'lead-draw'}" d="${d}" pathLength="1"/>`);
  }

  /* ── Selection ────────────────────────────────────────── */
  const IDLE = `<div class="call-in"><p class="call-idle"><b>Twelve apps, joined
    into one figure.</b> Each sits at a real altitude and azimuth in tonight's sky
    over Michigan, and is occluded by the Earth like anything else out there.
    Pick a star.</p></div>`;

  let active = -1;
  function select(i){
    if (i === active) return;
    active = i;
    els.forEach((el, k) => el.dataset.on = String(k === i));
    if (flat()) return;
    drawFigure();
    if (i < 0){ call.innerHTML = IDLE; return; }
    drawLead(i);
    const a = ORDER[i], s = sky[i];
    const dir = COMPASS[Math.round((((s.az/DEGS)%360)+360)%360 / 45) % 8];
    call.innerHTML = `
      <div class="call-in">
        <h2 class="call-name">${a.name}</h2>
        <p class="call-desc">${a.desc}</p>
        ${a.note ? `<p class="call-note">${a.note}</p>` : ''}
        <span class="call-coord">alt ${Math.round(s.alt/DEGS)}&deg; &middot; az ${dir}</span>
      </div>`;
  }
  call.innerHTML = IDLE;

  els.forEach((el, i) => {
    el.addEventListener('mouseenter', () => select(i));
    el.addEventListener('focus',      () => select(i));
  });
  host.addEventListener('mouseleave', () => {
    if (!host.contains(document.activeElement)) select(-1);
  });

  layout();
  addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
})();
