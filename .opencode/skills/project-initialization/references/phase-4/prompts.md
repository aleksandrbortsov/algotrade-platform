# Phase 4 - Research Questions

> **Step file.** The scoped prompt templates per component kind, the 11-section whole-repository prompt, and the reference material behind each analysis area. These supply block 3 (RESEARCH QUESTIONS) of the brief defined in [subagent-contract.md](../subagent-contract.md).
>
> **Parent:** [codebase-analysis.md](../codebase-analysis.md) - Phase 4 router
> **Previous step file:** [dispatch.md](dispatch.md) - component detection and wave launch
> **Next step file:** [merge-and-persist.md](merge-and-persist.md) - turning artifacts into domain configs
> **BA-only run:** [ba-mode.md](ba-mode.md) replaces the prompts below

---

### Scoped Prompt Templates (per component kind)

The per-component prompts are **subsets** of the standard 11-section prompt below, focused on the component's role. The main agent MUST emit the sections marked REQUIRED for the component kind and SHOULD emit the OPTIONAL ones if relevant.

| Component kind | REQUIRED sections (from the 11-section list) | OPTIONAL sections | Extra component-specific section |
|---|---|---|---|
| `frontend` | 1 (entry points), 2 (folder structure), 3 (architecture pattern), 4 (deps), 6 (code patterns), 8 (business modules / feature areas) | 5 (code quality), 7 (API consumption — what backends are called) | "Routes & page tree" + "Design system / component library inventory" |
| `backend` | 1, 2, 3, 4, 5, 6, 7 (API specs), 9 (entities), 10 (endpoint groups), 11 (named integrations) | 8 (business modules — usually maps 1:1 to top-level service folders) | "Persistence layer (DB drivers, ORMs, schemas)" |
| `mobile` | 1, 2, 3, 4, 6, 8 | 5, 11 | "Native modules / platform-specific code (iOS / Android / Expo)" + "Screen tree" |
| `infra` | (none of the 11 standard sections) | — | "Containers (Dockerfile inventory)" + "Orchestration (k8s manifests / Helm charts / Terraform modules)" + "CI pipelines (workflow files + triggers)" + "Deploy targets (envs, ingresses, secrets management)" |
| `library` | 1, 2, 3, 4, 6 | 5 | "Public API surface (exported symbols / barrel files)" + "Internal consumers (which other components import this)" |
| `mixed` | All 11 sections (use the standard prompt below, scoped to the component path) | — | — |

When emitting a scoped prompt, prepend this preamble to the standard 11-section prompt body:

```
SCOPE RESTRICTION: limit your analysis to the directory `<component.path>` and its subdirectories.
Treat siblings outside that path as opaque — do NOT walk into them, but DO note imports / API
calls that cross into them as "cross-component dependencies" with the target path only.

This component is classified as kind=`<component.kind>`. Optimise depth for that kind:
<short reminder of REQUIRED sections from the table above>.

For the component-specific section(s) listed below, return concrete names and counts, not generic phrasing.
```

For `infra` components, replace the 11-section body with a dedicated infra-only prompt:

```
Perform a thorough infrastructure-only analysis of `<component.path>`. Return:

## A. Containers
- For every Dockerfile / Containerfile: image base, build stages, exposed ports, entrypoint, build args
- docker-compose / Tilt / DevContainer manifests: services, networks, volumes

## B. Orchestration
- Kubernetes manifests grouped by Kind (Deployment / StatefulSet / Service / Ingress / ConfigMap / Secret / CronJob)
- Helm charts: chart name, values.yaml top-level keys, environments overlay (values-*.yaml)
- Terraform modules: providers, top-level resources, remote state backend
- Pulumi / CDK / other IaC: language, top-level stacks

## C. CI / CD
- Pipeline files (.github/workflows/*, .gitlab-ci.yml, Jenkinsfile, azure-pipelines.yml, .circleci/, .drone.yml)
- For each: triggers (push / PR / schedule / manual), top-level jobs, deploy targets, environments touched
- Secrets / OIDC providers referenced by name only (not value)

## D. Environments & Deploy targets
- Distinct environments referenced by name (dev / staging / prod / etc.)
- Ingress / routing rules per environment
- Secrets management (Vault, SOPS, Sealed Secrets, cloud KMS)

## E. Observability hooks
- Sentry / Datadog / New Relic / OpenTelemetry / Prometheus / Grafana configs found in this component
- Log shipping (Fluentd / Vector / Loki) configured at infra level

Return concrete names and counts. No generic phrasing.
```

