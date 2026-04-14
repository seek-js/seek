# Probe and Pivot Strategy

**Status:** Accepted  
**Audience:** Extractor implementers  
**Read time:** 7 min

## TL;DR

Extractor runs ordered probes, selects highest-confidence local mode first, then pivots on failure by deterministic fallback chain.

## Probe Order

1. Source adapter probe.
2. Static artifact probe.
3. Local render fetch probe.
4. Local headless probe.
5. Remote crawl probe (explicit fallback only).

## Selection Rules

- Choose first probe that passes confidence threshold.
- Prefer local modes over remote modes.
- If multiple pass same rank, choose lower operational cost mode.
- Emit selected mode and probe evidence in diagnostics.

## Probe Checklist

### Source Adapter Probe

- Detect known docs frameworks/source structure.
- Validate route and content resolvability.
- Pass if adapter can emit manifest-ready records.

### Static Artifact Probe

- Detect built HTML output path and files.
- Validate user-visible content density on sampled pages.
- Pass if extraction yields stable URL-content pairs.

### Local Render Fetch Probe

- Start/attach local production server.
- Fetch target routes.
- Pass if HTML contains meaningful body content and canonical URL fidelity.

### Local Headless Probe

- Render route in controlled headless browser.
- Wait for hydration and stable DOM.
- Pass if shell-only pages become content-bearing.

### Remote Crawl Probe

- Allowed only when local probes fail or unavailable.
- Respect domain scope and rate limits.
- Pass if crawl quality + URL fidelity meet minimum thresholds.

## Pivot Rules

- On hard failure (tooling crash, unreachable mode), pivot to next mode.
- On soft failure (low content density, poor URL fidelity), pivot and flag warning.
- After pivot, preserve prior probe diagnostics for final report.
- Stop after first successful mode unless explicit multi-mode merge enabled.

## Stop Conditions

Stop with failure when:

- all enabled probes fail,
- required URL fidelity invariant fails repeatedly,
- extraction quality falls below configured threshold.

## Output Requirements

Final extraction report must include:

- selected mode
- probe attempts (ordered)
- pass/fail reason per probe
- pivot chain
- final quality metrics summary

## Determinism Rules

- Given same input + config, probe order and selected mode must be deterministic.
- Do not use non-deterministic timing signals as tie-breakers.
- Persist probe evidence keys in stable order.