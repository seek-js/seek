# Component Contract

**Status:** Proposed  
**Audience:** `core`, `element`, and `react` implementers  
**Read time:** 12 min

## TL;DR

`<seek-search>` is the whole product. `useSeek()` is the same machine with a React face.  
Zero bytes on page load beyond a ~1kB trigger button; everything else arrives on first intent.  
Budgets are enforced in CI and a regression fails the build.

## Scope

This doc defines:

- the public API of `<seek-search>` and `useSeek()`
- emitted events and theming surface
- normative quality rules for load, race safety, rendering, a11y, and SSR
- bundle budgets

Failure-path behavior is normative in
`[05-grounding-and-failure-modes.md](05-grounding-and-failure-modes.md)`.  
The endpoint contract is `[03-answer-endpoint.md](03-answer-endpoint.md)`.

## `<seek-search>`

```html
<script type="module" src="/seek/element.js"></script>

<seek-search
  bundle-path="/pagefind/"
  answer-endpoint="/api/seek/answer"
  placeholder="Search docs..."
  hotkey="mod+k"
></seek-search>
```

### Attributes

| Attribute | Type | Default | Meaning |
| --- | --- | --- | --- |
| `bundle-path` | string | `/pagefind/` | root of the Pagefind index bundle |
| `answer-endpoint` | string | none | enables "Ask AI"; omit to disable it |
| `placeholder` | string | `Search` | input placeholder |
| `hotkey` | string | `mod+k` | `mod+k`, a single key, or `none` |
| `max-results` | number | `10` | results rendered per query |
| `open` | boolean | absent | reflects modal state; settable |
| `label` | string | `Search` | accessible name of the trigger |
| `lang` | string | inherited | forces a Pagefind language index |

All attributes are also settable as properties. React 19 maps props to properties, so the
element is usable in React directly.

### Events

All `CustomEvent`, bubbling, composed.

| Event | `detail` |
| --- | --- |
| `seek-open` | `{ trigger: 'hotkey' \| 'click' \| 'api' }` |
| `seek-close` | `{}` |
| `seek-search` | `{ query, resultCount, ms }` |
| `seek-select` | `{ url, title, query }` |
| `seek-ask` | `{ question }` |
| `seek-answer` | `{ question, cached, searches, sourceCount }` |
| `seek-error` | `{ code, message }` |

`seek-select` is cancelable; `preventDefault()` suppresses navigation so a host router can take
over.

## `useSeek()`

Built on `@seekjs/core` **directly**, not by wrapping the custom element. Wrapping inherits
refs-instead-of-props, hydration mismatches, style-isolation fights, and no Suspense. The hook
exists for idiomatic feel, not necessity.

```tsx
const {
  query, setQuery,
  results, status,
  ask, answer, sources, answerStatus,
  open, setOpen,
} = useSeek({ bundlePath: '/pagefind/', answerEndpoint: '/api/seek/answer' });
```

| Value | Type |
| --- | --- |
| `status` | `'idle' \| 'loading' \| 'ready' \| 'searching' \| 'error'` |
| `results` | `Array<{ id, url, title, excerpt, meta }>` |
| `answer` | `string` (accumulating) |
| `sources` | `Array<{ n, title, url, excerpt }>` |
| `answerStatus` | `'idle' \| 'streaming' \| 'done' \| 'refused' \| 'error'` |
| `ask` | `(question: string) => void` |

`@seekjs/core` is headless and touches no DOM: state machine, Pagefind calls, and answer
streaming only. Both `element` and `react` are thin shells over it.

## Normative Quality Rules

### Loading

1. Page load ships **only** a ~1kB trigger button. Nothing else.
2. The rest loads via dynamic `import()` on first intent: `pointerenter`, `focus`, or
   Cmd/Ctrl+K `keydown`.
3. On intent, also preload the first index chunk so the first keystroke is instant.
4. Never load the Pagefind WASM at page load, even idle-scheduled.

### Input and races

5. Never debounce the first keystroke. Debounce subsequent ones ~100ms.
6. Every search carries a monotonic request id; discard results from a stale id. Async search
   returns out of order and unguarded it reads as flicker.
7. `AbortController` on the answer stream. Closing the modal aborts the request.

### Rendering

8. Batch streamed tokens with `requestAnimationFrame`. Per-token state updates are the classic
   jank source.
9. Zero layout shift: fixed-height rows, and the skeleton is the exact final height.
10. **Do not preemptively add a Web Worker.** Pagefind is WASM and already async. Profile
    against a 5,000-page site and move search off-thread only if long tasks exceed 50ms.
11. Respect `prefers-reduced-motion`. Use `color-scheme` for dark mode.

### SSR

12. No `window`, `document`, or `navigator` access at module scope.
13. The server renders a plain `<button>`. Works in RSC and under `astro:client:idle`.

### Accessibility

14. Full combobox pattern: `role="combobox"`, `aria-expanded`, `aria-controls`,
    `aria-activedescendant`.
15. Arrow keys move a virtual cursor; DOM focus stays in the input.
16. Focus trap while open. Escape closes and restores focus to the trigger.
17. `aria-live="polite"` announces the result count.

## Theming

CSS custom properties plus `::part()`. No `!important` anywhere, and no forked CSS to
restyle it.

```css
seek-search {
  --seek-font: inherit;
  --seek-radius: 8px;
  --seek-accent: #3b82f6;
  --seek-bg: white;
  --seek-fg: #111;
  --seek-muted: #666;
  --seek-border: #e5e7eb;
  --seek-overlay: rgb(0 0 0 / 0.4);
  --seek-z-index: 9999;
}

seek-search::part(trigger) { }
seek-search::part(dialog) { }
seek-search::part(input) { }
seek-search::part(result) { }
seek-search::part(result-active) { }
seek-search::part(answer) { }
seek-search::part(citation) { }
seek-search::part(footer) { }
```

Slots: `trigger`, `empty`, `footer`.

## Bundle Budgets

Enforced in CI. A regression **fails the build**.

| Package | Budget (gzip) |
| --- | --- |
| `@seekjs/core` | <= 8kB |
| `@seekjs/element` | <= 14kB |
| `@seekjs/react` | <= 10kB |

Excluded from the budget: the Pagefind runtime and WASM, which are fetched from
`bundle-path` and are not part of the shipped package. Included: everything in the package's
own dependency graph, which per
`[01-architecture.md](01-architecture.md)` is nothing but `react` as a peer.

## Invariants

1. Search works with no `answer-endpoint` configured; "Ask AI" is simply absent.
2. Search works offline once the index is cached.
3. No LLM SDK is ever bundled into the client.
4. The component sends only `{ question }` to the answer endpoint.
5. Nothing in the component requires a build step from the user. A `<script type="module">`
   tag is a supported install path.
