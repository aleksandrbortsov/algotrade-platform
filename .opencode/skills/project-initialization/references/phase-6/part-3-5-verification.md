# Phase 6 - Part 3.5: Guidelines Verification (HARD GATE)

> **Step file.** The blocking verification of every rendered `guidelines.md`: required-skill derivation, the install-vs-render diagnostic table, the mechanised specificity check, and the final gate. Phase 6 cannot close while this fails.
>
> **Parent:** [configuration-updates.md](../configuration-updates.md) - Phase 6 router
> **Read first:** [overview.md](overview.md) - what Phase 6 produces, the render order, validation and completion actions
> **Previous step file:** [part-3-guidelines.md](part-3-guidelines.md) - guidelines generation

---

## Part 3.5: Mandatory Guidelines Verification (HARD GATE)

> **Purpose:** Ensure that every required `references/guidelines.md` is present, fully rendered (no `{{PLACEHOLDER}}` tokens), and backed by an initialized `project-config.json`. This step is a **hard gate** — initialization MUST NOT proceed past Phase 6 if any required `guidelines.md` is invalid.

> **APM compatibility note (OpenCode line).** Skills deployed by `apm install` land at **`.agents/skills/<name>/`** — the native path of the APM `opencode` target, which OpenCode reads without any shim — while the two Core context skills live at `.opencode/skills/`. Every path written below as `<skills-root>/<name>/` means: `.opencode/skills/` for `coding-standards-context` and `infrastructure-context`, `.agents/skills/` for every context skill that arrives from an APM package. Installs go through `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, which restores the initialized `project-config.json` and rendered `guidelines.md` after APM redeploys the package copies.

**When to run:** After Part 3 completes, before the Summary and Confirmation block. The same procedure also runs at the end of any standalone `apm install` invocation that pulls a new APM package with `x-workplace.contextSkills` set (scoped to those skills) and unconditionally at the end of `quick-init` (scoped to `coreContextSkills`).

### Required Set: `requiredContextSkills`

The verifier operates on a **single set** built upstream:

```
requiredContextSkills =
    coreContextSkills                                           # ALWAYS, unconditional
  ∪ ⋃ pkg.xWorkplace.contextSkills for every APM package activated in Phase 1.7-APM
  ∪ technologyDetectedDomains                                   # legacy fallback (see "Technology Detection Additions" below)
  ∪ explicitlyConfiguredDomains                                 # any *-context skill with project-config.json initialized: true
