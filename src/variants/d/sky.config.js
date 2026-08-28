/* ═══ D · sky ═══════════════════════════════════════════════
   This page looks down on the ecliptic, so the horizon framing makes no sense
   here: the Earth's limb is switched off, the camera points at the zenith, and
   the planets are not drawn by the engine at all because the diagram in front
   draws them itself, from above, at their real heliocentric longitudes.

   What is left is what the engine is still the right tool for: a real star
   field, dithered, with the grain coarsening toward the edge of the frame so
   the field reads as having depth behind the diagram. */
window.SKY_OPTS = {
  viewAlt: 90, halfFov: 78,
  bayer: 8,
  ditherDepth: 2.2,
  skyRamp:  [[4,5,11],[7,9,19],[10,14,29],[14,20,41],[19,28,56],[25,37,72]],
  limb: null,
  planets: 'off',
  labels: null,
  starGain: 1.25,
  sats: 1,
  fps: 12
};
