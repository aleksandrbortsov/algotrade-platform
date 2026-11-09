# Phase 4 - BA-Only Mode

> **Step file.** Read this **only** when every selected role is `ba`. It replaces the research questions in [prompts.md](prompts.md) and the gap checklist in [reflection-and-gaps.md](reflection-and-gaps.md). Everything else - dispatch mechanics, artifact model, budgets - is unchanged.
>
> **Parent:** [codebase-analysis.md](../codebase-analysis.md) - Phase 4 router
> **Gate:** if BA is combined with any developer role, ignore this file and use the standard flow.

---

## BA-Only Role Gate

Before choosing the analyzer prompt, check if the user selected **only** the BA role:

```
If ALL selected roles are `ba` (no developer roles like frontend, backend, fullstack, etc.):
  - Use the BA-Only Analyzer Prompt (see section below) instead of the standard prompt
  - Use the BA-Only Analysis Report format instead of the standard report
  - Use the BA-Only Gap Detection instead of the standard gap detection checklist
  - All other mechanics remain the same (`codebase-analyzer` subagent, blocking dispatch, artifact-only writes)
```

If BA is combined with developer roles, skip this gate and use the standard flow.

---

### BA-Only Analyzer Prompt (Alternative)

When BA-only mode is active, use this simplified prompt instead of the standard 7-section prompt above. This prompt focuses on **business-relevant structure** that supports BA operations (especially `/ba-impact-analysis`):

```
Perform a thorough business-oriented codebase analysis of this repository for BA initialization.
The project workspace is at: [WORKSPACE_PATH]

Focus on aspects relevant to a Business Analyst performing impact analysis and requirements work.
Return a structured report with the following sections:

## 1. Project Modules & Business Features
Identify the main functional areas/modules of the application:
- Scan top-level directories (src/, app/, lib/, modules/, features/) for business domain groupings
- For each module/feature area, describe its apparent business purpose
  (e.g., "user-management" → user registration, authentication, profile management)
- Note how modules relate to each other (shared dependencies, cross-references)
- Examples of business areas: billing, user management, reporting, notifications, integrations

## 2. Architecture Overview (High-Level)
Classify the overall architecture:
- Monolith vs microservices vs modular monolith
- Main layers (presentation, business logic, data access)
- Frontend-backend separation (monorepo, separate repos, full-stack framework)
- Key design patterns visible at the project level (MVC, layered, feature-sliced, etc.)
Provide a brief rationale for the classification.

## 3. Key Data Models & Entities
Find and document the main data models/entities:
- Database schema files (Prisma schema, TypeORM entities, Sequelize models, SQL migrations, etc.)
- Domain model classes or interfaces
- For each entity: name, key fields, relationships to other entities
- Group entities by business domain when possible

## 4. API Endpoints (High-Level Inventory)
Produce a high-level API inventory:
- Total count of endpoints
- Group by resource/domain (e.g., /users/*, /orders/*, /products/*)
- For each group: HTTP methods available, brief purpose
- Note authentication requirements if visible (public vs protected)
- Note API versioning if present

## 5. External Integrations & Services
Find evidence of external system integrations:
- Third-party API calls (payment gateways, notification services, analytics, etc.)
- Message queues / event systems (RabbitMQ, Kafka, Redis pub/sub, etc.)
- External databases or data sources
- SSO / identity providers
- For each integration: service name, purpose, location in codebase

## 6. Folder Structure (Top-Level Overview)
Map the top-level directory structure with brief descriptions:
- Focus on business-meaningful directories, not build/config artifacts
- Include file counts per major directory
- Highlight directories that contain business logic vs infrastructure vs UI

Return your analysis as a single structured report with clear sections and markdown formatting.
Do NOT include: code quality metrics (linting, test ratios, TypeScript strictness),
detailed dependency categorization, outdated package flags, or code pattern analysis
(functional vs class components, HOC patterns, etc.).
```

### BA-Only Processing & Report

After receiving the BA-Only analyzer summary, the main agent MUST:

1. **Validate the report** — ensure all 6 sections are covered, then run `validate-analysis.js` as in the standard flow
2. **If sections are missing or the validator reports SHALLOW** — launch one narrowed follow-up **`codebase-analyzer`** dispatch naming only the missing facts, rewriting the same two artifacts. Never dispatch `explore` here: it writes nothing, so the artifact keeps its shallow content and the validator reports the identical findings on every re-run
3. **Format the report** for user presentation using this BA-focused format:

```markdown
📁 Codebase Analysis Summary (BA Mode)

Project: [Project Name]
Analyzed: [Timestamp]
Method: codebase-analyzer subagent (BA-focused analysis)

## Business Modules
[List of identified business modules with descriptions]

## Architecture
**Pattern:** [detected pattern]
**Layers:** [main layers identified]

## Key Entities
[Table: Entity | Key Fields | Relationships | Business Domain]

## API Overview
**Total Endpoints:** [count]
[Table: Resource Group | Methods | Purpose | Auth Required]

## External Integrations
[Table: Service | Purpose | Location]

## Project Structure
[Folder structure tree with descriptions]
```

4. **Present to user** — show the report without asking for detailed technical corrections
5. **Identify business-relevant gaps only** — see BA-Only Gap Detection below
6. **Persist results** as follows:
   - Short bullet summary (modules / entities / endpoints / integrations) → `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 4 — Codebase Analysis (EXISTING_PROJECT)` as Q-blocks (one Q-block per Smart Reflection Question + a leading Q-block for the auto-detected summary).
   - Domain-specific facts (entity names, endpoint groups, named integrations) → matching `*-context/project-config.json` (e.g., entities → `database-context`, endpoints → `api-context`, integrations → `api-context.externalIntegrations` or `infrastructure-context.integrations`).
   - Supplemental source pointers (API specs, business module summaries, integration lists) → `.opencode/project_init.md → ## Supplemental Source Manifest` rows for the consuming domains.
   - Optional `docs/project/ARCHITECTURE.md` only when the architecture is complex enough that a single-paragraph summary is insufficient.
   - Do NOT create a free-form "Existing Project Analysis" key=value section in the ledger — the ledger only carries Q-blocks + pointers.

---

### BA-Only Gap Detection (Alternative)

When BA-only mode is active, use this simplified gap detection instead of the standard checklist above. Only ask about **business-relevant** gaps that affect BA operations:

| Section | Gap Indicators | Clarification Trigger |
|---------|---------------|----------------------|
| **Business Modules** | Modules are unclear or overlapping, project appears to have no clear domain boundaries | Ask which business areas the project covers |
| **Architecture** | Pattern classified as unclear, unclear frontend-backend separation | Ask for a brief description of the system architecture |
| **Data Models** | No database schema or models found, entity relationships are unclear | Ask about the main data entities the project manages |
| **External Integrations** | Integration code found but purpose unclear, conflicting integration patterns | Ask which external systems the project works with |

**Do NOT ask BA users about:**
- Code quality gaps (no linting, no tests, TypeScript issues)
- Code pattern inconsistencies (mixed component styles, naming conventions)
- Dependency management issues (outdated packages, migration plans)
- API documentation format gaps (no OpenAPI spec, missing JSDoc)

**BA-Only Clarification Template:**

```
🔍 A few questions about the project (BA Mode)

{For each business-relevant gap:}

**{N}. {Area}: {Brief description}**

What I found: {description}
What would help: {what the BA might know}

- [A] {Option: provide info directly}
- [B] {Option: point to documentation/wiki}
- [C] {Option: skip — I'll figure it out during impact analysis}

{Max 2-3 questions total.}
```
