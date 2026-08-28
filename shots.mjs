/* Renders every built variant at three widths into shots/, so the variants can
   be reviewed without running the site. */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const targets = process.argv.slice(2);
const pages = targets.length ? targets
  : JSON.parse(readFileSync(new URL('./dist/compare.html', import.meta.url), 'utf8')
      .match(/const VARIANTS = (\[.*?\]);/s)[1]).map(v => v.href);

const SIZES = [['desktop', 1440, 900], ['tablet', 820, 1100], ['phone', 390, 844]];
mkdirSync(new URL('./shots', import.meta.url), { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const rel of pages){
  for (const [label, w, h] of SIZES){
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + process.cwd() + '/dist/' + rel);
    await p.waitForTimeout(2200);
    const name = (rel.replace(/\/?index\.html$/, '') || 'current') + '-' + label;
    await p.screenshot({ path: `shots/${name}.png`, fullPage: label !== 'desktop' });
    console.log(`${name.padEnd(22)}${errs.length ? 'JS ERROR: ' + errs[0] : 'ok'}`);
    await p.close();
  }
}
await b.close();
