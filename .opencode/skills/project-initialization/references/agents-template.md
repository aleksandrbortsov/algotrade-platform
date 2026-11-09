
# AGENTS.md Universal Template

This template is used to generate AGENTS.md files for both root project and nested components.
The content follows practical recommendations: Do/Don't, file-scoped commands, safety rules, project map, examples, PR checklist, and "when stuck" guidance.

**Used by:** Both Quick Init and Full Initialization (Phase 7)
**References:** [agents.md](https://agents.md) — Open standard; [Medium: AGENTS.md best practices](https://medium.com/coding-nexus/agents-md-the-file-that-saves-you-from-dumb-ai-code-a9df1a3997bc)

---

## Template Structure (Root)

The following markdown template uses placeholders (`{{PLACEHOLDER}}`) that are replaced during generation.
Conditional sections use `{{IF_CONDITION:content}}` syntax.

```markdown
# AGENTS.md{{IF_NESTED: ({{COMPONENT_TYPE}})}}

> Instructions for AI coding agents working on this project.
> See https://agents.md for the open standard.

{{IF_ROOT:
## Project Resource Map (read first)

> **For AI agents — canonical entry points before any work.** Consult these in order; first hit wins for project-specific facts.

1. **[`docs/INDEX.md`](docs/INDEX.md)** — auto-generated central index of every documentation and rule file in this repository (regenerated on every `/initialize` / Phase 7.5). **Use this to discover any other resource by topic** instead of guessing paths.
2. **[`.opencode/rules/development.md`](.opencode/rules/development.md)** — single source of truth for the technology stack (always loaded into agent context).
3. **[`.opencode/project_init.md`](.opencode/project_init.md)** — compact initialization ledger (state, artifact pointers, **Supplemental Source Manifest**, **User Answers & Decision Log** with per-phase Q-blocks recording entities, modules, integrations, smart-question answers).
4. **`<skills-root>/<context>/references/guidelines.md`** — per-domain project conventions (coding standards, infra, frontend, backend, api, db, testing, performance — only those active for this project).
5. **[`.opencode/rules/.core-version.json`](.opencode/rules/.core-version.json)** — template version + applied migrations.

> Do NOT search ad-hoc when `docs/INDEX.md` exists — it is the navigation hub for the project.

}}
## Do

{{DO_RULES}}

## Don't

{{DONT_RULES}}

{{IF_ROOT:
## Architecture (TL;DR)

> Keep this section to **3-7 lines**. Long-form architecture detail belongs in either `Project Conventions` (subheading `### Architecture`) below, the relevant `*-context/references/guidelines.md`, or — only if the project actually needs it and Phase 7 Part 3 created it — `docs/project/ARCHITECTURE.md`. Link, do not duplicate.

{{ARCHITECTURE_TLDR}}

## Constraints & Non-Goals

> What this project intentionally does NOT do, and what hard limits the agent must respect (perf budgets, browser/runtime support, compliance, dependencies allowlist, legacy systems, etc.). **3-7 bullets max** — long-form detail goes into `Project Conventions` (subheading `### Constraints`) below, or — only if the project actually needs it and Phase 7 Part 3 created it — `docs/project/STACK.md`.

{{CONSTRAINTS}}

}}
## Commands

{{FILE_SCOPED_COMMANDS}}

{{IF_ROOT:
# Full build (only when asked)
{{PM}} run build
}}

## Safety and Permissions

**Allowed without asking:**
- read/list files
- run lint, format, or type-check on single files
- run single test files

**Ask first:**
- install new packages
- git push
- delete files or chmod
- full builds or E2E test suites

## Project Structure

{{PROJECT_STRUCTURE_MAP}}

{{IF_HAS_EXAMPLES:
## Good and Bad Examples

{{GOOD_BAD_EXAMPLES}}
}}

{{IF_HAS_API:
## API Docs

{{API_DOCS_REF}}
}}

## PR Checklist

{{PR_CHECKLIST}}

## When Stuck

- ask a question
- propose a short plan
- open a draft PR with notes

## Testing

{{TESTING_INSTRUCTIONS}}

{{IF_HAS_SECURITY:
## Security Considerations

{{SECURITY_RULES}}
}}

{{IF_ROOT_WITH_NESTED:
## Nested Components

This project contains multiple components with their own AGENTS.md files:

{{NESTED_COMPONENTS_LIST}}

**Note:** The closest AGENTS.md to the file being edited takes precedence.
}}

