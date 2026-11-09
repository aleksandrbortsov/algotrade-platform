# Phase 5 - Overview

> **Step file.** Read this before any Part. It defines Adaptive Mode (which supersedes the literal "Round N" structure inside the Parts), the skip-by-default policy for EXISTING_PROJECT, the confidence scoring rules, and the Phase 5 completion actions.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **BA-only run:** [ba-mode.md](ba-mode.md) replaces the Parts entirely

---

## Phase 5: Components & Requirements

This phase collects comprehensive information about:
1. Project components and their purpose
1.5. API documentation discovery and confirmation (validates Phase 4 findings, allows user to provide API resource pointers)
2. Architecture approach and key decisions
3. Web performance requirements (only when `performance-context` is installed and the project has a web surface — defaults are written, questions only with the `performance` role)
4. General requirements and constraints (derived from code signals; at most one batched question; skipped for non-web projects)
5. Security requirements and BASS Security Guides selection

---

## Adaptive Mode for Phase 5 (MANDATORY — supersedes the literal "Round N" structure below)

> **Hard rule.** The "Round 1 / Round 2 / Round 3" headings inside Parts 1–5 below are a **template library**, not a script. Phase 5 follows the project-wide [Adaptive Question Principle](../../SKILL.md#adaptive-question-principle-project-wide-rule): the agent inventories what is already known, scores confidence per required field, and asks only what cannot be derived. The number of questions per Part can be **0**, and that is the preferred outcome whenever it is honest.

### How the existing "Round" blocks map to the adaptive flow

For every Part below:

1. **Inventory** sources of truth (in this order):
   - `metadata.json → project.*` (audience, goals — sets defaults for Parts 1, 4, 5)
   - `development.md → Technology Stack` (Phase 3 — implies many Part 1, 3, 4 answers)
   - Per-domain `project-config.json` populated by Phase 4 (entities, endpoints, integrations, business modules)
   - `Supplemental Source Manifest` rows (any user-supplied API specs / architecture docs / DB schemas)
   - Phase 4 Decision Log Q-blocks
   - Selected role(s) and BA-Only mode (drives which Parts are even applicable — see "BA-Only Requirements Adaptation" above)

2. **Default reasoning before any question.** Apply role × audience × stack × Phase 4 findings to derive a candidate answer per required field with HIGH/MED/LOW confidence. Use general industry knowledge (a B2C consumer web app with millions of users implies tight CWV budgets; a B2B SaaS API for fintech implies PCI DSS + audit logging; a public-facing site implies a11y + SEO baseline). Do not encode lookup tables here.

3. **Generate ONLY gap questions.** The same rule the rest of initialization uses:

| Confidence after Step 2 | Action |
|---|---|
| **HIGH** on every required field of the Part | Ask **0** questions. Print a single confirmation line ("Part {N} auto-derived from <sources>: <one-line summary>. Press Enter to accept or list overrides.") |
| **HIGH on most, MEDIUM on a few** | Ask only the MEDIUM/LOW items, batched into 1–3 questions max, each citing concrete names already known. |
| **LOW / empty** | Fall back to the round template below as a starting set of options — but still **filter** options against role/stack to avoid offering irrelevant choices (e.g. don't offer mobile a11y patterns to a backend-only project). |

4. **Maximum 3 questions per Part across all its rounds combined.** Reflection is for critical ambiguity, not form-filling. If more than 3 items are LOW after Step 2, the top 3 by downstream impact are asked; the rest go to `## Open Gaps`. Rank by the priority order in [SKILL.md → Adaptive Question Principle](../../SKILL.md#adaptive-question-principle-project-wide-rule): architecture and domain contracts (Parts 1.5, 2) come first; non-functional targets with a safe default (Parts 3, 4) are written as `auto-filled — default` and never displace them.

5. **Compliance pre-check (Parts 2/5)** — keep using the table further below. Pre-checked items are confirmations, not questions.

### When to fall back to the literal Round bodies

Only when **no signal at all** is available for the field (NEW_PROJECT with minimal metadata + no role match + no analogous Phase 4 data). In that case the round body below acts as a starting menu — but the agent still:
- Picks the **single most informative question** for that field, never all of them.
- Filters options against the project's role / stack / audience.
- Includes `[Skip — mark as TBD]` always.

> The legacy heading **"Skip-By-Default Policy for EXISTING_PROJECT"** below is the EXISTING_PROJECT specialisation of this Adaptive Mode. Both are now driven by the same confidence-scoring loop; they only differ in how rich the inventory is at Step 1 (Phase 4 produces a dense map for EXISTING; metadata + role + stack only for NEW).

---

## Skip-By-Default Policy for EXISTING_PROJECT (specialisation of Adaptive Mode)

> **Hard rule for EXISTING_PROJECT:** every round of every Part below becomes **skip-by-default** if Phase 4 already provides the answer with high confidence. The agent MUST run the inventory + confidence loop before each round and either skip silently, ask only the missing items, or fall back to the round template if Phase 4 produced nothing.

### Pre-flight check (run before each round)

```
For each round R in {Part 1, Part 1.5, Part 2 R1/R2/R3, Part 3, Part 4, Part 5 R1}:
  Look up Phase 4 results from the AUTHORITATIVE artifacts (NOT the ledger):
    - per-domain `project-config.json` populated in Phase 4
      (database-context.entities, api-context.endpoints / externalIntegrations,
       backend-context.businessModules, coding-standards-context.*, etc.)
    - `.opencode/project_init.md → ## Supplemental Source Manifest` (pointers only)
    - `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 4`
      (Q1 auto-summary + clarification answers)

    derived = extract_relevant_data_for(R)
    confidence = score(derived)   // see scoring rules below

  Decide:
    confidence == HIGH and complete  → SKIP the entire round.
                                        Print one-line summary
                                        ("Round R skipped — covered by Phase 4: {derived}")
                                        and proceed.
    confidence == HIGH but partial   → Ask ONLY the missing items, NOT the whole round.
                                        Phrase questions with concrete names from Phase 4
                                        (e.g., "I found Stripe + Auth0 + AWS S3 — anything else
                                        critical that's NOT visible in code?").
    confidence == LOW or empty       → Ask the round in full (legacy flow).
```

### Confidence scoring rules

| Round | Phase 4 source | HIGH confidence when... |
|-------|----------------|--------------------------|
| Part 1 (components) | §6 patterns + §8 business modules | ≥3 modules with names + folder paths discovered |
| Part 1.5 (API docs) | §7 API discovery + §10 endpoint groups | ≥1 confirmed API spec OR endpoint groups inventory present |
| Part 2 R1 (architecture) | §3 architecture pattern | non-flat pattern detected with rationale |
| Part 2 R2 (external deps) | §11 named integrations | ≥1 concrete SDK/service name listed with purpose |
| Part 2 R2 (databases) | §4 dependencies (Prisma/TypeORM/etc) + §9 entities | ORM detected AND ≥3 entities found |
| Part 2 R3 (compliance) | §11 integrations + naming heuristics | compliance hint flagged in §11 (Stripe → PCI; HIPAA-named files; GDPR env vars) |
| Part 3 (performance) | repo perf configs (`lighthouserc*`, `budget.json`, `size-limit` / `bundlesize`, `web-vitals` reporting) + Phase 3 framework | a config with explicit numbers exists; otherwise the industry defaults are written silently — a question only with the `performance` role |
| Part 4 (general) | `browserslist`, `engines`, `tsconfig.target`, a11y lint plugins, SSR framework, i18n libraries, PWA manifest (Phase 4 §4 / §6 + repo files) | the signal is present; a missing signal takes the default from part-4-general.md — at most one batched question, only for public-facing surfaces |
| Part 5 R1 (security) | §11 + §3 (web vs API) + naming heuristics | same as Part 2 R3 |

### Compliance pre-check (auto, before Part 2 R3 / Part 5 R1)

When Phase 4 §11 lists certain integrations, the agent MUST pre-mark applicable compliance frameworks in the question UI rather than asking from scratch:

| Detected signal | Pre-check |
|-----------------|-----------|
| `stripe`, `paddle`, `braintree`, `square`, `adyen` | PCI DSS — likely required |
| `auth0` + EU env / `eu-` region | GDPR — likely required |
| `firebase-admin` with `users` collection | GDPR — likely required if EU users |
| HIPAA-suggestive names (`patient`, `phi`, `hipaa`, `medical`, `clinical`) | HIPAA — likely required |
| Files / env vars containing `gdpr`, `dsar`, `right_to_be_forgotten` | GDPR — confirmed |
| `aws-sdk` + `kms` / `secretsmanager` + financial terms | SOC 2 — likely |

The pre-checked items appear as **already-ticked options** in the UI; the user only confirms or de-ticks. If Phase 4 found nothing relevant, fall back to the standard "select from list" question.

### Skip-by-default question template (use when partial coverage)

```
🔍 Phase 5 — Round {R}: {Topic}

**What Phase 4 already told me (high confidence):**
- {bullet list with concrete names}

**Pre-checked from analysis:**
- {pre-checked items, if any}

**Only one open question:**
{the single missing item, e.g., "anything critical NOT visible in code?"}

  [A] No — the list above is complete
  [B] Yes — add: __________
  [C] Skip — mark as TBD
```

> NEW_PROJECT runs the same Adaptive Mode (above) but with a thinner inventory (no Phase 4 data). The agent still scores confidence per field from `metadata.json` + `development.md` + role and asks only the gaps. Round bodies below act as fallback menus when reasoning produces no candidate.

---

## MANDATORY: Phase Completion Actions

> **These actions are REQUIRED before Phase 5 can be considered complete.**
> **The agent MUST NOT proceed to Phase 6 without completing ALL of them.**

> **Source-of-truth rule (v3.1.0+):** Phase 5 collects a lot of information, but `.opencode/project_init.md` does NOT carry sections like "Project Components & Their Purpose", "API Documentation Sources", "Project Architecture & Key Decisions", "Web Performance Requirements", "Constraints & Requirements", or "Security Requirements". All such content lives in the matching `*-context/project-config.json` (and, when the `nc-code-security-audit` package is installed, `security-compliance/assets/security-sources.json` for BASS guide selections). The ledger only carries Q-blocks under Decision Log §5 and pointer rows in `Supplemental Source Manifest`.

After completing Phase 5:

1. **Persist operational facts to authoritative artifacts** (use the per-Part Persistence Targets tables above):
   - Components / business modules → `backend-context` or `frontend-context` `project-config.json.businessModules` / `components`
   - API specifications & inventory → `api-context/project-config.json` (`references`, `endpoints`, `middleware`, `schemas`, `externalIntegrations`)
   - Architecture & data flow summary → `.opencode/rules/development.md`
   - Architecture patterns, integrations, dependencies → matching `*-context/project-config.json`
   - Databases / data stores → `database-context/project-config.json`
   - Performance targets → `performance-context/project-config.json`
   - Compliance + custom security + report distribution → `security-compliance/assets/security-sources.json` and `coding-standards-context/project-config.json` (compliance constraints)
   - General constraints (browsers, a11y level, SEO, offline, multi-language) → `coding-standards-context/project-config.json.constraints`

2. **Update `Supplemental Source Manifest`** rows for: API specifications, Endpoint analysis, Architecture description (if user provided wiki/Confluence/ADR), Database schema files (if opted in), API test files (if opted in), BASS Security Guides selection, Performance budgets, Compliance pre-checks. Each row must point to a real artifact path or be set to `none — <reason>`.

3. **Append the audit trail** to `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 5 — Requirements`:
   - One Q-block per Part actually engaged (Part 1, Part 1.5, Part 2 Rounds, Part 3, Part 4, Part 5 Rounds).
   - Skipped Parts/rounds (BA mode, skip-by-default, user "skip" answers) MUST get an explicit Q-block with `User answer: skipped (<reason>)`.
   - Compliance pre-check results (auto-detected frameworks) MUST be captured as a dedicated Q-block.
   - Every `Decision stored in:` field points to the authoritative artifact (per the Persistence Targets tables), never to the ledger.

4. **Update `Artifact Pointers`** rows for the per-domain `project-config.json` files that received content (set to `populated`). Set `Optional architecture doc` to `yes — created` only if `docs/project/ARCHITECTURE.md` was actually written.

5. **Mirror open gaps** — every TBD answer or "Skip — mark as TBD" choice gets a bullet under `## Open Gaps` with `gap`, `source phase = 5 (Part X)`, `owner`, `suggested follow-up`.

6. **Tick checkboxes** — `Phase 5` AND `Phase 5 reflection completed` in `## Phase Checklist`.

7. **Verify** — Re-read each updated `project-config.json`; confirm no `[TO_BE_FILLED]` placeholders remain in domains that were configured. Confirm Decision Log §5 has at least one Q-block per engaged Part. Confirm the ledger does NOT contain a duplicated long-form requirements section.

8. **Show progress:** `✅ Requirements gathered (5/9 phases complete) — facts persisted to domain configs; pointers in Supplemental Source Manifest`
