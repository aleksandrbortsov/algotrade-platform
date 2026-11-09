---
description: Fast template setup without the full initialization workflow
agent: initializer
subtask: false
---

# Quick Init

> **Core Command** - Fast template initialization without full configuration workflow

## Overview

This command provides a streamlined alternative to the full 15-step project initialization. It sets up the essential template structure quickly, allowing you to configure technology stack and component rules later.

> **Reference documentation.** [`docs/core/INITIALIZATION.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/INITIALIZATION.md) explains [how Quick Init differs from the full run](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/INITIALIZATION.md#2-two-entry-points-full-vs-quick), and [`docs/GETTING_STARTED.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/GETTING_STARTED.md) is the user-facing quick start ([verification checklist](https://{insert correct url}/-/blob/OpenCodeWP/docs/GETTING_STARTED.md#verification-checklist)). Both live in the template repo, not in an initialized project — resolve via [`workplace-docs.md`](../skills/project-initialization/references/workplace-docs.md) or `scripts/fetch-workplace-doc.js`.

## How to Use

Type `/quick-init` in the OpenCode prompt (the command is bound to the `initializer` agent):

```
/quick-init
```

No project name argument is required. The agent will auto-detect the project name and ask you to confirm.

## Agent Instructions

**When this command is triggered, the AI agent MUST:**

0. **Run APM CLI bootstrap (Step 0, graceful):**
   - Follow `.opencode/skills/project-initialization/references/apm-bootstrap.md` verbatim (consent-gated install, PATH-refresh ladder, persist `apmVersion` to `.opencode/rules/.core-version.json`)
   - On failure or user decline: do NOT abort (unlike `/initialize`) — record `apmAvailable=false`, print a one-line notice, and continue; Step 4.5 below is then skipped

1. **Detect project name** (metadata phase):
   - Read `package.json` "name" field (if present)
   - Fallback: use workspace directory name
   - Ask user to confirm: "Project name detected: {{name}}. Use this? (y/custom)"
   - If user provides custom name, use it for README and any project references

2. **Check for update scenario:**
   - Read `.opencode/rules/.core-version.json` if it exists
   - If `initializationStatus: "active"` → Warn user and offer to proceed or use full update workflow
   - If `initializationStatus: "fresh"` or file doesn't exist → Continue with Quick Init

3. **Execute Quick Init workflow** — as the Initializer agent (bound by the command frontmatter), reading the `project-initialization` skill and its `quick-init.md` reference:

   **Step 2: Generate/Update the project-level `opencode.json` (watcher exclusions, read denials)**
   - Create new or append missing entries to existing file
   - Include: node_modules/, dist/, build/, .git/, logs/, .env files, etc.

   **Step 3: Verify the Core commands directory (read-only)**
   - Create `.opencode/commands/` directory if missing (empty); recommend `/update-workplace` to restore Core commands
   - Inventory the Core commands shipped with the Workplace template (`initialize`, `quick-init`, `package-new`, `update-workplace`, `taskmaster-init`, `docs-sync`)
   - **Do NOT create, copy, edit, or template any `.md` file in `.opencode/commands/`.** Synthetic generation of `review.md`/`bugfix.md`/`onboard.md`/`feature.md`/`refactor.md`/`test.md` was removed in v3.0.0. Quick Init activates no role packs and no full modules, so no role-specific commands are added; commands from role-agnostic packages appear only when accepted in Step 4.5 (deployed by `apm install`).

   **Step 4: Generate MCP Configuration**
   - Create `opencode.json` with base servers only (Context7, Atlassian, TaskMaster, Chrome DevTools)
   - Do NOT add role-specific MCP servers (Figma, Postman, etc.)
   - Skip if file already exists

   **Step 4.5: APM package offer (optional)**
   - Skipped when `apmAvailable=false`. Run `powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -RoleAgnosticOnly -Mode builtin` (built-in registry; `-AllowGitFallback` for private hosts; offline snapshot is the last resort, with a staleness warning)
   - Offer **one** batched multi-select with two groups: every resolved package whose `targetRoles` is empty (computed live from the catalogue, never a fixed list), plus — per reference Step 4.5.b.1 — the owning package of each domain the Step 1 stack scan actually **detected**, labelled with its evidence (e.g. "`prisma/schema.prisma` found → `backend-developer`"). Detection is not role selection; declining anything is always acceptable and is recorded as a gap, not a gate
   - On selection: write/merge `apm.yml` (dict form, merge by alias), credential pre-flight, `apm install` (the project `apm.yml` declares `targets: [opencode]`), verify `apm.lock.yaml`; always finish with `-Cleanup` of the temp selection file
   - Full procedure: [`.opencode/skills/project-initialization/references/quick-init.md`](../skills/project-initialization/references/quick-init.md) Step 4.5

   **Step 5: Update README.md**
   - Replace template name with the confirmed project name from step 1

   **Step 6: Create Project Customization Structure**
   - Create `.opencode/rules/project/` with templates
   - Generate README files for customization guides
   - Create `.opencode/rules/project/metadata.json`

   **Step 6.5: Mandatory Core Context Skill Setup (UNCONDITIONAL)**
   - For each entry in `coreContextSkills` (always: `coding-standards-context`, `infrastructure-context`):
     - If `project-config.json` `initialized` is not `true`: run a minimal Part 2 question set with sensible defaults (see [`.opencode/skills/project-initialization/references/configuration-updates.md`](../skills/project-initialization/references/configuration-updates.md), Part 2 → Default questions for core skills) — even if no relevant tech is detected.
     - Generate `references/guidelines.md` from `references/template.md` + `project-config.json` (Part 3).
     - Run Part 3.5 verification scoped to `coreContextSkills`. **This is a hard gate** — quick-init MUST NOT advance to Step 7 if any core `guidelines.md` is missing or contains `{{PLACEHOLDER}}` tokens.
   - This step does NOT activate any role pack and does NOT ask role questions; it only ensures the two universal core context skills are usable by AI agents from day one.

   **Step 7: Finalize Version File**
   - Update `.opencode/rules/.core-version.json`: set `initializationStatus` to `"active"`
   - Calculate SHA-256 hashes for all Core files

   **Step 8: Codebase Analysis via Explore Subagent**
   - Launch built-in Explore subagent for deep codebase analysis
   - Analyzes: project structure, technology stack, code patterns, API endpoints, testing, conventions
   - Results enrich AGENTS.md generation with comprehensive project information
   - Context isolation: analysis output stays in Explore subagent, keeping main context clean

   **Step 9: Generate AGENTS.md (Enriched by Explore Analysis)**
   - Use agents-template.md (in skills/project-initialization/references/) — read its **Brevity Principle** and **Mandatory Dialogue Mechanics** before starting.
   - Use Explore subagent analysis as primary data source for detection (architecture, constraints, conventions, structure).
   - Supplement with: package manager (lock files), dev commands (package.json scripts), project description.
   - **Ask all 7 mandatory questions** (Explore-detected defaults shown for each; no silent skip):
     1. Project description (≤ 240 chars).
     2. Architecture style — label + 1 line per major layer.
     3. Do's — 3-7 short bullets.
     4. Don'ts — 3-7 short bullets.
     5. **Constraints & Non-Goals** — 3-7 bullets (perf, runtime/browser, compliance, deps, legacy, out-of-scope). MUST be non-empty.
     6. Code style + commit format (1-2 lines).
     7. Project structure pointers (5-10 key paths).
   - **Apply the 5-line spillover rule**: long answers → an **already-present** canonical channel (`Project Conventions → ### {topic}` subheading inside the same AGENTS.md, or one of the two core-context `guidelines.md` rendered in step 6.5) with a `→ See …` link left in AGENTS.md. Quick Init does NOT create `docs/project/*.md` files.
   - Detect and optionally create nested AGENTS.md for components.
   - **MANDATORY**: emit the `Project Resource Map (read first)` block at the top of root AGENTS.md (forward-references `docs/INDEX.md` — generated in Step 9.5).
   - **MANDATORY**: if Step 4.5 installed packages, the generated `AGENTS.md` must carry the `<!-- apm:start -->` / `<!-- apm:end -->` pair from `agents-template.md` and the project's `apm.yml` must set `compilation.agents_md.mode: managed_section` — `apm compile` owns only the region between the markers; edit only Workplace-managed sections outside them (same rule as `/initialize` Phase 7).
   - **MANDATORY**: emit non-empty `Architecture (TL;DR)` and `Constraints & Non-Goals` sections (each 3-7 lines/bullets).
   - **MANDATORY**: ensure `Additional Resources` first bullet is `docs/INDEX.md`.
   - **Brevity audit before write**: no section may exceed its hard limit; spill over otherwise.

   **Step 9.5: Generate minimal `docs/INDEX.md` (UNCONDITIONAL)**
   - Create `docs/INDEX.md` so that the AGENTS.md Resource Map link resolves immediately after Quick Init.
   - Inventory only what Quick Init actually produces / preserves:
     - `README.md`
     - `AGENTS.md`
     - `opencode.json` (watcher exclusions + MCP servers)
     - `opencode.json`
     - `.opencode/rules/.core-version.json`
     - `.opencode/rules/development.md` (if present)
     - `.opencode/skills/coding-standards-context/references/guidelines.md`
     - `.opencode/skills/infrastructure-context/references/guidelines.md`
     - any pre-existing `docs/*.md` files
   - Use the same INDEX.md structure as Phase 7.5 ([documentation.md → Step 2](../skills/project-initialization/references/documentation.md)), but mark the file with a header note:
     `> Minimal index generated by /quick-init. Run /initialize to regenerate the full discovery-based index.`
   - **Hard gate**: after writing, grep `AGENTS.md` for the literal `docs/INDEX.md` — must appear at least twice (Resource Map + Additional Resources). If not, fix AGENTS.md before completion.

4. **Present completion summary** with status of each step

## What Quick Init Does

| Step | Action | Status |
|------|--------|--------|
| 0 | APM CLI | Detected / installed via [apm-bootstrap.md](../skills/project-initialization/references/apm-bootstrap.md) (graceful skip allowed — never blocks) |
| 1 | Project name | Auto-detected and confirmed |
| 2 | `opencode.json` | Created/Updated (watcher.ignore, permission.read) |
| 3 | `.opencode/commands/` | Read-only inventory of Core commands (no synthetic generation) |
| 4 | `opencode.json` | Base MCP servers only (Context7, Atlassian, TaskMaster, Chrome DevTools) |
| 4.5 | **Role-agnostic APM packages** | Optional offer of empty-`targetRoles` packages resolved live from the catalogue; `apm.yml` + `apm.lock.yaml` only when accepted |
| 5 | `README.md` | Project name updated |
| 6 | `.opencode/rules/project/` | Customization structure + metadata |
| 6.5 | **Core context skills** | `coding-standards-context` + `infrastructure-context` `guidelines.md` rendered (hard gate) |
| 7 | `.core-version.json` | Version tracking enabled |
| 8 | **Codebase Analysis** | Deep Explore subagent analysis for enriched AGENTS.md |
| 9 | `AGENTS.md` | AI agent instructions enriched by Explore analysis: 7 mandatory questions, brevity-enforced, with mandatory `Project Resource Map`, `Architecture (TL;DR)`, `Constraints & Non-Goals` sections |
| 9.5 | `docs/INDEX.md` | Minimal index generated so the AGENTS.md → INDEX.md link always resolves |

## What Quick Init Does NOT Do

- Technology stack configuration (use `/initialize` for this)
- **User role selection** — no questions about developer roles
- **Role-bound pack activation** — no role selection, no role-matched auto-install and no Pass A.5. Step 4.5 offers exactly two things: role-agnostic packages (empty `targetRoles`, resolved live from the catalogue) and, per reference Step 4.5.b.1, the owning package of a domain the stack scan **detected** — offered on evidence, never on a role
- **Role-specific MCP servers** — only base servers (Context7, Atlassian, TaskMaster, Chrome DevTools)
- **Role-specific context skill setup** — only the two core context skills (`coding-standards-context`, `infrastructure-context`) are configured in Step 6.5
- Requirements and architecture gathering

## When to Use

- Quick start without detailed configuration
- Prototyping or exploring the template
- You prefer manual customization later
- Time-sensitive project kickoff

## Comparison with Full Initialization

| Aspect | `/quick-init` | `/initialize` |
|--------|----------------|---------------|
| Time | ~3-5 minutes | ~15-20 minutes |
| Phases | Single workflow | 9 modular phases |
| Codebase analysis | Explore subagent (for AGENTS.md) | Phase 4 + Phase 6 API analysis |
| Tech stack | Not configured | Detected/collected |
| Domain skills | Not configured | project-config.json filled (API enriched by Explore) |
| User roles | Not asked | 9 roles available |
| APM packages | Role-agnostic offer only (empty `targetRoles`, resolved live from the catalogue) | Phase 1.7-APM: role-matched auto-activation + Pass A.5 optionals |
| MCP servers | Base only (3) | Base + role-specific |
| Best for | Quick start | Full configuration |

## After Quick Init

To complete full configuration later:
1. Attach `.opencode/project_init.md` to chat
2. Run `/initialize` command
3. Agent will detect existing setup and offer to continue configuration

## Prerequisites

- Template files present in project
- OpenCode 1.18.27+ started in the project directory

## Troubleshooting

### Agent doesn't execute Quick Init
- Trigger with `/quick-init`; project name will be detected and confirmed in dialogue

### Some steps skipped
- This is normal if files already exist (preserves existing configuration)
- Check completion summary for status of each step

### `mcp` block not created
- The block already existed in `opencode.json` and was preserved
- Manually edit `opencode.json` if needed

### AGENTS.md questions skipped
- Agent uses auto-detected values
- Edit `AGENTS.md` manually to customize

---

*This is a Core command. For project-specific workflows, install an APM package via `apm install` (add it as an object dependency — `git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: master` — to `apm.yml` and run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`) or add conventions to the `Project Conventions` section in root `AGENTS.md`.*
