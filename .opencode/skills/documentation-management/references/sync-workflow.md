# Dynamic Rules & Documentation Synchronization

> **CRITICAL RULE**: The AI agent MUST proactively manage rules and documentation synchronization both BEFORE starting work (to anticipate impacts) and AFTER completing changes (to update affected docs).

---

## BEFORE Starting Work: Anticipate Documentation Impact

> **Purpose**: Identify which rules and documentation might need updates BEFORE implementing changes, so the user is aware of the full scope.

### When to Assess Documentation Impact

Assess potential documentation/rules impact when the upcoming task involves:
- Architectural or structural changes
- New dependencies or integrations  
- Changes to existing workflows or patterns
- New features or components
- Configuration or environment changes

### Pre-Work Documentation Check

Before starting complex tasks, include in the implementation plan:

```
**Implementation Plan**

**Task:** [Brief description]

**Code Changes:**
├── path/to/file.ts — Modify
│   └── [Change description]
...

**Potential Documentation/Rules Impact:**
├── .opencode/rules/development.md
│   └── May need to update [section] if [condition]
│
├── docs/README.md
│   └── May need to add [new feature] description
│
└── .opencode/rules/components/api.md
    └── May need to register new endpoint

**Note:** Documentation updates will be confirmed after implementation.

Approve this plan?
```

### Clarifying Questions About Documentation Scope

Ask clarifying questions when:
- Unclear which documentation should be the source of truth for new information
- Multiple places exist where new information could be documented
- Changes might make existing documentation outdated or conflicting
- User might have preferences about documentation style or depth

**Question format:**
```
Before I proceed, I have questions about documentation scope:

1. Should the new [feature/pattern] be documented in [file A] or [file B]?
2. Do you want me to update the [specific section] with the new approach?
3. Should I add this to the [registry/changelog]?

This will help me plan documentation updates after implementation.
```

---

## AFTER Completing Changes

> **Post-Implementation Protocol**: After completing significant changes, the agent MUST scan all relevant project files for content semantically related to the changes, and validate that all file references and links in touched files remain accurate. **If `docs/INDEX.md` exists, use it as the authoritative inventory of all project documentation.** The scan is mandatory — only the application of specific changes requires user approval.

## Mandatory Scan Triggers

### High-Priority (Always scan immediately after)

| Change Type | What to Scan |
|-------------|--------------|
| **New feature implementation** | Architecture docs, workflow rules, component docs |
| **Technology stack changes** | `development.md`, README, GETTING_STARTED |
| **Architecture refactoring** | All architecture docs, initialization rules |
| **New library/dependency added** | `development.md`, relevant workflow rules |
| **API changes** | API documentation, integration rules |
| **Configuration changes** | Config docs, environment setup rules |
| **Workflow/process changes** | Workflow rules, CONTRIBUTING docs |

### Medium-Priority (Scan if 3+ files affected)

| Change Type | Threshold | What to Scan |
|-------------|-----------|--------------|
| **Code pattern changes** | 3+ files with same pattern | Pattern documentation, coding standards |
| **Error handling changes** | 3+ similar implementations | Error handling guidelines |
| **Testing approach changes** | 3+ test files | Testing strategy documentation |
| **Naming convention changes** | 5+ renamed items | Naming conventions in rules |

### Low-Priority (Note inline, no separate scan)

- Minor bug fixes — note in response if any doc reference becomes outdated
- Documentation typo fixes
- Code comments updates

---

## Findings Report Format

After scanning, always report findings using this format — even when nothing is affected:

```
**Documentation Impact Check**

Completed: [DESCRIBE COMPLETED WORK]

Affected documentation:
1. [FILE_PATH_1] — [what is outdated and why]
   Before: [current content snippet]
   Proposed: [updated content snippet]

2. [FILE_PATH_2] — [what is outdated and why]
   Before: [current content snippet]
   Proposed: [updated content snippet]

(or: "No documentation updates needed — no existing docs reference the changed area.")

Approve these updates? [Yes / Modify / Skip]
```

> **Key principle:** The user approves or rejects specific proposed changes — not whether to scan. The scan always happens.

> **Close the loop either way.** When the scan found nothing to update, run `node .opencode/hooks/docs-sync-check.js --record-state` right away — the change set was reviewed, and without the baseline the docs-sync plugin recommends `/docs-sync` for the same files at the next idle. When updates were proposed, Step 4 records the baseline after they are applied.

