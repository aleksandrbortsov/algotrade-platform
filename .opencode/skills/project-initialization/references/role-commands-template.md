
# Role → APM Package Mapping (Specification)

> **This file is a SPECIFICATION, not a generator.** The initializer NEVER synthesises role-specific commands or agents from templates. Every role-specific agent/command/skill is shipped as an APM package in the standalone [Workplace-Agent-Packages](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages) repo and deployed by `apm install` (Phase 1.7-APM) — no inline rendering, no template substitution.

**Used by:** [phase-1-7-apm.md](phase-1-7-apm.md) (Phase 1.7-APM orchestration)
**APM authoring reference:** [`apm-workflow.md`](apm-workflow.md) and [`../../apm-packaging/SKILL.md`](../../apm-packaging/SKILL.md)

---

## The Hard Rule

```
SOURCE OF TRUTH for role-specific commands/agents/skills:
    Workplace-Agent-Packages repo: {package-id}/.apm/{agents,commands,skills}/

ACTIVATION: apm-install-preserving.js (apm install, targets: [opencode]) → .opencode/{agents|commands} + .agents/skills

NO TEMPLATES. NO SUBSTITUTION. NO SYNTHETIC GENERATION AT ACTIVATION TIME.
```

If a command needs to behave differently based on the project's tech stack, that variability lives **inside the command file** — the command reads the relevant `*-context` skill's `references/guidelines.md` (or `project-config.json`) at runtime, the same way `/quality-check` reads `coding-standards-context/references/guidelines.md`.

---

## Role → Package Mapping

| Normalized role key | Auto-installed APM packages (Phase 1.7-APM auto) | Notes |
|---|---|---|
| `frontend` | `frontend-developer`, `api` | Frontend stack + API design helpers |
| `backend` | `backend-developer`, `api` | Backend services + DB + API |
| `fullstack` | `frontend-developer`, `backend-developer`, `api`, `performance` | All four — APM deduplicates if the same primitive appears twice (packages are disjoint by design) |
| `mobile` | — | No package yet. Mobile MCP servers (Expo, Postman) still get configured. |
| `designer` | — | No package yet. Figma MCP still gets configured. |
| `performance` | `performance` | Performance specialist + context |
| `qa` | `qa` | + the `test-generation` full-module package is offered (prompt) |
| `ba` | `business-analyst` | BA workflow commands and skills |
| `upgrade` | — | No role-matched package. The `product-migration` full-module package is offered (prompt). |

> **Optional, role-agnostic packages** (`x-workplace.optional: true`, `x-workplace.targetRoles: []`) are **never** mapped to a role and **never** auto-installed. Eligible optional packages are offered separately during Phase 1.7-APM as a batched yes/no prompt. Packages with `x-workplace.standaloneOnly: true` are skipped during `/initialize`; they are offered by `/quick-init` in its Step 4.5, or installed later by adding the package (`git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: master`) to `apm.yml` and re-running `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`. **The predicate is normative, not this list** — read `standaloneOnly` from the resolved index. As of the 2026-08-28 snapshot it holds for seven packages: `frontend-slides`, `jira-defect-analysis`, `llm-codegen-bench`, `project-scorecard`, `shopping-portal`, `ticket-triage`, `worklog-kit`. The "Package-by-Package Index" below covers the role-matched and optional packages; for the standalone-only ones consult the registry index directly.

For the full list of primitives inside each package (which agents, commands, skills get deployed), open the package's `apm.yml` → `assets:` block, or browse the package's `<id>/.apm/` tree in the [Workplace-Agent-Packages](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages) repo.

---

## Package-by-Package Index

### `frontend-developer` (auto-installed for `frontend`, `fullstack`)

- **Agents:** `frontend-specialist`
- **Commands:** —
- **Skills:** `frontend-context` (context skill)
- **`x-workplace.contextSkills`:** `frontend-context`
- **Companion standalone-only packages (never auto):** `project-scorecard` (coding-standards agent + `/quality-check`), `llm-codegen-bench` (`/codegen-benchmark` + scorer)

### `backend-developer` (auto-installed for `backend`, `fullstack`)

- **Agents:** `backend-specialist`, `database-specialist`
- **Commands:** —
- **Skills:** `backend-context` (context skill), `database-context` (context skill)
- **`x-workplace.contextSkills`:** `backend-context`, `database-context`

### `api` (auto-installed for `frontend`, `backend`, `fullstack`)

- **Agents:** `api-specialist`
- **Commands:** —
- **Skills:** `api-context` (context skill)
- **`x-workplace.contextSkills`:** `api-context`

### `performance` (auto-installed for `performance`, `fullstack`)

- **Agents:** `performance-specialist`
- **Commands:** —
- **Skills:** `performance-context` (context skill)
- **`x-workplace.contextSkills`:** `performance-context`

### `qa` (auto-installed for `qa`)

- **Agents:** `testing-specialist`
- **Commands:** `tdd-workflow`, `test-verify`
- **Skills:** `tdd-workflow`, `testing-context` (context skill)
- **`x-workplace.contextSkills`:** `testing-context`
- **Companion full-module package (offered, not auto-installed):** `test-generation`

