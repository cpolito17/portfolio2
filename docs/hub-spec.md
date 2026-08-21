# Minimal Hub — Design Spec

The new `charliepolito.com`. A grid of large buttons over a dithered pixel-art night
sky, deployed as a Cloudflare Worker. Replaces the previous portfolio entirely; the
only things carried over are documented in [design-transfer.md](design-transfer.md).

A working prototype of everything below lives in [`/prototype/index.html`](../prototype/index.html).

---

## 1. Decisions locked

| Decision | Choice |
|---|---|
| Sky data | **Real** — actual star catalogue + planetary ephemerides |
| Framing | **Full-bleed barrel distortion**, not a circular sky disc |
| Sky clock | **Always night, current date** — real positions, locked to local midnight |
| Sky motion | **12fps chunky**, matching the pixel-art medium |
| Tile tiers | 4 large, 6 small, 1 About |
| Palette | Sky carries all colour; glass and type stay grayscale |

---

## 2. The grid

Four columns. Large tiles span two, small tiles span one.

```
┌─────────────────┬─────────────────┐
│  Cairn      LG  │  Localize   LG  │
├─────────────────┼─────────────────┤
│  Apex       LG  │  Trajectory LG  │
├────────┬────────┼────────┬────────┤
│ HGHero │LiteEdit│  TTLW  │TaxHaven│
├────────┼────────┼────────┼────────┤
│PAYLOAD │ Keeran │        │ About  │
└────────┴────────┴────────┴────────┘
```

The empty cell before About is deliberate — it isolates the About tile in the
bottom-right corner instead of letting it read as the seventh app.

Breakpoints: 4 columns → 2 columns at 860px → 1 column at 520px.

**Both tiers are the same material.** Same `.liquid-glass`, same `rounded-3xl`,
same 1.4px border. Only scale, padding, icon size, and type size differ — that is
what makes emphasis read as emphasis rather than as two unrelated components.

| | Large | Small |
|---|---|---|
| Padding | 1.5rem | 1.1rem |
| Icon well | 48px | 34px |
| Name | 1.06rem / 500 | 0.85rem / 500 |
| Description | 0.8rem, `white/42` | 0.72rem, clamped to 3 lines |
| Hover / active | `scale(1.02)` / `scale(0.98)` | `scale(1.05)` / `scale(0.95)` |

The gentler scale on large tiles is deliberate: 5% on a half-width card is
distracting. Both come from the transferred system.

**Tiles are `<a href>`, not `<button>`** — they route out to real apps.

---

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

**Keeran Cross** — An architecture portfolio built for a client, in full Frutiger Aero
— cursor-reactive bubbles, animated waves, a Windows 98 cursor.

### Routing — unresolved

| App | Target | Status |
|---|---|---|
| Apex | `charliepolito.com/apex` | live |
| Trajectory | `charliepolito.com/trajectory` | live (also `/compass`) |
| Tax Haven | `charliepolito.com/taxhaven` | live |
| LiteEdit | `liteedit.charliepolito.com` | live |
| Cairn | — | **needs a URL** |
| HomeGameHero | — | **needs a URL** (static, trivial to deploy) |
| PAYLOAD | — | **needs a URL** (static build) |
| Keeran Cross | — | **needs a URL** (client-hosted?) |
| Localize | — | **blocked** — FastAPI + Google Maps keys, needs a host |
| Take the Long Way | — | **blocked** — FastAPI + ORS key + 50k-row SQLite |

Localize and TTLW are Docker services with backends and API keys. They cannot be
static Cloudflare deploys, so a hub tile pointing at them needs somewhere for them to
actually live first. Until then those two tiles have no destination.

---

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
| Apex | serpentine ribbon of road |
| Trajectory | rising line with an arrowhead over a baseline |
| HomeGameHero | poker chip, edge notches |
| LiteEdit | framed photo — sun and mountain |
| Take the Long Way | road running to the horizon, dashed centre line |
| Tax Haven | capitol dome over columns |
| PAYLOAD | ore crystal |
| Keeran Cross | building elevation with windows |
| About | portrait bust |

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

### 5.2 Projection — the fisheye is free

Stereographic, `r ∝ tan(θ/2)`, at a 144° field. An all-sky view *is* a fisheye
projection, which means:

- The barrel distortion is not an effect applied on top — it is the projection.
- Satellites travel real great circles. **The arcs are not faked**; a straight path
  across the sky renders as a curve because the projection is correct.
- The horizon becomes a curve, which is the single most recognisable thing about the
  whole image.

View is fixed: azimuth 178° (south), altitude 46°, so the horizon curve sits low in
frame with open sky above for the callouts.

### 5.3 Dithering

Bayer 8×8 ordered dither over a six-step indigo ramp:

```
#05060d  #0a0d18  #101529  #18203c  #212c52  #2b3868
```

Brightness falls from the horizon toward the zenith on a 1.7 power curve — airglow,
roughly. Ground below the horizon gets a two-step near-black ramp.

Rendered to a low-resolution buffer (~450px wide) and upscaled with
`image-rendering: pixelated`. **The dithered gradient is computed once**, not per
frame — the view is fixed, so only stars, planets, and satellites redraw. This is
what keeps the whole thing nearly free.

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

Tile in the bottom-right, distinct border: a dashed accent rim over a faint warm tint,
rather than a different material. It stays part of the set while clearly not being an
app.

Motion, in the correct terms:

- Navigation is a **page transition**; if the tile expands to become the page, that's
  a **shared element transition**.
- The back button uses a **direction-aware transition** — reversing the entrance
  rather than replaying it forward.
- Body copy enters as a **stagger** of **slide-in + fade-in**, paragraphs ~80ms apart.
  That stagger is what makes it read as "flowing up" rather than appearing at once.
- Back button is top-left, `.liquid-glass` pill, `rounded-full`.

Keep the whole entrance under ~400ms. **Frequency of use**: this is a page the owner
will hit constantly, and a 1.2s cascade is delightful once and irritating by the fifth
visit.

---

## 7. Stack

Astro static output → Cloudflare Workers Static Assets, matching how Apex, Tax Haven,
and LiteEdit already deploy.

Everything is client-side, so the Worker only serves files — the sky is computed fresh
in each visitor's browser and the star catalogue is a static asset with an infinite
cache. No SSR, no API, no KV.

Type: Poppins 400/500/600, Source Serif 4 italic for accents only — carried over.

---

## 8. Open questions

1. **Deploy targets** for the six apps without URLs, and what to do about Localize and
   Take the Long Way, which need real backends.
2. **Same tab or new tab?** Same-origin apps argue for same-tab; a hub argues for new.
3. **A moon?** Not mentioned, but a night sky without one is a choice. Phase is easy —
   it's just elongation from the sun.
4. **Keeran Cross is client work**, not one of your own apps. Does it belong in the
   same grid, or does it want its own treatment?