```

> **`explicitlyConfiguredDomains` is limited to `*-context` skills.** The set exists to keep a domain the user did configure from silently dropping out of the gate — not to sweep in any skill that happens to carry an initialized `project-config.json`. A non-`*-context` skill matching on that field alone would make the gate unsatisfiable (it has no `references/template.md` to render from), so it is out of scope by construction.

#### `coreContextSkills` (unconditional, always required)

These skills ship with the Workplace Core and apply to every project, regardless of selected role(s) and regardless of whether `quick-init` or full `/initialize` is run:

| Core context skill | Lives at | Notes |
|---|---|---|
| `coding-standards-context` | `.opencode/skills/coding-standards-context/` | Project naming, doc style, code organisation. Default questions are asked in Part 2 even if no language/framework is detected. |
| `infrastructure-context` | `.opencode/skills/infrastructure-context/` | CI/CD, containerisation, cloud, environments. Default questions are asked in Part 2 even if no IaC is detected. |

The verifier MUST treat `coreContextSkills` as required regardless of role selection or technology detection. If their `project-config.json` is not initialized when Part 3.5 runs, the verifier triggers Part 2 (default questions) → Part 3 → re-verifies.

#### APM Package Contributions

When Phase 1.7-APM installs an APM package, every entry in the package's `apm.yml` → `x-workplace.contextSkills` array is appended to `requiredContextSkills`. Examples:

| Installed APM package | Adds to `requiredContextSkills` |
|---|---|
| `frontend-developer` | `frontend-context` |
| `backend-developer` | `backend-context`, `database-context` |
| `api` | `api-context` |
| `performance` | `performance-context` |
| `qa` | `testing-context` |
| `business-analyst` | _(none — BA skills don't use the template/guidelines pattern; their `project-config.json` is populated by Phase 1.5 BA Initialization Questions instead)_ |

#### Full-Module Package Contributions

Full-module APM packages (e.g. `test-generation`, `product-migration`) MAY declare `x-workplace.contextSkills` in their `apm.yml`. If declared, those skills join `requiredContextSkills` and the same gate applies. If a full-module package declares `contextSkills` but its gate fails, the package's `status` in `.workplace/state.json` stays `"inactive"` (or transitions to `"failed"`).

### Technology Detection Additions

Beyond role requirements, detected technologies **add** mandatory domains regardless of role. In this template every `*-context` skill except the two `coreContextSkills` arrives from an APM package, so a detection signal is only actionable together with the package that owns the domain:

| Detection Signal | Additional Required Domain | Owning APM package |
|-----------------|---------------------------|---|
| Database/ORM detected (Prisma, TypeORM, Drizzle, Sequelize, SQL files, database configs) | `database-context` | `backend-developer` |
| Test framework in package.json or test files exist | `testing-context` | `qa` |
| CI/CD configs, Dockerfile, Kubernetes manifests detected | `infrastructure-context` | _Core (ships with the template)_ |
| Web-vitals package, Lighthouse config, bundle analyzer detected | `performance-context` | `performance` |
| REST/GraphQL endpoints, external API integrations, SDK imports | `api-context` | `api` |
| Frontend framework detected (React, Vue, Angular, Svelte, Next.js, etc.) | `frontend-context` | `frontend-developer` |
| Backend framework detected (Express, NestJS, FastAPI, Django, Spring, etc.) | `backend-context` | `backend-developer` |
| Any programming language detected | `coding-standards-context` | _Core (ships with the template)_ |

#### Detected domain whose owning package is not installed

A detection signal for a domain no installed package provides is not a gate failure — the files it would gate on cannot exist. Resolve it by **package**, not by hand:

1. **`/initialize`** — add the owning package to the install set and install it, then continue. This MUST happen **before** Part 2 writes any answers, which is why it is [Part 2 Step 0](part-2-domain-skills.md) and only *verified* here (see the ordering warning below).
2. **`/quick-init`** — offer the package; on acceptance add it to `apm.yml` and install.
3. **User declines, or the package is unavailable** — record the domain as an Open Gap in the ledger with the detection evidence and the package name, and **remove it from `requiredContextSkills`**. A required entry that no package can satisfy turns the hard gate into a dead end.

> **⚠️ Install before writing answers, never after.** A `*-context` package ships its own pristine `project-config.json` (`initialized: false`) and no `guidelines.md`. APM has no interactive conflict resolution: `apm install` collects collisions into a summary and does **not** overwrite them without `--force`, while `apm update` asks once about the whole plan ([`APM_PACKAGES.md`](https://{insert correct url}/-/blob/OpenCodeWP/docs/core/APM_PACKAGES.md) Q&A). Installing after Part 2 has filled the config therefore ends in a collision report rather than an updated skill — and forcing it would discard the user's answers. Do the install at the start of Part 2, before the first question. Edits that must survive later package refreshes belong in the project's own `.apm/` (deployed last, wins on collision).

### Verification Procedure

After Part 3 completes, the agent MUST:

**Step 1 — Build `requiredContextSkills`**

Per the formula above, compute the union of:
- `coreContextSkills` (always: `coding-standards-context`, `infrastructure-context`)
- `x-workplace.contextSkills` from every APM package installed in Phase 1.7-APM (the prepared selection file `.opencode/.temp-apm-selection.json` already aggregates these as `requiredContextSkills`; the authoritative post-install source is the `x-workplace` block of each installed package in `apm.lock.yaml`)
- Domains added by technology detection signals (table below)
- Domains that were explicitly configured in Part 2 (have `project-config.json` with `"initialized": true`)

**Step 2 — Check each required domain**

For each domain in the required list:

```
1. Check .opencode/skills/{domain}-context/project-config.json exists AND has "initialized": true
2. Check .opencode/skills/{domain}-context/references/guidelines.md exists
3. Check guidelines.md has no raw {{PLACEHOLDER}} tokens (grep for "{{" pattern)
4. English-only check — BOTH files:
   - Scan human-readable strings in project-config.json (exclude pure URL/path/code-token fields). All MUST be English.
   - Read guidelines.md: all narrative prose MUST be English (tables, bullets, section bodies). If non-English text is found → **AUTO-RECOVER:** translate and rewrite affected strings (update project-config.json if needed, then re-run Part 3 Steps 2–7 for that domain).
