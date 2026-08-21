const ICONS = __ICONS__;
const STARS_RAW = "__STARS__";

/* ═══ 1. Astronomy ══════════════════════════════════════════
   Everything here is standard spherical astronomy + the JPL low-precision
   Keplerian element set. Accuracy is arcminutes; one pixel of this sky is
   roughly half a degree, so we are ~50x more accurate than the display. */
const DEG = Math.PI/180;
const HOME = { lat: 42.2808, lon: -83.7430 };   // deliberately unnamed on the page

function skyMoment(){                            // always night, current date
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 5, 0, 0);
}
const toJD = ms => ms/86400000 + 2440587.5;

function gmstDeg(jd){
  const d = jd - 2451545.0, T = d/36525;
  let g = 280.46061837 + 360.98564736629*d + 0.000387933*T*T - T*T*T/38710000;
  return ((g % 360) + 360) % 360;
}
function altazOf(raDeg, decDeg, lstDeg, latDeg){
  const H = (lstDeg - raDeg)*DEG, d = decDeg*DEG, p = latDeg*DEG;
  const sd=Math.sin(d), cd=Math.cos(d), sp=Math.sin(p), cp=Math.cos(p), cH=Math.cos(H);
  const alt = Math.asin(sd*sp + cd*cp*cH);
  const az  = Math.atan2(-Math.sin(H)*cd, sd*cp - cd*sp*cH);
  return [alt, az];
}
const dirOf = (alt, az) => { const c=Math.cos(alt); return [c*Math.sin(az), c*Math.cos(az), Math.sin(alt)]; };

/* JPL approximate elements, valid 1800-2050.
   [a,e,I,L,wbar,Omega, then per-century rates] */
const ELEM = {
  Mercury:[0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593,
           0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081],
  Venus:  [0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255,
           0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418],
  Earth:  [1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0.0,
           0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0.0],
  Mars:   [1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891,
           0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343],
  Jupiter:[5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909,
           -0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106],
  Saturn: [9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448,
           -0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794],
  Uranus: [19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503,
           -0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589],
  Neptune:[30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574,
           0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664]
};
function helio(name, T){
  const E = ELEM[name];
  const a=E[0]+E[6]*T, e=E[1]+E[7]*T, I=(E[2]+E[8]*T)*DEG;
  const L=E[3]+E[9]*T, wb=E[4]+E[10]*T, Om=(E[5]+E[11]*T)*DEG;
  const w = wb*DEG - Om;
  let M = ((L - wb + 180) % 360 + 360) % 360 - 180; M *= DEG;
  let Ecc = M + e*Math.sin(M);                    // Newton on Kepler's equation
  for (let i=0;i<12;i++){
    const dM = M - (Ecc - e*Math.sin(Ecc));
    const dE = dM/(1 - e*Math.cos(Ecc));
    Ecc += dE; if (Math.abs(dE) < 1e-12) break;
  }
  const xp = a*(Math.cos(Ecc)-e), yp = a*Math.sqrt(1-e*e)*Math.sin(Ecc);
  const cw=Math.cos(w), sw=Math.sin(w), cO=Math.cos(Om), sO=Math.sin(Om),
        cI=Math.cos(I), sI=Math.sin(I);
  return [ (cw*cO - sw*sO*cI)*xp + (-sw*cO - cw*sO*cI)*yp,
           (cw*sO + sw*cO*cI)*xp + (-sw*sO + cw*cO*cI)*yp,
           (sw*sI)*xp + (cw*sI)*yp ];
}
const OBLIQ = 23.43928*DEG;
function bodyRaDec(name, T, earth){
  let g;
  if (name === 'Sun') g = [-earth[0], -earth[1], -earth[2]];
  else { const p = helio(name, T); g = [p[0]-earth[0], p[1]-earth[1], p[2]-earth[2]]; }
  const xq = g[0],
        yq = g[1]*Math.cos(OBLIQ) - g[2]*Math.sin(OBLIQ),
        zq = g[1]*Math.sin(OBLIQ) + g[2]*Math.cos(OBLIQ);
  const r = Math.hypot(xq, yq, zq);
  return [ ((Math.atan2(yq,xq)/DEG)%360+360)%360, Math.asin(zq/r)/DEG ];
}

