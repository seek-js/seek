# Deploying docs to seekjs.org

Use GitHub Actions CI sync instead of git submodule for Fumadocs.

## Why

- Submodules add clone/update friction.
- CI sync gives controlled publish flow from `seek` docs to website repo.
- CI can open PR or push with review policy.

## Minimal flow

1. Changes merged in `seek`.
2. Action copies approved docs subset.
3. Action opens PR in `seekjs-website` (or pushes by policy).