```

**Step 3 — Classify results**

| Status | Condition | Action |
|--------|-----------|--------|
| ✅ Complete | `project-config.json` initialized AND `guidelines.md` exists with no `{{PLACEHOLDER}}` tokens AND English-only content in both | No action needed |
| ⚠️ Missing guidelines.md | `project-config.json` initialized but `guidelines.md` does NOT exist | **AUTO-RECOVER:** Generate `guidelines.md` from `template.md` + `project-config.json` (follow Part 3 steps) |
| ⚠️ Raw placeholders | `guidelines.md` exists but contains `{{PLACEHOLDER}}` tokens | **AUTO-RECOVER:** Re-render `guidelines.md` replacing all remaining placeholders |
| ⚠️ Non-English content | Either file contains substantial non-English explanatory text (excluding allowed exceptions: paths, URLs, identifiers, fixed product names) | **AUTO-RECOVER:** Translate to English, update `project-config.json` if source strings were non-English, re-render per Part 3 |
| ❌ Not configured | `project-config.json` missing or `"initialized": false` | **CONFIGURE:** Run Part 2 domain configuration for this domain, then Part 3 |
| ❌ Not installed | The skill directory is absent, empty, or has no `project-config.json` at all | **FIX THE INSTALL** — see the diagnostic table below. Auto-recovery does not apply: there is nothing to render from |

#### Diagnosing "guidelines.md is missing" — three different faults, three different fixes

The same symptom has three causes, and applying the wrong remedy makes the situation worse (re-rendering hides a broken install; hand-writing the files creates a permanently stubbed skill). Classify first:

| Evidence | Cause | Fix |
|---|---|---|
| `<skills-root>/<name>/` does not exist | **Package not installed.** Its `apm.yml` entry is missing, or the install never ran for it | Add the owning package to `apm.yml` (see the detection→package table above), run `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`, re-verify |
| Directory exists but has 0 files, or lacks `SKILL.md` / `references/template.md` | **Installed but empty.** The `apm.lock.yaml` entry is poisoned, so APM reports `(files unchanged)` and deploys nothing | `validate-apm-install.ps1` names the package and prints the purge command: delete its `apm_modules/` tree **and** its lock entry, then re-install. Re-running `apm install` alone changes nothing |
| `SKILL.md` + `references/template.md` present, `project-config.json` initialized, but `guidelines.md` absent or full of `{{PLACEHOLDER}}` | **Not rendered.** Phase 6 Part 3 did not run or produced incomplete output | Re-render per Part 3 for that domain (the genuine auto-recovery case) |

Run the install-side diagnosis mechanically before deciding:

```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/validate-apm-install.ps1
```

**Never hand-create `SKILL.md`, `references/template.md`, or `project-config.json` inside a package-owned skill** to make this gate pass. The package is the only valid source; a hand-made copy silences the gate and leaves the skill stubbed for the life of the project.

**Step 3a — Specificity and ownership check (mechanised)**

`{{PLACEHOLDER}}`-freeness proves a file was rendered, not that it says anything about *this* project. A `guidelines.md` full of plausible generalities ("use meaningful variable names", "handle errors consistently") passes the placeholder check and is useless at runtime. Run:

```bash
node .opencode/skills/project-initialization/scripts/check-guidelines-specificity.js --required <comma-separated requiredContextSkills>
```

What it adds on top of Step 2:

- **Required set is honoured literally.** Passing `--required` (or letting it read `requiredContextSkills` from `.opencode/.temp-apm-selection.json`) means a missing or empty skill directory is a **failure**, not an absent row. Discovering skills by "has a `project-config.json`" is exactly what lets an empty directory slip through this gate.
- **Failure class.** Each finding is labelled `install` or `render`, matching the diagnostic table above, so the remedy is never guessed.
- **Ownership.** Only `coding-standards-context` may define naming conventions, error handling, code organisation, commit format, and documentation style. Another domain re-defining them under its own heading is a failure — link to the owner instead.
- **Specificity.** Once Phase 4 analysis artifacts exist under `.opencode/project/analysis/`, the script builds a vocabulary of concrete project names (modules, entities, endpoint patterns, integrations) and requires each file to cite at least `--min` of them (default 5). Before those artifacts exist it reports specificity as unmeasurable (warning) and the remaining checks still block.
- **Skills outside the required set** are advisory only: their findings are reported as warnings so a leftover skill cannot make the gate unsatisfiable.

Do **not** hand-edit `guidelines.md` to satisfy the counter. Re-render it per Part 3 with the domain's analysis artifacts fed into the enrichment step.

**Step 3b — Render order and cross-cutting ownership**

The render order fixed in [overview.md](overview.md) is verified here, because a violation is only visible once every file exists:

| Check | Pass condition | Failure means |
|---|---|---|
| Owner rendered first | `coding-standards-context/references/guidelines.md` exists and is valid | The domains rendered before it could not reference it, so they either restated its rules or left the topic unaddressed. Re-render those domains after the owner |
| No duplicate ownership | No other `guidelines.md` defines naming conventions, error handling, code organisation, commit format, or documentation style under its own heading | Two files will now drift. Delete the duplicate section and link to the owner — never reconcile the wording |
| References resolve | Every "see `coding-standards-context`" pointer in a domain file names a section that exists in the owner's rendered file | A dangling pointer is worse than a restatement: the agent follows it, finds nothing, and improvises |

`check-guidelines-specificity.js` covers the middle row mechanically (failure class `ownership`). The first and third rows are read directly — they are two file reads, not a scan.

**Step 4 — Auto-recovery**

For each entry in `requiredContextSkills` with status ⚠️ or ❌:

- If ⚠️ (Missing `guidelines.md`, raw placeholders, or non-English content): auto-recover silently using Part 3 generation steps and English translation as needed.
- If ❌ (Not configured): if the entry is in `coreContextSkills` OR contributed by an installed APM package — **the user CANNOT skip**. The agent MUST run Part 2 (asking default questions if no tech context exists) → Part 3 → re-verify. Only entries that originate purely from technology detection (and not from core/APM package) MAY be skipped via prompt:

```
⚠️ Guidelines Verification — Issues Found

