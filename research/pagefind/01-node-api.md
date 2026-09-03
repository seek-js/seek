# Pagefind Node API vs the CLI Contract

**Status:** Research (verified against primary sources, 2026-08)  
**Date:** 2026-08  
**Audience:** `@seekjs/cli` implementers; anyone editing `[../../specs/02-cli-contract.md](../../specs/02-cli-contract.md)`  
**Read time:** 10 min

## TL;DR

`specs/02-cli-contract.md` was written against Pagefind's documented surface and mostly
survives it — but four assumptions break on contact with the real Node API:

1. There is **no exclude-glob** anywhere in Pagefind. The specced `--exclude <glob>` flag
   has no Pagefind backing; Seek must implement file exclusion itself.
2. There is **no sitemap support** of any kind. `--sitemap <path>` is a Seek-owned feature,
   not a pass-through.
3. The Node API **never reports which languages were detected**, but `pagefind-entry.json`
   does. Getting the required `languages` field means either parsing the bundle (which the
   spec forbids) or scanning `<html lang>` itself.
4. Warnings about skipped pages ("empty content", "missing `<html lang>`") have **no API
   surface at all** — only aggregate counts and error strings come back.

Everything else (`rootSelector`, `forceLanguage`, `verbose`, page counts, per-page metadata,
sub-result anchors) holds.

