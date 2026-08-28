window.SKY_OPTS = {
  viewAlt:90, halfFov:78, bayer:16, ditherDepth:1.25,
  skyRamp:[[2,6,16],[4,13,29],[7,24,43],[12,39,58],[21,57,76],[40,76,94]],
  glowRamp:[[217,255,248],[124,244,221],[92,181,217],[83,112,185],[69,67,137]],
  limb:null, planets:'off', labels:null, starGain:1.18, sats:1, fps:12
};
window.ORBIT_THEME = {
  plate:[15,63,74], grain:20, motion:.72, sunSize:1.16, sunActivity:1.25,
  effects:{parallax:true,launch:true,hologram:true},
  parallaxRange:10, launchMs:560,
  sunRamp:[[255,255,237],[255,232,139],[255,178,72],[237,102,58],[154,50,74],[67,30,71]],
  planetRamp:[[239,230,255],[184,151,245],[115,104,209],[60,61,143]],
  cometCool:[[255,255,255],[165,255,235],[91,206,224],[80,100,198]],
  cometWarm:[[255,255,255],[230,207,255],[170,126,245],[99,70,180]],
  cometHead:'#efffff', rocketTrail:'rgba(105,240,210,.88)', rocketHead:'#eafff9',
  sparkWarm:'rgba(206,155,255,.9)', sparkCool:'rgba(109,246,222,.92)',
  orbitActive:'rgba(105,240,210,.95)', orbitIdle:'rgba(135,167,221,.38)',
  orbitFaint:'rgba(135,167,221,.2)'
};
