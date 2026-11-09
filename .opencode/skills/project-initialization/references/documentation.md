
# Documentation Generation & Registry Module

This module handles Phase 7 and 7.5 of project initialization: generating project-specific documentation, creating AGENTS.md, and establishing comprehensive documentation registry with cross-references.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

---

## Phase 7: Documentation Generation

This phase creates project-specific documentation tailored to the collected initialization data.

### Part 1: Generate AGENTS.md (Project-Specific)

**Template Reference:** Use the unified [agents-template.md](agents-template.md) for the comprehensive Do/Don't/Commands/Safety/Structure/Examples/PR-checklist/When-stuck structure and placeholder definitions. This is the **same template** used by Quick Init — Full Initialization uses the identical AGENTS.md structure.

> **APM managed-section contract (v4.5.0+, APM 0.28.0).** APM's `apm compile` step also writes `AGENTS.md` (folding `.apm/instructions/*.instructions.md` from each installed package), but it does **not** emit per-package markers — smoke-verified on 0.28.0: in default `full` mode it overwrites the whole file. Co-ownership therefore uses APM's **`managed_section`** mode: the project's `apm.yml` (written by Phase 1.7-APM) sets `compilation.agents_md.mode: managed_section`, and `AGENTS.md` carries exactly one `<!-- apm:start -->` / `<!-- apm:end -->` pair (from `agents-template.md`). `apm compile` rewrites only the region between those markers; **Phase 7 MUST preserve the marker pair and everything between them verbatim** and only writes / updates sections OUTSIDE the markers (the Resource Map block, Architecture (TL;DR), Constraints, Project Conventions). Concretely:
>
> 1. Before regenerating AGENTS.md, read the existing file (if any) and extract the `<!-- apm:start -->...<!-- apm:end -->` region verbatim.
> 2. Generate the Workplace-managed sections from the template as usual (the template already includes an empty marker pair).
> 3. If an existing region was extracted, splice it back in place of the template's empty pair (never duplicate the pair, never move it relative to the surrounding hand-written sections without a user-visible note).
> 4. Write AGENTS.md.
>
> This contract is reciprocal: APM's writer only touches the managed region. Projects initialized before v4.5.0 gain the `compilation:` block and the marker pair via `/update-workplace` migration `v4.5.0-apm-0-28-baseline`. The full rationale lives in [`apm-workflow.md`](apm-workflow.md) Section 5.

**Generation Process:**

0. **Language:** All generated or updated prose in AGENTS.md, README (this phase), and spillover targets under `.opencode/skills/*/references/guidelines.md` MUST be **English** — same rule as Phase 6 (translate user dialogue when persisting; keep paths, URLs, and code tokens literal). See [Project Initialization Skill](../SKILL.md) → “English-only generated content”.