/* ═══ 2. Star catalogue ═════════════════════════════════════ */
const SPEC_TINT = [                              // O B A F G K M
  [200,214,255],[210,222,255],[236,241,255],[255,250,240],
  [255,242,214],[255,222,180],[255,198,164]
];
const STARS = (() => {
  const v = STARS_RAW.split(',');
  const n = v.length/4, out = new Array(n);
  for (let i=0;i<n;i++){
    out[i] = { ra:+v[i*4]/100, dec:+v[i*4+1]/100, mag:+v[i*4+2]/10, cls:+v[i*4+3],
               tw: Math.random()*Math.PI*2 };
  }
  return out;
})();

/* ═══ 3. Fisheye projection ═════════════════════════════════
   Stereographic. An all-sky view IS a fisheye, so the barrel character and
   the arcing of every path across the sky fall out of the projection being
   correct - none of it is faked. */
const VIEW_AZ = 178*DEG, VIEW_ALT = 38*DEG, HALF_FOV = 70*DEG;
const F = dirOf(VIEW_ALT, VIEW_AZ);
const RIGHT = (() => { const r=[F[1],-F[0],0], m=Math.hypot(r[0],r[1]); return [r[0]/m,r[1]/m,0]; })();
const UP = [ RIGHT[1]*F[2]-RIGHT[2]*F[1], RIGHT[2]*F[0]-RIGHT[0]*F[2], RIGHT[0]*F[1]-RIGHT[1]*F[0] ];
const RHO_EDGE = 2*Math.sin(HALF_FOV)/(1+Math.cos(HALF_FOV));

function project(v){
  const d = v[0]*F[0]+v[1]*F[1]+v[2]*F[2];
  if (d < -0.35) return null;                    // behind the viewer
  const k = 2/(1+d);
  return [ k*(v[0]*RIGHT[0]+v[1]*RIGHT[1]+v[2]*RIGHT[2]),
           k*(v[0]*UP[0]   +v[1]*UP[1]   +v[2]*UP[2]) ];
}
function unproject(x, y){                        // for the static sky gradient
  const r2 = x*x+y*y, d = (4-r2)/(4+r2), s = 4/(4+r2);
  return [ F[0]*d + RIGHT[0]*x*s + UP[0]*y*s,
           F[1]*d + RIGHT[1]*x*s + UP[1]*y*s,
           F[2]*d + RIGHT[2]*x*s + UP[2]*y*s ];
}

/* ═══ 4. Dithered sky ═══════════════════════════════════════ */
const BAYER8 = (() => {
  const m=[[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],
           [60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],
           [15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]];
  return m.map(r => r.map(v => (v+0.5)/64));
})();
const SKY_RAMP = [[5,6,13],[10,13,24],[16,21,41],[24,32,60],[33,44,82],[43,56,104]];
/* Atmospheric limb: bright rim fading outward into the star field. */
const GLOW_RAMP = [[207,226,255],[143,184,238],[90,134,200],[56,87,143],[37,58,99]];
const EARTH_RAMP = [[12,22,44],[8,15,32],[5,10,22],[3,6,14]];

/* The sky is the real sky over HOME; the Earth below is the body you are above.
   From just outside the atmosphere the star positions are identical to the
   ground-level ones (parallax is far under a pixel), so the two stay coherent
   while the limb reads convex - curving away - the way it does from orbit. */
const LIMB_TOP = 0.84, LIMB_R = 2.35, GLOW_W = 0.034;   // fractions of canvas width

