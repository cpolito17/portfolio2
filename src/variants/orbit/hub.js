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
    plate:[30,42,72], grain:16, motion:1, sunSize:1, sunActivity:1,
    effects:{ parallax:false, launch:false, hologram:false },
    parallaxRange:9, launchMs:560,
    sunRamp:[[255,248,222],[255,232,168],[236,190,116],[178,136,78]],
    planetRamp:[[214,228,255],[150,178,226],[96,124,176],[60,82,124]],
    cometCool:[[255,255,255],[214,232,255],[150,186,246],[86,126,196]],
    cometWarm:[[255,255,255],[255,232,190],[240,186,120],[190,126,70]],
    cometHead:'#ffffff', rocketTrail:'rgba(232,193,112,.8)', rocketHead:'#fff3d2',
    sparkWarm:'rgba(255,214,150,.9)', sparkCool:'rgba(198,220,255,.9)',
    orbitActive:'rgba(232,193,112,.9)', orbitIdle:'rgba(150,170,210,.4)',
    orbitFaint:'rgba(150,170,210,.26)'
  }, window.ORBIT_THEME || {});
  const FX = THEME.effects || {};

  /* ═══ 1. Rings ════════════════════════════════════════════
     Radii are logarithmic in semi-major axis. A linear plot is technically
     truer but crushes Venus and Earth together, and the brief wants the rings
     apart; log spacing is how solar-system diagrams are normally drawn for
     exactly that reason. The angles stay exact and the real AU is in the
     detail column, so nothing is hidden by the choice. */
  const RINGS = [
    { planet:'Venus', a: ELEM.Venus[0], count: 4 },
    { planet:'Earth', a: ELEM.Earth[0], count: 4 },
    { planet:'Mars',  a: ELEM.Mars[0],  count: 4 }
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
  document.getElementById('sideContact').innerHTML = RESUME.links.map(link =>
    `<a href="${link.url}"${link.external ? ' target="_blank" rel="me noopener noreferrer"' : ''}>${link.label}</a>`
  ).join('');

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
    /* Layout dimensions ignore visual transforms. Using getBoundingClientRect
       here made an entrance scale collapse the canvas to a one-pixel strip,
       which later stretched into vertical lines. */
    const w = Math.max(1, Math.round(p.el.offsetWidth / DIV));
    const h = Math.max(1, Math.round(p.el.offsetHeight / DIV));
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
  let NODE_HALF = 14;

  /* The canvas is a rounded-down fraction of the box it is stretched over, so
     canvas pixels and CSS pixels are only the same size when the box divides
     exactly by DIV. Dividing by DIV and hoping - which is what this did - put
     the drawn sun and the DOM button that sits on it in two slightly different
     places, and the gap grew with the rounding error. KX and KY are the real
     conversion, so everything drawn lands where the DOM thinks it is. */
  const cvX = x => x * KX, cvY = y => y * KY;

  function measure(){
    /* clientWidth/clientHeight stay stable during clip and transform effects.
       Canvas geometry must follow layout, not the current animation frame. */
    BW = plot.clientWidth; BH = plot.clientHeight;
    R  = Math.min(BW, BH) * 0.42;
    CX = BW/2; CY = BH/2;
    w = Math.max(1, Math.round(BW / DIV));
    h = Math.max(1, Math.round(BH / DIV));
    cv.width = w; cv.height = h;
    KX = w / BW; KY = h / BH;
    NODE_HALF = (nodes[0]?.offsetWidth || 28) / 2;
    const star = starBtn.offsetWidth || 72;
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

  /* The sun is a sphere, not a radial blob. A dithered corona sits behind a
     limb-darkened surface. Latitude bands, rotating granulation, and three
     shallow sunspots give the tiny pixel disc several visible depth layers. */
  function drawSun(cx, cy, rad){
    const activity = THEME.sunActivity;
    const spin = clock * 0.055 * THEME.motion;

    /* Uneven corona filaments. The golden-angle spacing avoids a regular star
       polygon while keeping the result deterministic from frame to frame. */
    for (let i=0; i<44; i++){
      const a = i * 2.399963 + spin * 0.18;
      const reach = rad * (1.28 + ((i * 17) % 13) / 20 * activity);
      const col = SUN_RAMP[Math.min(SUN_RAMP.length - 1, 1 + (i % 2))];
      for (let d=rad*1.03; d<reach; d+=0.72){
        const fade = 1 - (d-rad) / Math.max(1, reach-rad);
        const x = Math.round(cx + Math.cos(a) * d);
        const y = Math.round(cy + Math.sin(a) * d);
        if (x<0 || y<0 || x>=w || y>=h || fade*fade < BAY[y&7][x&7]) continue;
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(.08 + fade*.2).toFixed(3)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    /* Three low prominences loop beyond the limb. They stay sparse and slow,
       so the sun gains a second silhouette without turning into a fireball. */
    for(let i=0;i<3;i++){
      const base=spin*.12+i*2.11+.35;
      const col=SUN_RAMP[Math.min(2,SUN_RAMP.length-1)];
      for(let j=0;j<=18;j++){
        const t=j/18, a=base+(t-.5)*.72;
        const d=rad*(1.03+Math.sin(Math.PI*t)*(.18+.05*i)*activity);
        const x=Math.round(cx+Math.cos(a)*d),y=Math.round(cy+Math.sin(a)*d);
        if(x<0||y<0||x>=w||y>=h||BAY[y&7][x&7]>.72)continue;
        ctx.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${(.2+Math.sin(Math.PI*t)*.34).toFixed(3)})`;
        ctx.fillRect(x,y,1,1);
      }
    }

    /* A soft subsurface bloom remains visible between the corona and sphere. */
    disc(cx, cy, rad*.98, SUN_RAMP, 1.62);

    const spots = [
      [spin + .45, -.25, .19],
      [spin + 2.55,  .20, .14],
      [spin + 4.35, -.03, .11]
    ];
    const x0=Math.floor(cx-rad), x1=Math.ceil(cx+rad);
    const y0=Math.floor(cy-rad), y1=Math.ceil(cy+rad);
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
      const nx=(x+.5-cx)/rad, ny=(y+.5-cy)/rad;
      const rr=nx*nx+ny*ny;
      if(rr>1) continue;
      const nz=Math.sqrt(Math.max(0,1-rr));

      /* The virtual light is above and left. nz provides true limb darkening. */
      let light=.18 + .58*nz + .18*Math.max(0,-nx*.55-ny*.72+nz*.45);
      const lon=Math.atan2(nx,nz)+spin, lat=Math.asin(Math.max(-1,Math.min(1,ny)));
      const granule=Math.sin(lon*15+lat*9)*.055 + Math.sin(lon*29-lat*17)*.035;
      const plasma=Math.sin(lat*22 + Math.sin(lon*4)*1.4)*.035;
      light += granule + plasma;

      /* Spots travel across the visible hemisphere as the texture rotates.
         A thin bright rim on their lit side keeps them from reading as holes. */
      for(const [phase,sy,size] of spots){
        const sx=Math.sin(phase)*.62, visible=.28+.72*Math.max(0,Math.cos(phase));
        const dx=nx-sx, dy=ny-sy, d=Math.hypot(dx,dy);
        const reach=size*(.45+.55*visible);
        if(d<reach) light-=.34*(1-d/reach)*visible;
        else if(d<reach*1.35 && dx<0) light+=.09*(1-(d-reach)/(reach*.35))*visible;
      }

      light=Math.max(0,Math.min(1,light));
      const pos=(1-light)*(SUN_RAMP.length-1);
      let ci=Math.floor(pos);
      if(BAY[y&7][x&7] < pos-ci) ci++;
      const col=SUN_RAMP[Math.min(SUN_RAMP.length-1,ci)];
      ctx.fillStyle=`rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.fillRect(x,y,1,1);
    }
  }

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
     These live on the sky canvas, not the plot's. On desktop that canvas is
     viewport-sized. On a scrolling layout it spans the document and each new
     comet is seeded around the currently visible part of that backdrop. */
  const tcv = document.getElementById('trail');
  const tctx = tcv.getContext('2d');
  let TW = 0, TH = 0;

  function sizeTrail(){
    const documentBound = innerWidth <= 1080;
    /* Remove the previous inline height before measuring so a tall canvas from
       an earlier orientation cannot keep the document artificially tall. */
    tcv.style.height = documentBound ? '0px' : '';
    const pageHeight = documentBound
      ? Math.max(innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight)
      : innerHeight;
    tcv.style.height = documentBound ? `${pageHeight}px` : '';
    TW = Math.max(1, Math.round(innerWidth / DIV));
    TH = Math.max(1, Math.round(pageHeight / DIV));
    tcv.width = TW; tcv.height = TH;
  }

  function spawnComet(){
    const viewH = Math.max(1, innerHeight/DIV);
    const viewTop = innerWidth <= 1080 ? scrollY/DIV : 0;
    const cx = TW/2;
    const cy = Math.max(viewH/2, Math.min(TH-viewH/2, viewTop+viewH/2));
    const half = Math.hypot(TW, viewH)/2;
    const enter = Math.random()*Math.PI*2;
    /* Aim past the far side rather than at the centre, so the path is a long
       chord instead of a spoke through the middle. */
    const exit = enter + Math.PI + (Math.random()-0.5)*0.9;
    const sx = cx + Math.cos(enter)*half*1.12, sy = cy + Math.sin(enter)*half*1.12;
    const ex = cx + Math.cos(exit)*half*1.12,  ey = cy + Math.sin(exit)*half*1.12;
    const d = Math.hypot(ex-sx, ey-sy) || 1;
    const sp = 3.4 + Math.random()*1.6;               // ~8s to cross at 12fps
    comets.push({ x:sx, y:sy, vx:(ex-sx)/d*sp, vy:(ey-sy)/d*sp, cx, cy, half,
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
    const speed = Math.hypot(c.vx,c.vy) || 1;
    const pxn = -c.vy/speed, pyn = c.vx/speed;
    for (let i=0; i<c.trail.length; i++){
      const f = (i+1)/c.trail.length;                 // 1 at the head
      const wave = Math.sin(i*.72 + c.life*.16) * (1-f) * 1.5;
      const px = Math.round(c.trail[i][0] + pxn*wave);
      const py = Math.round(c.trail[i][1] + pyn*wave);
      if (px < -4 || py < -4 || px > TW+4 || py > TH+4) continue;
      if (f*f*2.6 <= BAY[py & 7][px & 7]) continue;
      /* Cool quickly off the head so only the tip is white: holding white for
         the first third of the streak reads as a solid bar rather than a
         shooting star. */
      const col = ramp[Math.min(ramp.length-1, ((1-f)*1.7*ramp.length)|0)];
      /* A low-alpha sheath gives the streak volume. A narrow offset filament
         inside it produces the plasma-ribbon look without a bright solid bar. */
      if(f>.18){
        const glow=ramp[ramp.length-1], a=.035+f*.12;
        tctx.fillStyle=`rgba(${glow[0]},${glow[1]},${glow[2]},${a.toFixed(3)})`;
        const gw=f>.78?2:1;
        tctx.fillRect(px-gw,py-gw,gw*2+1,gw*2+1);
      }
      tctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(.32+f*.68).toFixed(3)})`;
      tctx.fillRect(px, py, f>.9?2:1, f>.9?2:1);
      if(f>.36 && (i&1)===0){
        const side=(1-f)*2.2;
        tctx.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${(f*.38).toFixed(3)})`;
        tctx.fillRect(Math.round(px+pxn*side),Math.round(py+pyn*side),1,1);
      }
    }
    /* A compact cross flare reads as a fast luminous body, not another dot in
       the trail. It remains only three low-resolution pixels across. */
    const hx=Math.round(c.x),hy=Math.round(c.y);
    const head=ramp[0];
    tctx.fillStyle=`rgba(${head[0]},${head[1]},${head[2]},.2)`;
    tctx.fillRect(hx-2,hy-2,5,5);
    tctx.fillStyle=THEME.cometHead;
    tctx.fillRect(hx-1,hy,3,1);tctx.fillRect(hx,hy-1,1,3);
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
    for (let i=comets.length-1; i>=0; i--){
      const c = comets[i];
      c.x += c.vx; c.y += c.vy; c.life++;
      if (Math.hypot(c.x-c.cx, c.y-c.cy) > c.half*1.24){ comets.splice(i, 1); continue; }
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
  const parallax = { x:0, y:0, tx:0, ty:0 };

  if (FX.parallax && !reduce){
    addEventListener('pointermove', e => {
      parallax.tx = (e.clientX / Math.max(1, innerWidth)  - .5) * 2;
      parallax.ty = (e.clientY / Math.max(1, innerHeight) - .5) * 2;
    }, { passive:true });
    document.documentElement.addEventListener('mouseleave', () => {
      parallax.tx = 0; parallax.ty = 0;
    });
  }

  function stepParallax(){
    if (!FX.parallax || reduce) return;
    parallax.x += (parallax.tx - parallax.x) * .14;
    parallax.y += (parallax.ty - parallax.y) * .14;
    document.body.style.setProperty('--nebula-x', `${(-parallax.x * THEME.parallaxRange).toFixed(2)}px`);
    document.body.style.setProperty('--nebula-y', `${(-parallax.y * THEME.parallaxRange).toFixed(2)}px`);
  }

  const longitude = name => {
    const p = helio(name, T_CENT);
    return Math.atan2(p[1], p[0]);
  };
  const BASE = {};
  for (const r of RINGS.concat([MERCURY])) BASE[r.planet] = longitude(r.planet);

  function draw(){
    ctx.clearRect(0, 0, w, h);
    const cx = cvX(CX), cy = cvY(CY);

    /* Bodies are sized against the plot, not in fixed pixels: a sun that reads
       right against a 360px orbit is a third of the way to the rings on a
       phone. Mercury's track is dropped once it would sit inside the sun's
       own bloom. */
    const RC = cvX(R);
    const sunR   = Math.max(4.2, Math.min(10.5, RC*0.085)) * THEME.sunSize;
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

    drawSun(cx, cy, sunR);
  }

  function placeNodes(){
    for (let i=0; i<seats.length; i++){
      const s = seats[i];
      const rr = frac(RINGS[s.ring].a) * R;
      const th = s.phase + rate(RINGS[s.ring].a)*clock;
      nodes[i].style.transform =
        `translate(${CX + Math.cos(th)*rr - NODE_HALF}px, ${CY + Math.sin(th)*rr - NODE_HALF}px)`;
    }
  }

  /* ═══ 9. Selection ════════════════════════════════════════ */
  const IDLE = `<div class="det-in"><p class="det-idle"><b>Twelve apps.</b>
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
        ${FX.hologram ? `<div class="det-holo" data-app="${a.id}" aria-hidden="true">
          <span class="holo-orbit holo-orbit-a"></span>
          <span class="holo-orbit holo-orbit-b"></span>
          <span class="holo-icon">${iconSVG(a.id)}</span>
          <span class="holo-axis"></span>
        </div>` : ''}
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
  const DWELL = 6.8, RESUME_AFTER = 1.8;
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

  /* App launch: collapse the current star field toward the chosen body, then
     navigate. Modified clicks retain native new-tab behaviour. */
  let launching=false;
  const launchVeil=document.createElement('div');
  launchVeil.className='launch-veil';launchVeil.setAttribute('aria-hidden','true');
  if(FX.launch)document.body.appendChild(launchVeil);

  function launchTo(i,href){
    if(launching)return;
    launching=true;held=true;select(i);
    const r=nodes[i]?.getBoundingClientRect();
    const x=r?r.left+r.width/2:innerWidth/2,y=r?r.top+r.height/2:innerHeight/2;
    document.body.style.setProperty('--launch-x',`${x}px`);
    document.body.style.setProperty('--launch-y',`${y}px`);
    nodes[i]?.classList.add('is-launching');
    requestAnimationFrame(()=>document.body.classList.add('is-launching'));
    setTimeout(()=>{location.href=href},THEME.launchMs);
  }

  document.addEventListener('click',e=>{
    if(!FX.launch||reduce||launching||e.defaultPrevented||e.button!==0||
       e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const a=e.target.closest('a[href]');
    if(!a||a.target==='_blank'||a.hasAttribute('download'))return;
    let url;try{url=new URL(a.href,location.href)}catch{return}
    const i=ORDER.findIndex(app=>new URL(app.url,location.href).href===url.href);
    if(i<0)return;
    e.preventDefault();launchTo(i,url.href);
  });

  addEventListener('pageshow',e=>{
    if(!e.persisted)return;
    launching=false;held=false;document.body.classList.remove('is-launching');
    nodes.forEach(n=>n.classList.remove('is-launching'));
  });

  /* ═══ 10. About ═══════════════════════════════════════════ */
  const about = document.getElementById('about');
  const aboutBody = document.getElementById('aboutBody');
  const openBtn = document.getElementById('aboutOpen');
  const backBtn = document.getElementById('aboutBack');

  aboutBody.innerHTML = `
    <div class="ab-intro-block">
      <h2>${RESUME.name}</h2>
      <p class="ab-lede">${RESUME.lede}</p>
      <p class="ab-intro">${RESUME.intro}</p>
    </div>
    <div class="ab-grid">
      <section class="ab-work">
        <h3>Work</h3>
        ${RESUME.roles.map(r => `
          <article class="ab-role">
            <div class="ab-role-head">
              <h4>${r.org}</h4><span class="ab-role-meta">${r.meta}</span>
            </div>
            <ul>${r.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
          </article>`).join('')}
      </section>
      <section class="ab-secondary">
        <h3>What I work in</h3>
        ${RESUME.skills.map(s => `
          <div class="ab-skill"><h4>${s.title}</h4><p>${s.items}</p></div>`).join('')}
        <h3>Get in touch</h3>
        <div class="ab-links">${RESUME.links.map(l =>
          `<a href="${l.url}"${l.external ? ' target="_blank" rel="me noopener noreferrer"' : ''}>${l.label}</a>`
        ).join('')}</div>
      </section>
    </div>`;

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
    stepParallax();
  }

  layout();
  /* Repaint once after the page reveal as a final guard against late font or
     viewport changes. Ignore the looping animations on child elements. */
  const pageRoot = document.querySelector('[data-page-root]');
  const settleEntrance = e => {
    if (e.target !== pageRoot) return;
    pageRoot.removeEventListener('animationend', settleEntrance);
    requestAnimationFrame(layout);
  };
  pageRoot?.addEventListener('animationend', settleEntrance);
  addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  requestAnimationFrame(frame);
})();
