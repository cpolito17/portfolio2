/* Assembles src/ into dist/. Everything is inlined into each page: the whole
   site is well under 100KB, so inlining removes every render-blocking request
   and keeps each page a single cacheable artifact. */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');

const styles = read('./src/styles.css');
const sky    = read('./src/sky.js')
                 .replace('__ICONS__', read('./src/data/icons.json').trim())
                 .replace('__STARS__', read('./src/data/stars.txt').trim());
const hub    = read('./src/hub.js');
const about  = read('./src/about.js');
const nav    = read('./src/nav.js');

const pages = {
  'index.html': read('./src/index.html').replace('__HUB__', () => hub),
  'about.html': read('./src/about.html').replace('__ABOUT__', () => about),
};

rmSync(new URL('./dist', import.meta.url), { recursive: true, force: true });
mkdirSync(new URL('./dist', import.meta.url), { recursive: true });

for (const [name, tpl] of Object.entries(pages)) {
  const out = tpl
    .replace('__STYLES__', () => styles)
    .replace('__SKY__',    () => sky)
    .replace('__NAV__',    () => nav);

  const left = out.match(/__[A-Z]+__/g);
  if (left) throw new Error(`${name}: unfilled placeholders ${[...new Set(left)].join(', ')}`);

  writeFileSync(new URL(`./dist/${name}`, import.meta.url), out);
  console.log(`${name.padEnd(14)} ${(out.length / 1024).toFixed(0)} KB`);
}

/* Same hub page with the document wrapper stripped, for embedding in hosts that
   supply their own <head>/<body> skeleton. Not served by the Worker. */
const preview = pages['index.html']
  .replace('__HUB__', () => hub)
  .replace('__STYLES__', () => styles)
  .replace('__SKY__', () => sky)
  .replace('__NAV__', () => nav)
  .replace(/^[\s\S]*?<title>/, '<title>')
  .replace(/<\/head>\s*<body>/, '')
  .replace(/<\/body>\s*<\/html>\s*$/, '');
writeFileSync(new URL('./dist/preview.html', import.meta.url), preview);
console.log(`${'preview.html'.padEnd(14)} ${(preview.length / 1024).toFixed(0)} KB`);
