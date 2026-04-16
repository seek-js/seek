# Extractor Research Map

This folder stores deep reasoning for extraction architecture.

## Canonical Map


| File                                                                         | Main question                         | Feeds spec                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `[01-extraction-strategy-landscape.md](01-extraction-strategy-landscape.md)` | Which acquisition modes and when?     | `[../../specs/extractor/01-hybrid-extraction-architecture.md](../../specs/extractor/01-hybrid-extraction-architecture.md)`                                                                                                                 |
| `[02-ssr-and-local-render-fetch.md](02-ssr-and-local-render-fetch.md)`       | Why SSR needs local render fetch?     | `[../../specs/extractor/01-hybrid-extraction-architecture.md](../../specs/extractor/01-hybrid-extraction-architecture.md)`, `[../../specs/extractor/04-probe-and-pivot-strategy.md](../../specs/extractor/04-probe-and-pivot-strategy.md)` |
| `[03-parser-runtime-evaluation.md](03-parser-runtime-evaluation.md)`         | Which parser/runtime baseline for v1? | parser/engine decisions in extractor specs                                                                                                                                                                                                 |


## Read Order

1. `01` for full mode strategy.
2. `02` for SSR-specific blind spots and local render fetch evidence.
3. `03` for parser/runtime tradeoffs.
4. jump to mapped specs for contract.

## Scope Rule

Keep this folder for:

- alternatives
- evidence
- tradeoffs
- risks

Do not store final contracts here.