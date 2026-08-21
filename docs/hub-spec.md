# Hub Design Spec

The new `charliepolito.com`. A grid of large buttons over a dithered pixel-art night
sky, deployed as a Cloudflare Worker. Replaces the previous portfolio entirely; the
only things carried over are documented in [design-transfer.md](design-transfer.md).

The implementation lives in [`src/`](../src) and builds to `dist/`. See
[README](../README.md) for build and deploy.

---

## 1. Decisions locked

| Decision | Choice |
|---|---|
| Sky data | **Real** — actual star catalogue + planetary ephemerides |
| Framing | **Inverted fisheye** — sky above, Earth's limb curving away below |
| Sky clock | **Always night, current date** — real positions, locked to local midnight |
| Sky motion | **12fps chunky**, matching the pixel-art medium |
| Tile tiers | 4 large, 6 small, 1 About me — large tiles dispersed, order shuffled per load |
| Palette | Sky carries all colour; glass and type stay grayscale |

---

## 2. The grid

Four columns. Large tiles span two. **Large tiles are dispersed across every row
rather than stacked at the top**, and which app lands in which slot is shuffled on
each load:

```
┌─────────────────┬────────┬────────┐
│    LARGE        │ small  │ small  │
├────────┬────────┴───────┬┴────────┤
│ small  │    LARGE       │ small   │
├────────┼────────┬───────┴─────────┤
│ small  │ small  │     LARGE       │
├────────┴────────┼────────┬────────┤
│    LARGE        │        │About me│
└─────────────────┴────────┴────────┘
```

Slots are placed explicitly (`grid-column` / `grid-row`) rather than left to
auto-placement, which cannot produce this pattern with mixed spans. The shuffle
permutes apps *within* their tier, so the structure holds while the order changes.

The empty cell before About me is deliberate — it stops About reading as the
seventh app.

Breakpoints: explicit placement is dropped below 860px (2 columns), then 1 column
at 520px.

**Both tiers are the same material.** Same `.liquid-glass`, same `rounded-3xl`,
same 1.4px border. Only scale, padding, icon size, and type size differ.

| | Large | Small |
|---|---|---|
| Padding | 1.5rem | 1.1rem |
| Icon well | 48px | 34px |
| Name | 1.06rem / 500 | 0.85rem / 500 |
| Description | 0.8rem, `white/42` | 0.72rem, clamped to 3 lines |
| Hover / active | `scale(1.02)` / `scale(0.98)` | `scale(1.05)` / `scale(0.95)` |

**Small tiles never truncate.** There is no line clamp; copy is written to fit the
box. A clamped description that hides text while the tile still has room is a bug,
not a layout.

**About me** carries a dashed accent rim over a faint warm tint — same material,
distinct border. Its title is set larger (1.25rem/600) and it carries no
description; the name is the whole message.

**Tiles are `<a href>`, not `<button>`** — they route out to real apps.

## 3. Tile copy

Written from each repo's README. Descriptions lead with what the app *does for you*,
not how it is built.

### Large

**Cairn** — A task manager with a real week attached. Drag work onto a planner grid,
see what blocks what as a dependency graph, and keep personal and work life apart.

**Localize** — Search a big-box brand and get the independent shops near you instead.
Every result carries a transparent 0–100 score for how genuinely local it is.

**Apex** — Scans the road network around any address and ranks the roads worth
driving. Mapped with per-corner curvature colouring, re-tunable without a re-scan.

**Trajectory** — Projects your net worth from today to age 100, with sixteen kinds of
life event you can drop on the timeline. No accounts, and nothing leaves your browser.

### Small

**HomeGameHero** — Chip, blind, and payout math for home poker. Works offline and
settles the night in the fewest possible payments.

**LiteEdit** — A photo editor that runs entirely in your browser. Layers,
non-destructive transforms, full undo — no upload, no account.

**Take the Long Way** — Plots a road trip through the roadside oddities and ghost
towns along your route, then hands the whole thing to Google Maps.

**Tax Haven** — You're handed the US tax code and the federal budget. Redesign both,
hit simulate, and find out what you did to the country.

**PAYLOAD** — A 2D space-mining roguelite. Drill, haul, and survive the launch back to
orbit — every sprite drawn in code.

**Architecture Portfolio** — An architecture portfolio I built for my girlfriend, in
full Frutiger Aero — cursor-reactive bubbles, animated waves, a Windows 98 cursor.

### Routing

| App | Target |
|---|---|
| Cairn | `tasks.charliepolito.com` |
| Localize | `charliepolito.com/localize` |
| Apex | `charliepolito.com/apex` |
| Trajectory | `charliepolito.com/trajectory` |
| HomeGameHero | `charliepolito.com/homegame` |
| LiteEdit | `liteedit.charliepolito.com` |
| Take the Long Way | `charliepolito.com/takethelongway` |
| Tax Haven | `charliepolito.com/taxhaven` |
| PAYLOAD | `charliepolito.com/payload` |
| Architecture Portfolio | `keerancross.com` |

