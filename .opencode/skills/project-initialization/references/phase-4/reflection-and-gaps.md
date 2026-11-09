# Phase 4 - Reflection and Gaps

> **Step file.** The mandatory Phase 4 reflection checkpoint, Smart Reflection Question generation, the gap-detection checklist, and how user clarifications are folded back into the artifacts.
>
> **Parent:** [codebase-analysis.md](../codebase-analysis.md) - Phase 4 router
> **Previous step file:** [merge-and-persist.md](merge-and-persist.md) - merge and persistence
> **BA-only run:** gap detection is replaced by the checklist in [ba-mode.md](ba-mode.md)

---

## Phase 4 Reflection Checkpoint (MANDATORY)

> **Hard gate** — formalises and replaces the older "Knowledge Gap Detection". Implements the Phase Reflection Checkpoint defined in [SKILL.md](../../SKILL.md) → "Phase Reflection Checkpoint (MANDATORY between phases)".
>
> Reflection is mandatory for EXISTING_PROJECT — even if everything looks fine, the agent MUST execute the four-question self-review and explicitly record the outcome (questions asked OR explicit "no clarifications needed — all signals high confidence").

### Reflection Step 1 — Self-review (internal, ~30s)

The agent silently answers:

1. **What did I just discover?** — list of business modules from §8, top entities from §9, endpoint groups from §10, named integrations from §11.
2. **What do I have HIGH confidence about?** — items confirmed by ≥2 signals (e.g., entity confirmed by both DB schema and a service that imports it).
3. **What do I have LOW confidence about / what is unclear / contradictory / missing?**
4. **Will Phase 5 (requirements) and Phase 6 (domain skills) produce shallow / generic / inaccurate context if (3) is left unresolved?**

### Reflection Step 2 — Decide

| Condition | Action |
|-----------|--------|
| (3) empty AND (4) == "no" | Skip questions. Append a single Q-block to `## User Answers & Decision Log → ### Phase 4 — Codebase Analysis (EXISTING_PROJECT)` with `Reflection: no — all clear` and `Question asked: none — all signals high confidence`. |
| (3) non-empty AND (4) == "yes" | Generate **1–3 Smart Reflection Questions** referencing concrete names. |
| (3) non-empty AND (4) == "no" | Mark gap as TBD; do not block. |

### Reflection Step 3 — Smart Reflection Question generation rules

- Reference **concrete names** discovered in §§8–11. Generic phrasing is forbidden when concrete names exist.
- Each question MUST contain three blocks: **What I found** + **What's unclear** + **3–4 options** (always include `[Skip — mark as TBD]`).
- Maximum 3 questions per phase. Batch related questions; never one-at-a-time.
- Persist any user-supplied paths/URLs into the relevant domain `project-config.json` `references` array.

### Smart Reflection Question Templates (use these patterns, fill with real names)

**Template A — Multi-tenancy / data isolation (when entities like `Tenant`, `Workspace`, `Account` are found):**

```
🔍 Reflection — Phase 4: Tenant isolation strategy

**What I found:**
- Entity `{TenantEntity}` (in `{schema_path}`) with FKs to {related_entities}
- Modules `{module_a}`, `{module_b}` import `{TenantEntity}` directly
- {N} migrations reference `tenant_id` column

**What's unclear:**
- Tenant data isolation strategy is not stated explicitly anywhere.

**Options:**
- [A] Schema-per-tenant (each tenant gets its own Postgres schema)
- [B] Row-level security (RLS) on shared tables
- [C] Application-level filtering only (every query manually adds `where tenant_id = ?`)
- [D] Skip — mark as TBD
```

**Template B — Payment / compliance (when SDKs like `stripe`, `paddle`, `braintree` are found):**