---

### How Delegation Works (single-component path — fallback)

When component count == 1, the main initialization agent uses the single-subagent flow — same contract, one component:

1. **Seed `index.json`** with the single component (Step 0 above still applies; the component is usually named after the repository, with `path: "."` and `kind: "mixed"`).
2. **Formulate the brief** — the seven blocks from [`subagent-contract.md`](../subagent-contract.md) wrapping the 11-section template below (no scoping preamble). Budget: 100 files for a whole-repo `mixed` component.
3. **Dispatch as a blocking call** (never `background: true`) — the main agent waits until the subagent completes.
4. **Merge the summary** into `index.json`, then run `validate-analysis.js` exactly as in Step 3 of the fan-out.
5. **Process the artifact** — read `<component>.json`, format, present to user, and populate per-domain `project-config.json` + the Decision Log.

### Analyzer Subagent Invocation

The main agent MUST use the `Task` tool with `subagent_type: "codebase-analyzer"`:

```
Task tool call:
  subagent_type: "codebase-analyzer"
  description: "Deep codebase analysis for initialization"   # or e.g. "Analyze frontend/ (Angular UI)"
  prompt: [Seven-block brief wrapping the scoped prompt for fan-out — OR — the full
           11-section prompt for single-component]
```

**IMPORTANT:**
- Never pass `background: true` — the main agent must wait for results.
- The `Task` tool has **no read-only parameter** and none is needed: `codebase-analyzer.md` carries a `permission` block that confines writes to the two report artifacts; the brief's CONSTRAINT block restates it. See [`subagent-contract.md`](../subagent-contract.md) §2.
- The subagent does NOT have access to the main conversation — include ALL necessary context in the prompt.
- Request thoroughness level: **"very thorough"** for comprehensive initialization analysis.
- For fan-out: emit ALL `Task` calls in a single tool-call message so they run in parallel.

### Analyzer Prompt Template (11 sections, single-component path)

The main initialization agent MUST send a prompt following this structure:

