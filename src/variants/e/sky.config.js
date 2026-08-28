/* ═══ E · sky ═══════════════════════════════════════════════
   The horizon framing stays, because on this page the apps are IN the sky and
   they need a sky with a floor to be in. Two things get out of their way: the
   catalogue stars are pulled down so eleven bright app-stars are unambiguously
   the brightest things in frame, and the planets keep their dot treatment but
   lose their callouts, since the callout mechanic is now spoken for.

   The grain coarsens toward the edge of the frame, which is the one honest
   trick available for depth in a medium with six sky colours. */
window.SKY_OPTS = {
  bayer: 8,
  ditherDepth: 1.8,
  skyRamp:  [[5,6,14],[9,12,26],[14,19,44],[21,29,65],[29,41,90],[39,53,113]],
  glowRamp: [[203,224,255],[139,181,238],[86,131,200],[52,84,143],[34,55,99]],
  starGain: 0.72,
  planets: 'dot',
  labels: null,
  sats: 2
};