Mandatory entries (cannot be skipped — initialization will block until fixed):

| Skill | Issue | Source | Action |
|---|---|---|---|
| {skill} | {description} | core / apm-package:{id} | will configure now |

Optional entries (originated from technology detection only):

| Skill | Issue | Suggested Action |
|---|---|---|
| {skill} | {description} | {configure | skip} |

For mandatory entries, the agent will now run Part 2 (default questions where needed)
and Part 3 (render guidelines.md). Continue? (yes/no — answering "no" aborts initialization)

For optional entries, choose:
1. Auto-fix all — configure with defaults and generate guidelines
2. Select which to fix
3. Skip — I'll configure these manually later (⚠️ agents won't have project context)

Your choice for optional entries:
```

**Step 5 — Final validation (HARD GATE)**

After auto-recovery, re-run Step 2, **Step 3a and Step 3b** to confirm all required domains now have valid `guidelines.md`. All three must pass; the specificity script's exit code is part of the gate, not advisory.

**Blocking rule:** if any entry in `requiredContextSkills` still fails after recovery (still missing `guidelines.md`, still has `{{PLACEHOLDER}}` tokens, **still contains non-English explanatory text** after auto-recovery, `project-config.json` `initialized: false`, or `check-guidelines-specificity.js` still reports a failure for it):

1. **Initialization MUST stop here.** Do NOT advance to Phase 7. Do NOT show the "initialization complete" summary.
2. Report the unresolved skills with explicit paths:

   ```
   ❌ Initialization blocked at Phase 6 Part 3.5.

   The following required context skills do not have valid references/guidelines.md:

   | Skill | Issue | Class | Path |
   |---|---|---|---|
   | {skill} | {missing | placeholders | non-english | not configured | not specific | ownership} | {install | render} | .opencode/skills/{skill}/ |

   Reason these are required:
   - Core skill (always required): {list}
   - From installed APM package {package-id}: {list}
   - From technology detection: {list}

   Class `install` -> fix the package install (purge the lock entry + re-install);
   class `render`  -> re-run Part 2/Part 3 for that domain.
   Alternatively remove the triggering APM package from apm.yml (and re-run
   `node .opencode/skills/project-initialization/scripts/apm-install-preserving.js`) or the triggering technology detection,
   then re-run /initialize.
   ```

3. **Update activation state for all dependent APM packages:**
   - For every APM package recorded in `apm.lock.yaml` whose `x-workplace.contextSkills` include any failing skill: write `{ "status": "failed", "pendingGuidelines": [...] }` to `.workplace/state.json` under the package's id.
   - Activation scripts of those packages skip their work (their `scripts/activate.{sh,ps1}` MAY check `.workplace/state.json` before running side effects).

4. **Allow restart.** When the user re-runs `/initialize`, Part 3.5 re-evaluates the same set; once all entries pass, package statuses in `.workplace/state.json` are promoted to `"active"` and initialization proceeds.

If every entry passes:

- For every APM package in `requiredContextSkills`'s contributing set, set `{ "status": "active", "pendingGuidelines": [] }` in `.workplace/state.json`.

### Verification Output

```
📋 Guidelines Verification (Part 3.5)

requiredContextSkills: {N}
  Core (always):                {list}
  From APM packages:            {list with package id in parens}
  From technology detection:    {list}

✅ Complete:        {list with valid guidelines.md}
🔧 Auto-recovered:  {list where guidelines.md was generated during verification}
⏭️ Skipped:         {list — only allowed for non-core, non-APM-required entries}
❌ BLOCKING:        {list — initialization halted}

All required guidelines verified: {Yes / NO — initialization blocked}

APM package status updates (.workplace/state.json):
  {package-id}: activating → active
  {package-id}: activating → failed (pendingGuidelines: [...])
```