1. **Read `agents-template.md`** for template structure, placeholder definitions, component variants, generation process, **Brevity Principle**, and the **Mandatory Dialogue Mechanics**.
2. **Read the Phase 4 analysis artifacts** (`.opencode/project/analysis/`) to enrich detection data — including architecture pattern, constraints (engines/browserslist/Dockerfile/tsconfig target), conventions, and structure map. Dispatch a `codebase-analyzer` only if Phase 4 never ran (NEW_PROJECT flows have no artifacts to read).
3. **Dynamically load Canonical Agent Guidelines** from `.opencode/skills/coding-standards-context/SKILL.md` (as described in the "Dynamic Agent Guidelines Integration" section of agents-template.md).
4. **Run the adaptive Root Dialogue** — the seven AGENTS.md sections are filled from auto-detection signals (`package.json`, Explore subagent results, Phase 4 per-domain configs, `engines`, `browserslist`, `tsconfig`) and the user is prompted **only for fields the agent could not derive with HIGH confidence**. The number of surfaced questions is 0–5. If every section auto-derived, the user only confirms once. `skip: <reason>` is allowed for fields 2 (Architecture), 3 (Do's), and 5 (Constraints). Full mechanics: agents-template.md → "Dialogue Questions Catalog → Phase 1: Root AGENTS.md Questions (adaptive — driven by confidence, NOT a fixed list)".
   - Q1 Project description, Q2 Architecture style, Q3 Do's, Q4 Don'ts, Q5 Constraints & Non-Goals, Q6 Code style + commit format, Q7 Project structure pointers.
   - The analyzer output is used as the default for every question — the user confirms or overrides, never starts from a blank field.
5. **Apply the 5-line spillover rule** for each answer (see agents-template.md → Brevity Principle). For any over-limit answer:
   - place the short summary in AGENTS.md,
   - append the full content to an **already-present** canonical channel (priority order):
     - Architecture detail → `Project Conventions → ### Architecture` in this same AGENTS.md (always present, seeded empty).
     - Constraints / non-goals → `Project Conventions → ### Constraints` in this same AGENTS.md, or `infrastructure-context/references/guidelines.md` (runtime/perf) / `coding-standards-context/references/guidelines.md` (deps allowlist, language target).
     - Coding rules → `coding-standards-context/references/guidelines.md` (always present after Phase 6).
     - Domain rules (frontend/backend/api/db/testing/performance) → the corresponding `*-context/references/guidelines.md`, but **only if the matching APM package was installed in Phase 1.7-APM** (check `apm.lock.yaml`). If not installed, fall back to `Project Conventions` and leave a TODO line indicating which APM package would absorb the rule once installed (e.g. "install the `frontend-developer` package — `git: <apmPackages.registryRepoUrl>`, `path: frontend-developer`, `ref: master` — via `apm.yml` + `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, or re-run `/initialize` with the matching role selected").
   - **Optional escalation (Full Init only):** if Phase 7 Part 3 already created `docs/project/ARCHITECTURE.md` or `docs/project/STACK.md` in this same `/initialize` run (per its own EXISTING_PROJECT / complex-stack / explicit-request triggers), architecture or stack-rationale overflow MAY be appended there instead. **Never create `docs/project/*.md` files solely to absorb spillover** — Part 3 is the only authority for their creation.
   - replace the long content in AGENTS.md with a `→ See <link>` line.
6. **Detect nested components** and run per-component dialogue if applicable (3 questions per component, see agents-template.md Phase 2).
7. **Populate all placeholders** using the resolution priority table in agents-template.md, including the new `{{ARCHITECTURE_TLDR}}` and `{{CONSTRAINTS}}`.
8. **Set `{{GENERATION_MODE}}`** to "Full Initialization" (no `{{IF_QUICK_INIT}}` footer).
9. **Seed `{{PROJECT_CONVENTIONS}}`** — see the placeholder resolution table in [agents-template.md](agents-template.md). The section is created intentionally empty with a guidance blockquote so the team can fill it in over time. Append any `skip: <reason>` answers from the dialogue here as `### Skipped during init: <Q#>` subsections. This is the **primary channel** for project-wide adaptation in v3.0.0+ (no parallel `project-*` customization system).
10. **Emit the `Project Resource Map (read first)` block** verbatim at the top of the root AGENTS.md (right after the `> See https://agents.md` blockquote). This is **mandatory and hardcoded** — the block is defined in [agents-template.md](agents-template.md) and is the agent's canonical entry point to `docs/INDEX.md`. The forward link to `docs/INDEX.md` is permitted because INDEX.md is materialized in Phase 7.5 of the same `/initialize` run.
11. **Emit `Architecture (TL;DR)` and `Constraints & Non-Goals`** sections, populated from Q2 and Q5. Both must respect the 3-7 line/bullet hard limit and end with a `→ See …` link if spillover happened. Empty sections are not allowed: use the default placeholder blockquote when no data is available, so the gap is visible.
12. **Verify `Additional Resources`** section starts with the `docs/INDEX.md` bullet (label "Central documentation index — start here").
13. **Brevity audit before write** — count lines per section in the rendered AGENTS.md. If any section exceeds its hard limit (Brevity Principle table in agents-template.md), trigger another spillover pass before writing the file.
14. **Write AGENTS.md** to project root (and nested locations if applicable).

> **Phase 7 → Phase 7.5 ordering contract:** Phase 7 writes AGENTS.md containing a forward reference to `docs/INDEX.md`. Phase 7.5 immediately materializes `docs/INDEX.md` from the discovered inventory. Phase 7.5's completion gate verifies the AGENTS.md → INDEX.md link resolves. Never write AGENTS.md without the Resource Map block, and never skip Phase 7.5 after Phase 7.

**Key Difference from Quick Init:** Full Initialization has richer data from Phases 3-5 (stack configuration, requirements, codebase analysis) to pre-fill detection fields more accurately. The template structure and dialogue flow are identical.

---

### Part 2: Update README.md

Update only the project name and tagline in README.md. **Do NOT replace the entire file** - preserve the existing structure.

#### Steps

1. **Replace the title**: Change "NC AI-Assisted Engineer Workplace" to "[Project Name]"
2. **Update the tagline/description**: Replace generic description with project-specific one
3. **Keep all existing sections**: the OpenCode pre-configuration pointer, Quick Start, Learn More
4. **Preserve the link to GETTING_STARTED.md** - all detailed information stays there

#### Add Overview Section

```markdown
> [Project Description from metadata]

## Overview

**Type:** [Project Type]
**Goal:** [Primary Goal]
**Audience:** [Target Audience]

## Tech Stack

For complete technology stack details and configuration, see [Development Rules](.opencode/rules/development.md#project-technology-stack).

[If docs/project/STACK.md exists:] For detailed technical decisions and rationale, see [Technology Stack Documentation](docs/project/STACK.md).

## Getting Started

[Add installation and setup instructions based on package manager and framework]

## Project Structure

[Include folder structure from analysis if EXISTING_PROJECT]

[Rest of README content...]
```

**Important:** Do NOT duplicate framework, build tool, styling info. Only link to the source.

---

### Part 3: Generate Project-Specific Documentation (Optional)

**Important:** Only create these files when they add real value beyond what is already captured in `.opencode/rules/development.md` (stack + architecture summary), the context skill's `project-config.json` (per-domain facts; `.agents/skills/<domain>-context/` for package skills, `.opencode/skills/` for the two Core ones), and `references/guidelines.md` (rendered domain guidance). The ledger `.opencode/project_init.md` does NOT carry stack tables or architecture descriptions — never link a reader there for runtime knowledge.

Consider creating:

#### ARCHITECTURE.md
- **Only for EXISTING_PROJECT** with complex architecture
- **Content:** System architecture, design patterns, component relationships

#### STACK.md
- **Only when:**
  - EXISTING_PROJECT with complex/unusual stack
  - User explicitly requests detailed stack documentation
  - Stack requires detailed rationale
- **Content:** Detailed rationale, alternatives considered, version considerations, migration paths
- **DO NOT include:** Simple list of technologies (that lives in `.opencode/rules/development.md → Project Technology Stack`)

**STACK.md Example Structure (if created):**
```markdown
# Technology Stack

> **Note:** For the current stack configuration, see [.opencode/rules/development.md](../../.opencode/rules/development.md#project-technology-stack) (single source of truth, always-on instruction).

This document explains **why** we chose these technologies.

## Framework Choice: [Framework Name]

**Rationale:**
- Why we chose this over alternatives
- Project requirements that led to choice
- Team expertise considerations

**Alternatives Considered:**
- [Alternative 1]: Why not chosen
- [Alternative 2]: Why not chosen

## Version-Specific Considerations

**Current Versions:**
- [Framework]: v[X.Y.Z] - Specific features we rely on
- [Library]: v[X.Y.Z] - Breaking changes to be aware of

## Migration Paths

**Future Considerations:**
- When to upgrade to next major version
- Potential migration to different technology
- Technical debt to address
```

#### CONTRIBUTING.md
- If requirements include specific conventions

---

## Phase 7.5: Documentation Registry & Cross-Referencing

**Purpose:** Automatically register all created documentation and establish cross-references.

### Step 1: Scan the Repository for All Active Documentation and Rules

**Goal:** Build a complete, up-to-date inventory of documentation and rule files that exist in the repository **at the end of initialization** (after analysis + generation), including files that pre-existed before initialization.

**Why:** Relying only on "created during init" misses existing project documentation and project-specific rules. The registry and index should reflect the *current repo state*.

#### Include (default)

Documentation:
- Project root: `README.md`, `AGENTS.md`, `CHANGELOG.md`
- Initialization config: `.opencode/project_init.md`
- Project docs: `docs/**/*.md`

Rules:
- Core rules: `.opencode/rules/**/*.md`

> Note: Since v3.0.0 there are no `.opencode/rules/project/*.md` rule files; that directory holds only `metadata.json`. Project conventions live in the `Project Conventions` section of root `AGENTS.md`.

#### Exclude (default)

- Any ignored paths via `.gitignore` (OpenCode's search tools respect it)
- `**/node_modules/**`, build output (`dist/`, `build/`, `.next/`, etc.)
- Non-source binary assets (images, archives) unless explicitly documented elsewhere

#### Output of this step

Create two lists in-memory (or as notes in the current initialization context):
- **Discovered Documents**: all documentation files to link from `docs/INDEX.md`
- **Discovered Rules**: all rule files to link from `docs/INDEX.md` and/or reference from `documentation-management/SKILL.md`

Additionally, keep a smaller list:
- **Documents Created/Updated During This Initialization** (for the "creation log" section in `documentation-management/SKILL.md`)

#### Deduplication & Canonicalization (Required)

The discovery inventory MUST be deduplicated and stable across runs.

**Canonical path rules:**
- Convert all paths to repository-relative paths using forward slashes (`/`) for comparison and output.
- Trim whitespace.
- Remove redundant separators and `./` segments.
- Resolve simple `../` segments within the repo root when possible.
- **Windows compatibility:** treat paths as case-insensitive for deduplication (compare using `toLowerCase()`), but preserve original casing in output.

**Dedup key:**
- `dedupKey = canonicalPath.toLowerCase()` (case-insensitive key)

**Dedup merge rules (when the same file is found multiple times via different discovery routes):**
- Keep one entry per `dedupKey`.
- Prefer the entry with:
  1) a richer/explicit description (manual > auto-generated),
  2) a more specific category (e.g., `docs/project/*` > `docs/*`),
  3) otherwise keep the first occurrence after stable sorting.

