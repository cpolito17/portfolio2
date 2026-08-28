/* Assembles src/ into dist/.

   Everything is inlined into each page: the whole site is well under 100KB, so
   inlining removes every render-blocking request and keeps each page a single
   cacheable artifact.

   The hub exists in several variants. Each lives in src/variants/<name>/ with a
   variant.json naming the CSS and JS it wants, drawn from src/core/ (shared
   content, sky engine, navigation) and from its own directory (its layout). One
   variant is CURRENT: it builds to dist/index.html and is what deploys. The
   others build to dist/<name>/index.html for side-by-side review and are not
   claimed by any route in wrangler.jsonc.

   The About page is shared by every variant and is built once. */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';

const url  = p => new URL(p, import.meta.url);
const read = p => readFileSync(typeof p === 'string' ? url(p) : p, 'utf8');

const CURRENT = 'current';

/* Where the variant review lives on the deployed site. The live design keeps
   the root; everything under this prefix is the review harness.

   wrangler.jsonc claims only charliepolito.com/ and charliepolito.com/about, so
   this prefix is not routed on the public domain at all. It is reachable on the
   Worker's workers.dev subdomain and nowhere else, which is what makes it safe
   to ship the review alongside the live site instead of on a second Worker. */
const REVIEW = 'preview';

/* Shared substitutions. Both are large data blobs and are inlined once per page
   that asks for the module holding them. */
const SUBST = {
  '__ICONS__': read('./src/data/icons.json').trim(),
  '__STARS__': read('./src/data/stars.txt').trim(),
};
const fill = s => Object.entries(SUBST).reduce((a, [k, v]) => a.replace(k, () => v), s);

/* Each source file keeps its own <script> tag, which preserves today's semantics
   exactly: top-level declarations share one global lexical scope across tags, and
   the files were written against that. */
const bundleJS  = list => list.map(f => `<script>${fill(read('./src/' + f))}</script>`).join('\n');
const bundleCSS = list => list.map(f => read('./src/' + f)).join('\n');

function render(shell, css, js){
  const out = read(shell)
    .replace('__STYLES__',  () => bundleCSS(css))
    .replace('__SCRIPTS__', () => bundleJS(js));
  const left = out.match(/__[A-Z]+__/g);
  if (left) throw new Error(`${shell}: unfilled placeholders ${[...new Set(left)].join(', ')}`);
  return out;
}

function emit(path, html){
  const f = url('./dist/' + path);
  mkdirSync(new URL('.', f), { recursive: true });
  writeFileSync(f, html);
  console.log(`${path.padEnd(22)} ${(html.length / 1024).toFixed(0)} KB`);
}

rmSync(url('./dist'), { recursive: true, force: true });
mkdirSync(url('./dist'), { recursive: true });

/* ── Variants ─────────────────────────────────────────────── */
/* CURRENT leads: the review reads as "here is what is live, here are the
   alternatives", not as an alphabetical list with the baseline buried in it. */
const names = readdirSync(url('./src/variants'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name).sort()
  .sort((a, b) => (a === CURRENT ? -1 : b === CURRENT ? 1 : 0));

/* Pages under the review prefix carry a way back to the picker. Injected here
   rather than written into any variant, so no variant has to know the review
   harness exists and the live page at / never shows it. */
const BACKBAR = `
<a href="/${REVIEW}/" style="position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:99;
  display:flex;gap:.5rem;align-items:center;padding:.4rem .85rem;border-radius:999px;
  background:rgba(10,12,20,.82);color:#fff;border:1px solid rgba(255,255,255,.22);
  font:500 12px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;
  text-decoration:none;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)">
  &larr; All variants</a>`;

const built = [];
for (const name of names){
  const v = JSON.parse(read(`./src/variants/${name}/variant.json`));
  const html = render(`./src/variants/${name}/index.html`, v.css, v.js);

  /* CURRENT is emitted twice: once at the root, which is the live site, and
     once under the review prefix so the picker can frame it beside the
     alternatives. Same bytes, apart from the back link. */
  if (name === CURRENT){
    emit('index.html', html);
    emit(`${REVIEW}/embed.html`, html                      // wrapper-stripped, for embedding
      .replace(/^[\s\S]*?<title>/, '<title>')
      .replace(/<\/head>\s*<body>/, '')
      .replace(/<\/body>\s*<\/html>\s*$/, ''));
  }
  emit(`${REVIEW}/${name}/index.html`, html.replace('</body>', () => BACKBAR + '\n</body>'));
  built.push({ name, ...v, href: `${name}/index.html` });
}

/* ── About, shared by every variant ───────────────────────── */
emit('about.html', render('./src/about.html',
  ['core/base.css', 'core/about.css'],
  ['core/sky.js', 'core/about.js', 'core/nav.js']));

/* ── The picker, at the root of the review prefix ─────────── */
const manifest = built.map(({ name, label, blurb, href }) => ({ name, label, blurb, href }));
emit(`${REVIEW}/index.html`, read('./src/compare.html')
  .replace('__VARIANTS__', () => JSON.stringify(manifest)));

/* What was built, for shots.mjs and audit.mjs. They used to recover this by
   regexing it back out of the picker's inline script, which broke the moment
   the picker moved. */
writeFileSync(url(`./dist/${REVIEW}/variants.json`),
  JSON.stringify({ review: REVIEW, variants: manifest }, null, 2));
