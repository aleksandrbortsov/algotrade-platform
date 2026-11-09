# Phase 6 - API Sub-Analysis

> **Step file.** The two-stage API analysis used to configure `api-context`: what Phase 4 already recorded, and the subagent brief for the residue. **Conditional** - see the coverage gate in [overview.md](overview.md); do not re-scan what `.opencode/project/analysis/index.json` already covers.
>
> **Parent:** [configuration-updates.md](../configuration-updates.md) - Phase 6 router
> **Read first:** [overview.md](overview.md) - what Phase 6 produces, the render order, validation and completion actions
> **Previous step file:** [part-2-domain-skills.md](part-2-domain-skills.md) - domain skill configuration
> **Next step file:** [part-3-guidelines.md](part-3-guidelines.md) - guidelines generation

---

## Coverage gate — run this before anything else in this file

> **The Phase 6 API scan is conditional, not mandatory.** Phase 4 already dispatched a `codebase-analyzer` per component, and a `backend` or `mixed` component's report contains exactly the material this step used to re-derive: `endpointGroups`, `entities`, `integrations`, `patterns`. Re-scanning the same controllers a second time buys nothing and costs a full subagent context.

Read `.opencode/project/analysis/index.json` and decide:

| `coverage.api` | Newest `<component>.json` vs. newest source change under the API paths | Action |
|---|---|---|
| `true` | artifact is newer | **Skip the scan.** Read `endpointGroups`, `integrations`, `entities` and `patterns` from the component artifacts and go straight to the `api-context` questions in [part-2-domain-skills.md](part-2-domain-skills.md). Record `API sub-analysis: skipped — Phase 4 coverage.api=true (<component>.json)` in Decision Log §6. |
| `true` | source is newer, or an artifact is `coverage: "partial"` with API-related `gaps[]` | **Dispatch a narrowed brief** naming only the residue (the gap entries, or the paths changed since the artifact). Not the full 11-section prompt below. |
| `false` / absent | — | **Dispatch the full brief** below. This is the NEW_PROJECT path, the no-Phase-4 path (mode is NEW_PROJECT so Phase 4 never ran), and the path where every Phase 4 component was `frontend` / `infra`. |

If `.opencode/project/analysis/` does not exist at all (a project initialized before the artifact model, or `/quick-init`), treat it as `coverage.api: false` and dispatch the full brief.

> **Why this gate is worth a table.** The duplicated scan was the single largest avoidable cost in Phase 6: `backend-context` and `api-context` both wanted the endpoint inventory, so the same route files were read twice in the same run. The `coverage` map in `index.json` exists specifically so the second read is a JSON lookup.

---

## API Analysis Strategy (Two-Stage Approach)

> **CRITICAL:** API analysis happens in TWO stages, and the second one runs only when the coverage gate above says so:
> 1. **Phase 5 (Optional):** User-specified directories analysis via an analysis subagent (if the user provided specific paths)
> 2. **Phase 6 (Conditional):** Repository-wide API analysis — dispatched only when `coverage.api` is `false`, stale, or partial

### Stage 1: Phase 5 User-Directed Analysis (Already Completed)

If in Phase 5 the user provided specific API code directories/files, a codebase-analyzer subagent was already launched to analyze those locations. The results live in `.agents/skills/api-context/project-config.json` (`endpoints`, `middleware`, `schemas`, `externalIntegrations`, `references.codeLocations`) and the corresponding rows in `.opencode/project_init.md → ## Supplemental Source Manifest` (rows: "Endpoint analysis", "API specifications"). Decision Log §5 has the per-question Q-blocks.

**What was analyzed in Phase 5 (if applicable):**
- User-specified API code directories
- User-specified API code files with documentation
- Database schema files (if user selected)
- API test files (if user selected)

**Available from Phase 5:**
- Endpoints discovered in specified locations
- Middleware/patterns found
- Data schemas identified
- External integrations detected
- Detailed analysis report

### Stage 2: Phase 6 Comprehensive Analysis (only when the coverage gate opens)

When the API domain is selected **and** the coverage gate above did not resolve the question from Phase 4 artifacts, the agent dispatches one analysis subagent for a repository-wide scan. This complements Phase 5 analysis by:
- Scanning the ENTIRE repository for API patterns (not just user-specified locations)
- Finding endpoints that may exist outside user-specified directories
- Discovering additional integrations and patterns
- Validating Phase 5 findings against the full codebase

### Why Two-Stage Approach is Beneficial

| Stage | Focus | Benefit |
|---|---|---|
| **Phase 5 (User-directed)** | Deep analysis of known API locations | User guides agent to critical areas; faster initial discovery |
| **Phase 6 (Comprehensive)** | Full repository scan | Finds missed endpoints; validates completeness; discovers edge cases |

### When to launch the Phase 6 API subagent

