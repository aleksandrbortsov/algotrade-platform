# Phase 6 - Part 2: Domain Skill Configuration

> **Step file.** Which context skills get configured, how their questions are generated from real findings rather than a fixed list, and the interactive flow that collects the answers.
>
> **Parent:** [configuration-updates.md](../configuration-updates.md) - Phase 6 router
> **Read first:** [overview.md](overview.md) - what Phase 6 produces, the render order, validation and completion actions
> **Previous step file:** [part-1-development-mdc.md](part-1-development-mdc.md) - development.md configuration
> **Next step file:** [api-analysis.md](api-analysis.md) - the API sub-analysis strategy

---

## Part 2: Domain Skill Configuration

Configure domain-specific skills by detecting applicable domains, asking context-aware questions, and writing structured configuration to each skill's `project-config.json`.

### Step 0 — Resolve detected domains to packages, BEFORE the first question

> **⚠️ Install before writing answers, never after. This step is time-critical and cannot be deferred to Part 3.5.**

Domain detection can surface a domain whose owning APM package was never installed — a Prisma schema when only `backend-developer` was selected, say. On this line every non-Core `*-context` skill arrives from APM and from nowhere else, so that domain has no `project-config.json` to write into and no `references/template.md` to render from.

Resolve it **now**, by package:

1. Run the detection table in [part-3-5-verification.md → detection → owning package](part-3-5-verification.md) over the Phase 4 artifacts and the repository.
2. For each detected domain whose `*-context` skill is absent from `.opencode/skills/`: **`/initialize`** adds the owning package to `apm.yml` and installs it now; **`/quick-init`** offers it and installs on acceptance.
3. If the user declines, or the package is unavailable — record the domain as an Open Gap with the detection evidence and the package name, and **remove it from `requiredContextSkills`**. A required entry no package can satisfy turns the Part 3.5 hard gate into a dead end.

