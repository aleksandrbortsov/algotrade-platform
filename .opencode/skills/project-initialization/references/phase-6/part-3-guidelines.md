# Phase 6 - Part 3: Guidelines Generation

> **Step file.** Rendering each configured context skill's `references/guidelines.md` from its `project-config.json`. Concrete names and paths only - a generic guideline is a failed render, not a passing one.
>
> **Parent:** [configuration-updates.md](../configuration-updates.md) - Phase 6 router
> **Read first:** [overview.md](overview.md) - what Phase 6 produces, the render order, validation and completion actions
> **Previous step file:** [api-analysis.md](api-analysis.md) - the API sub-analysis strategy
> **Next step file:** [part-3-5-verification.md](part-3-5-verification.md) - the hard gate

---

## Part 3: Guidelines Document Generation

> **Purpose:** Render `references/template.md` for each configured domain into a project-specific `references/guidelines.md` file. This produces a **fully filled markdown reference** that AI agents read at runtime instead of the raw `{{PLACEHOLDER}}`-filled template.

**Language:** The rendered `guidelines.md` MUST be entirely **English** — headings, paragraphs, table cells (except proper nouns, paths, URLs, code tokens), and synthesized descriptions. Do not leave non-English user quotations in the body unless they are explicitly marked as verbatim external references; prefer an English gloss with optional quoted original in parentheses when needed.

**When to run:** Immediately after Part 2 — once `project-config.json` has been written for a domain, generate its `guidelines.md` before moving to the next domain.

### Why guidelines.md is Necessary

Domain SKILL.md files instruct agents to read `references/template.md` for patterns. Without rendering, agents encounter `{{PLACEHOLDER}}` tokens with no real values — defeating the purpose of initialization. The `guidelines.md` is the rendered, project-specific version that makes context immediately actionable.

| File | Role | Audience |
|------|------|---------|
| `references/template.md` | Scaffold — universal structure with `{{PLACEHOLDERS}}` | Template system (preserved across updates) |
| `project-config.json` | Structured data — project-specific values | Machine-readable (used by agents programmatically) |
| `references/guidelines.md` | **Rendered output** — filled markdown document | AI agents reading skill context at runtime |

### Generation Process Per Domain

For each domain where `project-config.json` was written in Part 2:

**Step 0 — Load supplemental sources for this domain (MANDATORY)**

Before placeholder substitution, the agent MUST consult `.opencode/project_init.md → ## Supplemental Source Manifest` to discover which Phase 4 / Phase 5 outputs apply to this domain. For each manifest row whose `Consumed by domain(s)` column lists the current domain:

1. Resolve the pointer (a file path, a URL, or a `project-config.json` field reference).
2. Read the referenced artifact when it is a local file (use the Read tool — do NOT inline its full content into `guidelines.md`; instead, summarise relevant facts inline and cite the pointer).
3. For URLs (wikis, Confluence, Notion, external docs), DO NOT fetch — record them as "External reference: <URL>" in the rendered guideline section so future runs / human readers can follow up.
4. For values already inside `project-config.json` (e.g., `endpoints`, `entities`, `externalIntegrations`), use the JSON values directly.

Then collect:
- The relevant Decision Log entries from `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 4` and `### Phase 5` whose `Decision stored in:` field cites this domain's `project-config.json` or a domain-relevant artifact (security-sources.json for security/compliance, etc.). Use them for context only — do not duplicate the Q-block format in `guidelines.md`.

> **Why this step exists:** Phase 6 must enrich rendered guidelines with the actual collected supplemental knowledge (API specs, codebase analysis, architecture wikis, performance budgets, compliance pre-checks). Without this step, `guidelines.md` would only reflect `project-config.json` values and miss the references the user explicitly attached.

**Step 1 — Read source files**
- Read `<skills-root>/<domain>-context/references/template.md`
- Read `<skills-root>/<domain>-context/project-config.json`
- Hold the supplemental sources collected in Step 0 for use during Steps 2–4 and the Domain-Specific Enrichment block.

**Step 2 — Apply placeholder substitution**

Replace every `{{PLACEHOLDER}}` token in `template.md` using the rules in the Placeholder Mapping section below.

**Step 3 — Render array fields as bullet lists**

For `patterns`, `conventions`, and `constraints` arrays in `project-config.json`, render as:

```markdown
- Pattern or convention text
- Another pattern
```

**Step 4 — Apply domain-specific enrichment**

See Domain-Specific Enrichment section for API and Coding Standards special handling. Use the supplemental sources collected in Step 0 to:
- Augment narrative sections with concrete names (modules, entities, endpoint groups, named integrations) from Phase 4.
- Add an inline `**Sources used:**` line at the end of each enriched section listing the supplemental pointers consumed (e.g., `Sources used: api-context/project-config.json.endpoints; user-provided OpenAPI spec at docs/api/openapi.yaml; Phase 4 codebase analysis (Decision Log §4 Q1)`). This makes future audits explain why a guideline appears.
- For URL-only pointers (wikis, Confluence, Notion), include them as `External reference: <URL>` in the relevant section.

**Step 5 — Handle unmapped placeholders**

For any `{{PLACEHOLDER}}` that has no corresponding value in `project-config.json`:
- If data was discussed but not collected: fill with the best available description
- If genuinely unknown: replace with `_Not configured — update when defined_`
- NEVER leave raw `{{PLACEHOLDER}}` tokens in the output file

**Step 6 — Write output**

Write the result to `<skills-root>/<domain>-context/references/guidelines.md`.

**Step 7 — English pass (mandatory)**

Before treating Part 3 as complete for this domain, re-read the written `guidelines.md` and confirm **all explanatory prose is English**. If any section is not English, rewrite that section (and align `project-config.json` source strings if they were the cause), then proceed.

---

### Placeholder Mapping Tables

#### Universal Fields (all domains)

| Template Placeholder | project-config.json Field | Rendering |
|---------------------|--------------------------|-----------|
| `{{ADDITIONAL_NOTES}}` | `projectSpecificNotes` | Plain text |

#### backend-context

| Template Placeholder | project-config.json Field | Rendering |
|---------------------|--------------------------|-----------|
| `{{RUNTIME}}` | `runtime` | Plain text |
| `{{BACKEND_FRAMEWORK}}` | `framework` | Plain text |
| `{{FRAMEWORK_VERSION}}` | `version` | Plain text |
| `{{LANGUAGE}}` | `language` | Plain text |
| `{{ARCHITECTURE_PATTERN}}` | `architecture` | Plain text |
| `{{LAYER_ORGANIZATION}}` | `configuration.layers` or synthesize from `patterns` | Bullet list if multiple |
| `{{MODULE_STRUCTURE}}` | `configuration.moduleStructure` or from `patterns` | Bullet list |
| `{{SERVICE_LAYER_PATTERNS}}` | `configuration.serviceLayer` or from `patterns` | Bullet list |
| `{{DOMAIN_MODELS}}` | From `patterns` entries mentioning models/entities | Bullet list |
| `{{VALIDATION_PATTERNS}}` | `validationLibrary` + from `patterns` | Plain text + bullets |
| `{{AUTHENTICATION}}` | `authStrategy` | Plain text |
| `{{AUTHORIZATION}}` | `configuration.authorization` or from `patterns` | Bullet list |
| `{{DATA_PROTECTION}}` | From `constraints` entries | Bullet list |
| `{{SECURITY_HEADERS}}` | From `configuration.security` or `constraints` | Bullet list |
| `{{ERROR_TYPES}}` | `errorHandling` + from `patterns` | Bullet list |
| `{{ERROR_RESPONSES}}` | `configuration.errorResponse` or from `patterns` | Plain text |
| `{{LOGGING_PATTERNS}}` | `loggingFramework` + from `patterns` | Plain text + bullets |
| `{{CACHING_STRATEGY}}` | From `patterns` entries mentioning caching | Bullet list |
| `{{QUERY_OPTIMIZATION}}` | From `patterns` | Bullet list |
| `{{RESOURCE_LIMITS}}` | From `constraints` | Bullet list |
| `{{ENV_VARIABLES}}` | `configuration.envVars` or from `constraints` | Bullet list |
| `{{CONFIG_MANAGEMENT}}` | From `configuration` object | Plain text |

#### api-context

