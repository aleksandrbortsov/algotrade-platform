# Phase 4 - Merge and Persist

> **Step file.** How the validated per-component artifacts become a single repository view, per-domain `project-config.json` content, and the Phase 4 ledger entries.
>
> **Parent:** [codebase-analysis.md](../codebase-analysis.md) - Phase 4 router
> **Previous step file:** [prompts.md](prompts.md) - research questions
> **Next step file:** [reflection-and-gaps.md](reflection-and-gaps.md) - the mandatory reflection checkpoint

---

## Analysis Report Generation

The orchestrator builds the user-facing summary from the **JSON artifacts** in `.opencode/project/analysis/`, not from the subagent replies (those carried only a ≤ 25-line summary each) and not from the `<component>.md` narratives (which are written for the user and for later `/docs-sync` runs, never read back here).

```markdown
📁 Codebase Analysis Summary

Project: [Project Name]
Analyzed: [Timestamp]
Method: [N] codebase-analyzer subagent(s), blocking dispatch, artifacts in .opencode/project/analysis/

## Entry Points
- Main: [entry file]
- Root Component: [root component]
- Backend: [server entry, if applicable]

## Architecture
**Pattern:** [detected pattern]

**Structure:**
[Folder structure tree]

**Organization:** [Well-organized / Needs improvement]

## Dependencies
**Total Dependencies:** [count]
**Key Libraries:** [top 5-10]

**Outdated Packages:** [count]
- [List most critical outdated packages]

## Code Quality
**Linting:** [Status]
**Testing:** [X%] coverage, [count] test files
**Documentation:** [Quality level]
**TypeScript:** [Usage level]

## Code Patterns
**Component Style:** [Functional/Class/Mixed]
**State Management:** [Pattern description]
**API Integration:** [Pattern description]
**Routing:** [Pattern description]

## API Documentation & Specifications
**Found:** [Yes/No]
**Documents:**
- [file path] — [type, e.g., OpenAPI 3.0] — [completeness: Full/Partial/Outdated]
- [file path] — [type] — [completeness]

**API-Related Code Locations:**
- [directory/file] — [description, e.g., "Route definitions with JSDoc annotations"]

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

## Opportunities
- [Opportunity 1: e.g., "Add E2E tests"]
- [Opportunity 2: e.g., "Update outdated dependencies"]
- [Opportunity 3: e.g., "Improve TypeScript strict mode"]
```

---

## MANDATORY: Phase Completion Actions

> **These actions are REQUIRED before Phase 4 can be considered complete.**
> **The agent MUST NOT proceed to Phase 5 without completing ALL of them.**

> **Source-of-truth rule (v3.1.0+):** Phase 4 produces a large analysis report, but it is NEVER inlined into `.opencode/project_init.md`. The report's content is split between (a) per-domain `project-config.json` files (operational facts) and (b) the `Supplemental Source Manifest` (pointers consumed by Phase 6). The ledger only carries Q-blocks under the Decision Log.

After completing analysis:

1. **Persist operational facts to per-domain `project-config.json`** (these inputs feed Phase 6 Part 3 `guidelines.md` rendering):
   - `database-context/project-config.json.entities` — top entities (name, key fields, relations, source path) from §9 (or per-backend-component equivalent in fan-out)
   - `api-context/project-config.json.endpoints` — endpoint groups (resource, methods, count, version, auth) from §10 — when fan-out, merged across all backend components with `service: <component-name>` prefix retained
   - `api-context/project-config.json.externalIntegrations` (or `infrastructure-context.integrations`) — named integrations from §11
   - `backend-context/project-config.json.businessModules` and `services` (when present) — business modules from §8 + one entry per detected backend component (name, language, runtime, location)
   - `frontend-context/project-config.json` — entry points, route tree, design system, state management — populated from each `frontend` / `mobile` / `mixed` component's report
   - `infrastructure-context/project-config.json` — populated from the dedicated infra component's report (sections A–E): containers, orchestration, CI/CD, environments, observability hooks
   - `coding-standards-context/project-config.json` — code-quality observations from §5–§6 (linting, formatting, TypeScript strictness, dominant patterns) — when fan-out, the union across all components with per-language detail retained

2. **Update `.opencode/project_init.md → ## Supplemental Source Manifest`:**
   - Row "Codebase analysis report" → cite the per-domain target paths just populated.
   - Row "API specifications" → list any OpenAPI/GraphQL/Protobuf/Postman files found in §7.
   - Row "Endpoint analysis" → cite `api-context/project-config.json.endpoints`.
   - Row "Compliance pre-checks" → cite any compliance hints from §11 (Stripe → PCI, Auth0+EU → GDPR, etc.).

3. **Append the audit trail** to `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 4 — Codebase Analysis (EXISTING_PROJECT)`:
   - `Q1` — auto-detected codebase summary (compact bullets only — see the Reflection Step 4 template in [`reflection-and-gaps.md`](reflection-and-gaps.md)).
   - `Q2..Q4` — Smart Reflection Questions asked + user answers + `Decision stored in:` paths.
   - Skipped clarifications get `User answer: skipped — TBD` and a bullet in `## Open Gaps`.

4. **Update `Artifact Pointers`:**
   - Set per-domain `project-config.json` rows that received content to `populated`.
   - Set `Optional architecture doc` row appropriately (`yes — created` only when `docs/project/ARCHITECTURE.md` was actually written).

5. **Tick checkboxes** — `Phase 4` AND `Phase 4 reflection completed` in `## Phase Checklist`.

6. **Verify** — Confirm:
   - `validate-analysis.js` exits 0, or every remaining flag is recorded under `## Open Gaps`.
   - `index.json` has no component left in `status: "pending"`, and its `coverage` map is filled — Phase 6 reads `coverage.api` to decide whether to re-scan the API surface.
   - Decision Log §4 has `Q1` + at least the Smart Reflection Question Q-blocks (or an explicit "no clarifications needed — all signals high confidence" entry).
   - At least one per-domain `project-config.json` was updated and is referenced in the manifest.
   - The ledger does NOT contain a duplicated long-form codebase report.

7. **Show progress:** `✅ Codebase analyzed (4/9 phases complete) — facts persisted to domain configs; pointers in Supplemental Source Manifest`

> **Safe stop point.** Once steps 1–6 are done, the phase is durable: the artifacts, the domain configs, and the ledger together let a fresh session resume at Phase 5 without re-reading a single source file. If the run is interrupted before that, the next `/initialize` reads `index.json` and re-dispatches only the components still `pending` or `failed`. See [SKILL.md → Safe Stop Points and Resumption](../../SKILL.md).
