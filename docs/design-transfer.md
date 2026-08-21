# Design Transfer — Liquid Glass Buttons & Logo Animation

Carried forward from [`cpolito17/Portfolio`](https://github.com/cpolito17/Portfolio) (commit `44035fb`).

These are the **only** two things being kept from the old portfolio. Everything else —
layout, video hero, tabbed feature panel, project modals, carousels, the Astro section
components — is intentionally left behind.

Source files this was extracted from:

| What | Old path |
|---|---|
| Glass system | `src/styles/liquid.css` |
| Glass usage / button anatomy | `src/components/liquid/LiquidApp.tsx`, `FeatureSection.tsx`, `GlassBits.tsx` |
| Logo animation | `public/logo-mark.svg` (self-contained) |
| Static logo | `public/favicon.svg` |

Both assets are copied verbatim into `docs/assets/` in this repo so nothing depends on the
old repo staying alive.

---

## Part 1 — Liquid Glass

### 1.1 What it actually is

A translucent surface that blurs and saturates whatever sits behind it, ringed by a
gradient border that is **bright at the top and bottom edges and invisible through the
middle**. That asymmetric rim is the whole trick — it reads as light refracting through
the thick edge of a piece of glass. A slow diagonal sheen drifts across the surface so the
material feels wet rather than frosted.

There are three variants. They are not a scale of "more glass" — they have distinct jobs:

| Class | Blur | Fill | Job |
|---|---|---|---|
| `.liquid-glass` | 16px | white 4% | Interactive elements: buttons, pills, cards, small containers |
| `.liquid-glass-strong` | 50px | white 2% | Large structural panels, modals, dropdowns, primary CTA |
| `.liquid-glass-deep` | 17.6px | smoke 25% | Modifier on `.liquid-glass` when content sits on a busy backdrop |

### 1.2 The CSS (copy verbatim)

```css
/* Gradient borders are drawn with a transparent border + a border-box
   background layer instead of a masked ::before: a mask-composite pseudo
   anywhere inside the element silently disables backdrop-filter on
   desktop Chromium (mobile renderers take a different path and worked). */
.liquid-glass {
  border: 1.4px solid transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.04)) padding-box,
    linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.45) 0%,
        rgba(255, 255, 255, 0.15) 20%,
        transparent 40%,
        transparent 60%,
        rgba(255, 255, 255, 0.15) 80%,
        rgba(255, 255, 255, 0.45) 100%
      )
      border-box;
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  backdrop-filter: blur(16px) saturate(150%);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.liquid-glass-strong {
  border: 1.4px solid transparent;
  background:
    linear-gradient(rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.02)) padding-box,
    linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.5) 0%,
        rgba(255, 255, 255, 0.2) 20%,
        transparent 40%,
        transparent 60%,
        rgba(255, 255, 255, 0.2) 80%,
        rgba(255, 255, 255, 0.5) 100%
      )
      border-box;
  -webkit-backdrop-filter: blur(50px) saturate(160%);
  backdrop-filter: blur(50px) saturate(160%);
  box-shadow:
    4px 4px 4px rgba(0, 0, 0, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
  position: relative;
  overflow: hidden;
}

/* Modifier: +10% blur plus a light smoked tint. The tint also keeps text
   readable in browsers without backdrop-filter support. */
.liquid-glass-deep {
  background:
    linear-gradient(rgba(15, 15, 15, 0.25), rgba(15, 15, 15, 0.25)) padding-box,
    linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.45) 0%,
        rgba(255, 255, 255, 0.15) 20%,
        transparent 40%,
        transparent 60%,
        rgba(255, 255, 255, 0.15) 80%,
        rgba(255, 255, 255, 0.45) 100%
      )
      border-box;
  -webkit-backdrop-filter: blur(17.6px) saturate(150%);
  backdrop-filter: blur(17.6px) saturate(150%);
}

/* Liquid movement: a faint diagonal sheen drifts slowly across every glass
   surface. Killed by the prefers-reduced-motion rule below. */
.liquid-glass::after,
.liquid-glass-strong::after {
  content: '';
  position: absolute;
  inset: -60%;
  background: linear-gradient(
    115deg,
    transparent 42%,
    rgba(255, 255, 255, 0.07) 50%,
    transparent 58%
  );
  animation: glass-sheen 10s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
  pointer-events: none;
}

@keyframes glass-sheen {
  from { transform: translateX(-18%); }
  to   { transform: translateX(18%); }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 1.3 Why the border is built that way — do not "clean this up"

The obvious way to do a gradient border is a `::before` pseudo-element with
`mask-composite: exclude`. **That silently kills `backdrop-filter` on desktop Chromium** —
the glass renders as a flat translucent rectangle with no blur, while mobile browsers take
a different compositing path and look correct. This was a real bug in the old site and it
is very hard to spot because it only reproduces on one class of renderer.

The two-layer background (`padding-box` fill + `border-box` gradient behind a transparent
border) produces the identical visual with no mask involved. Keep it.

Two other constraints that come with the technique:

- `overflow: hidden` is required. The sheen `::after` is inset `-60%`, so it is much larger
  than the element and will escape without the clip.
- `position: relative` is required for the sheen to anchor.

### 1.4 Interaction model

The old design changed **nothing** about the glass on hover — no border brightening, no
fill change, no color. All feedback is scale, on a transform transition:

```
Small / square-ish targets:   hover:scale-105   active:scale-95
Wide / large targets:         hover:scale-[1.02] active:scale-[0.98]
Always:                       transition-transform  cursor-pointer
```

The wide-element values are deliberately gentler — a 5% scale on a full-width card is
distractingly large. **For the new hub grid, use the wide values on the large tiles and the
small values on the small tiles.**

This is worth keeping as-is. Scale-only hover is what makes the surfaces feel like physical
objects being pressed rather than web buttons lighting up.

### 1.5 Radii and geometry

| Token | Value | Used for |
|---|---|---|
| `rounded-full` | pill | Nav buttons, tag chips, icon buttons, CTA |
| `rounded-2xl` | 1rem | Thumbnails, inset media, dropdown menus |
| `rounded-3xl` | 1.5rem | Cards and buttons — **this is the hub tile radius** |
| `rounded-[2.5rem]` | 2.5rem | Full-bleed panels and modals |

Border is always `1.4px`. Not 1, not 2 — at 1px the top/bottom rim highlight disappears on
non-retina displays, at 2px it reads as an outline instead of an edge.

### 1.6 Button anatomy (the piece that maps directly onto the new hub)

The old `SmallCard` is already 90% of what the hub tile needs — icon circle, title,
2-line description, whole thing is one `<button>`:

```tsx
<button
  type="button"
  onClick={() => onOpen(project)}
  className="liquid-glass rounded-3xl flex-1 flex items-center gap-3 p-4 text-left
             hover:scale-105 active:scale-95 transition-transform cursor-pointer"
>
  <IconCircle>{icon}</IconCircle>
  <span className="min-w-0">
    <span className="block text-sm text-white truncate">{project.title}</span>
    <span className="text-xs text-white/50 line-clamp-2">{project.blurb}</span>
  </span>
</button>
```

The icon container, from `GlassBits.tsx`:

```tsx
export function IconCircle({ children }: { children: ReactNode }) {
  return (
    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
      {children}
    </span>
  );
}
```

Notes that carry over:

- The icon well is `bg-white/10`, **not** a glass surface. Nested glass-in-glass compounds
  backdrop blur and looks muddy at small sizes.
- Icons are lucide-react at `size={15}`–`16` inside the 32px circle.
- Title is solid white; description is `white/50`. That ~2:1 contrast split is what carries
  the hierarchy, since there is no color to work with.
- `min-w-0` on the text wrapper and `truncate` / `line-clamp-2` are load-bearing — without
  them a long app name blows out the flex row.
- The whole tile is a single `<button>` (or `<a>` for the hub, since these route out). Do
  not put a nested link inside it.

### 1.7 The dependency nobody writes down: glass needs a backdrop

`backdrop-filter` blurs what is behind the element. Over a flat background it does
literally nothing visible, and every one of these surfaces collapses into a slightly-lighter
gray rectangle. The old site solved this with a fullscreen looping video
(`https://media.charliepolito.com/backgrounds/above-endless-clouds-v1.mp4`, muted, `playbackRate = 0.5`).

**The new hub must supply some backdrop or the glass is pointless.** Options, cheapest first:

1. A static CSS gradient mesh + film grain — free, no network, no decode cost.
2. A single blurred hero image behind the grid.
3. Slow CSS-animated gradient blobs.
4. Keep the video (it already exists at that URL, but it's a real bandwidth and battery cost
   for what is meant to be a minimal hub — recommend against).

Given "minimal, no clutter," option 1 is the right call: it gives the glass something to
refract without adding anything the user has to look at.

### 1.8 Performance ceiling

`blur(50px)` surfaces are expensive to composite. The old page had roughly a dozen glass
elements and a video and was fine on desktop, warm on mobile. A hub grid could easily hit
20+ tiles.

Guidance for the rebuild:

- Tiles use `.liquid-glass` (16px blur). Reserve `.liquid-glass-strong` (50px) for at most
  one or two large surfaces.
- The sheen `::after` animates `transform` only, so it stays on the compositor — that part
  is cheap. It's the blur that costs.
- If the tile count goes past ~20, test on a real phone before shipping.

### 1.9 Type and color system that the glass assumes

- **Strict grayscale.** Every color in the old system is `hsl(0 0% X%)`. No accent colors
  anywhere. The glass rim is the only "highlight" in the design.
  - Background `hsl(0 0% 4%)`, foreground `hsl(0 0% 100%)`, muted `hsl(0 0% 60%)`.
- **Poppins** (`--font-display`) for everything, weights 400/500/600. Headings at 500.
- **Source Serif 4** italic (`--font-serif`) *only* inside `<em>` / `<i>` within `h1`–`h3`.
  It is an accent, never body copy.
- Tracking is tight on large headings (`tracking-[-0.05em]` at 6xl–7xl).
- `-webkit-font-smoothing: antialiased` on body.

The glass is tuned for a near-black background and white text. Light mode would require
re-deriving every rgba value; there is no light variant and building one is out of scope.

---

## Part 2 — Logo Animation

### 2.1 What it does

The "CP" monogram draws itself on, like handwriting — the vertical stem writes first
top-to-bottom, and the lower swoop follows and overlaps its tail. Total run ~2.05s. It
plays once on page load.

### 2.2 How it works — masked draw-on

This is the part worth understanding, because it is not the usual `stroke-dasharray` trick.

A plain dash-offset animation can only draw a **stroked** path — you get a uniform-width
outline, not real letterforms. This logo has proper filled artwork with varying weight.
So instead:

1. The visible artwork is two **filled** `<path>` elements — the real, detailed monogram.
2. Those live inside `<g mask="url(#path-reveal)">`.
3. The mask contains a black rect (hides everything) plus two **stroked** skeleton paths in
   white, roughly tracing the centerline of each glyph.
4. Animating `stroke-dashoffset: 1 → 0` on those mask strokes wipes the mask open along the
   letterform.

Result: the detailed filled artwork appears to be written by a pen, while the pen itself is
never visible. The skeleton paths are crude — they only have to be wide enough to cover the
artwork underneath.

`pathLength="1"` normalizes each path's length to 1, so `stroke-dasharray: 1` /
`stroke-dashoffset: 1` works without measuring the real geometry in JS.

### 2.3 The animation block

The entire animation lives in a `<style>` inside the SVG's `<defs>`, which is why
`<img src="/logo-mark.svg">` animates with no JS, no inlining, and no external CSS:

```css
.reveal-stem,
.reveal-swoop {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw-logo 1.45s cubic-bezier(.65, 0, .35, 1) forwards;
}

.reveal-swoop {
  animation-duration: 1s;
  animation-delay: 1.05s;
}

@keyframes draw-logo {
  to { stroke-dashoffset: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .reveal-stem,
  .reveal-swoop {
    animation: none;
    stroke-dashoffset: 0;
  }
}
```

### 2.4 Timing

| Stroke | Duration | Delay | Ends at |
|---|---|---|---|
| `.reveal-stem` | 1.45s | 0 | 1.45s |
| `.reveal-swoop` | 1.00s | 1.05s | 2.05s |

The swoop starts at 1.05s — while the stem is still finishing. That 0.4s overlap is what
makes it read as one continuous hand movement instead of two separate animations. Preserve
it if you retime anything.

The easing is `cubic-bezier(.65, 0, .35, 1)` — a symmetric ease-in-out. It accelerates out
of the start and decelerates into the end, like a pen stroke.

`forwards` fill mode is required or the logo vanishes when the animation completes.

### 2.5 Values you must not casually change

- **Stroke widths (`28` on the stem, `24` on the swoop).** These are tuned so the mask
  strokes fully cover the filled artwork beneath them. Reduce either and slivers of the
  glyph stay permanently hidden. They are specific to this monogram.
- **`stroke-linecap="round"` / `stroke-linejoin="round"`.** Butt caps make the reveal edge
  look like a wipe rather than a nib.
- **`maskUnits="userSpaceOnUse"` with explicit `x/y/width/height`.** Without it the mask
  bounds are computed from object bounding box and the black backing rect misaligns.
- **The viewBox is `0 0 255 271`** — a 0.94 aspect ratio, taller than wide. Size it with
  `height` and `width: auto`; the old site used `h-8` in the nav and `h-40` in the hero.

### 2.6 Limitation to plan around

Delivered as `<img>`, the CSS animation fires once when the browser decodes the file and
**cannot be replayed, scroll-triggered, or restarted**. Reloading the page restarts it;
navigating within a SPA does not.

If the new hub wants to re-trigger it (on route change, on a click, on entering the
viewport), the fix is to inline the SVG markup directly into the DOM rather than referencing
it as an image, then restart the animation by removing and re-adding the class, or by
setting `animation: none`, forcing a reflow, and clearing it. That is a small change but it
must be decided up front, because the two delivery methods have different markup.

For a hub where the logo is a small persistent mark at the top, `<img>` is fine.

### 2.7 Static variant

`docs/assets/favicon.svg` is the same monogram with no animation, on a `#171717` rounded
rect (`rx="44"`, 271×271, artwork translated `(8 0)` to center it). Use this anywhere the
mark needs to be static — favicon, OG image, anywhere below ~32px where the draw-on is
illegible anyway.

---

## Part 3 — Applying this to the new hub

Direct notes for the grid-of-buttons build, so the decisions above don't get re-litigated:

**Two tile sizes.** The old system already implies the split:

- **Large tile** — `.liquid-glass rounded-3xl`, `hover:scale-[1.02] active:scale-[0.98]`,
  larger icon well (48px, `bg-white/10`), title at `text-base`/`text-lg`, description at
  `text-sm text-white/50`, more padding (`p-6`).
- **Small tile** — `.liquid-glass rounded-3xl`, `hover:scale-105 active:scale-95`, 32px icon
  well, title `text-sm`, description `text-xs text-white/50`, `p-4`.

Same material, same radius, same border — only scale, padding, and type size differ. That is
what makes the emphasis read as emphasis instead of as two unrelated components.

**Tiles are `<a href>`, not `<button>`.** They route to external apps. Keep
`hover:scale-*` and `cursor-pointer`, add `target`/`rel` if the apps open in new tabs.

**Do not add hover color.** The temptation with a hub is to tint tiles per app. The glass
system is grayscale-only by design and colored tiles will fight the rim highlight.
Differentiate with the icon, not the surface.

**Supply a backdrop** (§1.7) or the glass has nothing to refract.

**Keep the sheen.** It is the one piece of ambient motion in an otherwise static page, and
it costs nothing since it only animates `transform`.

**Carry the reduced-motion block.** It's already written to kill the sheen, the tile scale
transitions, and the logo draw in one rule.

---

## Assets in this repo

- `docs/assets/logo-mark.svg` — animated monogram, self-contained
- `docs/assets/favicon.svg` — static monogram on dark rounded square
