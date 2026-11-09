# Phase 6 - Overview

> **Step file.** Read this before any Part. It states what Phase 6 produces, the mandatory render order, and the closing sequence: summary and confirmation, validation, phase completion actions, error handling, and the key principles that govern every Part.
>
> **Parent:** [configuration-updates.md](../configuration-updates.md) - Phase 6 router

---

## Phase 6: Configuration Updates

**Purpose:** Fill the central development rule with project-specific data and configure domain skills so that AI agents receive accurate, context-aware guidance.

**Two parts:**

| Part | Target | Data Source | Output |
|------|--------|-------------|--------|
| Part 1 | `development.md` | Phase 3 (stack) + Phase 5 (architecture summary) | Filled `[TO_BE_FILLED]` placeholders |
| Part 2 | Domain skills | Phase 3 + Phase 4 + Phase 5 + user answers + **Supplemental Source Manifest** | `project-config.json` per domain |
| Part 3 | Domain skills | `template.md` + `project-config.json` + **Supplemental Source Manifest** + Decision Log §4–§5 | Rendered `references/guidelines.md` per domain |

> **Source-of-truth rule (v3.1.0+):** Parts 2 and 3 do NOT read large duplicated sections from `.opencode/project_init.md`. The ledger only carries Q-blocks under `## User Answers & Decision Log` and pointer rows under `## Supplemental Source Manifest`. All operational facts come from the per-domain `project-config.json` files and from the artifacts listed in the Supplemental Source Manifest (e.g., `api-context.endpoints`, `database-context.entities`, OpenAPI specs, architecture wikis).

---

## Mandatory render order (Part 3)

> **`coding-standards-context` is rendered first, always.** Not as a convention — as a precondition. It is the sole owner of the cross-cutting rules, and every other domain's `guidelines.md` is written to **reference** those rules rather than restate them. A domain cannot reference a file that does not exist yet, so ordering is what makes the ownership rule enforceable instead of aspirational.

```
1. coding-standards-context      (always first — cross-cutting owner)
2. infrastructure-context        (second core context skill)
3. every remaining *-context skill, in any order
```

### Topics owned exclusively by `coding-standards-context`

| Topic | Owner | Every other domain does this instead |
|---|---|---|
| Naming conventions | `coding-standards-context` | References it; may add a domain-specific *addition* (e.g. "React components additionally use PascalCase file names"), never a redefinition |
| Error handling strategy | `coding-standards-context` | References it; may name the domain's error type or transport shape |
| Code organisation / folder layout | `coding-standards-context` | References it; may name this component's actual folders |
| Commit message format | `coding-standards-context` | Never mentions it |
| Documentation style (docstrings, comments) | `coding-standards-context` | Never mentions it |

A domain `guidelines.md` that re-defines any owned topic is a **Part 3.5 failure**, classed `ownership`. `check-guidelines-specificity.js` detects it mechanically, and Part 3.5 blocks on it. The fix is always to delete the duplicate and link to `coding-standards-context/references/guidelines.md` — never to "harmonise the wording" between two files that will drift apart the moment either is edited.

### If `coding-standards-context` is not installed

It is a core context skill and ships in the template, so absence means an APM install problem, not a legitimate configuration. Run the health gate (`validate-apm-install.ps1`), fix the install, then render. Do **not** proceed with domain skills whose text was going to reference a file that will never exist.

---

## Summary and Confirmation

After all domains processed:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Configuration Updates Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Part 1: development.md
✅ Technology Stack filled
✅ Architecture Overview filled
✅ Changelog updated

Part 2: Domain Skills Configured
✅ {domain}-context — {Key config summary}
...

Part 3: Guidelines Documents Generated
✅ {domain}-context → references/guidelines.md
...

Part 3.5: Guidelines Verification
Required domains (role + detected): {N}
✅ Complete: {list}
🔧 Auto-recovered: {list, or "None"}
⏭️ Skipped: {list, or "None"}

Skipped Domains:
⏭️  {domain} — {Reason: user choice / not applicable}
...

Updated Files:
- .opencode/rules/development.md (Technology Stack, Architecture, Changelog)
- .opencode/skills/{domain}-context/project-config.json (per configured domain)
- .opencode/skills/{domain}-context/references/guidelines.md (per configured domain)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next steps:
1. Proceed to Phase 7 (Documentation Generation)
2. Review/Edit a specific domain config
3. Add more domain configurations
4. Start over with domain selection
```

---

## Validation

Before marking Phase 6 complete, verify:

1. **development.md:** No `[TO_BE_FILLED]` placeholders remain
2. **Domain skills:** All selected `project-config.json` files have `"initialized": true`
3. **Guidelines documents:** All role-required and technology-detected domains have `references/guidelines.md` with no raw `{{PLACEHOLDER}}` tokens (Part 3.5 verification must pass)
4. **Render order:** `coding-standards-context/references/guidelines.md` existed before any other domain was rendered, and no other domain re-defines an owned cross-cutting topic
5. **Changelog:** `development.md` changelog has current date entries
6. **Consistency:** Stack info in `development.md` matches domain skill configs

---

## MANDATORY: Phase Completion Actions

> **These actions are REQUIRED before Phase 6 can be considered complete.**
> **The agent MUST NOT proceed to Phase 7 without completing ALL of them.**

After completing Phase 6 (Parts 1, 2, 3, and 3.5):

1. **Tick checkboxes** in `.opencode/project_init.md → ## Phase Checklist`:
   - ✅ `Phase 6` (configuration updated)
   - ✅ `Phase 6 reflection completed` (per-domain Reflection Step 0 ran for every configured domain)

