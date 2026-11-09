---
name: project-update
description: Safe Workplace template update workflow. Use for /update-workplace command, updating Core template files while preserving project customizations, git-based template source, version detection, backup, migration, and validation.
---

# Project Update Skill

> Orchestrates safe updates of the NC AI Workplace template on already-initialized projects.

## Activation

This skill activates when:
- User runs `/update-workplace` command
- User says "Update project", "Re-initialize project", "Upgrade AI Workplace", "Apply template updates"
- Initializer detects `initializationStatus: "active"` and redirects here

## Pre-Condition

`.opencode/rules/.core-version.json` must exist with `initializationStatus: "active"`. If status is `"fresh"` with all hashes `"pending"`, redirect to full initialization via `project-initialization` skill instead.

## Core vs Project Separation

The update process relies on manifest-based safety. **Only files listed in `.core-version.json` are overwritten.** Everything else is preserved.

### What Gets Overwritten (Core)

Exactly the paths listed in `coreFiles` of the template's `.core-version.json` (hashes recomputed in Core Update Step 8):

- `.opencode/opencode.json` — the Core configuration layer (always-on instructions, subagent depth, Core read denials)
- `.opencode/rules/{orchestrator,development}.md`, `.opencode/rules/taskmaster/*.md`, `.opencode/rules/packages-index.json`, `.opencode/rules/project/README.md`
- `.opencode/agents/*.md` — the 5 Core agent definitions (`initializer`, `project-updater`, `infra-specialist`, `documentation-sync`, `codebase-analyzer`)
- `.opencode/skills/<core-skill>/` — the 8 Core skills (`SKILL.md`, `references/`, `scripts/`, `assets/`); never their `project-config.json` / `references/guidelines.md`, and never anything under `.agents/skills/`
- `.opencode/commands/*.md` — the 6 Core commands
- `.opencode/plugins/docs-sync.js`, `.opencode/hooks/docs-sync-check.js` — the docs-sync plugin and its analysis library
- `docs/core/*.md`, `docs/{GETTING_STARTED,ARCHITECTURE,PRESENTATION}.md`, `CHANGELOG.md` — Core documentation (`optional` entries)

### What Is Preserved (Project and package)

- root `opencode.json` — MCP servers, model, watcher, permissions, project instructions
- `AGENTS.md` (including `Project Conventions` and the APM managed section), `README.md`, `docs/INDEX.md`, `docs/project/`
- `.opencode/project_init.md` — the ledger (Smart Merge keeps every project section)
- `.opencode/rules/project/metadata.json` and any project instruction files next to it
- `project-config.json` + `references/guidelines.md` of every context skill — under `.opencode/skills/` (Core pair) and `.agents/skills/` (package skills; restored by the install wrapper after the APM refresh)
- `.opencode/hooks/docs-sync-config.json`, `.opencode/project/**` (analysis artifacts)
- `.opencode/{agents,commands}/project-*.md` — project-authored primitives
- everything APM deployed (`apm.lock.yaml → deployed_files`: `.agents/skills/<pkg-skill>/`, `.opencode/agents/<pkg-agent>.md`, `.opencode/commands/<pkg-prompt>.md`), `apm.yml`, `apm.lock.yaml`, `.workplace/`, `.apm/` — refreshed only by Core Update Step 3.5

## Update Process Overview

```
Pre. Git Source Setup → 0. Version Detection → 1. Backup Creation →
2. Migration (pending only) → 3. Customization Scan → 4. Core Update →
5. Preservation Verify → 6. Config Reconciliation → 7. Validation →
8. Report & Cleanup
```

## Phase Reference Docs

Each phase has detailed implementation instructions in `references/`:

| Phase | Reference Doc | Summary |
|-------|--------------|---------|
| Pre | `references/git-source-setup.md` | Ask git URL + optional branch, pre-fill from saved source, clone to `.opencode/.temp-update/`, validate |
| 0-1 | `references/detection-and-backup.md` | Version comparison, hash checks, backup creation |
| 2-3 | `references/migration-and-scan.md` | Pending migrations (any update type), customization inventory |
| 4 | `references/core-update.md` | Copy Core files from cloned template, smart merge |
| 5-7 | `references/preservation-and-validation.md` | Verify project files, reconcile configs (incl. guidelines.md health check for active skills), validate links |
| 8 | `references/cleanup-and-report.md` | Generate report, confirm temp directory deletion |

### Reading Instructions

Read reference docs **lazily** — only load the reference for the phase currently being executed. Do not read all references upfront.

## Integration Points

- **Version tracking:** `.opencode/rules/.core-version.json` (also stores `templateSource.url` and `templateSource.branch` after first update)
- **Template source:** `.opencode/.temp-update/` (temporary clone, gitignored, deleted after update)
- **Backup location:** `.opencode/.backups/backup-YYYY-MM-DD-HHmmss/`
- **Project metadata:** `.opencode/rules/project/metadata.json`
- **Initialization config:** `.opencode/project_init.md` (smart merge for mixed Core/Project sections)
- **Workplace documentation (upstream):** [`MIGRATION_BACKUP.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md) is the user-facing guide to this command — [what is preserved vs overwritten](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md#what-is-preserved-what-is-overwritten), [backups](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md#backups), [rollback](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md#rollback), [migrations](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md#migrations) — and [`CUSTOMIZATION.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/CUSTOMIZATION.md) explains which customizations survive. Quote them when the user asks what an update will touch. Both ship in the template repo, not in the project: resolve via [`workplace-docs.md`](../project-initialization/references/workplace-docs.md) or `fetch-workplace-doc.js` — during an update they are already local in `.opencode/.temp-update/docs/`.

## Error Handling

- If `.core-version.json` is missing → redirect to full initialization
- If git clone fails → ask user to verify URL and network access
- If backup creation fails → cancel update (safety precaution)
- If validation fails after update → rollback from backup
- If project files are lost → immediately restore from backup and cancel

## Progress Tracking

Show progress after each phase:
```
📊 Update Progress: [current]/9 phases
✅ Git Source Setup (Pre)
✅ Version Detection (Phase 0)
⏳ Backup Creation (Phase 1 - in progress...)
⬜ Remaining phases...
```
