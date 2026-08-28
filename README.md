# charliepolito.com

The hub at the root of `charliepolito.com`. A grid of app buttons over a dithered
pixel-art night sky computed from the real star catalogue and planetary ephemerides.

## Run it

```bash
npm run build     # assembles src/ into dist/
npm run dev       # build, then wrangler dev
npm run deploy    # build, then wrangler deploy
```

`build.mjs` is plain Node and `wrangler` is invoked through `npx`, so a clean
checkout builds and deploys with nothing installed. The one dependency,
Playwright, is only used by `shots.mjs` and `audit.mjs`, neither of which the
build or the deploy touches.

## Layout

```
src/
  core/         shared by every variant
    apps.js     the app catalogue: copy, URLs, icons. No markup.
    sky.js      astronomy, projection, and the dithered renderer
    nav.js      page transitions
    base.css    tokens, sky layers, liquid glass, page transitions
    about.js    staggered entrance for the resume
    about.css   the resume's own styles
  variants/     one directory per frontend
    <name>/
      variant.json   which core and local files this variant wants
      index.html     its hub shell
      styles.css     its layout
      hub.js         its behaviour
      sky.config.js  optional: its window.SKY_OPTS
  about.html    about page shell, shared by every variant
  compare.html  the review picker
  data/
    stars.txt   2,887 stars to magnitude 5.5, from the Yale Bright Star Catalogue
    icons.json  16x16 pixel icons, one per app
build.mjs       inlines everything into dist/
shots.mjs       renders every variant at 1440, 820 and 390 into shots/
dist/           built output, gitignored
```

Every page inlines only the CSS and JS it actually uses. The whole site is under
100KB, so inlining removes every render-blocking request and makes each page a
single cacheable file. `dist/preview.html` is the hub with the document wrapper
stripped, for embedding in hosts that supply their own skeleton. The Worker does
not serve it.

## Variants

The hub exists in several frontends over one content source. `src/core/apps.js`
holds the app copy, URLs and icons; `src/core/sky.js` holds the astronomy and the
renderer. A variant supplies only layout, behaviour, and optionally a set of sky
render options. None of them can drift on content, because none of them own any.

| | |
|---|---|
| `current` | What is live: dithered night sky, liquid-glass tiles, 4-column mixed-span grid |
| `a` | **Observatory** — hairline index and a readout, over an uncut sky |
| `b` | **Press** — no canvas, no glass: paper, rules, and a numbered editorial index |
| `c` | **Dissolve** — panels made of dither, edges breaking up into the sky |
| `d` | **Orbit** — looking down on the ecliptic; apps share the inner planets' orbits |
| `e` | **Constellation** — apps as stars at real altitudes, joined into one figure |

`current` builds to `dist/index.html` and is what deploys. The rest build to
`dist/<name>/index.html` and are claimed by no route in `wrangler.jsonc`, so they
exist for review only. To review them, `npm run build` and open `dist/compare.html`,
which frames every variant side by side at three viewport widths. `node shots.mjs`
renders them all to `shots/` instead.

The About page is shared and unchanged across every variant, so the hand-off from a
variant into About does not match it. That is expected while the hubs are under
review.

To change which variant deploys, set `CURRENT` in `build.mjs`.

### Sky render options

`sky.js` fixes the astronomy and opens up the rendering. A variant sets
`window.SKY_OPTS` before the engine runs to change framing (`viewAlt`, `viewAz`,
`halfFov`), the ordered-dither matrix size and its coarsening with distance
(`bayer`, `ditherDepth`), the three colour ramps, the Earth limb (`limb`, or `null`
for no Earth at all), how the planets draw (`planets: 'dot' | 'disc' | 'off'`),
the callout anchor, star brightness, satellite count, frame rate and buffer size.

Every default is the value the engine used when it had a single caller, so an empty
`SKY_OPTS` is a no-op and `current` renders exactly as it always did.

## Deploying

`wrangler.jsonc` is static-assets only. There is no Worker script: the hub is fully
client-side, so Cloudflare serves `dist/` directly.

It claims exactly two routes, `charliepolito.com/` and `charliepolito.com/about`, so
the existing workers on `/apex`, `/taxhaven`, `/trajectory` and the rest are
untouched. Widening this to `charliepolito.com/*` would place this worker in front
of all of them, so check route precedence before doing that.

To build on push, point Cloudflare Workers Builds at this repo with build command
`npm run build` and output directory `dist`.

## The sky

Real positions, computed in the browser for a fixed observing location stored as
`HOME` in `sky.js`. Stars come from the catalogue; planets and the Sun come from the
JPL approximate Keplerian element set, valid 1800 to 2050.

Accuracy is arcminutes and one pixel of this sky is roughly half a degree, so the
math is far more precise than the display can show. The catalogue was verified
against ten reference stars to within 0.13 arcminutes, and the planetary positions
were checked structurally: every body lands within 2.7 degrees of the ecliptic, and
Mercury and Venus stay inside their maximum elongations.

The view is an inverted fisheye. Sky above, Earth's limb curving away below, drawn
as an explicit convex body with a thin atmosphere and city lights. Satellites travel
real great circles, so their paths arc because the projection is correct rather than
because an arc was drawn.

The sky runs at 12fps. That matches the pixel-art medium and, more importantly, cuts
how often each glass tile has to re-blur its backdrop, which is the main performance
cost in the design.

See [docs/hub-spec.md](docs/hub-spec.md) for the full design spec and
[docs/design-transfer.md](docs/design-transfer.md) for the two pieces carried over
from the previous portfolio.
