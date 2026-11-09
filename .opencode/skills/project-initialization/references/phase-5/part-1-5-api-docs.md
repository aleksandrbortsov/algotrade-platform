# Phase 5 - Part 1.5: API Documentation Discovery

> **Step file.** Confirming the API specs found in Phase 4, dispatching an analysis subagent over user-specified locations, and recording the inventory in `api-context/project-config.json`. The longest Part - read it only when the project has an API surface.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **Read first:** [overview.md](overview.md) - adaptive mode and the skip-by-default policy that govern every Part
> **Previous step file:** [part-1-components.md](part-1-components.md) - components documentation
> **Next step file:** [part-2-architecture.md](part-2-architecture.md) - architecture decisions

---

## Part 1.5: API Documentation Discovery Confirmation

> **Purpose:** Confirm whether API documentation, specifications, or contracts were correctly identified in the repository, and allow the user to explicitly point to additional resources for accurate API component rule generation.
>
> **Applies to:** EXISTING_PROJECT mode (uses Phase 4 codebase analysis results). For NEW_PROJECT mode, ask a simplified version (see below).

### For EXISTING_PROJECT

After presenting codebase analysis results (Phase 4), include the following **API Documentation Confirmation** step:

> **Pre-flight ([overview.md](overview.md)).** Phase 4 §7 and §10 already answered most of this Part: the analyzer recorded every spec file it found, the endpoint groups with their source paths, and the API-related code locations. Score before asking — the rounds below are an option library, and the Part never surfaces more than **3** questions:
> - **HIGH** (≥ 1 spec file confirmed, or endpoint groups with source paths): Rounds 2–3 are not asked. Show the inventory and ask **one** confirmation — Round 1 Q1 with the free-text slots of Q2–Q5 folded into its option [B] ("correct and complete, or add the pointers I missed: paths / URLs / specs").
> - **Partial** (endpoints found but no spec, or a spec whose completeness is `Partial` / `Outdated`): the confirmation plus **at most two** targeted questions naming the gap (e.g. "`/api/v2/*` has 47 endpoints in `src/api/v2/` but no spec — is there one outside the repository?").
> - **LOW** (no API signal at all): ask Round 1 Q1 only; `[D] there are no API docs/specs` ends the Part.
> Question 6 (analyze database schemas / test files) is asked only when Phase 4 did not already cover them (`analysis/index.json → coverage.database`, test sources in the component artifacts). Never re-ask a path the analyzer already recorded.

#### Step 1: Present Discovered API Documentation

```
📄 API Documentation & Specifications Discovery

During codebase analysis, the following API-related documents and specifications were found:

[If documents found:]
| # | File | Type | Completeness |
|---|------|------|-------------|
| 1 | [path] | [OpenAPI/Swagger/GraphQL/etc.] | [Full/Partial/Outdated] |
| 2 | [path] | [type] | [completeness] |
...

[If no documents found:]
⚠️ No API documentation or specifications were found in the repository.

API-related code locations detected:
- [path] — [description, e.g., "Route definitions", "Controller files"]
...
```

#### Step 2: Ask Structured Confirmation Questions

**Option library — drawn from per the pre-flight above, never asked in full (max 3 questions for the Part):**

**Round 1: Documentation Verification (1 question)**

```
1. Are the above API documents/specifications correctly identified?
   - [A] Yes, the list is correct and complete
   - [B] Partially correct — some items are missing or incorrectly identified
   - [C] No — the list is incorrect, I'll provide the correct sources
   - [D] There are no API docs/specs in this project
   
   Your choice:
```

**Round 2: API Code Locations (2 questions)**

