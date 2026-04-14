# Seek and Website Sync Strategy

**Status:** Accepted (policy memo)  
**Audience:** Maintainers and docs operators  
**Read time:** 5 min

## TL;DR

Keep engineering truth in `seek`.  
Keep public presentation in `seekjs-website`.  
Sync selected docs via CI, not git submodules.

## Repository Roles

- `seek`: source code, internal specs, research, draft docs.
- `seekjs-website`: public docs UX, navigation, polished content presentation.

## Sync Policy

Sync from `seek` to website repo only for content that is:

- user-facing,
- stable enough for public consumption,
- reviewed against root `README.md` internal doc rules.

Do not sync:

- internal `specs/` contracts by default,
- exploratory `research/` notes by default,
- temporary ADR drafts.

## Why CI Sync

- avoids submodule complexity for contributors,
- keeps source-of-truth ownership clear,
- allows selective publish rules and transforms,
- preserves independent release cadence for docs site.

## Publish Flow

1. Author docs in `seek/docs`.
2. Review with internal rules in root `README.md`.
3. CI sync job copies approved files to website repo.
4. Website repo handles navigation/theme/content UX.

## Guardrails

- every synced page maps back to canonical source path,
- no duplicated concept definitions across repos,
- public docs keep naming aligned with root glossary terms.
