# Corpus: astro

Source: `withastro/docs` @ `fc25123` (docs.astro.build, Astro 7 + Starlight, 15 locales).
Built 2026-09-03: `pnpm install --frozen-lockfile`, `pnpm build` (~10 min) → `dist/`
(6,358 HTML files, all nested `index.html` + one `404.html`; site sets
`trailingSlash: 'always'`).

Relative paths mirror `dist/`.

| File | Role | Notes |
| --- | --- | --- |
| `index.html` | meta-refresh redirect stub | 80 B → `/en/getting-started/` |
| `404.html` | custom 404 (`404.astro` exists) | 38,916 B, `lang="en"`, excluded from sitemap |
| `en/basics/astro-components/index.html` | rich content page | 257,772 B raw, ~17 KB article text |
| `en/tutorial/1-setup/1/index.html` | thin interactive tutorial page | 251,220 B raw, ~2.5 KB text |
| `de/install-and-setup/index.html` | German locale page | `lang="de"` — Starlight sets per-locale `lang` automatically |
