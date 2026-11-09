# Phase 5 - Part 2: Architecture and Decisions

> **Step file.** Architecture questions for both modes, plus the persistence targets each answer lands in.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **Read first:** [overview.md](overview.md) - adaptive mode and the skip-by-default policy that govern every Part
> **Previous step file:** [part-1-5-api-docs.md](part-1-5-api-docs.md) - API documentation discovery
> **Next step file:** [part-3-performance.md](part-3-performance.md) - web performance requirements

---

## Part 2: Project Architecture & Decisions

This section gathers critical architectural decisions, constraints, and dependencies to ensure rules and configurations align with project requirements.

### For NEW_PROJECT

Ask progressively in **3 rounds**:

#### Round 1 - Architecture & Patterns (3 questions):
```
1. What is your overall architecture approach?
   Options: Monolith, Microservices, Modular monolith, Serverless, Jamstack, Not decided yet
   
2. What key architectural patterns will you use?
   (e.g., "MVC", "Clean Architecture", "Feature-sliced design", "Domain-Driven Design", "Event-driven")
   
3. What is your data flow strategy?
   (e.g., "REST API", "GraphQL", "tRPC", "Server-side rendering", "Client-side state management")
```

#### Round 2 - External Dependencies (3 questions):
```
4. What external services/APIs will you integrate?
   (e.g., "Stripe for payments", "Auth0 for authentication", "AWS S3 for storage", "None yet")
   
5. What databases or data stores will you use?
   (e.g., "PostgreSQL", "MongoDB", "Redis for caching", "Supabase", "Firebase", "None yet")
   
6. Are there any critical third-party libraries you must use?
   (e.g., "Company's internal UI library", "Required: Sentry for monitoring", "Specific charting library")
```

#### Round 3 - Constraints & Compliance (3 questions):
```
7. What are critical constraints or compliance requirements?
   (e.g., "GDPR compliance required", "HIPAA required", "Must work offline", "PCI DSS for payments")
   
8. Are there any known limitations or technical debt to be aware of?
   (e.g., "Legacy database schema", "Limited server resources", "Must support old iOS 13+", "None")
   
9. What deployment and infrastructure constraints exist?
   (e.g., "Must deploy to on-premise servers", "AWS only", "Kubernetes required", "Vercel/Netlify", "No constraints")
```

### For EXISTING_PROJECT

> **Follows the Proactive Clarification Principle and Skip-By-Default Policy** defined above. Run the pre-flight check before each of Round 1 / Round 2 / Round 3. If Phase 4 already provides high-confidence answers, **skip** or **ask only the gap** — never re-ask the full round.

**Round-by-round pre-flight summary:**

- **Round 1 (architecture & patterns)** — Skip if Phase 4 §3 produced a non-flat pattern with rationale. Otherwise present the detected pattern and ask only "is this intentional, or are you migrating to something else?"
- **Round 2 (external deps & databases)** — Skip the "What external services?" question if Phase 4 §11 listed concrete integrations. Replace with: "I found {Stripe, Auth0, AWS S3, …} — anything critical NOT visible in the code (internal APIs, partner APIs, corporate SSO)?" Same for databases: skip if §4 and §9 confirm ORM + entities; ask only about additional stores not in code (legacy DBs, analytics warehouses).
- **Round 3 (constraints & compliance)** — Run the **Compliance pre-check** (see Skip-By-Default Policy above). Show pre-ticked compliance frameworks based on §11 hints; user only confirms or adds. Skip if everything matches.

1. **Automatic Analysis** (extends Phase 4):
   ```
   Analyze and detect:
   - Architectural patterns from folder structure (feature-based, modular, layered)
   - External API integrations (grep for API calls, axios, fetch patterns)
   - Service configurations (AWS SDK, Auth providers, payment gateways)
   - Database connections (Prisma, Sequelize, Mongoose, etc.)
   - Monitoring/logging tools (Sentry, LogRocket, DataDog)
   - CI/CD configurations (.github/workflows, .gitlab-ci.yml)
   ```

