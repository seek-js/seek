# Framework corpus

Small, durable slices of **real production build output** — one directory per framework,
relative paths preserved so each slice behaves like a miniature output dir. Built for
issue #20; consumed by #15 (`seek build` runs against these) and #16 (flag decisions).

**Total size: ~3 MB. This is a fixture set, not a mirror.** Full builds live nowhere in
this repo; each `MANIFEST.md` records the source repo, pinned commit, build command, and
the role of every file, so any slice can be re-extracted by re-cloning at the pinned
commit and rebuilding.

## Contents

| Dir | Source site | Files | Covers |
| --- | --- | --- | --- |
| `nextjs/` | Shopify Polaris (`output: "export"`) | 6 | thin landing, rich hub + doc, client-demo shell, redirect stub, 404 |
| `astro/` | `withastro/docs` (Starlight, 15 locales) | 5 | refresh-stub index, 404, rich page, thin tutorial page, `de` page |
| `docusaurus/` | `facebook/docusaurus` website (5 locales) | 8 | marketing, docs, blog, `fr` home, 404, flat page + its stub twin |
| `vitepress/` | `vuejs/docs` | 6 | landing, guide, API ref, shell 404, emitted `.md` copy, section root |
| `nuxt/` | `nuxt/nuxt.com` (`nuxt build` + prerender) | 5 | home, blog, versioned doc, shell 404, redirect stub |
| `hugo/` | `gohugoio/hugoDocs` | 5 | home, rich page, short stub, 404, taxonomy stub |

## What #15 should assert against these

- `seek build <slice>` succeeds and `pageCount` equals the HTML file count per slice.
- `--exclude` removes `404.html` and the stub files from the count.
- `languages` reflects each slice's `<html lang>` reality (`en`/`de`/`fr` where present,
  `unknown` where absent — e.g. the Nuxt 404).
- Re-running over an already-built slice replaces `pagefind/` + `seek/` cleanly
  (invariant 4) without indexing its own output.

## Regeneration

Re-clone the source at the pinned commit in the per-dir `MANIFEST.md`, rebuild with the
recorded command, and re-extract the listed paths. If a rebuild changes a fixture's bytes,
that is itself a finding — record it in `01-build-output-survey.md`, don't silently update.
