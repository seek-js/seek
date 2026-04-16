# Hybrid Extraction Architecture

**Status:** Accepted  
**Audience:** Extractor + compiler implementers  
**Read time:** 8 min

## TL;DR

Seek extractor uses multi-mode acquisition with one normalized output contract (`Seek Manifest`).  
Mode chosen by probe evidence, not user guess.  
Local-first paths preferred before remote crawl.

## Scope

This doc defines:

- extractor system boundary
- supported extraction modes
- mode selection principles
- accepted architecture decisions
- non-goals

Detailed schema lives in `[02-seek-manifest-schema.md](02-seek-manifest-schema.md)`.  
Extractor/compiler ownership lives in `[03-extractor-compiler-contract.md](03-extractor-compiler-contract.md)`.  
Execution policy lives in `[04-probe-and-pivot-strategy.md](04-probe-and-pivot-strategy.md)`.

## System Boundary

Extractor is responsible for:

- route/content discovery input handling
- content acquisition
- content cleaning and sectioning
- canonical URL + locale/version metadata capture
- manifest emission

Extractor is not responsible for:

- embedding generation
- final vector index serialization
- browser hydration/search runtime

## Supported Modes

1. Source adapter mode (MDX/Markdown/docs-system aware).
2. Static artifact parsing mode (`dist`/`build`/`out` HTML).
3. Local render fetch mode (fetch from local production server output).
4. Local headless render mode (shell-heavy fallback).
5. Remote crawl mode (controlled fallback only).

## Architecture Decisions

### AD-1: Contract-first output

All modes must emit same `Seek Manifest` shape.  
Reason: keeps compiler stable while extraction strategy evolves.

### AD-2: Local-first acquisition

Prefer local source/artifact/render before network crawl.  
Reason: lower variance, lower cost, better reproducibility.

### AD-3: Probe and pivot selection

Mode picked from observed project signals and runtime results.  
Reason: cross-framework support without forcing config burden.

### AD-4: Build-adjacent integration

Extractor integrates with build/CI but avoids tight coupling to one framework compiler.

## Non-goals

- universal AST support for every framework in v1
- remote crawl as default extraction path
- embedding/model policy definitions
- AI prompting/citation rendering policies

## Quality Targets

- URL fidelity: canonical URL preserved per section.
- Content fidelity: nav/chrome noise minimized by default selectors/rules.
- Determinism: repeated same input yields stable manifest ordering.
- Failure transparency: emitted diagnostics include mode and failure stage.

## Change Policy

If architectural behavior changes:

1. update this file decision section,
2. update probe checklist and schema if impacted,
3. bump contract version when backward incompatible.