Sources used: the official Node API docs ([node-api](https://pagefind.app/docs/node-api/)),
the actual TypeScript types shipped in the npm package
([index.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/index.d.ts),
[internal.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/internal.d.ts)),
the Rust output code that writes `pagefind-entry.json`
([output/mod.rs](https://github.com/Pagefind/pagefind/blob/main/pagefind/src/output/mod.rs)),
and the browser search runtime that builds excerpts
([coupled_search.ts](https://github.com/Pagefind/pagefind/blob/main/pagefind_web_js/lib/coupled_search.ts)).
Verified against Pagefind 1.5.x (npm shows 1.5.2, April 2026).

## 1. What `createIndex` actually accepts

The complete option list from the shipped TypeScript types:

```ts
export interface PagefindServiceConfig {
    rootSelector?: string,        // default "html"
    excludeSelectors?: string[],  // CSS selectors to ignore when indexing
    forceLanguage?: string,       // ISO 639-1; single index, ignores detection
    verbose?: boolean,            // service mode: only impacts the logfile
    logfile?: string,
    keepIndexUrl?: boolean,       // default false: strips index.html from URLs
    writePlayground?: boolean,    // default false
    includeCharacters?: string,   // e.g. "<>$"
}
```

Source: [index.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/index.d.ts)
(`PagefindServiceConfig`), mirrored by the docs at
[pagefind.app/docs/node-api](https://pagefind.app/docs/node-api/).

That is the whole surface. Notably absent compared to the
[CLI config options](https://pagefind.app/docs/config-options/): `site` (replaced by
`addDirectory({ path })`), `output_path` (replaced by `writeFiles({ outputPath })`),
`glob` (moved onto `addDirectory` as an *include* glob), and `quiet`/`silent`/`serve`.

### Spec says / reality says: flag mapping

| Spec flag ([02-cli-contract.md](../../specs/02-cli-contract.md)) | Pagefind Node API reality | Verdict |
| --- | --- | --- |
| `<dir>` | `index.addDirectory({ path, glob? })`; relative paths resolve against the process cwd | Holds ([node-api](https://pagefind.app/docs/node-api/)) |
| `--site-url <url>` | No equivalent anywhere in Pagefind. Result URLs are root-relative; absolute origins are a consumer concern (`baseUrl` exists only browser-side via `pagefind.options()`) | Holds — but confirm it stays Seek-owned ([api](https://pagefind.app/docs/api/), [search-config](https://pagefind.app/docs/search-config/)) |
| `--sitemap <path>` | **No sitemap feature exists in Pagefind at all** — not in the CLI options, not in the Node API. Restricting to sitemap URLs means Seek parses the sitemap and drives `addHTMLFile({ url, content })` itself | **Breaks as a pass-through; must be Seek-implemented** ([config-options](https://pagefind.app/docs/config-options/), [node-api](https://pagefind.app/docs/node-api/)) |
| `--out <subdir>` | `writeFiles({ outputPath })` writes only the Pagefind bundle directory; Seek must place its own `seek/` tree | Holds with clarification ([node-api](https://pagefind.app/docs/node-api/)) |
| `--exclude <glob>` (repeatable, e.g. `404.html`) | **No exclude-glob exists.** `addDirectory.glob` is an *include* glob; `excludeSelectors` takes CSS selectors, not file globs. File-level exclusion must be done by Seek (own glob filtering + `addHTMLFile` walk, or pre-filtering the directory) | **Breaks; must be Seek-implemented** ([index.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/index.d.ts), [config-options](https://pagefind.app/docs/config-options/)) |
| `--root-selector <sel>` | `createIndex({ rootSelector })` — direct pass-through | Holds |
| `--force-language <lang>` | `createIndex({ forceLanguage })` — direct pass-through; opts out of multilingual indexing entirely | Holds ([multilingual](https://pagefind.app/docs/multilingual/)) |
| `--verbose` | `createIndex({ verbose })` exists — but per the type doc: *"When running as a service, only impacts the logfile (if present)"*. Diagnostics land in a logfile, not on stderr | Holds with caveat: pair `verbose` with `logfile` and relay that ([index.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/index.d.ts)) |
| `--dry-run` | No dry-run concept. Emulable: run the full pipeline and call `getFiles()` without ever calling `writeFiles()` | Holds if Seek implements it ([node-api](https://pagefind.app/docs/node-api/)) |

One extra decision the spec doesn't cover: `keepIndexUrl` defaults to stripping
`index.html` from result URLs. Citation URLs will be `/animals/cat/`, not
`/animals/cat/index.html`. That default suits Seek's citation model, but it should be an
explicit, documented choice rather than silent inheritance
([config-options](https://pagefind.app/docs/config-options/#keep-index-url)).

## 2. What `addDirectory` returns

```ts
export interface IndexingResponse {
    errors: string[],
    page_count: number
}
```

Source: [index.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/index.d.ts)
(`IndexingResponse`). The docs state: "A response with an `errors` array containing error
messages indicates that Pagefind failed to process this directory. If successful,
`page_count` will be the number of pages that were added to the index"
([node-api](https://pagefind.app/docs/node-api/)).

What this satisfies and what it doesn't:

| Spec need | Reality |
| --- | --- |
| `pageCount` field in seek.json | Satisfied directly by `page_count` — pages successfully indexed. Invariant 6 (`pageCount === 0` is an error) maps cleanly to `page_count === 0` or non-empty `errors` |
| Exit code 3: "Pagefind failed; its stderr is relayed verbatim" | Partially breaks. The Node API exposes no stderr stream. Failures arrive as `errors: string[]` per call, or as exceptions from the service layer (see `InternalResponseCallback.exception` in [internal.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/internal.d.ts)). Seek should relay the joined error strings, not promise verbatim stderr |
| Warning: "pages skipped for empty content" | **No API surface.** Skipped pages simply don't appear in `page_count`. Nothing distinguishes "skipped for empty content" from "not present". Seek can only detect this gap by counting HTML files itself before indexing |
| Warning: "missing `<html lang>`" | **No API surface whatsoever.** Pages with no lang attribute are silently merged into an `unknown` language index (the browser side documents the `unknown` prefix; nothing surfaces back through the indexing API). See [api](https://pagefind.app/docs/api/) note on the `en_6fceec9` id prefix |
| Per-page errors | Only available if Seek walks files itself via `addHTMLFile`, whose response includes per-file `errors` plus a `NewFile { uniqueWords, url, meta }` object ([node-api](https://pagefind.app/docs/node-api/)). `addDirectory` aggregates everything into one response |

Consequence for the spec: the warnings paragraph promises diagnostics Pagefind cannot
deliver through `addDirectory`. Either Seek implements its own HTML pre-scan (count files,
read `lang` attributes) or the warning set shrinks.

## 3. Metadata: build time vs search time

Two different metadata surfaces, and the spec needs both halves.

### Build time (for `seek/seek.json` context)

- Via `addHTMLFile` / `addCustomRecord`: each successful add returns
  `NewFile { uniqueWords, url, meta }` — the page's resolved metadata map
  ([index.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/index.d.ts),
  `NewFile`; internal wire shape `IndexedFileResponse { page_word_count, page_url, page_meta }`
  in [internal.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/internal.d.ts)).
- Via `addDirectory`: **nothing per page**. Just the count.
- Site-level framing (`systemContext.siteName`, `description`): Pagefind contributes
  nothing. Automatic metadata is strictly per-page (`title` = first `h1`, `image`,
  `image_alt`) and lives in search results, not in any build-time report
  ([metadata](https://pagefind.app/docs/metadata/)). If open question 2 in the spec
  (derive `systemContext` from `<meta>` tags) is pursued, it is 100% Seek-side HTML
  parsing.

### Search time (for grounding and anchors)

Each loaded result returns
([api](https://pagefind.app/docs/api/)):

```js
{
  "url": "/url-of-the-page/",
  "excerpt": "...",           // with <mark> highlights
  "plain_excerpt": "...",     // entity-encoded plain text
  "meta": { "title": "...", "image": "...", /* any data-pagefind-meta keys */ },
  "sub_results": [
    { "title": "Inner text of some heading",
      "url": "/url-of-the-page/#id-of-the-h2",
      "excerpt": "... scoped between this anchor and the next one ..." }
  ]
}
```

This is good news for the grounding contract: sub-results carry anchor-scoped excerpts and
anchor URLs natively, which is exactly what `[05-grounding-and-failure-modes.md]`
citation granularity wants. `plain_excerpt` (entity-encoded, safe as innerHTML) is the
right feed for the LLM context; `excerpt` contains `<mark>` elements that would pollute
prompts.

Note also that metadata remains searchable and title matches get a 5x ranking boost by
default ([metadata](https://pagefind.app/docs/metadata/)) — relevant to answer quality but
not to the artifact contract.

## 4. How excerpts are produced, and the hidden-text leak

Mechanism, verified in source: excerpts are **not** stored in the index. They are computed
client-side at query time from the word-position data in the loaded fragment:

```
const excerpt_start = calculate_excerpt_region(...);
const excerpts = build_excerpt(...);
fragment.excerpt = excerpts.excerpt;
fragment.plain_excerpt = excerpts.plain_excerpt;
fragment.sub_results = calculate_sub_results(fragment, this.excerptLength);
```

Source: [coupled_search.ts](https://github.com/Pagefind/pagefind/blob/main/pagefind_web_js/lib/coupled_search.ts).
Default length is 30 words, configurable browser-side via
`pagefind.options({ excerptLength })` ([search-config](https://pagefind.app/docs/search-config/))
— so excerpt length is a **runtime** setting, not something `seek build` controls.

Because excerpts are reconstructed purely from indexed fragment content, text excluded by
`data-pagefind-ignore` or built-in skip rules (`<nav>`, `<footer>`, `<script>`, `<form>`)
cannot appear in an excerpt — it was never stored
([indexing](https://pagefind.app/docs/indexing/)).

The sharp edge survives, narrowed: Pagefind parses HTML statically and never evaluates
CSS. Text hidden with `display: none`, `visibility: hidden`, zero-size containers, or
collapsed accordions is fully indexed and therefore **can leak into excerpts, sub-results,
and the answer endpoint's search tool**. Evidence is source-derived and
documented-by-absence: the indexing rules enumerate exactly what gets skipped
(elements, attributes, selectors) and CSS visibility appears nowhere in them
([indexing](https://pagefind.app/docs/indexing/)); the excerpt builder reads only stored
word positions ([coupled_search.ts](https://github.com/Pagefind/pagefind/blob/main/pagefind_web_js/lib/coupled_search.ts)).
No official Pagefind issue was found stating this outright, so treat it as high-confidence
inference, not vendor-documented behavior. Mitigation belongs in Seek docs ("don't ship
hidden text in build output"), not in flags.

Related, already recorded in
[00-scope-change-2026-07.md](../00-scope-change-2026-07.md): deferred build-time query
expansion would inject *text that is indexed but not on the page*, which leaks the same
way — same mechanism, opposite direction.

## 5. Language detection surfacing

Spec requires `languages: ["en", "ja"]` in seek.json ("detected `<html lang>` values,
sorted"). Reality:

- The Node API **never reports detected languages**. Neither `NewIndexResponse`,
  `IndexingResponse`, `WriteFilesResponse`, nor `GetFilesResponse` carries language
  information ([index.d.ts](https://github.com/Pagefind/pagefind/blob/main/wrappers/node/types/index.d.ts)).
- Detection happens inside the binary: `<html lang>` per page, independent index per
  language, dialects kept separate, missing lang falls back to a merged primary language /
  `unknown` ([multilingual](https://pagefind.app/docs/multilingual/),
  [api](https://pagefind.app/docs/api/)).
- But the written bundle **does contain it**: `pagefind-entry.json` is serialized as
  `{ version, languages: { <lang>: { hash, wasm, page_count } }, include_characters }`
  ([output/mod.rs](https://github.com/Pagefind/pagefind/blob/main/pagefind/src/output/mod.rs),
  `entry_meta` construction around lines 138–152). Per-language `page_count` is in there too.

This collides with the spec's own invariant: "Written by Pagefind. Seek does not define,
version, or parse its contents" ([02-cli-contract.md](../../specs/02-cli-contract.md)).
To emit `languages`, Seek must either:

| Option | Cost |
| --- | --- |
| Parse `pagefind/pagefind-entry.json` after `writeFiles()` | Violates the stated invariant; couples Seek to one bundle file (though it is stable, uncompressed JSON — `Compress::None` in mod.rs) |
| Scan `<html lang>` itself while walking input | Duplicates Pagefind's detection logic (dialect handling, fallback merging); risks disagreeing with the actual indexes |
| Drop `languages` from the required schema | Loses a useful consumer signal; changes the contract |

Parsing `pagefind-entry.json` is the pragmatic choice, but the spec must amend its
invariant to name that single file as the one exception.

## Verdict

### Assumptions that hold

- `createIndex` / `addDirectory` / `writeFiles` drive the whole pipeline; `pagefind` as the
  sole dependency of `@seekjs/cli` stands (AD-9).
- `--root-selector` and `--force-language` are clean pass-throughs.
- `pageCount` is directly satisfiable from `addDirectory`'s `page_count`.
- Sub-result anchors (title, `#anchor` URL, anchor-scoped excerpt) exist exactly where the
  grounding design needs them, with `plain_excerpt` as the right LLM-safe form.
- Excerpts cannot contain `data-pagefind-ignore`'d text; the leak risk narrows to
  CSS-hidden-but-indexed text.
- Idempotence and "write two trees" layout are unaffected; `deleteIndex()` /
  `pagefind.close()` give clean lifecycle hooks.

### Assumptions that break

- `--exclude <glob>`: no exclude-glob exists anywhere in Pagefind; Seek must own file
  filtering.
- `--sitemap`: no sitemap support at all; Seek owns parsing and per-file ingestion.
- The warnings taxonomy ("empty content", "missing `<html lang>`"): zero API surface;
  requires a Seek-side pre-scan or deletion from the spec.
- Exit code 3's "stderr relayed verbatim": there is no stderr through the Node API; errors
  are strings in arrays plus service exceptions.
- `languages` output: unobtainable from the API responses; obtainable only by parsing
  `pagefind-entry.json`, which the spec currently forbids.

### What `seek build` should expose as a result

1. Keep `--root-selector` and `--force-language` as direct `createIndex` pass-throughs.
2. Re-scope `--exclude` as Seek-owned file filtering: either translate globs into an
   include-glob strategy over `addDirectory`, or walk matched files and use `addHTMLFile`
   (which also buys per-page errors and per-page meta).
3. Mark `--sitemap` as a Seek feature requiring its own walker path; do not describe it as
   a Pagefind restriction.
4. Pair `verbose` with a `logfile` and relay logfile/error strings; rewrite exit code 3's
   wording from "stderr" to "error messages returned by the Pagefind API".
5. Amend the "Seek never parses pagefind/" invariant to permit reading exactly
   `pagefind-entry.json` as the source for `languages` (and optionally per-language page
   counts).
6. Add a Seek-side pre-scan (file count, presence of `lang` attribute) if the skipped-page
   and missing-lang warnings are kept; otherwise trim the warning list.
7. Document `keepIndexUrl=false` URL-stripping as deliberate Seek behavior for citations.
8. Record the CSS-hidden-text excerpt leak as a known sharp edge in user-facing docs; no
   flag can fix it.
