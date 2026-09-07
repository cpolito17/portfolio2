# Ranking for "Charlie Polito"

One goal: when someone searches your name, `charliepolito.com` is the first
result. There is no competing "Charlie Polito" with a strong web presence, so
this is not a fight over keywords. It is an identity problem — Google has to be
sure that the LinkedIn profile, the GitHub account and this domain are one
person, and that this domain is that person's home page.

Everything below is split into what is already done in the repo and what you
have to do yourself, because it happens in a browser and needs your logins.

---

## Already done, in this repo

Shipped in `build.mjs`, so every page gets it and no shell can forget a tag.

| Change | Why it matters |
|---|---|
| `Person` JSON-LD with `sameAs` → LinkedIn, GitHub | The single highest-value item. It is the machine-readable claim that this domain, that LinkedIn and that GitHub are the same person. Your profiles already rank for your name; this transfers that authority to the domain. |
| One shared `@id` for the Person across `/` and `/about` | Both pages describe one entity, not two people with the same name. |
| `WebSite` + `WebPage` on `/`, `ProfilePage` on `/about` | Tells Google `/` is the site's home and `/about` is the profile page for that person. Feeds the knowledge-panel / sitelinks path. |
| App catalogue as an `ItemList` of `SoftwareApplication`, each authored by the Person | Thirteen named things attributed to you, parsed straight out of `apps.js`. |
| `robots.txt` and `sitemap.xml` | Crawlers get an origin-wide map covering `/`, `/about`, and the catalogue apps hosted beneath `charliepolito.com`; apps on other domains keep their own sitemaps. |
| `noindex` on `/preview/*` and `Disallow: /preview/` | **Was an active problem.** `wrangler.jsonc` routes `charliepolito.com/*`, so the thirteen design variants were publicly crawlable near-copies of the home page. Thirteen duplicates competing with `/` for your name is the exact outcome we are trying to avoid. |
| `<title>` and `<meta description>` rewritten | Home is `Charlie Polito - Industrial Engineer, A Digital Portfolio`; About is `About Charlie Polito - Resume, Work History and Contact`. The name stays first in both, so the exact-match signal is intact, but there is now something for a searcher to actually read in the result. |
| `logo.png` wired to `rel="icon"`, `apple-touch-icon` and `og:image` | The favicon is what Google prints beside the result. One source file for all three, so they cannot drift into three different marks. |
| `rel="me"` on the outbound LinkedIn and GitHub links | The other half of `sameAs`. The claim now runs in both directions. |
| `<meta name="author">`, `og:site_name`, `og:locale`, profile OG tags, `twitter:card` | Cheap, standard, and makes a shared link look like a person rather than a bare URL. |
| A real `404.html` | `wrangler.jsonc` sets `not_found_handling: "404-page"` and there was no 404 page. Every bad URL was returning an unstyled error. |

---

## What you need to do

Roughly forty minutes, and about 80% of the remaining value is in steps 1 and 2.
Do those two even if you do nothing else.

### 1. Google Search Console — verify and submit (15 min)

This is the single biggest thing left. Without it you are waiting on Google to
find you; with it you are telling it directly.

1. Go to <https://search.google.com/search-console> and sign in.
2. Click **Add property** → choose the **Domain** box on the left (not URL
   prefix) → enter `charliepolito.com` → **Continue**.
3. Google shows you a **TXT record** to add. Copy it.
4. In a new tab open the [Cloudflare dashboard](https://dash.cloudflare.com) →
   your account → **charliepolito.com** → **DNS** → **Records** → **Add record**.
   - Type: `TXT`
   - Name: `@`
   - Content: paste the string from step 3
   - **Save**
5. Back in Search Console, click **Verify**. Cloudflare DNS propagates in
   seconds, so if it fails, wait a minute and retry.
6. Once verified: left sidebar → **Sitemaps** → enter `sitemap.xml` → **Submit**.
7. Left sidebar → **URL Inspection** → paste `https://charliepolito.com/` →
   **Request indexing**. Repeat for `https://charliepolito.com/about`.

Check back in about a week. Search Console will show you which queries you
appear for and whether anything is blocking the crawl.

### 2. Make your profiles point here (10 min)

`sameAs` is a claim this site makes. These are the confirmations from the other
side, and they carry more weight because you do not control Google's trust in
them the way you control your own HTML.

1. **LinkedIn** → your profile → **Edit intro** (the pencil) → **Website** →
   add `https://charliepolito.com` with the type set to *Personal*. Also put
   the bare URL in your **About** section text — the contact-info link is
   `nofollow`, the About text is where a human reads it.
2. **GitHub** → <https://github.com/settings/profile> → set **Website** to
   `https://charliepolito.com` and make sure **Name** reads exactly
   `Charlie Polito`. Then pin a few of the repos behind the apps.
3. **GitHub profile README**: if you do not have one, create a repo named
   `cpolito17` (same as your username), add a `README.md`, and put a line in it
   linking to `https://charliepolito.com`. These rank well and are a free,
   permanent backlink.
4. Anywhere else your name appears — a resume PDF, a conference bio, a Devpost
   or itch.io page — use the exact string `Charlie Polito` and link the site.

**Consistency is the point.** Use `Charlie Polito` everywhere, never `Charles`
or `C. Polito`, or you are splitting one entity into two in Google's eyes.

### 3. Nice to have (15 min, optional)

- **A wider OG image.** `logo.png` is now the link-preview thumbnail, which
  renders as a small square. A 1200×630 landscape card reads better in a Slack
  or iMessage unfurl. If you want one, add it and point `og:image` at it
  instead. Affects click-through on shared links, not ranking.
- **Bing Webmaster Tools** (<https://www.bing.com/webmasters>). It can import
  your Search Console setup in one click. Bing is small but it also feeds
  DuckDuckGo and ChatGPT search.
- **A Google Business/Knowledge panel** is not worth chasing — those come from
  Wikipedia-grade sources and you are not going to trigger one, nor do you need
  one to be the first result.

---

## What deliberately was *not* done

Scoped out on purpose, and worth knowing so nobody wonders later.

- **Per-app SEO.** You said you do not need it, and the apps are separate
  Workers anyway. The `ItemList` still names all thirteen on the home page, so
  they are discoverable without any per-app work.
- **Server-side rendering of the app list.** The home page fills its index from
  JavaScript. Google renders JavaScript, and the `<h1>`, the tagline and the
  full JSON-LD catalogue are all in the static HTML, so the name query is
  covered. Pre-rendering the list would be the next thing to do if the site were
  chasing app-name queries — it is not.
- **Keyword content, a blog, backlink building.** All of it is for competitive
  terms. Your name is not one.

---

## How to check it worked

- Structured data: paste `https://charliepolito.com/` into the
  [Rich Results Test](https://search.google.com/test/rich-results). The Person
  node should parse with no errors.
- Indexing: search `site:charliepolito.com` in Google. `/` and `/about` should
  show up and nothing under `/preview` should.
- Ranking: search `Charlie Polito` in an incognito window. Expect a few weeks
  before the domain settles above the profile pages.
