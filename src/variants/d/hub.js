/* ═══ D · Orbit ═════════════════════════════════════════════
   A real plot, not a decoration. Ring radii are the planets' semi-major axes to
   scale, each planet is drawn at the heliocentric longitude the shared engine
   computes for today, and the apps are additional bodies sharing those orbits.
   Everything astronomical here is read from sky.js: helio(), ELEM and T_CENT
   are the engine's, so this diagram and the star field behind it cannot
   disagree about where anything is. */
(() => {
  const plot   = document.getElementById('plot');
  const cv     = document.getElementById('plotbg');
  const arcs   = document.getElementById('arcs');
  const list   = document.getElementById('nodes');
  const panel  = document.getElementById('panel');
  const ctx    = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flat   = () => matchMedia('(max-width:900px)').matches;

  /* Three rings carry the apps, scaled by the real semi-major axis of the
     planet each one belongs to. Mercury is drawn but carries nothing: at 0.39AU
     its ring is too tight to seat a label on. */
  const RINGS = [
    { planet:'Venus', a:ELEM.Venus[0],  count:4 },
    { planet:'Earth', a:ELEM.Earth[0],  count:4 },
    { planet:'Mars',  a:ELEM.Mars[0],   count:4 }
  ];
  const A_MAX = ELEM.Mars[0];

  /* Apps are dealt onto the rings in catalogue order, so the reading order of
     the list fallback and the order around the plot are the same sequence. */
  let n = 0;
  const seats = RINGS.flatMap((ring, ri) =>
    Array.from({ length: ring.count }, (_, k) => ({
      app: ORDER[n++], ring: ri,
      /* Seats are spread evenly and each ring is rotated off the last, so
         nothing on an inner ring hides behind something on an outer one. */
      theta: (k / ring.count) * Math.PI*2 + ri * 0.42 - Math.PI/2
    })));

  list.innerHTML = seats.map((s, i) => `
    <li>
      <a class="node" href="${s.app.url}" data-i="${i}" data-on="false">
        <span class="node-dot">${iconSVG(s.app.id)}</span>
        <span>
          <span class="node-name">${s.app.name}</span>
          <span class="node-desc">${s.app.desc}</span>
        </span>
      </a>
    </li>`).join('');
  const nodes = [...list.querySelectorAll('.node')];

  /* ── Geometry ─────────────────────────────────────────── */
  let CX = 0, CY = 0, R = 0, DIV = 3, w = 0, h = 0;
  const ringR = i => (RINGS[i].a / A_MAX) * R;

  function measure(){
    const b = plot.getBoundingClientRect();
    R  = Math.min(b.width, b.height) * 0.44;
    CX = b.width/2; CY = b.height/2;
    w = Math.max(1, Math.round(b.width  / DIV));
    h = Math.max(1, Math.round(b.height / DIV));
    cv.width = w; cv.height = h;
    arcs.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
    return b;
  }

  /* ── The plot itself ──────────────────────────────────── */
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

  /* One dithered ring. `weight` is how much of the circumference survives the
     threshold, so lighting a ring is a coverage change rather than an opacity
     change - the same move the panels in variant C make. */
  function ring(cx, cy, rad, thick, col, weight){
    const r0 = rad - thick, r1 = rad + thick;
    const x0 = Math.max(0, (cx-r1)|0), x1 = Math.min(w-1, (cx+r1+1)|0);
    const y0 = Math.max(0, (cy-r1)|0), y1 = Math.min(h-1, (cy+r1+1)|0);
    for (let y=y0; y<=y1; y++){
      for (let x=x0; x<=x1; x++){
        const d = Math.hypot(x-cx, y-cy);
        if (d < r0 || d > r1) continue;
        const f = 1 - Math.abs(d-rad)/thick;          // 1 on the line, 0 at its edges
        if (f*weight <= BAY[y & 7][x & 7]) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  function disc(cx, cy, rad, ramp, bloom){
    const outer = rad*bloom;
    const x0 = Math.max(0, (cx-outer)|0), x1 = Math.min(w-1, (cx+outer+1)|0);
    const y0 = Math.max(0, (cy-outer)|0), y1 = Math.min(h-1, (cy+outer+1)|0);
    for (let y=y0; y<=y1; y++){
      for (let x=x0; x<=x1; x++){
        const d = Math.hypot(x-cx, y-cy);
        if (d > outer) continue;
        const t = BAY[y & 7][x & 7];
        let c;
        if (d <= rad){
          c = ramp[Math.min(ramp.length-1, ((d/rad)*(ramp.length-1) + t*0.9)|0)];
        } else {
          const g = 1 - (d-rad)/(outer-rad);
          if (g*g <= t) continue;                     // the dither is the falloff
          c = ramp[ramp.length-1];
        }
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const SUN_RAMP   = [[255,248,222],[255,232,168],[236,190,116],[178,136,78]];
  const PLAN_RAMP  = [[214,228,255],[150,178,226],[96,124,176],[60,82,124]];

  /* Heliocentric longitude, measured in the ecliptic plane. This is the same
     helio() the star field uses; here only x and y matter, because the whole
     point of the view is that it looks straight down the z axis. */
  function longitudeOf(name){
    const p = helio(name, T_CENT);
    return Math.atan2(p[1], p[0]);
  }

  let litRing = -1;
  function draw(){
    if (flat()) return;
    ctx.clearRect(0, 0, w, h);
    const cx = CX/DIV, cy = CY/DIV;

    /* Mercury's orbit, drawn for completeness and left empty. */
    ring(cx, cy, (ELEM.Mercury[0]/A_MAX)*R/DIV, 1.1, 'rgba(150,170,210,.30)', 0.5);

    RINGS.forEach((rg, i) => {
      const lit = i === litRing;
      ring(cx, cy, ringR(i)/DIV, lit ? 1.7 : 1.2,
           lit ? 'rgba(232,193,112,.95)' : 'rgba(150,170,210,.42)',
           lit ? 1 : 0.55);
    });

    /* Each planet at its true longitude for today. */
    for (const rg of RINGS.concat([{ planet:'Mercury', a:ELEM.Mercury[0] }])){
      const th = longitudeOf(rg.planet);
      const rr = (rg.a/A_MAX)*R/DIV;
      disc(cx + Math.cos(th)*rr, cy + Math.sin(th)*rr,
           rg.planet === 'Earth' ? 2.2 : 1.8, PLAN_RAMP, 2.2);
    }

    disc(cx, cy, 5.2, SUN_RAMP, 2.8);
  }

  /* ── Seat the nodes on their rings ────────────────────── */
  function place(){
    const b = measure();
    for (let i=0; i<seats.length; i++){
      const s = seats[i];
      const rr = ringR(s.ring);
      nodes[i].style.left = (CX + Math.cos(s.theta)*rr) + 'px';
      nodes[i].style.top  = (CY + Math.sin(s.theta)*rr) + 'px';
    }
    draw();
    if (active >= 0) setArc(active); else arcs.textContent = '';
    return b;
  }

  /* ── The name, set along its own ring ─────────────────── */
  function setArc(i){
    const s = seats[i];
    const rr = ringR(s.ring) + 30;                   // outside the node itself
    const id = 'orbit-arc';
    /* One full circle, drawn as two半 arcs because an SVG arc cannot close on
       itself. Path length is 2*pi*r, so a fraction of it is an angle. */
    const d = `M ${CX+rr} ${CY} A ${rr} ${rr} 0 1 1 ${CX-rr} ${CY} A ${rr} ${rr} 0 1 1 ${CX+rr} ${CY}`;
    const off = (((s.theta + Math.PI*2) % (Math.PI*2)) / (Math.PI*2) * 100).toFixed(2);
    const name = s.app.name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const t = `<textPath href="#${id}" startOffset="${off}%" text-anchor="middle">${name}</textPath>`;
    arcs.innerHTML =
      `<defs><path id="${id}" d="${d}" fill="none"/></defs>` +
      `<text class="arc-halo">${t}</text><text class="arc-text">${t}</text>`;
  }

  /* ── Selection ────────────────────────────────────────── */
  const IDLE = `<div class="panel-in"><p class="panel-idle"><b>Twelve apps, plotted
    on the inner solar system.</b> Ring radii are the planets' real orbits to scale and
    every planet sits at its true longitude for tonight. Pick a body to read what it
    does.</p></div>`;

  let active = -1;
  function select(i){
    if (i === active) return;
    active = i;
    nodes.forEach((el, k) => el.dataset.on = String(k === i));
    litRing = i < 0 ? -1 : seats[i].ring;
    draw();
    if (i < 0){ arcs.textContent = ''; panel.innerHTML = IDLE; return; }
    setArc(i);
    const a = seats[i].app;
    panel.innerHTML = `
      <div class="panel-in">
        <h2 class="panel-name">${a.name}</h2>
        <p class="panel-desc">${a.desc}</p>
        ${a.note ? `<p class="panel-note">${a.note}</p>` : ''}
        <span class="panel-orbit">${RINGS[seats[i].ring].planet} orbit &middot;
          ${RINGS[seats[i].ring].a.toFixed(2)} AU</span>
      </div>`;
  }
  panel.innerHTML = IDLE;

  nodes.forEach((el, i) => {
    el.addEventListener('mouseenter', () => select(i));
    el.addEventListener('focus',      () => select(i));
  });
  list.addEventListener('mouseleave', () => {
    if (!list.contains(document.activeElement)) select(-1);
  });

  place();
  addEventListener('resize', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  /* The planets move, slowly. Re-plotting once a minute keeps the diagram
     honest without animating anything the eye could follow. */
  if (!reduce) setInterval(draw, 60000);
})();
