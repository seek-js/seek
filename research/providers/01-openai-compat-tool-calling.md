# Do the OpenAI-Compatible Providers Really Share a Tool-Calling Shape?

**Status:** Research finding (verifies a claim in `specs/03-answer-endpoint.md`)  
**Date:** 2026-08  
**Audience:** Maintainers; anyone implementing the answer-endpoint provider adapter  
**Read time:** 15 min

## TL;DR

The spec's claim — one adapter over the OpenAI chat-completions shape covers OpenAI, Groq,
Gemini's compat endpoint, OpenRouter, Together, DeepSeek, Mistral, and Ollama — **survives,
with two real deviations on the same provider and two doc-level corrections**.

All eight providers document the same `tools` array (name / description / JSON-schema
parameters) and accept multi-turn results as `role: "tool"` messages keyed by `tool_call_id`.
Two things are not perfectly uniform:

1. **Gemini's OpenAI-compat endpoint deviates on the streaming path, twice:** streamed
   `tool_call` deltas omit the `index` field (staff-confirmed, still open per Nov 2025
   follow-ups, raw-SSE confirmed Dec 2025), and streaming reports `finish_reason: "stop"`
   for tool calls where non-streaming reports `"tool_calls"`. Fix once in the adapter:
   accumulate the whole stream, continue the loop whenever any `tool_calls` were emitted
   regardless of `finish_reason`, and replay the assistant message verbatim. Details in the
   Gemini section and Verdict below.
2. Two `baseURL`s in the spec table are stale against current docs (DeepSeek, Together).

Ollama supports `tools` but not `tool_choice` — harmless for Seek, which relies on the
default `"auto"` behavior by simply omitting the parameter.

## What Was Checked

For each provider, against its official documentation only:

| Question | Why it matters to specs/03 |
| --- | --- |
| Does `/chat/completions` accept a `tools` array with name/description/JSON-schema params? | The endpoint declares exactly one tool, `search({ query })`. |
| Do tool calls stream back as `delta.tool_calls`? | The response contract is SSE end to end (`token` events). |
| Are multi-turn results accepted as `{ role: "tool", tool_call_id, content }`? | The loop runs up to 3 searches per request. |
| Any special case, shim, or known bug? | "No LangChain, no SDK" rests on there being none. |

## Per-Provider Findings

### OpenAI

