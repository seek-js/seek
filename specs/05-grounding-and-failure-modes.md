# Grounding and Failure Modes

**Status:** Accepted  
**Audience:** Endpoint and component implementers  
**Read time:** 6 min

## TL;DR

Citations cannot drift, because the model never writes a URL.  
If retrieval finds nothing decent, the model says so and shows the raw results.  
Every failure path degrades to working search, never to a spinner.

## Scope

This doc is the "foolproof" contract. It is normative for both the answer endpoint and the
component. Where it conflicts with a `Proposed` spec, this doc wins.

Endpoint mechanics live in `[03-answer-endpoint.md](03-answer-endpoint.md)`.  
Component mechanics live in `[04-component-contract.md](04-component-contract.md)`.

## Citation Scheme

Sources reach the model as a numbered list. Nothing else.

```
[1] Rotating API keys — Keys can be rotated from Settings > Security...
[2] Key scopes — Each key carries a scope list...
```

Rules:

1. The model is instructed to cite `[n]` inline for every claim.
2. The model is instructed to **never write a URL**, and never a title as a link.
3. The `sources` SSE event carries the `n` -> `{ title, url, excerpt }` mapping.
4. The client renders `[n]` as a link using that mapping.
5. A number outside `1..n` renders as inert plain text and emits `seek-error` with
   `code: "bad_citation"`.

Why this is a guarantee, not a measurement: the worst failure available to the model is a
wrong integer, which surfaces as a visibly mismatched citation. It cannot produce a
plausible-looking dead link, because it never produces links at all. This replaces the old
plan's "measure Llama 3 citation hallucination rate, fall back if >5%" experiment.

## Refusal Rule

> Cite or don't say it.

1. Every factual claim in an answer carries at least one `[n]`.
2. If the final result set is empty or low-quality, the model must state that it could not find
   the answer in the docs. It must not improvise, generalize from pretraining, or hedge into a
   plausible-sounding answer.
3. On refusal, the client shows the raw search results below the refusal text. A list of real
   pages is more useful than a confident wrong paragraph.
4. `answerStatus` becomes `'refused'`. This is a normal outcome, not an error state, and it is
   not styled as one.

## Failure-Path Matrix

Normative. Every row is a required behavior.

| Condition | Behavior |
| --- | --- |
| Retrieval returns nothing decent | model refuses, client shows raw search results |
| No API key / no `answer-endpoint` | "Ask AI" is hidden entirely; search works perfectly |
| Endpoint returns `rate_limited` | clear message with the reason; retry affordance; never an infinite spinner |
| Endpoint returns `origin_denied` | hide "Ask AI" for the session; log to console once |
| Question over the length cap | inline hint before sending; never a silent truncation |
| Offline | search works from the cached index; "Ask AI" shows an offline message |
| Stream dies mid-answer | keep every token that arrived, mark it incomplete, offer retry |
| Modal closed mid-stream | `AbortController` aborts; no orphaned request, no state write after unmount |
| Pagefind bundle 404s | inline error naming the expected `bundle-path`; trigger stays usable |
| Provider error | generic `provider_error` message; never relay the provider's body |
| Answer served from cache | identical rendering; `done.cached = true` only |
| Citation number out of range | inert text plus `seek-error`; the rest of the answer still renders |

## Anti-Patterns

Explicitly forbidden:

- an indefinite spinner with no timeout and no message
- swallowing an error and rendering an empty result list as if the query had no matches
- disabling or hiding search because the **answer** layer failed
- generating an answer when no source was retrieved
- writing a URL into answer text on any code path
- retrying a failed stream automatically more than once

## Invariants

1. Search never depends on the answer endpoint.
2. The answer layer never degrades search.
3. Every terminal state is either content, a refusal, or a named error. There is no fourth
   state.