Why the ordering is not negotiable: a `*-context` package ships its own pristine `project-config.json` (`initialized: false`) and no `guidelines.md`. APM has no interactive conflict resolution — `apm install` collects collisions into a summary and does **not** overwrite them without `--force` ([`APM_PACKAGES.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md) Q&A). Installing after Part 2 has filled the config therefore ends in a collision report instead of an updated skill, and forcing it would discard the user's answers. Part 3.5 verifies this step; it is not the place to perform it.

**Language:** Every string value written to `project-config.json` MUST be **English**. When synthesizing bullets from codebase analysis (Phase 4), **describe findings in English** even if comments or UI strings in the repo use another language. When recording user answers, **translate** non-English answers into English for storage; keep code symbols, paths, and brand names unchanged.

### Non-Developer Role Gate (BA / Upgrade)

Before domain detection, check if the user selected **only** non-developer roles (`ba`, `upgrade`, or any combination of those, with no developer roles like `frontend`, `backend`, `fullstack`, etc.):

```
If ALL selected roles are non-developer (`ba` and/or `upgrade`):

  Ask user:
  "You selected only non-developer role(s): [list of roles].

   Domain skills like Frontend, Backend, Database, API, Testing,
   Performance, Infrastructure are primarily for developer roles.

   - BA role works with requirements and impact analysis on top of an existing codebase.
   - Product Upgrade Engineer role runs migration pipelines on an already-configured project.

   Would you like to:
   1. Skip all developer domain configurations (recommended)
   2. Configure specific domains anyway (if you need code-level context)
   3. Select which domains to include

   Your choice:"

  If option 1 → Skip Part 2 entirely, set all domain project-config.json to initialized: false
  If option 2 → Proceed with standard domain detection below
  If option 3 → Show domain list, let user pick which to configure
```

If a non-developer role is combined with a developer role (e.g., "Backend Developer, BA" or "Backend Developer, Product Upgrade Engineer"), proceed with standard domain detection — the developer role triggers the relevant domains as normal.

### Domain Detection

Analyze data from previous phases to determine applicable domains:

| Domain | Detection Triggers | Priority |
|--------|-------------------|----------|
| **Frontend** | React, Vue, Angular, Svelte, Next.js, Nuxt, SvelteKit, Solid detected | High |
| **Backend** | Backend/Full-Stack role, server-side code, API routes, Express, NestJS, FastAPI | High |
| **Database** | ORM detected (Prisma, TypeORM, Drizzle), database configs, SQL files | High |
| **API** | REST/GraphQL endpoints, external integrations, SDK imports | Medium |
| **Testing** | Test frameworks in package.json (Vitest, Jest, Playwright), test files exist | Medium |
| **Performance** | Performance role, Frontend detected, Lighthouse configs, web-vitals package, bundle analyzer | Medium |
| **Infrastructure** | DevOps role, Dockerfile, CI/CD configs (.github/workflows, gitlab-ci) | Low-Medium |
| **Coding Standards** | Any programming language detected (Java, TypeScript, Python, Go, Kotlin, C#, etc.) | High |

### Domain Selection Flow

Present detected domains and offer selection:

```
📦 Domain Skill Configuration

Based on your project, I detected these domains:
[Table with Domain | Priority | Reason]

Options:
1. Configure all recommended (High priority only)
2. Configure all detected domains
3. Select manually (comma-separated: "1,2,4")
4. Skip optional domains (the Part 3.5 required set — role-required and detected domains — cannot be skipped)
```

---

## Dynamic Question Generation Strategy

### Core Principle

Instead of hardcoded questions, the agent MUST dynamically generate questions based on:

1. **Project context** — detected stack, existing patterns, project mode (NEW/EXISTING)
2. **Industry best practices** — use Context7 or research tool for current recommendations
3. **Common decision points** — focus on decisions that affect code structure

### Question Categories Per Domain

For each domain, the categories below are the **field catalogue**; Reflection Step 0 (further down) decides how many of them become questions — 0 when every required field is HIGH, otherwise 1–3:

#### Frontend

| Category | Purpose | Context Sources |
|----------|---------|-----------------|
| Organization | File/folder structure | Detected framework, existing structure |
| Naming | Component/file conventions | Existing codebase patterns, framework standards |
| State | State management approach | Detected state library, complexity level |
| Performance | Core Web Vitals targets | Phase 5 Part 3 values (defaults or repo configs) — never asked here |

**Dynamic option examples:**
- If React detected → offer Feature-based, Atomic, Type-based structures
- If Vue detected → offer Composition API patterns, Options API legacy
- If state library detected → offer patterns specific to that library

#### Backend

| Category | Purpose | Context Sources |
|----------|---------|-----------------|
| Architecture | Layers/patterns | Project size, team roles, existing structure |
| Runtime | Framework specifics | Detected backend framework |
| Error handling | Error strategy | Existing error patterns, API style |
| Authentication | Auth method | Security requirements, integrations |

**Dynamic option examples:**
- If NestJS detected → offer Module-based, Clean Architecture, CQRS
- If Express detected → offer MVC, Service layer, Middleware patterns
- If Python detected → offer FastAPI patterns, Django conventions

#### Database

| Category | Purpose | Context Sources |
|----------|---------|-----------------|
| Naming | Table/column conventions | Existing schema, ORM defaults |
| Migrations | Migration strategy | Detected ORM, CI/CD setup |
| Relationships | Loading strategy | Project complexity, performance needs |
| Audit/Soft-delete | Data retention | Compliance requirements |

**Dynamic option examples:**
- If Prisma detected → offer Prisma-specific migration and schema patterns
- If TypeORM detected → offer TypeORM decorators and relations patterns
- If raw SQL detected → offer manual migration strategies

#### API

| Category | Purpose | Context Sources |
|----------|---------|-----------------|
| Style | REST/GraphQL/tRPC | Detected API patterns, backend choice |
| Versioning | Version strategy | Project maturity, client requirements |
| Response format | Envelope structure | Existing responses, integration needs |
| Documentation sources | Confirmed specs/docs from Phase 5 | `api-context/project-config.json.references` + Supplemental Source Manifest row "API specifications" |
| Auto-discovery | Scan routes, controllers, SDKs | Codebase scanning if no specs confirmed |

**IMPORTANT: Use API documentation pointers from authoritative artifacts**

During Phase 5 (Part 1.5), the user was asked to confirm/correct API documentation discovered in Phase 4 and to provide additional resource pointers. This information is persisted into `.agents/skills/api-context/project-config.json` (`references.specifications[]`, `references.codeLocations[]`, `references.databaseSchemas[]`, `references.testSources[]`, `references.externalDocs[]`) and mirrored in `.opencode/project_init.md → ## Supplemental Source Manifest` (rows: API specifications, Endpoint analysis, Database schema files, API test files).

**When configuring the API domain skill:**

1. **Read `.agents/skills/api-context/project-config.json.references`** first (authoritative). Cross-check the `Supplemental Source Manifest` rows in `.opencode/project_init.md` to confirm pointers are current and to discover any extra sources captured under other domains.
2. **If primary API specs exist** (OpenAPI, GraphQL schema, Protobuf, etc.):
   - Parse the specification to extract endpoints, methods, request/response schemas
   - Use as the primary source for the API skill's endpoints registry
   - Extract external integrations from the spec if available
3. **If user provided additional resource paths:**
   - Read the specified files/directories to gather API structure information
   - Extract route definitions, controller annotations, type definitions
   - Use to supplement or validate spec-derived information
4. **If user provided external URLs:**
   - Note them in the API skill's configuration for human reference
   - These cannot be auto-parsed but serve as authoritative references
5. **If no specs found and no resources provided:**
   - Fall back to Auto-Discovery (scan codebase for routes, SDKs, API URLs)

**Auto-Discovery Fallback** — Only if no API documentation was confirmed in Phase 5:
- Route definitions (patterns based on detected framework)
- SDK imports (Stripe, SendGrid, AWS, etc.)
- External API URLs

#### Testing

| Category | Purpose | Context Sources |
|----------|---------|-----------------|
| Organization | Test file location | Framework defaults, existing tests |
| Coverage | Minimum thresholds | Project criticality, CI requirements |
| Mocking | Mock strategy | Test framework, architecture pattern |
| E2E scope | Test coverage level | Project size, critical paths |

**Dynamic option examples:**
- If Vitest detected → offer vi.mock patterns, co-located tests
- If Jest detected → offer jest.mock, __mocks__ directories
- If Playwright detected → offer page object patterns, fixtures

#### Infrastructure

| Category | Purpose | Context Sources |
|----------|---------|-----------------|
| Cloud/Hosting | Platform choice | Existing configs, deployment files |
| CI/CD | Pipeline platform | .github/gitlab-ci/etc detected |
| Deployment | Release strategy | Team size, risk tolerance |
| Monitoring | Observability stack | Existing integrations, cloud platform |

**Dynamic option examples:**
- If GitHub Actions detected → offer workflow optimization patterns
- If Docker detected → offer multi-stage builds, compose patterns
- If Vercel/Netlify detected → offer edge function patterns

#### Performance

> Filled from Phase 5 Part 3 (repo configs, or the industry defaults recorded as `auto-filled — default`). Reflection Step 0 scores those fields HIGH, so this domain is configured silently unless the `performance` role was selected or a repository config contradicts the recorded values.

| Category | Purpose | Context Sources |
|----------|---------|-----------------|
| Core Web Vitals | Target metrics (LCP, FID, CLS, INP) | Frontend framework, project type |
| Bundle budgets | Size limits for JS/CSS | Build tool, existing bundle analysis |
| Monitoring | RUM and synthetic monitoring tools | Existing integrations, cloud platform |
| CI/CD checks | Performance regression prevention | CI tool detected, Lighthouse CI |
| Optimization focus | Critical rendering path, images, caching | Project complexity, target audience |

**Dynamic option examples:**
- If Next.js/Nuxt detected → offer ISR/SSG patterns, Image optimization
- If Webpack detected → offer bundle splitting, tree-shaking strategies
- If Vite detected → offer chunk strategies, preload directives
- If Lighthouse CI detected → offer budget configurations, assertion presets
- If web-vitals package detected → offer RUM integration patterns

#### Coding Standards

> **Dynamic Question Generation:** Questions are NOT hardcoded per language. The agent MUST dynamically generate 0–3 questions (the Reflection Step 0 budget) based on the detected language, framework, existing codebase patterns, and industry best practices (via Context7 or research). The TDD policy fields of this domain are listed in [part-3-guidelines.md → TDD policy fields](part-3-guidelines.md): one question, the rest derived or defaulted.

**Question categories** (agent selects relevant ones per detected stack):

| Category | Purpose | When Relevant |
|----------|---------|---------------|
| Dependency management | DI/import patterns for new vs existing code | Frameworks with DI (Spring, NestJS, Angular, etc.) |
| Documentation convention | Doc format, required coverage, per-layer rules | Always |
| Naming conventions | Class/function/variable/file naming patterns | Always |
| Code organization | Annotation/decorator order, field ordering, module structure | Frameworks with decorators/annotations |
| Error handling | Exception hierarchy, error types, error response patterns | Always |
| Type system | Strictness level, type hint requirements | Languages with optional typing (TS, Python, etc.) |

**Dynamic option examples** (generated based on detected stack, not static):
- If Java + Spring detected → offer DI patterns (Lombok constructor vs field injection), JavaDoc strategies, Spring naming conventions
- If TypeScript + NestJS detected → offer decorator patterns, TSDoc vs Swagger, module organization
- If Python + FastAPI detected → offer Pydantic patterns, Google vs NumPy docstrings, type hint strictness
- If Go detected → offer comment conventions, interface patterns, error handling idioms
- If Kotlin + Spring detected → offer data class patterns, coroutine conventions, KDoc format
- If EXISTING_PROJECT → analyze 5-10 representative files to detect current conventions and offer "keep current" as default option

---

## Interactive Configuration Flow

### Universal Question Flow

For EACH selected domain, use this unified flow:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{EMOJI} {Domain Name} Skill Configuration ({N}/{Total})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Detected from your project:**
- {Framework}: {Version}
- {Library}: {Detected}
- {Pattern}: {Existing if EXISTING_PROJECT}

**Configuration questions:**

1. {Category 1 question - dynamically generated}
   - [A] {Option based on detected stack} (recommended)
   - [B] {Alternative option}
   - [C] {Another alternative}
   - [D] Custom (describe below)
   
   Your choice [{default}]:

2. {Category 2 question}
   ...

{0–3 questions total, dynamically generated — Reflection Step 0 budget}

**Additional patterns (optional):**
Describe any specific patterns or requirements:
_________________________________

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Configuration Preview:
{Brief summary of what will be written to project-config.json}

Apply this configuration?
1. Yes, apply as shown
2. Yes, but let me edit first
3. Skip this domain
4. Back to domain selection

Your choice:
```

### Question Generation Rules

The agent MUST:

1. **Run Reflection Step 0 (per domain)** — see "Reflection Step 0: Per-Domain Confidence Scoring" below. This step computes confidence per domain from Phase 4 + Phase 5 data and decides how many configuration questions to ask (0–3 max). Skip Steps 2–8 entirely for domains that score HIGH on every required field.
2. **Analyze context first** — Read stack config from Phase 3, examine existing patterns
3. **Detect gaps and contradictions** — Before generating questions, review all available information for missing critical data, conflicting patterns, or ambiguous findings (see Gap & Contradiction Detection below)
4. **Generate relevant options** — Options must match detected technologies
5. **Set smart defaults** — Default = best practice for detected stack
6. **Keep it concise** — Max 3 questions per domain, clarifications included. Reflection Step 0 may push this to 0.
7. **Allow custom input** — Always include "Custom" option
8. **Show preview** — Summarize what will be written before confirmation; domains that scored HIGH on every field (0 questions) are previewed **together** in one consolidated confirmation, not one prompt per domain
9. **Request references when uncertain** — If detected information is incomplete, ask the user to provide file paths, URLs, or documentation links

### Reflection Step 0: Per-Domain Confidence Scoring (MANDATORY before any domain question)

> Implements the Phase 6 portion of the Phase Reflection Checkpoint defined in [SKILL.md](../../SKILL.md). The agent MUST run this step for EVERY configured domain before asking any configuration question.

**Algorithm (per domain):**

```
For domain D in {frontend, backend, database, api, testing, infrastructure, performance, coding-standards}:
  required_fields = required_fields_for(D)         // see table below
  evidence        = collect_evidence(D, phase4, phase5)

  Score each required_field:
    HIGH    — confirmed by ≥2 independent signals (Phase 4 §X + Phase 5 round Y)
    MEDIUM  — confirmed by exactly 1 signal
    LOW     — no signal, must ask

  Decide question count:
    all HIGH                 → 0 questions     (auto-fill project-config.json silently)
    1–2 fields MEDIUM/LOW    → ask only those (1 question per gap; max 3 total)
    ≥3 fields LOW            → ask the 3 highest-impact (never ask all)

  Generate name-referencing questions:
    Each question MUST cite concrete names from Phase 4 (modules, entities, endpoints, SDKs)
    where the gap exists. Generic "what framework?" is forbidden when Phase 3 already detected one.
```

**Required-fields-per-domain map:**

| Domain | Required fields | Phase 4 / Phase 5 evidence sources |
|--------|-----------------|------------------------------------|
| **frontend-context** | framework, build tool, styling, state management, component organization, naming convention | Phase 4 §4 deps, §6 patterns, §3 architecture; Phase 5 Part 3 |
| **backend-context** | framework, runtime, layered structure (services/controllers), DI approach, error handling | Phase 4 §3, §6, §8 modules; Phase 5 Part 2 R1 |
| **database-context** | DB engine, ORM/driver, migration strategy, top entities, indexing strategy | Phase 4 §4 deps, §9 entities, §11 integrations |
| **api-context** | spec format (OpenAPI / GraphQL / gRPC / none), endpoint groups, versioning policy, auth flow, rate limiting | Phase 4 §7, §10; Phase 5 Part 1.5 |
| **testing-context** | unit framework, e2e framework, coverage target, test organization | Phase 4 §5; Phase 5 (no dedicated round — usually low evidence) |
| **infrastructure-context** | container runtime, orchestrator, CI/CD, cloud provider, environments | Phase 4 §4 deps + repo files; Phase 5 Part 2 R3 |
| **performance-context** | Core Web Vitals targets, bundle budget, monitoring tool, lighthouse target | Phase 5 Part 3 — the defaults or repo-config values it wrote count as HIGH; without the `performance` role these fields never trigger a question |
| **coding-standards-context** | naming convention, lint config, formatter, type system strictness | Phase 4 §5 quality |

**Examples — Reflection Step 0 in action (concrete projects):**

```
Project: SaaS billing platform (EXISTING_PROJECT, role: backend-developer)
Phase 4 §4: prisma, postgresql; §9: Tenant, Subscription, Invoice, Payment;
            §11: stripe, sendgrid; §3: modular monolith.

backend-context Reflection Step 0:
  framework        — NestJS (HIGH, from package.json + folder structure)
  runtime          — Node 20 (HIGH, from .nvmrc + tsconfig)
  layered structure — controllers/services/repositories (HIGH, from §3+§6)
  DI approach      — NestJS native DI (HIGH, inferred from framework)
  error handling   — global exception filter detected? UNCLEAR (LOW)
  → Ask 1 question only: error-handling pattern, with options
    referencing the actual files seen.

database-context Reflection Step 0:
  DB engine        — PostgreSQL (HIGH)
  ORM              — Prisma (HIGH)
  migration strategy — Prisma migrate (HIGH)
  top entities     — Tenant/Subscription/Invoice/Payment (HIGH from §9)
  indexing strategy — UNCLEAR, no @@index in schema (MEDIUM)
  → Ask 1 question only: indexing strategy for high-volume tables
    Invoice, Payment.
```

### Gap & Contradiction Detection (Per Domain)

> **Follows the Proactive Clarification Principle** defined in [SKILL.md](../../SKILL.md).

Before generating configuration questions for each domain, the agent MUST review all collected data (Phase 3 stack, Phase 4 analysis, Phase 5 requirements, user clarifications) and identify:

| Detection Type | What to Look For | Action |
|---------------|------------------|--------|
| **Missing critical info** | Domain selected but no patterns detected from code (e.g., Testing domain selected but no test files found) | Ask what testing approach is planned, request reference to test strategy |
| **Contradictory patterns** | Two conflicting approaches in same domain (e.g., both REST controllers and GraphQL resolvers; both Jest and Vitest configs) | Present both, ask which is primary/canonical |
| **Incomplete coverage** | Some areas well-documented but others empty (e.g., API endpoints exist but no error handling pattern detected) | Ask about the gap specifically |
| **Stale or outdated** | Config files reference deprecated packages, patterns don't match framework version | Highlight and ask if update is planned |
| **Implicit knowledge** | Patterns detected but rationale unclear (e.g., custom auth middleware but no documentation on auth flow) | Ask user to describe the intent |

**Per-domain gap examples (questions MUST cite real names from Phase 4 §§8–11):**

> Replace `{module}`, `{Entity}`, `{endpoint_group}`, `{sdk}` with actual values pulled from Phase 4 outputs — i.e. the Q-blocks under `## User Answers & Decision Log → ### Phase 4 — Codebase Analysis (EXISTING_PROJECT)` and the per-domain `project-config.json` fields they cite (e.g. `database-context.entities`, `api-context.endpoints`, `api-context.externalIntegrations`, `backend-context.businessModules`). The question phrasing here is a template — never ship the literal placeholders to the user.

| Domain | Common Gaps | Name-referencing Clarification Questions |
|--------|------------|------------------------------------------|
| **Frontend** | Component library detected but design system not documented | "I found `shadcn/ui` used in `src/components/ui/` and your top features are `{module_a}`, `{module_b}`. Do you have a design system / Figma reference I should link from frontend-context?" |
| **Backend** | Service layer exists but DI / error-handling pattern unclear | "Modules `{module_a}`, `{module_b}` use services in `src/services/{...}`. How are dependencies wired (NestJS DI / Inversify / manual factories)? Where is the global error handler?" |
| **API** | Endpoints found but versioning / auth flow not fully traceable | "I found `{N1}` endpoints under `{endpoint_group_v1}` and `{N2}` under `{endpoint_group_v2}`, plus JWT middleware in `{file}`. Which version is canonical, and where is the auth issuer / verifier configured?" |
| **Database** | ORM config exists but migration strategy or indexing unclear | "Prisma schema lists `{Entity1}`, `{Entity2}`, `{Entity3}` — what's the migration strategy (squash on prod / forward-only / blue-green), and which tables need composite indexes for the high-volume queries in `{module}`?" |
| **Testing** | Test framework configured but coverage / strategy unclear | "Vitest is configured; I found `{N}` test files for `{module_a}` but 0 for `{module_b}`/`{module_c}`. Is `{module_b}` covered by integration tests elsewhere, or is this a known gap?" |
| **Infrastructure** | Dockerfile exists but deployment target / env split unclear | "I found a `Dockerfile` and `{ci_file}` workflow. Which environments (dev/stg/prod) does it target, and where do `{sdk_a}`/`{sdk_b}` integrations differ between envs?" |
| **Performance** | No performance monitoring detected in a user-facing app | "This is a user-facing frontend app with `{module_a}` and `{module_b}` exposed publicly, but I didn't find any RUM tool wired in. Are Core Web Vitals tracked elsewhere (e.g., via `{cdn}` analytics)?" |
| **Coding Standards** | Mixed naming conventions across modules | "I found PascalCase in `src/components/` but camelCase in `src/{module_a}/`. Is this intentional (component vs domain code split) or should there be a unified convention enforced by ESLint?" |

### Clarification Flow Within Domain Configuration

When gaps or contradictions are detected for a domain, insert clarification questions **before** the standard configuration questions:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{EMOJI} {Domain Name} Skill Configuration ({N}/{Total})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Detected from your project:**
- {Framework}: {Version}
- {Library}: {Detected}
- {Pattern}: {Existing if EXISTING_PROJECT}

{If gaps or contradictions exist for this domain:}

🔍 **Clarification needed before configuration:**

{N}. {Specific question about gap/contradiction}
   What I found: {detected information}
   What's unclear: {the gap or contradiction}
   
   - [A] {Direct answer option}
   - [B] See reference at: _____________  (file path or URL)
   - [C] Skip / will be decided later

{After clarifications are resolved, proceed with standard questions:}

**Configuration questions:**
...
```

### Configuration Output

For each confirmed domain:

1. Read `<skills-root>/<domain>-context/references/template.md` for the domain's universal structure
2. Map user answers to `project-config.json` fields
3. Write to `<skills-root>/<domain>-context/project-config.json`:
   - Set `"initialized": true`
   - Set `"timestamp"` to current ISO timestamp
   - Fill all relevant fields with user answers
   - Store additional patterns in `"patterns"` array
   - Store conventions in `"conventions"` array
   - Store constraints in `"constraints"` array
   - Add any notes to `"projectSpecificNotes"`

**Example output** (frontend-context):
```json
{
  "initialized": true,
  "timestamp": "2026-03-24T14:30:00Z",
  "framework": "React",
  "version": "19.0",
  "buildTool": "Vite",
  "styling": "Tailwind CSS",
  "stateManagement": "Zustand",
  "componentLibrary": "shadcn/ui",
  "routing": "React Router v7",
  "configuration": {
    "componentOrganization": "Feature-based",
    "namingConvention": "PascalCase components, camelCase hooks",
    "webVitals": { "lcp": "2.5s", "fid": "100ms", "cls": "0.1" }
  },
  "patterns": ["Feature-based folder structure", "Co-located tests"],
  "conventions": ["PascalCase for components", "use* prefix for hooks"],
  "constraints": ["No barrel exports", "Max 300 LOC per component"],
  "projectSpecificNotes": "Uses shadcn/ui with custom theme"
}
```