**Stable sorting (so INDEX.md is deterministic):**
- Sort by:
  1) category priority (see "Section precedence" below),
  2) then by canonicalPath (case-insensitive),
  3) then by canonicalPath (case-sensitive) as a tie-breaker.

**Section precedence (a document may appear in ONLY ONE section):**
1. Core Project Overview: `README.md`, `.opencode/project_init.md`
2. Core Development Guides: `AGENTS.md`
3. Architecture & Design: `docs/project/ARCHITECTURE.md`, `docs/project/STACK.md`
4. Contribution Guidelines: `docs/project/CONTRIBUTING.md`
5. Additional Project Documentation: any other `docs/**/*.md` (including `docs/core/*.md` if present)

Identify all documents created or updated during initialization:

```
Track:
- README.md (always updated)
- AGENTS.md (generated in Phase 7)
- docs/project/ARCHITECTURE.md (if created for EXISTING_PROJECT)
- docs/project/STACK.md (if created for complex stack)
- docs/project/CONTRIBUTING.md (if created)
- opencode.json (generated and configured)
- Any other project-specific documentation
```

---

### Step 2: Generate docs/INDEX.md from Discovered Inventory (Dynamic, No Placeholders)

**IMPORTANT:** Do NOT create this file before initialization. Generate dynamically based on the **discovered repository inventory** (Step 1), so it includes pre-existing docs/rules as well as newly created ones.