**Cairn demo route — needs work on the Cairn side.** The hub can point at any URL,
so linking a demo is trivial here. But Cairn is auth-gated: it has server-side
sessions and a log-out action, so `tasks.charliepolito.com` will bounce a visitor
to a login screen. A demo needs a route in *Cairn* that skips auth and serves a
seeded, read-only board — something like `/demo` with fixture data and writes
disabled. Until that exists the tile points at the root. Everything else about the
hub is unaffected.

Note that Localize and Take the Long Way are Docker services with backends and API
keys (Google Places, OpenRouteService), so those two paths need something running
behind them rather than static assets.

## 4. Pixel icons

16×16, one object each, drawn on a shared four-value ramp. That shared ramp is the
whole cohesion mechanism — each app looks nothing like the others, but their icons
are unmistakably one set.

| Token | Value | Role |
|---|---|---|
| `1` | `#E8EDF7` | highlight / outline |
| `2` | `#9AA6C4` | mid |
| `3` | `#4A5578` | shadow |
| `4` | `#E8C170` | accent — used sparingly, one or two per icon |

| App | Subject |
|---|---|
| Cairn | three balanced stacked stones |
| Localize | storefront with a striped awning |
| Apex | serpentine road, rasterised from a sine so the curve cannot break |
| Trajectory | rising line with the arrowhead centred on the line axis |
| HomeGameHero | poker chip — eight rim spots are what stop it reading as a donut |
| LiteEdit | framed photo — sun and mountain |
| Take the Long Way | road running to the horizon, dashed centre line |
| Tax Haven | capitol dome over columns |
| PAYLOAD | drill bit — collar, fluted shank, tapered point |
| Architecture Portfolio | building elevation with windows |
| About me | portrait bust |

Stored as 16-row strings and expanded to SVG `<rect>`s at render time with
`shape-rendering="crispEdges"`. No image files, no sprite sheet, scales cleanly.

The icon well is `rgba(255,255,255,.1)` — flat, **not** a nested glass surface.
Glass inside glass compounds the blur and goes muddy at small sizes.

---

## 5. The night sky

The focal point. Real astronomy, rendered as heavily dithered pixel art.

### 5.1 Why the real sky is the cheap option

Precision astronomy is hard. Precision is not what this needs — one pixel of this sky
covers roughly half a degree, and every method below is far more accurate than that:

| Component | Method | Accuracy | Needed |
|---|---|---|---|
| Stars | Yale Bright Star Catalogue, RA/Dec → Alt/Az | exact | ~0.5° |
| Planets | JPL approximate Keplerian elements (1800–2050) | 10″–3′ | ~0.5° |
| Sun | Derived from Earth's heliocentric position | ~0.01° | ~0.5° |

The whole engine is about 200 lines with no dependencies.

**Catalogue.** 2,887 stars to magnitude 5.5, encoded as `ra×100, dec×100, mag×10,
spectralClass` integers — 45KB raw, well under 20KB gzipped. Verified against ten
reference stars (Sirius, Vega, Rigel, Polaris…) to within 0.13 arcminutes.

Precession from J2000 is ~50″/year, so ~0.35° by 2026 — under one pixel. Skipped.

**Planets.** Kepler's equation solved by Newton iteration, converging in 3–5 passes.
Verified structurally: every planet lands within ±2.7° of the ecliptic, Mercury's
elongation stays under 28°, Venus's under 47°, and the Earth–Sun distance tracks the
season correctly.

**Star tint** comes from spectral class (O B A F G K M) — blue-white through orange.
Subtle, but it is what keeps the field from looking like scattered white dots.

### 5.2 Projection — an inverted fisheye

Stereographic, `r ∝ tan(θ/2)`, at a 140° field, view fixed on azimuth 178° at
altitude 38° — so the top of the frame lands near the zenith and the bottom just
under the horizon.

The fisheye is **inverted** relative to a ground observer. Standing on the ground,
the horizon wraps *up* around you at the frame edges — a bowl. The reference is the
view from orbit, where the limb is convex: highest in the middle, falling away at
both edges.

That shape cannot be derived from a ground observer's horizon, so the planet is
drawn explicitly: a circle of radius 2.35× the canvas width, its top edge crossing
at 74% of frame height. Everything inside is Earth, a thin band outside is
atmosphere, and the rest is sky.

**This stays physically coherent.** The stars and planets are still the real sky
over `HOME`; the Earth below is the body you are above. From just outside the
atmosphere the star positions are identical to ground level — parallax is far under
a pixel — so both halves of the image describe the same place at the same moment.

Satellites still travel real great circles, and their paths still arc because the
projection is correct rather than because an arc was drawn.

Anything the planet covers is occluded — stars, planets, and satellite trails alike.

### 5.3 Dithering

Bayer 8×8 ordered dither over three ramps:

