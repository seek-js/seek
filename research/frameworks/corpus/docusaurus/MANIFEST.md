# Corpus: docusaurus

Source: `facebook/docusaurus` @ `deca844e`, `website/` (docusaurus.io — docs + marketing +
blog, 5 locales). Built 2026-09-03: `pnpm install` at root, `pnpm build` in `website/`
(~12 min) → `website/build/` (15,660 HTML = 7,880 real + 7,780 `*.html.html` stubs).
Production build is flat (`trailingSlash` follows the deploy-preview flag).

Relative paths mirror `build/`.

| File | Role | Notes |
| --- | --- | --- |
| `index.html` | marketing home | 37,810 B raw, ~4.8 KB text |
| `showcase.html` | marketing page | 320,690 B raw, ~27 KB text |
| `docs/installation.html` | docs page | 65,430 B raw, ~8.7 KB text |
| `blog/2017/12/14/introducing-docusaurus.html` | blog post (densest per byte) | 68,099 B raw, ~12 KB text |
| `fr/index.html` | French locale home | `<html lang="fr">` (automatic) |
| `404.html` | root 404 (no `noindex`, needs `--exclude`) | 20,038 B raw, ~793 text bytes |
| `docs.html` | flat routed page | 50,732 B raw |
| `docs.html.html` | meta-refresh stub twin of `docs.html` | 280 B, ~zero text; omitted from sitemap |
