---
name: apm-packaging
description: Route and apply APM package knowledge for AI Workplace — find/choose packages, install or update via apm.yml / apm install, register Platform AI marketplace (incl. SSL), troubleshoot failed installs, install cross-harness, and author new packages via /package-new (convert module, promote skill, or blank scaffold). Use when the user mentions APM packages, Workplace-Agent-Packages, apm.yml, marketplace@platform-ai, or asks to install/fix/publish an APM package. Do not use for npm/pip/apt or other language package managers.
---

# APM Packaging Skill

> Entry point for **all** APM package scenarios (install, update, marketplace, troubleshooting, authoring). Do **not** duplicate long procedures here — route to the sources below, then act.

## Knowledge sources (do not confuse)

| Source | Where it lives | Role |
|---|---|---|
| **User-facing APM guide** | `docs/core/APM_PACKAGES.md` in the **AI Workplace template repo only** | Catalogue, install paths, marketplace/SSL, cheat sheet, common tasks, troubleshooting, cross-harness, authoring overview |
| **Operational contract** | [`project-initialization/references/apm-workflow.md`](../project-initialization/references/apm-workflow.md) (shipped into every project) | CLI gates, registry semantics, hooks, lockfile, Phase 0 / 1.7-APM, hard rules |
| **This skill (authoring body)** | sections below starting at [Authoring procedure](#authoring-procedure) | Mapping rules, `x-workplace`, validation gates for `/package-new` |

### Resolving `APM_PACKAGES.md` (not in initialized projects)

`docs/core/APM_PACKAGES.md` is **not** copied into a project during `/initialize`. A relative path like `docs/core/APM_PACKAGES.md` inside an initialized workspace usually **does not exist** — do not assume it is local.

Resolve it with the standard contract in [`workplace-docs.md`](../project-initialization/references/workplace-docs.md) §2 — local workspace → local template clone → HTTPS raw → authenticated git → degrade honestly — or let the helper do it:

```bash
node .opencode/skills/project-initialization/scripts/fetch-workplace-doc.js core/APM_PACKAGES.md
```

With the default template source (`branch` `master`) that resolves to:

`https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md`

Rebuild the base from `.opencode/rules/.core-version.json → templateSource` whenever the user’s template branch is not `master`; the anchored URLs in the table below assume `master`.

> **Catalogue location (packages, not the guide).** Installable packages live in the standalone **Workplace-Agent-Packages** repo (`.opencode/rules/.core-version.json → apmPackages.registryRepoUrl`), one `<id>/` directory per package at the repo root, alongside `_templates/`, `_schema/`, and `scripts/regenerate-index.ps1`. Author packages in a local clone of that repo and open the PR there; paths under [Authoring procedure](#authoring-procedure) (`<id>/`, `_templates/`, `_schema/`, `scripts/`) are relative to that repo's root.

## Intent → where to read

Before answering or running APM commands, open the matching section of **APM_PACKAGES.md** (via the URL above). Use **apm-workflow.md** for exact CLI contracts and troubleshooting depth. Use this skill's authoring sections only for scaffolding / mapping.

| User intent | Read first (APM_PACKAGES.md) | Then / also |
|---|---|---|
| List / choose a Workplace package | [Catalogue](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#catalogue-workplace-agent-packages-repo), [Package types](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#package-types) | Offline snapshot `.opencode/rules/packages-index.json`; packages repo `index.json` |
| Install during `/initialize` or add a pack to a project | [Installing packages](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#installing-packages) | `apm-workflow.md` §§2, 4–5; `targets: [opencode]` in the project `apm.yml`; install through `apm-install-preserving.js` |
| Platform AI marketplace / SSL / `name@platform-ai` | [Local marketplace](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#local-marketplace-register-use) | Upstream SSL docs linked from that section |
| Day-to-day `apm` commands | [Cheat sheet](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#day-to-day-commands-cheat-sheet) | `apm-workflow.md` §§7, 9 |
| Failed install, PATH, TLS, missing skills, hooks | [Troubleshoot](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#troubleshoot-a-failed-install), [Common tasks](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#common-tasks) | `apm-workflow.md` §10 |
| Install same package into Claude / Copilot / etc. | [Cross-harness](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#cross-harness-installability) | Upstream targets matrix via `apm-workflow.md` §9 |
| Scaffold / publish a new package (`/package-new`) | [Authoring new packages](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#authoring-new-packages) | This skill [Authoring procedure](#authoring-procedure); `apm-workflow.md` §8 |

Prefer rebuilding anchors from `templateSource` when the user's template branch is not `master`. The fallback blob URLs above assume the default `master` branch.

## When to use

- The user asks to find, install, update, remove, or troubleshoot an APM / Workplace package (or Platform AI marketplace plugin).
- The user runs `/package-new ...` to scaffold a new APM package.
- The user asks to "convert this module into a package" / "promote this skill" / "package this for APM".
- An agent needs to add a new package to the Workplace-Agent-Packages repo by hand and wants to follow the canonical mapping.

---

## Authoring procedure

> Implements `/package-new`. Operational install / update / activation contracts remain in [`apm-workflow.md`](../project-initialization/references/apm-workflow.md) — do not restate them here.

## Mapping rules (from-module)

| Source file/folder | Destination in new package |
|---|---|
| `agents/<name>.md` | `.apm/agents/<name>.agent.md` |
| `skills/<name>/` (recursive) | `.apm/skills/<name>/` |
| `commands/<name>.md` | `.apm/prompts/<name>.prompt.md` |
| The module's init command (`<camelCaseName>-module-init.md`) | `scripts/activate.sh` + `scripts/activate.ps1`; the original markdown is preserved at `docs/legacy-init.md` |
| `<RootFolder>/` (runtime files moved to project root) | `runtime/<RootFolder>/` (relocated by `activate.sh` at activation time) |
| `config.json` | `runtime/config.json` (copied to `.workplace/<pkg>/config.json` by `activate.sh`) |
| `README.md` | `README.md` (top-level) |
| `module-config.json` (`targetRoles`, `version`) | folded into `x-workplace` block in `apm.yml` |

## Mapping rules (from-skill)

The single skill becomes the only entry under `.apm/skills/`. The resulting package has `x-workplace.type: skill` and ships no agents, no prompts, no hook. Use this to promote a focused in-repo skill into a standalone shareable package.

## Mapping rules (blank)

Copy the matching template from the packages repo's `_templates/{role-pack,module,skill}/` and replace every occurrence of `PACKAGE_ID` (in `apm.yml`, `README.md`, `scripts/*`) with the chosen id.

## `x-workplace` metadata block

Every package's `apm.yml` MUST contain an `x-workplace:` block. Schema: `_schema/x-workplace.schema.json` in the Workplace-Agent-Packages repo. Required fields: `schemaVersion: 1`, `type`. Optional fields fall back to safe defaults defined in the schema. See [`apm-workflow.md`](../project-initialization/references/apm-workflow.md) Section 3 for field semantics.

For `type: module`, also include `activate:` with `script`, `markerFile`, and `movesRuntimeFolder`.

> **Activation script authoring contract (mandatory for `type: module`).** On harnesses with a hook merge (Claude Code and similar) APM deploys the package's `scripts/` folder **twice** in a consumer project: into the package cache (`apm_modules/<git-group>/<repo>/<id>/scripts/`, which carries the sibling `runtime/` payload) and next to the merged hook config (which does **not**); on the opencode target only the cache copy exists, but the same script can still be launched from the wrong directory. A script that resolves its own package root positionally (`Split-Path -Parent $PSScriptRoot`, `dirname "$0"/..`) and guards each copy step with a bare existence check does nothing at all when invoked from a location without `runtime/` — and then still writes the marker and the `status: "active"` state entry. That is a false-positive activation, and because activation is idempotent on the marker, it permanently suppresses the correct run. Four rules prevent it:
>
> 1. **Resolve the package root by evidence.** Walk up from the script's directory until you find one containing `apm.yml` — and, when `movesRuntimeFolder: true`, also `runtime/`. Honour an explicit `PROJECT_ROOT` / `${PLUGIN_ROOT}` override when present, but never trust a fixed number of parent hops.
> 2. **Fail loudly on a missing payload.** `movesRuntimeFolder: true` with no `runtime/` found is an error: print the resolved root and exit non-zero. Never degrade a missing payload into a silent skip.
> 3. **Write the marker last and conditionally.** Re-check every path the script was supposed to create; on any failed check, exit non-zero **without** writing `.workplace/activated/<pkg>.marker` or appending to `.workplace/state.json`. Recording the resolved root and the copied paths (in the marker or `.workplace/<pkg>/activate.log`) makes a bad run diagnosable.
> 4. **Abort on error, don't fall through.** `$ErrorActionPreference = 'Stop'` in `activate.ps1`, `set -eu` in `activate.sh`.
>
> Consumer-side detection and repair for packages that predate this contract: [`verify-apm-activation.ps1`](../project-initialization/scripts/verify-apm-activation.ps1) and [`apm-workflow.md`](../project-initialization/references/apm-workflow.md) Sections 6.1–6.2.

> **Hook JSON authoring rule.** `.apm/hooks/activate.json` is keyed by lifecycle event name and is consumed only by targets that have a hook merge (Claude Code and similar — upstream's [hooks reference](https://microsoft.github.io/apm/producer/author-primitives/hooks-and-commands/) lists the accepted names and merge targets); the opencode target ignores it entirely. Keep shipping the descriptor for those harnesses, but never rely on it: `scripts/activate.*` must be complete and idempotent on its own, because on this line it is invoked directly by Phase 1.7-APM step 5.2 and judged by `verify-apm-activation.ps1`.
>
> **Executable-trust gate (opt-in, does not block Workplace packages today).** `apm install` can gate dependency-provided hooks / `bin/` executables / self-defined MCP servers behind an `executables:` allow-list in the *consumer's* `apm.yml` or an org policy, approved via `apm approve <package>` / denied via `apm deny <package>` ([reference](https://microsoft.github.io/apm/reference/cli/approve/)). The gate only activates when one of those layers declares a non-empty `executables:` block — Workplace-generated `apm.yml` files don't, so a package's `scripts/activate.sh` installs without extra approval today. Don't design a module's activation flow assuming interactive approval will always be skipped — if a future Workplace release or an org policy turns the gate on, the same package will require `apm approve <package>` after install (`apm policy explain` shows which layer decided).

## Validation gates

The agent MUST run these commands after writing files (unless `--no-validate` is passed):

```bash
cd <id>
apm compile --validate   # only when .apm/instructions/ or .apm/agents/ exists
apm pack --dry-run
```

| Command | What it actually checks (confirmed on APM 0.28.0) |
|---|---|
| `apm compile --validate` | Parses the source primitives under `.apm/` (agents, skills, prompts, hooks) for structural/schema errors, **without** writing any harness-native files (no `AGENTS.md`, no `.opencode/`, etc.). Exits non-zero when the package has nothing compilable, so skip it for `type: skill` and prompts-only packages — the packages repo's CI applies the same condition. |
| `apm pack --dry-run` | Validates `apm.yml` and simulates building a distributable bundle under `./build/` — prints what *would* be packed, writes nothing. It is not a substitute for a real install: it does not deploy primitives into a consumer project the way `apm install` does. May warn about a missing `deployed_files` entry in `apm.lock.yaml`, which is expected before the package has ever been locally installed. Fixed in 0.26.0: subdirectory-prefixed skills are now packed instead of being silently dropped from the bundle. Fixed by 0.28.0: empty `dependencies.apm` / `dependencies.mcp` lists no longer fail validation. **Still not caught:** a map-shaped `dependencies.mcp` block passes here but is silently ignored at install — keep `mcp:` in list form and smoke-test the merge. |

Neither command replaces an end-to-end smoke test (`apm install` in a scratch project — see the CONTRIBUTING checklist below).

> **Note.** Upstream's own recommended verify sequence is longer than Workplace's gate: `apm compile --validate` → `apm compile --dry-run` → `apm view <your-package>` → `apm outdated` → `apm audit`, *then* `apm pack --dry-run` for distribution. Workplace's gate is a deliberate minimal subset (fast, catches structural errors and packaging failures); it does not run `apm compile --dry-run` (placement preview) or `apm audit` (security/drift scan) separately. Adopting the fuller sequence would be a process change to discuss with the user, not something to add unilaterally here. If the environment itself looks broken (git, network, credentials), run `apm doctor` before blaming the package.

Then update the registry index (from the packages repo root):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/regenerate-index.ps1
```

If any gate fails, fix the issue and re-run. Do NOT commit a package that fails either gate.

## CONTRIBUTING checklist (printed by /package-new on success)

1. Smoke-test in a scratch project: write `apm.yml` with a dict-form dep (`git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: <branch>`), run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, and confirm primitives are deployed. Do **not** wait on a session event: the opencode target deploys no hooks, so nothing fires — activate explicitly, exactly as Phase 1.7-APM step 5.2 does.
   For modules, the smoke test has three parts: (a) run `scripts/activate.*` from the **package cache** root and confirm the runtime payload actually landed (`powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/verify-apm-activation.ps1` must exit 0 with status `OK`); (b) delete the marker, copy `scripts/` alone to a scratch folder (no sibling `runtime/`) and run that copy — it must exit **non-zero and write no marker**; if it reports success, the script violates the authoring contract above; (c) re-run the package-cache copy and confirm idempotency (clean no-op).
2. Bump the version in `apm.yml` before each new release; tag the commit.
3. Add a `README.md` section describing usage, MCP requirements (if any), prerequisites, and — for modules — the direct activation command.
4. Open a PR in the Workplace-Agent-Packages repo. CI will run `apm pack --dry-run`, conditional `apm compile --validate`, `x-workplace` JSON Schema validation, and `index.json` drift detection.

## Anti-patterns

- Hand-editing the packages repo's `index.json` instead of running `regenerate-index.ps1`.
- Skipping `scripts/activate.ps1` (must always ship alongside `activate.sh` for cross-platform).
- Embedding hardcoded paths in `activate.sh` instead of using `${PLUGIN_ROOT}` and `${PROJECT_ROOT}`.
- Resolving the package root by a fixed number of parent hops from the script's own directory, and/or writing the activation marker unconditionally. Both together turn a run from the hook-side copy of the script into a silent, sticky false-positive activation — see the activation script authoring contract above.
- Re-declaring an MCP server that Phase 1.5 of `/initialize` already configures (Context7, Atlassian, TaskMaster, Chrome DevTools). CI rejects these.
- Putting Workplace-specific data anywhere other than the `x-workplace:` block — APM strips unknown keys outside it during `apm compile` for certain target formats.
- Treating `.apm/hooks/activate.json` as the activation mechanism. The opencode target deploys no hooks at all, and harnesses with a hook merge execute the descriptor only for event names they rewrite — module activation is the direct script invocation, always.
- Declaring `dependencies.mcp` as a **map** (`mcp: {my-server: {...}}`). APM expects a **list** of objects (`mcp: [{name: my-server, transport: stdio, ...}]`); the map form is silently ignored at install time and current validation does not flag it — always smoke-test MCP merge in a scratch consumer.
- Emitting `targets: all` (or `target: all`) in a package or consumer `apm.yml` — the value is deprecated, silently treated as "field omitted" with a deprecation warning, and will become a hard parse error. Omit the field instead.
- Declaring an `executables:` block in the package's own `apm.yml` "to be safe" — that block belongs in the *consumer's* manifest (it is what the consumer opts into to require `apm approve`), not in the package you are publishing.
- Referencing `apm show`, `apm list <pkg>`, or `apm run activate -p <pkg>` in docs or scripts — none of these exist upstream. Use `apm view <name>`, `apm.lock.yaml` / `apm deps list`, and a direct `scripts/activate.*` invocation respectively (see [`apm-workflow.md`](../project-initialization/references/apm-workflow.md)).
