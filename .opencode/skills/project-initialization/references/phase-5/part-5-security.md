# Phase 5 - Part 5: Security Requirements

> **Step file.** Compliance and project-specific security. **Gate check first:** the BASS Security Guides questions only run when the `nc-code-security-audit` APM package was installed in Phase 1.7-APM.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **Read first:** [overview.md](overview.md) - adaptive mode and the skip-by-default policy that govern every Part
> **Previous step file:** [part-4-general.md](part-4-general.md) - general requirements

---

## Part 5: Security Requirements

**Trigger:** Round 1 Q1 (compliance standards) is always asked for all project types — it persists into `coding-standards-context/project-config.json` regardless of which packages are installed. Round 1 Q2 and all of Round 2 configure BASS Security Guides validation and are **conditional on the `nc-code-security-audit` package having been installed** in the preceding Phase 1.7-APM step (see Gate Check below) — that package owns the `security-compliance` skill and `security-sources.json` these questions persist into.

### Gate Check — BASS Security Guides questions (Round 1 Q2, Round 2)

> **Since v4.4.0** the `security-compliance` skill (and its `assets/security-sources.json`) is no longer part of Core — it ships exclusively with the standalone-published `nc-code-security-audit` APM package (role-matched + optional for `backend`/`frontend`/`fullstack`/`qa`, offered in Phase 1.7-APM Pass A.5, which runs before Phase 5).

Before asking Round 1 Q2 or any Round 2 question, check whether `.agents/skills/security-compliance/assets/security-sources.json` exists on disk:

- **Exists** (package was installed in Phase 1.7-APM, or added manually earlier): ask Round 1 Q2 and Round 2 normally; persist answers into that file per the Persistence Targets table below.
- **Absent** (package not installed / declined / not offered for the selected role(s)): **skip** Round 1 Q2 and all of Round 2 — do not create `security-compliance/` or write a placeholder `security-sources.json`. Append a Decision Log §5 Q-block:
  ```
  Q: Which BASS Security Guides should be enforced in this project?
  Found: nc-code-security-audit package not installed (security-compliance/assets/security-sources.json absent).
  User answer: skipped — package not installed
  Decision stored in: N/A (no security-sources.json to write)
  Follow-up: to enable BASS Security Guides validation, add `nc-code-security-audit` to apm.yml
    (git: <apmPackages.registryRepoUrl>, path: nc-code-security-audit, ref: master) and run
    `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, then run /security-update to initialize security-sources.json.
  ```
  Also add a matching bullet under `## Open Gaps` so the gap is discoverable outside the Decision Log.

### Round 1 - Compliance & Standards (2 questions, pre-checked from Phase 4)

> **EXISTING_PROJECT:** before showing this question, run the **Compliance pre-check** from the Skip-By-Default Policy section above. Pre-tick compliance frameworks the agent already inferred from Phase 4 §11 (e.g., Stripe → PCI DSS likely; HIPAA-suggestive entity names → HIPAA likely; GDPR env vars → GDPR confirmed). If all signals align with one framework cluster, ask only the confirmation question; do NOT ask the user to choose from scratch.

```
1. Does your project need to comply with specific security standards?
   {Pre-checked items based on Phase 4, e.g., "[x] PCI DSS — auto-detected from `stripe` SDK"}
   Options:
   - [{x|}] PCI DSS (payment processing)        ← {auto-detected: yes/no}
   - [{x|}] HIPAA (healthcare data)             ← {auto-detected: yes/no}
   - [{x|}] SOC 2 (service organization controls)
   - [{x|}] GDPR (data protection)              ← {auto-detected: yes/no}
   - [{x|}] ISO 27001 (information security)
   - Custom corporate standards (describe)
   - None / Not sure

2. [Gated — only if nc-code-security-audit is installed, see Gate Check above] Which BASS Security
   Guides should be enforced in this project?
   Options:
   - Audit Logging Guide (security event logging)
   - Web Security Headers Guide (HTTP security headers)
   - Authenticators Handling Guide (secrets management)
   - All of the above ← Recommended
   - None (skip security validation)
   - Custom selection (specify which)
```

### Round 2 - Project-Specific Security (2 questions, gated — only if `nc-code-security-audit` is installed, see Gate Check above):

```
3. Are there additional security requirements not covered by standard guides?
   Options:
   - API rate limiting requirements
   - Data encryption at rest requirements
   - Specific authentication methods (SSO, MFA, biometric)
   - Network segmentation requirements
   - Audit trail retention policies
   - Custom security policies (describe)
   - None

4. Who should receive security validation reports?
   Options:
   - Development team only ← Default
   - Security team (provide contact/channel)
   - Both development and security teams
   - Create GitHub/Jira issues automatically
```

### Integration with Security Rules

> The steps below apply only when the Gate Check found `nc-code-security-audit` installed and Round 1 Q2 / Round 2 were actually asked. If the package is absent, skip this subsection entirely — there is no `security-compliance` skill directory to write into.

After collecting answers:

1. **Update `assets/security-sources.json`** with selected guides:
   - Set `enabled: true` for selected guides
   - Set `enabled: false` for deselected guides

2. **Add custom requirements** to `security-compliance skill` as project-specific checks:
   ```json
   {
     "customRequirements": [
       {
         "id": "custom-1",
         "description": "[User's custom requirement]",
         "type": "MANDATORY",
         "validation": "[How to validate]"
       }
     ]
   }
   ```

3. **Configure report distribution** in security workflow:
   - Update `assets/security-sources.json` with notification settings

4. **Generate initial security validation baseline**:
   - Suggest running `/security-validate` after initialization

### Persistence Targets

> Security selections live in `security-compliance/assets/security-sources.json` (only present when `nc-code-security-audit` is installed); project-wide compliance constraints live in `coding-standards-context/project-config.json` (always, regardless of the package). The ledger carries only Q-blocks.

| Topic | Authoritative artifact | Field(s) |
|-------|------------------------|----------|
| Compliance standards (PCI/HIPAA/SOC2/GDPR/ISO 27001/Custom) | `coding-standards-context/project-config.json` | `constraints.compliance[]` |
| Active BASS Security Guides *(gated)* | `.agents/skills/security-compliance/assets/security-sources.json` | `guides[*].enabled` |
| Custom security requirements *(gated)* | `.agents/skills/security-compliance/assets/security-sources.json` | `customRequirements[]` |
| Security report distribution *(gated)* | `.agents/skills/security-compliance/assets/security-sources.json` | `notifications.*` |

If the Gate Check found the package installed: update `Supplemental Source Manifest` row "BASS Security Guides selection" — it already cites `security-compliance/assets/security-sources.json`; reconfirm pointer is current. Append one Q-block per asked question to Decision Log §5 with `Decision stored in:` pointing to the matching artifact above. If the package is absent, the Supplemental Source Manifest row instead reads "skipped — package not installed" (see the single Gate Check Q-block already appended above; do not duplicate).
