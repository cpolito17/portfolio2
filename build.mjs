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

/* PREVIEW=1 builds for the throwaway variant-review Worker instead of
   production. Every variant, CURRENT included, moves under its own path and the
   picker takes the root, so the deployed site opens on the comparison rather
   than on one of the things being compared. Production output is untouched. */
const PREVIEW = !!process.env.PREVIEW;

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

/* In a preview build each variant page carries a way back to the picker.
   Injected here rather than written into any variant, so no variant has to know
   the review harness exists. */
const BACKBAR = `
<a href="/" style="position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:99;
  display:flex;gap:.5rem;align-items:center;padding:.4rem .85rem;border-radius:999px;
  background:rgba(10,12,20,.82);color:#fff;border:1px solid rgba(255,255,255,.22);
  font:500 12px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;
  text-decoration:none;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)">
  &larr; All variants</a>`;

const built = [];
let currentHTML = '';
for (const name of names){
  const v = JSON.parse(read(`./src/variants/${name}/variant.json`));
  let html = render(`./src/variants/${name}/index.html`, v.css, v.js);
  if (name === CURRENT) currentHTML = html;
  if (PREVIEW) html = html.replace('</body>', () => BACKBAR + '\n</body>');
  const path = (name === CURRENT && !PREVIEW) ? 'index.html' : `${name}/index.html`;
  emit(path, html);
  built.push({ name, ...v, href: path });
}

/* ── About, shared by every variant ───────────────────────── */
{
  let html = render('./src/about.html',
    ['core/base.css', 'core/about.css'],
    ['core/sky.js', 'core/about.js', 'core/nav.js']);
  if (PREVIEW) html = html.replace('</body>', () => BACKBAR + '\n</body>');
  emit('about.html', html);
}

/* ── Preview ──────────────────────────────────────────────
   The CURRENT hub with the document wrapper stripped, for embedding in hosts
   that supply their own <head>/<body> skeleton. Not served by the Worker. */
emit('preview.html', currentHTML
  .replace(/^[\s\S]*?<title>/, '<title>')
  .replace(/<\/head>\s*<body>/, '')
  .replace(/<\/body>\s*<\/html>\s*$/, ''));

/* ── Review index ─────────────────────────────────────────
   Served at /compare in a production build and at / in a preview one. */
const compare = read('./src/compare.html')
  .replace('__VARIANTS__', () => JSON.stringify(built.map(
    ({ name, label, blurb, href }) => ({ name, label, blurb, href }))));
emit(PREVIEW ? 'index.html' : 'compare.html', compare);