#### Detection Logic

```javascript
// Determine which documents exist in the repo at the end of initialization
const discoveredDocs = {
  hasArchitecture: fileExists('docs/project/ARCHITECTURE.md'),
  hasStack: fileExists('docs/project/STACK.md'),
  hasContributing: fileExists('docs/project/CONTRIBUTING.md')
};

// Additionally, include other markdown files under docs/ if they exist:
// - docs/*.md
// - docs/project/*.md
// - docs/core/*.md (if present)
```

#### Generation Template

```markdown
# Documentation Index

> Central index of all project documentation and development rules

**Last Updated:** [Current timestamp - YYYY-MM-DD HH:MM]

---

## 📋 Core Documentation

### Project Overview
- [README.md](../README.md) - Project setup and quick start guide
- [.opencode/project_init.md](../.opencode/project_init.md) - Initialization ledger (state, decision log, supplemental source manifest)

### Development Guides
- [AGENTS.md](../AGENTS.md) - AI agent instructions
- [CHANGELOG.md](../CHANGELOG.md) - Version history

[ONLY include if docs/project/ARCHITECTURE.md was created:]
### Architecture & Design
- [ARCHITECTURE.md](project/ARCHITECTURE.md) - System architecture
- [STACK.md](project/STACK.md) - Technology stack decisions

[ONLY include if docs/project/CONTRIBUTING.md was created:]
### Contribution Guidelines
- [CONTRIBUTING.md](project/CONTRIBUTING.md) - How to contribute

[ALWAYS include if present:]
### Additional Project Documentation
- [Any other docs/*.md discovered] - One-line description

---

## 🔧 Development Rules

### Initialization & Setup
- [project-initialization skill](../.opencode/skills/project-initialization/SKILL.md) - Complete initialization workflow
- [project-initialization/references/quick-init.md](../.opencode/skills/project-initialization/references/quick-init.md) - Quick Init template setup

### Core Development
- [development.md](../.opencode/rules/development.md) - Development standards
- [orchestrator.md](../.opencode/rules/orchestrator.md) - Git workflows and MCP

### Documentation & Quality
- [documentation-management/references/markdown-standards.md](../.opencode/skills/documentation-management/references/markdown-standards.md) - Documentation standards
- [coding-standards-context/SKILL.md](../.opencode/skills/coding-standards-context/SKILL.md) - Rule structure
- [documentation-management/SKILL.md](../.opencode/skills/documentation-management/SKILL.md) - Registry system

[OPTIONAL: Project Identity]
- [.opencode/rules/project/metadata.json](../.opencode/rules/project/metadata.json) - Project identity (name, repo, environments)

### TaskMaster Integration
- [dev_workflow.md](../.opencode/rules/taskmaster/dev_workflow.md) - TaskMaster workflow
- [taskmaster.md](../.opencode/rules/taskmaster/taskmaster.md) - Commands reference

---

## 🔗 Quick Navigation

### Getting Started
1. [Initialize Project](../.opencode/project_init.md) (initialization ledger) → [Initialization Process](../.opencode/skills/project-initialization/SKILL.md)
2. [TaskMaster Workflow](../.opencode/rules/taskmaster/dev_workflow.md) → [Command Reference](../.opencode/rules/taskmaster/taskmaster.md)

### Development Workflow
1. [Development Standards](../.opencode/rules/development.md)
2. [Git Workflow](../.opencode/rules/orchestrator.md)
3. [TaskMaster Workflow](../.opencode/rules/taskmaster/dev_workflow.md)

[ONLY include if architecture docs exist:]
### Architecture & Design
1. [Architecture Guide](project/ARCHITECTURE.md)
2. [Technology Stack](project/STACK.md)
3. [Analysis Strategy](../.opencode/skills/codebase-analysis/SKILL.md)

---

## 📝 How to Use This Index

### For New Team Members
1. Start with [README.md](../README.md) for project overview
2. [If `nc-code-security-audit` is installed:] Review security rules in [.agents/skills/security-compliance/SKILL.md](../.agents/skills/security-compliance/SKILL.md)
[If architecture docs exist:] 3. Read [ARCHITECTURE.md](project/ARCHITECTURE.md) and [STACK.md](project/STACK.md)
4. Familiarize with [development standards](../.opencode/rules/development.md)

### For Contributors
[If CONTRIBUTING.md exists:] 1. Read [CONTRIBUTING.md](project/CONTRIBUTING.md)
2. Follow [git workflow](../.opencode/rules/orchestrator.md)
3. Use [TaskMaster workflow](../.opencode/rules/taskmaster/dev_workflow.md)

### For AI Agents
1. This file provides complete navigation of project documentation
2. All relative links are bi-directional
3. Update this index when creating new documentation

---

## 🔄 Maintenance

This index was automatically generated during project initialization (Phase 7.5).

**Update triggers:**
- When new major documentation is created
- After architecture changes
- When new development rules are added

**To update this index:**
1. Add new document entry in appropriate section
2. Update [documentation-management/SKILL.md](../.opencode/skills/documentation-management/SKILL.md)
3. Ensure bi-directional cross-references
4. Validate all relative links

---

## Related Documentation
- [documentation-management/SKILL.md](../.opencode/skills/documentation-management/SKILL.md) - Complete registry system

---

*This index ensures all project documentation is discoverable and properly cross-referenced.*
```

