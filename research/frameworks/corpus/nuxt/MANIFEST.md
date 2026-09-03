# Corpus: nuxt

Source: `nuxt/nuxt.com` @ `0f866f9` (Nuxt 4.5 / Nitro 2.13, docs + marketing + blog).
Built 2026-09-03: `pnpm install`, then `pnpm build` (`nuxt build`, hybrid SSR + prerender,
~13 min) → `.output/public` (1,003 flat `.html` files + per-directory `_payload.json`).
`nuxi generate` FAILS on this site (`@nuxthub/core` forbids full static generation), so
`nuxt build` + prerender subset is the corpus recipe, not `generate`.

Relative paths mirror `.output/public/`.

| File | Role | Notes |
| --- | --- | --- |
| `index.html` | marketing home, fully rendered | 329,615 B raw, ~6.7 KB text |
| `blog/building-nuxt-mcp.html` | blog post, fully rendered | 206,677 B raw, ~12.4 KB text |
| `docs/4.x/getting-started/introduction.html` | versioned docs page | 182,496 B raw, ~6.3 KB text |
| `404.html` | client-side SPA shell, **0 text bytes**, bare `<html>` (no `lang`) | 19,098 B |
| `docs/guide/going-further/modules.html` | meta-refresh redirect stub (unversioned → `4.x`) | ~124 B |