/* Deterministic scatter so city lights never shimmer between frames. */
function hash2(x, y){
  // Math.imul, not *: a plain float multiply overflows 32 bits and drops exactly
  // the low bits the hash depends on, collapsing it to a handful of values.
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function landMass(u, v){                 // coarse blobs -> continents vs ocean
  let s = 0;
  s += Math.sin(u*3.1 + 1.7)*Math.cos(v*2.3 - 0.4);
  s += 0.6*Math.sin(u*6.7 - 2.1)*Math.cos(v*5.1 + 1.2);
  s += 0.35*Math.sin(u*13.3 + 0.6)*Math.cos(v*11.7 - 2.2);
  return s;
}

const cv = document.getElementById('sky');
const ctx = cv.getContext('2d', { alpha:false });
let W=0, H=0, SCALE=1, CX=0, CY=0, backdrop=null;

function buildBackdrop(){
  const img = ctx.createImageData(W, H), px = img.data;
  const R = LIMB_R*W, gw = GLOW_W*W;
  const cxE = CX, cyE = LIMB_TOP*H + R;          // limb centre sits far below frame
  for (let py=0; py<H; py++){
    for (let pxi=0; pxi<W; pxi++){
      const t = BAYER8[py & 7][pxi & 7];
      const dE = Math.hypot(pxi - cxE, py - cyE);
      let c;
      if (dE < R){                                  // ── the planet
        const depth = Math.min(1, (R - dE)/(gw*6.0));
        const lvl = Math.min(EARTH_RAMP.length-1, Math.floor(depth*(EARTH_RAMP.length-1) + t*0.8));
        c = EARTH_RAMP[lvl];
        // city lights: clustered on "land", thinning toward the terminator
        const u = (pxi - cxE)/R*17.0, v = (py - cyE)/R*17.0 + 17.0;
        if (landMass(u, v) > 0.38 && depth > 0.03){
          const r = hash2(pxi, py);
          if (r > 0.972 - 0.012*Math.min(1, depth*1.4)){
            const warm = r > 0.9975;
            c = warm ? [226,186,128] : [150,116,72];
          }
        }
      } else if (dE < R + gw){                      // ── atmosphere
        const f = (dE - R)/gw;                      // 0 at the limb, 1 at the top
        const lvl = Math.min(GLOW_RAMP.length-1, Math.floor(Math.pow(f,0.45)*GLOW_RAMP.length + t*0.9));
        c = GLOW_RAMP[lvl];
      } else {                                      // ── sky, from real altitude
        const x = (pxi - CX)/SCALE, y = (CY - py)/SCALE;
        const v = unproject(x, y);
        const alt = Math.asin(Math.max(-1, Math.min(1, v[2])));
        const b = Math.pow(Math.max(0, 1 - Math.max(0,alt)/(80*DEG)), 1.9);
        const fade = Math.min(1, (dE - R - gw)/(gw*2.6));   // blend out of the glow
        const lvl = Math.min(SKY_RAMP.length-1,
                             Math.floor(b*(SKY_RAMP.length-1)*(0.45+0.55*fade) + t));
        c = SKY_RAMP[lvl];
      }
      const o = (py*W + pxi)*4;
      px[o]=c[0]; px[o+1]=c[1]; px[o+2]=c[2]; px[o+3]=255;
    }
  }
  backdrop = img;
}
/* Anything the planet covers is occluded - stars, planets and satellites alike. */
function occluded(sx, sy){
  const R = LIMB_R*W;
  return Math.hypot(sx - CX, sy - (LIMB_TOP*H + R)) < R + GLOW_W*W*0.42;
}
function resize(){
  const vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
  W = Math.min(560, Math.round(vw/3.2));
  H = Math.max(1, Math.round(W * vh/vw));
  cv.width = W; cv.height = H;
  cv.style.width = vw+'px'; cv.style.height = vh+'px';
  CX = W/2; CY = H/2;
  SCALE = (W/2)/RHO_EDGE;
  buildBackdrop();
  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  VIEW_W = vw; VIEW_H = vh;
}

/* ═══ 5. Satellites - great-circle paths, arced by the projection ═══ */
const sats = [];
function spawnSat(){
  const th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1);
  const pole = [Math.sin(ph)*Math.cos(th), Math.sin(ph)*Math.sin(th), Math.cos(ph)];
  let u = Math.abs(pole[2]) < 0.9 ? [0,0,1] : [1,0,0];
  let a = [ pole[1]*u[2]-pole[2]*u[1], pole[2]*u[0]-pole[0]*u[2], pole[0]*u[1]-pole[1]*u[0] ];
  const am = Math.hypot(...a); a = a.map(v=>v/am);
  const b = [ pole[1]*a[2]-pole[2]*a[1], pole[2]*a[0]-pole[0]*a[2], pole[0]*a[1]-pole[1]*a[0] ];
  sats.push({ a, b, t: Math.random()*Math.PI*2, sp: 0.05 + Math.random()*0.05, life: 0,
              max: 150 + Math.random()*120, trail: [] });
}

