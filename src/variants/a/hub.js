/* ═══ A · Observatory ═══════════════════════════════════════
   The index owns selection; the readout is a pure function of it. Pointer and
   caret drive the same state, so hovering and tabbing behave identically and
   the readout is never out of step with what is highlighted. */
(() => {
  const index   = document.getElementById('index');
  const readout = document.getElementById('readout');

  index.innerHTML = ORDER.map((a, i) => `
    <li>
      <a class="row" href="${a.url}" data-i="${i}">
        <span class="row-num">${String(i + 1).padStart(2, '0')}</span>
        <span>
          <span class="row-name">${a.name}</span>
          <span class="row-desc">${a.desc}</span>
        </span>
      </a>
    </li>`).join('');

  const rows = [...index.querySelectorAll('.row')];

  const IDLE = `
    <div class="read-body">
      <p class="read-idle"><b>Eleven apps</b>Every one started as a problem I wanted
      solved for myself. Pick one from the index to read what it does.</p>
    </div>`;

  function card(a){
    return `
    <div class="read-body">
      <span class="read-icon">${iconSVG(a.id)}</span>
      <h2 class="read-name">${a.name}</h2>
      <p class="read-desc">${a.desc}</p>
      ${a.note ? `<p class="read-note">${a.note}</p>` : ''}
      <span class="read-open">Open
        <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 3 L11 8 L6 13"/>
        </svg>
      </span>
    </div>`;
  }

  let active = -1;
  function select(i){
    if (i === active) return;
    active = i;
    rows.forEach((r, n) => r.dataset.active = String(n === i));
    readout.innerHTML = i < 0 ? IDLE : card(ORDER[i]);
  }
  readout.innerHTML = IDLE;

  rows.forEach((r, i) => {
    r.addEventListener('mouseenter', () => select(i));
    r.addEventListener('focus',      () => select(i));
  });
  index.addEventListener('mouseleave', () => { if (!index.contains(document.activeElement)) select(-1); });

  /* Up and down walk the index without leaving it, which is what a list of this
     shape implies; Home and End jump to the ends. */
  index.addEventListener('keydown', e => {
    const at = rows.indexOf(document.activeElement);
    if (at < 0) return;
    const to = e.key === 'ArrowDown' ? at + 1
             : e.key === 'ArrowUp'   ? at - 1
             : e.key === 'Home'      ? 0
             : e.key === 'End'       ? rows.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, to))].focus();
  });

  /* ── Ephemeris ────────────────────────────────────────────
     Read back from the sky engine rather than recomputed, so the rail can never
     disagree with what is actually drawn overhead. Bodies below the horizon are
     not up, so they are not listed. */
  const ephem = document.getElementById('ephem');
  const DEGS = Math.PI / 180;
  const COMPASS = ['N','NE','E','SE','S','SW','W','NW'];

  function writeEphem(){
    const up = bodies
      .filter(b => b.name !== 'Sun' && b.alt > 3 * DEGS)
      .sort((a, b) => b.alt - a.alt)
      .slice(0, 4);
    ephem.innerHTML = `<div class="ephem-head">Overhead now</div>` + (up.length
      ? up.map(b => {
          const deg = Math.round(b.alt / DEGS);
          const dir = COMPASS[Math.round((((b.az / DEGS) % 360) + 360) % 360 / 45) % 8];
          return `<dt>${b.name}</dt><dd>${deg}&deg; ${dir}</dd>`;
        }).join('')
      : `<dt>Planets</dt><dd>none up</dd>`);
  }
  writeEphem();
  setInterval(writeEphem, 60000);
})();
