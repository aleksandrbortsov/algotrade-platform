
# Configuration Updates Module (Phase 6 router)

This module handles Phase 6 of project initialization: applying collected configuration data to `development.md` and configuring domain skills with project-specific settings.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

---

### English-only output (strict — applies to all of Phase 6)

Every **generated or edited** string in Phase 6 MUST be **English**, with no exceptions for “context skill convenience”:

- **`project-config.json`** — All human-readable values (summaries, `patterns`, `conventions`, `constraints`, notes, descriptions, registry text, etc.) MUST be English. If the user answered in another language, **translate** into clear English before writing JSON.
- **`references/guidelines.md`** — The full rendered document MUST be English (same translation rule).
- **`development.md` (Part 1)** — Free-text sections MUST be English.

**Preserve without translating:** identifiers, paths, URLs, vendor/product names where fixed, quoted API shapes, and locale-specific proper nouns when renaming would be wrong.

This rule applies to **full `/initialize`**, **`/quick-init`** (core context skills), and **standalone `apm install`** flows (e.g. user adds a new APM package to `apm.yml`) that reuse Parts 2–3.5 — the Part 3.5 gate enforces it.

---

## Read the step file, not the directory

Phase 6 was one 1 600-line document. It is now six step files under [`phase-6/`](phase-6/). **Read `overview.md` first, then only the Part you are on.**

| Step | Read | Contains |
|---|---|---|
| Always first | [`phase-6/overview.md`](phase-6/overview.md) | What Phase 6 produces, the source-of-truth rule, the mandatory render order, summary and confirmation, validation, phase completion actions, error handling, key principles |
| Part 1 | [`phase-6/part-1-development-mdc.md`](phase-6/part-1-development-mdc.md) | Filling `development.md` stack and architecture sections |
| Part 2 | [`phase-6/part-2-domain-skills.md`](phase-6/part-2-domain-skills.md) | **Step 0: install the owning APM package for any detected-but-missing domain — before the first question**, then which context skills get configured, dynamic question generation from real findings, the interactive flow |
| API sub-analysis | [`phase-6/api-analysis.md`](phase-6/api-analysis.md) | The two-stage API analysis for `api-context`. **Conditional** — skipped when `.opencode/project/analysis/index.json` already reports `coverage.api: true` |
| Part 3 | [`phase-6/part-3-guidelines.md`](phase-6/part-3-guidelines.md) | Rendering each `references/guidelines.md` from its `project-config.json` |
| Part 3.5 | [`phase-6/part-3-5-verification.md`](phase-6/part-3-5-verification.md) | The blocking verification gate: required-skill derivation, install-vs-render diagnostics, `check-guidelines-specificity.js`, the final gate |

---

## Phase 6 in one paragraph

Part 1 fills the central development rule. Part 2 configures every applicable context skill by asking questions generated from what Phase 4 actually found, persisting answers to `project-config.json`. Part 3 renders each skill's `guidelines.md` from that config, in the order `overview.md` fixes — `coding-standards-context` first, so the cross-cutting rules exist before any domain skill can restate them. Part 3.5 then blocks the phase until every rendered file is concrete and every required skill is both installed and rendered.

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) - Main initialization orchestrator
- **Contract:** [subagent-contract.md](subagent-contract.md) - How the API sub-analysis dispatch runs
- **Previous:** [requirements.md](requirements.md) - Phase 5: Requirements collection
- **Next:** [documentation.md](documentation.md) - Phase 7: Documentation creation
- **Data sources:**
  - [stack-configuration.md](stack-configuration.md) - Framework selection (Phase 3)
  - [requirements.md](requirements.md) - Architecture & performance data (Phase 5)
  - [codebase-analysis.md](codebase-analysis.md) - Codebase structure (Phase 4) and the artifacts under `.opencode/project/analysis/`

This module ensures project configuration accurately reflects the chosen stack and collected requirements, providing AI agents with precise, structured guidance through domain skill configurations.
