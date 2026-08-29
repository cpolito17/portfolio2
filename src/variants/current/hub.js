/* ═══ Tiles (current) ═══════════════════════════════════════
   Layout only. App copy, URLs, and icons come from core/apps.js.

   Apps are placed in a fixed order. An earlier pass shuffled them per load, but
   anchoring a tile to a position and shuffling that position are incompatible, so
   the shuffle is gone. Games sit at the bottom, Cairn stays at the top. */
const A = Object.fromEntries(ORDER.map(a => [a.id, a]));

/* Grid geometry. Source order is also the mobile order, since the single column
   follows the DOM. The three games and Tax Haven land in the bottom two rows. */
const SLOTS = [
  { app: A.cairn,        t:'lg', col:'1 / 3', row:1 },
  { app: A.ghost,        t:'sm', col:'3 / 4', row:1 },
  { app: A.liteedit,     t:'sm', col:'4 / 5', row:1 },
  { app: A.ttlw,         t:'sm', col:'1 / 2', row:2 },
  { app: A.keeran,       t:'sm', col:'2 / 3', row:2 },
  { app: A.trajectory,   t:'lg', col:'3 / 5', row:2 },
  { app: A.taxhaven,     t:'sm', col:'1 / 2', row:3 },
  { app: A.localize,     t:'lg', col:'2 / 4', row:3 },
  { app: A.homegamehero, t:'sm', col:'4 / 5', row:3 },
  { app: A.apex,         t:'lg', col:'1 / 3', row:4 },
  { app: A.payload,      t:'sm', col:'3 / 4', row:4 },
  { app: A.garagechallenge, t:'lg', col:'1 / 3', row:5 }
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
  <a class="tile about sm" href="${ABOUT_LINK.url}" style="grid-column:4 / 5;grid-row:4">
    <span class="tile-inner">
      <span class="icon-well">${iconSVG(ABOUT_LINK.id)}</span>
      <span class="tile-copy"><span class="tile-name">${ABOUT_LINK.name}</span></span>
    </span>
  </a>`;
