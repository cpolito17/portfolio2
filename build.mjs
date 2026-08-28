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
const names = readdirSync(url('./src/variants'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name).sort();

const built = [];
for (const name of names){
  const v = JSON.parse(read(`./src/variants/${name}/variant.json`));
  const html = render(`./src/variants/${name}/index.html`, v.css, v.js);
  emit(name === CURRENT ? 'index.html' : `${name}/index.html`, html);
  built.push({ name, ...v, href: name === CURRENT ? 'index.html' : `${name}/index.html` });
}

/* ── About, shared by every variant ───────────────────────── */
emit('about.html', render('./src/about.html',
  ['core/base.css', 'core/about.css'],
  ['core/sky.js', 'core/about.js', 'core/nav.js']));

/* ── Preview ──────────────────────────────────────────────
   The CURRENT hub with the document wrapper stripped, for embedding in hosts
   that supply their own <head>/<body> skeleton. Not served by the Worker. */
emit('preview.html', read(url('./dist/index.html'))
  .replace(/^[\s\S]*?<title>/, '<title>')
  .replace(/<\/head>\s*<body>/, '')
  .replace(/<\/body>\s*<\/html>\s*$/, ''));

/* ── Review index ─────────────────────────────────────────── */
emit('compare.html', read('./src/compare.html')
  .replace('__VARIANTS__', () => JSON.stringify(built.map(
    ({ name, label, blurb, href }) => ({ name, label, blurb, href })))));
