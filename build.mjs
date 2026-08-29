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

   wrangler.jsonc now claims charliepolito.com/*, so unlike when this was
   written, the review IS reachable on the public domain. It is therefore
   disallowed in robots.txt and every page under it carries a noindex robots
   tag: thirteen crawlable near-copies of the home page would compete with /
   for the owner's own name, which is the one thing the SEO work is for. */
const REVIEW = 'preview';

/* Shared substitutions. Both are large data blobs and are inlined once per page
   that asks for the module holding them. */
const RESUME = JSON.parse(read('./src/data/resume.json'));
const SUBST = {
  '__ICONS__':  read('./src/data/icons.json').trim(),
  '__STARS__':  read('./src/data/stars.txt').trim(),
  '__RESUME__': JSON.stringify(RESUME),
};

/* The standalone /about page is generated from the same resume.json the in-page
   About panels read, so a variant that renders the resume itself cannot drift
   from the page that deep-links to it. */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const prose = () => [
  `<h1 class="rise">${esc(RESUME.name)}</h1>`,
  `<p class="lede rise">${esc(RESUME.lede)}</p>`,
  `<p class="rise">${esc(RESUME.intro)}</p>`,
  `<h2 class="rise">Work</h2>`,
  ...RESUME.roles.map(r => `<article class="role rise">
    <div class="role-head">
      <h3>${esc(r.org)}</h3>
      <span class="role-meta">${esc(r.meta)}</span>
    </div>
    <ul>${r.bullets.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  </article>`),
  `<h2 class="rise">What I work in</h2>`,
  `<div class="skills rise">${RESUME.skills.map(s => `
    <div class="skill-group"><h4>${esc(s.title)}</h4><p>${esc(s.items)}</p></div>`).join('')}
  </div>`,
  `<h2 class="rise">Get in touch</h2>`,
  `<div class="links rise">${RESUME.links.map(l => `
    <a class="glass pill" href="${l.url}"${l.external ? ' target="_blank" rel="me noopener noreferrer"' : ''}>${esc(l.label)}</a>`).join('')}
  </div>`
].join('\n');
const fill = s => Object.entries(SUBST).reduce((a, [k, v]) => a.replace(k, () => v), s);

/* ═══ SEO ═══════════════════════════════════════════════════
   The one search term this site needs to win is the owner's name, so the head
   is built here rather than written into eight shells that would drift apart.
   Every page gets it, and each page's own <title>, description and canonical
   stay in its shell where they are easy to read.

   Two things matter more than the tags themselves:

   - `preview` is noindex. wrangler.jsonc now routes charliepolito.com/*, so the
     thirteen variants under /preview are publicly reachable copies of the home
     page. Left indexable they are thirteen near-duplicates competing with / for
     the same name query, which is the one outcome this whole exercise is
     against.
   - The Person block carries `sameAs`. That is what lets a search engine tie
     the LinkedIn and GitHub profiles that already rank for the name to this
     domain, and treat all three as one entity rather than three strangers. */
const SITE = {
  origin: 'https://charliepolito.com',
  name:   RESUME.name,
  role:   'Industrial Engineer',
  locality: 'Los Angeles',
  region:   'CA',
  country:  'US'
};

const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

/* One Person, referenced by @id from every page, so the two pages describe the
   same entity instead of two people who happen to share a name. */
const PERSON_ID = `${SITE.origin}/#charlie-polito`;
const PERSON = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: SITE.name,
  givenName: 'Charlie',
  familyName: 'Polito',
  url: `${SITE.origin}/`,
  mainEntityOfPage: `${SITE.origin}/about`,
  jobTitle: SITE.role,
  description: RESUME.lede,
  email: 'mailto:cpolito@umich.edu',
  worksFor: { '@type': 'Organization', name: RESUME.roles[0].org },
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of Michigan' },
  address: {
    '@type': 'PostalAddress',
    addressLocality: SITE.locality,
    addressRegion: SITE.region,
    addressCountry: SITE.country
  },
  knowsAbout: RESUME.skills.flatMap(g => g.items.split(', ')),
  sameAs: RESUME.links.filter(l => l.external).map(l => l.url)
};

