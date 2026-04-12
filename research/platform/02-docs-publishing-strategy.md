
# Deploying docs to seekjs.org

Use a GitHub Actions CI sync instead of a git submodule** for Fumadocs, because:

- Submodules have painful DX (nested `git submodule update --init` steps on every clone)

- A CI action gives you full control — trigger on push to `main`, copy `docs/` content to the landing site repo, open a PR or direct push
