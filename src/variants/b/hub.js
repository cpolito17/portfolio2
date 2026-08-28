/* ═══ B · Press ═════════════════════════════════════════════
   A static ruled index, rendered once. There is no state to hold: every row
   carries its own copy, so the page is complete the moment it is written and
   nothing here runs again. */
document.getElementById('index').innerHTML = ORDER.map((a, i) => `
  <li>
    <a class="entry" href="${a.url}">
      <span class="e-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="e-name">${a.name}</span>
      <span class="e-desc">${a.desc}${a.note ? `<span class="e-note">${a.note}</span>` : ''}</span>
      <span class="e-mark" aria-hidden="true">&rarr;</span>
    </a>
  </li>`).join('');