**Dynamic Content Rules:**
1. **Always include:** README.md, .opencode/project_init.md, AGENTS.md, core docs, core rules
2. **Conditionally include:** ARCHITECTURE.md, STACK.md, CONTRIBUTING.md (check file existence)
3. **Set correct timestamp:** Use actual initialization completion time
4. **Include discovered extras:** Any additional markdown files under `docs/` and any project rules under `.opencode/rules/project/` when present
5. **Deduplicate output:** Each discovered document/rule must be listed at most once in the index (use canonical-path deduplication and section precedence from Step 1)

---

### Step 3: Insert Cross-References in New Documents

For each newly created document, add appropriate cross-reference sections.

#### For docs/project/ARCHITECTURE.md (if created):

```markdown
## Related Documentation
- [.opencode/rules/development.md](../../.opencode/rules/development.md#project-technology-stack) - Current tech stack
- [docs/project/STACK.md](STACK.md) - Stack decisions
- [docs/INDEX.md](../INDEX.md) - Complete index
- [README.md](../../README.md) - Project overview

## Related Rules
- [.opencode/rules/development.md](../../.opencode/rules/development.md) - Development standards
- [.opencode/skills/codebase-analysis/SKILL.md](../../.opencode/skills/codebase-analysis/SKILL.md) - Analysis methodology
```

