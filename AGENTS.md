# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **`assets/` is Docker build context, not a mounted asset directory.** The `Dockerfile` `COPY`s the three runtime files into the image; nothing calls `mountAssets`. Editing one of them needs an image rebuild (`make x86`), not just a service restart.
- **`virtualNetworking: true` in the manifest is what grants `/dev/net/tun`.** Without it `wg-quick` cannot create `wg0` at all, because the kernel WireGuard module is unavailable to a service container and the `wireguard-go` fallback needs the tun device. Don't drop the flag.
- **`/data/wg0.conf` is generated, never hand-edited.** `main.ts` rewrites it from `store.json` on every run, and every write to `store.json` restarts main through the `.const()` watcher. Change the renderer in `startos/utils.ts`, not the file on disk.
- **`startos/utils.ts` and `startos/statistics.ts` are pure and covered by `npm test`** (`node --test`, no StartOS runtime needed). CI does not run it — run it yourself after touching address arithmetic, config rendering, the firewall policy chains, or the statistics parser.