/* The home page is also the software index, so the apps are listed as an
   ItemList hanging off the Person. Names and URLs come from apps.js, parsed
   rather than copied, so the catalogue stays the single source. */
function catalogue(){
  const src = read('./src/core/apps.js');
  const order = src.match(/const ORDER = \[([^\]]*)\]/)[1]
    .match(/'([^']+)'/g).map(m => m.slice(1, -1));
  const by = {};
  for (const m of src.matchAll(/^  (\w+): \{ id:'[^']*', name:'([^']*)', url:'([^']*)'/gm))
    by[m[1]] = { name: m[2], url: m[3] };
  return order.map((k, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: { '@type': 'SoftwareApplication', name: by[k].name, url: by[k].url,
            applicationCategory: 'WebApplication', operatingSystem: 'Web browser',
            author: { '@id': PERSON_ID } }
  }));
}

const COMMON = [
  `<meta name="author" content="${SITE.name}">`,
  `<meta property="og:site_name" content="${SITE.name}">`,
  `<meta property="og:locale" content="en_US">`,
  `<meta name="twitter:card" content="summary">`,
  `<meta name="twitter:title" content="${SITE.name}">`
].join('\n');

const INDEXABLE = '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">';
const NOINDEX   = '<meta name="robots" content="noindex, nofollow">';

function seoHead(kind){
  if (kind === 'preview') return NOINDEX;
  if (kind === 'about') return [
    INDEXABLE, COMMON,
    ld({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'ProfilePage', '@id': `${SITE.origin}/about#page`,
        url: `${SITE.origin}/about`, name: `About ${SITE.name}`,
        isPartOf: { '@id': `${SITE.origin}/#website` }, mainEntity: { '@id': PERSON_ID } },
      PERSON
    ]})
  ].join('\n');
  return [
    INDEXABLE, COMMON,
    ld({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': `${SITE.origin}/#website`,
        url: `${SITE.origin}/`, name: SITE.name,
        inLanguage: 'en-US', publisher: { '@id': PERSON_ID } },
      { '@type': 'WebPage', '@id': `${SITE.origin}/#webpage`,
        url: `${SITE.origin}/`, name: SITE.name,
        isPartOf: { '@id': `${SITE.origin}/#website` }, about: { '@id': PERSON_ID } },
      Object.assign({}, PERSON, {
        hasPart: { '@type': 'ItemList', name: `Apps by ${SITE.name}`,
                   numberOfItems: catalogue().length, itemListElement: catalogue() }
      })
    ]})
  ].join('\n');
}

/* The catalogue's reading order is a list of keys into APPS, and a key that
   matches nothing there only fails in the browser, as a TypeError deep inside a
   variant that leaves the page blank. Catch it here instead: a mistyped key
   fails the build with the key in the message. */
function checkCatalogue(){
  const src = read('./src/core/apps.js');
  const known = new Set([...src.matchAll(/^  (\w+): \{ id:/gm)].map(m => m[1]));
  const order = src.match(/const ORDER = \[([^\]]*)\]/);
  if (!order) throw new Error('apps.js: no ORDER array found');
  const bad = [...order[1].matchAll(/'([^']+)'/g)].map(m => m[1]).filter(k => !known.has(k));
  if (bad.length) throw new Error(`apps.js: ORDER names ${bad.map(k => `"${k}"`).join(', ')}, not in APPS`);

  /* Orbit and D deal the catalogue onto fixed rings. If the ring seats and the
     catalogue disagree, `ORDER[n++]` runs off the end and a variant reads
     `.url` off undefined, which is the same blank page the check above exists
     to prevent - so catch the count here too, when an app is added. */
  const n = [...order[1].matchAll(/'([^']+)'/g)].length;
  for (const v of ['orbit', 'd']){
    const seats = [...read(`./src/variants/${v}/hub.js`)
      .matchAll(/planet:'(?:Venus|Earth|Mars)',\s*a:\s*ELEM\.\w+\[0\],\s*count:\s*(\d+)/g)]
      .reduce((a, m) => a + Number(m[1]), 0);
    if (seats !== n)
      throw new Error(`variants/${v}: rings seat ${seats} apps, apps.js ORDER has ${n}`);
  }
}
checkCatalogue();