| Scenario | Launch | Reason |
|---|---|---|
| API domain not selected for configuration | **No** | Nothing consumes the result |
| `index.json → coverage.api: true`, artifact newer than the API sources | **No** | Phase 4 already recorded the endpoint groups; read them |
| `coverage.api: true` but stale or `partial` with API gaps | **Narrowed brief** | Scan only the residue |
| `coverage.api: false` / no analysis directory (incl. NEW_PROJECT and `/quick-init`) | **Full brief** | This is the only source of API information |

The decision, and the artifact or gap that justified it, goes into Decision Log §6 as one line. A skipped scan is a normal, preferred outcome — not a shortcut that needs excusing.

### Subagent Invocation for API Analysis

The main agent MUST use the `Task` tool, following [`subagent-contract.md`](../subagent-contract.md):

```
Task tool call:
  subagent_type: "codebase-analyzer"
  description: "Deep API analysis for domain skill configuration"
  prompt: [Seven-block brief wrapping the API analysis prompt - see template below]
```

Read-only is enforced by the analyzer's `permission` block, not by a `Task` parameter; the brief's CONSTRAINT block restates what the subagent may write.

### API Analysis Prompt Template

```
Perform a very thorough API analysis of the ENTIRE codebase at [WORKSPACE_PATH].

Context from initialization:
- Framework: [from development.md or Phase 3]
- Architecture: [from Phase 5]
- Mode: [NEW_PROJECT/EXISTING_PROJECT]
- API documentation pointers (from `api-context/project-config.json.references` + Supplemental Source Manifest): [list confirmed specs and resources, or "None found"]

**IMPORTANT: Phase 5 Analysis Results**
[If the Phase 5 analyzer sub-analysis was performed, include:]
A preliminary API analysis was already performed in Phase 5 on user-specified locations:
- Analyzed locations: [list directories/files from Phase 5]
- Endpoints found in Phase 5: [count]
- Your task: Perform a FULL REPOSITORY scan to find ANY additional API endpoints, patterns, or integrations that may exist OUTSIDE the Phase 5 analyzed locations. Validate and complement Phase 5 findings.

[If the Phase 5 analyzer sub-analysis was NOT performed:]
No preliminary analysis was done. This is the primary API discovery phase.

## 1. API Specifications & Documentation Discovery
Search for all API documentation files in the repository:
- OpenAPI/Swagger files (openapi.yaml, openapi.json, swagger.yaml, swagger.json, *.openapi.*)
- GraphQL schema files (*.graphql, schema.graphql, schema.gql)
- Protobuf/gRPC definitions (*.proto)
- Postman collections (*.postman_collection.json)
- Insomnia exports (insomnia*.json, insomnia*.yaml)
- API Blueprint files (*.apib)
- API documentation directories (docs/api/, api-docs/, swagger/, openapi/)
- README sections with API descriptions (search for "## API", "## Endpoints", "## REST")
For each found document: record path, type, completeness, API version.

## 2. Route & Endpoint Analysis
Based on the detected framework ([framework]), scan for all API endpoints:
- Express/Fastify: router.(get|post|put|patch|delete), app.(get|post|put|patch|delete)
- NestJS: @Get(), @Post(), @Put(), @Patch(), @Delete(), @Controller() decorators
- Next.js: /pages/api/**, /app/api/**/route.ts, /app/api/**/route.js
- Nuxt: /server/api/**, /server/routes/**
- FastAPI: @app.get(), @router.post(), @app.put()
- Django: urlpatterns, path(), re_path()
- Spring Boot: @GetMapping, @PostMapping, @RequestMapping
- Generic: scan for HTTP method patterns in any framework

For each endpoint found:
- HTTP method (GET, POST, PUT, PATCH, DELETE)
- Route path (/api/v1/users, /auth/login, etc.)
- Source file and line number
- Handler function name
- Request/response types if available
- Authentication/authorization requirements if detectable

## 3. External API Integrations & SDK Usage
Scan for all external API integrations:
- SDK package imports (stripe, @sendgrid, aws-sdk, @aws-sdk/*, firebase, twilio, etc.)
- HTTP client usage (axios, fetch, got, node-fetch, ky, ofetch) with external URLs
- Environment variables containing API keys, URLs, tokens (from .env.example, .env.sample, config files)
- Webhook endpoints (incoming webhooks from external services)
- Third-party API URL patterns in code (https://api.*, https://*.amazonaws.com, etc.)

For each integration found:
- Service name and SDK/client used
- Source files where it's used
- Purpose/description if determinable
- Configuration location

## 4. API Middleware & Cross-Cutting Concerns
Identify API-level middleware and cross-cutting patterns:
- Authentication middleware (JWT, OAuth, session, API key validation)
- Authorization middleware (role-based, permission-based, policy-based)
- Rate limiting
- Request validation (Zod, Joi, class-validator, Yup)
- Error handling middleware
- Logging middleware
- CORS configuration
- API versioning approach

## 5. API Data Models & Schemas
Identify data models used in API request/response:
- TypeScript interfaces/types for API payloads
- DTO (Data Transfer Object) classes
- Validation schemas (Zod schemas, Joi schemas, class-validator decorators)
- Database models that map to API resources (if ORM detected)

## 6. API Testing
Find API-related tests:
- API/endpoint test files
- Integration tests that test API behavior
- Mock/stub configurations for external APIs
- Test utilities for API testing (supertest, pactum, etc.)

Return a structured report with all findings organized by section.
Include specific file paths and line numbers where possible.
End with a "Summary" section listing:
- Total internal endpoints found (with breakdown by HTTP method)
- Total external integrations found
- API documentation coverage assessment
- Key recommendations for API skill configuration
```