2. **Present findings, identify gaps, and ask for clarification:**

   Review detected architecture information for gaps, contradictions, and incomplete data. Use the gap detection approach from the Proactive Clarification Principle.

   ```
   📊 Detected Architecture Information:
   
   Architecture Pattern: [Detected - e.g., "Feature-sliced design"]
   External Integrations: [Detected - e.g., "Stripe API, Firebase Auth, AWS S3"]
   Databases: [Detected - e.g., "PostgreSQL 14 with Prisma ORM"]
   Monitoring: [Detected - e.g., "Sentry for error tracking"]
   Key Libraries: [List top 5 critical dependencies with versions]
   CI/CD: [Detected - e.g., "GitHub Actions"]
   
   {If gaps or contradictions were found:}
   
   ⚠️  Information Gaps / Uncertainties:
   - [Gap 1: e.g., "Database config found (Prisma) but no migration history detected"]
   - [Gap 2: e.g., "Two different logging libraries imported (winston + pino) — unclear which is primary"]
   - [Gap 3: e.g., "Deployment configuration not found — unclear how the project is deployed"]
   
   Please confirm or correct the above, and answer — at most 3 questions in total for this
   Part (overview.md); per-gap questions count toward the 3, highest downstream impact first:

   1. What is NOT visible in the code that shapes architectural decisions — planned migrations
      (e.g. "moving to microservices"), hard constraints ("cannot change the DB schema",
      "must keep API v1 compatible"), known technical debt with a replacement plan?
      One answer covers all three; "nothing" is a valid answer.

   {For each identified gap, until the budget of 3 is used:}
   2. {Specific clarification question about the gap}
      - [A] {Option: provide information}
      - [B] {Option: point to reference/documentation}: _____________
      - [C] {Option: skip or mark as TBD}

   {Only when Phase 4 §7 / Phase 5 Part 1.5 recorded no architecture document:}
   3. Do you have architecture documentation, diagrams, or wiki pages
      that describe the overall system design?
      (Confluence pages, Notion docs, architecture decision records, etc.)

      - [A] Yes — provide path or URL: _____________
      - [B] No — the code is the only source of truth
      - [C] Partially — some aspects are documented: _____________
   ```

### Persistence Targets

> **Source-of-truth rule:** Architecture answers are split across the relevant `*-context/project-config.json` files; `development.md` carries only the high-level architecture pattern + data flow strategy. The ledger carries Q-blocks under Decision Log §5, NOT a "Project Architecture & Key Decisions" key=value section.

| Topic | Authoritative artifact | Field(s) |
|-------|------------------------|----------|
| Architecture pattern + data flow | `.opencode/rules/development.md` | `Architecture Overview`, `Data Flow Strategy` |
| Key architectural patterns | `backend-context/project-config.json` (or `frontend-context/`) | `architecture.patterns[]` |
| External integrations | `api-context/project-config.json` | `externalIntegrations[]` |
| Databases / data stores | `database-context/project-config.json` | `dataStores[]` |
| Critical compliance / SLAs | `coding-standards-context/project-config.json` (+ `security-compliance/assets/security-sources.json` when `nc-code-security-audit` is installed) | `constraints.compliance`, `constraints.sla` |
| Known technical debt | `coding-standards-context/project-config.json` | `technicalDebt[]` (also mirrored under `## Open Gaps` in the ledger) |
| Deployment & infrastructure | `infrastructure-context/project-config.json` | `deployment.*`, `cicd.*` |
| Architecture documentation pointers (wiki/Confluence/ADR) | `infrastructure-context/project-config.json.references` | `architectureDocs[]` (also mirrored in `Supplemental Source Manifest`) |

For each Round 1 / Round 2 / Round 3 question actually asked (not skipped by the pre-flight check), append one Q-block to `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 5 — Requirements`. Each Q-block's `Decision stored in:` field MUST point to one of the artifacts above (or `ledger only` for purely procedural decisions).