#### For docs/project/STACK.md (if created):

```markdown
## Related Documentation
- [.opencode/rules/development.md](../../.opencode/rules/development.md#project-technology-stack) - **Current stack** (single source of truth)
- [docs/project/ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [docs/INDEX.md](../INDEX.md) - Complete index

## Related Rules
- [.opencode/rules/development.md](../../.opencode/rules/development.md) - Framework guidelines
- [.opencode/skills/project-initialization/SKILL.md](../../.opencode/skills/project-initialization/SKILL.md) - Stack configuration

**Note:** This document explains **rationale**. For **current stack**, see [development.md](../../.opencode/rules/development.md#project-technology-stack).
```

#### For docs/project/CONTRIBUTING.md (if created):

```markdown
## Related Documentation
- [docs/INDEX.md](../INDEX.md) - Complete index
- [README.md](../../README.md) - Project setup

## Related Rules
- [.opencode/rules/orchestrator.md](../../.opencode/rules/orchestrator.md) - Git workflow
- [.opencode/rules/development.md](../../.opencode/rules/development.md) - Coding standards
- [.opencode/skills/coding-standards-context/SKILL.md](../../.opencode/skills/coding-standards-context/SKILL.md) - Rule updates
- [.opencode/rules/taskmaster/dev_workflow.md](../../.opencode/rules/taskmaster/dev_workflow.md) - TaskMaster workflow
```

