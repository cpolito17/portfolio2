/* About: content rises into view in a stagger. Motivated by hierarchy - the eye
   is led down the page in reading order instead of meeting all of it at once. */
resize(); recomputeSky();
for (let i=0;i<2;i++) spawnSat();
requestAnimationFrame(loop);
window.addEventListener('resize', resize);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const items = [...document.querySelectorAll('.rise')];
if (reduce){
  items.forEach(el => el.classList.add('shown'));
} else {
  items.forEach((el, i) => {
    el.style.transitionDelay = Math.min(i * 70, 560) + 'ms';
  });
  requestAnimationFrame(() => items.forEach(el => el.classList.add('shown')));
}
