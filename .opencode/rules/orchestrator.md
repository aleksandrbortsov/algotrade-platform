# Agent Orchestrator

> **Purpose:** Define workflow-level concerns — command routing, task complexity, MCP usage, and the project adaptation model. Agent and skill selection for domain tasks is handled natively by OpenCode: subagents by their `description` frontmatter, skills through the `skill` tool.

---

## Agent Selection

OpenCode selects subagents **natively** by their `description` frontmatter (automatically, or when the user mentions `@name`) and lists every skill's `description` in the system prompt so the model loads the right `SKILL.md` on demand with the `skill` tool. Each agent in `.opencode/agents/` and each skill in `.opencode/skills/` (Core) or `.agents/skills/` (APM packages) declares when it should activate. No explicit file-pattern routing is needed.

When delegating to a domain specialist, check if `project-config.json` exists in the skill directory to pass project-specific context.

**One agent is dispatched explicitly, not natively:** `codebase-analyzer` is the per-component research subagent used by `/initialize` (Phases 4, 5 Part 1.5, 6) and is always invoked through the `Task` tool with `subagent_type: "codebase-analyzer"`, one call per component, all calls in a single message. It is the only agent in this template allowed to write files from inside a subagent, and its write scope is enforced by the `permission` block of its agent file (edits only under `.opencode/project/analysis/`, read-only shell, no nested `task`) and restated in the brief. For ordinary code search outside initialization, use the built-in `explore` subagent. Full contract: [`subagent-contract.md`](../skills/project-initialization/references/subagent-contract.md).

---

## Workplace Documentation (upstream)

The AI Workplace’s own user-facing guides live under `docs/**` in the **template repo** (initialization, roles, APM, customization, daily workflow, TDD, update/rollback, architecture). **They are not copied into initialized projects**, so never link or read them as project-local paths. The map (which document answers what, when to read it, key anchors) and the local-first → Git-URL resolution contract are in [`workplace-docs.md`](../skills/project-initialization/references/workplace-docs.md); `scripts/fetch-workplace-doc.js` resolves any of them. Consult it whenever the user asks how the Workplace itself works, or when you need a current Workplace procedure that is not in `.opencode/`.

---

## Agent Behavioral Principles

These four principles apply to **all agents and the main agent** at all times, for every task.

### 1. Clarification-First

- Before making assumptions, search the codebase and project documentation (skills, `project-config.json`, docs/).
- If the answer is not found after searching — ask the user. Include: what was searched, what was found (or not found), and why the question arises.
- If the situation is ambiguous (multiple valid interpretations or approaches) — present the alternatives with concrete trade-offs and ask the user to choose before proceeding.
- If alternative solutions exist that would significantly change the approach (architecture, dependency, pattern) — always present them rather than picking silently.
- **Never silently assume when uncertain.** A brief clarifying question is always preferable to implementing the wrong solution.

### 2. Codebase-First

- Always search for existing patterns, conventions, and implementations in the codebase **before** writing new code.
- When a matching pattern or implementation is found — reuse or extend it. Cite the source file(s) and explain why it fits.
- When genuinely nothing reusable exists — explain what was searched and why a new implementation is needed.
- **New external dependencies require explicit user approval.** Before introducing any new package/library, ask the user with:
  - What the dependency does and why it is needed
  - Why existing project dependencies cannot cover this need
  - Alternatives considered (including writing it manually)
  - Any size, security, or license concerns
- New architectural patterns not already present in the codebase also require discussion before introduction.

### 3. Transparent Reasoning

- Every implementation decision must include a brief explanation of **why** it was made — not just what was done.
- Every question to the user must provide context: what was investigated, what was found, and why the question is necessary.
- When presenting alternatives, include concrete trade-offs: complexity, performance, maintainability, and consistency with the existing codebase.
- When reusing existing code, explicitly cite the source file and explain why it was chosen over alternatives.
- When introducing something new (pattern, dependency, abstraction), state what existing approaches were considered and why they were insufficient.

### 4. Documentation-Current

- After completing any **Complex** task, always scan **all relevant project files** for content semantically related to the changed components, patterns, or workflows. This step is **mandatory**, not optional.
- **Scan scope depends on initialization state:**
  - **Post-initialization:** use `docs/INDEX.md` as the authoritative file inventory, then also scan `.opencode/agents/`, `.opencode/skills/`, `.opencode/commands/`, `.opencode/rules/`, `docs/project/`, project root files (`README.md`, `AGENTS.md`, `.opencode/project_init.md`), and domain skill `project-config.json` files
  - **Pre-initialization / template mode:** scan `docs/`, `.opencode/agents/`, `.opencode/skills/`, `.opencode/commands/`, `.opencode/rules/`
