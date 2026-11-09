# Requirements Gathering Module (Phase 5 router)

This module handles Phase 5 of project initialization: collecting components, architecture decisions, performance targets, general requirements, and security posture — adaptively, using what Phase 4 already found.

**Parent Workflow:** [Project Initialization Skill](../SKILL.md)

---

## Read the step file, not the directory

Phase 5 was one 1 200-line document. It is now eight step files under [`phase-5/`](phase-5/). **Read `overview.md` first, then only the Part you are on.** Reading the whole directory up front reproduces exactly the context cost the split exists to remove.

| Step | Read | Contains |
|---|---|---|
| Always first | [`phase-5/overview.md`](phase-5/overview.md) | Adaptive Mode (supersedes the literal "Round N" bodies), skip-by-default policy for EXISTING_PROJECT, pre-flight check, confidence scoring, compliance pre-check, Phase 5 completion actions |
| Part 1 | [`phase-5/part-1-components.md`](phase-5/part-1-components.md) | Components documentation, both modes |
| Part 1.5 | [`phase-5/part-1-5-api-docs.md`](phase-5/part-1-5-api-docs.md) | API documentation discovery, the subagent dispatch over user-specified locations, and the resulting `api-context` inventory. Skip when the project has no API surface |
| Part 2 | [`phase-5/part-2-architecture.md`](phase-5/part-2-architecture.md) | Architecture and decisions, both modes, persistence targets |
| Part 3 | [`phase-5/part-3-performance.md`](phase-5/part-3-performance.md) | Core Web Vitals, performance budgets, optimisation strategy |
| Part 4 | [`phase-5/part-4-general.md`](phase-5/part-4-general.md) | General cross-cutting requirements |
| Part 5 | [`phase-5/part-5-security.md`](phase-5/part-5-security.md) | Compliance and project-specific security — **gated**: BASS Security Guides questions only run when `nc-code-security-audit` was installed in Phase 1.7-APM |
| BA-only run | [`phase-5/ba-mode.md`](phase-5/ba-mode.md) | Simplified BA equivalents of every Part (1.5 and 3 skipped outright) — read **instead of** the Parts when all selected roles are `ba` |

---

## Phase 5 in one paragraph

Run the pre-flight check from `overview.md` before each Part: read the per-domain `project-config.json` files Phase 4 populated, score confidence, and skip by default whatever is already derivable — asking only the gap. Each answer is persisted to its `*-context/project-config.json` first; the ledger records only the Q-block audit trail.

---

## Related Modules

- **Parent:** [Project Initialization Skill](../SKILL.md) - Main initialization orchestrator
- **Contract:** [subagent-contract.md](subagent-contract.md) - How the Part 1.5 subagent dispatch runs
- **Previous:** [codebase-analysis.md](codebase-analysis.md) - Phase 4: Codebase analysis (EXISTING_PROJECT only)
- **Next:** [configuration-updates.md](configuration-updates.md) - Phase 6: Configuration updates

---

## Important Notes

1. **Adaptive, not progressive**: the Parts are option libraries; `phase-5/overview.md` decides per Part whether 0, 1 or up to 3 questions are surfaced, batched into one interaction
2. **Always Provide Examples**: Show concrete examples in parentheses for each question
3. **Validate Input**: Confirm user's answers before proceeding to next phase
4. **Read from authoritative artifacts**: Pre-flight checks read per-domain `project-config.json` populated in Phase 4 (NOT a duplicated section in `project_init.md`), plus the Phase 4 analysis artifacts under `.opencode/project/analysis/`; skip-by-default rounds rely on those configs + `Supplemental Source Manifest`.
5. **Conditional Sections**: Part 3 runs only when `performance-context` is installed and the project has a web surface (defaults are written otherwise; questions only with the `performance` role); Part 4 derives its fields from code signals, asks at most one batched question and is skipped for non-web projects.
6. **Persist, then audit**: Every operational answer goes into the matching `*-context/project-config.json` first; the ledger only records the Q-block audit trail.

This module ensures comprehensive project requirements are collected, providing foundation for accurate rule configuration and documentation generation.