```
2. Where are the API route definitions/endpoint handlers located in your project?
   Please provide specific paths:
   
   Examples:
   - "src/routes/" — all route definitions
   - "src/api/controllers/" — controller files
   - "app/api/" — Next.js API routes
   - "backend/endpoints/" — endpoint handlers
   - "None" — no specific directories
   
   Your input (comma-separated paths or "none"):
   _________________________________

3. Are there specific files with comprehensive API documentation in code?
   (JSDoc/TSDoc annotations, detailed comments, type definitions)
   
   Examples:
   - "src/services/userService.ts" — user API methods with JSDoc
   - "src/types/api.ts" — API type definitions
   - "src/api/swagger.ts" — inline Swagger annotations
   - "None" — no specific files
   
   Your input (comma-separated paths or "none"):
   _________________________________
```

**Round 3: External Documentation & Related Resources (3 questions)**

```
4. Are there external documentation URLs or wiki pages for this API?
   (Confluence, Notion, internal wikis, Swagger UI deployments)
   
   Examples:
   - "https://confluence.company.com/display/API/v2"
   - "https://api.company.com/docs"
   - "https://notion.so/API-Documentation-xxx"
   - "None" — no external documentation
   
   Your input (URLs or "none"):
   _________________________________

5. Are there API specification files that weren't detected?
   (OpenAPI/Swagger, GraphQL schemas, Protobuf, API Blueprint, Postman collections)
   
   Examples:
   - "docs/api/openapi.yaml"
   - "schema.graphql"
   - "api.postman_collection.json"
   - "None" — no additional specs
   
   Your input (paths or "none"):
   _________________________________

6. Should the AI agent analyze database schemas or test files to understand API structure?
   
   Database schemas:
   - [A] Yes — analyze database schema files (e.g., "prisma/schema.prisma", "src/models/")
   - [B] No — database schema is not relevant to API
   
   Test files:
   - [C] Yes — analyze API test files (e.g., "tests/api/", "tests/integration/")
   - [D] No — tests don't document API contracts
   
   Your choices (e.g., "A,C" or "B,D"):
   _________________________________
```

#### Step 3: Launch Analysis Subagent for User-Specified Directories

> **NEW FEATURE:** If user provides specific API code directories (Question 2) or code files (Question 3), immediately dispatch a `codebase-analyzer` subagent to deeply analyze those locations, following [`subagent-contract.md`](../subagent-contract.md).

**Trigger Conditions:**
- User provided at least one directory path in Question 2 (not "none")
- OR user provided at least one code file path in Question 3 (not "none")

**Subagent Launch:**

```
Task tool call:
  subagent_type: "codebase-analyzer"
  description: "Deep API analysis of user-specified locations"
  prompt: [Seven-block brief wrapping the template below]
```

**Prompt Template:**

