# Seek.js Extractor Specs

Extractor specs define contract for turning user-visible site content into normalized records for compiler.

## Read Order

1. `[01-hybrid-extraction-architecture.md](01-hybrid-extraction-architecture.md)`
2. `[02-seek-manifest-schema.md](02-seek-manifest-schema.md)`
3. `[03-extractor-compiler-contract.md](03-extractor-compiler-contract.md)`
4. `[04-probe-and-pivot-strategy.md](04-probe-and-pivot-strategy.md)`
5. `[05-source-adapter-contract.md](05-source-adapter-contract.md)`
6. `[06-route-discovery.md](06-route-discovery.md)`
7. `[07-chunking-strategy.md](07-chunking-strategy.md)`
8. `[08-performance-budgets.md](08-performance-budgets.md)`

## Scope

Extractor owns:

- content acquisition mode selection
- content cleanup and section normalization
- canonical URL fidelity
- manifest emission

Extractor does not own:

- embeddings
- index serialization
- client runtime behavior

## Rule

If behavior impacts contract, update spec first.  
If behavior only explores alternatives, document in `research/extractor/`.