---

## Documentation & Rules Scan Process

When user confirms update is needed, follow this process:

### Step 1: Identify Affected Files

#### Determine scan mode first

**Post-initialization** (check if `docs/INDEX.md` exists):
- Use `docs/INDEX.md` as the authoritative inventory of all project documentation — it was generated during Phase 7.5 and reflects the actual file structure of this project
- Scan every file listed there, plus the locations below

**Pre-initialization / template mode** (no `docs/INDEX.md`):
- Fall back to scanning standard template directories listed below

#### Files to always scan (both modes)

**Project root files:**
- `README.md` — Project overview and quick start
- `AGENTS.md` — AI agent instructions
- `.opencode/project_init.md` — Initialization config and state

**Rules** (`.opencode/rules/`):
- `development.md` — Technology stack, coding standards
- `orchestrator.md` — Agent orchestration, command routing
- Project-specific metadata in `.opencode/rules/project/metadata.json`
- Any rule that references changed components or patterns

**Agents** (`.opencode/agents/`):
- Any agent whose `description`, purpose, or workflow references the changed domain, command, or pattern

**Skills** (`.opencode/skills/`):
- Any skill (`SKILL.md`, reference files) that describes, configures, or documents the changed area
- Domain skill `project-config.json` files — filled during initialization with project-specific patterns; may need updating if framework, API, or stack configuration changes
- Skill reference files (`references/*.md`) that contain examples or instructions related to the change
- **`project-config.json` + `references/guidelines.md` — the paired deep-expertise artifacts** (generated in initialization Phase 6 Part 3.5; APM-installed context skills carry the same pair under `.agents/skills/<name>/` — the native `opencode` target path — while the two Core context skills live under `.opencode/skills/`; see [`apm-workflow.md`](../../project-initialization/references/apm-workflow.md)). For every context skill flagged by the hook (e.g. `frontend-context`, `backend-context`, `api-context`, `database-context`, `testing-context`, `infrastructure-context`), reconcile the config **first**, then re-render the prose from it — see *Context Skill Sync* in [`../SKILL.md`](../SKILL.md) for why the order is not interchangeable. Check:
  - `project-config.json` — does `framework` / `version` / `runtime` / `patterns` still describe the repo after the change?
  - Does `guidelines.md` still reference the current framework/library versions?
  - Are listed conventions still enforced after the change?
  - Did the change introduce a new pattern that should be captured here?
  - Are there `{{PLACEHOLDER}}` tokens that mean the file was never properly initialized? If so, flag the owning APM package as needing re-installation rather than patching the file inline.

**Commands** (`.opencode/commands/`):
- Any command file whose workflow or delegation references the changed agent, skill, or behavior

#### Additional files to scan post-initialization

**Project documentation** (`docs/project/`):
- `ARCHITECTURE.md` — System architecture and design patterns
- `STACK.md` — Technology stack decisions
- `CONTRIBUTING.md` — Contribution guidelines
- Any custom project-specific documentation created during or after initialization

**Project root (template-managed since v4.1.0):**
- `CHANGELOG.md` — Version history

**Template docs** (`docs/`):
- `docs/core/` — Detailed implementation documentation
- Any domain-specific documentation under `docs/project/`

### Step 2: Check Each File for Relevance

For each potentially affected file, verify:
- [ ] Does it reference the changed component, agent, skill, or pattern?
- [ ] Does it contain outdated examples or instructions?
- [ ] Does it need new sections added to reflect the change?
- [ ] Should any sections be deprecated or removed?

**Link/anchor validation — run the validator instead of manually eyeballing relative links and paths:**

```bash
node .opencode/skills/project-initialization/scripts/validate-doc-links.js --json
```

