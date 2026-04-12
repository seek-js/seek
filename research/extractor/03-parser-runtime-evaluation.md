# Parser Runtime Evaluation
## Research Notes for the Seek.js Extraction Layer

**Status:** Draft  
**Type:** Research  
**Area:** `extractor`  
**Related Specs:** `../../specs/extractor/01-hybrid-extraction-architecture.md`

---

## Executive Summary

Seek.js needs an extraction parser/runtime strategy that works across:

- Node.js
- Bun
- Deno
- CI/build environments
- local developer machines
- managed build systems

At the same time, the parser must remain:

- build-time only
- framework-agnostic
- fast enough for large documentation sites
- portable across operating systems
- easy to install
- easy to evolve later if the engine changes

After comparing the current options, the leading conclusion is:

> Seek.js should use a portable WASM-backed HTML parser for `v1`, with `html-rewriter-wasm` as the most practical immediate choice, while keeping the architecture open to a lower-level `lol-html` integration later if performance or infrastructure needs justify it.

This is not because `html-rewriter-wasm` is the theoretically best parser in all dimensions.

It is because it is the best **distribution strategy** for Seek.js right now.

---

## 1. Why This Decision Matters

The extraction layer is the first technical system users will encounter in the indexing pipeline.

If parser/runtime setup is difficult, users will feel friction before Seek.js has delivered any value.

This makes the parser/runtime choice unusually important because it influences:

- adoption
- CI reliability
- cross-runtime compatibility
- implementation complexity
- future maintenance cost
- packaging boundaries
- contributor velocity

This is not just a parsing question.

It is also a:
- portability question
- packaging question
- product ergonomics question
- architecture sequencing question

---

## 2. Evaluation Criteria

The parser/runtime strategy should be evaluated against the following criteria.

### 2.1 Runtime Portability
Can the same extraction implementation work across:
- Node.js
- Bun
- Deno
- standard CI environments

### 2.2 Installation Friction
Can users adopt Seek.js without:
- native compilation
- system package setup
- platform-specific install debugging
- runtime-specific binary distribution issues

### 2.3 Build-Time Isolation
Can the parser live entirely in a build-time package and stay out of:
- browser bundles
- hydration runtime
- client search payloads

### 2.4 Parsing Model Quality
Can the parser support:
- streaming HTML traversal
- selector-based content targeting
- semantic extraction
- exclusion of layout noise
- heading and anchor collection

### 2.5 Operational Reliability
Can the parser behave predictably in:
- local development
- CI
- hosted build environments
- monorepos
- mixed package-manager setups

### 2.6 Long-Term Flexibility
Can Seek.js switch parser engines later without rewriting the whole extraction system?

---

## 3. Candidate Options Considered

The following categories were considered.

### A. `html-rewriter-wasm`
A JavaScript/WASM-distributed implementation of the HTMLRewriter model backed by `lol-html`.

### B. Direct `lol-html`
Use the Rust crate directly through native bindings, a custom wrapper, or a dedicated native integration strategy.

### C. Browser/DOM-style parsers only
Use a traditional in-memory DOM parser in JavaScript and rely less on streaming/rewriter semantics.

### D. Headless browser as the primary parser
Use browser automation as the main way to obtain and analyze HTML.

Only options A and B are considered serious primary candidates for the core extraction engine.

Options C and D are still useful in limited roles but are not strong foundations for the main parser/runtime strategy.

---

## 4. Recommendation in Short

### Recommended for `v1`
- `html-rewriter-wasm`
- build-time package isolation
- internal parser engine abstraction
- local-first extraction modes

### Keep in reserve
- direct `lol-html`
- custom maintained WASM wrapper
- Rust-core extractor service for high-scale SaaS workloads

---

## 5. Why `html-rewriter-wasm` Is the Current Best Fit

### 5.1 It Matches Seek.js Runtime Goals

Seek.js wants to support a broad JavaScript runtime surface without forcing users into native-install workflows.

A WASM-distributed parser fits that ambition well.

It is more realistic to support one parser strategy across:
- Node.js
- Bun
- Deno
- CI

than to support multiple native strategies across those environments from day one.

### 5.2 It Reduces Adoption Friction

For `v1`, adoption friction matters more than native peak performance.

A build-time extraction tool should be:
- easy to install
- easy to run
- easy to debug in CI
- easy to reason about across machines

`html-rewriter-wasm` aligns with those goals better than a direct native integration path.

