---
name: project-initialization
description: Orchestrates project initialization for new and existing projects. Use for /initialize and /quick-init commands, project setup, environment configuration, and stack detection.
---

# Project Initialization Skill

> Orchestrates project initialization for both new and existing projects using the NC AI Workplace template.

## Activation

This skill activates when:
- User says "Initialize my project" (with `.opencode/project_init.md` in context)
- User runs `/initialize` command
- User runs `/quick-init` command
- User says "Start project initialization", "Set up my project", "Configure this project"

## Quick Init vs Full Initialization

| Aspect | Quick Init (`/quick-init`) | Full Init (`/initialize`) |
|--------|---------------------------|--------------------------|
| Time | ~3-5 minutes | ~15-20 minutes |
| Phases | Single workflow | 9 modular phases |
| Tech stack | Not configured | Detected/collected |
| Component rules | Not generated | Domain skill configs filled |
| User roles | Not selected | 9 roles available |
| APM CLI | Phase 0 gate — graceful (never
 blocks) | Phase 0 gate — mandatory (aborts on failure) |
| APM packages | Role-agnostic offer only (empty `targetRoles`, resolved live from the catalogue) | Phase 1.7-APM: role-matched auto-activation + Pass A.5 optionals |

## Update vs Fresh Detection (Auto-Mode, no user confirmation)

> **Mode (NEW vs EXISTING) is auto-detected. The agent MUST NOT ask the user "Is this a new or existing project?" — that is determined from `.core-version.json` and file signals. See `references/mode-detection.md` for the full algorithm.**

Before proceeding, check `.opencode/rules/.core-version.json`:

1. **File does NOT exist** → FRESH INITIALIZATION → run mode detection (`references/mode-detection.md`) to classify NEW_PROJECT vs EXISTING_PROJECT
2. **File exists** → Check `initializationStatus`:
   - `"fresh"` + all hashes `"pending"` → FRESH INITIALIZATION → run mode detection
   - `"active"` or calculated hashes → UPDATE (delegate to Project Updater agent — read `agents/project-updater.md`)

The `initializationStatus: "active"` value is itself a strong signal of an existing, already-initialised project — never re-ask the user about it.

## Full Initialization Phases

```
0. APM CLI Bootstrap → 0.5 Environment Setup → 1. Mode Detection → 1.5. User Role Selection →
1.6. Commands Directory Verification (read-only) → 1.7-APM. APM Package Activation →
2. Metadata Collection → 3. Stack Configuration →
4. Codebase Analysis (existing only) → 5. Requirements Gathering →
6. Configuration Updates → 6.5. Project Identity (Thin) →
7. Documentation Generation → 7.5. Documentation Registry → 8. Summary & Next Steps
```

> **Phase count.** That is **15 numbered steps**, of which 9 carry a top-level number — the "9 phases" figure in progress output counts the top-level ones (0, 1, 2, 3, 4, 5, 6, 7, 8) and treats `.5` / `.6` / `.7` steps as sub-phases of the number they follow. **Phase 1.6 is a real step** (read-only inventory of `.opencode/commands/`, no generation — see `references/user-roles-mcp.md → Phase 1.6`); it is listed here and in the ledger's `Phase Checklist` so the flow reads consistently across `SKILL.md`, `INITIALIZATION.md`, and the commands.

> **Phase 0 (APM CLI Bootstrap)** is the new entry gate added in v4.0.0. It runs **before** every other phase. The agent runs `apm --version`; on miss, it **offers to install APM automatically** by running the OS-appropriate official one-liner via the Shell tool after the user consents, with manual-install fallback if the user declines or auto-install fails. **Mandatory pre-read:** the agent MUST read `references/apm-bootstrap.md` before executing Phase 0 and use the install commands listed there **verbatim**. Hallucinated URLs (e.g. `apm.run/install.ps1`, `install.apm.dev`) are not permitted — only `aka.ms/apm-windows`, `aka.ms/apm-unix`, `brew install microsoft/apm/apm`, and `pip install apm-cli` are authoritative. On success the agent persists `apmVersion` to `.opencode/rules/.core-version.json` and warns on major-version drift. **Graceful variant for `/quick-init`:** a missing or uninstallable CLI never blocks the workflow — the agent records `apmAvailable=false`, prints a notice, and skips the role-agnostic package offer (see `references/quick-init.md` Steps 0 and 4.5). Canonical APM reference: `references/apm-workflow.md`.
>
> **Phase 1.7-APM** replaces the legacy three-pass Phase 1.7 (role packs + full modules + `/moduleActivate`). It fetches the chosen `index.json` source(s) (Workplace-Agent-Packages repo by default), filters by role, writes the project's `apm.yml` with subdirectory references and `compilation.agents_md.mode: managed_section`, runs `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, and lets APM deploy primitives (agents and commands into `.opencode/`, skills into `.agents/skills/`) and merge MCP servers into the root `opencode.json` (`AGENTS.md` is co-owned via the `<!-- apm:start -->` / `<!-- apm:end -->` managed section, populated by `apm compile`). The opencode target deploys no hooks, so full modules are activated explicitly by running their `scripts/activate.{sh,ps1}` and verifying the relocated payload with `verify-apm-activation.ps1` (step 5.2); the wrapper restores initialized package files after every redeploy and flags packages skipped for target incompatibility.

### Thin Ledger Model (v3.1.0+) — source-of-truth split

`.opencode/project_init.md` is a **compact state ledger**, not a knowledge base. The agent MUST follow this split:

| Concern | Authoritative artifact | What goes into `project_init.md` |
|---------|------------------------|----------------------------------|
| Stack + architecture (always-applied) | `.opencode/rules/development.md` | One-line confirmation + pointer in `Artifact Pointers` |
| Project identity | `.opencode/rules/project/metadata.json` | One-line confirmation + pointer |
| Per-domain facts and constraints | `<skills-root>/<domain>-context/project-config.json` | Per-domain reflection note in Decision Log; full data lives in JSON |
| Agent-facing project rules | `<skills-root>/<domain>-context/references/guidelines.md` | Pointer; rendered output never duplicated here |
| Codebase analysis details | Per-domain `project-config.json` + optional `docs/project/ARCHITECTURE.md` | Short bullet summary in Decision Log §4 + supplemental source manifest |
| Endpoint inventory | `.agents/skills/api-context/project-config.json` | Counts and discovery stage in Decision Log §5 |
| Documentation index | `docs/INDEX.md` | Pointer |
| Repo conventions, project overview | Root `AGENTS.md`, `README.md` | Pointers |
| Selected role(s) | `.opencode/rules/project/metadata.json` (`project.roles`) | Roles listed in `Initialization State` and Decision Log §1.5 |
| Installed APM packages + activation status | `apm.lock.yaml` (root) + `.workplace/state.json` | Decision Log §1.7-APM (registry source, accepted, declined, skipped) + Artifact Pointers |

The ledger MUST contain:
- `Initialization State` (mode, roles, current phase, status, timestamps, template version)
- `Artifact Pointers` (paths to authoritative artifacts)
- `Phase Checklist`
- `Supplemental Source Manifest` (read by Phase 6 to enrich `guidelines.md`)
- `User Answers & Decision Log` (every question + answer + persistence target)
- `Open Gaps` (`TBD` items)
- `Initialization Summary` (filled at Phase 8)