| Template Placeholder | project-config.json Field | Rendering |
|---------------------|--------------------------|-----------|
| `{{API_STYLE}}` | `apiStyle` | Plain text |
| `{{BASE_URL}}` | `basePath` | Plain text |
| `{{VERSION_STRATEGY}}` | `configuration.versioning` | Plain text |
| `{{API_DOCS}}` | `documentationTool` or from `references` | Plain text |
| `{{ENDPOINTS_REGISTRY}}` | **See API Enrichment below** | Table |
| `{{EXTERNAL_INTEGRATIONS_REGISTRY}}` | **See API Enrichment below** | Table |
| `{{URL_STRUCTURE}}` | `configuration.urlStructure` or from `patterns` | Bullet list |
| `{{HTTP_METHODS}}` | From `patterns` | Bullet list |
| `{{REQUEST_RESPONSE_FORMAT}}` | `responseFormat` | Code block |
| `{{AUTH_METHOD}}` | `authMechanism` | Plain text |
| `{{TOKEN_MANAGEMENT}}` | From `patterns` mentioning token | Bullet list |
| `{{PERMISSION_MODEL}}` | `configuration.authorization` or from `patterns` | Bullet list |
| `{{THIRD_PARTY_SERVICES}}` | From `externalIntegrations` or `patterns` | Bullet list |
| `{{WEBHOOK_HANDLING}}` | From `patterns` mentioning webhooks | Bullet list |
| `{{RATE_LIMITING}}` | `rateLimiting` | Plain text |
| `{{ERROR_CODES}}` | From `patterns` | Bullet list |
| `{{ERROR_RESPONSE_FORMAT}}` | `responseFormat` + from `patterns` | Plain text |
| `{{RETRY_STRATEGY}}` | From `patterns` | Bullet list |
| `{{INPUT_VALIDATION}}` | From `patterns` mentioning validation | Bullet list |
| `{{SCHEMA_VALIDATION}}` | From `patterns` | Bullet list |
| `{{SANITIZATION}}` | From `patterns` | Bullet list |
| `{{VERSION_DETAILS}}` | `configuration.versioning` | Plain text |
| `{{DEPRECATION_POLICY}}` | From `constraints` | Bullet list |
| `{{BREAKING_CHANGES}}` | From `constraints` | Bullet list |
| `{{RESPONSE_TIME_TARGETS}}` | From `constraints` | Bullet list |
| `{{CACHING_HEADERS}}` | From `patterns` | Bullet list |
| `{{COMPRESSION}}` | From `patterns` | Bullet list |

#### frontend-context

| Template Placeholder | project-config.json Field | Rendering |
|---------------------|--------------------------|-----------|
| `{{FRAMEWORK}}` | `framework` | Plain text |
| `{{FRAMEWORK_VERSION}}` | `version` | Plain text |
| `{{BUILD_TOOL}}` | `buildTool` | Plain text |
| `{{STYLING}}` | `styling` | Plain text |
| `{{STATE_MANAGEMENT}}` | `stateManagement` | Plain text |
| `{{COMPONENT_ORGANIZATION}}` | `configuration.componentOrganization` or from `patterns` | Bullet list |
| `{{NAMING_CONVENTIONS}}` | From `conventions` | Bullet list |
| `{{COMPONENT_PATTERNS}}` | From `patterns` | Bullet list |
| `{{STYLING_APPROACH}}` | `styling` + from `patterns` | Plain text + bullets |
| `{{DESIGN_SYSTEM}}` | `componentLibrary` + from `patterns` | Plain text |
| `{{RESPONSIVE_DESIGN}}` | From `patterns` mentioning responsive | Bullet list |
| `{{LOCAL_STATE_PATTERNS}}` | From `patterns` mentioning local state | Bullet list |
| `{{GLOBAL_STATE_PATTERNS}}` | `stateManagement` + from `patterns` | Plain text + bullets |
| `{{DATA_FETCHING_PATTERNS}}` | From `patterns` mentioning fetch/query | Bullet list |
| `{{LCP_TARGET}}` | `configuration.webVitals.lcp` | Plain text |
| `{{FID_TARGET}}` | `configuration.webVitals.fid` | Plain text |
| `{{CLS_TARGET}}` | `configuration.webVitals.cls` | Plain text |
| `{{FCP_TARGET}}` | `configuration.webVitals.fcp` | Plain text |
| `{{TTI_TARGET}}` | `configuration.webVitals.tti` | Plain text |
| `{{JS_BUDGET}}` | `configuration.bundleBudget.js` | Plain text |
| `{{CSS_BUDGET}}` | `configuration.bundleBudget.css` | Plain text |
| `{{TOTAL_BUDGET}}` | `configuration.bundleBudget.total` | Plain text |
| `{{OPTIMIZATION_STRATEGIES}}` | From `patterns` | Bullet list |
| `{{WCAG_LEVEL}}` | `configuration.accessibility` | Plain text |
| `{{A11Y_REQUIREMENTS}}` | From `constraints` | Bullet list |
| `{{BROWSER_SUPPORT}}` | From `constraints` | Bullet list |

