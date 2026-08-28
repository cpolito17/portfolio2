/* ═══ C · sky ═══════════════════════════════════════════════
   Same astronomy, different rendering. A 16x16 matrix puts the grain below the
   threshold of notice so the sky reads as a smooth field, which leaves the
   coarse dithering to the panels in front of it: the two are then telling the
   eye different things instead of competing. The ramp loses its purple, the
   limb flattens and widens, and the planets resolve into discs because nothing
   else on this page is round. */
window.SKY_OPTS = {
  bayer: 16,
  skyRamp:  [[4,7,15],[8,16,30],[12,26,50],[18,38,74],[26,52,100],[36,68,126]],
  glowRamp: [[214,236,255],[148,198,246],[88,150,216],[52,100,160],[32,62,108]],
  earthRamp:[[10,20,42],[7,14,30],[4,9,20],[2,5,12]],
  limb: { top: 0.90, r: 2.9, glow: 0.055 },
  planets: 'disc',
  planetScale: 1,
  labels: null,
  starGain: 1.15,
  sats: 2
};