---

### Step 4: Update Existing Documents with New References

#### Update docs/GETTING_STARTED.md

If architecture documentation was created, add references in "📚 Documentation" section:

```markdown
## 📚 Documentation

After initialization, your project will have:

- **`docs/INDEX.md`** - Auto-generated documentation index
- **`AGENTS.md`** - AI coding agent instructions
[If created:] - **[docs/project/ARCHITECTURE.md](project/ARCHITECTURE.md)** - System architecture
[If created:] - **[docs/project/STACK.md](project/STACK.md)** - Technology stack rationale
[If created:] - **[docs/project/CONTRIBUTING.md](project/CONTRIBUTING.md)** - Contribution guidelines
- **[.opencode/rules/development.md](../.opencode/rules/development.md#project-technology-stack)** - Technology stack (single source of truth)
- **`.opencode/rules/`** - Detailed coding rules
```

---

### Step 5: Update Rules with References

#### Update .opencode/rules/development.md (if STACK.md created):

```markdown
## Technology Stack Reference

For detailed information about technology stack:
- Rationale behind choices
- Version-specific considerations
- Alternative options considered
- Migration paths

See [docs/project/STACK.md](docs/project/STACK.md).
```

#### Update .opencode/skills/codebase-analysis/SKILL.md (if ARCHITECTURE.md created):

```markdown
## Architecture Documentation

For complete architecture analysis:
- System architecture patterns
- Component relationships
- Data flow diagrams
- Design decisions

See [docs/project/ARCHITECTURE.md](docs/project/ARCHITECTURE.md).
```

---

### Step 6: Update documentation-management/SKILL.md

Add entries for all newly created documents:

```markdown
## Documents Created During This Initialization

[Timestamp: YYYY-MM-DD HH:MM]

**Mode:** [NEW_PROJECT/EXISTING_PROJECT]
**Framework:** [Detected/Chosen Framework]

**Documents Created/Updated:**
- README.md - Updated with project name
- docs/GETTING_STARTED.md - Preserved as universal guide
- .opencode/project_init.md - Updated ledger entries (Decision Log §7 / §7.5, Artifact Pointers, Phase Checklist)
[If created:] - docs/project/ARCHITECTURE.md - Generated from analysis
[If created:] - docs/project/STACK.md - Technology stack documentation
[If created:] - docs/project/CONTRIBUTING.md - Contribution guidelines
- docs/INDEX.md - Created as central index
- AGENTS.md - Generated with dynamic agent guidelines

**Cross-references Added:**
[List all cross-references inserted]
```

---

### Step 7: Validate Link Integrity (Discovered Inventory)

Check all newly added links:

```
For each link added:
1. Verify target file exists
2. Verify relative path is correct
3. Ensure bi-directional links where required
4. Report any broken or missing links
```

#### Cross-Reference Deduplication (Required)

When inserting cross-references into any markdown/mdc file:
- Do not add a link if the same target already exists in the same section.
- Treat links as duplicates if their **canonical target path** matches (case-insensitive on Windows).
- Prefer keeping the existing line unless the new line provides a materially better description (then replace rather than duplicate).

---

## MANDATORY: Phase Completion Actions

> **These actions are REQUIRED before Phase 7/7.5 can be considered complete.**
> **The agent MUST NOT proceed to Phase 8 without completing ALL of them.**

