# Static Build Output Survey: Do Real Frameworks Emit One Indexable Thing?

**Status:** Research (verified against primary sources, 2026-09)
**Date:** 2026-09-03
**Audience:** Anyone editing [specs/01-architecture.md](../../specs/01-architecture.md) (AD-2) or
[specs/02-cli-contract.md](../../specs/02-cli-contract.md) (`--exclude` / `--sitemap`); issue #16
consumers deciding whether those flags live or die
**Read time:** 15 min

## TL;DR

AD-2 — "exactly one supported input: a directory of built HTML" — **survives, but needs
amending, not revering**. All six surveyed frameworks (Next.js `output: "export"`, Astro,
Docusaurus, VitePress, Nuxt `generate`, Hugo) emit a directory of fully-rendered HTML that one
Pagefind pass can consume. No framework requires a source adapter, a renderer, or a crawler.
But uniformity ends at "is a folder of HTML":

1. **Every framework emits a `404.html`** (Nuxt's `200.html` twin is generate-mode only —
   absent under `nuxt build`) that must not be indexed — and 404s are only the first junk
   class. Real builds also emit **redirect-stub thin pages**: 189 meta-refresh stubs in the
   Next.js corpus (21%), 7,780 `*.html.html` twins in the Docusaurus corpus (~50%), 117 in
   the Nuxt corpus (12%), plus Astro meta-refresh stubs. Sitemaps omit them where sitemaps
   exist. This alone justifies keeping Seek's provisional `--exclude` flag (#16: keep it),
   with the sitemap as the restriction path.