```
🔍 Reflection — Phase 4: Payments + compliance

**What I found:**
- Stripe SDK (`stripe@{version}`) used in `{billing_module}`
- {N} endpoints under `/api/.../payments/*` and `/api/.../webhooks/stripe`
- `STRIPE_*` env vars referenced in `{config_files}`

**What's unclear:**
- PCI DSS scope: does the service forward card data, or use Stripe Elements / Checkout / Payment Links only?
- Webhook signature verification location

**Options:**
- [A] Stripe Elements / Checkout — no card data ever touches our servers (SAQ A)
- [B] Stripe.js with custom forms — limited handling (SAQ A-EP)
- [C] Direct Stripe API with raw card data (SAQ D — full PCI scope)
- [D] Skip — mark as TBD
```

**Template C — API versioning (when both `/api/v1/*` and `/api/v2/*` are found):**

```
🔍 Reflection — Phase 4: API versioning policy

**What I found:**
- {N1} endpoints under `/api/v1/*` (in `{v1_paths}`)
- {N2} endpoints under `/api/v2/*` (in `{v2_paths}`)
- Both versions appear actively wired in the router

**What's unclear:**
- Status of v1: supported / deprecated / sunset?

**Options:**
- [A] Both supported — same feature parity
- [B] v1 deprecated — no new features, removal date: ____
- [C] v1 kept only for one client / partner: ____
- [D] Skip — mark as TBD
```

**Template D — Authentication / identity (when multiple auth signals are found):**

```
🔍 Reflection — Phase 4: Authentication strategy

**What I found:**
- `{auth_pkg_a}` referenced in `{file_a}`
- `{auth_pkg_b}` referenced in `{file_b}`
- {N} routes use `{middleware_a}`, {M} use `{middleware_b}`

**What's unclear:**
- Which auth path is canonical, which is legacy or experimental?

**Options:**
- [A] `{auth_pkg_a}` is canonical, `{auth_pkg_b}` is legacy
- [B] `{auth_pkg_b}` is canonical, `{auth_pkg_a}` is legacy
- [C] Both intentional — split by route type (explain): ____
- [D] Skip — mark as TBD
```

**Template E — External integrations purpose (when notable SDKs found):**

```
🔍 Reflection — Phase 4: Integration purpose & criticality

**What I found:**
- `{sdk_1}` in `{module_1}` — guess: {purpose_1}
- `{sdk_2}` in `{module_2}` — guess: {purpose_2}
- `{sdk_3}` in `{module_3}` — guess: {purpose_3}

**What's unclear:**
- Are these all production-critical, or experimental / in-migration?

**Options:**
- [A] All production-critical — must remain
- [B] {sdk_X} is being deprecated / migrated to: ____
- [C] Some are experimental (list): ____
- [D] Skip — mark as TBD
```

### Reflection Step 4 — Record

Append to `.opencode/project_init.md` → `## User Answers & Decision Log → ### Phase 4 — Codebase Analysis (EXISTING_PROJECT)` using the canonical Q-block format from `SKILL.md → Phase Reflection Checkpoint → Step 4`. The first entry MUST always be:

```markdown
#### Q1: Auto-detected codebase summary
- Reflection: yes
- What I found:
  - Business modules: {compact bullet list of module → purpose}
  - Top entities: {names, comma-separated}
  - Top endpoint groups: {e.g., 47 under /api/v2/*, 12 under /api/v1/*}
  - Named integrations: {SDK / service names}
  - Architecture pattern: {pattern}
- Question asked: none — discovery summary
- User answer: n/a
- Decision stored in: `<skills-root>/<domain>-context/project-config.json` (per-domain — see list below) + `## Supplemental Source Manifest` (rows updated)
- Follow-up: none / Smart Reflection Questions follow as Q2..Q4
```

Then append one Q-block per Smart Reflection Question generated in Step 3 (max 3 — Q2..Q4). For each:
- `Decision stored in:` MUST point to the authoritative artifact where the answer was persisted (e.g., `.agents/skills/api-context/project-config.json` for API versioning; `.agents/skills/security-compliance/assets/security-sources.json` for compliance pre-checks, but only when `nc-code-security-audit` is installed — otherwise route compliance-framework signals to `coding-standards-context/project-config.json → constraints.compliance[]` instead). User-provided file paths or URLs MUST also be appended to the matching `project-config.json.references` array AND mirrored in `Supplemental Source Manifest`.
- Skipped questions get `User answer: skipped — TBD` and a corresponding bullet in `## Open Gaps`.

Tick `Phase 4 reflection completed` in `## Phase Checklist`.

---

## Knowledge Gap Detection (legacy section header — kept for back-compat search)

> The content below is preserved as the **fallback gap detection checklist** used inside the Reflection Checkpoint above when generating Smart Reflection Questions.

After formatting the analysis report, the main agent MUST review each section for knowledge gaps, incomplete information, and contradictions before presenting to the user.

### Gap Detection Checklist

For each analysis section, check:

| Section | Gap Indicators | Clarification Trigger |
|---------|---------------|----------------------|
| **Entry Points** | No clear main entry point found, multiple competing entry points | Ask which is primary |
| **Architecture** | Pattern classified as "Flat/Monolithic" or "Unclear", mixed patterns detected | Ask about intended architecture |
| **Dependencies** | Major categories empty (no state mgmt detected but complex UI exists), significantly outdated packages with no migration plan | Ask about intentional choices vs oversight |
| **Code Quality** | No linting config, 0% test coverage, no TypeScript despite complex project | Ask if this is intentional or a gap to address |
| **Code Patterns** | Mixed component styles (functional + class), inconsistent naming conventions, multiple API integration approaches | Ask which is canonical |
| **API Documentation** | No API specs found but API routes exist, specs don't match actual endpoints | Ask for API documentation source or reference |

### Clarification Questions After Analysis

After presenting the analysis report, include a **Clarification Section** for any detected gaps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Clarification Needed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

During analysis, I identified the following areas that need your input
to ensure accurate domain knowledge:

{For each gap, use this format:}

**{N}. {Area}: {Brief description of gap}**

What I found: {description}
What's unclear: {specific gap or contradiction}

- [A] {Option: provide info directly}
- [B] {Option: point to file/directory/URL}
- [C] {Option: skip / mark as TBD}

{Group related gaps together — max 3 questions per phase (Reflection Step 3).}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have any additional documentation, architecture diagrams,
or wiki links that would help me understand the project better,
please share them now.

External references (optional): _________________________________
```

### Examples of Clarification Questions

**Gap: No API documentation found but API code exists**
```
1. API Documentation: Not found but API routes exist

What I found: 15 API endpoints in src/api/routes/ with Express patterns
What's unclear: No OpenAPI spec, Swagger, or API documentation was found

- [A] There is no API documentation — I'll describe the API structure
- [B] API docs are at this path/URL: _____________
- [C] We use a different documentation approach (describe): _____________
- [D] Skip — API docs will be created later
```

**Gap: Contradictory authentication patterns**
```
2. Authentication: Multiple approaches detected

What I found: JWT-based auth in src/middleware/auth.ts AND session-based auth in src/middleware/session.ts
What's unclear: Which authentication method is the current/intended approach?

- [A] JWT is the current approach (session is legacy)
- [B] Session is the current approach (JWT is experimental)
- [C] Both are used intentionally (explain): _____________
- [D] Migration in progress from ___ to ___
```

**Gap: Missing state management in complex UI**
```
3. State Management: Not detected but complex UI exists

What I found: 45 UI components, 12 pages, but no state management library detected
What's unclear: How is application state managed?

- [A] We use React Context API / built-in state only
- [B] We use a library not detected (specify): _____________
- [C] State management is a known gap we plan to address
- [D] The app is mostly server-rendered with minimal client state

---

### Processing User Clarifications

After receiving answers:

1. **Update the in-memory analysis report** with clarified information so subsequent phases use the corrected view.
2. **Read any referenced files** the user pointed to (use the Read tool — do not paste their content into the ledger).
3. **Persist external URLs and file paths** into:
   - The matching `*-context/project-config.json` `references` array (e.g., `api-context.references.openApiSpec`, `infrastructure-context.references.architectureDoc`).
   - The corresponding row in `.opencode/project_init.md → ## Supplemental Source Manifest` so Phase 6 picks them up.
4. **Record all clarifications as Q-blocks** in `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 4 — Codebase Analysis (EXISTING_PROJECT)` using the canonical format. Each Q-block's `Decision stored in:` field MUST cite the authoritative artifact where the operational decision lives (not the ledger).
5. **Proceed to Phase 5** with enriched understanding.