{{IF_ROOT:
## Project Conventions

> Place team-wide rules, naming conventions, repository-specific patterns, and pointers
> to project tooling here. This section is read by every agent on every conversation
> (OpenCode loads root `AGENTS.md` into every agent session, subagents included).
>
> Prefer linking to the rendered `references/guidelines.md` of the relevant context skill
> (for example `.opencode/skills/coding-standards-context/references/guidelines.md`,
> `.agents/skills/frontend-context/references/guidelines.md`) instead of duplicating
> domain-specific rules here. Use this section for cross-domain or repo-wide concerns
> only: branching strategy, environment URLs, deployment runbooks, security checklist,
> on-call rotation, etc.

{{PROJECT_CONVENTIONS}}

## Additional Resources

- **[docs/INDEX.md](docs/INDEX.md)** — Central documentation index (start here for any lookup; auto-generated by `/initialize` Phase 7.5)
- [Development Rules](.opencode/rules/development.md)
- [Quick Start](docs/GETTING_STARTED.md)
{{IF_SECURITY_PACKAGE_INSTALLED:- [Security Compliance](.agents/skills/security-compliance/SKILL.md)}}
- [TaskMaster Workflow](.opencode/rules/taskmaster/dev_workflow.md)
}}

{{IF_ROOT:
## Package Instructions (managed by APM)

> The region between the markers below is owned by `apm compile` (this project's
> `apm.yml` sets `compilation.agents_md.mode: managed_section`). Do not hand-edit
> inside the markers — `apm compile` rewrites only that region with compiled
> package instructions. Everything outside the markers is maintained by the
> Workplace initializer (Phase 7) and the project team; Phase 7 preserves the
> marker pair verbatim.

<!-- apm:start -->
<!-- apm:end -->
}}

---

*Generated by {{GENERATION_MODE}}. {{IF_QUICK_INIT:Run `/initialize` for comprehensive configuration.}}*
```

---

## Dynamic Agent Guidelines Integration

**IMPORTANT:** During AGENTS.md generation (both Quick Init and Full Initialization), the agent MUST also dynamically load coding standards:

1. **Read `.opencode/skills/coding-standards-context/SKILL.md`** using the read_file tool
2. **Locate the "### Canonical Agent Guidelines" section** (if it exists)
3. **Extract all bullet points** (lines starting with `-`) from that section
4. **Merge them into the `{{DO_RULES}}` placeholder** alongside user-provided and auto-detected Do rules
5. **Do NOT hardcode the rules** — they must be read dynamically each time

This ensures AGENTS.md always reflects the latest coding standards regardless of initialization mode.

---

## Brevity Principle (HARD RULE)

> **AGENTS.md is the entry point, not the manual.** Every section must stay short and link out to canonical detail.
>
> **Why it is a hard rule on OpenCode:** the root `AGENTS.md` is injected into the system prompt of **every** session — the primary agent and each subagent alike — so during Phase 4 its full text is paid for once per `codebase-analyzer` dispatch. Target for the root file: **≤ 120 lines / ≤ 8 KB outside the `<!-- apm:start -->` … `<!-- apm:end -->` managed section**; when a generated draft exceeds that, apply the spillover rule below before writing it.

**Spillover targets — what is *always* available vs *only when generated by Phase 7 Part 3*:**

| Channel | Always present after init? | What lives here | What does NOT live here |
|---|---|---|---|
| `AGENTS.md` (root) | ✅ always | TL;DR rules, top-of-mind constraints, links to detail | Long prose, full architecture diagrams, exhaustive style guides, change logs |
| `Project Conventions` section inside root `AGENTS.md` | ✅ always (seeded empty) | Repo-wide adaptation that doesn't fit a single skill — branching, environments, deployment, security checklist; long-form architecture / constraints overflow goes here as `### Architecture` / `### Constraints` subheadings | Domain-specific rules that belong to a context skill |
| `<skills-root>/<context>/references/guidelines.md` | ✅ if the matching context skill is active (`coding-standards-context` and `infrastructure-context` are guaranteed by Quick Init step 9.5 / Full Init Phase 6.5; the rest only when the matching role pack is activated) | Per-domain rules (frontend, backend, api, db, infra, coding-standards, testing, performance) | Project structure overview, marketing description |
| `docs/INDEX.md` | ✅ always (Phase 7.5 / Quick Init step 9.5) | Discoverable map of every doc/rule/skill in the repo | Anything not on disk |
| `docs/project/ARCHITECTURE.md` | ⚠️ **optional** — created **only** by Phase 7 Part 3 trigger (EXISTING_PROJECT with complex architecture, or explicit user request). Quick Init never creates it. | Deep architecture, diagrams, ADRs, sequence flows | Code style, library lists |
| `docs/project/STACK.md` | ⚠️ **optional** — created **only** by Phase 7 Part 3 trigger (complex/unusual stack, or explicit user request). Quick Init never creates it. | Stack rationale and version pins | Architecture reasoning |
| `docs/project/CONTRIBUTING.md` | ⚠️ **optional** — created **only** by Phase 7 Part 3 when requirements include specific contribution conventions. | Contribution rules | Stack/architecture |

**Hard limits per AGENTS.md section (root):**