After completing Phase 7 & 7.5:

1. **Update `.opencode/project_init.md` ledger:**
   - Set `Artifact Pointers` rows for `Documentation index`, `Root AGENTS.md`, `Root README.md`, and any optional `docs/project/*` doc that was actually created (set to `created` / `populated`).
   - Append a Q-block per dialogue answer (Q1–Q7) to `## User Answers & Decision Log → ### Phase 7 — Documentation`. Include `skip: <reason>` answers verbatim. `Decision stored in:` points to `AGENTS.md` (and to `Project Conventions` for skipped Q3/Q5).
   - Append a Q-block to `## User Answers & Decision Log → ### Phase 7.5 — Documentation Registry` summarising: discovered document count, discovered rule count, link-integrity result, broken links found (or `none`). `Decision stored in:` points to `docs/INDEX.md`.
   - Tick `Phase 7` and `Phase 7.5` in `## Phase Checklist`.

2. **Check checkboxes** — All applicable:
   - [x] AGENTS.md generated (Part 1 - after loading rules from coding-standards-context/SKILL.md)
   - [x] All 7 dialogue fields resolved — auto-accepted with a recorded source, answered, or `skip: <reason>` (Q3/Q5 only); 0–5 prompts surfaced, none dropped silently
   - [x] AGENTS.md root contains the `Project Resource Map (read first)` block at the top
   - [x] AGENTS.md root contains non-empty `Architecture (TL;DR)` section (3-7 lines)
   - [x] AGENTS.md root contains non-empty `Constraints & Non-Goals` section (3-7 bullets)
   - [x] No section in root AGENTS.md exceeds its Brevity Principle hard limit (line/bullet counts within bounds; spillover relocated to canonical docs)
   - [x] AGENTS.md root `Additional Resources` first bullet is `docs/INDEX.md`
   - [x] README.md updated (Part 2)
   - [x] Role-based MCP configuration (if applicable)
   - [x] Role-specific commands generated
   - [x] Project-specific docs generated (only when Phase 7 Part 3 triggers fire — `docs/project/ARCHITECTURE.md`, `docs/project/STACK.md`, `docs/project/CONTRIBUTING.md` are optional and not created just to absorb AGENTS.md spillover)
   - [x] Documentation registry updated
   - [x] `docs/INDEX.md` exists and contains every link referenced from AGENTS.md Resource Map (link integrity check passed)

3. **Verify** — Confirm `AGENTS.md`, `README.md`, and `docs/INDEX.md` exist with project-specific content (not template placeholders)

4. **Hard-gate: AGENTS.md ↔ INDEX.md link integrity**
   - Grep root `AGENTS.md` for the literal string `docs/INDEX.md`. Must appear at least **twice** (once in the Resource Map block, once in Additional Resources).
   - Confirm `docs/INDEX.md` file exists on disk.
   - If either check fails, **block Phase 8** and re-run the relevant Phase 7 / 7.5 step until both pass.

5. **Show progress:** "✅ Documentation ready and registered (7.5/9 phases complete)"

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) - Main initialization orchestrator
- **Previous:** [requirements.md](requirements.md) - Phase 5: Requirements collection
- **See also:** [user-roles-mcp.md](user-roles-mcp.md) - MCP configuration details

---

## Important Notes

1. **Dynamic Loading**: AGENTS.md rules MUST be read from coding-standards-context/SKILL.md each time
2. **Conditional Creation**: Only create STACK.md/ARCHITECTURE.md when they add value
3. **Link Integrity**: All relative links must be validated
4. **Bi-directional References**: High-priority document-rule pairs must link both ways
5. **Central Index**: docs/INDEX.md is the single navigation hub
6. **Documentation Registry**: All changes must be logged in documentation-management/SKILL.md

This module ensures comprehensive, cross-referenced documentation that serves both human developers and AI agents effectively.