2. **Sitemap availability splits 3–3.** Docusaurus (via preset) and Hugo emit one by default;
   VitePress emits one only when `hostname` is set; Astro (integration), Next.js, and Nuxt
   have no built-in sitemap at all. `--sitemap` cannot be the default path — it must stay an
   opt-in Seek-owned restriction (#16: keep it, do not default it).
3. **`<html lang>` is automatic in two frameworks plus Starlight, DIY elsewhere.** Docusaurus
   (i18n locale), VitePress (`lang` / per-locale `lang`), and Astro+Starlight (per-locale
   `lang` from its own config — corpus-verified, correcting the survey's DIY claim) set it
   for the author. Next.js, core Astro, Nuxt, and Hugo (theme-dependent) leave it to author
   code. The spec's required `languages` field therefore degrades to `["unknown"]`-heavy
   output on careless sites; keep `--force-language` and document the gap.
4. **Nuxt is the one problematic framework**, not because its output isn't HTML, but because
   of three input-side behaviors: the Nitro crawler silently skips unlinked routes, `ssr: false`
   produces client-side shells that index to nothing, and re-runs without cache clearing can
   emit HTML referencing stale build IDs (upstream bug). It is still indexable — it just needs
   Seek-side pre-scan warnings, not an adapter.
5. **Hugo is the stale-file risk**: `cleanDestinationDir` defaults to `false`, so deleted
   routes linger as indexable HTML. Seek docs should prescribe a clean build, not add a flag.

Verdict table (detail in §2–§7):

| Framework | Status | Needs from Seek |
| --- | --- | --- |
| Astro | drop-in | `--exclude 404.html` only if author created one; sitemap opt-in |
| Hugo | drop-in | `--exclude 404.html`; prescribe `cleanDestinationDir`; sitemap usable as-is |
| Docusaurus | drop-in | `--exclude 404.html` (+ `/fr/404.html` per locale); sitemap usable as-is |
| VitePress | drop-in | `--exclude 404.html`; sitemap opt-in via `hostname` |
| Next.js (`output: "export"`) | needs-flag | `--exclude 404.html` + redirect stubs; docs guidance (export-unsupported features fail closed at build; example/sandbox sections index thin) |
| Nuxt (`generate`/`build`) | problematic | `nuxi generate` unusable on server-module sites (use `nuxt build`); `--exclude` for `404.html` + redirect stubs (`200.html` generate-only); pre-scan warnings (shell pages, unlinked routes); docs guidance on fresh builds |

Corpus note: six real open-source sites were cloned and production-built outside the repo
(see §9) — each framework's own docs where possible (`withastro/docs`, `facebook/docusaurus`
website, `vuejs/docs`, `gohugoio/hugoDocs`, `nuxt/nuxt.com`), plus Shopify's
statically-exported Polaris site for Next.js (`reactjs/react.dev` is dynamically served, not
statically exported, so it is out of scope). Repro recipes are retained per section.

Background constraints assumed throughout: Pagefind consumes a directory via an *include* glob
only, has no sitemap support, and detects language per page from `<html lang>` —
see [research/pagefind/01-node-api.md](../pagefind/01-node-api.md). Pagefind skips `<nav>`,
`<footer>`, `<script>`, and `<form>` content when indexing, but indexes CSS-hidden text —
see [01-node-api.md §4](../pagefind/01-node-api.md#4-how-excerpts-are-produced-and-the-hidden-text-leak).

---

## 1. Comparison table

| | Next.js (`output: "export"`) | Astro | Docusaurus | VitePress | Nuxt (`generate`) | Hugo |
| --- | --- | --- | --- | --- | --- | --- |
| Output dir (default) | `out/` ([static-exports](https://nextjs.org/docs/app/guides/static-exports)) | `dist/` ([config](https://docs.astro.build/en/reference/configuration-reference/)) | `build/` ([cli](https://docusaurus.io/docs/cli)) | `.vitepress/dist` ([site-config](https://vitepress.dev/reference/site-config)) | `.output/public` (+ `dist` symlink) ([generate](https://nuxt.com/docs/4.x/api/commands/generate), [discussion #18465](https://github.com/nuxt/nuxt/discussions/18465)) | `public/` ([all-settings](https://gohugo.io/configuration/all/)) |
| Route shape (default) | flat: `/blog/post-1.html` ([static-exports](https://nextjs.org/docs/app/guides/static-exports)) | nested: `/about/index.html` ([config `build.format`](https://docs.astro.build/en/reference/configuration-reference/)) | nested: `/docs/myDoc/index.html` ([config `trailingSlash`](https://docusaurus.io/docs/api/docusaurus-config)) | flat: `*.html` ([routing](https://vitepress.dev/guide/routing)) | nested + `_payload.json` per route ([prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering)) | nested: `section/page/index.html` ([urls](https://gohugo.io/content-management/urls/)) |
| Trailing-slash variant | `trailingSlash: true` → `/me/index.html` ([static-exports](https://nextjs.org/docs/app/guides/static-exports)) | `build.format: "file"` → `/about.html` ([config](https://docs.astro.build/en/reference/configuration-reference/)) | `trailingSlash: false` → `/docs/myDoc.html` ([config](https://docusaurus.io/docs/api/docusaurus-config)) | `cleanUrls: true` (needs server rewrites) ([routing](https://vitepress.dev/guide/routing)) | n/a (crawler follows links) | `uglyURLs: true` → `page.html` ([discourse #43138](https://discourse.gohugo.io/t/how-to-stop-generating-index-html-for-article/43138)) |
| HTML at build? | Yes, per route (Server Components run at build) ([static-exports](https://nextjs.org/docs/app/guides/static-exports)) | Yes; zero-JS default ([generate.ts](https://github.com/withastro/astro/blob/39ff2a56/packages/astro/src/core/build/generate.ts)) | Yes, every route ([seo](https://docusaurus.io/docs/seo)) | Yes, all pages pre-rendered ([build.ts](https://github.com/vuejs/vitepress/blob/eb7658d4/src/node/build/build.ts)) | Yes *if* route is reached and SSR on ([prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering)) | Yes, Go templates ([urls](https://gohugo.io/content-management/urls/)) |
| `<html lang>` | Manual: author sets it in root layout; per-page is DIY ([discussion #49415](https://github.com/vercel/next.js/discussions/49415)) | DIY: author layout reads URL ([i18n recipe](https://docs.astro.build/en/recipes/i18n/)) | Automatic from i18n locale (`htmlLang` override) ([i18n tutorial](https://docusaurus.io/docs/i18n/tutorial)) | Automatic from `lang` / per-locale `lang` ([i18n](https://vitepress.dev/guide/i18n)) | Author-controlled via `app.head.htmlAttrs` / `useHead({ htmlAttrs })` ([seo-meta](https://nuxt.com/docs/4.x/getting-started/seo-meta)) | Theme-dependent; multilingual `locale` feeds embedded templates ([languages](https://gohugo.io/configuration/languages/)) |
| Asset filenames | `_next/` hashed bundles | `_astro/` hashed ([custom-filenames recipe](https://docs.astro.build/en/recipes/customizing-output-filenames/)) | webpack-hashed bundles | `assets/` content-hashed (`app.4f283b18.js`) ([deploy](https://vitepress.dev/guide/deploy)) | `_nuxt/` hashed; **stale build-ID bug on dirty re-runs** ([issue #33999](https://github.com/nuxt/nuxt/issues/33999)) | theme/pipeline-dependent (unverified here) |
| `404.html` emitted? | Yes, `/out/404.html` ([static-exports](https://nextjs.org/docs/app/guides/static-exports)) | Only if author creates `404.astro` ([pages](https://docs.astro.build/en/basics/astro-pages/)) | Yes, root + per-locale `/fr/404.html` ([i18n tutorial](https://docusaurus.io/docs/i18n/tutorial)) | Yes, always — but an **empty shell** (corpus) ([issue #729/#740](https://github.com/vuejs/vitepress/issues/740)) | `404.html` always; **`200.html` generate-mode only** (absent under `nuxt build`; corpus) ([prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering)) | Yes, from 404 template; multilingual root quirk ([issue #5161](https://github.com/gohugoio/hugo/issues/5161)) |
| Sitemap | None built in | Opt-in `@astrojs/sitemap` (needs `site:`, else silent empty) ([sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)) | Yes via plugin (preset-classic default; honors `noindex`, `ignorePatterns`) ([plugin-sitemap](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-sitemap)) | Opt-in via `sitemap.hostname` ([sitemap-generation](https://vitepress.dev/guide/sitemap-generation)) | None built in; add routes to `nitro.prerender.routes` ([prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering)) | Yes, built in (`sitemap.xml`, multilingual index) ([output-formats](https://gohugo.io/configuration/output-formats/)) |
| Drafts / stale files | Draft Mode unsupported in export (fail-closed) ([static-exports](https://nextjs.org/docs/app/guides/static-exports)) | `dist/` emptied each build (secondary source; **unconfirmed by corpus**) ([devcraftly mirror](https://devcraftly.com/astro/building-for-production/)) | drafts excluded from production builds (**verified on production build**); `unlisted` posts emitted but `noindex` + off-sitemap (corpus) | No draft concept; outDir-clean **verified** by corpus rebuilds | `dist` symlink can point stale after renames ([issue #14361](https://github.com/nuxt/nuxt/issues/14361)) | Drafts/future/expired excluded by default ([all-settings](https://gohugo.io/configuration/all/), [hugo_build](https://gohugo.io/commands/hugo_build/)); **stale files linger** (`cleanDestinationDir: false` default — **confirmed by corpus experiment**) ([all-settings](https://gohugo.io/configuration/all/)) |

---

## 2. Next.js (`output: "export"`) — needs-flag

**AD-2 says:** "Hugo, Jekyll, Sphinx, MkDocs, and Next.js all emit the same artifact: a folder
of HTML."
**Reality says:** true, with the most asterisks of any SSG in this survey — all of them
fail-closed at build time, which is good for Seek, plus one indexing-hygiene flag.

- **Directory shape.** `next build` with `output: "export"` writes flat files to `out/`:
  `/out/index.html`, `/out/404.html`, `/out/blog/post-1.html`
  ([static-exports](https://nextjs.org/docs/app/guides/static-exports)). `out/` is the default;
  `distDir` overrides it
  ([static-exports](https://nextjs.org/docs/app/guides/static-exports)). `trailingSlash: true`
  flips flat files to nested `/me/index.html`
  ([static-exports](https://nextjs.org/docs/app/guides/static-exports)). Both shapes are
  trivially consumable by an include-glob directory walk.
- **Rendered at build, not a shell.** Server Components run during the build, one HTML file per
  route ([static-exports](https://nextjs.org/docs/app/guides/static-exports)). Marketing and
  docs pages alike index fully — *provided* the route could be prerendered at all (next point).
- **Unsupported features fail closed.** Dynamic routes without `generateStaticParams()`,
  cookies, rewrites, ISR, default image optimization, Draft Mode, and Server Actions are all
  unsupported under export, and using them errors
  ([static-exports](https://nextjs.org/docs/app/guides/static-exports)). For Seek this is the
  best failure mode: a site that can't export can't silently produce shell pages. The sharp
  edge is narrower — heavily client-component pages (e.g. `localStorage`-gated content) still
  export, but their server-rendered HTML may index thin. A Seek-side thin-page warning (cf.
  [01-node-api.md §2](../pagefind/01-node-api.md#2-what-adddirectory-returns)) covers it; no
  adapter needed.
- **`<html lang>` is manual and site-wide by default.** Next.js requires `<html>` in the root
  layout (enforced by the missing-root-layout-tags error), but per-page `lang` has no
  framework API — multilingual sites hand-roll `[lang]` segments plus client-side patching
  ([discussion #49415](https://github.com/vercel/next.js/discussions/49415)). Expect one
  correct `lang` per monolingual site, and patchy `lang` on multilingual ones. `--force-language`
  stays relevant.
- **Junk output (`--exclude` / `--sitemap` for #16).** `404.html` is always emitted
  ([static-exports](https://nextjs.org/docs/app/guides/static-exports)) → **keep `--exclude`,
  recommend `404.html`**. Corpus (`Shopify/polaris-react-archive`, `output: "export"`, 907
  HTML files) adds a second exclusion class: **189 meta-refresh redirect stubs (21%)** from
  renamed routes — thin near-duplicates, structurally identical to Hugo alias pages. Next.js
  `--exclude` guidance should name redirect/alias stubs alongside `404.html`. There is no
  built-in sitemap → `--sitemap` can only ever be user-supplied here, never auto-detected.
  No draft leakage (Draft Mode is unsupported).
- **Idempotence.** Asset bundles live under `_next/` with hashed names; no evidence of
  per-build nondeterminism in the HTML itself was found. Per-route SSG JSON payloads live
  under `_next/data/<buildId>/` — JSON, invisible to an HTML include glob. Re-runs are
  input-identical for Seek's purposes.
- **Thin pages are prevalent, not edge-case.** Corpus: 414/907 files (46%) carry <300 text
  bytes (`examples/` and `sandbox/` sections are systematically client-demo shells), and even
  the marketing landing page is 788 text bytes. All of them prerendered successfully — thin
  output is a content-shape fact, not a build failure. The Seek-side thin-page warning is
  real and load-bearing here, not a nicety.
- **Duplicated chrome.** Full-page SSR output repeats nav/footer on every page; Pagefind's
  built-in `<nav>`/`<footer>` skipping absorbs most of it
  ([01-node-api.md §4](../pagefind/01-node-api.md#4-how-excerpts-are-produced-and-the-hidden-text-leak)).
  Cookie banners (client-rendered, CSS-hidden) remain an excerpt-pollution risk in every
  framework — docs guidance, not a flag.

**Build executed (corpus):** `Shopify/polaris-react-archive` @ `af6ffb6` (Polaris docs +
marketing, Next 15.2.8 pages router, `output: "export"`, `trailingSlash: false`):
`pnpm install` at root, `pnpm turbo run build --filter=polaris.shopify.com...` (~10 min) →
`polaris.shopify.com/out/`, 907 HTML files. Note: first choice `reactjs/react.dev` is NOT
statically exported (no `output` field; uses `rewrites()`), so it is out of scope.
Scaffold recipe retained for reproduction:
```bash
npx create-next-app@latest corp-next --typescript --app --no-tailwind --eslint
# add to next.config.js: { output: "export", images: { unoptimized: true } }
npm run build  # emits out/
```

## 3. Astro — drop-in

**AD-2 says:** one input covers every generator without one adapter per generator.
**Reality says:** Astro is the cleanest confirmation of the claim.

- **Directory shape.** `astro build` writes `dist/` by default (`outDir` overrides it), nested
  `/about/index.html` under the default `build.format: "directory"`; `"file"` gives
  `/about.html`, `"preserve"` mirrors source layout
  ([config](https://docs.astro.build/en/reference/configuration-reference/),
  [generate.ts](https://github.com/withastro/astro/blob/39ff2a56/packages/astro/src/core/build/generate.ts)).
  All three are include-glob friendly.
- **Rendered at build.** Zero-JS-by-default: components render to HTML ahead of time, JS ships
  only for hydrated islands
  ([devcraftly mirror](https://devcraftly.com/astro/building-for-production/)). Both marketing
  pages and docs pages index fully. (Starlight, Astro's docs framework, inherits this; its
  sidebar/nav chrome is server-rendered like any other.)
- **`<html lang>` is author DIY in core Astro.** The official i18n recipe has each layout
  compute `lang` from the URL and write `<html lang={lang}>` by hand
  ([i18n recipe](https://docs.astro.build/en/recipes/i18n/)). Monolingual starters commonly hard
   code `lang="en"` or omit it — the latter lands pages in Pagefind's `unknown` language bucket
   ([01-node-api.md §5](../pagefind/01-node-api.md#5-language-detection-surfacing)). Same
   `--force-language` story as Next.js. **Corpus correction: Astro+Starlight sets per-locale
   `lang` automatically** — `@astrojs/starlight` renders `<html lang={starlightRoute.lang}>`
   from its own `locales` config (`lang="de"`, `lang="ja"` observed on `withastro/docs` with
   zero author lang code). Starlight belongs in the automatic tier with Docusaurus/VitePress;
   DIY applies to core Astro only.
- **Junk output (for #16).** A custom 404 only exists if the author creates `src/pages/404.astro`
  (builds to `404.html`)
  ([pages](https://docs.astro.build/en/basics/astro-pages/)) → `--exclude` needed only then.
  Corpus adds meta-refresh redirect stubs (e.g. root `index.html` → 80-byte refresh to
  `/en/getting-started/`) — thin pages worth one line in the per-framework docs table.
  Sitemap comes solely from the opt-in `@astrojs/sitemap` integration, which additionally
  produces *nothing useful* (a file with no URLs, no error) if `site:` is unset
  ([sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)) — Seek must not
  treat "a sitemap exists" as "a sitemap is valid." (Corpus: with `site:` set, `sitemap-index.xml`
  → 5,880 URLs, 404 and stubs excluded — valid and usable.)
- **Idempotence / staleness.** The build empties the output directory before writing
  ([devcraftly mirror](https://devcraftly.com/astro/building-for-production/) — secondary
  source; official primary not located), so deleted routes self-clean. Hashed `_astro/` assets
  are content-hashed
  ([custom-filenames recipe](https://docs.astro.build/en/recipes/customizing-output-filenames/)).
   Best-in-class for the specs/02 byte-identical re-run invariant. Corpus caveat: self-cleaning
   could NOT be verified (a rebuild costs 10+ min on `withastro/docs`) — the claim still rests
   on the secondary source above. Treat as open, not contradicted, since Hugo (§7) shows why
   the claim matters. Corpus positives: 6,358 fully-rendered nested HTML files, correct
   per-locale `lang`, zero shells anywhere sampled.

**Build executed (corpus):** `withastro/docs` @ `fc25123` (docs.astro.build, Astro 7 + Starlight,
15 locales): `pnpm install --frozen-lockfile`, `pnpm build` (= `astro build`, ~10 min) →
`dist/`, 6,358 HTML files (6,357 nested `index.html` + `404.html`; note this site sets
`trailingSlash: 'always'`, so the bare default is consistent-but-untested here).
Scaffold recipe retained:
```bash
npm create astro@latest corp-astro -- --template minimal
npm run build  # emits dist/
```

## 4. Docusaurus — drop-in

**AD-2 says:** framework-agnostic output.
**Reality says:** holds; Docusaurus is the most Seek-convenient React-based output (built-in
sitemap, automatic `lang`).

- **Directory shape.** `docusaurus build` writes `build/` (note: *not* `dist/`; `--out-dir`
  overrides) ([cli](https://docusaurus.io/docs/cli)). Default `trailingSlash: undefined` emits
  nested `/docs/myDoc/index.html`; `false` emits flat `/docs/myDoc.html`
  ([config](https://docusaurus.io/docs/api/docusaurus-config)). Both indexable; note the flat
  variant exists because some hosts can't serve directory URLs — Seek users on those hosts are
  exactly the ones with flat output, and Pagefind doesn't care either way. Corpus: production
  docusaurus.io builds **flat** (`trailingSlash` follows the deploy-preview flag) — the
  framework default (nested) is uncontradicted, but the real corpus demonstrates the flat
  variant.
- **Rendered at build.** "HTML files are statically generated for every URL route"
  ([seo](https://docusaurus.io/docs/seo)). Docs and marketing/blog pages alike.
- **`<html lang>` is automatic.** Locale names default the `lang` attribute (`localeConfigs.htmlLang`
  overrides); each non-default locale builds its own SPA tree (`build/`, `build/fr`)
  ([i18n tutorial](https://docusaurus.io/docs/i18n/tutorial)). This is the ideal input for the
  spec's `languages` field.
- **Junk output (for #16).** `404.html` at root plus per-locale `/fr/404.html` (hosts must map
  `/fr/*` explicitly) ([i18n tutorial](https://docusaurus.io/docs/i18n/tutorial)) → **keep
  `--exclude`; recommend `404.html` plus `<locale>/404.html`**. Sitemap ships with
  preset-classic, honors `noindex` and `ignorePatterns`, and follows `trailingSlash`
  ([plugin-sitemap](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-sitemap)) → the
   one framework where `--sitemap` auto-detect usually *restricts correctly out of the box*.
   Corpus: root `sitemap.xml` (1,366 URLs) + per-locale sitemaps, verified clean — 0 stub
   URLs, 0 `404` URLs, 0 unlisted-post URLs. The sitemap is the correct restriction path here.
- **Redirect-stub junk dominates the corpus.** Opt-in `fromExtensions: ['html']`
   client-redirects emit a `*.html.html` meta-refresh stub twin for **7,780 of 7,880 real pages
   (98.7%)** — ~300 bytes each, ~zero visible text. A `**/*.html` include glob ingests ~50%
   near-empty pages. (Caveat: `fromExtensions` is opt-in site config, not a Docusaurus default —
   but the flagship site uses it.) §4's versioned-tree concern understates it; this is 1:1
   duplication on every page.
- **Drafts: now verified excluded on a real production build** (a `draft: true` dogfood post
   yields zero files in `build/`). But `unlisted: true` posts ARE emitted as HTML in all
   locales (tagged `noindex`, omitted from sitemap) yet indexable by a naive glob — a second
   junk class after 404s/stubs.
- **Duplicated chrome.** Sidebar + navbar + footer on every docs page; same `<nav>`/`<footer>`
  mitigation as §2. Versioned docs (`/docs/next/…`) duplicate content across versions — a
  sitemap/`ignorePatterns` concern for site owners, not a Seek flag.

**Build executed (corpus):** `facebook/docusaurus` @ `deca844e`, `website/` (docusaurus.io —
docs + marketing + blog, 5 locales): `pnpm install` at root, `pnpm build` in `website/`
(~12 min) → `website/build/` (1.2 GB), 15,660 HTML files = 7,880 real pages + 7,780
`*.html.html` redirect stubs. All content fully server-rendered (docs, blog, marketing alike;
blog post densest per byte). Scaffold recipe retained:
```bash
npx create-docusaurus@latest corp-doc classic
npm run build  # emits build/
```

## 5. VitePress — drop-in

**AD-2 says:** one directory in, index out.
**Reality says:** holds; the flattest output of the six, with two opt-in warts.

- **Directory shape.** Output goes to `.vitepress/dist` (`outDir` overrides), as **flat**
  `*.html` files (`index.html`, per-page `*.html`), plus `assets/`, `hashmap.json`,
  `vp-icons.css`, and optional `sitemap.xml`
  ([site-config](https://vitepress.dev/reference/site-config),
  [build.ts](https://github.com/vuejs/vitepress/blob/eb7658d4/src/node/build/build.ts)).
  `cleanUrls: true` strips `.html` from *links* but requires server rewrite support
  ([routing](https://vitepress.dev/guide/routing)); the portable default keeps `.html`.
- **Rendered at build.** The build bundles, then explicitly "renders pages" to static HTML
  ([build.ts](https://github.com/vuejs/vitepress/blob/eb7658d4/src/node/build/build.ts)).
  Corpus (`vuejs/docs`, 111 pages): every content page fully pre-rendered (2–16 KB text) —
  **except `404.html`, which is an empty shell** (`<div id="app"></div>`, 0 bytes rendered
  text). The "always emitted" half holds; the "rendered" half does not. Excluding the 404
  is doubly justified.
- **`<html lang>` is automatic.** Top-level `lang` plus per-locale `lang` (emitted as the
  `lang` attribute) ([i18n](https://vitepress.dev/guide/i18n)).
- **Junk output (for #16).** `404.html` always emitted, no config needed
  ([issue #729/#740](https://github.com/vuejs/vitepress/issues/740)) → **keep `--exclude`**.
   Sitemap is opt-in via `sitemap.hostname`
   ([sitemap-generation](https://vitepress.dev/guide/sitemap-generation)). No draft concept —
   every markdown page ships, so junk control is purely 404-exclusion. `hashmap.json` is a
   cache-invalidation file, not HTML, so the include glob ignores it naturally. Corpus adds:
   94 `.md` source copies + `llms.txt` / `llms-full.txt` (via `vitepress-plugin-llms`) — ignored
   by an HTML glob, but a bare `**/*` enumeration would pick up 94 near-duplicate `.md` files.
- **Idempotence.** Assets are content-hashed (`app.<hash>.js`; same content → same URL, safe
  for aggressive caching) ([deploy](https://vitepress.dev/guide/deploy)). Icon CSS hash is
  substituted post-render ([site-config](https://vitepress.dev/reference/site-config)) —
  deterministic given identical input. Corpus qualification: 4 identical-input rebuilds produced
  **3 different CSS bundles** (icon-selector *ordering* churn from `vitepress-plugin-group-icons`;
  same length, first divergence at char 88,222). JS hashes and `sitemap.xml` stable; HTML diffs
  limited to the stylesheet-href line. Content hashes are content-stable, but output is **not
  byte-identical run-to-run** — live evidence for scoping specs/02 invariant 2 to *Seek's*
  determinism. Also verified: outDir IS cleaned on rebuild (previously unverified).

**Build executed (corpus):** `vuejs/docs` @ `b75d188` (vuejs.org — the Vue docs on VitePress
2.0 alpha, monolingual `lang: 'en-US'`, `sitemap.hostname` set): `pnpm install`, `pnpm run build`
(seconds) → `.vitepress/dist/` (~29 MB), 111 HTML files; `sitemap.xml` with 110 URLs (404
excluded). Per-locale `lang` untestable here (monolingual site) — remains docs-sourced.
Scaffold recipe retained:
```bash
npm init -y && npm add -D vitepress
npx vitepress init  # docs/
npx vitepress build docs  # emits docs/.vitepress/dist
```

## 6. Nuxt (`generate`) — problematic (still no adapter, but needs Seek-side handling)

**AD-2 says:** operating on build output makes the tool automatically framework-agnostic.
**Reality says:** the output *is* plain HTML, but Nuxt is the only framework where *which*
HTML you get depends on crawler luck and SSR settings. AD-2 holds mechanically; it strains
operationally. This is the framework that most needs the warnings taxonomy from
[01-node-api.md §2](../pagefind/01-node-api.md#2-what-adddirectory-returns).

- **Directory shape.** `nuxi generate` prerenders into `.output/public` (a hardcoded `dist`
  symlink points at it in generate mode) ([generate](https://nuxt.com/docs/4.x/api/commands/generate),
  [discussion #18465](https://github.com/nuxt/nuxt/discussions/18465)). Each route gets HTML
  plus a `_payload.json` (serialized `useAsyncData`/`useFetch` state for hydration)
  ([prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering)). Payload files are
  JSON, not HTML — invisible to an HTML include glob, but they do double per-route artifact
  count for anyone enumerating the dir. Corpus (`nuxt/nuxt.com` via `nuxt build`): **flat**
  `*.html` + **per-directory** `_payload.json`, driven by `autoSubfolderIndex: false` — a Seek
  directory walk must not assume nested `index.html`, and there is no `dist` symlink outside
  generate mode.
- **Crawler discovery gaps (the big one).** Prerendering boots the app, renders `/`, then
  follows `<a>` tags until exhaustion; routes nothing links to are silently absent unless
  listed in `nitro.prerender.routes` / `crawlLinks`
  ([prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering)). A Seek index over
  such output is *valid but incomplete* with no signal from Pagefind's aggregate `page_count`.
  Mitigation is Seek-side: report file counts and warn when the sitemap (if any) lists URLs
  with no corresponding HTML — i.e. exactly the pre-scan proposed in
  [01-node-api.md (verdict §6)](../pagefind/01-node-api.md#verdict). Corpus: deliberate seeding
  (`crawlLinks` + per-version seeds + ignore list) achieved 278/283 sitemap-mapped docs URLs —
  the gap is operationally manageable, which supports the pre-scan-warning framing and
  downgrades the alarm.
- **Shell risk.** With `ssr: false`, generated pages don't carry content (community report:
  works in dev, breaks after generate/serve)
  ([nuxt/content #3043](https://github.com/nuxt/content/issues/3043)). Such pages index to
  nothing — the "empty content" warning case. Also fail-soft, not fail-closed: unlike Next.js
  export errors, Nuxt happily emits the shell. Corpus inversion: `ssr: false` routes on
  nuxt.com emitted **nothing** (prerender-ignored, not shells); the real thin-content findings
  are the always-emitted **404 shell (0 text bytes)** and **117 redirect stubs (12%)** — both
  argue for broader junk control than just 404-exclusion.
- **`404.html` always emitted; `200.html` only in generate mode** ([prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering))
  → **keep `--exclude`; recommend both where present**. Corpus: under `nuxt build` only
  `404.html` exists — "always" needs the generate-mode qualifier. The custom `error.vue` does not reliably survive
  generate ([issue #12353](https://github.com/nuxt/nuxt/issues/12353)), so the 404 content is
  also low-quality index fodder even if included.
- **Re-run non-idempotence (specs/02 invariant 2ura).** Successive `generate` runs without
  clearing `.nuxt`/`.output`/`dist`/caches can emit HTML referencing *stale* build IDs while
  `latest.json` carries the new one → 404s for JS and `_payload.json`
  ([issue #33999](https://github.com/nuxt/nuxt/issues/33999)). The specs/02 invariant ("twice
  on identical input → byte-identical except `generatedAt`") is about *Seek's* determinism
  given fixed input, and Nuxt violates the "identical input" precondition from the outside.
  Seek docs should prescribe a clean build (`rm -rf .nuxt .output dist`); no spec change needed
  beyond clarifying that "identical input" means the *directory contents*, not "the same site
  rebuilt."
- **`<html lang>` is author-controlled** via `app.head.htmlAttrs.lang` or per-page
  `useHead({ htmlAttrs: { lang } })` ([seo-meta](https://nuxt.com/docs/4.x/getting-started/seo-meta));
  `@nuxtjs/i18n` users get it from the module, everyone else gets whatever the author set
  (often nothing).
- **No built-in sitemap**; even `/sitemap.xml` itself must be added to prerender routes
  ([prerendering](https://nuxt.com/docs/4.x/getting-started/prerendering)).

**Build executed (corpus) — with a headline caveat:** `nuxt/nuxt.com` @ `0f866f9` (Nuxt 4.5 /
Nitro 2.13): `nuxi generate` **FAILS** — `@nuxthub/core` hard-errors under full static
generation ("not compatible with nuxt generate"), and `package.json` has no `generate` script
despite the README documenting one. The survey's own §6 recipe cannot build the framework's
flagship site. Fallback per protocol: repo's own `pnpm build` (`nuxt build`, hybrid SSR +
prerender, ~13 min) → `.output/public` (586 MB): 1,003 flat `.html` files + 883 per-directory
`_payload.json` + 756 hashed `_nuxt/` bundles; reached pages fully rendered (6–12 KB text);
no sitemap/robots in output (runtime-served). Any corpus/CI recipe for Nuxt must use
`nuxt build` + prerender subset with a ~15-min budget — not `nuxi generate`.
```bash
npx nuxi@latest init corp-nuxt
nuxi generate  # emits .output/public (+ dist symlink) — generate-mode only
```

## 7. Hugo — drop-in (with a stale-file prescription)

**AD-2 says:** Hugo emits the same artifact: a folder of HTML.
**Reality says:** holds, and Hugo is one of the two frameworks with a built-in sitemap. Its
quirk is *too much* output, not too little.

- **Directory shape.** Default publish dir `public/` (`-d` / `publishDir` override)
  ([all-settings](https://gohugo.io/configuration/all/),
  [hugo_build](https://gohugo.io/commands/hugo_build/)). Pretty URLs by default
  (`section/page/index.html`); `uglyURLs: true` flips to flat `page.html`
  ([urls](https://gohugo.io/content-management/urls/),
  [discourse #43138](https://discourse.gohugo.io/t/how-to-stop-generating-index-html-for-article/43138)).
  Both indexable.
- **Rendered at build.** Pure Go-template SSG; no JS required for content. Docs sites (relearn,
  Book, Doks themes) and marketing sites alike emit full HTML.
- **Extra HTML beyond pages.** Hugo's output-format system also emits alias redirect pages
  (one small `meta refresh` HTML file per alias by default; `disableAliases` opts out)
  ([urls](https://gohugo.io/content-management/urls/),
  [output-formats](https://gohugo.io/configuration/output-formats/)), per-section RSS
  (`index.xml`), and alternate formats (e.g. `index.print.html` with some themes —
  [discourse #43138](https://discourse.gohugo.io/t/how-to-stop-generating-index-html-for-article/43138)).
  Alias pages are thin near-duplicates — a second reason (after 404s) that `--exclude` must
  survive #16, or equivalently that Hugo users point `--sitemap` at the built-in sitemap
  (which lists canonical pages, not aliases).
- **`<html lang>` is theme-dependent.** Multilingual config publishes per-language trees
  (`public/en`, `public/fr`); the `locale` value feeds the `lang` attribute of embedded
  templates (alias/RSS/OpenGraph)
  ([languages](https://gohugo.io/configuration/languages/)) — but page-level `<html lang>`
  depends on the theme's base template. Assume present on maintained themes, verify on custom
  ones.
- **Junk output (for #16).** `404.html` generated from the 404 template, with a known
  multilingual quirk (missing root copy when `defaultContentLanguageInSubdir: true`;
  [issue #5161](https://github.com/gohugoio/hugo/issues/5161)) → **keep `--exclude`**.
  Sitemap (`sitemap.xml`, index for multilingual) is built in
  ([output-formats](https://gohugo.io/configuration/output-formats/)) → `--sitemap`
  auto-detect works here. Drafts, future, and expired content are excluded by default
  (`buildDrafts`/`buildFuture`/`buildExpired` all default `false`)
  ([all-settings](https://gohugo.io/configuration/all/),
  [hugo_build](https://gohugo.io/commands/hugo_build/)).
- **Stale files — the Hugo-specific risk, now corpus-confirmed by experiment.** `cleanDestinationDir` defaults to `false`, and its
  cleanup only covers static-dir files, not rendered output
  ([all-settings](https://gohugo.io/configuration/all/)). Deleting a route and rebuilding
  leaves the old HTML in `public/` — still indexable, still served. Demonstrated on
  `gohugoio/hugoDocs`: deleted one content page, rebuilt without cleaning — page count
  796→795 and the URL left `sitemap.xml`, but the HTML remained byte-identical on disk
  (same mtime; the rebuild's `Cleaned 2` did not include it). Seek docs must prescribe
  `cleanDestinationDir = true` (or a fresh publish dir); this is a docs line, not a flag.
  Related corpus detail: the built-in sitemap **excludes `404.html`** — helpful, unstated
  above. Alias-page warning untestable here (hugoDocs sets `disableAliases = true`).

**Build executed (corpus):** `gohugoio/hugoDocs` @ `2a6da09` (gohugo.io docs): `brew install hugo`
→ v0.165.0+extended (matches pinned `HUGO_VERSION`), `npm i` (Tailwind/Alpine deps),
`hugo --gc --minify` per `netlify.toml` (~33 s) → `public/`, 791 nested HTML files, built-in
`sitemap.xml` (790 URLs), `404.html` present. `<html lang>` on 100/100 sampled pages
(`lang=en-US` from theme `site.Language.Locale`); fully rendered, no shells (median
`<main>`-text 1,182 B across all 791 pages). Scaffold recipe retained:
```bash
hugo new site corp-hugo && cd corp-hugo
hugo --cleanDestinationDir  # emits public/
```

## 8. Cross-cutting findings

**Docs vs marketing shapes.** The frameworks that serve both (Astro, Next.js, Nuxt, Hugo)
render both shapes to full HTML with the same pipeline; the difference is chrome density
(docs sidebars repeat large nav trees on every page). Pagefind's `<nav>`/`<footer>` skipping
handles the structural part
([01-node-api.md §4](../pagefind/01-node-api.md#4-how-excerpts-are-produced-and-the-hidden-text-leak)).
What it cannot handle — versioned near-duplicate trees (Docusaurus `/docs/next/`), Hugo alias
pages, Nuxt payload-adjacent duplication — is a sitemap/exclude concern, reinforcing #16's
keep-both-flags direction.

**Redirect-stub thin pages are the dominant junk class.** Corpus counts: Next.js 189 (21%),
Docusaurus 7,780 (~50%), Nuxt 117 (12%), Astro meta-refresh stubs. Structurally identical
everywhere (meta-refresh + canonical + ~zero text) and uniformly omitted from sitemaps where
sitemaps exist — which simultaneously justifies `--exclude` and makes the sitemap the correct
restriction path. Thin-but-real pages are a separate, larger class (46% of the Next.js corpus
<300 bytes): the Seek pre-scan should distinguish "thin content" (warn) from "stub"
(exclude/ignore).

**Cookie banners and hidden text.** Every framework's output can carry client-rendered,
CSS-hidden consent/chrome text that Pagefind *will* index (CSS invisibility is not in its
skip rules) ([01-node-api.md §4](../pagefind/01-node-api.md#4-how-excerpts-are-produced-and-the-hidden-text-leak)).
Framework-independent; belongs in Seek user docs ("don't ship hidden text"), not in flags.

**`languages` field reality.** Only Docusaurus and VitePress set `<html lang>` automatically;
elsewhere it is author code of varying diligence. The specs/02 `languages` requirement stands
(obtained via the `pagefind-entry.json` exception proposed in
[01-node-api.md (verdict §5)](../pagefind/01-node-api.md#verdict)), but Seek should expect and
tolerate `unknown`-heavy results, and `--force-language` earns its keep precisely on the four
DIY frameworks.

## 9. Corpus report (what was built)

**Checked in: `research/frameworks/corpus/` (~3 MB).** Six miniature slices of the real
builds above — 5–8 representative pages per framework with relative paths preserved, each
with a `MANIFEST.md` (source, pinned commit, build command, per-file role). Selected to
cover the findings that matter downstream: rich docs, thin/shell pages, redirect stubs,
404s (rendered and shell), locale pages, and non-HTML passthrough. The corpus `README.md`
lists what #15 should assert per slice. Full builds live nowhere in the repo; slices are
re-extractable from the pinned commits.

| Framework | Site built (real, open-source) | Commit | Build command | Result |
| --- | --- | --- | --- | --- |
| Next.js (`output: "export"`) | `Shopify/polaris-react-archive` (Polaris docs+marketing; first choice `reactjs/react.dev` is NOT statically exported — no `output` field, uses `rewrites()` — out of scope) | `af6ffb6` | `pnpm turbo run build --filter=polaris.shopify.com...` (~10 min) | ✅ 907 HTML in `out/` |
| Astro | `withastro/docs` (docs.astro.build, 15 locales) | `fc25123` | `pnpm build` (~10 min) | ✅ 6,358 HTML in `dist/` |
| Docusaurus | `facebook/docusaurus` `website/` (docusaurus.io, 5 locales) | `deca844e` | `pnpm build` in `website/` (~12 min) | ✅ 15,660 HTML in `build/` |
| VitePress | `vuejs/docs` (vuejs.org, VitePress 2.0 alpha) | `b75d188` | `pnpm run build` (seconds) | ✅ 111 HTML in `.vitepress/dist/` |
| Nuxt | `nuxt/nuxt.com` (Nuxt 4.5) | `0f866f9` | `nuxi generate` ❌ (`@nuxthub/core` forbids it); fallback `pnpm build` (~13 min) | ✅ 1,003 HTML in `.output/public` |
| Hugo | `gohugoio/hugoDocs` (hugo v0.165.0+extended via brew) | `2a6da09` | `hugo --gc --minify` (~33 s) | ✅ 791 HTML in `public/` |

**What the corpus changed vs the docs-only survey:** Starlight auto-`lang` (contradiction, §3);
`200.html`-always and nested-shape claims for Nuxt (contradicted, §6); `nuxi generate` unusable
on the flagship Nuxt site (recipe broken, §6); VitePress 404 unrendered + CSS hash churn
(§5); redirect-stub junk class quantified on four frameworks (§8); Docusaurus drafts verified
excluded (§4); Hugo stale-file behavior demonstrated, not just cited (§7); Astro self-cleaning
still open (rebuild cost). Honest remainder: per-locale `lang` on VitePress and Hugo alias
pages are still unobserved (monolingual corpus site; aliases disabled on hugoDocs).

**Recommended follow-up** (not this ticket): a `research/frameworks/corpus/<framework>/build.sh`
per recipe, executed in CI with network, asserting: (a) output dir exists with >0 HTML files,
(b) a `404.html` exclusion candidate is identified, (c) every HTML file parses and reports its
`<html lang>` or lack thereof, (d) no `*.html.html` / meta-refresh stubs are indexed without
explicit opt-in. That turns §1's table into a regression test for AD-2. (Nuxt entry must use
`nuxt build` with a ~15-min budget; Hugo entry needs a `hugo` binary.)

## 10. Verdict: AD-2 survives with an amendment

**AD-2's core claim — one directory-of-HTML input covers all frameworks with no adapters —
holds for all six.** No source adapter, headless renderer, or crawler is needed anywhere. The
claim was previously tested only against `seekjs-website`; it now has six-framework
primary-source backing *plus* six built real sites (§9). Do not reverse AD-2.

But "Accepted" as currently worded ("Plus an optional sitemap. Nothing else.") overclaims
uniformity. Amend AD-2 (and the downstream contract) as follows:

1. **Keep `--exclude` and `--sitemap` (input to #16: both live).** Every framework emits
   `404.html`; the corpus adds redirect-stub thin pages as the dominant junk class (up to ~50%
   of emitted HTML on Docusaurus) and thin-but-real pages as the larger warning class (46% of
   the Next.js corpus). Only half the frameworks can even produce a sitemap — but where one
   exists it omits exactly the junk (stubs, 404s, unlisted), making it the correct restriction
   path, not the default path.
2. **Downgrade `--sitemap` from "auto-detect, presumably present" to opt-in restriction.**
   Auto-detect finds a sitemap in only two frameworks by default (Docusaurus, Hugo). Docs
   should say: sitemap restriction is for junk control (aliases, versioned trees, drafts that
   leak), not the default path.
3. **Add a Seek-side pre-scan** (file count, `<html lang>` presence, empty-`<body>` detection)
   to back the specs/02 warnings taxonomy — required for Nuxt (§6) and useful everywhere.
   This is the same pre-scan [01-node-api.md already recommends](../pagefind/01-node-api.md#verdict);
   this survey adds the Nuxt crawler-gap as its strongest justification.
4. **Document per-framework notes, not code branches:** Next.js (export-unsupported features
   fail closed; exclude `404.html` + redirect stubs; expect thin example/sandbox sections),
   Nuxt (`nuxi generate` unusable on server-module sites — recipe is `nuxt build` + prerender;
   flat shape possible so never assume nested `index.html`; exclude `404.html`; unlinked routes
   are silently absent), Hugo (`cleanDestinationDir = true` prescribed — demonstrated necessary;
   alias pages; sitemap omits 404), Astro (Starlight auto-`lang`; refresh stubs; self-cleaning
   unconfirmed), VitePress (404 is an unrendered shell; CSS hashes churn run-to-run — evidence
   for scoping invariant 2; `.md`/llms passthrough files exist), Docusaurus (production builds
   flat; drafts verified excluded; `unlisted` posts and `*.html.html` stubs are the junk
   classes; sitemap verified clean). A short table in the CLI docs, sourced from §1 above.
5. **Clarify specs/02 invariant 2:** "identical input" means identical *directory contents*
   presented to `seek build` — upstream rebuild nondeterminism (Nuxt stale build IDs,
   [issue #33999](https://github.com/nuxt/nuxt/issues/33999)) is outside Seek's control and
   must be prescribed away (clean builds), not absorbed into the contract.
6. **`languages` expectation softened in docs:** best-effort detection; `unknown` is a normal
   value on the four DIY frameworks; `--force-language` is the escape hatch.
