# Corpus: hugo

Source: `gohugoio/hugoDocs` @ `2a6da09` (gohugo.io docs). Built 2026-09-03:
hugo v0.165.0+extended, `npm i`, `hugo --gc --minify` per `netlify.toml` (~33 s) →
`public/` (791 nested HTML files; built-in `sitemap.xml` with 790 URLs, 404 excluded).

Relative paths mirror `public/`.

| File | Role | Notes |
| --- | --- | --- |
| `index.html` | home | 91,306 B raw |
| `content-management/urls/index.html` | rich content page | 133,223 B raw, ~14.5 KB body text |
| `functions/math/add/index.html` | genuinely short stub (signature + example) | 63,762 B raw, ~369 B main text |
| `404.html` | full themed 404, absent from sitemap | 55,822 B |
| `categories/index.html` | thin taxonomy section page | representative of the 12 sub-200 B pages |

`<html lang>` on all sampled pages (`lang=en-US` from theme `site.Language.Locale`).
Site sets `disableAliases = true`, so no alias redirect pages are observable here.
