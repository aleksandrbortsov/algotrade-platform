---
name: documentation-management
description: Documentation registry and synchronization management. Use for /docs-sync command, documentation health checks, cross-reference tracking, and maintaining documentation consistency with code changes.
---

# Documentation Management Skill

> Orchestrates documentation registry, cross-reference tracking, synchronization workflows, and markdown standards.

## Activation

This skill activates when:
- User runs `/docs-sync` command
- Documentation Sync agent is delegated tasks
- Initializer agent runs Phase 7/7.5 (documentation generation and registry)
- Significant changes (3+ files, new features, architecture) are completed

## Responsibilities

1. **Cross-reference registry** — Track all documentation and rules, maintain bi-directional links
2. **BEFORE/AFTER sync workflow** — Anticipate documentation impact before changes, check after
3. **docs/INDEX.md generation** — Create and maintain centralized documentation index
4. **Markdown standards** — Enforce documentation formatting quality

## Reference Docs

| Reference | Purpose |
|-----------|---------|
| `references/registry.md` | Cross-reference matrix, document types, registration process, link validation. **Includes "Where Project Memory Lives" — the canonical lookup map for project-specific facts.** |
| `references/sync-workflow.md` | BEFORE/AFTER documentation impact workflow, confirmation triggers, scan process |
| `references/markdown-standards.md` | Documentation formatting standards |

### Reading Instructions