- Do not ask permission to scan. Perform the scan, then present findings with specific proposed updates.
- As part of every scan, validate that all file references, relative links, and cross-references in touched files still point to existing targets — run `node .opencode/skills/project-initialization/scripts/validate-doc-links.js --json` rather than checking links by hand. Broken or stale links must be included in the findings report.
- Apply documentation changes only after user approval — but the scan itself is never skippable.
- For **Simple** tasks: if the change touches a pattern, API, or workflow referenced in existing docs or agent/skill files, include a brief documentation note at the end of the response.
- **A Complex task is not complete until a documentation impact check — including link validation — has been performed and its result communicated to the user.**
- **Close the check by re-baselining the plugin:** run `node .opencode/hooks/docs-sync-check.js --record-state` once the approved documentation updates are applied — or immediately when the scan found nothing to update — so the docs-sync plugin does not re-recommend the change set you just reviewed.
- **Automatic recommendation:** the docs-sync plugin (`.opencode/plugins/docs-sync.js`, analysis in `.opencode/hooks/docs-sync-check.js`) detects significant changes (3+ non-documentation files, new dependencies, or architectural changes) — across **both** the uncommitted working tree and commits made since the last recorded sync (`lastSyncSha`) — and posts a recommendation as the *next auto-submitted user turn* (not a passive chat note). The receiving agent must not start a sync on its own; it presents the two options (`/docs-sync` or `/docs-sync --since=<period>`) and waits for the user's explicit choice. Category/dependency patterns are extensible per-project via `.opencode/hooks/docs-sync-config.json`. On hook error, the user is explicitly notified in chat. See `documentation-management` skill and [`AGENT_CONTEXT_AND_DOCS_SYNC.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md) for the authoritative specification.

---

## Documentation Sync Recommendations (docs-sync plugin)

The Workplace ships `.opencode/plugins/docs-sync.js`. After a session goes idle it analyses the git state (`.opencode/hooks/docs-sync-check.js`) and, when the change set is significant, submits a message that starts with **"Documentation sync recommended."** and ends with an `AGENT INSTRUCTION` block as the next user-role message of the session — OpenCode then starts a new agent turn on it, in whatever agent is active.

Binding rule for every agent that receives such a message:

1. Do **not** start any documentation sync, edit any file, or run any command in response to it.
2. Present exactly the two options named in the message — `/docs-sync` (local changes) and `/docs-sync --since=<period>` (git history) — and wait for the user's explicit next reply.
3. If the user ignores or dismisses it, do nothing further; the plugin stays quiet until genuinely new files appear (24 h suppression window, re-baselined by `/docs-sync` through `--record-state`).
4. Do not restate the change list the message already shows; one short sentence plus the two options is the whole reply.

The plugin never fires inside subagent sessions, submits at most one message per idle event, and is switched off per project with `"enabled": false` in `.opencode/hooks/docs-sync-config.json`.

---

## Command Routing

Core commands bind their agent through the `agent:` key of the command file — OpenCode runs the command with that agent. The table below is the human-readable map of the same routing and of the natural-language triggers, which OpenCode does not map automatically.

### Command-Based Routing

| Command / Trigger | Agent | Skills |
|-------------------|-------|--------|
| `/initialize`, "Initialize my project" | **Initializer** (`agents/initializer.md`) | `project-initialization`, `codebase-analysis` |
| `/quick-init` | **Initializer** (`agents/initializer.md`) | `project-initialization` |
| `/update-workplace`, "Update project", "Upgrade AI Workplace", "Apply template updates" | **Project Updater** (`agents/project-updater.md`) | `project-update` |
| `/docs-sync`, "Sync documentation" | **Documentation Sync** (`agents/documentation-sync.md`) | `documentation-management` |
| `/package-new`, "Create a new APM package", "Promote skill to package", "Convert module to APM" | Main agent (no specialized agent) | `apm-packaging` |
| `/taskmaster-init` | Main agent (no specialized agent) | Standalone (no skill) |

### Role-Pack Commands (Available After Pack Activation)