```
Perform a very thorough API analysis of user-specified locations in [WORKSPACE_PATH].

## User-Provided Locations

**API Code Directories:**
[List of directories from Question 2]

**API Code Files:**
[List of files from Question 3]

**Database Schema Files/Directories:**
[If user selected option A in Question 6]

**API Test Files/Directories:**
[If user selected option C in Question 6]

## Analysis Tasks

### 1. API Endpoints Discovery (Priority: HIGH)

For each user-specified directory/file, scan for ALL API endpoints:

**Framework-specific patterns** (based on detected framework from Phase 3):
- Express/Fastify: router.(get|post|put|patch|delete), app.(get|post|put|patch|delete)
- NestJS: @Get(), @Post(), @Put(), @Patch(), @Delete(), @Controller() decorators
- Next.js: /pages/api/**, /app/api/**/route.ts, /app/api/**/route.js
- Nuxt: /server/api/**, /server/routes/**
- FastAPI: @app.get(), @router.post(), @app.put()
- Django: urlpatterns, path(), re_path()
- Spring Boot: @GetMapping, @PostMapping, @RequestMapping
- Generic: HTTP method patterns in any framework

**For each endpoint found, extract:**
- HTTP method (GET, POST, PUT, PATCH, DELETE)
- Route path (full path with parameters)
- Source file and line number
- Handler function name and signature
- Request body schema/types (TypeScript interfaces, Zod schemas, etc.)
- Response schema/types
- Query parameters
- Path parameters
- Authentication/authorization requirements (middleware, decorators, guards)
- Validation rules (express-validator, Joi, Zod, class-validator)
- Rate limiting configuration (if present)
- Documentation comments (JSDoc, TSDoc, inline comments)

### 2. API Middleware & Cross-Cutting Concerns

Identify all API-level middleware in specified directories:
- Authentication middleware (JWT verification, API key validation, session)
- Authorization middleware (RBAC, ABAC, permission checks)
- Request validation middleware
- Error handling middleware
- Logging/audit middleware
- Rate limiting middleware
- CORS configuration
- Request/response transformation
- API versioning logic

For each middleware:
- File location and line number
- Middleware name and purpose
- Applied to which routes (global, specific routes, route groups)
- Configuration parameters

### 3. API Data Models & Schemas

In specified files and directories, find:
- Request/response TypeScript interfaces
- DTO (Data Transfer Object) classes
- Validation schemas (Zod, Joi, Yup, class-validator)
- GraphQL type definitions
- Protobuf message definitions
- JSON Schema definitions
- OpenAPI schema objects

For each schema:
- Schema name
- Fields with types
- Validation rules
- Required vs optional fields
- Used in which endpoints

### 4. API Documentation Extraction

Extract all inline documentation:
- JSDoc/TSDoc comments on endpoint handlers
- OpenAPI/Swagger annotations (decorators, YAML, JSON)
- GraphQL schema descriptions
- Inline code comments describing API behavior
- README sections in API directories

### 5. External API Integrations (in specified locations)

Find evidence of external API calls:
- SDK imports and usage (stripe, @sendgrid, aws-sdk, etc.)
- HTTP client usage (axios, fetch, got) with external URLs
- WebSocket connections to external services
- gRPC client calls
- Message queue consumers/producers (RabbitMQ, Kafka)

For each integration:
- Service name
- SDK/client used
- Configuration location
- Called from which files/functions

### 6. Database Schema Analysis (if user selected option A)

Analyze database schema files to understand API data models:
- Table/collection names
- Column/field names and types
- Relationships (foreign keys, references)
- Indexes
- Constraints
- Which API endpoints likely use which tables/collections

### 7. API Test Analysis (if user selected option C)

Analyze test files to extract API contracts:
- Test file names and locations
- Tested endpoints (extract from test code)
- Expected request payloads (from test fixtures)
- Expected response structures
- Authentication/authorization test cases
- Error case testing

## Output Format

Return a structured report with these sections:

### Summary
- Total endpoints found: [count]
- Total middleware found: [count]
- Total schemas/DTOs found: [count]
- Total external integrations found: [count]
- Documentation coverage: [High/Medium/Low]

### Detailed Findings

#### Endpoints Registry
[Table: Method | Path | Handler | Request Schema | Response Schema | Auth | Source File:Line]

#### Middleware Inventory
[Table: Name | Purpose | Scope | Source File:Line]

#### Data Models & Schemas
[Table: Name | Type | Fields Summary | Used By Endpoints | Source File:Line]

#### External Integrations
[Table: Service | SDK/Client | Usage Location | Purpose]

#### Database-API Mapping (if applicable)
[Table: Table/Collection | Related Endpoints | Key Fields]

#### Test-Documented API Contracts (if applicable)
[Table: Endpoint | Test File | Expected Behavior]

### Recommendations for API Rule Generation
- Key patterns detected (e.g., "All endpoints use Zod validation")
- Authentication/authorization approach
- API versioning strategy observed
- Error handling patterns
- Suggested documentation improvements
```

**Processing the analyzer results:**

After receiving the codebase-analyzer summary:

1. **Store results** in memory for use in Phase 6
2. **Present summary** to user:

```
✅ API Analysis Complete (via codebase-analyzer subagent)

📊 Analyzed Locations:
- [List of directories/files analyzed]

📋 Findings Summary:
- Endpoints discovered: [count]
- Middleware/patterns found: [count]
- Data schemas identified: [count]
- External integrations: [count]

The detailed analysis will be used to configure the API domain skill in Phase 6.

Proceed to next questions?
```