- **Tools:** Yes. Functions declared as `{ type: "function", name, description, parameters }`
  where `parameters` is full JSON Schema ([function-calling guide](https://platform.openai.com/docs/guides/function-calling)).
  Note OpenAI's docs now lead with the Responses API; Chat Completions keeps the nested
  `{ type: "function", function: {...} }` wrapper shape.
- **Streaming:** Yes. Streamed function calls aggregate via index-keyed chunks into an
  `arguments` string ([function-calling guide, Streaming](https://platform.openai.com/docs/guides/function-calling)).
- **Multi-turn:** Yes — every tool call carries a `call_id`, echoed back in the result message
  ([function-calling guide, Handling function calls](https://platform.openai.com/docs/guides/function-calling)).
- **Caveats:** None relevant. Parallel tool calls exist but can be disabled with
  `parallel_tool_calls: false`; Seek needs only one call per turn.

### Groq

- **Tools:** Yes, same JSON-schema shape, explicitly framed as OpenAI-compatible local tool
  calling ([Tool Use overview](https://console.groq.com/docs/tool-use), [Local Tool Calling](https://console.groq.com/docs/tool-use/local-tool-calling)).
  All hosted models support tool use ([supported models table](https://console.groq.com/docs/tool-use)).
- **Streaming:** Yes — `delta.tool_calls` accumulated across chunks with `finish_reason:
  "tool_calls"`, shown in the official streaming example
  ([Local Tool Calling, Streaming Tool Use](https://console.groq.com/docs/tool-use/local-tool-calling)).
- **Multi-turn:** Yes — `role: "tool"` with `tool_call_id` matching the assistant call id
  ([Tool Use overview](https://console.groq.com/docs/tool-use)).
- **Caveats:** Parallel tool use is **not supported on `openai/gpt-oss-*` models**, supported on
  Llama/Qwen/MiniMax lines ([model table](https://console.groq.com/docs/tool-use)). Irrelevant to
  Seek's single-search-per-turn loop. `tool_choice: "none"` is unreliable on some models
  (may 400) ([Local Tool Calling](https://console.groq.com/docs/tool-use/local-tool-calling)) — again not used by Seek.

### Gemini (OpenAI-compat endpoint)

- **Tools:** Yes — the compatibility layer documents standard OpenAI function calling with the
  identical `tools` array and `tool_choice: "auto"`
  ([OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)).
- **Streaming:** **Deviates, twice.** Streamed `delta.tool_calls` chunks **omit the `index` field**
  required by the OpenAI format. Reported and confirmed by Google staff in June 2025; still
  unfixed per follow-ups in November 2025
  ([forum thread](https://discuss.ai.google.dev/t/gemini-openai-compatibility-issue-with-tool-call-streaming/59886/6)),
  with independent raw-SSE confirmation as late as December 2025
  ([openai-python#2806](https://github.com/openai/openai-python/issues/2806)).
  Code that keys accumulation off `tool_call.index` throws.
- **Streaming `finish_reason` deviates too.** For the identical tool-call response, the
  non-streaming path returns `finish_reason: "tool_calls"` but the streaming path returns
  `"stop"` ([python-genai#2868](https://github.com/googleapis/python-genai/issues/2868)).
  An adapter that branches its tool loop on `finish_reason === "tool_calls"` alone will
  silently terminate on Gemini streaming instead of dispatching the search. Adapter rule:
  continue the loop whenever any `tool_calls` were emitted in the stream, regardless of the
  terminal `finish_reason`. (Verification note, 2026-09: this second deviation was found
  during independent re-verification of this doc, not in the original research pass.)
- **Multi-turn:** Yes — `role: "tool"` messages with `tool_call_id` work through the compat
  endpoint ([OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)).
- **Caveats:**
  - Gemini-native tools (Google Search grounding, `url_context`) are **not** available through
    the compat endpoint — custom function calls only. Irrelevant to Seek, which brings its own
    Pagefind retrieval ([staff confirmation](https://discuss.ai.google.dev/t/does-geminis-openai-compatible-endpoint-support-native-tools-like-url-context/112091)).
  - An open report (Nov–Dec 2025) of the translation layer dropping function-call `parameters`
    when converting to native `functionDeclarations` for some schemas
    ([forum thread](https://discuss.ai.google.dev/t/openai-compatible-api-not-passing-function-call-parameters/110734/3)).
    Risk is low for Seek's flat single-string schema but worth one smoke test.
  - Gemini 3 thinking models attach an encrypted `thought_signature` inside
    `extra_content.google` on tool calls and enforce strict replay: omitting it on the
    results turn returns a 400
    ([forum thread](https://discuss.ai.google.dev/t/openai-api-compatibility-broken-due-to-thought-signature-on-gemini-3-pro-preview/109823)).
    This falls out of verbatim assistant-message replay (reassemble the whole message,
    including `extra_content`, rather than reconstructing tool calls by hand) — but it means
    the multi-turn loop must never strip unknown fields. Worth one smoke test on a thinking
    model.

### OpenRouter

- **Tools:** Yes — OpenRouter's whole pitch here is *standardizing* the OpenAI tool-calling
  interface across routed models ([Tool & Function Calling](https://openrouter.ai/docs/guides/features/tool-calling)).
  Model support is filterable (`supported_parameters=tools`).
- **Streaming:** Yes — `data.choices[0].delta.tool_calls` with `finish_reason` handling shown
  in the official streaming example ([same page](https://openrouter.ai/docs/guides/features/tool-calling)).
- **Multi-turn:** Yes — `role: "tool"` + `tool_call_id`; note the `tools` array must be resent
  on every request including the results turn ([same page](https://openrouter.ai/docs/guides/features/tool-calling)). Seek's adapter does this naturally since each loop iteration rebuilds the request.
- **Caveats:** Shape is uniform; *quality* is not. OpenRouter tracks a per-model Tool Call Error
  Rate and routes around bad providers with Auto Exacto
  ([same page](https://openrouter.ai/docs/guides/features/tool-calling)) — an acknowledgment that
  some upstream model/provider pairs fail tool calls regardless of the wire format. Pin a
  known-good model id rather than relying on auto-routing.

### Together

- **Tools:** Yes — listed as drop-in compatible under both "Endpoint compatibility matrix"
  (`chat.completions.create` (tools) → Supported) and the capability table
  ([OpenAI compatibility](https://docs.together.ai/docs/openai-api-compatibility)), with dedicated
  function-calling patterns docs covering simple, parallel, multi-step, and multi-turn flows
  ([Function calling patterns](https://docs.together.ai/docs/inference/function-calling/overview)).
- **Streaming:** Chat completions with streaming is drop-in
  ([compatibility page](https://docs.together.ai/docs/openai-api-compatibility)); the docs do not
  call out any streamed tool-call delta deviation.
- **Multi-turn:** Yes — the multi-turn agentic pattern uses the standard
  assistant-`tool_calls` → `role: "tool"` replay
  ([Function calling patterns](https://docs.together.ai/docs/inference/function-calling/overview)).
- **Caveats:** Reasoning models return chain-of-thought in a `reasoning` field that should be
  passed back for preserved-thinking multi-turn tool calling
  ([compatibility page](https://docs.together.ai/docs/openai-api-compatibility)) — irrelevant if
  Seek pins a non-reasoning model. **Doc correction:** current base URL is
  `https://api.together.ai/v1`; the spec table says `api.together.xyz/v1`.

### DeepSeek

- **Tools:** Yes — standard OpenAI-shaped `tools` with the nested `function` wrapper, worked
  example using the OpenAI SDK against `base_url="https://api.deepseek.com"`
  ([Tool Calls guide](https://api-docs.deepseek.com/guides/tool_calls)).
- **Streaming:** Supported generally (the chat API streams); the tool-calls guide does not
  document any streamed-delta deviation.
- **Multi-turn:** Yes — append the assistant message, then
  `{ role: "tool", tool_call_id: tool.id, content }`
  ([Tool Calls guide](https://api-docs.deepseek.com/guides/tool_calls)).
- **Caveats:** `strict` schema mode is beta and requires a different base URL
  (`https://api.deepseek.com/beta`) plus a restricted JSON-Schema subset — Seek must NOT send
  `strict: true` against the normal endpoint's assumptions and doesn't need strict mode for one
  string parameter ([Tool Calls guide, strict mode](https://api-docs.deepseek.com/guides/tool_calls)).
  Thinking mode supports tool calls since V3.2 ([same page](https://api-docs.deepseek.com/guides/tool_calls)).
  **Doc correction:** current docs give base_url `https://api.deepseek.com` (no `/v1`);
  the spec table says `https://api.deepseek.com/v1`.

### Mistral

- **Tools:** Yes — identical `type: "function"` / `name` / `description` / JSON-schema
  `parameters` declarations ([Function Calling](https://docs.mistral.ai/capabilities/function_calling/)).
  `tool_choice`: `"auto"` / `"any"` / `"none"`; `parallel_tool_calls` toggle exists.
- **Streaming:** The chat-completions API streams; the function-calling guide shows the
  non-streaming flow. No streamed-delta deviation is documented.
- **Multi-turn:** Yes — `{ role: "tool", name, content, tool_call_id }`, with explicit
  successive- and parallel-function-calling role flows documented
  ([Function Calling](https://docs.mistral.ai/capabilities/function_calling/)).
- **Caveats:** Function calling is restricted to specific models (Large 3, Medium 3.5, Small
  3.2, Ministral 3, Devstral, Magistral, etc.) ([model list](https://docs.mistral.ai/capabilities/function_calling/)) —
  pin `SEEK_MODEL` accordingly.

### Ollama (local)

- **Tools:** Yes — `/v1/chat/completions` lists `tools` as a supported request field
  ([OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility.md)), same
  `{ type: "function", function: { name, description, parameters } }` shape
  ([Tool calling](https://docs.ollama.com/capabilities/tool-calling.md)).
- **Streaming:** Streaming is supported and the docs show accumulating streamed tool-call
  chunks before replaying them ([Tool calling, streaming](https://docs.ollama.com/capabilities/tool-calling.md)).
- **Multi-turn:** Yes through the OpenAI-compat surface; note Ollama's *native* API uses
  `tool_name` rather than `tool_call_id` on tool messages — stay on `/v1` to avoid this
  ([Tool calling examples](https://docs.ollama.com/capabilities/tool-calling.md)).
- **Caveats:**
  - **`tool_choice` is not supported** on `/v1/chat/completions`
    ([OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility.md)). Harmless for
    Seek: the adapter must simply never send it, relying on default auto behavior.
  - Tool calling is **model-dependent**: only models with a tool template emit `tool_calls`
    (e.g. qwen3, llama3.2-class). A mis-chosen local model silently answers without searching.
  - Context size is set via Modelfile `num_ctx`, not the API — a small local context window can
    truncate the retrieved-results turn ([OpenAI compatibility, notes](https://docs.ollama.com/api/openai-compatibility.md)).

## Comparison Table

| Provider | `tools` accepted (OpenAI shape) | Streaming tool-call deltas | Multi-turn `role:"tool"` + `tool_call_id` | Caveats / shims |
| --- | --- | --- | --- | --- |
| OpenAI | ✅ full JSON Schema | ✅ index-keyed deltas | ✅ `call_id` echo | None relevant; parallel calls optional-off |
| Groq | ✅ | ✅ | ✅ | gpt-oss models lack parallel tool use (unused by Seek); `tool_choice:"none"` flaky on some models |
| Gemini (compat) | ✅ | ⚠️ deltas omit `index` (open since Jan 2025, raw-SSE confirmed Dec 2025); streaming `finish_reason` is `"stop"` not `"tool_calls"` | ✅ | buffer whole stream, continue loop on emitted `tool_calls` regardless of `finish_reason`; replay assistant message verbatim (thought signatures); one smoke test for schema passthrough |
| OpenRouter | ✅ standardized | ✅ | ✅ resend `tools` every request | Quality varies by routed model — pin model id; Auto Exacto exists because of this |
| Together | ✅ | ✅ (streaming drop-in; no delta deviation documented) | ✅ | reasoning models need `reasoning` echoed back; baseURL is `api.together.ai/v1` now |
| DeepSeek | ✅ | ✅ (no deviation documented) | ✅ | `strict` mode is beta on `/beta` base URL — don't send `strict:true`; baseURL docs say no `/v1` |
| Mistral | ✅ | ✅ (API streams; no deviation documented) | ✅ | function calling limited to specific models; `parallel_tool_calls` available |
| Ollama | ✅ | ✅ (accumulate chunks) | ✅ via `/v1` | `tool_choice` unsupported (omit it); model-dependent support; `num_ctx` set outside the API |

## Spec Corrections Implied

1. **`specs/03-answer-endpoint.md` provider table, DeepSeek row:** current primary docs give
   `base_url = https://api.deepseek.com`, not `/v1`. Verify whether `/v1` still resolves before
   shipping the template; if not, correct the table.
2. **Same table, Together row:** current docs say `https://api.together.ai/v1`; the spec says
   `api.together.xyz/v1`.
3. Worth adding a footnote: the adapter should never send `tool_choice` or `strict` so Ollama
   and DeepSeek remain covered by the same request body.

## Verdict

**Genuinely drop-in (baseURL + model id only):** OpenAI, Groq, OpenRouter, Together, Mistral,
DeepSeek. All six document the identical `tools` declaration, streamed `delta.tool_calls`, and
`role: "tool"` / `tool_call_id` replay, with no shims required for a single-tool,
max-3-sequential-searches loop.

**Small shim:** **Gemini (compat)** — the two genuine deviations found, both on the streaming
path. Its streamed tool-call deltas lack the `index` field, and its streaming
`finish_reason` says `"stop"` where non-streaming says `"tool_calls"`. Mitigations, in order
of preference:

1. Don't parse tool-call deltas incrementally, and don't branch the loop on `finish_reason`
   alone. The endpoint never forwards raw tool arguments to the browser, so accumulate the
   whole stream, then continue the loop if any `tool_calls` were emitted — whether the
   terminal reason says `"tool_calls"` or (Gemini streaming) `"stop"`. Replay the assembled
   assistant message verbatim, including `extra_content`, so Gemini 3 thought signatures
   survive multi-turn. This works on all eight providers and makes both Gemini deviations
   moot.
2. Or default `index ?? 0` during aggregation (~5 lines), safe given Seek expects at most one
   search call per turn — but this alone does NOT fix the wrong `finish_reason`, so
   mitigation 1 is the one to implement.

**Keep with caveats, not dropped:** **Ollama** stays in the table — it accepts the same shapes —
but the template docs must state that `SEEK_MODEL` must be a tool-capable local model and that
the adapter omits `tool_choice`. Nothing in the list warrants removal.

**Does the "~150-line single adapter" claim survive?** Yes. One raw-`fetch` chat-completions
adapter with a `baseURL` swap covers all eight providers for the exact request pattern specs/03
specifies (one tool, sequential calls, streamed final answer). The cost of accuracy is: one
defensive accumulation strategy (buffer the whole stream, loop on emitted `tool_calls` rather
than on `finish_reason`, replay verbatim), two corrected `baseURL`s, and two
configuration footnotes (`tool_choice` omitted; tool-capable model ids pinned). That overhead
is measured in tens of lines, not an abstraction layer — the anti-LangChain position in
`research/00-scope-change-2026-07.md` remains intact.
