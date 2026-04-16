# Seek Manifest Schema

**Status:** Accepted  
**Audience:** Extractor + compiler implementers  
**Read time:** 10 min

## TL;DR

`Seek Manifest` is normalized section-level contract from extractor to compiler.  
All extraction modes must emit this shape.

## Version

- `schemaVersion`: semantic string, current `1.0.0`.
- Breaking field/semantic changes require major version bump.

## Top-level Shape

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-04-14T00:00:00.000Z",
  "source": {
    "projectType": "static-site",
    "mode": "static-artifact",
    "inputPath": "./dist",
    "urlBase": "https://example.com"
  },
  "documents": []
}
```

## Source Object

Required fields:

- `projectType`: string (`static-site`, `ssr-site`, `docs-system`, `spa-shell`, `unknown`).
- `mode`: string (`source-adapter`, `static-artifact`, `local-render-fetch`, `local-headless`, `remote-crawl`).
- `inputPath`: string.
- `urlBase`: absolute URL string.

Optional:

- `adapter`: string.
- `locale`: default locale string.
- `version`: docs/version identifier.

## Document Record

```json
{
  "id": "sha256(url#sectionPath#textHash)",
  "url": "https://example.com/docs/intro",
  "canonicalUrl": "https://example.com/docs/intro",
  "title": "Introduction",
  "sectionPath": ["Docs", "Getting Started", "Introduction"],
  "text": "User-visible cleaned content",
  "lang": "en",
  "version": "latest",
  "sourceFile": "dist/docs/intro/index.html",
  "contentHash": "sha256(text)",
  "metadata": {}
}
```

Required fields:

- `id`
- `url`
- `canonicalUrl`
- `title`
- `text`
- `contentHash`

Optional fields:

- `sectionPath`
- `lang`
- `version`
- `sourceFile`
- `metadata`

## Invariants

1. `url` must be absolute.
2. `canonicalUrl` must be absolute and stable for citation.
3. `text` must contain user-visible content only; layout chrome removed where possible.
4. `id` deterministic for same normalized input.
5. Empty `text` records must be dropped.
6. `documents` order deterministic and stable.

## Validation Rules

- reject manifest if required top-level fields missing.
- reject document if required fields missing or invalid URL.
- warn (not fail) when `lang` missing.
- warn when duplicate `id`; keep first deterministic winner and report collision.

## Compatibility

- Compiler must reject unsupported major `schemaVersion`.
- Minor version may add optional fields; compiler must ignore unknown optional keys.
- Patch versions are non-semantic clarifications only.

## Ownership

- Extractor owns manifest generation + record normalization.
- Compiler owns chunk packing, embedding, and index serialization.

