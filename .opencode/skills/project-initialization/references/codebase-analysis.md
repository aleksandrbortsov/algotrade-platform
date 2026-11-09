# Codebase Analysis Module (Phase 4 router)

This module handles Phase 4 of project initialization: comprehensive analysis of existing codebases to understand structure, patterns, and opportunities for improvement.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

**IMPORTANT:** This phase is **only executed for EXISTING_PROJECT mode**. For NEW_PROJECT, this phase is skipped entirely.

---

## Read the step file, not the directory

Phase 4 was one 1 100-line document. It is now five step files under [`phase-4/`](phase-4/). **Read the file for the step you are on** — reading the whole directory up front reproduces exactly the context cost the split exists to remove.

| Step | Read | Contains |
|---|---|---|
| 1. Decide scope and launch | [`phase-4/dispatch.md`](phase-4/dispatch.md) | Why delegation is mandatory, the artifact model, component detection, single vs fan-out, **Steps 0–6 of the wave** (seed `index.json`, build the plan, launch in parallel, merge + `validate-analysis.js`, the "merge into a single repository view" table, the per-component persistence map), special cases (monorepo, very large codebase, multiple frameworks, no clear pattern), error handling |
| 2. Write the briefs | [`phase-4/prompts.md`](phase-4/prompts.md) | Scoped prompt templates per component kind, the infra-only prompt, the 11-section whole-repository prompt, the analysis-areas reference behind each section, and the post-wave "processing the analyzer artifacts" checklist |
| 3. Turn artifacts into config | [`phase-4/merge-and-persist.md`](phase-4/merge-and-persist.md) | The user-facing analysis report template, Phase 4 completion actions and ledger writes |
| 4. Reflect and close gaps | [`phase-4/reflection-and-gaps.md`](phase-4/reflection-and-gaps.md) | The mandatory reflection checkpoint (Steps 1–4), Smart Reflection Question templates, gap-detection checklist, clarification questions, processing user answers |
| BA-only run | [`phase-4/ba-mode.md`](phase-4/ba-mode.md) | The BA role gate, the simplified 6-section BA prompt and report, BA gap detection — read **instead of** steps 2 and part of 4 when every selected role is `ba` |

**How every dispatch runs** — brief structure, budgets, output contract, retry rules — is defined once in [`subagent-contract.md`](subagent-contract.md). Read it together with `phase-4/dispatch.md` on the first Phase 4 dispatch of a session.

---

## Phase 4 in one paragraph

Detect components, seed `.opencode/project/analysis/index.json`, dispatch one `codebase-analyzer` subagent per component (all `Task` calls in a single message, foreground), let each subagent write `<component>.json` + `<component>.md` itself and return a ≤ 25-line summary, merge the summaries into `index.json`, run `validate-analysis.js`, re-dispatch only what it flags, then merge the JSON artifacts into per-domain `project-config.json` and run one repository-level reflection checkpoint.

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) - Main initialization orchestrator
- **Contract:** [subagent-contract.md](subagent-contract.md) - How every subagent dispatch runs
- **Previous:** [stack-configuration.md](stack-configuration.md) - Phase 3: Technology stack
- **Next:** [requirements.md](requirements.md) - Phase 5: Requirements collection

---

## Important Notes

1. **Only for EXISTING_PROJECT** - Skip entirely for NEW_PROJECT mode
2. **ALWAYS delegate** - Never perform codebase analysis directly in the main initialization agent's context; always dispatch the `codebase-analyzer` subagent per [`subagent-contract.md`](subagent-contract.md)
3. **Blocking dispatch is mandatory** — never pass `background: true`; the main agent must have every summary before the phase transition validation runs
4. **Read-only by permission, not by parameter** — the analyzer's `permission` block confines its writes to the two report artifacts; the brief's CONSTRAINT block restates the scope
5. **Request "very thorough" analysis** - Initialization requires comprehensive analysis, not a quick scan
6. **Context window preservation** - The primary reason for delegation is to keep the main initialization agent's context window clean for the remaining phases (5-8). The artifact model extends that: the full reports live on disk and only summaries cross back
7. **Present findings clearly** - Use visual formatting for readability
8. **Provide actionable recommendations** - Don't just identify issues
9. **Respect privacy** - Don't log sensitive data from code
10. **Handle large codebases gracefully** - Per-component fan-out plus the file-read budgets keep a large repository tractable; see `phase-4/dispatch.md` → Special Cases

This module provides comprehensive codebase understanding that informs all subsequent configuration and documentation decisions.