2. **Update `Artifact Pointers`:**
   - `Stack + architecture (always-applied)` → `populated` (development.md Technology Stack + Architecture Overview filled).
   - `Domain configs (per active context skill)` → list each configured `<domain>-context/project-config.json` path with status `populated`.
   - `Domain guidelines (per active context skill)` → list each generated `<domain>-context/references/guidelines.md` path with status `generated`.

3. **Append Q-blocks to the Decision Log** — `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 6 — Domain Configuration`. One Q-block per configured domain (canonical format from `SKILL.md → Phase Reflection Checkpoint → Step 4`):

   ```markdown
   #### Q{n}: {domain}-context configuration
   - Reflection: yes (Reflection Step 0 ran)
   - What I found: confidence={low|med|high}; required fields scored: {summary}; supplemental sources discovered: {list of manifest rows consumed}
   - Question asked: {0–3 name-referencing questions actually asked, paraphrased}
   - User answer: {answers, including "skipped" / "TBD"}
   - Decision stored in: `.opencode/skills/{domain}-context/project-config.json` + `references/guidelines.md`
   - Follow-up: {anything outstanding, or "none"}
   ```

   Skipped domains (user choice / not applicable / BA-only gate) MUST get an explicit Q-block with `User answer: skipped — <reason>`. Compliance pre-checks fired in Phase 5 should be cross-cited if they influenced rendering.

4. **Mirror open gaps** — every `TBD` answer or "Skip — mark as TBD" choice from Phase 6 reflection gets a bullet under `## Open Gaps`.

5. **Verify artifacts exist** — Before marking complete, confirm:
   - No `[TO_BE_FILLED]` remains in `development.md`.
   - Each domain in `requiredContextSkills` has `project-config.json` with `"initialized": true`.
   - Each domain in `requiredContextSkills` has `references/guidelines.md` with no raw `{{PLACEHOLDER}}` tokens.
   - Part 3.5 mandatory guidelines verification has been executed and passed (all role-required + technology-detected domains covered).
   - Decision Log §6 has at least one Q-block per configured domain (and per skipped domain).
   - Each generated `guidelines.md` cites the supplemental sources used (per Step 4 of Generation Process).

6. **Show progress:** `✅ Configuration complete (6/9 phases complete) — domain configs + guidelines rendered; supplemental sources cited`

---

## Error Handling

| Error | User Options |
|-------|-------------|
| Domain skill template not found | Create from scratch (manual) / Skip / Retry |
| Write permission error | Different location / Display for manual copy / Skip |
| Detection failure | Enter manually / Skip domain |
| Invalid user input | Re-prompt with clarification |

---

## Key Principles

1. **User confirmation required** — Never write configuration without explicit approval
2. **Dynamic questions** — Generate based on context, not hardcoded options
3. **Smart defaults** — Best practice for detected stack pre-selected
4. **Graceful skipping** — Allow users to skip any domain
5. **Preview before write** — Show summary before writing project-config.json
6. **Log all actions** — Append per-domain Q-blocks (and per-skipped-domain Q-blocks) to `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 6`. The ledger does NOT carry full configuration content — that lives in `project-config.json` and `guidelines.md`.
7. **Skill-based output** — All domain configuration goes into `project-config.json`, not `.md` rule files.
8. **Proactive clarification** — Identify and resolve information gaps, contradictions, and ambiguities before writing configuration; ask for references when auto-detection is insufficient (see Proactive Clarification Principle in [SKILL.md](../../SKILL.md)).
9. **Reference gathering & supplemental sources** — When the user provides file paths or URLs as references during clarification, read local files immediately, store all paths/URLs in the domain's `project-config.json` under `"references"`, AND mirror them in the matching row of `.opencode/project_init.md → ## Supplemental Source Manifest`. Part 3 Step 0 will then surface them as additional inputs for the rendered `guidelines.md`, and the rendered file MUST cite which supplemental sources were used (per Generation Process Step 4).

This module ensures project configuration accurately reflects the chosen stack and collected requirements, providing AI agents with precise, structured guidance through domain skill configurations.