### Processing the API analyzer results

After receiving the codebase-analyzer's API analysis summary (the full report lives in the analysis artifacts):

1. **Load Phase 5 Analysis (if exists)** — Read `.agents/skills/api-context/project-config.json` (`endpoints`, `middleware`, `schemas`, `externalIntegrations`, `references.*`). Cross-check `.opencode/project_init.md → ## Supplemental Source Manifest` rows for any pointers to spec files / external docs / database schemas / test files. Decision Log §5 holds the per-question audit trail.

2. **Merge all data sources:**
   - Phase 5 analyzer results (already in `api-context/project-config.json`)
   - Phase 6 analyzer results (full repository scan — about to be merged)
   - User-confirmed API documentation pointers (`api-context/project-config.json.references.specifications[]` + `references.externalDocs[]`)

3. **Identify coverage:**
   - Endpoints found ONLY in Phase 5 (user-specified locations)
   - Endpoints found ONLY in Phase 6 (discovered outside specified locations)
   - Endpoints found in BOTH (validation)
   - Endpoints from specs but not in code (potential outdated specs)

4. **Resolve conflicts:**
   - If Phase 6 findings contradict Phase 5 (e.g., different parameter types), note discrepancies
   - If analyzer findings contradict specs (e.g., specs are outdated), flag for user review

5. **Present consolidated findings** to the user before writing configuration (see below)

6. **Use merged findings to populate** API skill's `project-config.json` with endpoints registry and external integrations

### Consolidated Results Presentation

```
🔍 API Analysis Results (Two-Stage Analysis + Documentation)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Analysis Coverage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 5 (User-directed):
[If performed]
✅ Analyzed locations: [list]
✅ Endpoints found: [count]
✅ Middleware/patterns: [count]
✅ External integrations: [count]

[If NOT performed]
⏭️  Skipped — no specific locations provided by user

Phase 6 (Full repository scan):
✅ Analyzed: Entire repository
✅ Endpoints found: [total count]
  ├─ In Phase 5 locations: [count] (validation)
  └─ Outside Phase 5 locations: [count] (new discoveries)
✅ Additional integrations: [count]

API Specifications Found:
[Table with # | File | Type | Completeness | Status]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Internal Endpoints Registry ([N] total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Table with Method | Path | Source File | In Spec? | Auth Required? | Discovery Stage]

Legend for "Discovery Stage":
- P5: Found in Phase 5 analysis (user-specified locations)
- P6: Found in Phase 6 analysis (full scan)
- Both: Found in both phases (validation ✓)
- Spec: Only in specification (⚠️ not found in code)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔌 External Integrations Registry ([N] total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Table with Service | SDK/Client | Source Files | Purpose | Discovery Stage]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  API Middleware & Patterns
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Authentication: [detected method]
- Authorization: [detected pattern]
- Validation: [detected library]
- Error handling: [detected pattern]
- Rate limiting: [detected/not detected]
- CORS: [configured/not configured]
- API Versioning: [strategy detected]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Discrepancies & Validation Findings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[If any discrepancies found:]

Endpoints in code but missing from specs:
- [List with details]

Endpoints in specs but not found in code:
- [List with details — potentially outdated specs]

Endpoints found outside user-specified locations (Phase 5):
- [List — user may not be aware of these]

[If no discrepancies:]
✅ All endpoints validated — code and specs are in sync

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Options:
1. Include all discovered — write comprehensive API skill config
2. Edit selection — exclude specific items
3. Add more manually — supplement with additional info
4. Skip — leave API config empty (not recommended)

Your choice:
```

### API Information Gathering Priority

| Priority | Source | How to Use |
|----------|--------|-----------|
| 1. codebase-analyzer subagent (when the scan runs - see the conditionality table above) | Deep codebase analysis | Most up-to-date picture of actual API state |
| 2. Confirmed API docs (Phase 5) | OpenAPI, GraphQL schema, Protobuf, Postman, user-provided paths/URLs | Cross-reference with analyzer findings |
| 3. Merged presentation | Combined results from all sources | User reviews and confirms before writing config |