/* Each source file keeps its own <script> tag, which preserves today's semantics
   exactly: top-level declarations share one global lexical scope across tags, and
   the files were written against that. */
const bundleJS  = list => list.map(f => `<script>${fill(read('./src/' + f))}</script>`).join('\n');
const bundleCSS = list => list.map(f => read('./src/' + f)).join('\n');
const MONO_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap">';

function render(shell, css, js, kind = 'home'){
  let out = read(shell)
    .replace('__STYLES__',  () => bundleCSS([...css, 'core/type.css']))
    .replace('__SCRIPTS__', () => bundleJS(js));
  if (!out.includes('family=JetBrains+Mono')) out = out.replace('</head>', MONO_LINK + '\n</head>');
  out = out.replace('</head>', () => seoHead(kind) + '\n</head>');
  const left = out.replace('__PROSE__', '').match(/__[A-Z]+__/g);
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
/* Order in the picker is a variant's own business: it declares "order" in its
   variant.json, so the newest composite leads and the superseded explorations
   trail it, without the build hardcoding any of their names. */
const ORDER_OF = n =>
  JSON.parse(read(`./src/variants/${n}/variant.json`)).order ?? 50;
const names = readdirSync(url('./src/variants'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name).sort()
  .sort((a, b) => ORDER_OF(a) - ORDER_OF(b));

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
  /* A visual-only variant may reuse another variant's shell. This makes the
     fixed-layout comparison explicit and prevents copied markup from drifting. */
  const shell = v.html ?? `./src/variants/${name}/index.html`;
  /* Everything under the review prefix is noindex: the variants are thirteen
     near-copies of the home page, and charliepolito.com/* now routes here, so
     without this they would compete with / for the owner's own name. */
  const html = render(shell, v.css, v.js, 'preview');

  /* CURRENT is emitted twice: once at the root, which is the live site, and
     once under the review prefix so the picker can frame it beside the
     alternatives. Same bytes, apart from the back link and the robots tag. */
  if (name === CURRENT){
    emit('index.html', render(shell, v.css, v.js, 'home'));
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
  ['core/sky.js', 'core/about.js', 'core/nav.js'], 'about').replace('__PROSE__', prose));

/* ── 404, served by wrangler's not_found_handling ──────────── */
emit('404.html', render('./src/404.html',
  ['core/base.css', 'core/about.css'],
  ['core/sky.js', 'core/about.js', 'core/nav.js'], 'preview'));

/* ── The picker, at the root of the review prefix ─────────── */
const manifest = built.map(({ name, label, blurb, href }) => ({ name, label, blurb, href }));
emit(`${REVIEW}/index.html`, read('./src/compare.html')
  .replace('__VARIANTS__', () => JSON.stringify(manifest)));

/* What was built, for shots.mjs and audit.mjs. They used to recover this by
   regexing it back out of the picker's inline script, which broke the moment
   the picker moved. */
writeFileSync(url(`./dist/${REVIEW}/variants.json`),
  JSON.stringify({ review: REVIEW, variants: manifest }, null, 2));

/* ── robots.txt and sitemap.xml ────────────────────────────
   Only the two pages this Worker actually owns are listed. The apps on
   /apex, /taxhaven and the rest are served by other Workers and are not this
   sitemap's to claim. /preview is disallowed here as well as noindexed in the
   page: the header stops it being indexed, the robots rule stops the crawl
   budget going to thirteen copies of one page in the first place. */
const PAGES = [
  { loc: `${SITE.origin}/`,      priority: '1.0' },
  { loc: `${SITE.origin}/about`, priority: '0.8' }
];
const lastmod = new Date().toISOString().slice(0, 10);

writeFileSync(url('./dist/robots.txt'),
`User-agent: *
Allow: /
Disallow: /${REVIEW}/

Sitemap: ${SITE.origin}/sitemap.xml
`);

writeFileSync(url('./dist/sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(p => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`);
console.log('robots.txt / sitemap.xml written');