The following commands ship inside APM role packs and are only present in `.opencode/commands/` after their pack is installed via APM. **Role-matched** packs auto-activate in init Phase 1.7-APM when `x-workplace.targetRoles` intersects the selected role(s). Eligible **optional** packs (`optional: true`, `standaloneOnly` not true) are offered in Phase 1.7-APM Pass A.5. **Standalone-only** packs (`optional: true`, `standaloneOnly: true`) are never offered during `/initialize` (which is role-driven). They are offered by `/quick-init` (role-less) in its Step 4.5, which computes the offer at runtime from the freshly resolved catalogue index using the empty-`targetRoles` predicate — never from a template-embedded list — or installed manually by adding the package (`git: <apmPackages.registryRepoUrl>`, `path: <id>`, `ref: master`) to the project's `apm.yml` followed by `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` (see `docs/core/APM_PACKAGES.md` and `.opencode/skills/project-initialization/references/apm-workflow.md`).

| Command | Provided by pack | Agent (in pack) | Skills (in pack) |
|---------|-----------------|-----------------|------------------|
| `/tdd-workflow` | `qa` (role-matched) | `testing-specialist.md` | `testing-context`, `tdd-workflow` |
| `/test-verify` | `qa` (role-matched) | `testing-specialist.md` | `testing-context`, `tdd-workflow` |
| `/review` | `code-review` (role-matched + optional, Pass A.5 for `qa`, `backend`, `frontend`, `fullstack`) | `code-reviewer.md` | `code-review`, `code-simplification` |
| `/simplify` | `code-review` (role-matched + optional, Pass A.5 for `qa`, `backend`, `frontend`, `fullstack`) | `code-reviewer.md` | `code-simplification`, `code-review` |
| `/security-validate` | `nc-code-security-audit` (role-matched + optional, Pass A.5 for `backend`, `frontend`, `fullstack`, `qa`) | `security-auditor.md` | `security-compliance` |
| `/security-update` | `nc-code-security-audit` (role-matched + optional, Pass A.5 for `backend`, `frontend`, `fullstack`, `qa`) | `security-auditor.md` | `security-compliance` |
| `/quality-check` | `project-scorecard` *(standalone-only)* | `coding-standards.md` | `quality-check` |
| `/codegen-benchmark` | `llm-codegen-bench` *(standalone-only)* | — | `codegen-benchmark`, `codegen-scorer` |
| `/assess-ticket` | `jira-defect-analysis` *(standalone-only)* | — | `jira-defect-analysis` |
| `/ba-confluence-import` | `business-analyst` (role-matched) | — | `ba-confluence-import` |
| `/ba-impact-analysis` | `business-analyst` (role-matched) | — | `ba-impact-analysis` |
| `/ba-generate-tasks` | `business-analyst` (role-matched) | — | `ba-task-generation` |
| `/ba-uml` | `business-analyst` (role-matched) | — | `ba-uml-modeling` |
| `/portal-build-e2e` | `shopping-portal` *(standalone-only)* | `portal-e2e-architect` | `shopping-portal-context`, `deapi-to-ui-mapping`, `portal-fe-best-practices` |
| `/portal-config-diag` | `shopping-portal` *(standalone-only)* | `bss-config-router` | `shopping-portal-context`, `bss-config-routing` |
| `/portal-quality-audit` | `shopping-portal` *(standalone-only)* | `portal-fe-optimizer` | `shopping-portal-context`, `portal-fe-best-practices` |
| `/generate-stub` | `stub-generation` (role-matched + optional, Pass A.5 for `qa`) | `stub-orchestrator-agent`, `stub-research-agent`, `stub-gen-agent`, `stub-review-agent`, `stub-doc-agent`, `stub-update-agent`, `stub-security-agent` | `stub-generation-orchestrator`, `stub-design-sourcing`, `stub-code-conventions`, `stub-transport-templates`, `stub-mockserver-runtime`, `stub-validation-rules`, `stub-error-handling-patterns`, `stub-yaml-catalog`, `stub-readme-template`, `stub-bruno-collection`, `stub-health-monitoring` |
| `/review-stub` | `stub-generation` | `stub-orchestrator-agent`, `stub-review-agent`, `stub-gen-agent`, `stub-doc-agent` | `stub-generation-orchestrator`, `stub-validation-rules`, `stub-code-conventions` |
| `/update-stub` | `stub-generation` | `stub-orchestrator-agent`, `stub-update-agent`, `stub-research-agent`, `stub-gen-agent`, `stub-review-agent`, `stub-doc-agent` | `stub-generation-orchestrator`, `stub-validation-rules`, `stub-code-conventions`, `stub-yaml-catalog`, `stub-bruno-collection` |
| `/stub-health` | `stub-generation` | `stub-orchestrator-agent` | `stub-generation-orchestrator`, `stub-health-monitoring` |
| `/onboard-atp3-stubs` | `stub-generation` | `stub-orchestrator-agent`, `stub-research-agent`, `stub-review-agent`, `stub-doc-agent` | `stub-generation-orchestrator`, `stub-yaml-catalog`, `stub-transport-templates`, `stub-code-conventions`, `stub-validation-rules`, `stub-bruno-collection` |
| `/sync-mockserver-guidance` | `stub-generation` | `stub-orchestrator-agent` | `stub-mockserver-guidance` |
| `/generate-test` | `test-generation` *(full module, optional — Pass A.5 for `qa`)* | orchestrator / research / generation / validation / reusability agents | 8 `test-*` skills |
| `/testability-markup` | `markup` (role-matched + optional, Pass A.5 for `frontend`, `qa`, `fullstack`) | discovery / verification / implementor / reviewer agents | `markup` (scoped by its own `project-config.json`; declares no context skills) |
| `/ci-triage`, `/ticket-create`, `/ticket-fix`, `/ticket-close` | `devops-engineer` *(optional; `targetRoles: ["devops"]`, a role retired in v3.0.0 — never auto-matches, install manually)* | — | — |