- `Do` / `Don't`: **3-7 bullets each**. One-line each. If a rule needs explanation, link instead.
- `Architecture (TL;DR)`: **3-7 lines**. Pattern label + 1-line per major layer/component. Link `Project Conventions → ### Architecture` (or `docs/project/ARCHITECTURE.md` if it exists) for depth.
- `Constraints & Non-Goals`: **3-7 bullets**. Hard limits only. Long-form goes to `Project Conventions → ### Constraints` (or `docs/project/STACK.md` if it exists) and to the relevant `*-context/references/guidelines.md`.
- `Commands`: file-scoped only. Full build/deploy → README or CI docs.
- `Project Structure`: **5-10 lines**. Anchor paths only. Full inventory → `docs/INDEX.md`.

**Length spillover rule (the "5-line rule"):** if a user's answer to any dialogue question would render as more than 5 lines in AGENTS.md, the agent MUST:

1. Place a 1-3 line summary in AGENTS.md.
2. Append the full answer to the most appropriate **already-existing** canonical doc:
   - Coding rules → `.opencode/skills/coding-standards-context/references/guidelines.md` (always present).
   - Infra rules → `.opencode/skills/infrastructure-context/references/guidelines.md` (always present).
   - Frontend / backend / API / DB / testing / performance specifics → the corresponding `*-context/references/guidelines.md` **only if that domain context skill was deployed by an installed APM package**. If the matching skill is not installed, fall back to step 3 below and leave a `TODO: install <package> via apm install (or re-run /initialize with the matching role) to move this rule to <skill>/guidelines.md` line in `Project Conventions` so the spillover is auditable.
   - Architecture / constraints / project-wide conventions → `Project Conventions` section of root `AGENTS.md` as a `### Architecture` / `### Constraints` / `### {topic}` subheading (always present, seeded empty).
3. Optional escalation (Full Init only, when Phase 7 Part 3 triggers fire): if `docs/project/ARCHITECTURE.md` or `docs/project/STACK.md` is being created in the same `/initialize` run (per Phase 7 Part 3 rules), the architecture/stack overflow MAY be appended there instead of `Project Conventions`. The agent MUST NOT create `docs/project/*.md` files just to absorb spillover — Part 3 triggers are the only authority for that.
4. Replace the long answer in AGENTS.md with a link to whichever canonical location received it.

This rule applies to **every one of the 7 AGENTS.md sections** — whether the value was auto-derived or surfaced as a question.

---

## Dialogue Questions Catalog

### Phase 1: Root AGENTS.md Questions (adaptive — driven by confidence, NOT a fixed list)