#### database-context

| Template Placeholder | project-config.json Field | Rendering |
|---------------------|--------------------------|-----------|
| `{{PRIMARY_DATABASE}}` | `databaseType` | Plain text |
| `{{ORM}}` | `framework` | Plain text |
| `{{CACHE_SOLUTION}}` | From `patterns` or `constraints` | Plain text |
| `{{SEARCH_ENGINE}}` | From `patterns` or `constraints` | Plain text |
| `{{NAMING_CONVENTIONS}}` | `namingConvention` + from `conventions` | Bullet list |
| `{{DATA_TYPES}}` | From `patterns` | Bullet list |
| `{{RELATIONSHIPS}}` | From `patterns` mentioning relations | Bullet list |
| `{{INDEXES}}` | From `patterns` mentioning index | Bullet list |
| `{{MODEL_DEFINITIONS}}` | From `patterns` | Bullet list |
| `{{QUERY_PATTERNS}}` | From `patterns` mentioning query | Bullet list |
| `{{LOADING_STRATEGIES}}` | From `patterns` mentioning eager/lazy | Bullet list |
| `{{MIGRATION_STRATEGY}}` | `migrationTool` + from `patterns` | Plain text + bullets |
| `{{MIGRATION_NAMING}}` | `namingConvention` + from `conventions` | Plain text |
| `{{ROLLBACK_POLICY}}` | From `patterns` or `constraints` | Bullet list |
| `{{QUERY_GUIDELINES}}` | From `patterns` | Bullet list |
| `{{N_PLUS_ONE_PREVENTION}}` | From `patterns` | Bullet list |
| `{{PAGINATION}}` | From `patterns` mentioning pagination | Bullet list |
| `{{CONSTRAINTS}}` | From `constraints` | Bullet list |
| `{{VALIDATION}}` | From `patterns` | Bullet list |
| `{{TRANSACTIONS}}` | From `patterns` mentioning transaction | Bullet list |
| `{{BACKUP_STRATEGY}}` | From `constraints` or `patterns` | Bullet list |
| `{{RECOVERY_PROCEDURES}}` | From `constraints` | Bullet list |
| `{{SOFT_DELETE}}` | `softDelete` | Plain text |
| `{{AUDIT_STRATEGY}}` | `auditStrategy` | Plain text |

#### testing-context

| Template Placeholder | project-config.json Field | Rendering |
|---------------------|--------------------------|-----------|
| `{{UNIT_TEST_FRAMEWORK}}` | `framework` | Plain text |
| `{{INTEGRATION_FRAMEWORK}}` | `configuration.integrationFramework` or `framework` | Plain text |
| `{{E2E_FRAMEWORK}}` | `e2eFramework` or from `patterns` | Plain text |
| `{{COVERAGE_TOOL}}` | `configuration.coverageTool` | Plain text |
| `{{TESTING_PYRAMID}}` | From `patterns` | Bullet list |
| `{{TEST_SCOPE}}` | From `patterns` | Bullet list |
| `{{UNIT_TEST_PATTERNS}}` | From `patterns` mentioning unit | Bullet list |
| `{{MOCKING_STRATEGY}}` | `configuration.mockStrategy` or from `patterns` | Bullet list |
| `{{UNIT_TEST_NAMING}}` | From `conventions` | Bullet list |
| `{{INTEGRATION_SCOPE}}` | From `patterns` mentioning integration | Bullet list |
| `{{DATABASE_TESTING}}` | From `patterns` mentioning db/database | Bullet list |
| `{{API_TESTING}}` | From `patterns` mentioning api | Bullet list |
| `{{E2E_SCOPE}}` | From `patterns` | Bullet list |
| `{{E2E_SCENARIOS}}` | From `patterns` | Bullet list |
| `{{E2E_ENVIRONMENT}}` | From `constraints` | Bullet list |
| `{{MINIMUM_COVERAGE}}` | `configuration.coverage.minimum` | Plain text |
| `{{STATEMENT_COVERAGE}}` | `configuration.coverage.statements` | Plain text |
| `{{BRANCH_COVERAGE}}` | `configuration.coverage.branches` | Plain text |
| `{{FUNCTION_COVERAGE}}` | `configuration.coverage.functions` | Plain text |
| `{{LINE_COVERAGE}}` | `configuration.coverage.lines` | Plain text |
| `{{CRITICAL_PATHS}}` | From `patterns` | Bullet list |
| `{{FIXTURES}}` | From `patterns` | Bullet list |
| `{{FACTORIES}}` | From `patterns` | Bullet list |
| `{{SEEDING}}` | From `patterns` | Bullet list |
| `{{TEST_PIPELINE}}` | From `configuration` | Bullet list |
| `{{PARALLEL_TESTING}}` | From `patterns` | Plain text |
| `{{FLAKY_TESTS_POLICY}}` | From `constraints` | Bullet list |