3. **Persist results to authoritative artifacts**, then log Q-blocks in the Decision Log:
   - `.agents/skills/api-context/project-config.json`:
     - `references.specifications[]` — paths/URLs of OpenAPI/GraphQL/Protobuf/Postman/external docs
     - `references.codeLocations[]` — user-provided route/controller directories
     - `references.databaseSchemas[]` — if user opted in (Question 6 option A)
     - `references.testSources[]` — if user opted in (Question 6 option C)
     - `endpoints[]` — populated/refined from the analyzer report (one entry per resource group: method(s), path pattern, count, version, auth, source file)
     - `middleware[]`, `schemas[]`, `externalIntegrations[]` — from the analyzer report
   - `.opencode/project_init.md → ## Supplemental Source Manifest`:
     - Update row "API specifications" → list spec paths/URLs (or `none`)
     - Update row "Endpoint analysis" → cite `api-context/project-config.json.endpoints`
     - Update row "Database schema files" / "API test files" if opted in
   - `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 5 — Requirements`:
     - One Q-block per round actually asked. `Decision stored in:` always points to the `api-context/project-config.json` (or specific JSON keys), never to the ledger.

> **Source-of-truth rule:** the ledger does NOT carry an `## API Documentation Sources` section anymore. The full inventory lives in `api-context/project-config.json` and is summarised by Phase 6 into `api-context/references/guidelines.md`.

### For NEW_PROJECT

Ask structured questions to understand if there's any pre-existing API design:

**Round 1: Existing API Specifications (1 question)**

```
1. Do you have any existing API specifications or design documents for this project?
   - [A] Yes — I have API specification files (OpenAPI, GraphQL, Protobuf, etc.)
   - [B] Yes — I have external API documentation (URLs to docs, wikis, design documents)
   - [C] Yes — I have sample/reference API implementations to follow
   - [D] No — we'll define the API during development
   - [E] Planned — we'll use [OpenAPI/GraphQL/other] format but haven't created specs yet
   
   Your choice:
```

**If A (has specification files):**

```
2. Please provide paths to your API specification files:
   
   Examples:
   - "docs/api/openapi.yaml"
   - "schema.graphql"
   - "api.proto"
   - "api-design.json"
   
   Your input (comma-separated paths):
   _________________________________
```

**If B (has external documentation):**

```
2. Please provide URLs to your API documentation:
   
   Examples:
   - "https://confluence.company.com/display/API/Design"
   - "https://notion.so/API-Specification-xxx"
   - "https://wiki.company.com/api-v2"
   
   Your input (URLs):
   _________________________________
```

**If C (has reference implementations):**

```
2. Please provide information about the reference API you're following:
   
   What to provide:
   - Path to reference code/examples
   - URLs to reference API documentation
   - Description of the API style/pattern
   
   Your input:
   _________________________________
```

**If E (planned format):**

```
2. Which API specification format will you use?
   - [A] OpenAPI/Swagger
   - [B] GraphQL Schema
   - [C] Protobuf/gRPC
   - [D] API Blueprint
   - [E] Other (specify): _____________
   
   Your choice:
```

**Round 2: API Structure Planning (if not D)**

```
3. Do you want to pre-define the API structure now?
   (Directory structure for routes, naming conventions, authentication approach)
   
   - [A] Yes — I'll describe the planned structure
   - [B] No — we'll decide during development
   
   [If A:] Please describe your planned API structure:
   _________________________________
```

Persist all information into `.agents/skills/api-context/project-config.json` (under `references.specifications[]`, `references.externalDocs[]`, `plannedFormat`, `plannedStructure`, etc.) and update the `Supplemental Source Manifest` row "API specifications". Append one Q-block per asked question to the Decision Log §5 with `Decision stored in: .agents/skills/api-context/project-config.json`.

**Note:** For NEW_PROJECT, no analyzer subagent is launched in Phase 5 (no code to analyze yet). API skill configuration in Phase 6 will use the provided specifications and ask configuration questions.
