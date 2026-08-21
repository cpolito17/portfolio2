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

/* Apps are placed in a fixed order. An earlier pass shuffled them per load, but
   anchoring a tile to a position and shuffling that position are incompatible, so
   the shuffle is gone. Games sit at the bottom, Cairn stays at the top. */
const CAIRN = { id:'cairn', name:'Cairn', url:'https://tasks.charliepolito.com/demo',
  desc:'Plan the week by dragging tasks onto a calendar grid. Shows which tasks are waiting on others, and keeps personal and work separate.' };

const APPS = {
  compass: { id:'trajectory', name:'Compass', url:'https://charliepolito.com/trajectory',
    desc:'Projects your net worth from today to age 100. Drop life events on the timeline and watch the curve move. No account, and nothing leaves your browser.' },
  localize: { id:'localize', name:'Localize', url:'https://charliepolito.com/localize',
    desc:'Search a big-box brand, get the independent shops near you instead. Every result is scored 0 to 100 on how locally owned it actually is.',
    note:'Requires a login' },
  apex: { id:'apex', name:'Apex', url:'https://charliepolito.com/apex',
    desc:'Ranks the roads worth driving near any address. Colors every corner by how tight it is, and re-sorts instantly when you change the weighting.' },

  ghost: { id:'ghost', name:'Ghost in the Machine', url:'https://charliepolito.com/GhostInTheMachine',
    desc:'Learn how language models actually work, one short interactive lesson at a time.' },
  liteedit: { id:'liteedit', name:'LiteEdit', url:'https://liteedit.charliepolito.com',
    desc:'A photo editor that runs in your browser. Layers and full undo, with no upload.' },
  ttlw: { id:'ttlw', name:'Take the Long Way', url:'https://charliepolito.com/takethelongway',
    desc:'Finds the ghost towns and roadside oddities along your route, then sends it to Google Maps.' },
  keeran: { id:'keeran', name:'Architecture Portfolio', url:'https://keerancross.com',
    desc:'Built for my girlfriend. Full Frutiger Aero, down to the Windows 98 cursor.' },
  taxhaven: { id:'taxhaven', name:'Tax Haven', url:'https://charliepolito.com/taxhaven',
    desc:'Redesign the US tax code and federal budget, then simulate what it does to the country.' },
  homegame: { id:'homegamehero', name:'HomeGameHero', url:'https://charliepolito.com/homegame',
    desc:'Chip, blind, and payout math for home poker. Settles the night in the fewest payments.' },
  payload: { id:'payload', name:'PAYLOAD', url:'https://charliepolito.com/payload',
    desc:'A space-mining roguelite. Drill for ore, then survive the launch back to orbit.' }
};

/* Grid geometry is unchanged; only which app sits in which slot moved. Source
   order is also the mobile order, since the single column follows the DOM.
   The three games and Tax Haven land in the bottom two rows on desktop. */
const SLOTS = [
  { app: CAIRN,          t:'lg', col:'1 / 3', row:1 },
  { app: APPS.ghost,     t:'sm', col:'3 / 4', row:1 },
  { app: APPS.liteedit,  t:'sm', col:'4 / 5', row:1 },
  { app: APPS.ttlw,      t:'sm', col:'1 / 2', row:2 },
  { app: APPS.keeran,    t:'sm', col:'2 / 3', row:2 },
  { app: APPS.compass,   t:'lg', col:'3 / 5', row:2 },
  { app: APPS.taxhaven,  t:'sm', col:'1 / 2', row:3 },
  { app: APPS.localize,  t:'lg', col:'2 / 4', row:3 },
  { app: APPS.homegame,  t:'sm', col:'4 / 5', row:3 },
  { app: APPS.apex,      t:'lg', col:'1 / 3', row:4 },
  { app: APPS.payload,   t:'sm', col:'3 / 4', row:4 }
];

const tiles = SLOTS.map(s => {
  const a = s.app;
  const note = a.note ? `<span class="tile-note">${a.note}</span>` : '';
  return `
  <a class="tile glass ${s.t}" href="${a.url}" style="grid-column:${s.col};grid-row:${s.row}">
    <span class="tile-inner">
      <span class="icon-well">${iconSVG(a.id)}</span>
      <span class="tile-copy">
        <span class="tile-name">${a.name}</span>
        <span class="tile-desc">${a.desc}</span>
        ${note}
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