### 5.3 It Preserves a Single Implementation Surface

If Seek.js can keep one extraction implementation strategy across runtimes, it reduces:
- support burden
- environment-specific bugs
- testing complexity
- maintenance surface area

That is strategically valuable early in the project.

### 5.4 It Still Uses the Right Parsing Model

Choosing `html-rewriter-wasm` does not mean choosing a weaker conceptual model.

It still gives Seek.js:
- HTMLRewriter-style traversal
- selector-oriented extraction
- streaming-friendly behavior
- alignment with the `lol-html` family of parsing behavior

So the choice is not between “good model” and “bad model.”

It is between:
- a portable distribution of the model now
- a lower-level native integration later

---

## 6. Why Direct `lol-html` Is Not the Right Default for `v1`

### 6.1 It Optimizes for a Future Seek.js Has Not Yet Earned

A direct `lol-html` integration may be the right choice if Seek.js eventually becomes:

- a high-throughput native extractor platform
- a Rust-core indexing toolchain
- a large-scale crawl/extraction service
- a system where native throughput becomes a proven bottleneck

But `v1` is not there yet.

Right now Seek.js needs:
- portability
- low friction
- broad compatibility
- rapid iteration

### 6.2 It Likely Increases Packaging Complexity

A direct native integration would likely require some combination of:
- runtime-specific bindings
- custom binary builds
- distribution logic
- platform compatibility work
- more complicated installation debugging

That is a poor tradeoff for an early-stage SDK whose main value lies in ease of adoption.

### 6.3 It Expands the Support Matrix Too Early

Seek.js already has enough complexity in:
- extraction modes
- route discovery
- SSR handling
- source adapters
- fallback logic

Adding a complex native distribution story too early would front-load effort in the wrong place.

---

## 7. Why DOM-Only Parsing Is Not Enough

Traditional DOM parsing in JavaScript is useful in some contexts, but it is not the best primary strategy for Seek.js extraction.

### Weaknesses
- often less streaming-oriented
- may encourage full-document in-memory parsing as the default
- less aligned with the HTMLRewriter extraction model
- less natural fit for selective structural traversal at scale

### Where it may still help
- local testing
- fixtures
- debugging utilities
- limited normalization helpers

But it should not be the main parser/runtime choice.

---

## 8. Why Headless Browsers Should Not Be the Primary Parser

Headless browsers are essential as a fallback for:
- shell-only SPAs
- heavy client-rendered routes
- JavaScript-dependent content

But they should not become the main extraction engine.

### Problems with making headless primary
- expensive
- slow
- operationally brittle
- more difficult to debug
- much heavier in CI
- unnecessary for static and SSR-ready HTML

Headless rendering is valuable as an acquisition fallback, not a parser/runtime foundation.

---

## 9. Comparative Evaluation

## 9.1 Summary Table

| Dimension | `html-rewriter-wasm` | direct `lol-html` | DOM-only parser | headless primary |
| :--- | :--- | :--- | :--- | :--- |
| Node portability | Strong | Medium | Strong | Strong |
| Bun portability | Strong | Medium | Strong | Medium |
| Deno portability | Strong | Weak/Medium | Strong | Weak/Medium |
| Install friction | Low | High | Low | High |
| Native toolchain required | No | Usually yes | No | No, but browser runtime required |
| Build-time isolation | Strong | Strong | Strong | Weaker operationally |
| Parsing model fit | Strong | Strong | Medium | Indirect |
| CI friendliness | Strong | Medium | Strong | Weak/Medium |
| Peak throughput | Medium/High | High | Medium | Low |
| Best fit for `v1` | Excellent | Poor/Medium | Medium | Poor |

### 9.2 Takeaway
If the main goal were:
- raw throughput only

then direct `lol-html` would deserve stronger consideration now.

But if the main goal is:
- runtime portability
- low adoption friction
- simple build-time integration
- one implementation surface

then `html-rewriter-wasm` is the stronger fit.

That is why it wins for `v1`.

---

## 10. Bundle Size Considerations

This topic needs careful framing.

### Important Principle

> Bundle size is solved primarily through package boundaries, not solely through parser selection.

If Seek.js keeps the extractor in a build-only package such as:
- `@seekjs/extractor`

and keeps runtime/client logic in:
- `@seekjs/client`

then the parser implementation does not affect the browser bundle used by the final search experience.

### What this means
Even if the extraction parser is relatively heavier than a tiny utility, it is acceptable if:
- it only runs during build/CI
- it never ships to the browser
- it remains isolated from hydration/runtime code

