# Corpus: nextjs

Source: `Shopify/polaris-react-archive` @ `af6ffb6` (Polaris docs + marketing site,
Next 15.2.8 pages router, `output: "export"`, `trailingSlash: false`).
Built 2026-09-03: `pnpm install` at root, then
`pnpm turbo run build --filter=polaris.shopify.com...` → `polaris.shopify.com/out/`
(907 HTML files). First choice `reactjs/react.dev` is NOT statically exported
(no `output` field; uses `rewrites()`), so it is out of scope.

Relative paths mirror `out/`.

| File | Role | Notes |
| --- | --- | --- |
| `index.html` | thin marketing landing | 10,087 B raw, ~788 text bytes |
| `components.html` | rich hub page | 310,058 B raw, ~14 KB text |
| `components/actions/button.html` | rich component doc | 192,769 B raw, ~12 KB text |
| `examples/toast-default.html` | client-demo shell | 5,824 B raw, ~74 text bytes |
| `content/voice-and-tone.html` | meta-refresh redirect stub | 597 B, ~80 text bytes |
| `404.html` | always-emitted 404 | 9,274 B raw, ~541 text bytes |

Site-wide `<html lang="en">` (author-hardcoded in `pages/_document.tsx`).