#### infrastructure-context

| Template Placeholder | project-config.json Field | Rendering |
|---------------------|--------------------------|-----------|
| `{{CLOUD_PROVIDER}}` | `cloudProvider` | Plain text |
| `{{CONTAINER_PLATFORM}}` | `containerPlatform` | Plain text |
| `{{ORCHESTRATION}}` | `orchestration` | Plain text |
| `{{CICD_TOOL}}` | `cicdTool` | Plain text |
| `{{DEPLOYMENT_METHOD}}` | `deploymentStrategy` + from `patterns` | Plain text + bullets |
| `{{ENVIRONMENT_STRATEGY}}` | From `patterns` mentioning environment | Bullet list |
| `{{RELEASE_PROCESS}}` | From `patterns` | Bullet list |
| `{{PIPELINE_STAGES}}` | From `patterns` | Bullet list |
| `{{BUILD_PROCESS}}` | From `patterns` | Bullet list |
| `{{AUTOMATED_TESTS}}` | From `patterns` mentioning test | Bullet list |
| `{{DEPLOYMENT_TRIGGERS}}` | From `patterns` | Bullet list |
| `{{DOCKER_CONFIG}}` | From `patterns` mentioning docker | Bullet list |
| `{{IMAGE_MANAGEMENT}}` | From `patterns` | Bullet list |
| `{{CONTAINER_SECURITY}}` | From `constraints` | Bullet list |
| `{{ENVIRONMENT_TYPES}}` | From `patterns` | Bullet list |
| `{{CONFIG_MANAGEMENT}}` | From `patterns` | Bullet list |
| `{{SECRETS_MANAGEMENT}}` | From `constraints` | Bullet list |
| `{{MONITORING_TOOLS}}` | `monitoring` + from `patterns` | Plain text + bullets |
| `{{LOGGING_STRATEGY}}` | From `patterns` mentioning logging | Bullet list |
| `{{ALERTING_RULES}}` | From `patterns` | Bullet list |
| `{{METRICS_COLLECTION}}` | From `patterns` | Bullet list |
| `{{SCALING_STRATEGY}}` | From `patterns` | Bullet list |
| `{{LOAD_BALANCING}}` | From `patterns` | Bullet list |
| `{{AUTOSCALING_RULES}}` | From `constraints` or `patterns` | Bullet list |
| `{{BACKUP_STRATEGY}}` | From `patterns` or `constraints` | Bullet list |
| `{{RECOVERY_PROCEDURES}}` | From `constraints` | Bullet list |
| `{{RTO_RPO_TARGETS}}` | From `constraints` | Bullet list |
| `{{NETWORK_SECURITY}}` | From `constraints` | Bullet list |
| `{{ACCESS_CONTROL}}` | From `constraints` | Bullet list |
| `{{COMPLIANCE}}` | From `constraints` | Bullet list |

#### coding-standards-context

