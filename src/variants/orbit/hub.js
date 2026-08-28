/* ═══ Orbit ═════════════════════════════════════════════════
   Two halves of one state. The index on the left and the plot on the right
   render the same selection, so hovering either highlights both, and the detail
   column is a pure function of it.

   The astronomy is the shared engine's: helio(), ELEM and T_CENT come from
   sky.js, so the plot and the star field behind it cannot disagree. The plot
   starts at today's real longitudes and then runs the system forward at about
   210,000x, which is what makes the motion honest rather than decorative. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flat   = () => matchMedia('(max-width:1080px)').matches;

  /* ═══ 1. Rings ════════════════════════════════════════════
     Radii are logarithmic in semi-major axis. A linear plot is technically
     truer but crushes Venus and Earth together, and the brief wants the rings
     apart; log spacing is how solar-system diagrams are normally drawn for
     exactly that reason. The angles stay exact and the real AU is in the
     detail column, so nothing is hidden by the choice. */
  const RINGS = [
    { planet:'Venus', a: ELEM.Venus[0], count: 4 },
    { planet:'Earth', a: ELEM.Earth[0], count: 4 },
    { planet:'Mars',  a: ELEM.Mars[0],  count: 3 }
  ];
  const L0 = Math.log(RINGS[0].a), L1 = Math.log(RINGS[2].a);
  /* Only the three app rings are spread across the log range. Mercury is well
     inside its lower bound - the same formula puts it at a negative radius -
     so it gets a fixed inner track, drawn for completeness and carrying
     nothing. */
  const frac = a => 0.42 + 0.58 * (Math.log(a) - L0) / (L1 - L0);
  const MERCURY = { planet:'Mercury', a: ELEM.Mercury[0], f: 0.20 };
  const fracOf = rg => rg.f ?? frac(rg.a);

  /* Kepler: angular rate goes as a^-3/2, so the inner rings genuinely run
     faster. Earth is pinned to one turn every 150 seconds and everything else
     falls out of that ratio - slow enough that a node stays easy to click. */
  const EARTH_PERIOD = 150;
  const rate = a => (Math.PI*2 / EARTH_PERIOD) * Math.pow(a, -1.5);
  const SPEEDUP = Math.round(365.25 * 86400 / EARTH_PERIOD);

  /* ═══ 2. Seats ════════════════════════════════════════════ */
  let n = 0;
  const seats = RINGS.flatMap((ring, ri) =>
    Array.from({ length: ring.count }, (_, k) => ({
      app: ORDER[n++], ring: ri,
      /* Spread evenly, each ring rotated off the last so an inner node never
         sits permanently behind an outer one. */
      phase: (k / ring.count) * Math.PI*2 + ri * 0.42 - Math.PI/2
    })));

  const index = document.getElementById('index');
  const nodesEl = document.getElementById('nodes');
  const detail = document.getElementById('detail');

  index.innerHTML = seats.map((s, i) => `
    <li>
      <a class="row" href="${s.app.url}" data-i="${i}" data-on="false">
        <canvas class="row-bg" aria-hidden="true"></canvas>
        <span class="row-num">${String(i + 1).padStart(2, '0')}</span>
        <span>
          <span class="row-name">${s.app.name}</span>
          <span class="row-desc">${s.app.desc}</span>
        </span>
      </a>
    </li>`).join('');

  nodesEl.innerHTML = seats.map((s, i) => `
    <li>
      <a class="node" href="${s.app.url}" data-i="${i}" data-on="false"
         aria-label="${s.app.name}">
        <span class="node-dot">${iconSVG(s.app.id)}</span>
        <span class="node-name">${s.app.name}</span>
      </a>
    </li>`).join('');

  const rows  = [...index.querySelectorAll('.row')];
  const nodes = [...nodesEl.querySelectorAll('.node')];

  /* ═══ 3. Dither ═══════════════════════════════════════════ */
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

  /* ═══ 4. Row plates ═══════════════════════════════════════
     C's dither dissolved a panel's edge, which ringed every button in a dotted
     rim. Here the plate's boundary is the canvas rectangle - crisp - and the
     dither is what fills it in: as `lit` rises, pixels switch on in Bayer
     order. The wipe IS the animation, and there is no soft edge anywhere. */
  const DIV = 3;
  const PLATE = [30, 42, 72], GRAIN = 16;

  const plates = rows.map(el => ({
    el, cv: el.querySelector('.row-bg'), ctx: null, w: 0, h: 0, lit: 0, target: 0
  }));

  function paintPlate(p){
    if (!p.ctx || !p.w || !p.h) return;
    const img = p.ctx.createImageData(p.w, p.h), px = img.data;
    if (p.lit > 0.001){
      for (let y=0; y<p.h; y++){
        for (let x=0; x<p.w; x++){
          if (BAY[y & 7][x & 7] >= p.lit) continue;      // not yet switched on
          const g = (BAY[y & 7][x & 7] - 0.5) * GRAIN;
          const o = (y*p.w + x)*4;
          for (let i=0; i<3; i++) px[o+i] = Math.max(0, Math.min(255, PLATE[i] + g));
          px[o+3] = 255;
        }
      }
    }
    p.ctx.putImageData(img, 0, 0);
  }

  function measurePlate(p){
    const r = p.el.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width / DIV)), h = Math.max(1, Math.round(r.height / DIV));
    if (w === p.w && h === p.h) return false;
    p.w = w; p.h = h; p.cv.width = w; p.cv.height = h;
    p.ctx = p.cv.getContext('2d');
    return true;
  }

  /* ═══ 5. Geometry ═════════════════════════════════════════ */
  const plot = document.getElementById('plot');
  const cv   = document.getElementById('plotbg');
  const ctx  = cv.getContext('2d');
  const starBtn = document.getElementById('star');
  let CX = 0, CY = 0, R = 0, w = 0, h = 0;

  function measure(){
    const b = plot.getBoundingClientRect();
    R  = Math.min(b.width, b.height) * 0.42;
    CX = b.width/2; CY = b.height/2;
    w = Math.max(1, Math.round(b.width / DIV));
    h = Math.max(1, Math.round(b.height / DIV));
    cv.width = w; cv.height = h;
    starBtn.style.transform = `translate(${CX - 32}px, ${CY - 32}px)`;
  }

  /* ═══ 6. Plot primitives ══════════════════════════════════ */
  function ring(cx, cy, rad, col, weight){
    const t = 1.15, r0 = rad - t, r1 = rad + t;      // thickness never changes
    const x0 = Math.max(0, (cx-r1)|0), x1 = Math.min(w-1, (cx+r1+1)|0);
    const y0 = Math.max(0, (cy-r1)|0), y1 = Math.min(h-1, (cy+r1+1)|0);
    for (let y=y0; y<=y1; y++){
      for (let x=x0; x<=x1; x++){
        const d = Math.hypot(x-cx, y-cy);
        if (d < r0 || d > r1) continue;
        if ((1 - Math.abs(d-rad)/t) * weight <= BAY[y & 7][x & 7]) continue;
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
        if (d <= rad) c = ramp[Math.min(ramp.length-1, ((d/rad)*(ramp.length-1) + t*0.9)|0)];
        else {
          const g = 1 - (d-rad)/(outer-rad);
          if (g*g <= t) continue;                     // the dither is the falloff
          c = ramp[ramp.length-1];
        }
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  const SUN_RAMP  = [[255,248,222],[255,232,168],[236,190,116],[178,136,78]];
  const PLAN_RAMP = [[214,228,255],[150,178,226],[96,124,176],[60,82,124]];

  /* ═══ 7. Traffic ══════════════════════════════════════════
     Rockets ride a transfer between two rings: interpolating radius and angle
     separately, with the angle easing, traces the spiral a real transfer makes
     rather than a straight line across the middle. Comets cross the periphery
     on a straight chord and never enter the rings, so they read as passing
     through rather than orbiting. */
  const rockets = [], comets = [];
  let nextRocket = 3, nextComet = 3;

  function spawnRocket(){
    const a = (Math.random()*RINGS.length)|0;
    let b = (Math.random()*RINGS.length)|0;
    if (b === a) b = (a + 1) % RINGS.length;
    rockets.push({ r0: frac(RINGS[a].a), r1: frac(RINGS[b].a),
                   t0: Math.random()*Math.PI*2,
                   sweep: (Math.PI*0.6 + Math.random()*Math.PI*0.7) * (Math.random()<.5?-1:1),
                   t: 0, dur: 5 + Math.random()*3, trail: [] });
  }

  /* A comet runs a chord ACROSS the periphery, between two points on a ring
     just outside the outermost orbit, entering from off-frame along that line.
     An inbound path spends most of its life far out and crosses the visible
     band in a couple of frames; a tangential one stays in the corners where it
     can actually be seen, which is where the brief wants it. */
  function spawnComet(){
    const cx = w/2, cy = h/2;
    const peri = R/DIV * 1.12;
    const t1 = Math.random()*Math.PI*2;
    const t2 = t1 + (0.9 + Math.random()*0.8) * (Math.random() < .5 ? -1 : 1);
    const ax = cx + Math.cos(t1)*peri, ay = cy + Math.sin(t1)*peri;
    const bx = cx + Math.cos(t2)*peri, by = cy + Math.sin(t2)*peri;
    const d = Math.hypot(bx-ax, by-ay) || 1;
    const ux = (bx-ax)/d, uy = (by-ay)/d, sp = 2.6 + Math.random()*1.1;
    const lead = 40;                                  // start just off-frame
    comets.push({ x: ax - ux*lead, y: ay - uy*lead,
                  vx: ux*sp, vy: uy*sp, life: 0, max: 260, trail: [] });
  }

  /* The tail thins out by dither rather than by alpha, so it stays part of the
     same pixel medium as everything else on the canvas. */
  function drawTrail(trail, head, headCol, tailCol, density, thick){
    for (let i=0; i<trail.length; i++){
      const f = (i+1)/trail.length;
      if (f*f*density <= BAY[trail[i][1] & 7][trail[i][0] & 7]) continue;
      /* The streak tapers by width as well as by dither: a one-pixel tail is
         legible on a still frame and invisible in motion. */
      const wpx = (thick && f > 0.62) ? 2 : 1;
      ctx.fillStyle = tailCol;
      ctx.fillRect(trail[i][0]|0, trail[i][1]|0, wpx, wpx);
    }
    ctx.fillStyle = headCol;
    ctx.fillRect(head[0]|0, head[1]|0, head[2], head[2]);
  }

  function stepTraffic(dt){
    nextRocket -= dt;
    if (nextRocket <= 0){ spawnRocket(); nextRocket = 7 + Math.random()*9; }
    nextComet -= dt;
    if (nextComet <= 0){ spawnComet(); nextComet = 6 + Math.random()*7; }

    const cx = CX/DIV, cy = CY/DIV;
    for (let i=rockets.length-1; i>=0; i--){
      const k = rockets[i];
      k.t += dt / k.dur;
      if (k.t >= 1){ rockets.splice(i, 1); continue; }
      const e = k.t*k.t*(3 - 2*k.t);                 // ease both ends of the burn
      const rr = (k.r0 + (k.r1 - k.r0)*e) * R/DIV;
      const th = k.t0 + k.sweep*e;
      const x = cx + Math.cos(th)*rr, y = cy + Math.sin(th)*rr;
      k.trail.push([x, y]); if (k.trail.length > 14) k.trail.shift();
      drawTrail(k.trail, [x-1, y-1, 2], '#fff3d2', 'rgba(232,193,112,.8)', 1.3, false);
    }
    /* Culled on distance from centre, not on a per-axis margin: a comet enters
       from further out than any fixed margin allows, so a bounds test retires
       it on its first frame, before it is ever on screen. */
    const half = Math.hypot(w, h)/2;
    for (let i=comets.length-1; i>=0; i--){
      const c = comets[i];
      c.x += c.vx; c.y += c.vy; c.life++;
      const d = Math.hypot(c.x-cx, c.y-cy);
      if (c.life > c.max || d < R/DIV*1.02 || (c.life > 4 && d > half*1.3)){
        comets.splice(i, 1); continue;
      }
      c.trail.push([c.x, c.y]); if (c.trail.length > 46) c.trail.shift();
      drawTrail(c.trail, [c.x-2, c.y-2, 4], '#ffffff', 'rgba(214,232,255,.9)', 2.8, true);
    }
  }

  /* ═══ 8. Draw ═════════════════════════════════════════════ */
  let active = -1, clock = 0;

  const longitude = name => {
    const p = helio(name, T_CENT);
    return Math.atan2(p[1], p[0]);
  };
  const BASE = {};
  for (const r of RINGS.concat([MERCURY])) BASE[r.planet] = longitude(r.planet);

  function draw(){
    ctx.clearRect(0, 0, w, h);
    const cx = CX/DIV, cy = CY/DIV;

    ring(cx, cy, MERCURY.f*R/DIV, 'rgba(150,170,210,.26)', 0.5);
    RINGS.forEach((rg, i) => {
      const on = active >= 0 && seats[active].ring === i;
      ring(cx, cy, frac(rg.a)*R/DIV,
           on ? 'rgba(232,193,112,.9)' : 'rgba(150,170,210,.4)',
           on ? 1 : 0.55);
    });

    for (const rg of RINGS.concat([MERCURY])){
      const th = BASE[rg.planet] + rate(rg.a)*clock;
      const rr = fracOf(rg)*R/DIV;
      disc(cx + Math.cos(th)*rr, cy + Math.sin(th)*rr,
           rg.planet === 'Earth' ? 2.2 : 1.8, PLAN_RAMP, 2.2);
    }

    disc(cx, cy, 5.4, SUN_RAMP, 2.9);
  }

  function placeNodes(){
    for (let i=0; i<seats.length; i++){
      const s = seats[i];
      const rr = frac(RINGS[s.ring].a) * R;
      const th = s.phase + rate(RINGS[s.ring].a)*clock;
      nodes[i].style.transform =
        `translate(${CX + Math.cos(th)*rr - 14}px, ${CY + Math.sin(th)*rr - 14}px)`;
    }
  }

  /* ═══ 9. Selection ════════════════════════════════════════ */
  const IDLE = `<div class="det-in"><p class="det-idle"><b>Eleven apps.</b>
    Each one started as a problem I wanted solved for myself. Pick one from the
    index, or off its orbit.</p></div>`;

  function select(i){
    if (i === active) return;
    active = i;
    rows.forEach((el, k) => el.dataset.on = String(k === i));
    nodes.forEach((el, k) => el.dataset.on = String(k === i));
    for (let k=0; k<plates.length; k++){
      plates[k].target = k === i ? 1 : 0;
      if (reduce){ plates[k].lit = plates[k].target; paintPlate(plates[k]); }
    }
    if (i < 0){ detail.innerHTML = IDLE; return; }
    const s = seats[i], a = s.app;
    detail.innerHTML = `
      <div class="det-in">
        <h2 class="det-name">${a.name}</h2>
        <p class="det-desc">${a.desc}</p>
        ${a.note ? `<p class="det-note">${a.note}</p>` : ''}
        <span class="det-meta">${RINGS[s.ring].planet} orbit &middot;
          ${RINGS[s.ring].a.toFixed(2)} AU</span>
        <a class="det-open" href="${a.url}">Open
          <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 3 L11 8 L6 13"/>
          </svg>
        </a>
      </div>`;
  }
  detail.innerHTML = IDLE;

  /* Both halves drive the same selection, so a row and its body highlight
     together whichever one the pointer is actually over. */
  const bind = (els) => els.forEach((el, i) => {
    el.addEventListener('mouseenter', () => select(i));
    el.addEventListener('focus',      () => select(i));
  });
  bind(rows); bind(nodes);
  const leave = host => host.addEventListener('mouseleave', () => {
    if (!host.contains(document.activeElement)) select(-1);
  });
  leave(index); leave(nodesEl);

  index.addEventListener('keydown', e => {
    const at = rows.indexOf(document.activeElement);
    if (at < 0) return;
    const to = e.key === 'ArrowDown' ? at+1 : e.key === 'ArrowUp' ? at-1
             : e.key === 'Home' ? 0 : e.key === 'End' ? rows.length-1 : null;
    if (to === null) return;
    e.preventDefault();
    rows[Math.max(0, Math.min(rows.length-1, to))].focus();
  });

  /* ═══ 10. About ═══════════════════════════════════════════ */
  const about = document.getElementById('about');
  const aboutBody = document.getElementById('aboutBody');
  const openBtn = document.getElementById('aboutOpen');
  const backBtn = document.getElementById('aboutBack');

  aboutBody.innerHTML = `
    <h2>${RESUME.name}</h2>
    <p class="ab-lede">${RESUME.lede}</p>
    <p class="ab-intro">${RESUME.intro}</p>
    <h3>Work</h3>
    ${RESUME.roles.map(r => `
      <article class="ab-role">
        <div class="ab-role-head">
          <h4>${r.org}</h4><span class="ab-role-meta">${r.meta}</span>
        </div>
        <ul>${r.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
      </article>`).join('')}
    <h3>What I work in</h3>
    ${RESUME.skills.map(s => `
      <div class="ab-skill"><h4>${s.title}</h4><p>${s.items}</p></div>`).join('')}
    <h3>Get in touch</h3>
    <div class="ab-links">${RESUME.links.map(l =>
      `<a href="${l.url}"${l.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${l.label}</a>`
    ).join('')}</div>`;

  const side = document.querySelector('.side');
  let aboutOpen = false;
  function showAbout(on){
    if (on === aboutOpen) return;
    aboutOpen = on;
    side.dataset.about = String(on);
    if (on){
      about.hidden = false;
      about.removeAttribute('data-closing');
      backBtn.focus();
    } else if (reduce){
      about.hidden = true;
      openBtn.focus();
    } else {
      about.dataset.closing = 'true';
      about.addEventListener('animationend', () => {
        about.hidden = true;
        about.removeAttribute('data-closing');
        openBtn.focus();
      }, { once: true });
    }
  }
  openBtn.addEventListener('click', () => showAbout(true));
  backBtn.addEventListener('click', () => showAbout(false));
  starBtn.addEventListener('click', () => showAbout(true));
  addEventListener('keydown', e => { if (e.key === 'Escape' && aboutOpen) showAbout(false); });

  /* ═══ 11. Loop ════════════════════════════════════════════
     12fps, matching the medium and the sky behind it. Everything that moves
     moves here: the plot, the nodes, and any row still igniting. */
  const FRAME = 1000/12;
  let last = 0;
  document.getElementById('rate').textContent = `orbits at ${SPEEDUP.toLocaleString()}×`;

  function layout(){
    for (const p of plates) if (measurePlate(p)) paintPlate(p);
    if (flat()){ nodes.forEach(el => el.style.transform = ''); return; }
    measure();
    draw(); placeNodes();
  }

  function frame(now){
    requestAnimationFrame(frame);
    if (now - last < FRAME) return;
    const dt = Math.min(0.5, (now - last)/1000);
    last = now;

    for (const p of plates){
      if (Math.abs(p.target - p.lit) < 0.004){ p.lit = p.target; continue; }
      p.lit += (p.target - p.lit) * 0.3;
      paintPlate(p);
    }
    if (flat()) return;
    if (!reduce) clock += dt;
    draw();
    stepTraffic(reduce ? 0 : dt);
    placeNodes();
  }

  layout();
  addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  requestAnimationFrame(frame);
})();
