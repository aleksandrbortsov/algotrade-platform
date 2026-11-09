---
description: Update the Workplace Core from the template source, preserving project customizations
agent: project-updater
subtask: false
---

# Update Workplace

> **Core Command** - Safely update the AI Workplace template to a newer version

## Overview

This command launches the Workplace update process. The AI agent clones a fresh template from a git URL you provide, compares versions, creates a backup, and applies the update while preserving all your project customizations.

## How to Use

Type `/update-workplace` in the OpenCode prompt to start the update process (the command is bound to the `project-updater` agent).

## Agent Instructions

**When this command is triggered, the AI agent MUST:**

1. **Run as the Project Updater agent** (OpenCode binds it through the command frontmatter; another agent reading this text should read `.opencode/agents/project-updater.md` and follow it):
   - The Project Updater reads the `project-update` skill for phase orchestration
   - The Project Updater reads phase reference docs from `skills/project-update/references/` as needed

2. **The Project Updater Agent will:**
   - Ask for the git URL of the new template version
   - Clone to `.opencode/.temp-update/`
   - Validate the cloned template structure
   - Detect update type (patch/minor/major)
   - Create a full backup at `.opencode/.backups/`
   - Run pending migrations (any update type; a project with none skips the phase)
   - Scan and preserve all project customizations
   - Update Core files from the cloned template
   - Verify all customizations survived
   - Reconcile configs and validate integrity
   - Generate update report
   - Ask user to confirm temp directory cleanup

## Prerequisites

- Project must be initialized (`.opencode/rules/.core-version.json` with `initializationStatus: "active"`)
- Git must be available on the system
- Network access to the template repository

## What Gets Preserved

Never written by the Core copy (only paths listed in `coreFiles` are overwritten):

- root `opencode.json` — MCP servers, model, watcher, permissions, project instructions
- `.opencode/rules/project/metadata.json` — project identity
- `AGENTS.md` → `Project Conventions` section and the `<!-- apm:start -->` … `<!-- apm:end -->` region — team-wide rules and compiled package instructions
- `project-config.json` + `references/guidelines.md` of every context skill — `.opencode/skills/{coding-standards-context,infrastructure-context}/` and every `.agents/skills/<name>/`
- `.opencode/hooks/docs-sync-config.json`, `.opencode/project/` — plugin choices and analysis artifacts
- `.apm/` in the repo root — the project's own APM primitive overrides
- `docs/project/`, `docs/INDEX.md` — project documentation
- `.opencode/project_init.md` Decision Log, Open Gaps, Initialization Summary (Smart Merge)

> **APM-owned files are refreshed, not preserved.** Step 3.5.b re-runs `apm install` through `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`: APM redeploys everything its packages own (package agents, commands and skill bodies under `.agents/skills/`), and the wrapper then restores the initialized `project-config.json` / `guidelines.md` of every package skill (logged as `preserved:`). Any other hand-edit inside a package-owned file is lost unless it was promoted to `.apm/` — see [CUSTOMIZATION.md](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/CUSTOMIZATION.md).

## Troubleshooting

### Project not initialized
- Error: "initializationStatus is fresh" means the project hasn't been initialized yet
- Run `/initialize` first, then use `/update-workplace` for future updates

### Git clone fails
- Verify the URL is correct and accessible
- Check network connectivity
- For private repos, ensure authentication is configured

### Update fails mid-process
- The agent will automatically rollback from the backup
- Check the error details and try again
- Backup location: `.opencode/.backups/backup-YYYY-MM-DD-HHmmss/`

## Related Commands

- `/initialize` - Full project initialization (use for first-time setup)
- `/quick-init` - Fast template initialization

## Related Files

- [Project Updater Agent](../agents/project-updater.md) - Agent handling this command
- [Project Update Skill](../skills/project-update/SKILL.md) - Update workflow orchestration
- [Workplace Documentation Map](../skills/project-initialization/references/workplace-docs.md) - Which upstream `docs/**` guide answers what, and how to resolve it (local first, then the template’s Git URL via `scripts/fetch-workplace-doc.js`)
- [MIGRATION_BACKUP.md](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md) - User-facing guide to this command: [update in 3 steps](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md#update-in-3-steps), [preserved vs overwritten](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md#what-is-preserved-what-is-overwritten), [backups](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md#backups), [rollback](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md#rollback)
- [CUSTOMIZATION.md](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/CUSTOMIZATION.md) - Which customizations survive an update ([quick reference](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/CUSTOMIZATION.md#update-safety-quick-reference))

---

*This is a Core command for Workplace template updates.*
