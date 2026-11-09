---
description: Scaffold a new APM package in the Workplace-Agent-Packages repo (from a module, a skill, or blank)
---

# /package-new — Scaffold a new APM package

> Authors a new package as `<id>/` at the root of the standalone **Workplace-Agent-Packages** repo (a local clone of `apmPackages.registryRepoUrl`) from one of three sources: an existing module folder, a single in-repo skill, or a blank template. Always finishes by running `apm pack --dry-run`, `apm compile --validate` (when the package has something compilable), and that repo's `scripts/regenerate-index.ps1`.

> **Catalogue location.** The package catalogue no longer lives in this repo. It was split into the Workplace-Agent-Packages repo (`.opencode/rules/.core-version.json → apmPackages.registryRepoUrl`), where each package is a top-level `<id>/` directory. Clone that repo first and run `/package-new` against it; open the PR there.

## Knowledge sources (read before acting)

`docs/core/APM_PACKAGES.md` is the **user-facing APM guide**. It lives only in the **AI Workplace template repository** — it is **not** shipped into initialized projects. Do **not** open a project-local `docs/core/APM_PACKAGES.md` (it is usually absent).

Resolve it with the standard contract in [`workplace-docs.md`](../skills/project-initialization/references/workplace-docs.md) §2, or run `node .opencode/skills/project-initialization/scripts/fetch-workplace-doc.js core/APM_PACKAGES.md`. **Fallback URL** when `templateSource` is missing: `{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md`.

Relevant sections for this command (fallback anchors on `master`):

| Topic | Section |
|---|---|
| Catalogue / package types | [#catalogue-workplace-agent-packages-repo](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#catalogue-workplace-agent-packages-repo), [#package-types](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#package-types) |
| Install after publishing | [#installing-packages](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#installing-packages) |
| Authoring overview + validation | [#authoring-new-packages](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#authoring-new-packages) |
| Failed install / CI index drift | [#troubleshoot-a-failed-install](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md#troubleshoot-a-failed-install) |

Full procedure and rationale also live in:

- `.opencode/skills/apm-packaging/SKILL.md` (intent routing + authoring mapping rules)
- `.opencode/skills/project-initialization/references/apm-workflow.md` (Section 8 authoring; Sections 2 / 9–10 for CLI contracts and troubleshooting)

## Usage

Arguments: `$ARGUMENTS` — parse the source mode and flags listed below.

| Source | Invocation | Result |
|---|---|---|
| Existing module folder | `/package-new --from-module <name-or-path>` | Convert a module (external clone path) into `<id>/` in the packages repo. |
| Single skill | `/package-new --from-skill <skill-name>` | Promote `.opencode/skills/<skill-name>/` to a standalone `type: skill` package. |
| Blank scaffold | `/package-new <id>` | Copy the packages repo's `_templates/role-pack/` (or `_templates/module/` / `_templates/skill/`) with placeholders filled. |

Flags:

- `--type <role-pack|module|skill>` — which template to copy when source is blank. Defaults: `role-pack` for blank, inferred for `--from-module` / `--from-skill`.
- `--roles <role1,role2>` — initial value of `x-workplace.targetRoles`.
- `--no-validate` — skip the `apm pack --dry-run` + conditional `apm compile --validate` gates (CI will still enforce them).

## Prerequisites

1. **Phase 0 (APM CLI Bootstrap)** must succeed first — see `.opencode/skills/project-initialization/references/apm-bootstrap.md`. If `apm --version` fails, the command aborts before doing any filesystem work. The supported baseline is `.opencode/rules/.core-version.json → apmVersionExpected` (**0.28.0**); if the environment itself looks broken, `apm doctor` reports git / network / credential state.
2. A local clone of the Workplace-Agent-Packages repo (`apmPackages.registryRepoUrl`) is available; run the command from that clone's root.
3. The package id is lowercase kebab-case and unique among the repo's top-level `<id>/` directories.

## What the command does

1. Runs Phase 0 (APM CLI check).
2. Resolves and skims the relevant **APM_PACKAGES.md** sections (authoring, catalogue, install-after-publish) via `templateSource` as above — not a project-local path.
3. Loads the `apm-packaging` skill and follows its **Authoring procedure** for the chosen source mode (existing module / single skill / blank). For exact CLI / contract details, use `apm-workflow.md`.
4. Writes `<id>/{apm.yml, README.md, .apm/...}` at the packages repo root and (for `module`) `scripts/activate.{sh,ps1}`.
5. Validates inside the new package directory: `apm pack --dry-run` always, plus `apm compile --validate` only when `.apm/instructions/` or `.apm/agents/` exists (compile exits non-zero on a package with nothing compilable).
6. Regenerates the packages repo's `index.json` via its `scripts/regenerate-index.ps1`.
7. Prints a CONTRIBUTING checklist (open a PR in the packages repo, bump version, add docs, smoke-test in a scratch project — install steps: APM_PACKAGES.md → Installing packages).

## Status contract

| Outcome | What it means |
|---|---|
| `SUCCESS` | Package directory exists, validates, and `index.json` is in sync. The agent prints next steps. |
| `WARNING` | Package created but at least one validation gate failed. The user must fix and re-run validation before opening a PR. |
| `FAILURE` | Package could not be created (Phase 0 failed, source not readable, id collision). No partial files left on disk. |
