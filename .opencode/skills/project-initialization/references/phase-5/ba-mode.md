# Phase 5 - BA-Only Mode

> **Step file.** Read this **only** when every selected role is `ba`. It replaces all five Parts with their simplified BA equivalents (Parts 1.5 and 3 are skipped outright) and defines the BA phase-completion actions.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **Gate:** if BA is combined with any developer role, ignore this file and use the standard Parts.

---

## BA-Only Requirements Adaptation

Before starting Part 1, check if the user selected **only** the BA role (no developer roles combined):

```
If ALL selected roles are `ba` (no developer roles like frontend, backend, fullstack, etc.):
  → Use the BA-Only flow for each part as defined below, then proceed to Phase 6
```

If BA is combined with developer roles, skip this section and use the standard flow for all parts.

### BA-Only Flow Per Part

| Part | Standard Flow | BA-Only Flow |
|------|--------------|-------------|
| **Part 1: Components** | NEW: 2 questions. EXISTING: scan + confirm | NEW: 1 question (see below). EXISTING: auto-scan, present summary only, no confirmation |
| **Part 1.5: API Docs** | 3 rounds (6 questions) + optional Explore | **Skip entirely** |
| **Part 2: Architecture** | NEW: 3 rounds (9 questions). EXISTING: auto + confirm + gaps | NEW: 2 questions only. EXISTING: present findings, 1 question |
| **Part 3: Web Performance** | 2 rounds (7 questions) for Frontend projects | **Skip entirely** |
| **Part 4: General Requirements** | 5 questions | 1 question (rephrased for BA) |
| **Part 5: Security** | 2 rounds (4 questions) | Round 1 only (2 questions) |

### BA-Only Part 1: Components (Simplified)

**For NEW_PROJECT:**

```
📋 Project Features (BA Mode)

1. What are the main features or business areas of the application?
   (e.g., "User management, Billing, Reporting, Notifications")
```

Persist the answer into the matching `*-context/project-config.json.businessModules` (typically `backend-context` or `frontend-context`, depending on roles). Append a single Q-block to `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 5 — Requirements` (`Decision stored in:` field points to the `project-config.json` path).

**For EXISTING_PROJECT:**

Auto-scan component files as in the standard flow. Present the summary to the user without asking for confirmation or corrections. Add a note: "Components auto-discovered (BA mode)".

### BA-Only Part 1.5: API Documentation — SKIP

Append a Q-block to `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 5 — Requirements`:

```markdown
#### Q{n}: API documentation discovery (BA mode)
- What I found: BA-only project — Part 1.5 not relevant
- Question asked: none — auto-skipped
- User answer: skipped (BA mode)
- Decision stored in: ledger only (no domain config update); `Supplemental Source Manifest` row "API specifications" set to `none — BA mode`
- Follow-up: API structure will be analyzed at runtime during `/ba-impact-analysis`
```

### BA-Only Part 2: Architecture (Simplified)

**For NEW_PROJECT:**

Ask 2 questions in a single round:

```
📋 Architecture Overview (BA Mode)

1. What is the overall architecture approach?
   (e.g., "Monolith", "Microservices", "Modular monolith", "Not sure")

2. What are the main external integrations?
   (e.g., "Stripe for payments, Auth0 for login, PostgreSQL database", "None yet", "Not sure")
```

Skip Rounds 2-3 (external dependencies details, constraints & compliance).

**For EXISTING_PROJECT:**

Present auto-detected architecture findings from Phase 4. Ask one question:

```
Are there critical architectural constraints or business rules
that are not visible in the code?
(e.g., "Planning migration to microservices", "Must maintain backward compatibility with API v1")

- [A] Yes (describe): _____________
- [B] No — the code reflects the current state well
- [C] Not sure
```

### BA-Only Part 3: Web Performance — SKIP

Append a Q-block to `.opencode/project_init.md → ## User Answers & Decision Log → ### Phase 5 — Requirements`:

```markdown
#### Q{n}: Web performance requirements (BA mode)
- What I found: BA-only project — Part 3 not relevant
- Question asked: none — auto-skipped
- User answer: skipped (BA mode)
- Decision stored in: ledger only; `performance-context/project-config.json` left at defaults (or `initialized: false`)
- Follow-up: none
```

### BA-Only Part 4: General Requirements (Simplified)

Ask one question rephrased for a BA audience:

```
📋 Business Constraints (BA Mode)

Are there important business constraints the project operates under?
(e.g., "Must comply with GDPR", "Supports 3 languages",
 "Telecom domain", "Multi-tenant architecture", "Regulated industry")

Your input (or "none"):
_________________________________
```

Skip questions about performance goals, browser support, accessibility level, and SEO.

### BA-Only Part 5: Security (Simplified)

Keep **Round 1 only** (compliance standards + BASS guide selection). Question 2 (BASS guide selection) is subject to the same **Gate Check** as the full flow (see Part 5 below) — ask it only if `.opencode/skills/security-compliance/assets/security-sources.json` exists (i.e., `nc-code-security-audit` is installed):

```
🔒 Security & Compliance (BA Mode)

1. Does your project need to comply with specific security standards?
   Options:
   - PCI DSS (payment processing)
   - HIPAA (healthcare data)
   - SOC 2 (service organization controls)
   - GDPR (data protection)
   - ISO 27001 (information security)
   - Custom corporate standards (describe)
   - None / Not sure

2. [Gated — only if nc-code-security-audit is installed] Which BASS Security Guides should be
   enforced in this project?
   Options:
   - Audit Logging Guide (security event logging)
   - Web Security Headers Guide (HTTP security headers)
   - Authenticators Handling Guide (secrets management)
   - All of the above ← Recommended
   - None (skip security validation)
   - Custom selection (specify which)
```

Skip Round 2 (project-specific security details, additional requirements, report recipients) — always skipped in BA Mode, regardless of package installation.

### BA-Only Phase Completion

After the BA-Only flow, proceed with the standard MANDATORY Phase Completion Actions at the bottom of this module:
- Persist actual answers (Part 1, Part 2 architecture, Part 4 constraints, Part 5 R1 security/compliance) into the relevant `*-context/project-config.json` and, when `nc-code-security-audit` is installed, `security-compliance/assets/security-sources.json`.
- Append per-Part Q-blocks (including BA-mode skips) to the Decision Log §5 — every skip MUST have an explicit Q-block with `User answer: skipped (BA mode)`.
- Tick `Phase 5` and `Phase 5 reflection completed` in `## Phase Checklist`.
- Show progress: `✅ Requirements gathered (5/9 phases complete)`
