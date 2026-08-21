# charliepolito.com

The hub at the root of `charliepolito.com`. A grid of app buttons over a dithered
pixel-art night sky computed from the real star catalogue and planetary ephemerides.

## Run it

```bash
npm run build     # assembles src/ into dist/
npm run dev       # build, then wrangler dev
npm run deploy    # build, then wrangler deploy
```

There are no dependencies. `build.mjs` is plain Node and `wrangler` is invoked
through `npx`, so a clean checkout builds with nothing installed.

## Layout

```
src/
  index.html    hub page shell
  about.html    about page shell
  styles.css    shared, including the liquid glass surfaces
  sky.js        astronomy, projection, and the dithered renderer
  hub.js        tile data and grid placement
  about.js      staggered entrance for the resume
  nav.js        page transitions
  data/
    stars.txt   2,887 stars to magnitude 5.5, from the Yale Bright Star Catalogue
    icons.json  16x16 pixel icons, one per app
build.mjs       inlines everything into dist/
dist/           built output, gitignored
```

Every page inlines its own CSS and JS. The whole site is under 100KB, so inlining
removes every render-blocking request and makes each page a single cacheable file.
`dist/preview.html` is the hub with the document wrapper stripped, for embedding in
hosts that supply their own skeleton. The Worker does not serve it.

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