> **Not exhaustive.** `product-migration`, `test-description-generation`, `ticket-triage`, `worklog-kit`, and `frontend-slides` also ship commands, but their exact names are not carried in the registry index. Read the package's `.apm/prompts/` directory (or its `README.md`) in the [Workplace-Agent-Packages](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages) repo, or list `.opencode/commands/` after installing, instead of guessing.

> If a command is invoked but the corresponding pack is NOT installed, tell the user to either: (a) re-run `/initialize` and accept the pack during Phase 1.7-APM (role-matched or optional packs), or (b) add the pack (`git: <apmPackages.registryRepoUrl>`, `path: <pack-id>`, `ref: master`) to the project's `apm.yml` and run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` (standalone-only packs). See [`docs/core/APM_PACKAGES.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md) and [`.opencode/skills/project-initialization/references/apm-workflow.md`](../skills/project-initialization/references/apm-workflow.md).

---

## Task Complexity Classification

| Type | Criteria | Agent Behavior |
|------|----------|----------------|
| **Simple** | 1-2 files, no structural changes, no new dependencies | Proceed immediately |
| **Complex** | 3+ files, new dependencies, architectural changes | Plan → Approval → Implementation |
| **Uncertain** | Difficulty to assess complexity | Ask the user first |

### Implementation Plan Format (Complex Tasks)

```
📋 **Implementation Plan**

**Task:** [Brief description]

**Changes:**
├── 📁 path/to/file1.ts — [Create/Modify/Delete]
│   ├── Description of change 1
│   └── Description of change 2
├── 📁 path/to/file2.ts — Modify
│   └── What will be changed
└── 📁 path/to/file3.ts — Create
    ├── Purpose of new file
    └── Key contents

**Documentation Impact:**
├── docs/SOME_FILE.md — [reason this doc may need updating]
└── .opencode/rules/SOME_RULE.md — [reason this rule may need updating]
(or "None anticipated" if no existing docs reference the changed area)

**Notes:** [Risks, dependencies, or considerations]

Approve this plan?
```

---

## MCP Workflow Notes

### Context7 MCP
- **Two-step process:** 1) `resolve-library-id` (library name → ID) → 2) `query-docs` with that ID. Never skip step 1. Use `topic` for focus, `tokens` for scope.

### MCP Configuration
- Generated during Init Phase 1.5 (role selection), not Phase 7 — which generates `AGENTS.md`. Base: Context7, Atlassian, TaskMaster, Chrome DevTools (4 servers). TaskMaster API keys optional.
- Phase 1.7-APM's `apm install` may add additional MCP servers declared by packages (`dependencies.mcp:`). APM's writer is **additive** and never overwrites entries already in `opencode.json`. CI rejects any package whose `dependencies.mcp` declares one of the four base server names above, so duplicates never reach the consumer.

---

## APM Workflow

