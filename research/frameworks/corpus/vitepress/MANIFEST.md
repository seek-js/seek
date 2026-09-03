# Corpus: vitepress

Source: `vuejs/docs` @ `b75d188` (vuejs.org — the Vue docs, VitePress 2.0.0-alpha.17,
monolingual `lang: 'en-US'`, `sitemap.hostname` set). Built 2026-09-03:
`pnpm install`, `pnpm run build` (seconds) → `.vitepress/dist/` (111 HTML files;
sitemap holds 110 URLs, 404 excluded).

Relative paths mirror `.vitepress/dist/`.

| File | Role | Notes |
| --- | --- | --- |
| `index.html` | landing | 83,855 B raw, ~2.1 KB text |
| `guide/introduction.html` | guide page | 114,761 B raw, ~11.5 KB text |
| `api/reactivity-core.html` | API reference page | 152,109 B raw, ~16 KB text |
| `404.html` | **unrendered shell** (`<div id="app"></div>`, 0 text bytes) | 21,093 B — exclusion doubly justified |
| `guide/introduction.md` | emitted `.md` source copy (via `vitepress-plugin-llms`) | proves non-HTML passthrough an HTML glob ignores |
| `translations/index.html` | section root (`index.md` source) | flat `.html`-in-dirs shape example |
