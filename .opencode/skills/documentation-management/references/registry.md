# Documentation Registry System

This rule manages the central registry of all project documentation and establishes automatic cross-referencing between documents and rules.

## Purpose

- **Track all documentation** created during project initialization and development
- **Maintain cross-references** between related documents and rules
- **Ensure link integrity** across the documentation ecosystem
- **Provide centralized index** for easy navigation

---

## Where Project Memory Lives (Agent Quick-Lookup Map)

> **For AI agents:** This file (`registry.md`) is a **template-level Core spec** describing the registration system itself — it is NOT the project memory and is NOT rewritten per project. The actual project-specific memory is distributed across the canonical locations below. When you need to find something about *this* project, consult these sources in order — do NOT look here for project facts.

| # | Source | What it holds | Filled by | Survives `/update-workplace`? |
|---|--------|---------------|-----------|------------------------------|
| 1 | **`AGENTS.md`** (repo root) | AI agent Do/Don't, commands, safety rules, **`Project Conventions`** section (the v3.0.0 customization channel) | Phase 7 (init); user edits afterwards | ✅ Yes — never overwritten |
| 2 | **`docs/INDEX.md`** | Auto-generated central index of every `.md` discovered in the repo at end of init, grouped by category with one-line descriptions | Phase 7.5 (dynamic generation from repo scan) | ✅ Yes — regenerated only on re-init / explicit sync |
| 3 | **`.opencode/project_init.md`** | Initialization state: mode, selected roles, stack, **Phase Reflection Notes** (Phases 1/2/4/5/6 — the agent's recorded discoveries, high/low-confidence items, smart questions and answers), Configured Domain Skills table, Documentation Registry, MCP servers enabled | All init phases (filled by Initializer agent) | ✅ Yes — project-owned |
| 4 | **`.opencode/rules/development.md`** | **Single source of truth for technology stack** (always-on instruction via `.opencode/opencode.json → instructions` — in every agent's context). Frameworks, build tool, languages, key dependencies, links to component rules | Phase 3 | ⚠️ Smart-merged on update |
| 5 | **`.opencode/rules/project/metadata.json`** | Project identity: name, team, environments, ownership, description | Phase 6.5 | ✅ Yes — preserved untouched |
| 6 | **`<skills-root>/<context>/project-config.json` + `references/guidelines.md`** (`<skills-root>` = `.opencode/skills/` for the two Core context skills, `.agents/skills/` for package skills) | Per-domain project-specific config and rendered guidelines (human-readable strings **must be English** at write time — initialization translates user dialogue when persisting). Two are mandatory `coreContextSkills` (`coding-standards-context`, `infrastructure-context`); the rest are activated via role-packs (`frontend-context`, `backend-context`, `database-context`, `api-context`, `testing-context`, `performance-context`) | Phase 6 (per-domain Reflection Step 0 → 0–3 questions → render → Part 3.5 English check) | ⚠️ `guidelines.md` always survives (packages ship only `template.md`). `project-config.json` survives for the two Core context skills, but a **role-pack** `*-context` config ships inside its package and is redeployed by the `apm install` in Step 3.5.b |
| 7 | **`.opencode/rules/.core-version.json`** | Template version, `initializationStatus`, applied/available migrations, SHA-256 hashes of every Core file | Initializer (init); `project-updater` (updates) | ⚠️ Updated by `/update-workplace` |
| 8 | **`.opencode/agents/`, `.opencode/commands/`, `.agents/skills/`** (APM-deployed artifacts) | Installed APM-package agents, commands and skills — deployed by `apm install` from `<id>/.apm/` (in the Workplace-Agent-Packages repo) only for selected roles. Customization channel #1: quick edits in place, durable overrides in the project's own `.apm/` | Phase 1.7-APM (auto from selected roles); `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` afterwards | ⚠️ Outside `coreFiles`, so the Core copy step skips them — but Step 3.5.b re-runs `apm install`, which redeploys them without a per-file prompt |
| 9 | **`docs/project/`** (`ARCHITECTURE.md`, `STACK.md`, `CONTRIBUTING.md`, custom docs) | Project-authored long-form docs. Conditionally generated for EXISTING_PROJECT or complex stacks; otherwise user-created | Phase 7 (conditional) + manual | ✅ Yes — never overwritten |
| 10 | **`.apm/`** (repo root: `agents/`, `skills/`, `prompts/`) | The project's own APM primitives — customized copies that override package versions. Deployed after dependency primitives, so local files win on collision | Created manually by the team (customization channel 1b) | ✅ Yes — it is the source APM deploys *from* |

### Canonical Lookup Order (for the agent)

When asked a project-level question ("which framework does this project use?", "what's the tenant model?", "is TDD mandatory here?"), the agent should consult sources in this order — first hit wins:

1. **Already in context** (loaded into every session): `AGENTS.md` (root), `development.md`, `orchestrator.md`. Skills are *not* pre-loaded — OpenCode lists them in `<available_skills>` and the agent loads `documentation-management/SKILL.md` or `code-quality-standards/SKILL.md` with the `skill` tool when their description matches the task.
2. **Domain-specific facts:** the relevant `<skills-root>/<context>/references/guidelines.md` for the domain in question (e.g., `coding-standards-context/references/guidelines.md` for naming/TDD policy; `api-context/references/guidelines.md` for endpoint conventions).
3. **Project decisions / history:** `.opencode/project_init.md` → `Phase {N} Reflection Notes` (recorded entities, modules, integrations, smart-question answers).
4. **Repo navigation:** `docs/INDEX.md` to find any other `.md` / `.md` file by topic.
5. **Identity / version:** `.opencode/rules/project/metadata.json`, `.opencode/rules/.core-version.json`.
6. **Long-form architectural prose:** `docs/project/ARCHITECTURE.md`, `docs/project/STACK.md` if present.

> **DO NOT** rely on `registry.md` (this file) or `documentation-management/SKILL.md` for project-specific answers — they describe the *system*, not the *project*. Their job is to tell the agent **how** to register, sync and validate documentation; the actual content lives in sources 1–10 above.

---

## Core vs Project Architecture

**IMPORTANT:** As of template version 1.0.0, documentation is split into Core and Project components:

### Core Components (Managed by Template - DO NOT MODIFY)
- **Location:** `.opencode/rules/`, `docs/core/`
- **Updated:** During template updates
- **Purpose:** Universal template functionality
- **Your Role:** Read, reference, but don't modify

### Project Components (Your Customizations - SAFE TO MODIFY)
- **Location:** the project's own `.apm/` overrides; APM-deployed artifacts in `.opencode/agents/`, `.opencode/commands/`, `.opencode/skills/` (installed via `apm install`); `Project Conventions` section in root `AGENTS.md`; per-skill `project-config.json` + `references/guidelines.md`; `docs/project/`
- **Updated:** The Core copy step never writes them (they are not in `coreFiles`). **But APM does:** `/update-workplace` Step 3.5.b re-runs `apm install`, which redeploys everything its packages own — APM-deployed primitives and role-pack `project-config.json` included. `AGENTS.md` conventions, `references/guidelines.md`, `docs/project/`, and the project's `.apm/` are safe in both paths.
- **Purpose:** Project-specific customizations via three native channels (see [CUSTOMIZATION.md](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/CUSTOMIZATION.md))
- **Your Role:** Put durable agent/skill/command overrides in `.apm/`, add conventions to AGENTS.md, configure context skills

### Version Tracking
- **`.opencode/rules/.core-version.json`** - Tracks template version and enables safe updates

## Rule Apply Modes Strategy

> **Context Economy Principle:** Only `AGENTS.md` and the two Core rules are always-on. Everything specialized is loaded on demand — skills via the `skill` tool by description, the TaskMaster rules by an explicit read, context-skill guidelines when the matching skill is used — and is discoverable through links inside the always-on files.

### Always-On Instructions - 3 Files

These are **always loaded** into every agent's context — `AGENTS.md` by OpenCode itself, the two rules through `.opencode/opencode.json → instructions`:

| Rule | Purpose |
|------|---------|
| **development.md** | Core development practices, technology stack, architecture overview, component rule references |
| **AGENTS.md** (root) | Project resource map, `Project Conventions`, the APM managed section — the entry point every agent and subagent starts from |
| **orchestrator.md** | Project workflows: Git, TaskMaster, MCP integration |

> The `documentation-management` and `code-quality-standards` skills are **not** pre-loaded on this line: OpenCode lists every skill's `description` in `<available_skills>` and the agent loads the body with the `skill` tool when the task matches (see `orchestrator.md → Agent Selection`). `security-compliance` is not a Core skill at all — it ships with the standalone `nc-code-security-audit` APM package and is listed only when that package is installed.

### Loaded On Demand - Everything Else

These are loaded only when relevant — skills by `description` through the `skill` tool, agents by `description` when the orchestrator delegates or the user mentions them, reference files when a skill or rule tells the agent to read them:

| Category | Rules | Discoverable Via |
|----------|-------|-----------------|
| **Domain context skills** | `coding-standards-context`, `infrastructure-context` (Core) + role-pack `*-context` skills (`frontend-context`, `backend-context`, `database-context`, `api-context`, `testing-context`, `performance-context`) | `<available_skills>` description matching (`skill` tool); listed in `development.md` and `orchestrator.md` |
| **Code quality** | code-quality-standards skill, documentation-management/references/markdown-standards.md, codebase-analysis skill | Links in `development.md` → Pre-Implementation Code Analysis, `documentation-management skill` |
| **Initialization** | project-initialization skill, references/*.md | Links in `orchestrator.md` → Project Initialization Workflows |
| **TaskMaster** | taskmaster/dev_workflow.md, taskmaster/taskmaster.md | Links in `orchestrator.md` → Taskmaster Workflow |
| **TDD** | `code-quality-standards/SKILL.md` → "Test-Driven Development (TDD)" (universal discipline) + `coding-standards-context/references/guidelines.md` → "TDD Policy" (project-specific) | Linked from `orchestrator.md`, `development.md` (Testing Strategy), and the `qa` role pack |
| **Project setup** | project-initialization/references/quick-init.md, project-update/SKILL.md | Links in `orchestrator.md` |
| **Security details** *(only when `nc-code-security-audit` is installed)* | security-compliance/references/ (developer-checklist.md, audit-logging.md, web-security-headers.md, authenticators.md) | Links in `security-compliance skill`; package README/docs at [Workplace-Agent-Packages/nc-code-security-audit](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/nc-code-security-audit) |

## Document Types

### Core Documentation Files (Template-Managed)

**Located in `docs/` (root - general, high-level):**
- **GETTING_STARTED.md** - Quick start guide with initialization overview
- **ARCHITECTURE.md** - High-level system architecture overview
- **PRESENTATION.md** - Executive presentation for management (no implementation details)

**Located in project root:**
- **AGENTS.md** - AI coding agent instructions with guidelines loaded from [documentation-management/references/markdown-standards.md](markdown-standards.md) *(Generated during Phase 7)*
- **README.md** - Simplified project overview with quick start *(References GETTING_STARTED.md for details)*
- **CHANGELOG.md** - Version history and release notes *(since v4.1.0)*
- **docs/INDEX.md** - Centralized index of ALL documentation *(Generated dynamically during Phase 7.5)*

**Located in `docs/core/` (detailed implementation documentation):**
- **ROLES.md** - Detailed 9 roles (7 developer + 1 analyst + 1 upgrade engineer), MCP mappings, commands (includes Business Analyst)
- **CUSTOMIZATION.md** - Core/Project separation, customization methods, registry system
- **APM_PACKAGES.md** - APM-based package catalogue, installation, authoring (replaces legacy `docs/core/Modules/`)
- **INITIALIZATION.md** - Canonical `/initialize` and `/quick-init` reference
- **DEVELOPMENT_WORKFLOW.md** - Daily workflow, best practices, context management
- **AGENT_CONTEXT_AND_DOCS_SYNC.md** - Authoritative docs-sync plugin reference (wiring, significance, suppression)
- **HOW_WORKPLACE_IMPROVES_AGENTS.html** - Quality, context, accuracy, and token economics vs presentation claims
- **MIGRATION_BACKUP.md** - Update process, backup system, restore procedures
- **TDD_WORKFLOW.md** - Test-Driven Development workflow guide, RED-GREEN-REFACTOR cycle, TaskMaster integration

> **Removed in v4.0.0:** `docs/core/Modules/` (`MODULES.md`, `Codegen_Quality_Scoring.md`, `Security_Validation_Reference.md`). Content moved to [APM_PACKAGES.md](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md) and standalone-only APM package READMEs in [Workplace-Agent-Packages](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages) (`project-scorecard`, `llm-codegen-bench`).
>
> **Removed in v4.4.0:** `docs/core/Security_Validation_Guide.md`. Security compliance functionality (security-auditor agent, `/security-validate`, `/security-update`, `security-compliance` skill) moved entirely to the standalone-published [`nc-code-security-audit`](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/nc-code-security-audit) APM package — see its own `README.md` and `docs/SECURITY_AUDIT_GUIDE.md`.
>
> **Removed (docs consolidation):** `BA_ROLE.md` / `BA_Role_Roadmap.md` — BA guidance lives in [ROLES.md § Business Analyst](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/ROLES.md) and the [`business-analyst`](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/business-analyst) APM package.

### Project Documentation Files (User-Created)

**Located in `docs/project/`:**
- **README.md** - Guide for creating project documentation *(Template-provided guide, not user docs)*
- **ARCHITECTURE.md** - System architecture and design patterns *(Created during EXISTING_PROJECT initialization or manually)*
- **STACK.md** - Technology stack decisions and rationale *(Created for complex stacks or EXISTING_PROJECT or manually)*
- **CONTRIBUTING.md** - Contribution guidelines and development workflow *(Created conditionally or manually)*
- **[Custom docs]** - Any other project-specific documentation created by users

### Project Root Documentation
- **README.md** - Simplified project overview with pre-configuration and quick start (references GETTING_STARTED.md for details)

### Configuration Files
- **.opencode/project_init.md** - Project initialization configuration and state

### MCP Configuration
- **opencode.json** - Active MCP server configuration automatically generated during initialization (Phase 1.5, role selection) with base servers (Context7, Atlassian, TaskMaster, Chrome DevTools); discover additional servers using:
  - [OpenCode MCP servers](https://opencode.ai/docs/mcp-servers) — configuration reference for the `mcp` block
  - [Model Context Protocol servers](https://github.com/modelcontextprotocol/servers) — public registry of MCP servers

### Core Rule Files (.md) - Template-Managed
Located in `.opencode/rules/`:
- **orchestrator.md** - Agent routing, task orchestration, command mapping *(always-on instruction)*
- **development.md** - Technology stack reference, architecture overview, available agents & skills *(always-on instruction)*
- **taskmaster/dev_workflow.md** - TaskMaster development workflow

> **Removed in v3.0.0:** `project_customizations.md`. The parallel project-* customization system was retired; project adaptation is now done through three native channels (role-pack artifact edits, `Project Conventions` in root `AGENTS.md`, per-skill `project-config.json` + `references/guidelines.md`).

> **Removed in v3.0.0:** `tdd_workflow.md`. Universal TDD discipline now lives in `.opencode/skills/code-quality-standards/SKILL.md`; project-specific TDD policy lives in `.opencode/skills/coding-standards-context/references/guidelines.md` (rendered during initialization Phase 6).
- **taskmaster/taskmaster.md** - TaskMaster tools and commands reference

### Core Agent Definitions - Template-Managed
Located in `.opencode/agents/` (always present after template install):
- **initializer.md** - Project initialization orchestrator
- **documentation-sync.md** - Documentation registry and sync
- **infra-specialist.md** - CI/CD, deployment, monitoring (cross-functional, kept Core)
- **project-updater.md** - Workplace template update orchestrator
- **codebase-analyzer.md** - Scoped per-component codebase research during initialization (writes analysis artifacts; see `project-initialization/references/subagent-contract.md`)

### APM-Package Agents - Installed On Demand
The following agents live in `<id>/.apm/agents/` (in the Workplace-Agent-Packages repo) and are deployed into `.opencode/agents/` only when the package is installed (Phase 1.7-APM of `/initialize` or `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` after editing `apm.yml`):
- **frontend-specialist.md** - UI components, styling, state *(frontend-developer package)*
- **coding-standards.md** - Conventions, documentation, code-quality enforcement *(project-scorecard standalone-only package)*
- **backend-specialist.md** - Server architecture, services *(backend-developer package)*
- **database-specialist.md** - Schemas, ORM, migrations *(backend-developer package)*
- **api-specialist.md** - Endpoints, integrations, auth *(api package)*
- **performance-specialist.md** - Core Web Vitals, optimization *(performance package)*
- **testing-specialist.md** - Tests, TDD workflow *(qa package)*
- **security-auditor.md** - BASS security compliance *(nc-code-security-audit package, since v4.4.0)*

### Core Domain Skills - Template-Managed
Located in `.opencode/skills/` (always present):
- **project-initialization/** - Phase orchestration with reference docs (including `references/apm-workflow.md`, `references/apm-bootstrap.md`, `references/phase-1-7-apm.md` for APM activation)
- **project-update/** - Safe Workplace template update workflow (includes `migration_v4_0_apm_migration` for v3.x→v4 projects)
- **apm-packaging/** - Scaffold new APM packages (role-packs / modules / single skills) via `/package-new`
- **documentation-management/** - Registry, sync workflow, markdown standards
- **codebase-analysis/** - Subagent delegation patterns (codebase-analyzer for initialization artifacts, explore for ad-hoc search)
- **code-quality-standards/** - Code reuse checks, DRY enforcement
- **infrastructure-context/** - Infrastructure patterns (SKILL.md + references/template.md + project-config.json + **mandatory** references/guidelines.md)
- **coding-standards-context/** - Coding standards (SKILL.md + references/template.md + project-config.json + **mandatory** references/guidelines.md)

### APM-Package Domain Skills - Installed On Demand
Live in `<id>/.apm/skills/` (in the Workplace-Agent-Packages repo); deployed into `.agents/skills/` by `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` only when the package is installed:
- **frontend-context/** *(frontend-developer package)* - Frontend patterns; `references/guidelines.md` is generated and verified during Phase 6 (hard gate)
- **quality-check/** *(project-scorecard standalone-only package)* - Project quality assessment workflow
- **codegen-benchmark/**, **codegen-scorer/** *(llm-codegen-bench standalone-only package)* - LLM code-generation benchmark + shared scoring algorithms
- **backend-context/** *(backend-developer package)* - Backend patterns; guidelines.md required
- **database-context/** *(backend-developer package)* - Database patterns; guidelines.md required
- **api-context/** *(api package)* - API patterns; guidelines.md required
- **performance-context/** *(performance package)* - Performance patterns; guidelines.md required
- **testing-context/** *(qa package)* - Testing patterns; guidelines.md required
- **tdd-workflow/** *(qa package)* - TDD agent skill
- **ba-confluence-import/**, **ba-impact-analysis/**, **ba-task-generation/**, **ba-uml-modeling/** *(business-analyst package)*
- **security-compliance/** *(nc-code-security-audit package, since v4.4.0)* - BASS guide references and compliance workflow

### Domain Skill Configuration - Filled During Initialization
During Phase 6, each active context skill's `project-config.json` and `references/guidelines.md` is filled with project-specific details:
- **Core context skills (always):** `coding-standards-context`, `infrastructure-context`
- **APM-package context skills (only when their package is installed):** `frontend-context`, `backend-context`, `database-context`, `api-context`, `performance-context`, `testing-context`

**Note:** Phase 6 Part 3.5 enforces a **hard gate** — initialization will not complete until every required `guidelines.md` is present, non-empty, and free of unresolved placeholders. See `.opencode/skills/project-initialization/references/configuration-updates.md`.

**Initialization templates located in:** `.opencode/skills/project-initialization/references/` (`agents-template.md`, `role-commands-template.md` — the latter is now a *mapping specification* rather than a synthetic generator).

### Project Rule Files - User-Managed
Located in `.opencode/rules/project/`:
- **metadata.json** - Project identity (name, team, environments, ownership, description). Created during Phase 6.5.

> **Removed in v3.0.0 (APM-based since v4.0.0):** legacy `*.md` rule files, `.templates/` directory, and `routing.md`. Project adaptation now happens through three native channels: (1) edit APM-deployed artifacts in `.opencode/agents/`, `.opencode/commands/`, `.opencode/skills/` after `apm install`; (2) `Project Conventions` section in root `AGENTS.md`; (3) per-skill `project-config.json` + `references/guidelines.md`. See [CUSTOMIZATION.md](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/CUSTOMIZATION.md).

### TaskMaster Documentation
Located in `.opencode/rules/taskmaster/`:
- **dev_workflow.md** - TaskMaster development workflow
- **taskmaster.md** - TaskMaster tools and commands reference

### TDD Workflow (integrated into Core skills, v3.0.0+)
- **`.opencode/skills/code-quality-standards/SKILL.md` → "Test-Driven Development (TDD)" section** — universal trigger logic, RED-GREEN-REFACTOR phases, framework detection, troubleshooting, TaskMaster integration. Always loaded with the `code-quality-standards` skill.
- **`.opencode/skills/coding-standards-context/references/guidelines.md` → "TDD Policy"** — project-specific policy strength (mandatory/recommended/optional), test framework, run commands, naming/location conventions, coverage thresholds, output dir. Generated during initialization Phase 6 (hard gate via Phase 6 Part 3.5).
- **`.opencode/skills/coding-standards-context/project-config.json` → `testing.*`** — structured form of the same project-specific policy.

> **Historical:** `.opencode/rules/tdd_workflow.md` existed prior to v3.0.0 and was removed when its contents were integrated into the two skills above.
  - When to suggest TDD approach
  - RED-GREEN-REFACTOR cycle phases
  - TaskMaster integration for TDD
  - Testing framework detection
  - Test execution patterns

### TDD Workflow Commands & Skills (qa APM package)
Live in `qa/.apm/` (in the Workplace-Agent-Packages repo). Deployed into `.opencode/commands/` and `.opencode/skills/` only when the `qa` APM package is installed:
- **commands/tdd-workflow.md** - Execute TDD workflow with RED-GREEN-REFACTOR phases
- **commands/test-verify.md** - Verify and update existing test suite
- **skills/tdd-workflow/SKILL.md** - Agent skill for automatic TDD context detection
  - Activation patterns and triggers
  - Framework detection (Vitest, Jest, Playwright, Cypress)
  - Workflow guidance through TDD phases
  - Command invocation integration
  - Progress tracking across sessions

The `taskmaster-init.md` command stays in Core (`.opencode/commands/`) because TaskMaster initialization is independent of the qa role.

**Note:** The TDD workflow integrates with TaskMaster for task tracking and supports multiple testing frameworks with automatic detection. If `/tdd-workflow` is invoked while the `qa` package is not installed, route to the Initializer with a hint to add the `qa` package (`git: <apmPackages.registryRepoUrl>`, `path: qa`, `ref: master`) to `apm.yml` and run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` (or re-run `/initialize` selecting the QA role).

### Codegen Quality Scorer (standalone-only APM packages)

Live in two standalone-only APM packages in the [Workplace-Agent-Packages](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages) repo. Deployed into `.opencode/` either by accepting the `/quick-init` Step 4.5 offer (role-agnostic packages, empty `targetRoles` — these two qualify) or after the user explicitly adds them to `apm.yml` and runs `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` (never auto-installed by role; never offered during `/initialize` Pass A.5):

**`project-scorecard` package** (`project-scorecard/`):
- **.apm/agents/coding-standards.md** - Coding standards & code-quality enforcement agent
- **.apm/skills/quality-check/SKILL.md** - Project quality assessment across 6 categories
  - assets/: quality report template
  - assets/reports/: generated quality check reports
- **.apm/commands/quality-check.md** - Evaluate current project code quality (offline)

**`llm-codegen-bench` package** (`llm-codegen-bench/`):
- **.apm/skills/codegen-scorer/SKILL.md** - Shared scoring algorithms, grade definitions, tool detection logic
  - assets/scoring-config.json: default weights, thresholds, grade boundaries
  - assets/report-template.md: common report section structure
- **.apm/skills/codegen-benchmark/SKILL.md** - LLM code generation benchmarking via web-codegen-scorer
  - assets/: environment config, system prompt templates, prompts.json
  - assets/reports/: generated benchmark reports
- **.apm/commands/codegen-benchmark.md** - Benchmark LLM code generation quality (requires API keys for advanced mode)

**Note:** `llm-codegen-bench` consumes the shared `codegen-scorer` skill from the same package for scoring algorithms and grade definitions. The `quality-check` command runs fully offline; `codegen-benchmark` runs via in-OpenCode subagents (no API key) by default and supports a web-codegen-scorer CLI advanced mode that requires an LLM API key. They are unavailable until the corresponding standalone-only APM package is installed via `apm.yml` + `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`.

### Security Validation (standalone-published APM package, since v4.4.0)

Live in the [`nc-code-security-audit`](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/nc-code-security-audit) APM package (role-matched + optional for `backend`/`frontend`/`fullstack`/`qa`, offered in `/initialize` Phase 1.7-APM Pass A.5). Deployed into `.opencode/` only when the package is installed:

- **.apm/agents/security-auditor.agent.md** - BASS security compliance agent
- **.apm/skills/security-compliance/SKILL.md** - Security compliance orchestrator
  - assets/security-sources.json - Registry of BASS guide URLs with sync status
  - references/developer-checklist.md - Developer Security Checklist requirements
  - references/audit-logging.md - Audit Logging Guide requirements
  - references/web-security-headers.md - Web Security Headers Guide requirements
  - references/authenticators.md - Authenticators Handling Guide requirements
  - references/owasp-top10.md - OWASP Top 10 knowledge base
- **.apm/prompts/security-validate.prompt.md** - Run security compliance check, generate report, create TaskMaster tasks (`/security-validate`)
- **.apm/prompts/security-update.prompt.md** - Update rules from latest BASS guides (`/security-update`)

**Note:** Security rules integrate with BASS Security Guides for automated compliance checking. If `/security-validate` or `/security-update` is invoked while the package is not installed, route to the Initializer with a hint to add `nc-code-security-audit` (`git: <apmPackages.registryRepoUrl>`, `path: nc-code-security-audit`, `ref: master`) to `apm.yml` and run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js` (or re-run `/initialize` and accept it in Phase 1.7-APM Pass A.5).

### Documentation Sync Commands
Located in `.opencode/commands/`:
- **docs-sync.md** - On-demand documentation synchronization with code/configuration changes. Supports `--since=<period>` for git history analysis, `--report` for report-only mode, and `--auto` for safe automatic updates.

**Note:** This command extends the proactive sync logic from `documentation-management skill` into an on-demand workflow. It works for both Template Mode (Workplace template development) and Project Mode (initialized projects).

### Documentation Sync Hooks
Located in `.opencode/hooks/`:
- **plugins/docs-sync.js** - OpenCode plugin: listens for `session.idle`, runs the analysis library and submits the recommendation as the next user-role message (`session.promptAsync`); never in subagent sessions
- **docs-sync-check.js** - Analysis library + CLI used by the plugin: analyzes git diff after an idle session, classifies changed files into skill categories (api, frontend, backend, database, tests, infra, docs, workspace), returns a recommendation text with `/docs-sync` and `--since=<period>` options; reports explicitly on failure instead of failing silently

### Initialization Commands
Located in `.opencode/commands/`:
- **initialize.md** - Full 15-step project initialization workflow (9 top-level phases) (reads the ledger `.opencode/project_init.md`)
- **references/quick-init.md** - Fast template initialization without full configuration (~3-5 min vs ~15-20 min)

**Quick Init vs Full Initialize:**
| Aspect | `/quick-init` | `/initialize` |
|--------|----------------|---------------|
| Time | ~3-5 minutes | ~15-20 minutes |
| Phases | Single workflow | 9 modular phases |
| Codebase analysis | explore subagent before AGENTS.md | Phase 4 codebase-analyzer wave (EXISTING_PROJECT) + conditional Phase 6 API analysis |
| Tech stack | Not configured | Detected/collected |
| Domain skills | Not configured | Domain skill project-config.json filled (API enriched by the analyzer artifacts) |
| User roles | Not selected | 9 roles available |
| Trigger | `/quick-init` | `/initialize` + project_init.md |

**Note:** Quick Init follows [project-initialization/references/quick-init.md](../../project-initialization/references/quick-init.md) workflow. After Quick Init, users can run `/initialize` later for full configuration.

## Cross-Reference Matrix

### Documentation → Rules Mapping

**README.md** references:
- `[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)` - Detailed getting started guide
- `[CHANGELOG.md](CHANGELOG.md)` - Version history
- `[.opencode/skills/project-initialization/references/quick-init.md](../../project-initialization/references/quick-init.md)` - Quick Init workflow

**docs/GETTING_STARTED.md** references:
- `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)` - Architecture overview
- `[docs/core/ROLES.md](docs/core/ROLES.md)` - Role-based system details
- `[docs/core/CUSTOMIZATION.md](docs/core/CUSTOMIZATION.md)` - Customization guide
- `[docs/core/APM_PACKAGES.md](docs/core/APM_PACKAGES.md)` - APM package catalogue
- `[docs/core/DEVELOPMENT_WORKFLOW.md](docs/core/DEVELOPMENT_WORKFLOW.md)` - Daily workflow
- `[docs/core/MIGRATION_BACKUP.md](docs/core/MIGRATION_BACKUP.md)` - Updates and backup

**.opencode/project_init.md** references:
- `[.opencode/skills/project-initialization/SKILL.md](../../project-initialization/SKILL.md)` - Main initialization logic
- `[.opencode/skills/codebase-analysis/SKILL.md](../../codebase-analysis/SKILL.md)` - Analysis strategies
- `[.opencode/skills/project-initialization/references/quick-init.md](../../project-initialization/references/quick-init.md)` - Mode detection

**AGENTS.md** references:
- `[README.md](README.md)` - Project overview and setup guidance
- `[.opencode/project_init.md](../../../project_init.md)` - Initialization metadata and notes
- `[.opencode/skills/documentation-management/references/markdown-standards.md](markdown-standards.md)` - Source of agent guidelines (Canonical Agent Guidelines section)
- `[.opencode/rules/taskmaster/dev_workflow.md](../../../rules/taskmaster/dev_workflow.md)` - TaskMaster workflows

**docs/ARCHITECTURE.md** references:
- `[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)` - Quick start
- `[docs/PRESENTATION.md](docs/PRESENTATION.md)` - Executive overview
- `[docs/core/ROLES.md](docs/core/ROLES.md)` - Role details
- `[docs/core/CUSTOMIZATION.md](docs/core/CUSTOMIZATION.md)` - Customization
- `[docs/core/APM_PACKAGES.md](docs/core/APM_PACKAGES.md)` - APM packages
- `[docs/core/DEVELOPMENT_WORKFLOW.md](docs/core/DEVELOPMENT_WORKFLOW.md)` - Workflow
- `[docs/core/MIGRATION_BACKUP.md](docs/core/MIGRATION_BACKUP.md)` - Updates
- `[CHANGELOG.md](CHANGELOG.md)` - Version history

**docs/PRESENTATION.md** references:
- `[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)` - Getting started
- `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)` - Architecture overview
- `[docs/core/](docs/core/)` - Detailed documentation

**docs/core/ROLES.md** references:
- `[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)` - Quick start
- `[docs/core/CUSTOMIZATION.md](docs/core/CUSTOMIZATION.md)` - Registry system
- `[docs/core/APM_PACKAGES.md](docs/core/APM_PACKAGES.md)` - APM package catalogue
- `[docs/core/DEVELOPMENT_WORKFLOW.md](docs/core/DEVELOPMENT_WORKFLOW.md)` - Best practices

**docs/core/CUSTOMIZATION.md** references:
- `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)` - System overview
- `[docs/core/MIGRATION_BACKUP.md](docs/core/MIGRATION_BACKUP.md)` - Update procedures
- `[docs/core/APM_PACKAGES.md](docs/core/APM_PACKAGES.md)` - APM packages
- `[docs/core/ROLES.md](docs/core/ROLES.md)` - Role configuration

**Codegen quality scoring (standalone-only APM packages)** — content formerly in `docs/core/Modules/Codegen_Quality_Scoring.md` (removed v4.0.0) now lives in the Workplace-Agent-Packages repo:
- `[Web Codegen Scorer](https://github.com/angular/web-codegen-scorer)` - Original tool by Angular team
- `llm-codegen-bench/.apm/skills/codegen-scorer/SKILL.md` - Shared scoring algorithms
- `llm-codegen-bench/.apm/skills/codegen-benchmark/SKILL.md` - Benchmark workflow
- `project-scorecard/.apm/skills/quality-check/SKILL.md` - Quality check workflow
- `llm-codegen-bench/.apm/commands/codegen-benchmark.md` - Benchmark command
- `project-scorecard/.apm/commands/quality-check.md` - Quality check command

**Security validation** — `docs/core/Modules/Security_Validation_Reference.md` was removed in v4.0.0, and `docs/core/Security_Validation_Guide.md` itself was removed in v4.4.0 when the functionality moved entirely to the [`nc-code-security-audit`](https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages/-/tree/master/nc-code-security-audit) APM package; use:
- `nc-code-security-audit/README.md` and `nc-code-security-audit/docs/SECURITY_AUDIT_GUIDE.md` (in the Workplace-Agent-Packages repo) - High-level overview and workflow
- `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)` - System architecture

**docs/core/DEVELOPMENT_WORKFLOW.md** references:
- `[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)` - Initial setup
- `[docs/core/ROLES.md](docs/core/ROLES.md)` - Role-specific workflows
- `[docs/core/CUSTOMIZATION.md](docs/core/CUSTOMIZATION.md)` - Custom commands
- `[docs/core/APM_PACKAGES.md](docs/core/APM_PACKAGES.md)` - APM packages
- `[docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md](docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md)` - Authoritative docs-sync hook reference

**docs/core/AGENT_CONTEXT_AND_DOCS_SYNC.md** references:
- `[docs/core/DEVELOPMENT_WORKFLOW.md](docs/core/DEVELOPMENT_WORKFLOW.md)` - Abbreviated workflow chapter
- `.opencode/plugins/docs-sync.js` + `.opencode/hooks/docs-sync-check.js` - Plugin and analysis implementation
- `.opencode/commands/docs-sync.md` - `/docs-sync` command

**docs/project/STACK.md** (if created) references:
- `[.opencode/rules/development.md](../../../rules/development.md)` - Framework-specific guidelines
- `[.opencode/project_init.md](../../../project_init.md)` - Stack configuration
- `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)` - Architecture decisions

**docs/project/CONTRIBUTING.md** (if created) references:
- `[.opencode/rules/orchestrator.md](../../../rules/orchestrator.md)` - Git workflow
- `[.opencode/rules/development.md](../../../rules/development.md)` - Coding standards
- `[.opencode/skills/documentation-management/references/markdown-standards.md](markdown-standards.md)` - Rule updates
- `[.opencode/rules/taskmaster/dev_workflow.md](../../../rules/taskmaster/dev_workflow.md)` - TaskMaster workflow

### Rules → Documentation Mapping

**project-initialization skill** references:
- `[.opencode/project_init.md](../../../project_init.md)` - Configuration file
- `[.opencode/rules/development.md](../../../rules/development.md)` - Standards to apply
- `[.opencode/skills/codebase-analysis/SKILL.md](../../codebase-analysis/SKILL.md)` - Analysis strategy
- `[.opencode/skills/project-initialization/references/quick-init.md](../../project-initialization/references/quick-init.md)` - Quick Init alternative
- `[.opencode/rules/orchestrator.md](../../../rules/orchestrator.md)` - Post-init workflows
- `[README.md](README.md)` - Update target
- `[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)` - Generated for EXISTING_PROJECT
- `[docs/project/STACK.md](docs/project/STACK.md)` - Generated for complex stacks

**development.md** references:
- `[.opencode/rules/orchestrator.md](../../../rules/orchestrator.md)` - Workflow orchestration and command routing
- `[AGENTS.md](AGENTS.md)` - AI agent instructions (root, generated in Phase 7)
- `[README.md](README.md)` - Project overview
- `[.opencode/project_init.md](../../../project_init.md)` - Initialization ledger
- `[CHANGELOG.md](CHANGELOG.md)` and `[docs/core/APM_PACKAGES.md](docs/core/APM_PACKAGES.md)` - Template version notes

**code-quality-standards skill** references:
- `[.opencode/rules/development.md](../../../rules/development.md)` - Architecture overview
- [Coding Standards Skill](../../coding-standards-context/SKILL.md) - Stack-specific standards

**Domain context skills** (`coding-standards-context`, `infrastructure-context`, role-pack `*-context`) reference:
- Their own `project-config.json` and `references/guidelines.md` - project-specific settings
- `[.opencode/rules/development.md](../../../rules/development.md)` - High-level architecture overview
- Project long-form docs where present (`docs/project/STACK.md`, `docs/project/ARCHITECTURE.md`)

**orchestrator.md** references:
- `[.opencode/rules/taskmaster/dev_workflow.md](../../../rules/taskmaster/dev_workflow.md)` - Detailed workflow
- `[.opencode/skills/project-initialization/SKILL.md](../../project-initialization/SKILL.md)` - Init workflow

**documentation-management/references/markdown-standards.md** references:
- `[.opencode/skills/documentation-management/SKILL.md](../SKILL.md)` - Rules & docs sync (BEFORE/AFTER workflow)
- `[.opencode/skills/documentation-management/SKILL.md](../SKILL.md)` - This registry

**project-initialization/references/quick-init.md** references:
- `[.opencode/skills/project-initialization/SKILL.md](../../project-initialization/SKILL.md)` - Full init process
- `[.opencode/project_init.md](../../../project_init.md)` - Config file
- `[README.md](README.md)` - Update target

## Automatic Registration Process

During project initialization (Phase 7.5), the AI agent automatically:

### 1. Document Creation Tracking
For each document created during initialization:
```
- Record document path
- Record creation timestamp
- Identify document type (AGENTS.md, core doc, architecture, stack guide, etc.)
- Determine related rules and documents
```

### 1.5 Repository-Wide Discovery (Required)

**Important:** In addition to tracking "created during initialization", Phase 7.5 MUST scan the repository at the end of initialization (after analysis + doc generation) to discover all currently relevant documentation and rule files.

**Purpose:** Ensure registries and indexes reflect the **actual current repository state**, including documentation and rules that existed before initialization.

**Default discovery scope:**
- Documentation:
  - `README.md`, `AGENTS.md`
  - `.opencode/project_init.md`
  - `docs/**/*.md`
- Rules:
  - `.opencode/rules/**/*.md` (includes `.opencode/rules/project/` for project-specific customizations)

**Default exclusions:**
- Anything ignored by `.gitignore` (OpenCode's search tools respect it)
- `node_modules/` and build output directories (`dist/`, `build/`, `.next/`, etc.)

### Deduplication Policy (Required)

When generating `docs/INDEX.md` and when inserting cross-references during Phase 7.5:

**Canonicalization:**
- Normalize to repository-relative paths using forward slashes (`/`).
- On Windows, treat paths as case-insensitive for comparison.
- Use a canonical dedup key: `dedupKey = canonicalPath.toLowerCase()`.

**Index dedup:**
- Each document/rule must appear **at most once** in `docs/INDEX.md`.
- If a file matches multiple sections, use a fixed precedence order and keep only the first match.

**Cross-reference dedup:**
- Do not insert a link line if the target is already linked in the same section (same canonical target path).
- If a duplicate exists but the new line has a better description, replace the existing line instead of adding another.

### 2. Cross-Reference Insertion
Automatically add references to:
- **Newly created docs** → Add links to related rules and existing docs
- **Existing rules** → Add links to newly created docs where relevant
- **README.md** → Add links to all new major documentation files
- **docs/INDEX.md** → Add entries for all new documents

### 3. Reference Template

When adding a new document reference:
```markdown
## Related Documentation
- [Document Name](path/to/document.md) - Brief description of what it contains
```

When adding a new rule reference:
```markdown
## Related Rules
- [Rule Name](../../../rules/rulename.md) - Brief description of what it enforces
```

### 4. Bi-directional Links

Ensure all links are bi-directional:
- If doc A references rule B, then rule B must reference doc A
- If doc A references doc B, then doc B must reference doc A (where relevant)

## Document Registration Workflow

### Phase 7.5 of Project Initialization

After Phase 7 (Documentation Generation), execute:

1. **Scan Repository (Discovery) + Identify Created/Updated Documents**
   ```
   Build two inventories:
   A) Repository-wide inventory (discovery):
      - All docs to include in docs/INDEX.md
      - All rules to link/reference from docs/INDEX.md and registry

   B) Initialization delta (created/updated during Phase 7):
   - README.md (updated)
   - AGENTS.md (generated for project, repo root)
   - docs/project/ARCHITECTURE.md (if created for EXISTING_PROJECT)
   - docs/project/STACK.md (if created for complex stacks)
   - docs/project/CONTRIBUTING.md (if created conditionally)
   - opencode.json (generated and configured)
   - Any other project-specific docs
   ```

2. **Update documentation-management skill**
   - Add discovery policy notes (if needed)
   - Add new/updated documents to appropriate sections
   - Update cross-reference matrix
   - Add timestamp and creation context
   - Record MCP servers enabled in `opencode.json`

3. **Generate docs/INDEX.md Dynamically**
   - **Generate centralized index** from the repository-wide discovered inventory
   - **Check file existence** for optional sections (ARCHITECTURE.md, STACK.md, CONTRIBUTING.md)
   - Group by category (Core, Architecture, Rules, etc.)
   - Include brief descriptions for each document
   - Add direct links to all discovered documents and relevant rules
   - Set current timestamp
   - **No placeholders or commented sections** - only real content

4. **Insert Cross-References**
   - Add "Related Documentation" sections to new docs
   - Add "Related Rules" sections to new docs
   - Update existing rules with references to new docs
   - Update README.md with links to new documentation

5. **Validate Links**
   - Run `node .opencode/skills/project-initialization/scripts/validate-doc-links.js` — it resolves every relative link plus heading anchors across all `.md` / `.md` / `.html` documents and exits non-zero on any broken reference
   - Check bi-directional references
   - Report any broken links

6. **Update .opencode/project_init.md**
   - Mark "Documentation registry updated" checkbox
   - List all registered documents in Notes section

## Link Validation Rules

### Valid Link Format

Prefer plain relative Markdown links — they render everywhere (OpenCode, GitLab, GitHub):

```markdown
[Display Text](relative/path/to/file.ext)
[Display Text](../core/APM_PACKAGES.md#installing-packages)
```

Rule files use plain relative Markdown links.

```markdown
[Display Text](relative/path/to/file.ext)
```

Anchors follow the renderer's heading slug: lowercase, punctuation dropped, each whitespace character mapped to its own dash. A heading containing ` — ` or ` & ` therefore yields a **double** dash — avoid those characters in headings you intend to link to.

### Automated Check

```bash
node .opencode/skills/project-initialization/scripts/validate-doc-links.js
```

Validates target files and heading anchors for both link styles, skips fenced/inline code examples, and separates genuine breakage from links to artifacts generated later (`AGENTS.md`, `docs/INDEX.md`, `references/guidelines.md`, APM-deployed skills/agents). Exit code 1 means at least one broken reference **in scope** — in an initialized project the default scope is Workplace-owned documents, so findings in the team's own docs are listed but never blocking. Add `--scope=all` for a repo-wide audit, `--quiet` to suppress the informational section, `--json` for machine-readable output.

### Required Bi-directional Links

**High-priority pairs** (must be bi-directional):
- project-initialization skill ↔ .opencode/project_init.md
- orchestrator.md ↔ AGENTS.md (repo root)
- development.md ↔ docs/project/STACK.md (if exists)
- codebase-analysis skill ↔ docs/project/ARCHITECTURE.md (if exists)

**Medium-priority pairs** (should be bi-directional):
- README.md ↔ All core documentation
- docs/INDEX.md ↔ All documentation files
- documentation-management/references/markdown-standards.md ↔ All .md rules

## Maintenance Guidelines

### When Creating New Documentation
1. **Register immediately** in this file's document list
2. **Add to cross-reference matrix** with related docs/rules
3. **Update docs/INDEX.md** with new entry
4. **Insert cross-references** in the new document and related files
5. **Validate bi-directional links**

### When Creating New Rules
1. **Add to rule list** in this file
2. **Update cross-reference matrix** with related docs/rules
3. **Reference in relevant documentation** (especially docs/INDEX.md)
4. **Ensure existing docs reference** the new rule where applicable

### When Updating Existing Files
1. **Check if cross-references need updates** after significant changes
2. **Add new references** if document scope expands
3. **Update descriptions** in cross-reference matrix if purpose changes
4. **Validate links still work** after file moves or renames
5. **For opencode.json:**
   - Confirm configuration matches current MCP selections
   - Record newly enabled/disabled servers in the Notes section of .opencode/project_init.md
   - Verify users know to update API keys when servers change

## docs/INDEX.md Generation

**IMPORTANT:** This file is NOT static. It is **generated dynamically** during Phase 7.5 of project initialization based on actually created documents.

### Dynamic Generation Rules

1. **Detection:** Check which files exist before generating content
2. **Conditional Sections:** Only include sections for documents that were actually created
3. **Timestamp:** Set to actual initialization completion time
4. **No Placeholders:** Do not include commented-out sections or placeholders

### Generated Structure Template

```markdown
# Documentation Index

> Central index of all project documentation and development rules

Last Updated: [Timestamp]

## 📋 Core Documentation

### Project Overview
- [README.md](../README.md) - Project setup and quick start guide
- [.opencode/project_init.md](../.opencode/project_init.md) - Initialization configuration

### Development Guides
- [AGENTS.md](../AGENTS.md) - AI agent instructions
- [docs/core/TDD_WORKFLOW.md](core/TDD_WORKFLOW.md) - Test-Driven Development guide

### Architecture & Design
[This section is populated during EXISTING_PROJECT initialization]
- [docs/project/ARCHITECTURE.md](project/ARCHITECTURE.md) - System architecture and patterns
- [docs/project/STACK.md](project/STACK.md) - Technology stack decisions

### Contribution Guidelines
- [docs/project/CONTRIBUTING.md](project/CONTRIBUTING.md) - How to contribute to this project

## 🔧 Development Rules

### Initialization & Setup
- [project-initialization skill](../.opencode/skills/project-initialization/SKILL.md) - Complete initialization workflow
- [project-initialization/references/quick-init.md](../.opencode/skills/project-initialization/references/quick-init.md) - Quick Init template setup
- [initialize](../.opencode/commands/initialize.md) - Full initialization command
- [quick-init](../.opencode/commands/quick-init.md) - Fast template setup command

### Core Development
- [development.md](../.opencode/rules/development.md) - Development standards and architecture overview
- [orchestrator.md](../.opencode/rules/orchestrator.md) - Git workflows and MCP integration
- [codebase-analysis skill](../.opencode/skills/codebase-analysis/SKILL.md) - Codebase analysis strategies
- [code-quality-standards skill](../.opencode/skills/code-quality-standards/SKILL.md) - Mandatory code reuse checks before creating new code

### Domain Context Skills (Configured in Phase 6, with mandatory `references/guidelines.md`)

**Core context skills (always present):**
- [coding-standards-context](../.opencode/skills/coding-standards-context/SKILL.md) - Language-specific coding standards
- [infrastructure-context](../.opencode/skills/infrastructure-context/SKILL.md) - CI/CD and deployment

**APM-package context skills (only after the corresponding package is installed via `apm install`):**
- `frontend-developer/.apm/skills/frontend-context/SKILL.md` - Frontend development guidelines
- `backend-developer/.apm/skills/backend-context/SKILL.md` - Backend development guidelines
- `backend-developer/.apm/skills/database-context/SKILL.md` - Database design and ORM patterns
- `api/.apm/skills/api-context/SKILL.md` - API design and integrations
- `qa/.apm/skills/testing-context/SKILL.md` - Testing strategies and coverage
- `performance/.apm/skills/performance-context/SKILL.md` - Performance optimization guidelines

### Documentation & Quality
- [documentation-management/references/markdown-standards.md](../.opencode/skills/documentation-management/references/markdown-standards.md) - Documentation standards
- [documentation-management/references/markdown-standards.md](../.opencode/skills/documentation-management/references/markdown-standards.md) - Rule structure and updates
- [documentation-management skill](../.opencode/skills/documentation-management/SKILL.md) - This registry system
- [documentation-management skill](../.opencode/skills/documentation-management/SKILL.md) - Rules & documentation synchronization

### TaskMaster Integration
- [dev_workflow.md](../.opencode/rules/taskmaster/dev_workflow.md) - TaskMaster development workflow
- [taskmaster.md](../.opencode/rules/taskmaster/taskmaster.md) - Commands and tools reference

### TDD Workflow
- [code-quality-standards/SKILL.md](../.opencode/skills/code-quality-standards/SKILL.md) → "Test-Driven Development (TDD)" - Universal TDD discipline (Core)
- [coding-standards-context/references/guidelines.md](../.opencode/skills/coding-standards-context/references/guidelines.md) → "TDD Policy" - Project-specific TDD policy (Core, generated in Phase 6)
- [taskmaster-init](../.opencode/commands/taskmaster-init.md) - Initialize TaskMaster for TDD subtasks (Core)
- `qa/.apm/commands/tdd-workflow.md` - Execute TDD RED-GREEN-REFACTOR cycle (installed with qa APM package)
- `qa/.apm/commands/test-verify.md` - Verify and update existing tests (installed with qa APM package)

### APM-Package Agent Skills
- `qa/.apm/skills/tdd-workflow/SKILL.md` - TDD workflow agent skill (qa package)
- `llm-codegen-bench/.apm/skills/codegen-scorer/SKILL.md` - Shared scoring algorithms (llm-codegen-bench standalone-only package)
- `llm-codegen-bench/.apm/skills/codegen-benchmark/SKILL.md` - LLM code generation benchmarking (llm-codegen-bench standalone-only package)
- `project-scorecard/.apm/skills/quality-check/SKILL.md` - Project quality assessment (project-scorecard standalone-only package)

### Codegen Quality Scoring (standalone-only APM packages)
- `llm-codegen-bench/.apm/commands/codegen-benchmark.md` - Benchmark LLM code generation (install via `apm.yml` + `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`)
- `project-scorecard/.apm/commands/quality-check.md` - Evaluate current project quality (install via `apm.yml` + `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`)

## 🔗 Quick Navigation

**Getting Started:**
1. [Quick Init](../.opencode/commands/quick-init.md) - Fast template initialization (~3-5 min)
2. [Full Initialize](../.opencode/commands/initialize.md) → [Initialization Process](../.opencode/skills/project-initialization/SKILL.md)
3. [TaskMaster Setup](../.opencode/rules/taskmaster/dev_workflow.md) → [Command Reference](../.opencode/rules/taskmaster/taskmaster.md)

**Development Workflow:**
1. [Development Standards](../.opencode/rules/development.md)
2. [Git Workflow](../.opencode/rules/orchestrator.md)
3. [TaskMaster Workflow](../.opencode/rules/taskmaster/dev_workflow.md)
4. [TDD Workflow](../.opencode/skills/code-quality-standards/SKILL.md) - "Test-Driven Development (TDD)" section

**TDD Workflow (requires `qa` APM package — install via `/initialize` selecting QA role, or by adding the `qa` package — `git: <apmPackages.registryRepoUrl>`, `path: qa`, `ref: master` — to `apm.yml` and running `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`):**
1. [Initialize TaskMaster](../.opencode/commands/taskmaster-init.md) - Set up TaskMaster (Core)
2. `/tdd-workflow` - RED-GREEN-REFACTOR cycle (qa package)
3. `/test-verify` - Test health analysis (qa package)

**Quality Scoring (standalone-only APM packages — install explicitly via `apm install`):**
1. `/quality-check` - Evaluate current project quality (from `project-scorecard` package; add it — `git: <apmPackages.registryRepoUrl>`, `path: project-scorecard`, `ref: master` — to `apm.yml` then run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`)
2. `/codegen-benchmark` - Benchmark LLM code generation (from `llm-codegen-bench` package; install via `apm.yml` as above)
3. Scoring Algorithms - `.opencode/skills/codegen-scorer/SKILL.md` (deployed by the `llm-codegen-bench` package)

**Architecture & Design:**
1. [Architecture Guide](project/ARCHITECTURE.md)
2. [Technology Stack](project/STACK.md)
3. [Analysis Strategy](../.opencode/skills/codebase-analysis/SKILL.md)
```

## Important Notes

1. **Always use relative paths** — plain Markdown links everywhere, including rule files
2. **Keep descriptions brief** in cross-reference lists (one line max)
3. **Update docs/INDEX.md** whenever new documentation is created
4. **Maintain bi-directional links** for all high-priority pairs
5. **Validate links regularly** with `validate-doc-links.js`, especially after file reorganization
6. **Document creation context** in Notes section of project_init.md

This registry system ensures that:
- All documentation is discoverable
- Relationships between docs and rules are clear
- Navigation is intuitive
- Link integrity is maintained
- New documents are automatically integrated into the ecosystem