> Canonical reference: [`.opencode/skills/project-initialization/references/apm-workflow.md`](../skills/project-initialization/references/apm-workflow.md). The rule below summarises the workflow; every operational detail (CLI install commands, registry URLs, hook contracts, troubleshooting matrix) lives in that doc.

- Every initializer / updater flow runs a **Phase 0** gate that verifies the APM CLI is installed (`apm --version`) and walks the user through `curl`/`irm`/`brew`/`pip` install if missing.
- The canonical packages catalogue lives in the standalone [Workplace-Agent-Packages](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages) repo (`.core-version.json → apmPackages.registryRepoUrl`). Each top-level directory is an installable APM package. Consumers reference them as object-form deps: `git: <registryRepoUrl>`, `path: <id>`, `ref: <git-ref>`.
- `/initialize` Phase 1.7-APM fetches the registry `index.json` (built-in / external URL / both), filters by selected role(s), writes the project's `apm.yml`, and runs `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`. The wrapper is mandatory — it pins `targets: [opencode]`, restores initialization-owned files after APM redeploys the package copies, and reports packages skipped for target incompatibility; package skills land in `.agents/skills/<name>/` and Phase 6 Part 3.5 reads both skill roots.
- **`apm install` reporting success is not evidence that packages landed with content.** APM judges freshness from the `apm.lock.yaml` entry, so an entry poisoned by an earlier interrupted run (`version: unknown`, `package_type` other than `apm_package`, or `content_hash: sha256:e3b0c442…b855` — the hash of empty input) makes every later install print `(files unchanged)` and re-materialise nothing; the package stays an empty directory skeleton that passes existence checks. Run `powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/validate-apm-install.ps1` on **both** sides of the install — Phase 1.7-APM step 5.0b with `-PreInstall` (inherited state only) and step 5.1a without it (full gate) — and treat exit 1 as a stop. Purge the cached tree plus the lock entry as the script instructs; never hand-create files inside a package-owned skill. Cause and remediation: [`apm-workflow.md`](../skills/project-initialization/references/apm-workflow.md) §5 (Lockfile). Every `powershell -ExecutionPolicy Bypass -File …` command in this template means "`pwsh -File …` where `pwsh` resolves, otherwise this" — see [`environment-setup.md`](../skills/project-initialization/references/environment-setup.md); where no PowerShell exists at all, record the gate as an Open Gap rather than declaring it passed.
- Full modules ship `scripts/activate.{sh,ps1}` plus a session-start descriptor in `.apm/hooks/activate.json`. The opencode target deploys no hooks, so the descriptor never fires — Phase 1.7-APM step 5.2 invokes `scripts/activate.*` directly and verifies the payload with `verify-apm-activation.ps1`.
- Phase 7 of `/initialize` (AGENTS.md generation) MUST preserve the `<!-- apm:start -->` / `<!-- apm:end -->` pair and everything between them verbatim — that region is owned by `apm compile` (the project's `apm.yml` sets `compilation.agents_md.mode: managed_section`, written by Phase 1.7-APM since template v4.5.0). Phase 7 only edits Workplace-managed sections outside those markers. The pre-v4.5.0 `<!-- APM:<name> begin/end -->` contract is retired — `apm compile` never emitted such markers.
- New packages are authored with `/package-new` (skill: `apm-packaging`) in a clone of the Workplace-Agent-Packages repo. Three source modes: `--from-module <name>`, `--from-skill <name>`, or blank scaffold. Validation gates: `apm compile --validate`, `apm pack --dry-run`, and that repo's `scripts/regenerate-index.ps1` for `index.json` sync.
- The legacy `/moduleActivate` command, `module-activation` skill, `Modules_Registry/` directory, `.opencode/modules/`, and `.opencode/rules/role-packs-state.json` were removed in template v4.0.0.
- `/quick-init` runs a graceful Phase 0 variant (a missing/uninstallable APM CLI never blocks the workflow) and, in its Step 4.5, offers two groups in one batched multi-select: role-agnostic packages — every catalogue entry with empty `targetRoles`, computed at runtime from the freshly resolved registry index (live HTTPS → git → offline snapshot), never from a template-embedded list — and, per its Step 4.5.b.1, the owning package of each domain the stack scan **detected**, labelled with the evidence (detection is not role selection; a declined package is a logged gap). Accepted packages are written to `apm.yml` (dict form, merged by `alias`) and installed with `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`. Details: `.opencode/skills/project-initialization/references/quick-init.md` Steps 0 and 4.5.

---

## Taskmaster Workflow

- **PRD as GitHub Issue:** Validate PRD → create Issue → DELETE local `.taskmaster/docs/*.md` → Issue is source of truth.
- **Task generation:** Only after explicit "start working on the PRD".
- **Task confirmation:** Confirm which task to start *before* executing.
- **Details:** [taskmaster.md](taskmaster/taskmaster.md), [dev_workflow.md](taskmaster/dev_workflow.md)

---

## Codegen Quality Scoring (Optional Role Packs)

> Shipped by standalone-only APM packages `project-scorecard` and `llm-codegen-bench`. Install by adding the package (`git: <apmPackages.registryRepoUrl>`, `path: project-scorecard` or `llm-codegen-bench`, `ref: master`) to the project's `apm.yml` and running `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`. **Not** implied by selecting any role.

- **`/quality-check`:** Offline project assessment across Build, Lint, TypeCheck, Tests, Security, Accessibility. No API keys needed.
- **`/codegen-benchmark`:** LLM benchmarking via in-OpenCode subagents (no API keys needed). Advanced mode via [web-codegen-scorer](https://github.com/angular/web-codegen-scorer) CLI available with API keys.
- **Skills:** `quality-check` (with `project-scorecard`); `codegen-benchmark`, `codegen-scorer` (with `llm-codegen-bench`)

---

## Jira Defect Analysis (Optional Role Pack)

> Shipped by the standalone-only APM package `jira-defect-analysis`. Install by adding the package (`git: <apmPackages.registryRepoUrl>`, `path: jira-defect-analysis`, `ref: master`) to the project's `apm.yml` and running `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`. **Not** implied by selecting any role.

- **`/assess-ticket <TICKET-ID>`:** End-to-end Jira defect triage. Fetches the ticket via `mcp-atlassian`, recovers a `request_id` / `x-request-id` from description, HAR attachments, screenshots, or the user, queries Graylog (with `simple-graylog-mcp` fallback), and produces a fixed-schema root-cause report with explicit confidence level.
- **Prereqs:** `mcp-atlassian` already configured; `graylog` MCP and optional `simple-graylog-mcp` configured per the pack's `README.md`; `jq` on PATH.
- **Skills:** `jira-defect-analysis`

---

## Project Adaptation

Project-specific behavior is configured through three native channels (no parallel "customization" system):

1. **APM package artifacts after install** — files in `.opencode/agents/`, `.opencode/commands/`, `.agents/skills/` deployed by `apm install` are project-owned relative to the Core and survive `/update-workplace` (they are not listed in `.opencode/rules/.core-version.json` `coreFiles`). Edit them in place to tune agent behavior, command steps, or skill instructions. **APM itself still owns those paths:** `apm install` / `apm update` redeploy them, there is no per-file conflict prompt (collisions land in a diagnostic summary; `--force` overwrites outright), and `apm audit` reports hand-edits as `modified` drift. For an edit that must survive package refreshes, keep the customized copy in the project's own `.apm/` directory (`.apm/agents/<name>.agent.md`, `.apm/skills/<name>/`, `.apm/prompts/<name>.prompt.md`) — local primitives are deployed last and win on collision. Every manual `apm install`/`apm update` goes through `apm-install-preserving.js`, which restores the initialized package files afterwards.
2. **`AGENTS.md` "Project Conventions" section** — the root `AGENTS.md` file is auto-loaded by OpenCode in every session. Place team-wide rules, repository conventions, and pointers to project tooling in its `Project Conventions` section. Reference role-pack skills via their `references/guidelines.md` instead of duplicating their content.
3. **`project-config.json` + `references/guidelines.md`** per context skill (`coding-standards-context`, `infrastructure-context`, and any role-pack `*-context` skill) — machine- and human-readable domain settings filled during initialization Phase 6. Edit `project-config.json` and regenerate `references/guidelines.md` to change domain-specific behavior.

> The legacy `project-*` prefix convention (`project-*` agents/commands/skills) and `.opencode/rules/project/*.md` rule files were removed in v3.0.0. Existing `project-*` artifacts are detected and migrated by `/update-workplace` (see `migration_v3_0_drop_project_customizations` in `.opencode/skills/project-update/references/migration-and-scan.md`). Only `.opencode/rules/project/metadata.json` remains in that directory. Full guide: [docs/core/CUSTOMIZATION.md](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/CUSTOMIZATION.md).