So the bundle-size debate should not be framed as:
- “WASM means client bloat”

It should be framed as:
- “Does this parser stay inside a build-time boundary?”

For Seek.js, the answer should be yes.

---

## 11. Architectural Consequence: Use an Internal Engine Abstraction

The biggest design safeguard is not merely choosing the right parser now.

It is making sure Seek.js is not over-coupled to that choice.

### Recommendation
The extraction system should be built around an internal engine boundary.

For example, the extractor pipeline should conceptually separate:

- HTML input acquisition
- parser engine initialization
- structural traversal
- content root identification
- heading/anchor capture
- text block emission
- normalized record generation

That way the rest of the pipeline does not care whether the engine underneath is:
- `html-rewriter-wasm`
- direct `lol-html`
- a custom WASM wrapper
- a future native service integration

This gives Seek.js flexibility without sacrificing speed of execution now.

---

## 12. Risks of Choosing `html-rewriter-wasm`

This choice is still a tradeoff and should be documented honestly.

### 12.1 Lower Peak Throughput Than Native
A direct native integration may eventually outperform a WASM-distributed parser.

### 12.2 Dependency Maturity / Maintenance Risk
If the wrapper package is less actively maintained than the underlying engine, Seek.js may eventually want to:
- fork it
- wrap it internally
- replace it with a more direct maintained distribution

### 12.3 Temptation to Overgeneralize
Using a convenient portable parser should not encourage Seek.js to assume:
- HTML alone always contains the best content source
- source adapters are unnecessary
- headless fallback is never needed

The parser is part of the system, not the whole system.

---

## 13. Risks of Choosing Direct `lol-html` Too Early

### 13.1 Installation Pain
Users hit packaging problems before seeing product value.

### 13.2 Slower Iteration
Infrastructure work takes priority over extraction quality work.

### 13.3 Runtime Fragmentation
Different runtime/build environments become harder to support consistently.

### 13.4 Premature Optimization
Effort goes into native performance before the project has validated that the simpler portable path is insufficient.

---

## 14. Decision Framing

The most accurate framing is:

> Use `html-rewriter-wasm` as the portability-first distribution strategy now.  
> Keep `lol-html` as the engine-level strategic reserve for future optimization.

This preserves both:
- short-term execution speed as a team
- long-term architectural flexibility

---

## 15. Implications for the Repo and Package Design

This parser/runtime decision implies a few structural rules.

### 15.1 Extractor Package Must Stay Build-Time Only
The parser belongs in:
- `@seekjs/extractor`

It does not belong in:
- browser search runtime
- hydration worker payloads
- client search UI package

### 15.2 Engine Should Not Be the Public Contract
The public API should not expose the parser implementation as a stable architectural boundary.

Consumers should depend on:
- extraction behavior
- normalized outputs
- config surface

—not on the engine package itself.

### 15.3 Parser Swappability Must Be Preserved
The code structure should make it possible to migrate later without rewriting:
- route discovery
- extraction mode selection
- normalization
- manifest emission
- compiler contracts

---

## 16. What Would Change This Recommendation Later

Seek.js should revisit this decision if any of the following become true:

1. `html-rewriter-wasm` becomes a measurable extraction bottleneck in real workloads
2. CI/runtime portability problems emerge that are worse than expected
3. a better maintained or more direct portable wrapper becomes available
4. Seek.js builds a dedicated SaaS-side extraction service where native throughput has strong ROI
5. the project wants a Rust-core extractor as a strategic long-term direction

If none of those are true, the current recommendation should stand.

---

## 17. Recommendation

### Recommended Now
- use `html-rewriter-wasm`
- keep extraction parser isolated to build-time packages
- design the extractor around an engine abstraction
- prioritize adoption and portability over native-only performance

### Revisit Later If Needed
- direct `lol-html`
- custom maintained WASM distribution
- Rust-core extractor service
- more specialized native packaging

---

## 18. Final Conclusion

For Seek.js, the correct parser/runtime decision today is not the one with the highest theoretical performance ceiling.

It is the one that best supports:
- adoption
- runtime portability
- CI reliability
- clean package boundaries
- multi-mode extraction evolution

That makes the current best choice:

> **`html-rewriter-wasm` for `v1`, with a deliberate architecture that keeps the door open to `lol-html` later.**

This is the most pragmatic and strategically sound path for the extractor at the current stage of the project.