```
sky         #05060d  #0a0d18  #101529  #18203c  #212c52  #2b3868
atmosphere  #cfe2ff  #8fb8ee  #5a86c8  #38578f  #253a63
earth       #0c162c  #080f20  #050a16  #03060e
```

The atmospheric band is deliberately thin (3.4% of canvas width) with a fast
falloff — a wide one washes out the whole lower frame and kills text contrast on
any tile sitting over it.

City lights scatter on a coarse noise field standing in for continents, thinning
toward the limb. They are deterministic per pixel so they never shimmer between
frames. Density is tuned low on purpose: enough to read as inhabited, sparse enough
not to compete with the tiles or the footer.

The whole backdrop is computed **once**, not per frame — the view is fixed, so only
stars, planets and satellites redraw.

### 5.4 Labels

Sun and planets get a name and a leader line. Two rules:

**Labels live in an SVG overlay, never in the pixel buffer.** Pixel-art text at 9px is
unreadable, and the leader lines want crisp sub-pixel strokes.

**Callouts route to the margin.** A planet sits wherever it sits — often directly
behind the tile grid. Rather than drawing a label over a tile or hiding it, the leader
line runs from the body out to the nearest clear margin and the label sits there,
chart-style. Each side stacks independently with a 16px minimum so callouts never
collide, which matters because planets cluster along the ecliptic and conjunctions
would otherwise overlap. Below ~96px of margin (mobile) labels are suppressed entirely.

The leader lines draw themselves in with `stroke-dashoffset` on a `pathLength="1"`
path — **the same mechanism as the logo animation.** One technique, two places.

### 5.5 Location

`HOME = { lat: 42.2808, lon: -83.7430 }`. Never named in the interface. The constant
is called `HOME`, not the city — a reader of the bundle will find the coordinates,
which is fine for an easter egg, but the name should not be handed over.

### 5.6 The real performance risk

Not the astronomy. It is `backdrop-filter` over an animating canvas: every glass tile
re-blurs its backdrop on **every frame the sky changes**. Eleven tiles over a
full-screen animating star field is eleven blur passes per frame.

**Running the sky at 12fps is the fix, and it improves the aesthetic** — pixel art
animated at 60fps reads as too smooth for the medium. It cuts blur recomputation by
5× and costs nothing visually. This is the single biggest lever in the design.

Supporting measures: the dithered backdrop is precomputed; satellites animate a
handful of pixels; `prefers-reduced-motion` drops the sheen, the tile transitions, the
leader-line draw, and the twinkle in one rule.

---

## 6. About page

Route `/about`. Tile in the bottom-right of the grid, distinct border: a dashed
accent rim over a faint warm tint, rather than a different material. It stays part
of the set while clearly not being an app. Title set larger, no description.

The resume sits on its own glass panel rather than directly on the canvas. Long-form
reading scrolls past the bright atmospheric limb, and text on the raw sky drops below
WCAG AA there. Measured worst case on the panel is 6.35:1.

Motion, in the correct terms:

- Navigation is a **page transition**, with a **direction-aware** variant so the back
  button reverses the entrance rather than replaying it forward.
- Body copy enters as a **stagger** of **slide-in** and **fade-in**, 70ms apart,
  capped at 560ms total.
- Back button is top-left, `.liquid-glass` pill, `rounded-full`.

**Frequency of use** governs the timing: this is a page the owner hits constantly, and
a long cascade is delightful once and irritating by the fifth visit.

## 7. Copy rules

Every visible string is checked against the anti-slop rules, mechanically, on the
rendered page rather than the source:

- **Zero em-dashes and en-dashes.** Restructure into two sentences, a comma, or
  parentheses. This is the single most common tell and it is binary.
- No filler verbs (elevate, seamless, unleash, leverage, empower).
- No performative-craftsman labels, version stamps, scroll cues, or
  section-number eyebrows.
- Middle-dot rationed to at most one per line.
- Descriptions say what the app does for you, not how it is built.

`audit.mjs` walks the rendered DOM of both pages and fails on any of the above.

## 8. Stack

No framework and no dependencies. `build.mjs` inlines `src/` into two static pages;
Cloudflare Workers Static Assets serves `dist/`. Everything is client-side, so the
Worker only serves files and the star catalogue is a static asset with an infinite
cache.

The Worker claims only `charliepolito.com/` and `charliepolito.com/about`, leaving the
existing per-app workers alone.

Type: Poppins 400/500/600, Source Serif 4 italic for accents only, both carried over.

## 9. Open questions

1. **Hosting** for Localize and Take the Long Way, which need real backends behind
   their paths rather than static assets.
2. **Same tab or new tab?** Same-origin apps argue for same-tab; a hub argues for new.
3. **A moon?** Not mentioned, but a night sky without one is a choice. Phase is easy —
   it's just elongation from the sun.
4. **Cairn's demo route** has to be built in Cairn before that tile is useful to a
   visitor who isn't logged in.