```
Perform a very thorough codebase analysis of this repository for project initialization.
The project workspace is at: [WORKSPACE_PATH]

Analyze the following aspects and return a structured report:

## 1. Entry Points
Find and document all main entry points:
- index.html, index.tsx/ts, main.tsx/ts (SPA entries)
- App.tsx, App.vue, App.svelte (root components)
- server.js, server.ts (backend entries)
- Check package.json for "main", "module", "browser" fields and scripts.start

## 2. Folder Structure
Recursively scan the source directories (src/, app/, lib/) and map:
- Component directories (components/, pages/, views/, routes/, layouts/)
- Logic & state (utils/, helpers/, services/, api/, hooks/, composables/, store/)
- Configuration (config/, constants/, types/, interfaces/)
- Testing (tests/, __tests__/, *.test.*, *.spec.*)
- Assets (assets/, public/, styles/, css/, images/)
Include file counts per directory.

## 3. Architecture Pattern
Classify the architecture based on folder structure and code organization:
- Feature-Sliced Design (features/, shared/, entities/, widgets/)
- Atomic Design (atoms/, molecules/, organisms/, templates/)
- Modular Architecture (modules/[name]/*)
- Page-Based Structure (pages/ or routes/ with flat components)
- Flat/Monolithic (mixed files, no clear pattern)
Provide rationale for the classification.

## 4. Dependencies Analysis
Read package.json (or equivalent) and categorize all dependencies:
- Framework (React, Vue, Angular, Svelte, Next, Nuxt, etc.)
- Build tool (Vite, Webpack, Rollup, esbuild, etc.)
- State management (Redux, Zustand, Jotai, Pinia, etc.)
- Styling (Tailwind, Styled Components, Emotion, Sass, etc.)
- Routing (React Router, Vue Router, etc.)
- UI libraries (MUI, Ant Design, Chakra, Radix, etc.)
- Testing (Vitest, Jest, Playwright, Cypress, etc.)
- Forms (React Hook Form, Formik, etc.)
- Data fetching (Axios, React Query, SWR, Apollo, tRPC, etc.)
- Utilities (Lodash, date-fns, Zod, etc.)
Note version numbers. Flag significantly outdated packages.

## 5. Code Quality Assessment
Check for and report on:
- Linting: .eslintrc.*, eslint.config.*, biome.json
- Formatting: .prettierrc.*, .editorconfig
- Testing: count test files, calculate test-to-source ratio, check for coverage config
- Documentation: README.md quality, CONTRIBUTING.md, docs/ directory, JSDoc comments
- TypeScript: tsconfig.json settings, strict mode, 'any' usage frequency, type coverage

## 6. Code Patterns (scan actual source files)
Detect patterns used in the codebase:
- Component patterns (functional vs class, HOC, render props, composition)
- State management patterns (what libraries and how they're used)
- API integration patterns (REST, GraphQL, tRPC, WebSocket)
- Routing patterns (file-based vs component-based, lazy loading)
- Error handling patterns

## 7. API Documentation & Specifications Discovery
Search for existing API documentation, specifications, and contracts in the repository:
- OpenAPI/Swagger files (openapi.yaml, openapi.json, swagger.yaml, swagger.json, *.openapi.*)
- API Blueprint files (*.apib)
- GraphQL schema files (*.graphql, schema.graphql, schema.gql)
- Protobuf/gRPC definitions (*.proto)
- Postman collections (*.postman_collection.json)
- Insomnia exports (insomnia*.json, insomnia*.yaml)
- API documentation directories (docs/api/, api-docs/, swagger/, openapi/)
- README sections with API descriptions (search for "## API", "## Endpoints", "## REST")
- Route/controller files with JSDoc/TSDoc annotations describing endpoints
- TypeScript type definitions that describe API contracts (types/api.ts, interfaces/api.ts)
- Any files with "api-spec", "api-doc", "api-schema" in the name

For each found document/specification:
- Record the file path and type (OpenAPI, GraphQL schema, Protobuf, documentation, etc.)
- Note the apparent completeness (full spec vs partial/outdated)
- Note the API version if specified

## 8. Business Modules (REQUIRED — name + purpose)
Identify the main BUSINESS-domain modules of the codebase, not infrastructure folders.
- Scan top-level directories under src/, app/, lib/, packages/*/src for domain groupings
  (typical names: billing/, payments/, invoices/, pricing/, subscriptions/, tenants/,
   users/, auth/, notifications/, inventory/, orders/, catalog/, search/, reports/,
   analytics/, integrations/, webhooks/)
- For EACH module found, return:
    - folder path
    - one-line guess at business purpose (derived from contained file names + readme + tests)
    - apparent dependencies on other business modules (cross-module imports)
- DO NOT list build/config/dist/node_modules/coverage etc.
- Output as a markdown table: | Module | Path | Likely purpose | Cross-module deps |

## 9. Top Entities / Aggregates (REQUIRED — top 5–10)
List the most important domain entities (NOT generic DTOs).
- Sources: Prisma schema, TypeORM entities, Sequelize/Mongoose models, SQL migrations,
  domain classes/interfaces, GraphQL types, Pydantic models, Java JPA entities, etc.
- For each entity return: name, primary fields (3–5), foreign-key relations to other entities,
  the file/path it lives in.
- Output as a markdown table: | Entity | Key fields | Relations | Source file |

## 10. Top Endpoint Groups (REQUIRED — grouped, not flat)
Produce a high-level endpoint inventory.
- Group endpoints by resource/version (e.g., `/api/v2/payments/*`, `/api/v1/users/*`).
- For each group: number of endpoints, methods used (GET/POST/PUT/DELETE/PATCH),
  one-line purpose, auth required (yes/no/unknown).
- Detect API versions in the URL (`/v1/`, `/v2/`) and report counts per version.
- Output as a markdown table: | Group | Count | Methods | Purpose | Auth | Version |

## 11. Named External Integrations (REQUIRED — concrete SDK / endpoint names)
List THIRD-PARTY integrations with the EXACT package or service name (no generic phrasing).
- Sources: package.json dependencies, import statements, env-var names, config files.
- Examples: `stripe`, `@stripe/stripe-js`, `auth0-js`, `@aws-sdk/client-s3`,
  `firebase-admin`, `twilio`, `sendgrid`, `@sentry/node`, `datadog`, `kafkajs`, `bullmq`.
- For each integration return: package/service name, where it is used (file/folder),
  one-line apparent purpose (payments, auth, storage, email, SMS, monitoring, queue, etc.).
- Flag compliance hints visible from this list (Stripe → PCI DSS likely; Auth0 + EU data → GDPR likely;
  health-related names → HIPAA likely).
- Output as a markdown table: | Integration | Package | Used in | Purpose | Compliance hint |

Return your analysis as a single structured report with clear sections and markdown formatting.
Include a final "Recommendations" section with prioritized improvement suggestions.
The business-oriented sections (8, 9, 10, 11) are REQUIRED — do not omit them. They are
the primary inputs for the Phase 4 Reflection Checkpoint and Phase 5 / Phase 6 question
adaptation.
```

---

### Processing the analyzer artifacts

After the wave returns, the main initialization agent MUST:

1. **Validate every report** — mechanically first, with `node .opencode/skills/project-initialization/scripts/validate-analysis.js`, then by eye:
   - **Single-component path:** ensure all 11 sections are covered (1–7 standard + 8 business modules + 9 entities + 10 endpoints + 11 integrations). Sections 8–11 are NOT optional.
   - **Fan-out path:** ensure each per-component report covers the REQUIRED sections from the "Scoped Prompt Templates" table for its component kind. Infra components are validated against the dedicated infra prompt (sections A–E).
2. **If sections are missing** — dispatch one narrowed follow-up per flagged component, naming only the missing facts (see [`subagent-contract.md`](../subagent-contract.md) §9). Never repeat the whole fan-out.
3. **Merge per-component reports** (fan-out path only) per the "Merge into a single repository view" table in [`dispatch.md` → Step 4](dispatch.md) — produce a single 11-section logical view PLUS the per-domain enriched `project-config.json` files.
4. **Run the Phase 4 Reflection Checkpoint (MANDATORY)** — see [`reflection-and-gaps.md`](reflection-and-gaps.md); this is run **once** over the merged view, not per component.
5. **Format the report** for user presentation using the template in [`merge-and-persist.md` → Analysis Report Generation](merge-and-persist.md). For fan-out, the user-facing summary lists components first, then the merged repository view.
6. **Present findings to user** with concrete names from sections 8–11 (or per-component equivalents), and ask the Smart Reflection Questions generated in step 4.
7. **Persist results:**
   - Decision Log Q-blocks: one **Q1 — component decomposition** entry first (fan-out only), one **Q2 — auto-detected codebase summary** entry, then Q-blocks per Smart Reflection Question.
   - Per-domain `project-config.json` populated from the per-component reports per the "Per-component persistence map" table in [`dispatch.md` → Step 5](dispatch.md).
   - `Supplemental Source Manifest` rows for sources that Phase 6 should consume (API specs, integration list, per-component analysis pointers).
   - Optional `docs/project/ARCHITECTURE.md` ONLY when architecture is non-trivial OR the repo has 3+ heterogeneous components.
   - The ledger MUST NOT receive a duplicated long-form "Existing Project Analysis" section or full per-component reports.

---

## Analysis Areas Reference

The analyzer subagent covers the following analysis areas. This section serves as a reference for what should be included in the results.

### Entry Points

```markdown
Main Entry Points:
- Primary: [file path and purpose]
- Secondary: [file path and purpose]
- Backend: [file path and purpose, if applicable]
```

### Folder Structure

```markdown
Folder Structure:
├── src/
│   ├── components/ ([count] files)
│   ├── pages/ ([count] files)
│   ├── services/ ([count] files)
│   ├── hooks/ ([count] files)
│   ├── store/ ([count] files)
│   ├── utils/ ([count] files)
│   ├── types/ ([count] files)
│   └── tests/ ([count] files)
```

### Architecture Pattern Classification

| Pattern | Key Indicators |
|---|---|
| **Feature-Sliced Design** | `src/features/`, `src/shared/`, `src/entities/`, `src/widgets/` |
| **Atomic Design** | `src/atoms/`, `src/molecules/`, `src/organisms/`, `src/templates/` |
| **Modular Architecture** | `src/modules/[module-name]/*`, self-contained modules |
| **Page-Based Structure** | `src/pages/` or `src/routes/`, flat component structure |
| **Flat/Monolithic** | `src/` with mixed files, no clear organizational pattern |

### Dependencies Categorization

Categories to extract from package.json:
- **Framework** — React, Vue, Angular, Svelte, Next, Nuxt, etc.
- **Build Tool** — Vite, Webpack, Rollup, esbuild, etc.
- **State Management** — Redux Toolkit, Zustand, Jotai, Pinia, MobX, etc.
- **Styling** — Tailwind CSS, Styled Components, Emotion, Sass, etc.
- **Routing** — React Router, Vue Router, TanStack Router, etc.
- **UI Libraries** — MUI, Ant Design, Chakra UI, Radix, Mantine, etc.
- **Testing** — Vitest, Jest, Playwright, Cypress, Testing Library, etc.
- **Data Fetching** — Axios, TanStack Query, SWR, Apollo, tRPC, etc.
- **Utilities** — Lodash, date-fns, Zod, Yup, UUID, etc.

### API Documentation & Specifications

```markdown
API Documentation Discovery:

Found Documents:
- [path]: [type] (OpenAPI/Swagger/GraphQL/Protobuf/Postman/Documentation)
  Completeness: [Full/Partial/Outdated]
  API Version: [version if specified]

API-Related Code Locations:
- [path]: [description] (Route definitions, controllers with annotations, type definitions)

Summary:
- Total API specs found: [count]
- Types: [OpenAPI, GraphQL schema, etc.]
- Recommended primary source for API rule generation: [path or "None found"]
```

### Code Quality Checks

```markdown
Code Quality Assessment:

Linting & Formatting:
- ESLint: ✅/❌ [details]
- Prettier: ✅/❌ [details]
- EditorConfig: ✅/❌

Testing:
- Test Files: [count] ([X%] of source files)
- Test Framework: [detected framework]
- Coverage: [X%] (if available)
- E2E Tests: [Yes/No]

Documentation:
- README.md: [Excellent/Good/Fair/Poor]
- API Docs: [Yes/No]
- Code Comments: [Extensive/Moderate/Minimal]
- JSDoc: [Yes/No]

TypeScript:
- Strict Mode: [Yes/No]
- 'any' Usage: [Low/Moderate/High]
- Type Coverage: [X%]

Overall Quality: [Excellent/Good/Fair/Poor]
```

---
