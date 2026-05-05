# Turbo Spec (Seek.js)

**Purpose:** Single source of truth for how Turborepo runs quality gates in this repo, why setup exists, how to run it day-to-day, and what to improve later.

## 1) What Turbo owns in this repo

Turbo orchestrates these root contracts:

- `build` -> `bunx turbo run build`
- `typecheck` -> `bunx turbo run typecheck`
- `test` -> `bunx turbo run test`
- aggregate `check` uses Turbo for `typecheck`, `lint`, `format:check`, `test`, `build`

Current aggregate gate:

- `bun run check`
- Expands to: `typecheck` -> `turbo lint` -> `turbo format:check` -> `test` -> `build` -> metadata/package validators

Validators currently stay root-direct:

- `validate:metadata` -> `bun ./scripts/validate-metadata.mjs`
- `validate:package` -> `publint` + `attw`

## 2) Why this design

- Keep one public gate: contributors and CI both use `bun run check`.
- Use Turbo where graph/caching helps most (`build`, `typecheck`, `test`, lint/format orchestration).
- Keep Biome execution central: one root run via Turbo Root Tasks, avoid repeated workspace Biome runs.
- Keep package script surface uniform (`build`, `typecheck`, `lint`, `format:check`, `test`) so Turbo graph never breaks on missing keys.
- Keep publish validators root-direct for now; simpler correctness model while migration stabilizes.

## 3) Turbo graph contract (`turbo.json`)

Root tasks:

- `//#lint`
- `//#format:check`
- `//#format:fix` with `cache: false`

Workspace tasks:

- `build`: `dependsOn: ["^build"]`, `outputs: ["dist/**"]`
- `typecheck`: `dependsOn: ["^typecheck"]`, `outputs: ["**/tsconfig.tsbuildinfo"]`
- `lint`: `cache: true`
- `format:check`: `cache: true`
- `test`: `cache: false`

Workspace exception:

- `@seek/typescript-config` uses `packages/typescript-config/turbo.json` overrides.
- For that workspace: `build`/`typecheck` outputs are empty and cache is disabled; `lint`/`format:check` cache disabled.
- Reason: config-only package with stub task scripts; avoid misleading cache artifacts.

Implications:

- Build and typecheck follow dependency graph.
- Lint/format orchestration goes through root task once, workspace scripts stay stubs for graph uniformity.
- Test cache disabled to reduce false confidence from stale test state.

## 4) Daily usage (what to run every time)

Normal dev flow:

1. Run focused task when iterating:
   - `bun run typecheck` or `bun run test` or `bun run build`
2. Before push / PR update:
   - `bun run check`

When debugging cache suspicion:

- `TURBO_FORCE=true bun run check`

When formatting:

- check mode: `bun run format:check`
- write mode: `bun run format:fix`

## 5) CI contract

CI must keep same semantics as local aggregate gate:

1. `bun install --frozen-lockfile`
2. `bun run check`

If local pass but CI fail:

- check environment drift (OS/toolchain),
- check lockfile drift,
- check cache assumptions,
- fix with smallest targeted change.

## 6) Verification matrix (expected green)

Direct:

- `bun run lint`
- `bun run format:check`

Turbo-backed:

- `bun run typecheck`
- `bun run test`
- `bun run build`

Validators:

- `bun run validate:metadata`
- `bun run validate:package`

Aggregate:

- `bun run check`

Turbo-specific cross-check:

- `bunx turbo run build typecheck lint format:check test --summarize`

## 7) Metadata validator future plan (Turbo integration idea)

Current state:

- `validate:metadata` and `validate:package` are root-direct and included in `check`.

Future organized Turbo path:

Option A (minimal):

- Add root tasks `//#validate:metadata` and `//#validate:package` in `turbo.json`.
- Keep commands root-owned, move orchestration into Turbo.

Option B (better long-term):

- Move validation ownership to packages (each package validates own publish surface).
- Add task-level `dependsOn` on `build`.
- Define clear `inputs` for package metadata + output artifacts.

Guardrails before enabling cache for validators:

- Include all relevant inputs (`package.json`, build output, validator config).
- Start with `cache: false` until trust is proven.
- Keep periodic forced run (`TURBO_FORCE=true`) in troubleshooting path.

## 8) Risks and care points

- Missing package script keys break Turbo task graph.
- Mixing root-direct and workspace logic without clear contract causes duplicate/contradictory work.
- Over-caching can hide regressions; correctness always higher priority than hit-rate.
- Root-task lint/format model depends on keeping workspace lint/format scripts as explicit stubs.

## 9) Definition of done for this migration

Migration considered complete when all true:

1. Turbo orchestrates `build`, `typecheck`, `test`, plus lint/format root tasks.
2. `bun run check` is single fail-closed entrypoint for local and CI.
3. Verification matrix is green locally.
4. CI uses same aggregate gate.
5. Toolchain docs stay aligned with this spec.

## 10) Follow-ups (explicitly non-blocking)

- Consider Turbo orchestration for metadata/package validators.
- Consider remote Turbo cache rollout when team wants it.
- Replace package `test` stubs with real suites as packages mature.