### `business-analyst` (auto-installed for `ba`)

- **Agents:** —
- **Commands:** `ba-confluence-import`, `ba-generate-tasks`, `ba-impact-analysis`, `ba-uml`
- **Skills:** `ba-confluence-import`, `ba-impact-analysis`, `ba-task-generation`, `ba-uml-modeling`
- **`x-workplace.contextSkills`:** — (BA skills use `project-config.json` populated by Phase 1.5 BA Initialization Questions, not the `template.md` → `guidelines.md` flow)

### `project-scorecard` (standalone-only, role-agnostic)

- **`x-workplace` flags:** `optional: true`, `standaloneOnly: true`, `targetRoles: []`
- **Agents:** `coding-standards`
- **Commands:** `quality-check`
- **Skills:** `quality-check`
- **`x-workplace.contextSkills`:** —
- **Installation:** never auto by role and skipped during initialization. Install later by adding the `project-scorecard` package (`git: <apmPackages.registryRepoUrl>`, `path: project-scorecard`, `ref: master`) to `apm.yml` and running `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`.

### `llm-codegen-bench` (standalone-only, role-agnostic)

- **`x-workplace` flags:** `optional: true`, `standaloneOnly: true`, `targetRoles: []`
- **Agents:** —
- **Commands:** `codegen-benchmark`
- **Skills:** `codegen-benchmark`, `codegen-scorer`
- **`x-workplace.contextSkills`:** —
- **Installation:** never auto by role and skipped during initialization. Install later via `apm.yml` + `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`.

### `jira-defect-analysis` (standalone-only, role-agnostic)

- **`x-workplace` flags:** `optional: true`, `standaloneOnly: true`, `targetRoles: []`
- **Commands:** `assess-ticket`
- **Skills:** `jira-defect-analysis`
- **`x-workplace.contextSkills`:** —
- **Installation:** never auto by role and skipped during initialization. Install later via `apm.yml` + `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`.

---

## Adding a New Role-Specific Command

When a new command is needed for a role:

1. **Identify the right package.** Use the table above. If no package exists for the target role, scaffold one with `/package-new` (see [`apm-packaging` skill](../../apm-packaging/SKILL.md)) — pick `role-pack` template, set `x-workplace.targetRoles: [<role>]`, drop the new files under `<new-id>/.apm/` in the Workplace-Agent-Packages repo.
2. **Add the command file** as a static `.md` under `<package-id>/.apm/commands/<command-name>.md` in the packages repo. Hand-author the workflow; do not template-substitute project values into the file.
3. **Declare the asset** in the package's `apm.yml` `assets:` block so APM knows to deploy it.
4. **(Optional) Make it stack-aware** — if behaviour must differ by stack, the command should read the relevant context skill's `references/guidelines.md` at runtime (same pattern `/quality-check` uses).
5. **Update the package's `README.md`** to mention the new command in the "What This Package Provides" table.
6. **Smoke-test installation** — in a sandbox project, add a dict-form dep (`git: <apmPackages.registryRepoUrl>`, `path: <package-id>`, `ref: <branch>`) to `apm.yml`, run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, then verify the command landed in `.opencode/commands/` byte-for-byte. The Workplace-Agent-Packages repo's CI (`.github/workflows/packages.yml`) runs `apm compile --validate` and `apm pack --dry-run` on every package change.

---

## What This File Used to Be

This file previously contained a "Universal Command Template" + "Category-Specific Content" + "Quality Checklist" used by Phase 1.5 to **generate** role-specific command files dynamically. That entire mechanism was removed in v3.0.0. Synthetic generation is incompatible with the package model:

- Generated commands could not be reviewed or version-controlled before activation.
- Project-level customization had no place to live (templates were re-rendered every init).
- The `.opencode/` folder ended up cluttered with empty/stub commands for roles the user did not select.

The APM package model fixes all three issues: every artifact is a real, reviewable file owned by a specific package; deployment is `apm install` (no render); and unselected roles produce zero artifacts in `.opencode/`.

---

## Related

| Resource | Path |
|---|---|
| APM workflow reference (CLI, install, hooks, troubleshooting) | [`apm-workflow.md`](apm-workflow.md) |
| Phase 1.7-APM orchestration script | [`phase-1-7-apm.md`](phase-1-7-apm.md) |
| APM authoring skill (for `/package-new`) | [`../../apm-packaging/SKILL.md`](../../apm-packaging/SKILL.md) |
| Phase 1.5/1.6 questions and MCP wiring | [`user-roles-mcp.md`](user-roles-mcp.md) |
| Phase 6 Part 3.5 (`guidelines.md` gate) | [`configuration-updates.md`](configuration-updates.md) |
| Package catalogue (user-facing) | [`docs/core/APM_PACKAGES.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md) |
| Package catalogue (standalone repo) | [Workplace-Agent-Packages](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages) |
| Role definitions | [`docs/core/ROLES.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/ROLES.md) |