| Template Placeholder | project-config.json Field | Rendering |
|---------------------|--------------------------|-----------|
| `{{LANGUAGE}}` | `language` | Plain text |
| `{{FRAMEWORK}}` | `framework` | Plain text |
| `{{FRAMEWORK_VERSION}}` | `version` | Plain text |
| `{{DOCUMENTATION_CONVENTION}}` | `documentationConvention` or from `conventions` | Plain text |
| `{{DI_PATTERNS}}` | `dependencyInjectionPattern` + from `patterns` | Plain text + bullets |
| `{{DOCUMENTATION_RULES_BY_LAYER}}` | From `patterns` mentioning doc | Bullet list |
| `{{NAMING_CONVENTIONS}}` | From `conventions` mentioning naming | Bullet list |
| `{{METHOD_NAMING}}` | From `conventions` mentioning method/function | Bullet list |
| `{{FIELD_DECLARATION_ORDER}}` | From `conventions` | Bullet list |
| `{{ANNOTATION_ORDER}}` | From `conventions` mentioning annotation/decorator | Bullet list |
| `{{ERROR_HANDLING_PATTERNS}}` | From `patterns` mentioning error | Bullet list |
| `{{EXAMPLES}}` | From `projectSpecificNotes` or "See codebase for canonical examples" | Plain text |
| `{{TDD_POLICY}}` | `testing.tddPolicy` | Plain text — `mandatory` \| `recommended` \| `optional` \| `not-used` |
| `{{TDD_MANDATORY_CATEGORIES}}` | `testing.mandatoryCategories` | Bullet list (or `_None_` if empty) |
| `{{TEST_FRAMEWORK}}` | `testing.framework` | Plain text |
| `{{E2E_FRAMEWORK}}` | `testing.e2eFramework` | Plain text (or `_Not used_`) |
| `{{COVERAGE_TOOL}}` | `testing.coverageTool` | Plain text |
| `{{TEST_RUN_COMMAND}}` | `testing.runCommand` | Inline code |
| `{{TEST_RUN_ALL_COMMAND}}` | `testing.runAllCommand` | Inline code |
| `{{TEST_WATCH_COMMAND}}` | `testing.watchCommand` | Inline code (or `_Not configured_`) |
| `{{TEST_FILE_NAMING}}` | `testing.fileNaming` | Plain text |
| `{{TEST_FILE_LOCATION}}` | `testing.fileLocation` | Plain text |
| `{{TEST_NAME_STYLE}}` | `testing.nameStyle` | Plain text |
| `{{MOCKING_STRATEGY}}` | `testing.mockingStrategy` | Plain text |
| `{{COVERAGE_STATEMENTS}}` | `testing.coverageThresholds.statements` | Plain text (e.g. `80%`) |
| `{{COVERAGE_BRANCHES}}` | `testing.coverageThresholds.branches` | Plain text |
| `{{COVERAGE_FUNCTIONS}}` | `testing.coverageThresholds.functions` | Plain text |
| `{{COVERAGE_LINES}}` | `testing.coverageThresholds.lines` | Plain text |
| `{{COVERAGE_ENFORCEMENT}}` | `testing.coverageThresholds.enforcement` | Plain text |
| `{{TEST_OUTPUT_DIR}}` | `testing.outputDir` (default `tests_output/`) | Inline code |
| `{{TEST_CI_INTEGRATION}}` | `testing.ciIntegration` | Plain text (or `_Not configured_`) |
| `{{TDD_TASKMASTER_USAGE}}` | `testing.taskmasterUsage` | Plain text — `always` \| `complex-only` \| `never` |
| `{{TDD_NOTES}}` | `testing.notes` or `_None_` | Plain text |

