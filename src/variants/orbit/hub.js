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
  /* Visual variants can replace the canvas palette and motion rate without
     forking the orbit behaviour. An absent config preserves Orbit byte-for-
     byte at runtime. */
  const THEME = Object.assign({
    plate:[30,42,72], grain:16, motion:1,
    sunRamp:[[255,248,222],[255,232,168],[236,190,116],[178,136,78]],
    planetRamp:[[214,228,255],[150,178,226],[96,124,176],[60,82,124]],
    cometCool:[[255,255,255],[214,232,255],[150,186,246],[86,126,196]],
    cometWarm:[[255,255,255],[255,232,190],[240,186,120],[190,126,70]],
    cometHead:'#ffffff', rocketTrail:'rgba(232,193,112,.8)', rocketHead:'#fff3d2',
    sparkWarm:'rgba(255,214,150,.9)', sparkCool:'rgba(198,220,255,.9)',
    orbitActive:'rgba(232,193,112,.9)', orbitIdle:'rgba(150,170,210,.4)',
    orbitFaint:'rgba(150,170,210,.26)'
  }, window.ORBIT_THEME || {});

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
  const PLATE = THEME.plate, GRAIN = THEME.grain;

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
  let CX = 0, CY = 0, R = 0, w = 0, h = 0, KX = 1, KY = 1, BW = 0, BH = 0;

  /* The canvas is a rounded-down fraction of the box it is stretched over, so
     canvas pixels and CSS pixels are only the same size when the box divides
     exactly by DIV. Dividing by DIV and hoping - which is what this did - put
     the drawn sun and the DOM button that sits on it in two slightly different
     places, and the gap grew with the rounding error. KX and KY are the real
     conversion, so everything drawn lands where the DOM thinks it is. */
  const cvX = x => x * KX, cvY = y => y * KY;

  function measure(){
    const b = plot.getBoundingClientRect();
    BW = b.width; BH = b.height;
    R  = Math.min(BW, BH) * 0.42;
    CX = BW/2; CY = BH/2;
    w = Math.max(1, Math.round(BW / DIV));
    h = Math.max(1, Math.round(BH / DIV));
    cv.width = w; cv.height = h;
    KX = w / BW; KY = h / BH;
    const star = starBtn.getBoundingClientRect().width || 72;
    starBtn.style.transform = `translate(${CX - star/2}px, ${CY - star/2}px)`;
  }

  /* ═══ 6. Plot primitives ══════════════════════════════════ */
  /* Distances are measured from the pixel's centre, not its corner. Measuring
     from the corner biases every circle half a pixel up and left. */
  function ring(cx, cy, rad, col, weight){
    const t = 1.15, r0 = rad - t, r1 = rad + t;      // thickness never changes
    const x0 = Math.max(0, (cx-r1)|0), x1 = Math.min(w-1, (cx+r1+1)|0);
    const y0 = Math.max(0, (cy-r1)|0), y1 = Math.min(h-1, (cy+r1+1)|0);
    for (let y=y0; y<=y1; y++){
      for (let x=x0; x<=x1; x++){
        const d = Math.hypot(x+0.5-cx, y+0.5-cy);
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
        const d = Math.hypot(x+0.5-cx, y+0.5-cy);
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

  const SUN_RAMP  = THEME.sunRamp;
  const PLAN_RAMP = THEME.planetRamp;

  /* ═══ 7. Traffic ═════════════════════════════════════════ */

  /* ── Rockets ──────────────────────────────────────────────
     A rocket flies between two BODIES, not between two rings. It launches from
     where its origin actually is right now and arrives where its destination
     will actually be when it gets there: the arrival angle is the target's
     phase evaluated at clock + dur, so the burn ends on the body rather than at
     an arbitrary point on the destination ring. Aiming at the ring instead is
     why every landing looked like it stopped just short of a planet. */
  const rockets = [], comets = [], sparks = [];
  let nextRocket = 3, nextComet = 2.5;

  function spawnRocket(){
    const from = seats[(Math.random()*seats.length)|0];
    const pool = seats.filter(t => t.ring !== from.ring);
    const to   = pool[(Math.random()*pool.length)|0];
    const dur  = 5 + Math.random()*3;
    const th0 = from.phase + rate(RINGS[from.ring].a) * clock;
    const th1 = to.phase   + rate(RINGS[to.ring].a)   * (clock + dur);
    let d = th1 - th0;
    d = Math.atan2(Math.sin(d), Math.cos(d));         // take the short way round
    rockets.push({ r0: frac(RINGS[from.ring].a), r1: frac(RINGS[to.ring].a),
                   th0, dth: d, t: 0, dur, trail: [] });
  }

  /* ── Comets ───────────────────────────────────────────────
     These live on the viewport canvas, not the plot's: a shooting star crosses
     the whole screen. One is seeded off one edge and aimed past the opposite
     one, so it runs the full diagonal and leaves the far side rather than
     expiring in the middle of the frame. */
  const tcv = document.getElementById('trail');
  const tctx = tcv.getContext('2d');
  let TW = 0, TH = 0;

  function sizeTrail(){
    TW = Math.max(1, Math.round(innerWidth / DIV));
    TH = Math.max(1, Math.round(innerHeight / DIV));
    tcv.width = TW; tcv.height = TH;
  }

  function spawnComet(){
    const cx = TW/2, cy = TH/2, half = Math.hypot(TW, TH)/2;
    const enter = Math.random()*Math.PI*2;
    /* Aim past the far side rather than at the centre, so the path is a long
       chord instead of a spoke through the middle. */
    const exit = enter + Math.PI + (Math.random()-0.5)*0.9;
    const sx = cx + Math.cos(enter)*half*1.12, sy = cy + Math.sin(enter)*half*1.12;
    const ex = cx + Math.cos(exit)*half*1.12,  ey = cy + Math.sin(exit)*half*1.12;
    const d = Math.hypot(ex-sx, ey-sy) || 1;
    const sp = 3.4 + Math.random()*1.6;               // ~8s to cross at 12fps
    comets.push({ x:sx, y:sy, vx:(ex-sx)/d*sp, vy:(ey-sy)/d*sp,
                  hue: Math.random() < 0.25 ? 'warm' : 'cool',
                  life: 0, trail: [] });
  }

  const COOL = THEME.cometCool;
  const WARM = THEME.cometWarm;

  /* The streak is drawn as a ramp along its own length rather than one flat
     colour: white at the head, cooling and thinning down the tail, with the
     dither doing the fade. Sparks shed off the head and drift, which is what
     keeps it from reading as a straight line with a dot on the end. */
  function drawComet(c){
    const ramp = c.hue === 'warm' ? WARM : COOL;
    for (let i=0; i<c.trail.length; i++){
      const f = (i+1)/c.trail.length;                 // 1 at the head
      const px = c.trail[i][0]|0, py = c.trail[i][1]|0;
      if (px < -4 || py < -4 || px > TW+4 || py > TH+4) continue;
      if (f*f*2.6 <= BAY[py & 7][px & 7]) continue;
      /* Cool quickly off the head so only the tip is white: holding white for
         the first third of the streak reads as a solid bar rather than a
         shooting star. */
      const col = ramp[Math.min(ramp.length-1, ((1-f)*1.7*ramp.length)|0)];
      const wpx = f > 0.93 ? 2 : 1;
      tctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      tctx.fillRect(px, py, wpx, wpx);
    }
    tctx.fillStyle = THEME.cometHead;
    tctx.fillRect((c.x-1)|0, (c.y-1)|0, 3, 3);
  }

  function stepTraffic(dt){
    nextRocket -= dt;
    if (nextRocket <= 0){ spawnRocket(); nextRocket = 6 + Math.random()*8; }
    nextComet -= dt;
    if (nextComet <= 0){ spawnComet(); nextComet = 9 + Math.random()*11; }

    /* Rockets, on the plot canvas. */
    const cx = cvX(CX), cy = cvY(CY);
    for (let i=rockets.length-1; i>=0; i--){
      const k = rockets[i];
      k.t += dt / k.dur;
      if (k.t >= 1){ rockets.splice(i, 1); continue; }
      const e = k.t*k.t*(3 - 2*k.t);                  // ease both ends of the burn
      const rr = cvX((k.r0 + (k.r1 - k.r0)*e) * R);
      const th = k.th0 + k.dth*e;
      const x = cx + Math.cos(th)*rr, y = cy + Math.sin(th)*rr;
      k.trail.push([x, y]); if (k.trail.length > 16) k.trail.shift();
      for (let j=0; j<k.trail.length; j++){
        const f = (j+1)/k.trail.length;
        const tx = k.trail[j][0]|0, ty = k.trail[j][1]|0;
        if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
        if (f*f*1.35 <= BAY[ty & 7][tx & 7]) continue;
        ctx.fillStyle = THEME.rocketTrail;
        ctx.fillRect(tx, ty, 1, 1);
      }
      ctx.fillStyle = THEME.rocketHead;
      ctx.fillRect((x-1)|0, (y-1)|0, 2, 2);
    }

    /* Comets and their sparks, on the viewport canvas. */
    tctx.clearRect(0, 0, TW, TH);
    const margin = Math.hypot(TW, TH)*0.62;
    for (let i=comets.length-1; i>=0; i--){
      const c = comets[i];
      c.x += c.vx; c.y += c.vy; c.life++;
      if (Math.hypot(c.x - TW/2, c.y - TH/2) > margin){ comets.splice(i, 1); continue; }
      c.trail.push([c.x, c.y]); if (c.trail.length > 52) c.trail.shift();
      if (c.life % 3 === 0 && sparks.length < 90)
        sparks.push({ x:c.x, y:c.y, vx:-c.vx*0.18 + (Math.random()-.5)*0.9,
                      vy:-c.vy*0.18 + (Math.random()-.5)*0.9, age:0,
                      max: 12 + (Math.random()*14)|0, hue: c.hue });
      drawComet(c);
    }
    for (let i=sparks.length-1; i>=0; i--){
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.age++;
      if (s.age > s.max){ sparks.splice(i, 1); continue; }
      const f = 1 - s.age/s.max;
      const px = s.x|0, py = s.y|0;
      if (px < 0 || py < 0 || px >= TW || py >= TH) continue;
      if (f*f*1.5 <= BAY[py & 7][px & 7]) continue;
      tctx.fillStyle = s.hue === 'warm' ? THEME.sparkWarm : THEME.sparkCool;
      tctx.fillRect(px, py, 1, 1);
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

    /* Bodies are sized against the plot, not in fixed pixels: a sun that reads
       right against a 360px orbit is a third of the way to the rings on a
       phone. Mercury's track is dropped once it would sit inside the sun's
       own bloom. */
    const RC = cvX(R);
    const sunR   = Math.max(3.2, Math.min(6.2, RC*0.05));
    const planR  = Math.max(1.4, Math.min(2.4, RC*0.018));
    if (RC > 60) ring(cx, cy, cvX(MERCURY.f*R), THEME.orbitFaint, 0.5);
    RINGS.forEach((rg, i) => {
      const on = active >= 0 && seats[active].ring === i;
      ring(cx, cy, cvX(frac(rg.a)*R),
           on ? THEME.orbitActive : THEME.orbitIdle,
           on ? 1 : 0.55);
    });

    for (const rg of RINGS.concat([MERCURY])){
      const th = BASE[rg.planet] + rate(rg.a)*clock;
      const rr = cvX(fracOf(rg)*R);
      disc(cx + Math.cos(th)*rr, cy + Math.sin(th)*rr,
           rg.planet === 'Earth' ? planR*1.2 : planR, PLAN_RAMP, 2.2);
    }

    disc(cx, cy, sunR, SUN_RAMP, 2.9);
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

  /* ── Attention ────────────────────────────────────────────
     Left alone the page walks itself through the apps, holding each one long
     enough to read, so an idle screen is showing work rather than an empty
     readout. A pointer or the caret takes it straight over; the walk resumes a
     beat after they leave, carrying on from wherever it was rather than
     restarting at the top. */
  const DWELL = 3.4, RESUME_AFTER = 1.8;
  let held = false, dwell = 1.2;

  function hold(i){ held = true; select(i); }
  function release(){ held = false; dwell = RESUME_AFTER; }

  const bind = (els) => els.forEach((el, i) => {
    el.addEventListener('mouseenter', () => hold(i));
    el.addEventListener('focus',      () => hold(i));
  });
  bind(rows); bind(nodes);
  const leave = host => host.addEventListener('mouseleave', () => {
    if (!host.contains(document.activeElement)) release();
  });
  leave(index); leave(nodesEl);

  function walk(dt){
    if (held) return;
    dwell -= dt;
    if (dwell > 0) return;
    dwell = DWELL;
    select(active < 0 ? 0 : (active + 1) % seats.length);
  }

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
  document.getElementById('rate').textContent =
    `orbits at ${Math.round(SPEEDUP * THEME.motion).toLocaleString()}×`;

  function layout(){
    for (const p of plates) if (measurePlate(p)) paintPlate(p);
    sizeTrail();
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
    if (!reduce){ clock += dt * THEME.motion; walk(dt); }
    draw();
    stepTraffic(reduce ? 0 : dt * THEME.motion);
    placeNodes();
  }

  layout();
  addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  requestAnimationFrame(frame);
})();