These questions populate the 7 sections of root AGENTS.md and are governed by the project-wide [Adaptive Question Principle](../SKILL.md#adaptive-question-principle-project-wide-rule). The agent treats the seven items below as a **catalogue of fields to fill**, not as a script of questions to ask. The number of user-facing prompts is **0–7** depending on how much can be auto-derived.

**Adaptive dialogue mechanics:**

- For **each** of the 7 fields below, the agent first runs the auto-detection / Explore-default lookup column to produce a candidate value with HIGH / MEDIUM / LOW confidence.
- **HIGH confidence (default unambiguous, e.g. `package.json description` present and non-trivial; `engines.node` set; framework + folder layout map cleanly to a known architecture label)** → write the value silently, do NOT prompt the user. Record in Decision Log: `auto-accepted from <source>: <value>`.
- **MEDIUM confidence** → present the candidate inline with a short Enter-to-accept prompt; the user may accept, override, or `skip: <reason>` (Q2 / Q5 / Q3 only).
- **LOW confidence (no detectable signal)** → ask explicitly with a fallback default + always include `[Skip — mark as TBD]`.
- **Batch all surfaced questions into ONE interaction.** If 4 fields end up MEDIUM/LOW, ask all 4 in a single batched prompt — never one-at-a-time.
- **Maximum 5 user-facing questions** in this phase. If more than 5 are MEDIUM/LOW, the lowest-impact ones are filled with their defaults and recorded as `auto-filled — confidence LOW; refine via /docs-sync` in Decision Log so the user can revisit later.
- **Zero questions is the preferred path** when every field has a HIGH-confidence default. The agent presents one final confirmation: "I derived all 7 sections of AGENTS.md from existing project signals. Press Enter to accept, or list sections to override (e.g. `architecture, constraints`)."

**Skip-reason rules (unchanged):** `skip: <one-line reason>` is allowed for fields 2 (Architecture), 3 (Do's), and 5 (Constraints) only; the reason is preserved verbatim in `Project Conventions` blockquote.

| # | Question | Auto-Detection (default) | Section in AGENTS.md | Spillover target (always-present first; optional second) |
|---|----------|--------------------------|----------------------|---------------------------------------------------------|
| 1 | **Project description** (1-2 sentences, ≤ 240 chars) | `package.json` description / README first heading / Explore summary | Header blockquote | `README.md` Overview |
| 2 | **Architecture style** — pick a label *and* give 1 line per major layer (e.g. "modular monolith; web SPA, NestJS API, Postgres, Redis cache") | Explore: framework + folder layout + entrypoints + monorepo signals | `Architecture (TL;DR)` | `Project Conventions → ### Architecture` (always). Optional escalation: `docs/project/ARCHITECTURE.md` **only if Phase 7 Part 3 triggers fire** in the same run. Never create that file just for spillover. |
| 3 | **Do's** — 3-7 short bullets: key libraries, patterns, conventions to always use | Explore-detected dependencies, `.eslintrc`, `.prettierrc`, `tsconfig`, recurring patterns in code | `Do` | `coding-standards-context/references/guidelines.md` (always). Domain-specific Do's go to the corresponding `*-context/guidelines.md` only if that role-pack-supplied skill is active. |
| 4 | **Don'ts** — 3-7 short bullets: anti-patterns, forbidden libs, deprecated paths | Explore: detected anti-patterns, deprecated APIs, banned imports | `Don't` | same as Do's |
| 5 | **Constraints & Non-Goals** — 3-7 bullets: hard limits the agent must respect (perf budgets, browser/runtime support, compliance/PII, dependency allowlist, legacy systems we won't touch, features explicitly out of scope) | Explore: `engines` field, `browserslist`, `Dockerfile` base image, `tsconfig` target, security configs, license headers; otherwise `[?]` | `Constraints & Non-Goals` | `Project Conventions → ### Constraints` (always). Optional escalation: `docs/project/STACK.md` **only if Phase 7 Part 3 triggered its creation** in the same run. Domain-specific limits go to `infrastructure-context/guidelines.md` (perf, runtime) or `coding-standards-context/guidelines.md` (deps allowlist). |
| 6 | **Code style + commit format** — 1-2 lines (e.g. "TypeScript strict, Prettier defaults, conventional commits") | `.eslintrc`, `.prettierrc`, `commitlint.config.js`, `biome.json` | Inside `Do` (one bullet) + `PR Checklist` link to canonical guideline | `coding-standards-context/references/guidelines.md` |
| 7 | **Key project structure pointers** — 5-10 short lines: most important files/dirs an agent should know about | Directory scan + Explore architecture map (entrypoints, routes, components, services, models, tests) | `Project Structure` | `docs/INDEX.md` (always; full map regenerated by Phase 7.5 / Quick Init step 9.5) |

> **Why these 7 and no more:** they cover *what the project IS* (1, 2), *what to do / not do* (3, 4, 6), *where the walls are* (5), and *where things live* (7). Anything beyond these is detail and belongs behind a link.

#### Package Manager and Commands (Auto-Detected, No Questions)

| Package Manager | Detect From | Install | Dev | Build | Test | Lint |
|-----------------|-------------|---------|-----|-------|------|------|
| pnpm | pnpm-lock.yaml | pnpm install | pnpm dev | pnpm build | pnpm test | pnpm lint |
| yarn | yarn.lock | yarn install | yarn dev | yarn build | yarn test | yarn lint |
| bun | bun.lockb | bun install | bun run dev | bun run build | bun test | bun run lint |
| npm | package-lock.json (default) | npm install | npm run dev | npm run build | npm test | npm run lint |

**File-scoped commands** (for `{{FILE_SCOPED_COMMANDS}}`): Generate from detected scripts, e.g. type-check one file, format one file, lint one file, run one test. Example: `{{PM}} run tsc --noEmit path/to/file.tsx`, `{{PM}} run prettier --write path/to/file.tsx`, `{{PM}} run lint path/to/file.tsx`, `{{PM}} run test path/to/file.test.tsx`.

---

### Phase 2: Per-Component Fields (3 fields per component, adaptive)

If nested components are detected, resolve these three fields for each the same way as the root ones: pre-fill from the Phase 4 artifact (`.opencode/project/analysis/<component>.json`) or the Quick Init explore report, write HIGH-confidence values silently, and prompt only for fields with no usable signal — all components batched into one prompt:

| # | Question | Purpose |
|---|----------|---------|
| 1 | **Component purpose** — What is the main responsibility of `{{path}}`? | Populates `COMPONENT_DESCRIPTION` |
| 2 | **Key patterns** — Any specific patterns or conventions to follow here? | Populates `PATTERNS_LIST` |
| 3 | **Additional setup** — Any setup steps beyond the root commands? | Appends to `SETUP_COMMANDS` |

---

## Component Type Detection

### Auto-Detection Logic

```
PACKAGE_MANAGER DETECTION:
1. Check pnpm-lock.yaml → pnpm
2. Check yarn.lock → yarn
3. Check bun.lockb → bun
4. Check package-lock.json → npm
5. Default → npm

FRONTEND DETECTION (any of):
- package.json contains: react, vue, angular, svelte, solid-js, preact
- Directory has: src/components/, src/pages/, src/app/
- Config files: vite.config.*, next.config.*, nuxt.config.*, angular.json

BACKEND DETECTION (any of):
- package.json contains: express, fastify, nest, hono, koa, hapi
- Directory has: src/routes/, src/api/, src/controllers/, src/services/
- Entry files: server.*, app.*, main.* with http/server imports

API DETECTION (any of):
- Directory named: api/, endpoints/, routes/
- Has OpenAPI/Swagger spec: openapi.yaml, swagger.json
- GraphQL schema: schema.graphql, *.graphql files

MONOREPO DETECTION (any of):
- Has packages/ directory with subdirectories
- Has apps/ directory with subdirectories
- Has libs/ or libraries/ directory
- Has pnpm-workspace.yaml or lerna.json or turbo.json

SHARED/COMMON DETECTION:
- Directory named: shared/, common/, lib/, utils/
- Is inside packages/ and has generic utility name
```

---

## Component Type Variants

Each component type has default values for placeholders:

### Variant: Root

```yaml
CONTEXT_LINE: "This file provides instructions for AI coding agents working on this project."
COMPONENT_TYPE: "root"
SECTIONS:
  - Project Overview: true
  - Setup Commands: true
  - Code Style: true
  - Testing Instructions: true
  - Project Structure: true
  - Security Considerations: true
  - Commit Guidelines: true
  - Nested Components: (if detected)
  - Additional Resources: true
```

### Variant: Frontend

```yaml
CONTEXT_LINE: "Frontend-specific instructions. Inherits from parent AGENTS.md."
COMPONENT_TYPE: "Frontend"
COMPONENT_SCOPE: "UI components, pages, styling, and client-side logic"
DEFAULT_PATTERNS:
  - "Use functional components with hooks (React) / Composition API (Vue)"
  - "Keep components small and focused (< 200 lines recommended)"
  - "Colocate tests with components (Component.test.tsx)"
  - "Use CSS modules or scoped styles for styling"
  - "Prefer named exports for components"
DEFAULT_CODE_STYLE:
  - "Follow component naming: PascalCase for components, camelCase for utilities"
  - "Props interface/type should be defined above component"
  - "Extract reusable logic into custom hooks"
DEFAULT_STRUCTURE: |
  ```
  ComponentName/
    index.tsx           # Re-export
    ComponentName.tsx   # Main implementation
    ComponentName.test.tsx  # Tests
    styles.module.css   # Scoped styles (optional)
    types.ts            # Component types (optional)
  ```
```

### Variant: Backend

```yaml
CONTEXT_LINE: "Backend-specific instructions. Inherits from parent AGENTS.md."
COMPONENT_TYPE: "Backend"
COMPONENT_SCOPE: "API endpoints, business logic, database operations, and server-side services"
DEFAULT_PATTERNS:
  - "Search for existing utilities, helpers, and services before creating new ones"
  - "Follow existing code patterns and naming conventions in the project"
  - "Follow REST conventions for API endpoints"
  - "Keep business logic in service layer, not in controllers"
  - "Use dependency injection where possible"
  - "Implement proper error handling with consistent error responses"
  - "Log important operations and errors"
DEFAULT_CODE_STYLE:
  - "Controllers handle HTTP, services handle business logic"
  - "Use DTOs for request/response validation"
  - "Keep database queries in repository layer"
  - "Match the existing coding style when adding to existing files"
DEFAULT_STRUCTURE: |
  ```
  src/
    routes/         # Route definitions
    controllers/    # Request handlers
    services/       # Business logic
    repositories/   # Database access
    models/         # Data models/entities
    middleware/     # Request middleware
    utils/          # Utility functions
  ```
INCLUDE_SECURITY: true
```

### Variant: API

```yaml
CONTEXT_LINE: "API-specific instructions. Inherits from parent AGENTS.md."
COMPONENT_TYPE: "API"
COMPONENT_SCOPE: "API endpoints, request/response handling, and external integrations"
DEFAULT_PATTERNS:
  - "Use consistent URL naming: plural nouns for resources (/users, /orders)"
  - "Return appropriate HTTP status codes"
  - "Validate all input before processing"
  - "Document endpoints with OpenAPI/Swagger comments"
  - "Implement rate limiting for public endpoints"
DEFAULT_CODE_STYLE:
  - "Use versioning in URLs (/api/v1/...)"
  - "Return consistent error response format"
  - "Include pagination for list endpoints"
INCLUDE_SECURITY: true
```

### Variant: Package (monorepo)

```yaml
CONTEXT_LINE: "Package-specific instructions for {{PACKAGE_NAME}}. Inherits from parent AGENTS.md."
COMPONENT_TYPE: "Package"
COMPONENT_SCOPE: "Reusable package/library within the monorepo"
DEFAULT_PATTERNS:
  - "Export public API through index.ts/index.js"
  - "Use semantic versioning for package versions"
  - "Document breaking changes in CHANGELOG"
  - "Keep dependencies minimal and explicit"
DEFAULT_CODE_STYLE:
  - "Prefer explicit exports over wildcard re-exports"
  - "Include TypeScript types for all exports"
  - "Write JSDoc comments for public APIs"
```

### Variant: Shared/Common

```yaml
CONTEXT_LINE: "Shared utilities and common code instructions. Inherits from parent AGENTS.md."
COMPONENT_TYPE: "Shared"
COMPONENT_SCOPE: "Shared utilities, types, constants, and helper functions"
DEFAULT_PATTERNS:
  - "Keep utilities pure and side-effect free"
  - "Write comprehensive tests for all utilities"
  - "Document function parameters and return types"
  - "Avoid dependencies on application-specific code"
DEFAULT_CODE_STYLE:
  - "Use descriptive function names that explain what they do"
  - "Group related utilities in subdirectories"
  - "Export types alongside implementations"
```

---

## Placeholder Resolution Table

| Placeholder | Resolution Priority |
|-------------|---------------------|
| `{{PROJECT_NAME}}` | 1. User input → 2. package.json name → 3. Directory name |
| `{{COMPONENT_DESCRIPTION}}` | 1. User input (Q1) → 2. package.json description → 3. Variant default. **≤ 240 chars in AGENTS.md.** Long form lives in README/Overview. |
| `{{DO_RULES}}` | 1. User input (Q3) → 2. Detected from deps/configs → 3. Variant DEFAULT_PATTERNS. **Always include:** "Search for existing code before creating new utilities/services", "Follow existing code patterns and naming conventions". **Always merge:** Canonical Agent Guidelines from coding-standards-context/SKILL.md. **Hard limit: 3-7 bullets, ≤ 1 line each.** Spillover goes to relevant `*-context/references/guidelines.md`. |
| `{{DONT_RULES}}` | 1. User input (Q4) → 2. Variant default anti-patterns. **Always include:** "Create new utility classes/functions when similar ones already exist", "Use different coding style than what exists in the same package/module". **Hard limit: 3-7 bullets, ≤ 1 line each.** Spillover → guidelines. |
| `{{ARCHITECTURE_TLDR}}` | 1. User input (Q2) → 2. Explore architecture summary → 3. Variant default ("Single-component {{COMPONENT_TYPE}} project; see directory layout."). **Hard limit: 3-7 lines.** Spillover for longer answers (in this priority): (a) append a `### Architecture` subheading to `Project Conventions` in this same AGENTS.md and place `→ See "Project Conventions → Architecture" below.` as the last line of this section; (b) **only if Phase 7 Part 3 already created** `docs/project/ARCHITECTURE.md` in the same `/initialize` run, the long content MAY go there instead and the link points to that file. The agent MUST NOT create `docs/project/ARCHITECTURE.md` solely to absorb spillover. |
| `{{CONSTRAINTS}}` | 1. User input (Q5) → 2. Explore-derived constraints (`engines`, `browserslist`, `tsconfig.target`, Docker base image, security configs) → 3. Default: `> _No hard constraints documented yet. Add perf budgets, runtime support, compliance, dependency rules here._`. **Hard limit: 3-7 bullets.** Spillover for longer answers (in this priority): (a) append a `### Constraints` subheading to `Project Conventions` in this same AGENTS.md; (b) infrastructure / runtime limits → `.opencode/skills/infrastructure-context/references/guidelines.md`; coding-rule constraints (deps allowlist, language target) → `.opencode/skills/coding-standards-context/references/guidelines.md`; (c) **only if Phase 7 Part 3 already created** `docs/project/STACK.md` in the same `/initialize` run, stack-rationale-style constraints MAY go there. The agent MUST NOT create `docs/project/STACK.md` solely to absorb spillover. |
| `{{FILE_SCOPED_COMMANDS}}` | Generated from package.json scripts + {{PM}}: tsc --noEmit, prettier --write, lint, test for single files |
| `{{PM}}` | npm / pnpm / yarn / bun (from lock file detection) |
| `{{PROJECT_STRUCTURE_MAP}}` | 1. User input (structure pointers) → 2. Directory scan (routes, components, api, theme) → 3. Variant default |
| `{{GOOD_BAD_EXAMPLES}}` | 1. User input → 2. Detected reference files (e.g. avoid X, prefer Y) |
| `{{API_DOCS_REF}}` | 1. User input → 2. Detected openapi.yaml, docs/api, client modules |
| `{{PR_CHECKLIST}}` | 1. User input → 2. Default: format/type check pass, tests green, small diff, no leftover logs |
| `{{CODE_STYLE_RULES}}` | 1. User input → 2. Variant defaults |
| `{{TESTING_INSTRUCTIONS}}` | 1. package.json test script → 2. User input → 3. Default (e.g. test-first for new features) |
| `{{STRUCTURE_DESCRIPTION}}` | 1. User input → 2. Directory scan → 3. Variant default |
| `{{PATTERNS_LIST}}` | 1. User input → 2. Variant defaults |
| `{{COMMIT_GUIDELINES}}` | 1. commitlint detection → 2. User input → 3. Conventional commits |
| `{{SECURITY_RULES}}` | Default security practices (always included for root, backend, api); the "Follow Security Compliance Skill" bullet is conditional on `.agents/skills/security-compliance/` existing (`nc-code-security-audit` package installed) |
| `{{NESTED_COMPONENTS_LIST}}` | Auto-generated from detected components |
| `{{PROJECT_CONVENTIONS}}` | **Root only.** Seed with the placeholder block: `> _No team-wide conventions documented yet. Add them under sub-headings such as "### Branching", "### Deployment", "### Environments", "### Security", or link to the relevant `references/guidelines.md` of a context skill._` Do **not** ask the user during init to populate it — it is intentionally empty for the team to fill in over time. If the user did supply project-wide conventions during the dialogue, append them here as `### {topic}` subsections instead of duplicating them in the `Do`/`Don't` blocks. |
| `{{GENERATION_MODE}}` | "Quick Init" or "Full Initialization" |
| `{{IF_QUICK_INIT}}` | Present footer "Run `/initialize` for comprehensive configuration" when generated via Quick Init |
| `Project Resource Map` block | **Hardcoded for root variant** — emit verbatim, no user input, no detection. Forward-references `docs/INDEX.md` (created in Phase 7.5 or Quick Init INDEX step). Generation MUST NOT skip it. |
| `Additional Resources` first bullet | **Hardcoded** — must be `docs/INDEX.md` link with label "Central documentation index". Other bullets follow in current order. |

---

## Security Rules Default

For root and components with `INCLUDE_SECURITY: true`:

```markdown
- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Store secrets in `.env` files (add to `.gitignore`)
{{IF_SECURITY_PACKAGE_INSTALLED:- Follow [Security Compliance Skill](.agents/skills/security-compliance/SKILL.md) for detailed practices}}
- Validate and sanitize all external input
- Use parameterized queries for database operations
```

> The `Security Compliance Skill` bullet is emitted only when `.agents/skills/security-compliance/` exists (i.e., the `nc-code-security-audit` package was installed) — otherwise this line is omitted and the security-check-before-listing rule below still applies to the remaining bullets.

---

## Commit Guidelines Default

```markdown
- Use conventional commits format: `type(scope): description`
  - Types: feat, fix, docs, style, refactor, test, chore
  - Scope: component or area affected
  - Description: imperative mood, lowercase, no period
- Keep commits atomic and focused on single change
- Reference issue numbers when applicable: `feat(auth): add login form (#123)`
- Write meaningful commit messages that explain "why" not just "what"
```

## PR Checklist Default

```markdown
- format and type check pass
- unit tests green
- diff small with a short summary
- no leftover logs or comments
```

---

## Generation Process

### For Quick Init or Full Initialization

1. **Detection Phase** (automatic, no user interaction):
   - **Subagent codebase analysis** — in full `/initialize` this is the Phase 4 `codebase-analyzer` artifacts (read them, do not re-scan); in `/quick-init` it is the Step 10 `explore` reply. Either way it enriches ALL subsequent detection and dialogue steps with comprehensive project understanding.
   - Detect package manager from lock files
   - Detect dev/build/test/lint commands from package.json scripts
   - Scan for monorepo patterns and frontend/backend/api components
   - Read package.json description and README for project description
   - **Merge the analysis findings** with shallow auto-detection results (analysis data takes priority for accuracy)
   - **Dynamically load Canonical Agent Guidelines** from coding-standards-context/SKILL.md

2. **Root Dialogue** (7 fields, 0–5 surfaced prompts, brevity-enforced — the block below is the prompt template; fields resolved with HIGH confidence are shown with their source and are not questions):
   ```
   📝 AGENTS.md Configuration (7 fields — only the ones I could not derive are asked)
   
   I'll create a SHORT AGENTS.md (entry point) plus link out to detailed
   guidelines.md / Project Conventions when answers run long (the 5-line rule).
   Fields I derived with HIGH confidence are listed with their source and need
   no answer; only the fields marked ? are surfaced (at most 5, all at once).
   
   1. Project description (≤ 240 chars):
      [Detected: "{{detected_description}}"]
      → press Enter to keep, or type a custom 1-2 sentence description.
   
   2. Architecture style — pick a label and add 1 line per major layer
      (e.g. "modular monolith; React SPA + NestJS API + Postgres + Redis"):
      [Explore default: "{{detected_architecture}}"]
      → press Enter to keep, or type custom.
      ⚠ If your answer is > 5 lines, I will summarize here and append the
        full version to "Project Conventions → ### Architecture" in this
        same AGENTS.md (always present, no extra files created). If a
        Phase 7 Part 3 trigger already produced docs/project/ARCHITECTURE.md
        in this run, the long version goes there instead.
   
   3. Do's — 3-7 short bullets (key libs, patterns, conventions to always use):
      [Detected from deps/configs: {{detected_dos}}]
      → press Enter to accept, or paste 3-7 bullets (or "skip: <reason>").
   
   4. Don'ts — 3-7 short bullets (anti-patterns, banned libs, deprecated paths):
      [Detected: {{detected_donts}}]
      → press Enter to accept, or paste 3-7 bullets.
   
   5. Constraints & Non-Goals — 3-7 bullets (perf budgets, browser/runtime
      support, compliance, dependency rules, legacy systems, out-of-scope):
      [Detected from engines/browserslist/Dockerfile/tsconfig: {{detected_constraints}}
       — or "[?]" if nothing inferable]
      → MUST provide a value (or "skip: <reason>"); Enter only valid if a
        non-empty default is shown.
      ⚠ Long-form constraints spill to "Project Conventions → ### Constraints"
        (always present), or to infrastructure-context / coding-standards-context
        guidelines.md when the limit is domain-specific. docs/project/STACK.md
        is used only if Phase 7 Part 3 already created it.
   
   6. Code style + commit format (1-2 lines):
      [Detected: {{detected_style}}]
      → press Enter to keep, or type custom.
   
   7. Project structure pointers — 5-10 key paths an agent should know:
      [Detected: {{detected_structure}}]
      → press Enter to keep, or paste your own list.
      ⚠ The full inventory will live in docs/INDEX.md regardless.
   ```
   
   **Mandatory checks before moving on:**
   - All 7 fields resolved — auto-accepted from a HIGH-confidence source (recorded as `auto-accepted from <source>`), answered by the user, or `skip: <reason>` where allowed. At most 5 prompts were surfaced; a field is never dropped silently, and a HIGH-confidence auto-fill is not a skip.
   - Each answer respects its hard limit; over-limit answers are split per the 5-line rule (short here, full in an **already-present** canonical channel — `Project Conventions` subheading or an active `*-context/guidelines.md`). The agent MUST NOT create `docs/project/*.md` files just to absorb spillover.
   - `Constraints & Non-Goals` is non-empty (either detected or user-supplied or `skip: <reason>`).

3. **Nested Components Dialogue** (if components detected):
   - Create nested AGENTS.md for each selected component; resolve purpose, key patterns and extra setup from the analysis artifacts (Phase 4 `<component>.json` or the explore report) and ask only the fields with no signal, batched. Use Do/Don't/Commands/Safety structure per variant.

4. **Generation** (automatic):
   - Load this template (Do, Don't, Architecture, Constraints, Commands, Safety, Project Structure, Good and Bad Examples, API Docs, PR Checklist, When Stuck, Testing)
   - Populate all placeholders; generate file-scoped commands from {{PM}} and scripts
   - Merge Canonical Agent Guidelines into Do rules
   - **Mandatory for root variant**: emit the `Project Resource Map (read first)` block verbatim at the top (right after the `> See https://agents.md` blockquote). The block is hardcoded — do NOT ask the user, do NOT skip. It guarantees every agent finds `docs/INDEX.md` on first scroll.
   - **Mandatory for root variant**: emit `Architecture (TL;DR)` and `Constraints & Non-Goals` sections, populated from Q2 and Q5. These two sections may not be empty — if the user could not answer, place the default blockquote (see placeholder table) so the gap is visible.
   - **Mandatory for root variant**: ensure the `Additional Resources` list starts with the `docs/INDEX.md` bullet (label "Central documentation index — start here").
   - **Apply the 5-line rule** for every answered question: anything beyond the per-section hard limit gets split — short summary stays here, full content is appended to the **already-present** canonical channel from the "Spillover target" column in the dialogue catalog (`Project Conventions` subheading or an active `*-context/references/guidelines.md`). The agent MUST NOT create `docs/project/*.md` files solely to absorb spillover; those files are generated only by Phase 7 Part 3 triggers, and only then are they an allowed spillover destination.
   - Write files to detected locations

> **Ordering contract**: AGENTS.md is generated in Phase 7 and references `docs/INDEX.md` as a forward link. `docs/INDEX.md` is then materialized in Phase 7.5 of the same `/initialize` run (or by Quick Init's minimal-INDEX step). The reference must always resolve when initialization completes — Phase 7.5 verifies this in its completion gate.

5. **Summary**: List created AGENTS.md files and remind user to update as project evolves.

---

## Related Documentation

- [agents.md](https://agents.md) - Official AGENTS.md standard
- [Quick Init](quick-init.md) - Quick Init workflow
- [quick-init.md](../../../commands/quick-init.md) - Quick Init command
- [Project Initialization Skill](../SKILL.md) - Full initialization
- [Documentation Module](documentation.md) - Full init documentation generation (Phase 7)
