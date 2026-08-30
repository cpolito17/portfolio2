# Static assets, copied verbatim to the site root

Anything in this directory is copied into `dist/` as-is by `build.mjs` and is
served from the root of the domain, so `logo.png` here becomes
`https://charliepolito.com/logo.png`.

## logo.png — required for the brand mark and the favicon

One square PNG, 512x512 or larger, of the monogram. `build.mjs` picks it up and
wires it into four places at once:

- the mark to the left of the wordmark on the hub
- `rel="icon"`, which is what Google shows beside the search result
- `apple-touch-icon`, for an iOS home-screen bookmark
- `og:image`, the thumbnail on a shared link

**If it is absent the build still succeeds**, prints a warning, and emits none
of those four. That is deliberate: a missing file should cost a warning, not a
broken image on the live site and a 404 on every favicon request.

`favicon.ico` is optional and only worth adding for old browsers, which request
`/favicon.ico` by path whether or not the page links to one. A 32x32 `.ico` is
enough.