> **TDD policy fields** (Part 2 — `coding-standards-context` is in `coreContextSkills`, so every field is always resolved; they are **fields with defaults, not a question list**):
>
> | Field | Derive from | Default | Ask? |
> |---|---|---|---|
> | `testing.tddPolicy` | — (team preference, not observable in code) | `recommended` | **Yes** — the one question this block surfaces (`mandatory` / `recommended` / `optional` / `not-used`) |
> | `testing.mandatoryCategories` | — | none | Only when the policy is `recommended` or `optional`; folded into the same prompt ("any categories where TDD is mandatory anyway — domain logic, API endpoints, regression fixes?") |
> | `testing.framework`, `testing.e2eFramework`, `testing.coverageTool` | `package.json` / `pyproject.toml` / `pom.xml` / `go.mod`; `jest.config*`, `vitest.config*`, `playwright.config*`, `cypress.config*`; Phase 4 §5 | `_Not configured_` | Only when nothing is detectable and the policy is not `not-used` |
> | `testing.coverageThresholds.*`, `enforcement` | `jest` / `vitest` coverage config, `.nycrc`, CI thresholds | `80% statements / 75% branches / 80% functions / 80% lines`, `CI fails below threshold` | Never — defaults are written as `auto-filled — default` |
> | `testing.fileNaming`, `testing.fileLocation`, `testing.nameStyle` | existing test files (Phase 4 §5) | `*.test.<ext>` co-located in `__tests__/`; `*.spec.<ext>` for e2e | Never when tests exist; defaults otherwise |
> | `testing.runCommand`, `runAllCommand`, `watchCommand`, `ciIntegration` | package scripts, CI workflow files | `_Not configured_` | Never |
> | `testing.outputDir` | `.gitignore`, an existing `tests_output/` | `tests_output/` (must be gitignored) | Never |
> | `testing.taskmasterUsage` | — | `complex-only` | Folded into the TDD-policy prompt only when the TaskMaster MCP server is configured |
>
> All values are written into `project-config.json → testing.*`; the Part 3 renderer fills the placeholders above; Part 3.5 **hard gate** verifies the rendered "TDD Policy" section contains no `{{...}}` tokens.

---

### Domain-Specific Enrichment

#### API Domain: Endpoints & Integrations Registries

The API domain's `guidelines.md` must include the actual endpoints and integrations discovered during Phase 4 and Phase 6 Explore subagent analysis. This is the most important enrichment step.

**Step 1 — Gather data**

Retrieve the endpoints and integrations from authoritative artifacts (in order of preference):
1. `.agents/skills/api-context/project-config.json` → `endpoints[]` and `externalIntegrations[]` (this is where Phase 4 + Phase 5 + Phase 6 results were merged).
2. `.opencode/project_init.md → ## Supplemental Source Manifest` rows "Endpoint analysis" and "API specifications" — verify pointers; if a row points to an OpenAPI/GraphQL/Protobuf spec file, read it (Step 0) and reconcile any extra endpoints/integrations into `api-context/project-config.json` BEFORE rendering the registries.
3. Decision Log §4 Q1 (Phase 4 auto-summary) and §5 Q-blocks for API rounds — use for audit context only.

**Step 2 — Render Endpoints Registry**

Replace `{{ENDPOINTS_REGISTRY}}` with a table of all discovered internal endpoints:

```markdown
| Method | Path | Description | Auth | Source File |
|--------|------|-------------|------|-------------|
| GET | /api/v1/users | List users | Required | controller/user_controller.go |
| POST | /api/v1/users | Create user | Required | controller/user_controller.go |
| ... | ... | ... | ... | ... |
```

If no endpoints were discovered: `_No endpoints discovered. Run codebase scan or populate manually._`

**Step 3 — Render External Integrations Registry**

Replace `{{EXTERNAL_INTEGRATIONS_REGISTRY}}` with a table of external services found:

```markdown
| Service | SDK/Client | Source File(s) | Purpose |
|---------|-----------|----------------|---------|
| Cloud Core | internal SDK | container/container.go | Policy auth |
| PostgreSQL | database driver | dataaccess/ | Primary database |
```

If no integrations found: `_No external integrations detected. Populate manually._`

#### API Domain: Populate Endpoint Detail Templates

If there are fewer than 20 endpoints, generate a detail block for each using the `### [METHOD] /path` template format already in `template.md`. Use data from the Explore subagent analysis for authentication requirements and response types where available.

---

### Output Confirmation

After generating each domain's `guidelines.md`, confirm to the user:

```
✅ guidelines.md generated for {domain}-context
   Placeholders resolved: {N}
   Unmapped (marked as "Not configured"): {M}
   English: verified (project-config.json + guidelines.md)
   [API only] Endpoints included: {count}
   [API only] External integrations included: {count}
   
   Path: .opencode/skills/{domain}-context/references/guidelines.md
```

After all domains are processed, include in the summary:

```
Part 3: Guidelines Documents Generated
✅ {domain}-context → references/guidelines.md
✅ {domain}-context → references/guidelines.md
...
```
