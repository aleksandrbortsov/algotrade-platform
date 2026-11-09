# Workplace Documentation Map

> Canonical index of the AI Workplace's **own** user-facing guides (`docs/**` in the template repo): which document answers what, when to read it, and how to resolve it from a project where those files do not exist. Referenced by `orchestrator.md`, the initialization / update / documentation / quality skills, and the Core commands.

---

## 1. Where these documents live

`docs/**` ships in the **AI Workplace template repository**. It is registered in `.opencode/rules/.core-version.json → coreFiles` with `"optional": true`, `/initialize` never writes it, and `/update-workplace` refreshes `docs/core/` only when the project already has that directory.

**Consequence:** in most initialized projects `docs/core/INITIALIZATION.md` (and every sibling) **does not exist on disk**. Never read one as a project-local path without checking, and never link to one from `.opencode/**` with a relative path — see [§7 Authoring rule](#7-authoring-rule-for-this-template).

Two documents are worth separating from the rest:

- **These are user-facing explanations, not executable procedure.** The operational contracts an agent must follow live in `.opencode/` — `project-initialization/references/*`, `project-update/references/*`, `apm-workflow.md`. When the two disagree, `.opencode/` wins for *what to do*; `docs/**` wins for *how to explain it to the user*.
- **`docs/project/**` is a different thing entirely** — those are the *project's own* generated documents (architecture, stack, contributing) and they are always local. This map covers only the Workplace's upstream guides.

---

## 2. Resolution contract (any `docs/**` path)

| Tier | Source | Condition |
|---|---|---|
| **0** | **Local workspace** — `<repo-root>/docs/<path>` | Exists → read it. Done. This is the template repo itself, or a project that kept `docs/`. |
| **1** | **Local template clone** — `.opencode/.temp-update/docs/<path>` | Present during `/update-workplace` (see [`git-source-setup.md`](../../project-update/references/git-source-setup.md) Step 2) → read it. |
| **2** | **HTTPS raw** — `{base}/-/raw/{branch}/docs/<path>` | Fetch with WebFetch. See [§3](#3-composing-the-url). |
| **3** | **Authenticated git** — shallow sparse clone | Only when Tier 2 hits the auth wall, and only with the user's consent (it writes to disk). |
| **4** | **Degrade honestly** | Everything failed. |

**Tier 2 → Tier 3 trigger.** `git.{bas_company}.com` is a **private** GitLab. WebFetch carries no credentials, so an unauthenticated raw request typically returns a sign-in page, not the document. Treat any of `Content-Type: text/html`, a `302` to a sign-in URL, `401`, or `403` as the **auth wall** — not a transport error. **Do not retry** and do not conclude the document is missing. This is the same signal `prepare-apm-packages.ps1` already uses when resolving the packages registry.

**Tier 4 — degrade honestly.** When the document cannot be read:

1. Name the document you could not read and which tier failed.
2. Print the **BLOB** URL so the user can open it themselves.
3. Answer from the `.opencode/` references instead, and say that is what you did.
4. Inside `/initialize`, record it as an **Open Gap** in `.opencode/project_init.md`.
5. **Never invent the document's content.** A guess about a procedure the user will follow is worse than an admission.

> **Prefer the helper over doing this by hand.** Tiers 0-3 are implemented by [`scripts/fetch-workplace-doc.js`](../scripts/fetch-workplace-doc.js) — see [§5](#5-helper-script).

---

## 3. Composing the URL

```
base   = .opencode/rules/.core-version.json → templateSource.url, trailing ".git" stripped
branch = .opencode/rules/.core-version.json → templateSource.branch   (absent/null → "master")

fallback when templateSource is missing entirely:
  base   = https://{insert correct url}
  branch = master
```

| Form | Pattern | Use for |
|---|---|---|
| **RAW** | `{base}/-/raw/{branch}/docs/<path>` | **Agent fetch** — plain markdown, no page chrome |
| **BLOB** | `{base}/-/blob/{branch}/docs/<path>#{anchor}` | **Showing a human** — rendered, anchors jump |

Worked examples on the default source (`master`):

```
RAW   https://{insert correct url}/-/raw/OpenCodeWP/docs/core/INITIALIZATION.md
BLOB  https://{insert correct url}/-/blob/OpenCodeWP/docs/core/MIGRATION_BACKUP.md#rollback
```

> GitLab also accepts the legacy `{base}/raw/{branch}/...` form (that is what `prepare-apm-packages.ps1` builds). Prefer the `/-/` form when authoring new links.

---

## 4. Version drift

The branch tip describes the **latest** template. The project runs `.opencode/rules/.core-version.json → version`.

- If they differ, **say so** before quoting a procedure from a fetched document — the user's Workplace may not have the step you just read.
- For anything **operational**, prefer the project's own `.opencode/` references, which are the version the project actually runs.
- For a version-pinned read, substitute a tag or release branch for `{branch}` in §3.

---

## 5. Helper script

```bash
node .opencode/skills/project-initialization/scripts/fetch-workplace-doc.js <doc-path> [options]
```

`<doc-path>` accepts `core/ROLES.md`, `docs/core/ROLES.md`, or bare `ROLES.md`.

| Option | Effect |
|---|---|
| `--url-only` | Print the RAW and BLOB URLs and exit. No local read, no network. |
| `--anchor=<slug>` | Append `#<slug>` to the printed BLOB URL. |
| `--json` | Machine-readable result: `{ok, source, path, rawUrl, blobUrl, bytes, reason, versionNote}`. |
| `--out=<file>` | Write the resolved content to a file instead of stdout. |
| `--allow-clone` | Permit Tier 3 (writes and then removes `.opencode/.tmp-docs-clone/`). Off by default. |
| `--no-network` | Tiers 0-1 only. |
| `--list` | Print the document map (§6) as a table, or as JSON with `--json`. |

Exit codes: **0** resolved · **2** bad usage · **3** unresolved (RAW + BLOB URLs are printed, and Tier 4 applies).

Typical calls:

```bash
# Which URL should I hand the user?
node .opencode/skills/project-initialization/scripts/fetch-workplace-doc.js core/ROLES.md --url-only

# Read the roles guide, allowing the authenticated-git fallback
node .opencode/skills/project-initialization/scripts/fetch-workplace-doc.js core/ROLES.md --allow-clone
```

---

## 6. Document map

Paths are relative to `docs/`. Compose URLs with §3; the anchors below are verified against the documents in this template.

| Path | What it answers | Read it when | Key anchors |
|---|---|---|---|
| `GETTING_STARTED.md` | Quick start: OpenCode pre-configuration, `/initialize` vs `/quick-init`, verification checklist | The user asks "how do I start / what do I run first"; onboarding a team member; initialization appears to do nothing | `#opencode-pre-configuration`, `#initialization`, `#quick-init-vs-full-initialization`, `#verification-checklist`, `#troubleshooting` |
| `ARCHITECTURE.md` | What the Workplace **is**: file structure, core concepts, key components, design principles | Explaining the template's structure; deciding where a new artifact belongs; scoping the Workplace to a narrow domain | `#file-structure`, `#core-concepts`, `#key-components`, `#design-principles`, `#domain-adaptation-for-narrow-scope-projects` |
| `PRESENTATION.md` | Executive pitch: problem/solution, before-after evidence, business value, FAQ | The user wants to present, justify, or pitch AI Workplace to management, or needs slide material | `#problem-and-solution`, `#same-model-same-repo-completely-different-results`, `#business-value`, `#frequently-asked-questions-faq` |
| `core/INITIALIZATION.md` | Canonical user-facing spec of `/initialize` and `/quick-init` | The start of any initialization run; "what will this do / which phase am I in / why did it pick EXISTING"; a phase failed | `#2-two-entry-points-full-vs-quick`, `#3-mode-auto-detection-new-vs-existing-vs-update`, `#5-phase-by-phase-reference`, `#13-verification-checklist`, `#14-troubleshooting` |
| `core/ROLES.md` | The 9 roles, per-role detail, MCP server mapping, command mapping, changing roles later | Phase 1.5 role selection; "which role fits me"; "how do I add a role after initialization"; MCP server questions | `#available-roles`, `#role-details`, `#mcp-server-mapping`, `#commands-mapping`, `#managing-roles-after-initialization` |
| `core/APM_PACKAGES.md` | User-facing APM guide: package types, catalogue, install paths, Platform AI marketplace + SSL, cheat sheet, troubleshooting, cross-harness, authoring | Any APM / package / `apm.yml` / marketplace question; authoring a package | `#catalogue-workplace-agent-packages-repo`, `#package-types`, `#installing-packages`, `#day-to-day-commands-cheat-sheet`, `#troubleshoot-a-failed-install`, `#authoring-new-packages` |
| `core/CUSTOMIZATION.md` | The three project-adaptation channels and what survives an update | The user wants to change agent behaviour or conventions; "where do I put my rules"; an edit risks being overwritten by APM or the Core copy | `#the-three-channels`, `#channel-1--adapt-apm-installed-artifacts`, `#channel-3--project-configjson--referencesguidelinesmd-per-context-skill`, `#update-safety-quick-reference` |
| `core/DEVELOPMENT_WORKFLOW.md` | Daily practice: session patterns, best practices, context management, team collaboration, documentation management | "How should I work day-to-day"; context is bloating; onboarding; you need the short guide | `#ai-workplace-short-guide`, `#daily-workflow`, `#context-management`, `#documentation-management`, `#quick-reference` |
| `core/TDD_WORKFLOW.md` | Full TDD guide: when to use, RED-GREEN-REFACTOR, commands, TaskMaster integration, framework support | TDD is proposed or requested and the `qa` pack's `/tdd-workflow` is not installed; test-strategy questions | `#when-to-use-tdd`, `#tdd-workflow-phases`, `#taskmaster-integration`, `#testing-framework-support` |
| `core/MIGRATION_BACKUP.md` | User-facing `/update-workplace` guide: the 3-step update, preserved vs overwritten, backups, rollback, migrations, manual fallback | The start of an update; "will I lose my changes"; a modified-Core-file prompt; a failed update needing rollback | `#update-in-3-steps`, `#what-is-preserved-what-is-overwritten`, `#backups`, `#rollback`, `#migrations`, `#modified-core-files` |
| `core/AGENT_CONTEXT_AND_DOCS_SYNC.md` | Authoritative spec of the docs-sync plugin and the link validator; how `.opencode/` context stays coherent with docs | The hook fired and you must explain it; tuning `docs-sync-config.json`; link-validation questions | `#documentation-analysis-docs-sync-checkjs`, `#link-validation-validate-doc-linksjs`, `#relationship-to-docs-sync`, `#configuration-docs-sync-configjson` |
| `core/HOW_WORKPLACE_IMPROVES_AGENTS.html` | Standalone HTML explainer: agent quality, context, accuracy, token economics against the presentation's claims | The user challenges the value claims or wants the evidence artifact | **No anchors** — HTML. GitLab does not render repository HTML; hand the user the BLOB (source) URL or a locally opened copy. |

---

## 7. Authoring rule for this template

> **Inside `.opencode/**`, every link whose target is under `docs/**` MUST be an absolute `https://` URL** built on the default `templateSource`. Never relative.
>
> **Inside `docs/**`, links between documents stay relative** — they ship together and are validated in the template repo.
>
> Links between `.opencode/**` files are plain relative Markdown links.

Why this rule exists, in one line each:

1. `docs/**` is `"optional": true` and is absent from most initialized projects, so a relative link is correct for one population and broken for the other.
2. In the population without `docs/`, a relative link from `.opencode/**` is a **blocking** `missing-file` finding — `docs/core/` is a workplace-owned prefix in `validate-doc-links.js` and is not in its `GENERATED_TARGETS`, and `--scope=workplace` is the default there. It can fail the `/initialize` Phase 7.5 link gate, `/docs-sync`, and `/update-workplace` Phase 7.
3. `validate-doc-links.js` skips absolute `http(s):` targets, so the absolute form is inert for the gate in **both** populations.
4. An absolute URL is also the *actionable* form — it is what you hand to WebFetch or to the user's browser.

**Trade-off to know:** absolute URLs are invisible to `validate-doc-links.js`, so the anchors in §6 are not machine-checked. Re-verify them when a `docs/**` heading changes. The anchor slug is the heading lowercased, punctuation stripped, spaces → hyphens.

---

## Related

- [`apm-workflow.md`](apm-workflow.md) — canonical APM operational contract (the `.opencode/` counterpart to `core/APM_PACKAGES.md`)
- [`subagent-contract.md`](subagent-contract.md) — canonical subagent dispatch contract
- [`git-source-setup.md`](../../project-update/references/git-source-setup.md) — how `/update-workplace` clones the template (Tier 1 above)
- `CHANGELOG.md` at the template repo root (also `"optional": true` in `coreFiles`) — per-release "what changed and why". RAW: `{base}/-/raw/{branch}/CHANGELOG.md`
