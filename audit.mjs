import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport:{width:1440,height:900} });
const BAD = [
  [/[—–]/, 'em-dash or en-dash'],
  [/\b(elevate|seamless|unleash|revolutioniz|next-gen|leverage|empower|effortless)\w*/i, 'filler verb'],
  [/\bquietly (in use|trusted)/i, 'quietly-trusted tell'],
  [/\b(field notes|on the bench|loose plates|from the field)\b/i, 'performative-craftsman label'],
  [/\bscroll (to explore|down)\b/i, 'scroll cue'],
  [/\bv\d+\.\d+\.\d+\b/, 'version stamp'],
  [/\b(BETA|ALPHA|EARLY ACCESS|INVITE-ONLY)\b/, 'version label'],
  [/^\s*\d{2}\s*[\/·]\s*/m, 'section-number eyebrow'],
];
/* Every built variant plus the shared About, so a new frontend cannot quietly
   reintroduce copy the old one was checked for. */
const PAGES = JSON.parse(readFileSync(new URL('./dist/compare.html', import.meta.url), 'utf8')
  .match(/const VARIANTS = (\[.*?\]);/s)[1]).map(v => v.href).concat(['about.html']);

let total = 0;
for (const page of PAGES){
  await p.goto('file://'+process.cwd()+`/dist/${page}`);
  await p.waitForTimeout(1800);
  const strings = await p.evaluate(() => {
    const out=[]; const w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while(n=w.nextNode()){ const t=n.textContent.trim();
      if(t && n.parentElement.offsetParent!==null) out.push(t); }
    return out;
  });
  const dots = strings.filter(s => (s.match(/·/g)||[]).length > 1);
  console.log(`\n=== ${page} : ${strings.length} visible strings`);
  let fails=0;
  for (const s of strings)
    for (const [re,name] of BAD)
      if (re.test(s)){ console.log(`  FAIL [${name}] ${s.slice(0,80)}`); fails++; }
  if (dots.length) console.log(`  FAIL [middle-dot overuse] ${dots.length}`), fails+=dots.length;
  console.log(fails ? `  ${fails} issue(s)` : '  clean');
  total += fails;
}
await b.close();
console.log(total ? `\n${total} issue(s) across ${PAGES.length} pages` : `\nclean across ${PAGES.length} pages`);
process.exit(total ? 1 : 0);