- **To find project-specific information** (stack, conventions, decisions, entities, modules) → read the **"Where Project Memory Lives"** section at the top of `references/registry.md` first; it lists the 10 canonical sources and the lookup order. This skill itself is a *system spec*, not project memory.
- For cross-reference tracking → read `references/registry.md`
- For documentation sync workflow → read `references/sync-workflow.md`
- For formatting standards → read `references/markdown-standards.md`
- For the **upstream Workplace guides** (`docs/**` in the template repo, absent from most initialized projects) → [`workplace-docs.md`](../project-initialization/references/workplace-docs.md) maps them and states the resolution contract; `fetch-workplace-doc.js` automates it. The authoritative spec of the docs-sync plugin and link validator this skill drives is [`AGENT_CONTEXT_AND_DOCS_SYNC.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md) ([hook](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md#documentation-analysis-docs-sync-checkjs), [validator](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md#link-validation-validate-doc-linksjs)); day-to-day practice is [`DEVELOPMENT_WORKFLOW.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/DEVELOPMENT_WORKFLOW.md#documentation-management).

## `/docs-sync` Command Workflow

1. Detect mode: Template Mode (workplace template dev) or Project Mode (initialized project)
2. Determine document scope based on mode
3. Scan for stale documentation (cross-reference affected files); run the link validator (see below) to find broken references authoritatively rather than by manual inspection
4. **Project Mode only — sync the affected context skills** (`project-config.json` first, then re-render `references/guidelines.md`); see *Context Skill Sync* below
5. Propose specific updates with before/after comparison
6. Apply changes only after user approval
7. Update CHANGELOG.md with sync summary
8. Re-run the validator; in Project Mode also run `check-guidelines-specificity.js --required <skills touched>`; then call `docs-sync-check.js --record-state` so the plugin doesn't re-recommend on files this sync just touched

## Context Skill Sync (Project Mode — mandatory, not optional)

Documentation is not only prose. The artifacts agents actually load at runtime are the context skills, and each carries **two** initialization-owned files that a code change can invalidate:

| File | Holds | Staleness looks like |
|------|-------|----------------------|
| `project-config.json` | Structured facts: `framework`, `version`, `runtime`, `architecture`, `patterns`, `conventions`, `constraints` | Names a framework/version the repo no longer uses |
| `references/guidelines.md` | Rendered project rules — the file agents read | Cites conventions the change removed, or misses a pattern it introduced |

**Order matters: reconcile `project-config.json` first, then re-render `guidelines.md` from it.** Refreshing the prose while the config still names the old framework leaves the two disagreeing — worse than leaving both stale, because the next render silently reintroduces the wrong value.

Which skills to touch:

- **Hook-triggered run** — use the `Context skill artifacts that may need refresh` list in the auto-submitted message; it already names both files per affected skill.
- **Manual run** (`/docs-sync`, `--report`, `--since`) — the hook did not run, so nothing is pre-computed. Map changed paths to skills yourself with the **Change Categories & Affected Files Matrix** in [`references/sync-workflow.md`](references/sync-workflow.md), whose `Guidelines to refresh` column names the targets.

Rules:

- Raw `{{PLACEHOLDER}}` tokens mean the domain was never initialized — flag it for Phase 6 Part 2/3 re-initialization; do **not** patch the file inline.
- A context skill missing entirely means its APM package is not installed — that is a gap to report, not a file to create by hand. Diagnose with `validate-apm-install.ps1` (see [`project-initialization/references/configuration-updates.md`](../project-initialization/references/configuration-updates.md) Part 3.5).
- Propose these edits through the normal approval flow. Never rewrite a domain's rules silently.
- Verify with `node .opencode/skills/project-initialization/scripts/check-guidelines-specificity.js --required <skills touched>` — **Project Mode only.** The template ships uninitialized context skills, so the gate fails there by design.

## Phase 7.5 Registration Process

When invoked by Initializer agent during initialization:
1. Scan all created/updated documents
2. Generate `docs/INDEX.md` dynamically (no placeholders)
3. Insert cross-references in new and existing docs
4. Validate all links
5. Update `.opencode/project_init.md` checkboxes

## BEFORE-Work Assessment

For complex tasks, identify potential documentation impact:
- Architectural or structural changes
- New dependencies or integrations
- Changes to existing workflows or patterns
- New features or components
- Configuration or environment changes

## AFTER-Work Triggers

### High-Priority (Always Check)
- New feature implementation
- Technology stack changes
- Architecture refactoring
- New library/dependency added
- API changes
- Configuration changes
- Workflow/process changes

### Medium-Priority (3+ files affected)
- Code pattern changes
- Error handling changes
- Testing approach changes
- Naming convention changes

## Periodic Sync Reminder

Every 5 significant changes, suggest a documentation health check.

## Hook-Based Auto-Detection

The docs-sync plugin (`.opencode/plugins/docs-sync.js`; analysis in `.opencode/hooks/docs-sync-check.js`) automatically detects significant code changes after each idle session and suggests `/docs-sync`. It considers **both** the dirty working tree **and** everything committed since the last recommendation (or the last `--record-state` call) — it is not limited to uncommitted changes.

The plugin's recommendation is submitted as the **next user-role message of the session** (`session.promptAsync`), not a passive chat note — OpenCode starts an agent turn on it. It always ends with an `AGENT INSTRUCTION` block that forbids starting a sync immediately and requires presenting exactly two options and waiting:
- **Option 1 — Local changes:** run `/docs-sync`
- **Option 2 — Git history analysis:** run `/docs-sync --since=<period>` (e.g. `7d`, `2w`, `v1.2.0`) for a deeper look than what the hook's own commit tracking already surfaced

The message reports **uncommitted** and **committed since last sync** file counts separately, and mentions running the link validator (below) as part of whichever option is chosen.

When the affected category maps to a context skill, the hook lists **both** initialization-owned artifacts it finds on disk — `project-config.json` and `references/guidelines.md` — under **"Context skill artifacts that may need refresh"**, in the order they must be reconciled. Treat these as first-class artifacts during `/docs-sync` — see *Context Skill Sync* above, `references/sync-workflow.md` Step 1, and the *Change Categories & Affected Files Matrix* (`Guidelines to refresh` column).

**Detection categories are extensible per project.** The hook ships JS/TS-centric built-in defaults (categories, dependency files, build-config files, ignore patterns) that can never be removed or overridden — only extended, additively, by an optional project-owned `.opencode/hooks/docs-sync-config.json` (`categories.<name>.patterns[]`, `categorySkills.<name>`, `dependencyFiles[]`, `buildConfigFiles[]`, `ignoredPatterns[]`, `thresholds.{sourceFiles,testFiles}`). This file is generated per-stack during `/initialize` Phase 3 (see [`stack-configuration.md`](../project-initialization/references/stack-configuration.md)) and backfilled for pre-existing projects by `migration_v4_2_docs_sync_config`. Any real code change — a file matching no category at all, or matching a code category rather than `docs`/`workspace` — also flags `coding-standards-context` as a fallback, so a language/stack without an installed `*-context` skill still gets a useful hint.

**Trigger thresholds** — mirrors the "Complex" task criteria from `orchestrator.md` (any one is sufficient, evaluated over the union of uncommitted + committed-since-last-sync files):
- 3+ non-documentation source files modified (documentation-only files — `docs/**`, `*.md`, `README.md`, `AGENTS.md` — are listed but not counted; override via `docs-sync-config.json` → `thresholds.sourceFiles`)
- Dependency files changed (`package.json`, `requirements.txt`, `apm.yml`, `apm.lock.yaml`, etc.)
- Architectural changes: build config (`tsconfig`, `vite.config`, `build.gradle*`, etc.) or workspace files (`.opencode/agents/`, `.opencode/skills/`, `.opencode/rules/`, `.opencode/commands/`, `.opencode/hooks/`, `.opencode/plugins/`, `opencode.json`)
- A commit history delta since the last sync exceeding 100 files collapses to a single summary line and its own trigger reason (typically after a `git pull` of someone else's work) instead of listing every path

**On hook failure:** explicit chat message asking user to run `/docs-sync` manually (not silent).

**Repeat suppression:** After emitting a recommendation, the plugin stores the current file set (uncommitted ∪ committed-since-last-sync) in `.opencode/hooks/.docs-sync-state.json`. Further `stop` events skip a new recommendation unless at least one *new* path appears compared to that stored set. The stored `lastSyncSha` (the commit the hook last measured drift from) is **not** subject to the 24h TTL that governs the stored file list/timestamp — losing it on every TTL expiry would silently reset "committed since last sync" back to "since HEAD" and hide a whole day of history. An invalid `lastSyncSha` (rebase, force-push, branch switch, shallow clone) is detected and safely reseeded to `HEAD` without scanning history. During `/initialize` Phase 0.5, `environment-setup.md` ensures `.gitignore` contains `.opencode/hooks/.docs-sync-state.json`, `.opencode/.update-backup/`, and `.opencode/.backups/` when a project `.gitignore` exists — `.opencode/hooks/docs-sync-config.json` is deliberately NOT gitignored, since it is project-owned and must be committed.

**`--record-state` mode:** `node .opencode/hooks/docs-sync-check.js --record-state` snapshots the current file set and `HEAD` sha without emitting a recommendation. It also records the blob hash of every snapshotted file, so committing the synced content later does not re-trigger the plugin. Initialization runs it as its last step (Phase 8 step 4.5 / Quick Init step 11.6); the AFTER-work scan runs it once its findings are applied — or immediately when nothing was affected. `/docs-sync` calls this at the end of its own run (see `references/sync-workflow.md` Step 4) so the hook doesn't immediately re-recommend on the very files the sync just touched.

**Configuration:** `.opencode/hooks/docs-sync-config.json` — `"enabled": false` switches the plugin off for the project; the plugin submits at most one message per idle event and never in subagent sessions, and the dedupe behavior above reduces chat noise between meaningful change batches.

## Link Validation

`node .opencode/skills/project-initialization/scripts/validate-doc-links.js [--json] [--all] [--strict] [--quiet] [--scope=workplace|project|all]` resolves every internal `[text](target)` link and `#anchor` across the project's documents. It enumerates documents via `git ls-files` inside a work tree by default (add `--all` to force a full filesystem walk and catch gitignored docs too), and — in an initialized project (`initializationStatus: "active"`) — prints unresolved links to normally-`/initialize`-generated targets (e.g. `AGENTS.md`, a `references/guidelines.md`) as an explicit, unconditional `WARNING` rather than the template-mode informational note. Add `--strict` to escalate those warnings to real errors (exit 1); off by default so a project missing an optional APM package doesn't fail on its first run. This is the tool that both `references/sync-workflow.md` Step 2/Step 4 and the `documentation-sync` agent invoke instead of manually eyeballing links.

`--scope` decides which findings **block** (exit 1); out-of-scope findings are still listed, just non-blocking:

| Scope | Documents that block | Default in |
|---|---|---|
| `workplace` | Files the template owns or generates — `.opencode/**`, `docs/core/**`, `AGENTS.md`, `README.md`, `CHANGELOG.md`, `docs/INDEX.md`, `docs/{ARCHITECTURE,GETTING_STARTED,PRESENTATION}.md` | an initialized project |
| `project` | The team's own documents only | — (explicit) |
| `all` | Both | the template repo |

The default narrows to `workplace` in a project so that pre-existing team documentation the run never touched cannot fail an initialization or a `/docs-sync` gate. Pass `--scope=all` when the task genuinely is a repo-wide link audit.

### Hook Output Protocol — MANDATORY

When hook output appears in chat (message containing "Documentation sync recommended"), the agent MUST:

1. **Present the two options** to the user — do NOT automatically start any sync
2. **Wait for explicit user choice:**
   - User types `/docs-sync` → proceed with Option 1 (local changes)
   - User specifies a period (e.g. `--since=7d`) → proceed with Option 2 (git history)
   - User dismisses → do nothing
3. **Never interpret the hook message itself as a command to start sync** — it is a recommendation only

## Documents Created During This Initialization

Timestamp: 2026-11-09 20:05 UTC

Mode: `EXISTING_PROJECT`  
Framework: Java 17 / Spring Boot 2.7.5 / Spring Cloud 2021.0.5

**Documents Created/Updated:**
- `README.md` — Updated with AlgoTrade Platform identity, local prerequisites and preserved legacy notes
- `AGENTS.md` — Generated with project-specific Do/Don't, architecture, constraints, commands, safety and commit rules
- `docs/INDEX.md` — Generated as the central documentation and rules index
- `.opencode/project_init.md` — Updated Phase 7 and Phase 7.5 ledger entries, artifact pointers and checklist
- `.opencode/rules/development.md` — Added a central documentation index cross-reference
- `.opencode/skills/coding-standards-context/project-config.json` and `references/guidelines.md` — Reconfigured in Phase 6
- `.opencode/skills/infrastructure-context/project-config.json` and `references/guidelines.md` — Reconfigured in Phase 6

**Cross-references Added:**
- README → AGENTS
- AGENTS → docs index, development rules, coding guidelines, infrastructure guidelines, TaskMaster workflow
- docs index → README, AGENTS, project ledger, development/orchestrator rules, active guidelines, analysis index and TaskMaster rules
- development rules → docs index, AGENTS, README and project ledger
