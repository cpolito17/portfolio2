/* Page transition. Same-origin navigations play an exit before leaving, so the
   two pages read as one surface rather than a hard cut. Back navigations reverse
   the direction they left in. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const shell = document.querySelector('[data-page-root], .shell, .prose-wrap');
  if (!shell) return;

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    let url;
    try { url = new URL(a.href, location.href); } catch { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;

    e.preventDefault();
    const back = url.pathname === '/' || url.pathname === '/index.html';
    shell.classList.add(back ? 'page-exit-back' : 'page-exit');
    setTimeout(() => { location.href = url.href; }, 260);
  });

  // Returning via the browser's back button restores a cached, faded-out page.
  addEventListener('pageshow', ev => {
    if (ev.persisted) shell.classList.remove('page-exit', 'page-exit-back');
  });
})();