/* ═══ 6. Render ═════════════════════════════════════════════ */
const svg = document.getElementById('labels');
let VIEW_W = 0, VIEW_H = 0;
let lstDeg = 0, T_CENT = 0, EARTH = null, bodies = [];

function recomputeSky(){
  const ms = skyMoment(), jd = toJD(ms);
  T_CENT = (jd - 2451545.0)/36525;
  lstDeg = (gmstDeg(jd) + HOME.lon + 360) % 360;
  EARTH = helio('Earth', T_CENT);
  bodies = ['Sun','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'].map(n => {
    const [ra, dec] = bodyRaDec(n, T_CENT, EARTH);
    const [alt, az] = altazOf(ra, dec, lstDeg, HOME.lat);
    return { name:n, alt, az, dir: dirOf(alt, az) };
  });
}

function drawStars(now){
  for (let i=0;i<STARS.length;i++){
    const s = STARS[i];
    const [alt, az] = altazOf(s.ra, s.dec, lstDeg, HOME.lat);
    if (alt <= 0.5*DEG) continue;
    const p = project(dirOf(alt, az)); if (!p) continue;
    const sx = (CX + p[0]*SCALE) | 0, sy = (CY - p[1]*SCALE) | 0;
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    if (occluded(sx, sy)) continue;
    let b = Math.pow(Math.max(0, (5.7 - s.mag)/6.6), 1.1);
    if (s.mag < 3.2) b *= 0.86 + 0.14*Math.sin(now*0.0022 + s.tw);   // twinkle
    if (b < 0.035) continue;
    const tint = SPEC_TINT[s.cls] || SPEC_TINT[2];
    ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${Math.min(1,b)})`;
    ctx.fillRect(sx, sy, 1, 1);
    if (s.mag < 1.4){                                    // brightest get a cross
      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${Math.min(1,b)*0.4})`;
      ctx.fillRect(sx-1, sy, 1, 1); ctx.fillRect(sx+1, sy, 1, 1);
      ctx.fillRect(sx, sy-1, 1, 1); ctx.fillRect(sx, sy+1, 1, 1);
    }
  }
}

function drawBodies(){
  const placed = [];
  for (const b of bodies){
    if (b.alt <= 1*DEG) continue;
    const p = project(b.dir); if (!p) continue;
    const sx = CX + p[0]*SCALE, sy = CY - p[1]*SCALE;
    if (sx < 2 || sy < 2 || sx > W-2 || sy > H-2) continue;
    if (occluded(sx, sy)) continue;
    const big = b.name === 'Sun' ? 3 : (b.name==='Jupiter'||b.name==='Venus') ? 2 : 1;
    ctx.fillStyle = b.name === 'Sun' ? '#ffe6a8' : '#ffd9a0';
    ctx.fillRect((sx-(big>>1))|0, (sy-(big>>1))|0, big, big);
    if (big > 1){
      ctx.fillStyle = 'rgba(255,217,160,.28)';
      ctx.fillRect((sx-big)|0, sy|0, 1, 1); ctx.fillRect((sx+big-1)|0, sy|0, 1, 1);
    }
    placed.push({ name:b.name, x: sx/W*VIEW_W, y: sy/H*VIEW_H });
  }
  layoutLabels(placed);
}

/* Labels live in SVG, never in the pixel buffer - pixel-art text at this size
   is unreadable, and the leader lines want crisp sub-pixel strokes. */
