# Seek.js Package Build and Publishing Workflow

## Goal

Explain end-to-end process for building and publishing Seek.js packages (libraries + CLI) to npm registry in a framework-agnostic monorepo.

## Decision Snapshot (Web-verified)

- `tsup` is still usable but no longer actively maintained by upstream.
- `tsdown` is the active successor path for TypeScript library bundling.
- `tsdown` compatibility with common `tsup` workflows exists, but Seek.js will start directly on `tsdown`.
- `unbuild` is a Rollup-based build system from UnJS, strong for library packaging and bundleless workflows.

## 1) Package Lifecycle

1. Write source code (`src/*.ts`)
2. Build package (`tsdown` or `unbuild`) into `dist/*`
3. Run validation (tests, lint, typecheck)
4. Bump versions and changelog (`changesets`)
5. Publish to npm registry
6. Consumers install through npm/yarn/pnpm/bun

```mermaid
flowchart LR
    writeCode[Write TypeScript Source] --> buildStep[Build Package]
    buildStep --> validateStep[Test Lint Typecheck]
    validateStep --> versionStep[Version and Changelog]
    versionStep --> publishStep[Publish to npm Registry]
    publishStep --> consumeStep[Users Install via npm yarn pnpm bun]
```



## 2) Monorepo Model for Seek.js

One repo can host multiple packages with shared tooling and isolated outputs:

- `packages/core`
- `packages/extractor`
- `packages/compiler`
- `packages/client`
- `packages/cli`

Each package has its own `package.json`; workspace tooling links local packages during development.

```mermaid
flowchart TD
    repoRoot[seek repo root] --> corePkg[packages/core]
    repoRoot --> extractorPkg[packages/extractor]
    repoRoot --> compilerPkg[packages/compiler]
    repoRoot --> clientPkg[packages/client]
    repoRoot --> cliPkg[packages/cli]
    corePkg --> npmReg[npm registry]
    extractorPkg --> npmReg
    compilerPkg --> npmReg
    clientPkg --> npmReg
    cliPkg --> npmReg
```



## 3) Tool Responsibilities

- `pnpm workspaces`: monorepo dependency management and local package linking
- `typescript`: type system and declaration output
- `tsdown`: primary package build output (`dist`)
- `unbuild`: secondary/optional build tool for specific library packaging cases
- `vitest`: test runner
- `eslint` + `prettier`: quality + formatting
- `changesets`: coordinated versioning and changelog generation
- `github actions`: CI automation for test/build/publish

### `unbuild` in short

`unbuild` is not a package manager.  
It is a build system for JS/TS libraries (Rollup-based via UnJS ecosystem), useful when we need bundleless-style builds or UnJS-native conventions.

## 4) Package Metadata Needed for Multi-Manager Consumption

Consumers can use npm/yarn/pnpm/bun when package is correctly published to npm.

Required `package.json` fields:

- `name`
- `version`
- `exports`
- `types`
- `main` / `module` (or ESM-only export map)
- `files`
- `bin` (for CLI package)

## 5) Build Outputs

### Library package

- `dist/index.js` (ESM)
- `dist/index.cjs` (optional CJS compatibility)
- `dist/index.d.ts` (types)

### CLI package

- `dist/cli.js` with shebang
- `bin` map in `package.json` (`seek` command -> built file)

```mermaid
flowchart LR
    srcTS[src TypeScript] --> bundler[tsdown or unbuild]
    bundler --> esmOut[dist index.js ESM]
    bundler --> cjsOut[dist index.cjs optional]
    bundler --> dtsOut[dist index.d.ts]
    bundler --> cliOut[dist cli.js with shebang]
```



## 6) Release and Publish Flow

Developer flow:

- implement change
- add changeset (`patch`/`minor`/`major`)
- merge PR

Release flow:

- changesets computes version updates + changelog
- CI publishes using npm token

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as GitHub
    participant CI as CI Pipeline
    participant NPM as npm Registry

    Dev->>Git: Push code and changeset
    Git->>CI: Run tests and build
    CI->>CI: Apply version bumps and changelogs
    CI->>NPM: Publish packages with npm token
    NPM-->>CI: Publish success and package versions
```



## 7) Node, Bun, Deno Compatibility

- Node and Bun consume npm packages directly.
- Deno can consume npm packages (`npm:@seekjs/core`) when exports are clean ESM.
- CLI is usually Node/Bun-first; Deno CLI may need separate adapter entrypoint.

## 8) Operating Rules for Seek.js

- keep each package focused and small
- expose public API from `src/index.ts`
- avoid deep cross-package internal imports
- preserve extractor/compiler/client boundary contracts
- release frequently with small changesets

## 9) Finalized Phase-1 Stack

For early Seek.js implementation phase:

- `pnpm workspaces`
- `typescript`
- `tsdown`
- `vitest`
- `eslint` + `prettier`
- `changesets`

Add Turborepo/Nx later only when CI graph complexity justifies extra tooling.

## 10) Why `tsdown` Instead of `rollup` for Phase 1

`rollup` is powerful, but Phase 1 priority is fast, low-friction package shipping while extractor/compiler contracts are still stabilizing.

Choose `tsdown` now because:

- lower config overhead
- faster onboarding for contributors
- simpler multi-package maintenance
- enough output control for library + CLI packaging

Use `rollup` later only if Seek.js needs advanced custom bundling behavior that `tsdown` cannot satisfy.

## 11) Runtime and Artifact Validation Matrix

### Runtime/install checks


| Target | Library validation                                 | CLI validation                                     |
| ------ | -------------------------------------------------- | -------------------------------------------------- |
| Node   | import package from tarball and run smoke API call | run `seek --help` from installed tarball           |
| Bun    | `bun add` tarball/package and import smoke API     | run CLI with Bun runtime path                      |
| Deno   | import via `npm:@seekjs/*` and execute smoke API   | document adapter path if Node-style bin not native |


### Artifact checks


| Check               | Expected                                                  |
| ------------------- | --------------------------------------------------------- |
| `exports` map       | resolves ESM entry (and optional CJS entry if provided)   |
| type declarations   | `.d.ts` generated and discoverable via `types`            |
| package contents    | `files` only includes required runtime assets             |
| distributable check | `npm pack` output installs and runs in clean temp project |


## 12) Implementation Checklist (tsdown-first bootstrap)

1. create workspace packages (`core`, `extractor`, `compiler`, `client`, `cli`)
2. configure `tsdown` for library outputs (`esm`, optional `cjs`, `d.ts`)
3. configure CLI package (`bin`, shebang, command entry)
4. run runtime/artifact validation matrix
5. run `npm pack` smoke install in clean temp project
6. wire CI for test/build/release (`changesets` + npm publish)

## 13) Legacy Note

If any old branch uses `tsup`, treat migration as legacy maintenance task.  
It is not part of baseline Seek.js Phase-1 bootstrap flow.

## 14) References

- `https://github.com/egoist/tsup` (maintenance notice context)
- `https://tsdown.dev/guide/migrate-from-tsup` (legacy reference only)
- `https://tsdown.dev/guide/faq`
- `https://github.com/rolldown/tsdown`
- `https://github.com/unjs/unbuild`

