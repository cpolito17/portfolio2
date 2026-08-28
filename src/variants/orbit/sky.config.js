/* ═══ Orbit · sky ═══════════════════════════════════════════
   The page looks down on the ecliptic, so the horizon framing is switched off:
   no Earth limb, camera at the zenith, and no engine-drawn planets, because the
   diagram in front draws them itself from above. What the engine is still the
   right tool for is a real star field, dithered, its grain coarsening toward
   the edge of the frame so the field reads as having depth behind the plot. */
window.SKY_OPTS = {
  viewAlt: 90, halfFov: 78,
  bayer: 8,
  ditherDepth: 2.2,
  skyRamp:  [[4,5,11],[7,9,19],[10,14,29],[14,20,41],[19,28,56],[25,37,72]],
  limb: null,
  planets: 'off',
  labels: null,
  starGain: 1.25,
  sats: 0,
  fps: 12
};