let lastLabelKey = '';
function layoutLabels(items){
  const gridEl = document.getElementById('grid');
  const gb = gridEl ? gridEl.getBoundingClientRect() : {left:0,right:VIEW_W};
  const PAD = 14, MIN_MARGIN = 96;
  const leftRoom = gb.left, rightRoom = VIEW_W - gb.right;
  if (Math.max(leftRoom, rightRoom) < MIN_MARGIN){ svg.textContent=''; lastLabelKey=''; return; }

  for (const it of items){
    const useLeft = it.x < VIEW_W/2 ? leftRoom >= MIN_MARGIN : rightRoom < MIN_MARGIN;
    it.side = useLeft ? -1 : 1;
    it.lx = useLeft ? gb.left - PAD : gb.right + PAD;
  }
  // stack each side independently so callouts never collide
  for (const side of [-1, 1]){
    const col = items.filter(i => i.side === side).sort((a,b) => a.y - b.y);
    let prev = -1e9;
    for (const it of col){ it.ly = Math.max(it.y, prev + 16); prev = it.ly; }
  }
  const key = items.map(i => i.name + i.side).join('|');
  if (key === lastLabelKey && svg.childNodes.length === items.length){
    let i = 0;
    for (const it of items){
      const g = svg.childNodes[i++];
      g.childNodes[0].setAttribute('d', leader(it));
      for (const t of [g.childNodes[1], g.childNodes[2]]){
        t.setAttribute('x', it.lx); t.setAttribute('y', it.ly + 3);
        t.setAttribute('text-anchor', it.side < 0 ? 'end' : 'start');
      }
    }
    return;
  }
  lastLabelKey = key;
  svg.textContent = '';
  for (const it of items){
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('class','lbl-line'); path.setAttribute('pathLength','1');
    path.setAttribute('d', leader(it));
    g.appendChild(path);
    for (const cls of ['lbl-halo','lbl-text']){
      const el = document.createElementNS('http://www.w3.org/2000/svg','text');
      el.setAttribute('class', cls);
      el.setAttribute('x', it.lx); el.setAttribute('y', it.ly + 3);
      el.setAttribute('text-anchor', it.side < 0 ? 'end' : 'start');
      el.textContent = it.name;
      g.appendChild(el);
    }
    svg.appendChild(g);
  }
}
const leader = it => { const e = it.lx + it.side*6, k = it.lx + it.side*20;
  return `M ${it.x + it.side*4} ${it.y} L ${k} ${it.ly} L ${e} ${it.ly}`; };

function drawSats(){
  for (let i=sats.length-1; i>=0; i--){
    const s = sats[i];
    s.t += s.sp*DEG; s.life++;
    if (s.life > s.max){ sats.splice(i,1); continue; }
    const c = Math.cos(s.t), sn = Math.sin(s.t);
    const v = [ s.a[0]*c + s.b[0]*sn, s.a[1]*c + s.b[1]*sn, s.a[2]*c + s.b[2]*sn ];
    if (v[2] <= 0.02) { s.trail.length = 0; continue; }
    const p = project(v); if (!p){ s.trail.length = 0; continue; }
    const sx = CX + p[0]*SCALE, sy = CY - p[1]*SCALE;
    s.trail.push([sx, sy]); if (s.trail.length > 7) s.trail.shift();
    for (let k=0;k<s.trail.length;k++){
      const a = (k+1)/s.trail.length * 0.7;
      ctx.fillStyle = `rgba(226,236,255,${a})`;
      ctx.fillRect(s.trail[k][0]|0, s.trail[k][1]|0, 1, 1);
    }
  }
  if (sats.length < 2 && Math.random() < 0.02) spawnSat();
}

/* 12fps: pixel art wants a chunky frame rate, and every glass tile re-blurs
   its backdrop on every frame the sky changes - so this is the main
   performance lever, not a compromise. */
const FRAME_MS = 1000/12;
let lastFrame = 0, lastSky = 0;
function loop(now){
  requestAnimationFrame(loop);
  if (now - lastFrame < FRAME_MS) return;
  lastFrame = now;
  if (now - lastSky > 30000 || !EARTH){ recomputeSky(); lastSky = now; }
  ctx.putImageData(backdrop, 0, 0);
  drawStars(now); drawSats(); drawBodies();
}