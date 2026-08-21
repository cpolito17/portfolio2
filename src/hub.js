/* ═══ Tiles ═════════════════════════════════════════════════ */
const PAL = { '1':'#E8EDF7','2':'#9AA6C4','3':'#4A5578','4':'#E8C170' };
function iconSVG(name){
  const rows = ICONS[name]; if (!rows) return '';
  let r = '';
  for (let y=0;y<16;y++) for (let x=0;x<16;x++){
    const c = rows[y][x];
    if (c === '.') continue;
    r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[c]}"/>`;
  }
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

/* Cairn is pinned to the first large slot; the other three shuffle. */
const CAIRN = { id:'cairn', name:'Cairn', url:'https://tasks.charliepolito.com',
  desc:'Plan the week by dragging tasks onto a calendar grid. Shows which tasks are waiting on others, and keeps personal and work separate.' };

const LARGE = [
  { id:'localize', name:'Localize', url:'https://charliepolito.com/localize',
    desc:'Search a big-box brand, get the independent shops near you instead. Every result is scored 0 to 100 on how locally owned it actually is.' },
  { id:'apex', name:'Apex', url:'https://charliepolito.com/apex',
    desc:'Ranks the roads worth driving near any address. Colors every corner by how tight it is, and re-sorts instantly when you change the weighting.' },
  { id:'trajectory', name:'Trajectory', url:'https://charliepolito.com/trajectory',
    desc:'Projects your net worth from today to age 100. Drop life events on the timeline and watch the curve move. No account, and nothing leaves your browser.' }
];
const SMALL = [
  { id:'homegamehero', name:'HomeGameHero', url:'https://charliepolito.com/homegame',
    desc:'Chip, blind, and payout math for home poker. Settles the night in the fewest payments.' },
  { id:'liteedit', name:'LiteEdit', url:'https://liteedit.charliepolito.com',
    desc:'A photo editor that runs in your browser. Layers and full undo, with no upload.' },
  { id:'ttlw', name:'Take the Long Way', url:'https://charliepolito.com/takethelongway',
    desc:'Finds the ghost towns and roadside oddities along your route, then sends it to Google Maps.' },
  { id:'taxhaven', name:'Tax Haven', url:'https://charliepolito.com/taxhaven',
    desc:'Redesign the US tax code and federal budget, then simulate what it does to the country.' },
  { id:'payload', name:'PAYLOAD', url:'https://charliepolito.com/payload',
    desc:'A space-mining roguelite. Drill for ore, then survive the launch back to orbit.' },
  { id:'keeran', name:'Architecture Portfolio', url:'https://keerancross.com',
    desc:'Built for my girlfriend. Full Frutiger Aero, down to the Windows 98 cursor.' }
];

/* Slot template. Large tiles land on columns 1, 3, 2, 1 going down, so they read
   as scattered rather than as a staircase. The gap beside About me is deliberate:
   it stops About reading as the seventh app. */
const SLOTS = [
  { t:'lg', col:'1 / 3', row:1 }, { t:'sm', col:'3 / 4', row:1 }, { t:'sm', col:'4 / 5', row:1 },
  { t:'sm', col:'1 / 2', row:2 }, { t:'sm', col:'2 / 3', row:2 }, { t:'lg', col:'3 / 5', row:2 },
  { t:'sm', col:'1 / 2', row:3 }, { t:'lg', col:'2 / 4', row:3 }, { t:'sm', col:'4 / 5', row:3 },
  { t:'lg', col:'1 / 3', row:4 }
];
const shuffle = a => { a=a.slice();
  for (let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; }
  return a; };

const lg = shuffle(LARGE), sm = shuffle(SMALL);
let li = 0, si = 0;
const tiles = SLOTS.map((s, idx) => {
  const a = s.t === 'lg' ? (idx === 0 ? CAIRN : lg[li++]) : sm[si++];
  return `
  <a class="tile glass ${s.t}" href="${a.url}" style="grid-column:${s.col};grid-row:${s.row}">
    <span class="tile-inner">
      <span class="icon-well">${iconSVG(a.id)}</span>
      <span class="tile-copy">
        <span class="tile-name">${a.name}</span>
        <span class="tile-desc">${a.desc}</span>
      </span>
    </span>
  </a>`;
});

const grid = document.getElementById('grid');
grid.innerHTML = tiles.join('') + `
  <a class="tile about sm" href="/about" style="grid-column:4 / 5;grid-row:4">
    <span class="tile-inner">
      <span class="icon-well">${iconSVG('about')}</span>
      <span class="tile-copy"><span class="tile-name">About me</span></span>
    </span>
  </a>`;

window.addEventListener('resize', resize);
resize(); recomputeSky();
for (let i=0;i<2;i++) spawnSat();
requestAnimationFrame(loop);
