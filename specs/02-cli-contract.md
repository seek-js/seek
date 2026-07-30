# CLI Contract

**Status:** Proposed  
**Audience:** CLI implementers, CI integrators  
**Read time:** 8 min

## TL;DR

`seek build <dir>` runs Pagefind over a directory of built HTML and writes two things into it:
Pagefind's own index bundle, and Seek's context files.  
No LLM, no network, no embeddings. Seconds, not minutes.

## Scope

This doc defines:

- the `seek build` command surface and flags
- the exact artifacts emitted into the output directory
- exit codes and diagnostics
- determinism and idempotence requirements

Architecture rationale lives in `[01-architecture.md](01-architecture.md)`.  
The endpoint that consumes the context files is `[03-answer-endpoint.md](03-answer-endpoint.md)`.

## Command

```bash
seek build ./dist
```

The only required argument is a path to a directory of built HTML. Run it after your existing
build, in the same CI step chain:

```jsonc
{
  "scripts": {
    "build": "astro build && seek build ./dist"
  }
}
```

## Flags

| Flag | Default | Meaning |
| --- | --- | --- |
| `<dir>` | required | directory of built HTML to index |
| `--site-url <url>` | none | absolute origin used to build citation URLs |
| `--sitemap <path>` | auto-detect `sitemap.xml` in `<dir>` | restrict indexing to sitemap URLs |
| `--out <subdir>` | `<dir>` | write artifacts under a different root |
| `--exclude <glob>` | none, repeatable | skip matching files (for example `404.html`) |
| `--root-selector <sel>` | Pagefind default | element that contains indexable content |
| `--force-language <lang>` | none | override `<html lang>` detection |
| `--verbose` | off | per-file diagnostics |
| `--dry-run` | off | report what would be indexed; write nothing |

Language handling is otherwise automatic: Pagefind reads `<html lang>` per page and builds
per-language indexes with correct stemming. Do not add language configuration surface.

## Emitted Artifacts

Two trees, side by side in the output directory.

### `pagefind/` — the index bundle

Written by Pagefind. Seek does not define, version, or parse its contents.

```
dist/
  pagefind/
    pagefind.js
    pagefind-*.wasm
    pagefind-entry.json
    fragment/*.pf_fragment
    index/*.pf_index
```

The component loads `pagefind/pagefind.js` at runtime. The answer endpoint's `search` tool
queries the same bundle.

### `seek/` — the context files

Written by Seek. This is the only artifact contract Seek owns.

```
dist/
  seek/
    seek.json
```

```json
{
  "seekVersion": "1.0.0",
  "generatedAt": "2026-07-30T00:00:00.000Z",
  "siteUrl": "https://example.com",
  "pagefindPath": "/pagefind/",
  "pageCount": 412,
  "languages": ["en", "ja"],
  "answerEndpoint": null,
  "systemContext": {
    "siteName": "Example Docs",
    "description": "Documentation for Example.",
    "instructions": null
  }
}
```

Field rules:

| Field | Required | Notes |
| --- | --- | --- |
| `seekVersion` | yes | semver; major bump on breaking change |
| `generatedAt` | yes | ISO 8601 UTC |
| `siteUrl` | no | absolute origin; `null` when `--site-url` omitted |
| `pagefindPath` | yes | root-relative path to the index bundle |
| `pageCount` | yes | pages successfully indexed |
| `languages` | yes | detected `<html lang>` values, sorted |
| `answerEndpoint` | no | absolute or root-relative URL; `null` disables "Ask AI" |
| `systemContext` | yes | short site framing passed to the model as system text |

`systemContext.instructions` is optional free text (site-specific answering guidance). It is
capped at 2,000 characters; longer values are truncated with a warning. It is never
user-supplied at query time.

## Invariants

1. `seek build` performs no network requests and calls no LLM.
2. Running it twice on identical input produces byte-identical `seek/seek.json` except
   `generatedAt`.
3. It never mutates or deletes input HTML.
4. It is idempotent: re-running over a directory that already contains `pagefind/` and `seek/`
   replaces those trees cleanly and does not index them.
5. Artifacts are plain static files. Deploying them requires no server behavior.
6. `pageCount === 0` is an error, not a silent success.

## Exit Codes

| Code | Condition |
| --- | --- |
| `0` | index written, `pageCount > 0` |
| `1` | input directory missing, unreadable, or contains no HTML |
| `2` | invalid flag combination or unparseable sitemap |
| `3` | Pagefind failed; its stderr is relayed verbatim |

Warnings (non-fatal): pages skipped for empty content, missing `<html lang>`, `systemContext`
truncation, `--site-url` omitted while a sitemap declares absolute URLs.

## Performance Expectation

Wall-clock target is "unremarkable next to your build". Pagefind indexes a few thousand pages
in seconds on CI hardware. No p99 budget is specified until there is an implementation to
measure; see the execution-reality note in
`[../research/00-scope-change-2026-07.md](../research/00-scope-change-2026-07.md)`.

## Open Questions

1. Should `seek build` write the answer endpoint URL, or should the component take it as an
   attribute only? (Current lean: both, attribute wins.)
2. Should `systemContext` be derivable from the site's `<meta>` tags automatically?
3. Is a `seek check` subcommand worth it for verifying deployed artifacts?