This replaces the old manual checklist items ("are all relative file path references still valid?") with an authoritative, exhaustive scan: it walks every Markdown/HTML document (via `git ls-files` when inside a work tree, so gitignored docs need `--all` to be included too — see the script's own header), resolves every `[text](target)` link plus its `#anchor`, and reports broken references and (in an initialized project, i.e. `initializationStatus: "active"`) unresolved links to files normally created during `/initialize`. Filter the `--json` output's `errors` array down to files touched by the current change before deciding what to report — a broken link discovered elsewhere in the repo is still worth surfacing, but separately from "caused by this change." Agent/skill *name* accuracy (as opposed to path/anchor resolution) still requires manual review — the validator only checks that link targets resolve, not that prose references (e.g. "the `frontend-specialist` agent") match a real file.

### Step 3: Propose Specific Updates

Present changes to user:
```
**Proposed Updates**

**File: [PATH]**
- Current: [OUTDATED_CONTENT]
- Proposed: [NEW_CONTENT]
- Reason: [WHY_THIS_CHANGE]

Approve these changes? [Yes/No/Modify]
```

### Step 4: Apply Updates with Tracking

After user approval:
1. Apply changes to files
2. Update `CHANGELOG.md` (project root) with change summary
3. Update all cross-references — docs, agents, skills, commands — that pointed to renamed or moved targets
4. Re-run the validator to confirm the edits didn't introduce a new broken reference and that any link the edits were supposed to fix now resolves:

   ```bash
   node .opencode/skills/project-initialization/scripts/validate-doc-links.js --json
   ```

5. If any broken link was found but not covered by the proposed updates, report it explicitly so it can be resolved
6. **Project Mode only** — if any context skill was touched, verify the result mechanically. A `guidelines.md` edited to match a change can still end up generic, and a re-render can silently drop the project vocabulary it used to cite:

   ```bash
   node .opencode/skills/project-initialization/scripts/check-guidelines-specificity.js --required <skills touched>
   ```

   Do **not** run this in Template Mode — the template ships uninitialized context skills, so the gate fails by design.
7. Finally, run the analysis script's `--record-state` mode so `docs-sync-check.js` snapshots the file set this sync just touched (uncommitted files + `lastSyncSha = HEAD`) — otherwise the hook re-recommends `/docs-sync` on its own output at the next agent turn:

   ```bash
   node .opencode/hooks/docs-sync-check.js --record-state
   ```

---

## Change Categories & Affected Files Matrix

> **`Guidelines to refresh` column** lists the deep-expertise `references/guidelines.md` files that the agent MUST inspect for staleness when this category changes. A `—` means no domain `guidelines.md` is expected for that category. Inspection ≠ rewrite: only propose edits when the change actually invalidates current content.

| Category | Rules | Agents & Skills | Docs | Guidelines to refresh |
|----------|-------|-----------------|------|-----------------------|
| **New agent or skill** | `orchestrator.md` routing | Related agents (description overlap), parent skills | ARCHITECTURE.md, CHANGELOG.md | — |
| **Agent behavior change** | `orchestrator.md` principles | All agents sharing the same principle, skill reference files | ARCHITECTURE.md | — |
| **Command added/renamed** | `orchestrator.md` routing table | Agent that owns the command, skill invoked by command | GETTING_STARTED.md, README.md | — |
| **Skill reference paths** | — | All agents that `read` the skill, commands that delegate to it | — | — |
| **Frontend Components** | `development.md`, framework rules | `frontend-context` skill | Component docs, ARCHITECTURE.md | `frontend-context/references/guidelines.md` |
| **Backend APIs** | `development.md`, API rules | `api-context`, `backend-context` skills | API docs, ARCHITECTURE.md | `api-context/references/guidelines.md`, `backend-context/references/guidelines.md` |
| **Database Schema** | Database rules | `database-context` skill | Schema docs, ARCHITECTURE.md | `database-context/references/guidelines.md` |
| **Authentication** | Security rules | `security-compliance` skill + security-auditor agent *(only if `nc-code-security-audit` package installed)* | User flow docs | `backend-context/references/guidelines.md` (auth patterns), `frontend-context/references/guidelines.md` (auth UX) |
| **Build/Deploy** | `orchestrator.md`, CI/CD rules | `infrastructure-context` skill | DEPLOYMENT.md, README.md | `infrastructure-context/references/guidelines.md` |
| **Testing** | Testing rules | `testing-context`, `tdd-workflow` skills | Testing docs, CONTRIBUTING.md | `testing-context/references/guidelines.md` |
| **Dependencies** | `development.md` | Context skills referencing the library | README.md, GETTING_STARTED.md | All context-skill `guidelines.md` that mention the affected library, including `coding-standards-context/references/guidelines.md` (dependency-management conventions) |
| **Project Structure** | `orchestrator.md` | `project-initialization` skill, initializer agent | ARCHITECTURE.md, README.md | All context-skill `guidelines.md` (cross-cutting), including `coding-standards-context/references/guidelines.md` (project organization conventions) |
| **Code conventions / uncategorized code change** | `development.md` | `coding-standards-context` skill (the docs-sync analysis's fallback category for any changed source file that didn't match a more specific category) | CONTRIBUTING.md | `coding-standards-context/references/guidelines.md` |

---

## Rule Improvement Triggers

### Add New Rules When:
- A new technology/pattern is used in 3+ files
- Common bugs could be prevented by a rule
- Code reviews repeatedly mention the same feedback
- New security or performance patterns emerge
- New workflow or process is established

### Modify Existing Rules When:
- Better examples exist in the codebase
- Additional edge cases are discovered
- Related rules have been updated
- Implementation details have changed
- Referenced technologies are updated

### Deprecate/Remove Rules When:
- Technology is no longer used
- Pattern is replaced by better alternative
- Rule conflicts with new architecture
- Rule is duplicated elsewhere

---

## Rule Quality Assurance

- Rules should be **actionable and specific**
- Examples should come from **actual code**
- References should be **up to date**
- Patterns should be **consistently enforced**
- Cross-reference related rules using relative links

---

## Integration with Other Workflows

### After Project Initialization
- All rules and docs are fresh - baseline established
- Record initial state in `.opencode/rules/.core-version.json`

### After Major Refactoring
- Trigger FULL documentation scan
- Update architecture documentation
- Review all cross-references

### After Dependency Updates
- Update version references in docs
- Check for deprecated API usage in examples
- Update installation instructions

### After Team Convention Changes
- Update CONTRIBUTING.md
- Update relevant coding standards
- Notify about changes in CHANGELOG.md

---

## Related Rules

- [markdown-standards.md](markdown-standards.md) - Rule formatting, structure, and documentation standards
- [Documentation Management Skill](../SKILL.md) - Documentation cross-references and registry workflow
- [development.md](../../../rules/development.md) - Development practices

---

## Summary: AI Agent Behavior for Rules & Documentation Sync

### BEFORE Starting Work

1. For complex tasks, identify potential documentation/rules impact
2. Include "Documentation Impact" section in implementation plan (see orchestrator.md)
3. Ask clarifying questions if documentation scope is unclear
4. Inform user about anticipated documentation updates

### AFTER Completing Significant Changes

1. Identify the type of change from triggers above
2. Check if `docs/INDEX.md` exists — if yes, use it as the authoritative file inventory (post-initialization mode); otherwise use standard directory scan (template mode)
3. Scan immediately across all relevant locations — no permission needed
4. Run `node .opencode/skills/project-initialization/scripts/validate-doc-links.js --json` to validate relative links and paths; manually review agent/skill *name* references in touched files (the validator only resolves link targets, not prose mentions)
5. Present findings using the Findings Report Format (include broken links as separate items); if nothing is affected, run `node .opencode/hooks/docs-sync-check.js --record-state` now
6. Apply specific changes only after user approval — for context skills, `project-config.json` before `references/guidelines.md`
7. Update CHANGELOG.md with sync summary
8. Re-run the validator to verify cross-reference integrity across the full discovered file set; in Project Mode also run `node .opencode/skills/project-initialization/scripts/check-guidelines-specificity.js --required <skills touched>`; then run `node .opencode/hooks/docs-sync-check.js --record-state` so the hook doesn't immediately re-recommend on files this sync just touched

### NEVER

- Update rules, docs, agents, or skills without explicit user approval for specific changes
- Skip the post-task scan — report "No updates needed" if nothing is affected
- Scan only docs/ — agents, skills, and commands are equally part of the knowledge base
- Assume changes don't affect documentation without scanning
- Leave a broken link unresolved — always report it even if not fixing it immediately
- Re-render a context skill's `guidelines.md` while its `project-config.json` still names the superseded framework — the next render reintroduces the wrong value
- Hand-create a missing context skill's files to make a gate pass — report the uninstalled APM package instead
- Document in wrong places without asking user preference
- **Start any documentation sync automatically when hook output is received** — the hook message is a recommendation only; the agent must present the two options (local `/docs-sync` or `--since=<period>`) and wait for the user's explicit choice before taking any action