The agent MUST NOT duplicate stack lists, endpoint tables, codebase inventories, or domain rules into the ledger. If a fact deserves long-form expression, it lives in the matching artifact, and the ledger only records the decision (one or two lines) plus a pointer.

### English-only generated content (strict)

All text **written or rewritten** during initialization (Phases 0–8 and Quick Init) — including `development.md`, root `AGENTS.md`, README and registry docs, the Decision Log entries in `.opencode/project_init.md`, and **every `*-context` skill** artifact — MUST be **English**.

> `<skills-root>` = `.opencode/skills/` for the two Core context skills (`coding-standards-context`, `infrastructure-context`) and `.agents/skills/` for every context skill deployed by an APM package (native `opencode` target path).

**Highest scrutiny:** `<skills-root>/<domain>-context/project-config.json` and `<skills-root>/<domain>-context/references/guidelines.md`. These are runtime agent context; mixed languages break predictable tooling and reviews.

| Rule | Detail |
|------|--------|
| **Conversation vs files** | The agent MAY chat with the user in any language. **Persisted files** must still be English: translate user answers when writing artifacts. |
| **Do not translate** | Code identifiers, paths, URLs, CLI commands, official product/vendor names, locale-specific legal names, and verbatim quotes that must stay exact for compliance. |
| **Consistency** | US or UK spelling is acceptable; pick one per file and stay consistent. |
| **Verification** | Phase 6 follows `references/configuration-updates.md` → English checks in Parts 2, 3, and Part 3.5 (hard gate). |

### Phase Reference Docs

Each phase has detailed implementation instructions in `references/`:

| Phase | Reference Doc | Summary |
|-------|--------------|---------|
| 0 | `references/apm-bootstrap.md` | Run `apm --version`; on miss offer to auto-install via consent-gated Shell run of the verbatim platform command (`irm aka.ms/apm-windows \| iex` on Windows, `curl -sSL aka.ms/apm-unix \| sh` on macOS/Linux), with manual fallback (brew, pip); persist `apmVersion` to `.core-version.json`; warn on major-version drift. **Reading this reference is MANDATORY before Phase 0 executes — do not invent install URLs.** |
| 0.5 | `references/environment-setup.md` | opencode.json (watcher exclusions, read denials), .gitignore (Workplace + APM exclusions), commands dir, docs auto-sync plugin config, Core/Project structure |
| 1 | `references/mode-detection.md` | NEW_PROJECT vs EXISTING_PROJECT detection |
| 1.5 | `references/user-roles-mcp.md` | 9 roles (7 developer + 1 analyst + 1 upgrade engineer), MCP config |
| 1.6 | `references/user-roles-mcp.md → Phase 1.6` | Read-only inventory of `.opencode/commands/`. **No command file is ever created here** — Phase 1.7-APM is the only mechanism that adds commands |
| 1.7-APM | `references/phase-1-7-apm.md` (canonical procedure) + `references/apm-workflow.md` (full APM reference) | Choose registry source (built-in / external / both); `prepare-apm-packages.ps1` filters by role; Pass A.5 batched yes/no for optional packs; standalone-only packs listed for info only; write `apm.yml`; `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`; APM deploys primitives + merges hooks/MCP/AGENTS.md |
| 2 | `references/metadata-collection.md` | Project name, goal, audience, description |
| 3 | `references/stack-configuration.md` | Framework, tools, dependencies detection |
| 4 | `references/codebase-analysis.md` (router) → `references/phase-4/*` + `references/subagent-contract.md` (how every dispatch runs) | Existing project deep analysis (`codebase-analyzer` subagent, one per component) |
| 5 | `references/requirements.md` (router) → `references/phase-5/*` | Components, architecture, performance requirements |
| 6 | `references/configuration-updates.md` (router) → `references/phase-6/*` | development.md + domain skill project-config.json |
| 6.5 | *(inline below)* | Project identity: create `.opencode/rules/project/metadata.json` |
| 7/7.5 | `references/documentation.md` | AGENTS.md, README, docs/INDEX.md generation |

### Phase 6.5: Project Identity (Thin)

> **When to run:** After Phase 6 (Configuration Updates), before documentation generation.
> **Goal:** Persist project identity so other Core artifacts (agents, scripts, deployment) can read it. Nothing else.

**This phase has exactly one step.** The previous "customization setup" workflow (custom rules, project routing, `project-*` agents/commands/skills) was removed in v3.0.0. Project adaptation is now done through three native channels and is **not** part of initialization:

1. Edit APM-installed primitives in place under `.opencode/agents/`, `.opencode/commands/`, `.agents/skills/<id>/` (they survive `/update-workplace`, but `apm install` / `apm update` redeploy them without a per-file conflict prompt — edits that must survive a package refresh belong in the project's own `.apm/`, which is deployed last and wins on collision).
2. Add team rules to the `Project Conventions` section of the root `AGENTS.md` (Phase 7 seeds the section).
3. Edit `project-config.json` in any context skill and regenerate `references/guidelines.md` (already done in Phase 6 for active domains).

For projects that still carry legacy `project-*` artifacts from older template versions, the migration is handled by `/update-workplace` (`migration_v3_0_drop_project_customizations`), not by initialization.

#### Step 1 — Create `.opencode/rules/project/metadata.json`

Always create the file from Phase 2 collected data:

```json
{
  "project": {
    "name": "[from Phase 2]",
    "description": "[from Phase 2]",
    "team": "[from Phase 2 or ask]",
    "repository": "[from Phase 2 or git remote]"
  },
  "environments": {
    "development": "[local dev URL if known]",
    "staging": "[staging URL if known]",
    "production": "[production URL if known]"
  },
  "initialized": "[ISO date]",
  "template_version": "[from .core-version.json]"
}
```

That is the entire phase. Do **not** offer to create custom rules, custom agents, custom commands, custom skills, or routing files. If the user later needs to add new agent/command/skill capabilities, they should either edit APM-installed primitives in place, or install an additional package (add it as an object dependency — `git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: master` — to `apm.yml` and run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`), or scaffold a brand-new package via `/package-new`.

After creating the file, confirm: "Project identity recorded in `.opencode/rules/project/metadata.json`."

### Phase Transition Validation

> **CRITICAL:** Before proceeding to the next phase, the agent MUST verify that the authoritative artifact(s) for the current phase exist and that the corresponding entry in the `User Answers & Decision Log` (in `.opencode/project_init.md`) is recorded. Validation reads the **artifacts**, not large `[TO_BE_FILLED]` blocks in the ledger — the ledger only stores state, pointers, and decisions.

| Phase | Authoritative Artifact (must exist & be valid) | Ledger Entry Required | Reflection Required | How to Verify |
|-------|-----------------------------------------------|-----------------------|---------------------|---------------|
| 0 | `opencode.json` **exists, parses and carries the base `watcher.ignore` entries** (created / updated / retained — see `environment-setup.md → Part 1`); `.gitignore` has Workplace exclusions (if file exists); commands dir exists; `.opencode/hooks/docs-sync-config.json` carries the user's docs auto-sync choice (`enabled`; absent = enabled) | Decision Log §0 (only if user deviated from defaults) | N/A | Re-read `opencode.json` from disk — file MUST exist and contain at least `node_modules/` and `.git/`; absence of the file = Phase 0 incomplete (do NOT proceed). Then read `.gitignore` / `.opencode/hooks/docs-sync-config.json` and confirm content present. |
| 1 | `Initialization State → Current Mode` filled with `NEW_PROJECT` or `EXISTING_PROJECT` | Decision Log §1: detected indicators + mode + edge-case answer (if any) | **Yes** — log auto-detection signals; ask only if `signals == 1` (edge case) | `Current Mode` is not `[TO_BE_DETERMINED]`; `Phase 1 reflection completed` checked; Decision Log §1 has at least one bullet |
| 1.5 | `Initialization State → Selected Role(s)` filled; `opencode.json` written with base + role-specific servers | Decision Log §1.5: role(s) chosen + reasons + MCP servers | N/A (selection-only) | Roles not `[TO_BE_FILLED]`; `opencode.json` exists |
| 1.7-APM | `apm.lock.yaml` exists and lists every accepted package; project `apm.yml` `dependencies.apm:` contains every accepted package as a subdirectory reference; `.opencode/{agents,skills,commands}/` populated by APM deploy; `.opencode/.temp-apm-selection.json` deleted | Decision Log §1.7: registry source chosen, packs auto-activated, Pass A.5 acceptances/declines, standalone-only packages noted (informational), any install failures | N/A | `validate-apm-install.ps1` exits 0 (step 5.1a, no `-PreInstall`) **and** `verify-apm-activation.ps1` exits 0 (step 5.2); confirm `.opencode/.temp-apm-selection.json` removed. A name-only directory spot-check is **not** sufficient — it passes on the empty package skeletons these gates exist to catch. Full table: [`phase-1-7-apm.md` → Transition Validation](references/phase-1-7-apm.md) |
| 2 | `.opencode/rules/project/metadata.json` exists with `project.name`, `project.description` and (where applicable) `project.team` / `project.repository` populated; `Artifact Pointers → Project identity` updated | Decision Log §2: metadata source (silent acceptance vs adaptive question), conflicts resolved | **Yes** — adaptive question only when description trivial / goal undeducible / metadata sources conflict | Read `metadata.json`; confirm fields present (or explicit `[TBD]`); `Phase 2 reflection completed` checked |
| 3 | `.opencode/rules/development.md` Technology Stack section filled (no `[TO_BE_FILLED]`); `Artifact Pointers → Stack` updated | Decision Log §3: every stack decision (auto-detected vs user-corrected); for EXISTING_PROJECT note any corrections | N/A (stack mostly observable) | Read `development.md`; confirm Technology Stack and Architecture Overview sections filled; Decision Log §3 is non-empty |
| 4 | `.opencode/project/analysis/index.json` lists every detected component, and each component it marks `completed` has both `<component>.json` and `<component>.md` on disk; findings persisted into per-domain `project-config.json` references and the Supplemental Source Manifest; optionally `docs/project/ARCHITECTURE.md` if complex architecture | Decision Log §4: short bullet summary (NOT full report) + Smart Reflection Questions + answers + references persisted into domain configs | **Yes — MANDATORY** for EXISTING_PROJECT. Smart Reflection Questions must reference discovered names | `node .opencode/skills/project-initialization/scripts/validate-analysis.js` exits 0 (structure + shallowness); Decision Log §4 has bullet summary; `Phase 4 reflection completed` checked; relevant rows in `Supplemental Source Manifest` updated |
| 5 | Per Part: components into the relevant `*-context/project-config.json` (e.g., frontend or backend module list); API specs/sources recorded in `api-context/project-config.json.references` and the Supplemental Source Manifest; performance targets in `performance-context/project-config.json`; BASS security guide selections in `.agents/skills/security-compliance/assets/security-sources.json` **only when `nc-code-security-audit` was installed in Phase 1.7-APM** (otherwise Part 5's guide-selection questions are skipped — see `requirements.md` Part 5 Gate Check); constraints in the relevant domain configs | Decision Log §5: per-Part decisions, skipped/partial rounds with reason, compliance pre-checks | **Yes** — rounds become skip-by-default in EXISTING_PROJECT when answer is derivable from Phase 4; ask only the gap | Read each persistence target; `Phase 5 reflection completed` checked; Decision Log §5 explains skipped rounds |
| 6 | Per configured domain: `project-config.json` has `"initialized": true` AND `references/guidelines.md` exists with no raw `{{PLACEHOLDER}}` tokens; **English-only** narrative in both files per `configuration-updates.md`. **Part 3.5 mandatory verification passed:** all domains required by role(s) + detected technologies have valid `guidelines.md`, and `check-guidelines-specificity.js --required <requiredContextSkills>` exits 0 | Decision Log §6: per-domain confidence + question count + supplemental sources used | **Yes — per domain.** Reflection Step 0 computes confidence per domain → 0–3 questions referencing concrete names from Phase 4 | Read both files per domain; run Part 3.5 verification (Steps 2, 3a, 5); auto-recover missing guidelines; `Phase 6 reflection completed` checked |
| 6.5 | `.opencode/rules/project/metadata.json` exists with full identity block (project, environments, initialized, template_version) | Decision Log §6.5: single-line confirmation | N/A | Read `metadata.json` |
| 7/7.5 | `AGENTS.md` updated (Resource Map block + non-empty Architecture (TL;DR) + Constraints + Project Conventions seeded); `README.md` updated; `docs/INDEX.md` exists with valid links | Decision Log §7 (root dialogue Q1–Q7 answers) and §7.5 (discovered docs/rules counts, link integrity) | N/A | Files exist, project-specific content, English prose; `AGENTS.md` ↔ `INDEX.md` link-integrity gate passes |
| 8 | `.core-version.json` hashes computed (no `"pending"`) and `initializationStatus: "active"`; `Initialization State → Initialization Status` set to `active`; `Initialization Summary` filled | Decision Log §8: hash computation result + version transition | N/A | Read `.core-version.json` and ledger `Initialization State` |

**Reflection enforcement:** if a row says "Yes" and the corresponding `Phase {N} reflection completed` checkbox in `project_init.md` is unchecked, the phase **MUST** be re-opened. The agent runs the four-question self-review (see "Phase Reflection Checkpoint" section below) and either records "no questions needed — all clear" or asks the generated questions before proceeding.

**If validation fails:** Do not report the phase as complete. Complete the missing artifact, then re-validate before showing progress and moving on.

### Safe Stop Points and Resumption

> Full initialization is long enough that a session can end mid-run — context exhausted, the user steps away, a tool failure. Three phase boundaries are **safe stop points**: everything before them is on disk in a form a fresh session can read back without re-asking a single question.

| Safe stop point | What is durable at that moment | What a resumed session reads |
|---|---|---|
| After **Phase 4** | `.opencode/project/analysis/index.json` + one `.json`/`.md` pair per component; Decision Log §4; Supplemental Source Manifest rows | The artifacts — never re-dispatch a component whose artifact exists and validates |
| After **Phase 6** | Every configured `project-config.json` (`initialized: true`) + rendered `references/guidelines.md`; Decision Log §6 | The configs; Part 3.5 is re-run as a check, not as a re-render |
| After **Phase 7.5** | `AGENTS.md`, `README.md`, `docs/INDEX.md` | The files; only Phase 8 remains |

At each safe stop point the agent MAY offer to pause: *"Phases 0–N are complete and persisted. Continue now, or resume later in a fresh session?"* Never pause **inside** a phase — a half-written `project-config.json` or a partially merged `index.json` is exactly the state resumption cannot reason about. If a phase must be abandoned mid-way, roll its artifacts back to the last consistent state and leave its checklist box unticked.

#### How resumption is detected — state on disk, not the command text

**The trigger is the ledger, not a flag.** `/initialize --resume`, plain `/initialize`, and "continue the initialization" all take the same path: read state, find the first unticked phase, continue from there. Command arguments reach the agent only through `$ARGUMENTS`, and the user may omit them, so nothing may depend on the flag being parsed.

Resumption procedure:

1. Read `.opencode/rules/.core-version.json`. `initializationStatus: "active"` with computed hashes means initialization already **finished** — this is an update, so delegate to the Project Updater instead.
2. Read `.opencode/project_init.md`: `## Initialization State` (mode, roles, template version), `## Phase Checklist`, `## User Answers & Decision Log`, `## Open Gaps`.
3. Read the artifacts the completed phases produced: `.opencode/project/analysis/index.json`, `.opencode/rules/project/metadata.json`, `development.md`, each `*-context/project-config.json`, `apm.lock.yaml`.
4. **Validate rather than trust the checkboxes.** For each ticked phase, run its row from the Phase Transition Validation table. A ticked box whose artifact is missing means the previous session died between writing the box and writing the file — untick it and redo that phase.
5. Announce what was found and where the run continues:

```
Resuming initialization.

Mode: EXISTING_PROJECT   Roles: backend, qa   Template: v4.7.0
Complete: Phases 0 - 4 (analysis artifacts for 3 components, all validated)
Next: Phase 5 (Components & Requirements)
Open gaps carried forward: 2

Continuing from Phase 5. No previously answered question will be asked again.
```

6. **Never re-ask an answered question.** Every answer is in the Decision Log with its persistence target; a repeated question is a resumption bug, not thoroughness. If an answer is genuinely needed and genuinely absent, it belongs in `## Open Gaps` — ask it as a gap, and say that it is one.

#### BA-Only Mode Validation Exceptions

When all selected roles are `ba` (no developer roles), the following validation rules are relaxed:

| Phase | BA-Only Exception |
|-------|------------------|
| 3 | Stack values of `"Unknown (BA mode)"` in `development.md` are valid — do not block. Auto-detected values without user confirmation are also valid. Decision Log §3 must still record "BA-only — auto-detected only" or equivalent. |
| 4 | Only the 6 BA-focused analysis sections are required (Business Modules, Architecture, Data Models, API Overview, Integrations, Structure). Standard sections 5 (Code Quality) and 6 (Code Patterns) are not expected. |
| 5 | Parts explicitly marked as skipped in BA mode are valid (e.g., "API documentation discovery skipped (BA mode)", "Web performance requirements skipped (BA mode)"). These count as resolved — do not block on them, but Decision Log §5 MUST record the skip with the BA-mode reason. The remaining Parts (Components, Architecture, Constraints, Security) must still have decisions persisted into the matching `*-context/project-config.json`. |
| 6 | If the BA-Only Role Gate in `configuration-updates.md` resulted in skipping Part 2, domain `project-config.json` files with `"initialized": false` are valid. Decision Log §6 must record the BA-only gate decision per domain. |
| 8 | Decision Log entries that explicitly state "skipped (BA mode)" with a reason count as resolved — not as missing audit data. |

### Reading Instructions

For each phase, read the corresponding reference doc to get detailed implementation steps.

#### Step-level routing for Phases 4, 5 and 6 (read the step file, never the directory)

Those three phases used to be single 1 100–1 600-line documents. Each is now a short router plus a directory of step files. **Read the router once, then only the step file you are on.** Loading a whole `phase-N/` directory up front reproduces exactly the context cost the split removed.

| Phase | Step | File |
|---|---|---|
| 4 | Component detection, fan-out plan, wave launch, post-wave validation, the merge table and the per-component persistence map | `references/phase-4/dispatch.md` |
| 4 | Research questions per component kind (brief block 3) and the post-wave processing checklist | `references/phase-4/prompts.md` |
| 4 | The user-facing analysis report template and the Phase 4 ledger writes | `references/phase-4/merge-and-persist.md` |
| 4 | Reflection checkpoint and gap detection | `references/phase-4/reflection-and-gaps.md` |
| 4 | BA-only run (replaces prompts + gap checklist) | `references/phase-4/ba-mode.md` |
| 5 | **Always first:** adaptive mode, skip-by-default policy, completion actions | `references/phase-5/overview.md` |
| 5 | Part 1 — components | `references/phase-5/part-1-components.md` |
| 5 | Part 1.5 — API documentation discovery (skip when no API surface) | `references/phase-5/part-1-5-api-docs.md` |
| 5 | Part 2 — architecture and decisions | `references/phase-5/part-2-architecture.md` |
| 5 | Part 3 — web performance | `references/phase-5/part-3-performance.md` |
| 5 | Part 4 — general requirements | `references/phase-5/part-4-general.md` |
| 5 | Part 5 — security (gated on `nc-code-security-audit`) | `references/phase-5/part-5-security.md` |
| 5 | BA-only run (replaces all Parts) | `references/phase-5/ba-mode.md` |
| 6 | **Always first:** render order, validation, completion actions, key principles | `references/phase-6/overview.md` |
| 6 | Part 1 — `development.md` | `references/phase-6/part-1-development-mdc.md` |
| 6 | Part 2 — domain skill configuration | `references/phase-6/part-2-domain-skills.md` |
| 6 | API sub-analysis (**conditional** on `analysis/index.json → coverage.api`) | `references/phase-6/api-analysis.md` |
| 6 | Part 3 — guidelines generation | `references/phase-6/part-3-guidelines.md` |
| 6 | Part 3.5 — verification hard gate | `references/phase-6/part-3-5-verification.md` |

The routers (`codebase-analysis.md`, `requirements.md`, `configuration-updates.md`) remain the addressable entry points: they carry the phase summary, the rules that span every step, and this same map. External documents keep linking to them, not to the step files.

### Quick Init Workflow

For the Quick Init workflow, read `references/quick-init.md` in this skill directory.

## Integration Points

- **Configuration file:** `.opencode/project_init.md`
- **Version tracking:** `.opencode/rules/.core-version.json`
- **Stack reference:** `.opencode/rules/development.md`
- **Codebase analysis:** Uses `codebase-analysis` skill for subagent delegation patterns; the dispatch mechanics themselves are fixed by `references/subagent-contract.md`
- **Documentation:** Invokes `documentation-management` skill for Phase 7/7.5
- **Project adaptation model:** documented in `orchestrator.md` (Project Adaptation section) and [docs/core/CUSTOMIZATION.md](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/CUSTOMIZATION.md). Phase 6.5 only persists `metadata.json`; behavioral changes happen via role-pack artifact edits, AGENTS.md `Project Conventions`, and per-skill `project-config.json` + `references/guidelines.md`.
- **APM package activation (Phase 1.7-APM):** Full procedure in `references/phase-1-7-apm.md`. Conceptual APM reference (manifest layout, registry semantics, install/compile/hook contracts) in `references/apm-workflow.md`. The legacy `module-activation` skill and `/moduleActivate` command were removed in v4.0.0.
- **Workplace documentation (upstream):** the user-facing guides this workflow implements ship in the template repo, not in initialized projects — [`references/workplace-docs.md`](references/workplace-docs.md) maps them and states the resolution contract (`scripts/fetch-workplace-doc.js` automates it). Most relevant here: [`INITIALIZATION.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/INITIALIZATION.md) ([phase-by-phase](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/INITIALIZATION.md#5-phase-by-phase-reference), [mode detection](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/INITIALIZATION.md#3-mode-auto-detection-new-vs-existing-vs-update), [troubleshooting](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/INITIALIZATION.md#14-troubleshooting)), [`ROLES.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/ROLES.md) for Phase 1.5, and [`GETTING_STARTED.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/GETTING_STARTED.md). They explain the workflow to the **user**; the executable procedure stays in this skill’s `references/`.

## Phase 1.7-APM: APM Package Preparation Script

> **Purpose:** Resolve the APM packages registry (built-in, external URL, or merged), filter by selected role(s), and produce a deterministic selection file consumed by Phase 1.7-APM.

During Phase 1.7-APM, the agent MUST use the pre-built preparation script instead of generating ad hoc PowerShell/Bash for registry fetching and filtering.

### Available Script

| Script | Platform | Path |
|--------|----------|------|
| `prepare-apm-packages.ps1` | Windows / PowerShell Core | `.opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1` |
| `validate-apm-install.ps1` | Windows / PowerShell Core | `.opencode/skills/project-initialization/scripts/validate-apm-install.ps1` |
| `verify-apm-activation.ps1` | Windows / PowerShell Core | `.opencode/skills/project-initialization/scripts/verify-apm-activation.ps1` |

### Usage

```powershell
# built-in registry (raw URL derived from apmPackages.registryRepoUrl in .core-version.json)
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -Roles backend,fullstack -Mode builtin

# external mirror(s)
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -Roles qa -Mode external -ExternalUrls https://internal.example.com/index.json

# both (builtin wins on conflict by name)
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -Roles backend,fullstack -Mode both -ExternalUrls https://internal.example.com/index.json
```

Health gate — run **before** `apm install` (over inherited state) and again **after** it (Phase 1.7-APM steps 5.0b and 5.1a):

```powershell
# 5.0b - pre-flight over inherited state. -PreInstall is mandatory here: it skips the
# required-context-skill check, which cannot pass before the packages have been installed.
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/validate-apm-install.ps1 -PreInstall

# 5.1a - full gate after the install
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/validate-apm-install.ps1
```

Exit 1 means a package is recorded as installed but holds no content. `apm install` will keep printing `(files unchanged)` in that state, so installing again fixes nothing — apply the purge command the script prints.

Cleanup after Phase 1.7-APM completes:

```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -Cleanup
```

### Script Behavior

1. Reads `.opencode/rules/.core-version.json → apmPackages.registryRepoUrl` for the built-in raw URL when `-Mode` is `builtin` or `both` (falls back to `templateSource` for legacy projects).
2. Falls back to the offline snapshot at `.opencode/rules/packages-index.json` if every live fetch fails.
3. Validates each entry's `xWorkplace` block (schemaVersion 1, type role-pack|module|skill) against the registry's `_schema/index.schema.json` shape (light-weight checks; full AJV validation runs in CI).
4. Filters by normalized roles; classifies entries as matched (auto-activate), optional (Pass A.5), or standalone-only (informational only).
5. Writes `.opencode/.temp-apm-selection.json` with `selectedRoles`, `mode`, `roleAgnosticOnly`, `sources` (each with `url`, `resolvedVia`, `priority`, `generatedAt`), `matchedPackages`, `optionalPackages`, `standaloneOnlyPackages`, `roleAgnosticPackages`, `requiredContextSkills`, `generatedAt`. `/quick-init` Step 4.5 reads `roleAgnosticPackages` and `sources[0].generatedAt`; Phase 6 Part 3.5 and the health gate read `requiredContextSkills`.

### When to Use

- **ALWAYS** at the start of Phase 1.7-APM after the user picks the registry mode.
- **ALWAYS** run `validate-apm-install.ps1` on both sides of `apm install` — with `-PreInstall` before, without it after — and treat its exit code as a gate; a name-only directory listing passes on the empty package skeletons it exists to catch.
- **ALWAYS** run with `-Cleanup` at the end of Phase 1.7-APM — but only after the post-install health gate, which reads `requiredContextSkills` from the selection file.
- **NEVER** leave `.opencode/.temp-apm-selection.json` behind after the phase.
- **NEVER** hand-create files inside a package-owned skill to satisfy a gate. Purge and re-install the owning package instead.

## Phase 4: Analysis Artifact Validator

> **Purpose:** Prove the analysis wave produced artifacts downstream phases can actually use — before Phase 5 and Phase 6 start reading them.

| Script | Runtime | Path |
|--------|---------|------|
| `validate-analysis.js` | Node.js | `.opencode/skills/project-initialization/scripts/validate-analysis.js` |

```bash
# default directory: .opencode/project/analysis
node .opencode/skills/project-initialization/scripts/validate-analysis.js

# machine-readable, or against a non-default directory
node .opencode/skills/project-initialization/scripts/validate-analysis.js --json
node .opencode/skills/project-initialization/scripts/validate-analysis.js --dir <path> --quiet
```

Three classes of finding. **Structure** and **shallowness** are blocking (exit 1); **budget** overruns are reported as `warn` lines and do not change the exit code — an over-budget report is still usable, and re-dispatching to shrink it costs more than it saves. Read the warnings anyway: they are the early signal that a component needs splitting.

1. **Structure** (blocking) — each `<component>.json` conforms to `assets/analysis-report.schema.json`: the required scalars and the five arrays (`businessModules`, `entities`, `endpointGroups`, `integrations`, `gaps`) that Phases 5 and 6 read. `index.json` must carry a valid `delegationMode`, and a component it marks `completed` must have an artifact on disk.
2. **Budgets** (warning) — `<component>.json` ≤ 30 KB and `<component>.md` ≤ 400 lines, per [`references/subagent-contract.md`](references/subagent-contract.md) §5.
3. **Shallowness** (blocking) — a well-formed report that says nothing: a `backend` with zero entities and zero endpoint groups, a module named `service`, `coverage: "partial"` with an empty `gaps[]`.

### When to Use

- **ALWAYS** in Phase 4 Step 3, after merging the wave's summaries into `index.json` and before Phase 5 reads anything.
- **AGAIN** after each follow-up dispatch, until it exits 0 or the residue is recorded under `## Open Gaps`.
- **NEVER** answer a `SHALLOW` finding by re-running the whole fan-out — dispatch one narrowed brief naming the missing facts.

## Phase 6: Guidelines Specificity Script

> **Purpose:** Mechanise the Part 3.5 hard gate — prove every required context skill was actually installed by APM, actually rendered, and actually says something about *this* project.

| Script | Runtime | Path |
|--------|---------|------|
| `check-guidelines-specificity.js` | Node.js | `.opencode/skills/project-initialization/scripts/check-guidelines-specificity.js` |

```bash
# Part 3.5: the required set is computed in Step 1 from apm.lock.yaml + coreContextSkills
node .opencode/skills/project-initialization/scripts/check-guidelines-specificity.js --required coding-standards-context,infrastructure-context,backend-context
```

> **Always `--required`, never `--required-from`, at Phase 6.** `--required-from` reads `.opencode/.temp-apm-selection.json`, which Phase 1.7-APM is required to delete at the end of its own phase — by Part 3.5 the file is gone. The script now exits 2 rather than passing an empty gate, but the correct invocation is the one above. Only `*-context` names are read; anything else in the list is ignored with a note.

What it checks, per skill in the required set:

1. **Install** — the skill directory exists and carries the package-provided `SKILL.md` and `references/template.md`. A missing or empty directory is a failure classed `install` (fix the APM install; do not hand-create the files).
2. **Render** — `references/guidelines.md` exists, is free of `{{PLACEHOLDER}}` tokens, and `project-config.json` has `"initialized": true`. Failures are classed `render` (re-run Part 3 for that domain).
3. **Ownership** — cross-cutting topics (naming, error handling, code organisation, commit format, documentation style) belong to `coding-standards-context` only; another skill re-defining them fails.
4. **Specificity** — counts concrete project vocabulary (module, entity, endpoint, and integration names) drawn from the Phase 4 analysis artifacts under `.opencode/project/analysis/`, requiring at least `--min` hits (default 5). While those artifacts do not exist, specificity is reported as unmeasurable (warning) and the other three checks still block.

Skills outside the required set are advisory: their findings surface as warnings so a stale leftover skill can never make the gate unsatisfiable.

### When to Use

- **ALWAYS** in Phase 6 Part 3.5 Step 3a, and again in Step 5 after auto-recovery. Exit code 0 is part of the hard gate.
- **ALSO** from `/docs-sync` Project Mode, to catch guidelines that drifted away from the code.
- **NEVER** edit `guidelines.md` by hand to inflate the specificity counter — re-render it from the domain's analysis artifacts.

## Phase 8: Hash Computation Scripts

> **Purpose:** Compute SHA-256 hashes for `.opencode/rules/.core-version.json` during finalization.

During Phase 8 (Finalization), the agent MUST use the pre-built hash computation scripts instead of generating PowerShell/Bash code dynamically.

### Available Scripts

| Script | Platform | Path |
|--------|----------|------|
| `compute-hashes.ps1` | Windows (PowerShell) | `.opencode/skills/project-initialization/scripts/compute-hashes.ps1` |
| `compute-hashes.sh` | Unix/Linux/Mac (Bash) | `.opencode/skills/project-initialization/scripts/compute-hashes.sh` |

### Usage

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/compute-hashes.ps1 -Apply
```

**Unix/Linux/Mac:**
```bash
bash .opencode/skills/project-initialization/scripts/compute-hashes.sh
```

### Script Behavior

1. Reads `.opencode/rules/.core-version.json`
2. Computes SHA-256 hash for each file in `coreFiles` section
3. Outputs progress with color-coded status (green=OK, yellow=missing, red=error)
4. Generates copy-paste ready JSON for updating the version file
5. On Windows, `-Apply` patches `.core-version.json` directly as UTF-8 without BOM, without re-serializing the full JSON document
6. Hash values are lower-case 64-character SHA-256 hex strings; missing **required** files block `-Apply` unless the agent reruns with `-AllowMissing` after confirming they are optional
7. A `coreFiles` entry flagged `"optional": true` is expected to be absent in some projects (the template's own `docs/**` are the canonical case). Its absence is recorded as `"hash": "missing"`, counted separately, and never blocks `-Apply` — so `-AllowMissing` stays reserved for genuinely unexpected gaps. Both scripts preserve the flag on write
8. Returns exit code 0 on success; without `-Apply`, missing required files still return exit code 1 so the agent notices them

### When to Use

- **ALWAYS** use these scripts during Phase 8 finalization
- **NEVER** generate dynamic hash computation code
- Scripts handle both `sha256sum` (Linux) and `shasum` (macOS) automatically
- On Windows PowerShell 5.1, do **not** round-trip `.core-version.json` through `Get-Content | ConvertFrom-Json | ConvertTo-Json | Set-Content`; this corrupts UTF-8 description/notes text and can add a BOM

### Windows Shell Compatibility

On Windows, OpenCode runs shell commands in PowerShell unless `shell` in `opencode.json` says otherwise — typically Windows PowerShell 5.1 when PowerShell 7 is not installed. In that shell, do **not** use Bash / PowerShell 7 chaining operators such as `&&` or `||`. Run commands as separate Shell calls, or use `;` only when the later command does not depend on the earlier command succeeding.

### Mandatory Phase 8 Execution Protocol

> **CRITICAL — follow this exact sequence. Do NOT mark Phase 8 complete until all steps pass.**

#### Step 1 — Run the script via Shell tool

Execute the script using the Shell tool (terminal call). Do NOT describe the action — actually invoke it:

- **Windows:** `powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/compute-hashes.ps1 -Apply`
- **Unix/Mac:** `pwsh -File .opencode/skills/project-initialization/scripts/compute-hashes.ps1 -Apply` where PowerShell 7+ is installed — it is the only branch that writes the file. Otherwise `bash .opencode/skills/project-initialization/scripts/compute-hashes.sh` and apply its copy-paste block by hand, then set `initializationStatus` to `"active"` yourself: the shell script has no write mode and never touches that field.

Entries flagged `"optional": true` in `coreFiles` are reported as `missing (optional)` and do not block. If Windows `-Apply` reports missing **required** files, inspect each missing path. Only when every missing file is expected, rerun:

```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/compute-hashes.ps1 -Apply -AllowMissing
```

If any missing file is not optional, restore or remove the manifest entry before finalizing.

#### Step 2 — Apply computed hashes to the file

On Windows, Step 1 already applies the update. The script:
- Replaces each `"hash": "pending"` with the computed lower-case SHA-256 hex value, or `"missing"` only when `-AllowMissing` was explicitly used for confirmed optional files
- Sets `"initializationStatus": "active"`
- Updates `"lastUpdate"` and each `coreFiles[*].lastModified`
- Writes `.core-version.json` as UTF-8 without BOM

On Unix/Mac, use the script output to update the same fields with the Write tool or Node `fs.writeFileSync(..., 'utf-8')`. Do **not** use shell redirection or ad-hoc string replacement that rewrites unrelated fields.

If a PowerShell write is unavoidable, use only the BOM-free form:

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($absolutePath, $json, $utf8NoBom)
```

#### Step 3 — Verify: no "pending" values remain

After saving the file, run this verification command via Shell tool:

```powershell
Select-String -Path ".opencode/rules/.core-version.json" -Pattern '"pending"'
```

**Expected result:** zero matches (empty output).

If any `"pending"` entries are found — the step is NOT complete. Re-apply missing hashes and re-verify.

#### Step 4 — Verify: status is "active"

```powershell
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$path = (Resolve-Path ".opencode/rules/.core-version.json").Path
([System.IO.File]::ReadAllText($path, $utf8NoBom) | ConvertFrom-Json).initializationStatus
```

**Expected result:** `active`

If the result is anything other than `active` — fix and re-verify.

#### Step 4.5 — Baseline the docs-sync plugin

Run via the Shell tool:

```bash
node .opencode/hooks/docs-sync-check.js --record-state
```

Everything initialization wrote — `AGENTS.md`, `docs/INDEX.md`, `opencode.json`, the ledger, every `project-config.json` and `guidelines.md` — becomes the plugin's baseline: `lastSyncSha` is set to the current `HEAD`, the working-tree snapshot records these files and their blob hashes. Without this step the plugin fires on the very first idle after initialization — `initializationStatus` has just become `active` and the whole initialization output is uncommitted — recommending `/docs-sync` for the documentation it just generated.

#### Step 5 — Report result

Only after Steps 3 and 4 both pass, report Phase 8 as complete with:
- Total files hashed
- Count of `missing` files (files listed in `coreFiles` that don't exist on disk) — these are expected for optional template files
- Confirmation that `initializationStatus` is `"active"`
- Confirmation that the docs-sync baseline was recorded (Step 4.5)
- Confirmation that `.opencode/hooks/docs-sync-config.json` exists (generated in Phase 3 — see [stack-configuration.md → Part: Generate docs-sync-config.json](references/stack-configuration.md)); it is intentionally NOT part of `coreFiles`/the hash computation above, so verify its presence separately

## Proactive Clarification Principle

> **Cross-cutting behavior** — applies to ALL phases that gather or analyze information (Phases 3, 4, 5, 6).

During codebase analysis (Phase 4), requirements gathering (Phase 5), and domain skill configuration (Phase 6), the agent MUST proactively identify and resolve information gaps, inaccuracies, and contradictions by asking the user clarifying questions.

### When to Ask Clarifying Questions

| Trigger | Examples | Action |
|---------|----------|--------|
| **Information not found** | No API docs discovered, no auth pattern detected, no state management identified but UI is complex | Ask what's used, request links to documentation |
| **Incomplete information** | Partial API spec (only 3 of 20 endpoints documented), test coverage unclear | Ask user to confirm scope and provide missing details |
| **Contradictory findings** | Both REST and GraphQL used inconsistently, two different auth methods in different modules, conflicting patterns | Present contradictions, ask which is canonical |
| **Ambiguous patterns** | Code uses both Zustand and Context API without clear separation, mixed naming conventions | Ask about intended pattern and boundaries |
| **Critical domain gaps** | Backend exists but no database config found, payment integration detected but no security config | Ask for clarification and reference to relevant resources |
| **Outdated or stale info** | API specs don't match code, README describes different architecture than codebase | Present discrepancy, ask which is current |

### How to Ask

1. **Present what was found** — show detected information with confidence level
2. **Highlight the gap or contradiction** — clearly explain what's missing or conflicting
3. **Ask a specific question** — not "tell me about your API" but "I found 5 REST endpoints in `/api/` but no documentation. Where can I find the API spec or description?"
4. **Offer to accept references** — ask for paths to files, URLs to documentation, wiki pages, Confluence links, or other information sources
5. **Provide fallback options** — always allow the user to skip, describe manually, or mark as "to be determined"

### Clarification Question Template

```
🔍 Clarification Needed: {Area}

**What I found:**
{Description of detected information}

**What's missing / contradictory:**
{Description of gap, inconsistency, or contradiction}

**Question:**
{Specific clarifying question}

**Options:**
- [A] {Provide information directly}
- [B] {Point to a file/directory in the project}: _____________
- [C] {Provide a URL to external documentation}: _____________
- [D] {Skip / Mark as "to be determined"}

Your choice:
```

### Reference Gathering

When the user provides references (file paths, URLs, wiki links):
- **File paths** → read and analyze the referenced files immediately
- **URLs** → note in `project_init.md` for future reference; attempt to use WebFetch if available
- **"Not documented"** → record as a documentation gap and suggest documenting after initialization

### Key Rules

1. **Don't block on every uncertainty** — only ask about information critical to domain skill quality
2. **Batch related questions** — group 2-3 related clarifications per interaction, don't ask one-at-a-time
3. **Show what you know** — always present detected information before asking for clarification
4. **Accept partial answers** — user may not know everything; proceed with what's available
5. **Record all clarifications** — append a Q-block (see Decision Log format below) to the matching `### Phase {N}` subsection in the `User Answers & Decision Log`. Persist any operational value into the matching authoritative artifact (e.g., `project-config.json`, `metadata.json`, `development.md`); the ledger only stores the audit trail and a pointer to where the decision lives.

## Adaptive Question Principle (project-wide rule)

> **Hard rule, applies to every phase.** Initialization MUST NOT contain any hardcoded question lists, fixed N-round dialogues, or static "ask user about X" forms. Every user-facing question is generated dynamically at the moment it is needed, based on what the agent already knows.

This rule supersedes any phase-specific text that still describes "round 1 / round 2 / round 3" or "ask these N questions" patterns. If a phase reference doc reads as a script of fixed prompts, treat it as a **template library** the agent may draw from — not as a sequence to execute verbatim.

### The four-step adaptive pattern (use in EVERY phase)

Before opening a question round in any phase:

1. **Inventory what is already known** — read the artifacts produced by previous phases (`metadata.json`, `development.md`, per-domain `project-config.json`, Decision Log, `Supplemental Source Manifest`) plus the Phase 4 analysis artifacts under `.opencode/project/analysis/`.
2. **Score confidence per required field** — HIGH (≥ 2 independent signals or unambiguous detection) / MEDIUM (1 signal, plausible alternatives) / LOW (no usable signal). The set of required fields per phase is defined in the phase reference doc.
3. **Decide question budget** — `0` if every required field is HIGH; otherwise generate **1–3 dynamic questions** that resolve only the LOW / MEDIUM gaps. Never ask about HIGH-confidence fields.
4. **Generate questions on the fly** — each question MUST reference concrete names found in the codebase / docs / configs (`src/billing/`, `Tenant`, `/api/v2/*`, `stripe`). Generic phrasing ("your database", "your auth") is forbidden when concrete names exist.

### What "dynamic" means concretely

- **Question text is composed at runtime** from real findings, not pasted from a template.
- **Question count is variable** (0–3 per round) — driven by confidence, not by a script.
- **Question order reflects priority** — the gap whose absence most damages downstream phases comes first.
- **Priority order (highest first)** — (1) architecture and boundaries: module ownership, data isolation, integration semantics, a migration in progress; (2) domain contracts: API versioning and deprecation, the auth flow, data stores not visible in code; (3) conventions the code does not reveal: the canonical pattern among competing ones, the intent behind a custom mechanism; (4) process preferences: TDD policy, review rules; (5) non-functional targets with a safe industry default (Core Web Vitals, bundle budget, Lighthouse score, browser matrix, accessibility level, SEO). Tier 5 is written silently as `auto-filled — default` and never displaces a Tier 1–3 gap from the 1–3 question budget; it is asked only when a selected role makes it central (`performance` for performance targets) or a repository signal contradicts the default.
- **Skip is always an option** — every question includes `[Skip — mark as TBD]` and the gap mirrors into `## Open Gaps`.
- **Answers persist to authoritative artifacts** — never to the ledger as long-form prose. The ledger only stores the Q-block audit trail.

### What is forbidden

- Hardcoded "Round 1 / Round 2 / Round 3" sequences.
- Asking a question whose answer is already in `package.json`, `tsconfig.json`, `pom.xml`, `apm.lock.yaml`, `metadata.json`, or any prior phase's artifact.
- Asking the same question already asked in a previous phase (re-read the Decision Log first).
- Generic templates without concrete-name substitution (e.g. asking "what UI framework do you use?" when the agent already detected `@angular/core@17.x` in `package.json`).
- Forcing the user through N questions when M < N would have been enough.
- Asking for a non-functional target (browser matrix, accessibility level, SEO, Core Web Vitals, bundle budget) when a safe default exists and no selected role or repository signal makes it central — write the default and record it.

### Phases that MAY ask zero questions

Any phase can produce a zero-question round if the inventory shows full HIGH confidence. The agent records `Reflection: no — all signals high confidence` as a single Q-block and proceeds. This is the preferred path whenever it is honest.

---

## Phase Reflection Checkpoint (MANDATORY between phases)

> **Hard gate** — applies to every phase that gathers or analyses information: **Phases 1, 2, 4, 5, 6**. The agent MUST run a Reflection Pass before announcing the phase complete. Skipping reflection is a Phase Transition Validation failure.

This checkpoint is the **enforcement mechanism** for the Adaptive Question Principle above. It runs the four-step pattern at the end of each information-gathering phase and ensures clarifying questions are dynamic, name-referencing, and adapted to what was actually discovered — not static templates.

### Step 1 — Self-review (internal, ~30 seconds)

The agent silently answers four questions:

1. **What did I just discover?** (1–2 lines, concrete: modules, entities, endpoints, integrations, technology, role-pack signals)
2. **What do I have HIGH confidence about?** (data confirmed by ≥2 independent signals)
3. **What do I have LOW confidence about, or what is unclear / contradictory / missing?**
4. **Without resolving (3), will the next phase produce shallow / generic / inaccurate context skills, registry entries, or AGENTS.md content?**

### Step 2 — Decide

| Condition | Action |
|-----------|--------|
| (3) is **empty** AND (4) == "no" | **SKIP** the question round. Log a one-line decision in the Decision Log (`User Answers & Decision Log → ### Phase {N}`) such as `Reflection: no clarifications needed — all signals high confidence`. Proceed silently. |
| (3) is **non-empty** AND (4) == "yes" | **ASK 1–3 SPECIFIC, NAME-REFERENCING questions** following the rules below. |
| (3) is non-empty BUT (4) == "no" (gap is cosmetic) | Record the gap as `TBD` in the Decision Log AND mirror it under `## Open Gaps`; do not block the user. |

### Step 3 — Question Generation Rules

- **Reference SPECIFIC discovered names** — module folders (`src/billing/`), entity names (`Tenant`, `Invoice`), endpoint groups (`/api/v2/payments/*`), SDK names (`stripe`, `auth0-js`, `@aws-sdk/client-s3`). Generic categories ("your database", "your auth") are forbidden when concrete names exist.
- **Each question** must include three blocks:
  1. **What I found** — concrete observation from analysis
  2. **What's unclear** — explicit gap / contradiction / ambiguity
  3. **3–4 options** with at least one **`[Skip — mark as TBD]`** option
- **Batch related questions** — never ask one trivial question at a time; group up to 3 per interaction.
- **NEVER repeat hardcoded template questions** if data is already available from Phase 4 / Phase 5 analysis.
- **Maximum 3 questions per phase** — reflection is for critical ambiguity, not for filling forms.

### Step 4 — Record

- Append a reflection entry to `project_init.md` → `## User Answers & Decision Log → ### Phase {N}` using the Q-block format below. The entry must include:
  - `Reflection: yes` (or `no — all clear`)
  - **What I found:** concrete bullets (modules, entities, endpoints, integrations, technology, role-pack signals)
  - **Question asked:** verbatim or short paraphrase
  - **User answer:** answer (including `skipped` / `TBD`)
  - **Decision stored in:** authoritative artifact path (e.g., `.agents/skills/api-context/project-config.json`) or `ledger only` if the decision is purely procedural
  - **Follow-up:** outstanding work, or `none`
- If the user provides file paths or URLs, persist them into the relevant **domain `project-config.json`** under `"references": [...]` so context-skill rendering can use them, AND mirror the pointer in the `Supplemental Source Manifest` table for the consuming domain(s).
- Tick the checkbox `Phase {N} reflection completed` in `project_init.md → Phase Checklist`.

**Decision Log entry format (canonical):**

```markdown
#### Q{n}: {short title}
- Reflection: {yes / no — all clear}
- What I found: {observation or detected signal}
- Question asked: {exact text or short paraphrase}
- User answer: {answer, including "skipped" / "TBD"}
- Decision stored in: {authoritative artifact path, or "ledger only"}
- Follow-up: {anything remaining, or "none"}
```

### Smart Reflection Question — Example

```
🔍 Reflection — Phase 4 (Codebase Analysis)

**What I found (high confidence):**
- Entity `Tenant` with FKs to `User`, `Subscription`, `Invoice` (postgres schema)
- Stripe SDK in `src/billing/`, Twilio in `src/notifications/`
- 47 endpoints under `/api/v2/*`, 12 under `/api/v1/*`

**What's unclear (low confidence):**
- Tenant isolation strategy (schema-per-tenant vs row-level vs app-level)
- v1 deprecation policy

**Questions:**

Q1. Tenant isolation for `Tenant`/`Subscription`/`Invoice`?
  [A] Separate Postgres schema per tenant
  [B] Row-level security (RLS) on shared tables
  [C] Application-level filtering only
  [D] Skip — mark as TBD

Q2. `/api/v1/*` status — supported, deprecated, or sunset on a date?
  [A] Actively supported alongside v2
  [B] Deprecated, no new features, removal date: _____
  [C] Already sunset / kept only for one client: _____
  [D] Skip — mark as TBD
```

### Reflection vs Proactive Clarification — relation

The **Proactive Clarification Principle** above describes the *intent* and *style* of clarifying questions. The **Reflection Checkpoint** is the *mechanism* that triggers them at a specific moment (end of each gathering phase) and enforces them via Phase Transition Validation. Both work together; reflection makes proactive clarification non-optional.

## Error Handling

- If mode detection fails → ask user to specify NEW_PROJECT or EXISTING_PROJECT
- If technology detection fails → allow manual input
- If file read errors → offer retry, skip, or manual input
- If validation fails → suggest alternatives

## Progress Tracking

Show progress after each phase:
```
📊 Initialization Progress: [current]/9 phases
✅ Environment Setup (Phase 0)
⏳ Mode Detection (Phase 1 - in progress...)
⬜ Remaining phases...
```
