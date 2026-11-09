# Phase 1.7-APM — APM Package Activation

> Replaces the legacy Phase 1.7 (role-pack / full-module activation via `module-activation` skill and `/moduleActivate`) since Workplace template v4.0.0. Every detail of the APM workflow itself lives in [`apm-workflow.md`](apm-workflow.md); this page is the **phase-specific orchestration script** the initializer runs.

---

## Inputs

| Source | Field | Provided by |
|---|---|---|
| `.opencode/project_init.md` → `## Initialization State → Selected Role(s)` | comma-separated normalized roles | Phase 1.5 |
| `.opencode/rules/.core-version.json → apmPackages.registryRepoUrl` / `registryBranch` | repo URL + branch for the built-in package registry (the standalone Workplace-Agent-Packages repo) | Phase 0 / Project Updater |
| `.opencode/rules/.core-version.json → apmVersion` | confirmed APM CLI version | Phase 0 |

## Outputs

| Artifact | Written by |
|---|---|
| `apm.yml` at project root with `dependencies.apm:` populated and `compilation.agents_md.mode: managed_section` | This phase (step 4) |
| `apm.lock.yaml` | `apm install` (step 5) |
| `.opencode/agents/`, `.opencode/commands/`, `.agents/skills/` (package skills), `opencode.json → mcp` updates | APM deploy (step 5) |
| `.workplace/state.json`, `.workplace/activated/<pkg>.marker`, relocated `<RuntimeRoot>/` folders | Each module's `scripts/activate` (invoked by this phase, step 5.2) |
| `.opencode/.temp-apm-selection.json` | `prepare-apm-packages.ps1` (step 2) — deleted at end of phase |

The legacy artifact `.opencode/rules/role-packs-state.json` is **gone**. Phase Transition Validation now reads from `apm.lock.yaml` (authoritative "what is installed") and `.workplace/state.json` (activation status).

---

## Step-by-step

### Step 1 — Choose registry source

Before asking, **pre-detect**:

- Inspect `apmPackages.registryRepoUrl` in `.opencode/rules/.core-version.json` (the standalone Workplace-Agent-Packages repo; legacy projects without this field fall back to `templateSource.url`):
  - Public GitHub raw endpoint (`github.com` / `raw.githubusercontent.com`) → no auth expected.
  - Private hosts (`git.*`, `gitlab.*`, `bitbucket.*`, `dev.azure.com`, internal domains) → **enable `-AllowGitFallback` by default** so the script can use the user's authenticated git credentials if HTTPS raw is auth-walled.

Then ask a single AskQuestion with three options (default = «Built-in»):

1. **Built-in Workplace catalogue** (default) — fetch via the resolution ladder in Step 2 (HTTPS → git → offline) from the Workplace-Agent-Packages repo.
2. **External URL(s)** — user supplies one or more URLs that match `_schema/index.schema.json`.
3. **Both (merged, built-in wins on conflict)** — Workplace + external mirrors / forks.

Record the choice and the detected pre-conditions (private vs public registry host) in the Decision Log §1.7 along with the URLs ultimately used and the eventual `resolvedVia` value reported by the script.

### Step 2 — Run `prepare-apm-packages.ps1`

```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 `
  -Roles <selected> -Mode <builtin|external|both> [-ExternalUrls <urls>] [-AllowGitFallback]
```

> **Default:** pass `-AllowGitFallback` whenever `apmPackages.registryRepoUrl` is a host that **may** require authentication (e.g. private GitLab/Bitbucket/Azure DevOps). For `github.com` raw URLs the flag is harmless. The flag enables resolution step 2 below (authenticated `git clone --depth 1 --filter=blob:none --sparse`).

The script runs this resolution ladder for the built-in source and short-circuits on first success:

| # | Source | When it wins | Effect on `sources[].resolvedVia` |
|---|---|---|---|
| 1 | HTTPS raw URL from `apmPackages.registryRepoUrl` (`<repo>/raw/<branch>/index.json`) | Public repos / pre-auth'd raw endpoints | `https-raw` |
| 2 | Authenticated `git clone --depth 1 --filter=blob:none --sparse` of `apmPackages.registryRepoUrl` | HTTPS returned HTML auth wall, or `-AllowGitFallback` was set, AND `git` is on PATH and configured with credentials | `git-clone` |
| 3 | Offline snapshot at `.opencode/rules/packages-index.json` (shipped by the template, refreshed by `/update-workplace`) | Steps 1-2 all failed | `offline-snapshot` |

External URLs (`-Mode external` / `both`) follow the same HTTP error-handling and HTML-detection logic, but **never** use the git fallback (we can't guess the matching git URL for an arbitrary index URL).

The script writes `.opencode/.temp-apm-selection.json` with:

- `selectedRoles`
- `mode`, `roleAgnosticOnly` and `sources` (each entry: `url`, `resolvedVia`, `priority`, `generatedAt`)
- `matchedPackages` (auto-activate)
- `optionalPackages` (offer in Step 3)
- `standaloneOnlyPackages` (informational — NOT offered here; `/quick-init` Step 4.5 does offer them)
- `roleAgnosticPackages` (empty `targetRoles` — written for `/quick-init` Step 4.5, unused by this phase)
- `requiredContextSkills`
- `generatedAt` (when the selection file itself was written)

**Record `sources[].resolvedVia` in the Decision Log §1.7** — it's the diagnostic value the user/agent needs later if the install behaves differently than expected (e.g. offline snapshot used because the live registry was unreachable).

If the script throws "No registry index available" the error message contains a reason-specific action list:

| Reason printed | What the agent should propose to the user |
|---|---|
| Registry URL returned HTML (auth wall) | Re-run with `-AllowGitFallback` (preferred). Or test the URL: `git ls-remote <apmPackages.registryRepoUrl>` — if it prompts, ask the user to authenticate to that host once (Git Credential Manager / SSH key / personal access token). |
| HTTP error (404 / 5xx / network) | Verify `apmPackages.registryRepoUrl` and branch in `.opencode/rules/.core-version.json`. Offer to retry. |
| Non-JSON body / `invalid-json` | The URL points at the wrong file. Offer to switch to `-Mode external` with a confirmed `index.json` URL. |
| Offline snapshot used | Continue, but warn the user that `apm install` will still need network to fetch the actual packages — `apm.lock.yaml` will be tried first. |

Only abort Phase 1.7-APM if **all four ladder steps fail AND the user has no usable external URL**.

### Step 3 — Pass A.5 (optional packs)

Read `optionalPackages` from the selection file. If non-empty, present a batched yes/no prompt (one bullet per package, with `name`, `description`, and `targetRoles`). Record acceptances + declines in Decision Log §1.7.

Standalone-only packages are listed for informational purposes only — instruct the user that they can be added later via direct `apm install` (see `apm-workflow.md` Section 8).

### Step 4 — Write `apm.yml`

Create (or update) `apm.yml` at the **project root**. Every package lives as a **top-level directory in the Workplace-Agent-Packages repo**, so the APM dependency entry MUST use the **dict form** (`git:` + `path:` + `ref:`) where `path` is the bare package id.

> **Why dict form and not the shorthand (corrected 2026-07-15, Context7 cross-check against `/microsoft/apm`).** The shorthand grammar is `[host/]owner/repo[/virtual-path][#ref]` and it is **not** github.com-exclusive — `gitlab.com` is auto-detected, self-managed GitLab works once `GITLAB_HOST`/`APM_GITLAB_HOSTS` is exported, and Bitbucket/Azure DevOps have their own recognized prefixes. But Workplace's registry host (`git.{bas_company}.com`) is an **un-hinted self-hosted FQDN** — nothing in the initializer flow sets `GITLAB_HOST`, so APM has no way to tell where `owner/repo` ends and the package-id `virtual-path` begins, and upstream itself recommends object form once repo nesting goes past `group/subgroup/repo` (Workplace's `DEMO.SE.AI/Workplace-Agent-Packages/<package-id>` shape qualifies). Dict form sidesteps this entirely and needs no extra env var — that is why it stays mandatory here, not because the shorthand is github.com-only.

Emit each accepted package as a YAML mapping:

```yaml
targets:
  - opencode                             # mandatory: pins the deploy target above any machine default

dependencies:
  apm:
    - git: <apmPackages.registryRepoUrl>   # Workplace-Agent-Packages repo, .git URL
      path: <package-id>                    # package id at the repo root (no packages/ prefix)
      ref: <apmPackages.registryBranch>     # tag / branch / commit SHA
      alias: <package-id>                   # optional, recommended — keeps short names in lockfile
```

**Concrete example (matches the canonical Workplace catalogue on a self-hosted GitLab):**

```yaml
targets:
  - opencode

dependencies:
  apm:
    - git: https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages.git
      path: frontend-developer
      ref: master
      alias: frontend-developer
    - git: https://git.{bas_company}.com/DEMO.SE.AI/Workplace-Agent-Packages.git
      path: api
      ref: master
      alias: api

# AGENTS.md co-ownership (template v4.5.0+, APM 0.28.0): APM regenerates ONLY the
# <!-- apm:start --> / <!-- apm:end --> region; everything outside stays hand-written.
compilation:
  agents_md:
    mode: managed_section
```

`targets: [opencode]` is **mandatory** in every Workplace-generated `apm.yml` — it pins the deploy target above any machine default (`apm config set target`, `default_client` in `~/.apm/config.json`), and the install wrapper refuses to run without it. The `compilation.agents_md.mode: managed_section` block is **mandatory** in every Workplace-generated `apm.yml` (see `apm-workflow.md` Section 5 → "AGENTS.md co-ownership"). Together with the `<!-- apm:start -->` / `<!-- apm:end -->` pair that Phase 7's `agents-template.md` writes into `AGENTS.md`, it scopes `apm compile` to the managed region. If `apm.yml` already exists without the block (re-initialization), add it — unless the project explicitly set another mode, in which case report instead of overwriting.

**GitHub-only optimisation (informational).** For public GitHub repos the virtual-package shorthand `owner/repo/subpath#ref` works (e.g. `microsoft/apm-sample-package/skills/security#v1.0.0`), confirmed current on APM 0.28.0. The initializer MAY emit that form **only** when `registryRepoUrl` host is exactly `github.com` and `git.host == "github.com"`. For every other host (self-hosted GitLab/Bitbucket/Azure DevOps, internal `git.*` domains) **always** emit dict form — not because the shorthand categorically fails there, but because none of those hosts are pre-classified anywhere in the Workplace init flow (no `GITLAB_HOST`/`type: gitlab`) and upstream itself steers multi-segment repo paths toward object form. When in doubt, emit dict form — it needs no host-specific configuration and works on every host.

**Source of these field values.** Read `git` and `ref` from `.opencode/rules/.core-version.json → apmPackages.registryRepoUrl` / `apmPackages.registryBranch`. The `path` is the bare `<package-id>` for entries from the built-in catalogue (packages live at the repo root). For external URL packages (Step 1 mode `external` / `both`), the index entry must already provide `git`, `path`, and `ref` explicitly.

If `apm.yml` already exists (re-initialization), merge into the existing `dependencies.apm:` list by `alias` (or `git + path` if `alias` is absent), preserving any third-party dependencies the user added manually. **Do not rewrite hand-edited entries** — only append missing ones.

### Step 5 — Run `apm install`

#### 5.0 — Pre-flight credential check (MANDATORY for private hosts)

**Before** running `apm install`, classify the host extracted from `apm.yml` `dependencies.apm:` entries (typically `apmPackages.registryRepoUrl`):

| Host pattern | Auth class | Required action before `apm install` |
|---|---|---|
| `github.com` (public repo), `raw.githubusercontent.com` | **Public** | None — proceed directly to 5.1. |
| `github.com` (private repo), `gitlab.com`, `bitbucket.org` | **Cloud, possibly private** | Run `git ls-remote <host>` once. If it returns refs → creds cached, proceed. If it prompts / errors → go to 5.0a. |
| `git.*`, `gitlab.*`, `bitbucket.*`, `dev.azure.com`, custom internal domains | **Private (high hang risk)** | Mandatory `git ls-remote <apmPackages.registryRepoUrl>` smoke test with a 15-second timeout. Behaviour below. |

Why: `apm install` clones each package's source repo via git. On private hosts, git delegates auth to Git Credential Manager (Windows) / `osxkeychain` (macOS) / `libsecret` (Linux). If the user has never authenticated to that host **in the same shell environment the agent is using**, git blocks on a GUI/TTY prompt the agent cannot see. The chat session then appears to hang on `apm install` until the agent's Shell timeout expires (usually 60 s). The pre-flight test reproduces the same hang in 15 s with a clear failure mode — much faster than burning a full `apm install` cycle.

#### 5.0a — When the smoke test reveals a credential gap

If `git ls-remote` against a private host **prompts, errors with auth-related output, or hangs for ≥ 15 s**, do **NOT** run `apm install` from the agent's shell. Instead, present the canonical recovery dialog (AskQuestion with these four options, default = **B** for any host classified as private):

```
⚠️ Phase 1.7-APM — apm install is likely to hang

Detected private host: <host>
Reason: `git ls-remote` <prompted for credentials | timed out after 15 s | returned auth error>

A clean install needs to fetch <N> packages from <apmPackages.registryRepoUrl>
(typical: 1–3 minutes per package on a private host: auth handshake + sparse clone).

How would you like to proceed?

  [A] Retry inside this chat shell with a 5-minute timeout.
      Risk: if Git Credential Manager pops up outside the chat, the agent will
      not see it and the command will hang to timeout.

  [B] Run it manually in your own terminal  (recommended for private hosts).
      The agent will print the exact command. Open a regular PowerShell / bash
      window where credential prompts surface normally; reply "done" once
      `apm.lock.yaml` exists. The agent then verifies and continues.

  [C] Skip APM install for now — proceed to Phase 2+ without role-pack primitives.
      Phase 6 Part 3.5 (mandatory guidelines.md gate) will fail validation
      until `apm install` is run later.

  [D] Abort initialization — leave the project in a half-configured state.
```

Manual command for option **B** (Windows PowerShell shown; emit the platform-appropriate variant):

```powershell
cd "<absolute-project-path>"
node .opencode/skills/project-initialization/scripts/apm-install-preserving.js
```

After the user reports `done` for option **B**, verify by reading `apm.lock.yaml` and listing `.agents/skills/<context-skill>/` for at least one expected package skill. Only then advance.

**For option A**, run the install with an explicit longer block (e.g. `block_until_ms: 300000` = 5 min) and a status-watch pattern so the agent fails fast if no progress is reported.

**For option C**, mark every entry of `requiredContextSkills` as `pendingGuidelines: deferred-apm-install` in the Decision Log; Phase 6 Part 3.5 will refuse to pass and surface the same recovery to the user.

Record the chosen branch (A / B / C / D) and outcome in Decision Log §1.7 as a Q-block.

#### 5.0b — Pre-flight health check of inherited state (MANDATORY)

An `apm.lock.yaml` / `apm_modules/` left behind by an earlier interrupted run is not neutral: APM judges freshness by the lock entry, so a **poisoned** entry (`package_type` other than `apm_package`, `version: unknown`, or `content_hash: sha256:e3b0c442…b855` — the hash of empty input) makes every later `apm install` print `(files unchanged)` and re-materialise nothing. The package then stays an empty directory skeleton that passes existence checks, and the failure only surfaces at the Phase 6 Part 3.5 gate, phases away from its cause. APM does not self-heal this.

Run the health gate over whatever state the project already has:

```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/validate-apm-install.ps1 -PreInstall
```

(`powershell` is the Windows PowerShell 5.1 executable present on every Windows machine; `pwsh -File …` is equivalent where PowerShell 7+ is installed. See [`environment-setup.md` → Running the Workplace `.ps1` scripts](environment-setup.md#running-the-workplace-ps1-scripts-read-before-the-first-script-call).)

> **`-PreInstall` is mandatory here.** It runs the three inherited-state checks (lock integrity, empty cached trees, leftover staging directories) and skips the required-context-skill check. That check asks whether packages *delivered* their content, which nothing can have done before step 5.1 — step 2 has already written `requiredContextSkills` into `.opencode/.temp-apm-selection.json`, so without the switch this gate fails every role-matched skill on a perfectly healthy fresh project. The full check runs at **5.1a**, after the install.

- **Exit 0 / only warnings** (on a fresh project both warnings are expected: "apm.lock.yaml does not exist" and "pre-flight mode: required-context-skill check skipped") → proceed to 5.1.
- **Exit 1** → inherited state is poisoned; purge before installing, do not install on top. (A virgin project cannot reach this branch — there is nothing to inherit.) The script prints the exact remediation per finding: delete the poisoned cached tree, then remove that entry from `apm.lock.yaml` (or delete the lockfile entirely to force a full re-resolve), then install. **Never hand-create the missing files** — a package's own content is the only valid source, and a hand-made `SKILL.md` produces a skill that looks installed and behaves like a stub forever.

Record in Decision Log §1.7 whether inherited state was clean or had to be purged, and which packages were purged.

#### 5.1 — Run the install

```bash
node .opencode/skills/project-initialization/scripts/apm-install-preserving.js
```

Hard rules:

- The wrapper is **mandatory** — see `apm-workflow.md` Section 5: it pins `targets: [opencode]`, restores every initialized `.agents/skills/<name>/project-config.json` and rendered `references/guidelines.md` after APM redeploys the package copies (a plain `apm install` overwrites them — verified on 0.28.0), and reports packages APM skipped for target incompatibility. Treat every `WARN incompatible-target:` line as an Open Gap: remove the package from `apm.yml` before `apm compile`, because its instructions would still be compiled into `AGENTS.md`.
- If APM prompts about MCP transitive trust, surface the prompt verbatim and only continue on explicit user approval.
- If `apm install` fails or hangs **after** the 5.0 smoke test passed (rare — usually network blip mid-clone), report the failure, do not advance to the next phase, and offer the same A / B / C / D dialog from 5.0a.

After success, APM has:

- Written `apm.lock.yaml`.
- Deployed primitives into `.opencode/agents/` (agents), `.opencode/commands/` (prompts) and `.agents/skills/` (package skills).
- Merged any package-declared MCP servers into `opencode.json` additively (Phase 1.5 servers are preserved).
- Skipped every package hook descriptor — the opencode target deploys no hooks (OpenCode has none); activation always runs via direct script invocation (step 5.2).
- `AGENTS.md` is NOT rewritten by `apm install` itself; with `compilation.agents_md.mode: managed_section` set (Step 4), a later `apm compile` (targets from `apm.yml`) populates only the `<!-- apm:start -->` / `<!-- apm:end -->` region. Phase 7 writes everything outside that region.

#### 5.1a — Post-install health gate (MANDATORY)

Re-run the same script immediately after the install, now with the required set from the selection file in play:

```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/validate-apm-install.ps1
```

It reads `requiredContextSkills` from `.opencode/.temp-apm-selection.json` (plus the two unconditional `coreContextSkills`) and fails when a required context skill (package skills under `.agents/skills/`, the two Core context skills under `.opencode/skills/`) is absent, empty, or missing `SKILL.md` / `references/template.md`. This is what distinguishes "APM said success" from "the packages actually landed with content" — the two diverge exactly in the poisoned-lock case described in 5.0b.

Exit 1 here means **do not advance to Step 5.2 or Phase 2**. Apply the printed remediation and re-install; re-running `apm install` alone changes nothing while the lock entry still looks current.

#### 5.2 — Activate full modules (and verify by artifacts)

`apm install` does **not** activate `type: module` packages, and on the opencode target no package hook is deployed at all (`apm-workflow.md` Sections 3 and 6). Unless this step runs, an installed module stays dormant: its runtime folder never reaches the project root and `.workplace/<pkg>/config.json` is never written.

Run it for every accepted package whose index entry (or `apm.yml`) declares `x-workplace.type: module`:

1. **Resolve the package root** — the directory under `apm_modules/` that contains **both** `apm.yml` and `runtime/`. Do not construct `apm_modules/<package-id>/` by hand: dict-form git dependencies land at `apm_modules/<git-group>/<repo>/<package-id>/`, and an `alias:` changes it again.

   ```powershell
   Get-ChildItem -Path apm_modules -Recurse -Filter apm.yml |
     Where-Object { Test-Path (Join-Path $_.Directory.FullName 'runtime') } |
     Select-Object -ExpandProperty Directory
   ```

2. **Tell the user what will be relocated** (each top-level entry of `runtime/` becomes a folder in the project root) and invoke the script from that root: `powershell -ExecutionPolicy Bypass -File "<package-root>/scripts/activate.ps1"` or `bash "<package-root>/scripts/activate.sh"`.

   > The only copy of the activation script is the one under `apm_modules/` resolved in step 1 — the opencode target deploys no hook-side copies.

3. **Verify by payload, not by marker** — this is the gate:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/verify-apm-activation.ps1
   ```

   Exit code 0 means every installed module is either fully activated or cleanly not activated. Exit code 1 means at least one is `FALSE_POSITIVE` or `PARTIAL`: re-run with `-Repair` (clears the bogus marker and state entry), then repeat step 2 with the command the verifier printed. Do not report activation as successful on the strength of the marker alone.

Record in Decision Log §1.7: which modules were activated, which runtime folders were relocated, and the verifier's final status per module. If a module cannot be activated (interpreter missing, permission denied, `PACKAGE_INCOMPLETE`), report it and continue — but list it as an Open Gap rather than silently leaving it half-configured.

#### 5.3 — Restart note

OpenCode reads agents, commands and skills once at startup. Tell the user that the package primitives deployed in this phase become visible to the agent at the next `opencode` start; initialization continues in the current session, because Phases 2–8 read files, not the skill tool.

### Step 6 — Hand off to Phase 6 Part 3.5

The set `requiredContextSkills` (from the selection file) MUST be carried into Phase 6 Part 3.5 verbatim. That gate verifies every required context skill produced a valid `references/guidelines.md`. **No semantic change** vs. the previous (pre-APM) gate.

### Step 7 — Clean up

```powershell
powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/prepare-apm-packages.ps1 -Cleanup
```

Removes `.opencode/.temp-apm-selection.json`. APM's own caches (`apm_modules/` if not gitignored, etc.) are managed by APM — leave them alone.

---

## Phase Transition Validation (replaces SKILL.md row 1.7)

| Check | How to verify |
|---|---|
| `apm.lock.yaml` exists and lists every accepted package | Read the lockfile |
| No lock entry is poisoned; no cached package tree or required context skill is empty; every required context skill has `SKILL.md` + `references/template.md` | `validate-apm-install.ps1` exits 0 (Step 5.1a) |
| Every accepted package's primitives present under `.opencode/{agents,commands}/` and `.agents/skills/` | Covered by the line above — a name-only spot-check passes on the empty directory skeletons this gate exists to catch, so do not substitute it |
| `apm.yml` `dependencies.apm:` contains every accepted package | grep / parse |
| No package was skipped for target incompatibility, or each skipped one is recorded as an Open Gap and removed from `apm.yml` | wrapper summary line `skipped-by-target 0`, Decision Log §1.7 |
| `.opencode/.temp-apm-selection.json` deleted | Test-Path |
| Every accepted `type: module` package is activated, or explicitly recorded as an Open Gap | `verify-apm-activation.ps1` exits 0 (Step 5.2) |
| Decision Log §1.7 has Q-blocks for: registry source, Pass A.5 offer, standalone-only informational notice, any install failures, module activation results | Read ledger |

The two scripts answer different questions and do not overlap: `validate-apm-install.ps1` judges whether packages **installed with content** (lock integrity, non-empty trees, required context skills complete), `verify-apm-activation.ps1` judges whether a full module was **activated** (its `runtime/` payload relocated into the project). Run order in this phase is: install health (5.0b pre-flight → 5.1a post-install) → activation (5.2) → activation verification (5.2 step 3).

> **No PowerShell interpreter on this host.** Both gates are `.ps1`. Where neither `pwsh` nor `powershell` resolves (a bare Linux box), the checks cannot be evaluated — do **not** improvise past them and do **not** mark the rows above as passed. Record each unrun gate under `## Open Gaps` in the ledger with the reason, tell the user which verification is missing and how to run it later, and continue. See [`environment-setup.md` → Running the Workplace `.ps1` scripts](environment-setup.md#running-the-workplace-ps1-scripts-read-before-the-first-script-call).

Judge activation by the relocated `runtime/` payload, never by the presence of `.workplace/activated/<pkg>.marker` or a `status: "active"` entry in `state.json` — both are written by the activation script itself and are present even after a run that copied nothing ([`apm-workflow.md`](apm-workflow.md) Sections 6.1/6.2). If no module packages were installed, Step 5.2 is a no-op and the verifier reports "nothing to verify".

---

## Troubleshooting install outcomes (verified on APM 0.28.0, `opencode` target)

Three states look alike from the agent's chair and have different remedies. Read the lock, the cache and the skill roots before acting — never re-run `apm install` as a reflex.

| Symptom | State | Remedy |
|---|---|---|
| `apm install` exits 0, prints `Installed N APM dependencies` and `Cleaned K stale files`, but `.agents/skills/<name>/` is empty or missing and `apm_modules/<name>/` holds no files | **Poisoned lock entry with an empty cached tree** (`package_type: invalid`, `version: unknown`, empty-input hash). APM treats the entry as current, restores nothing and deletes the previously deployed files as stale; the entry may now carry the repository name instead of the package alias | Delete every lock block whose `package_type` is `invalid` (or delete `apm.lock.yaml` entirely), remove `apm_modules/<name>/`, then run the wrapper again. `validate-apm-install.ps1 -PreInstall` detects this state and prints the command |
| `apm install` fails: `Content hash mismatch for <package>: expected sha256:e3b0c442…, got …` | Poisoned lock entry, cached tree removed | Same purge — the mismatch is APM comparing fresh content to the empty-input hash; do **not** accept it with `--update` (that re-resolves every dependency) |
| `[!] [<package>] Package targets [cursor] do not overlap authorized active targets; skipping` | The package pins another harness in its own manifest; none of its primitives is installed, yet `apm compile` still compiles its `.apm/instructions/` into `AGENTS.md` | Record an Open Gap naming the package, remove it from `apm.yml` before `apm compile`, and file the catalogue issue (`targets:` must include `opencode`) |
| Skills appeared under another harness's skill directory (e.g. `.claude/skills/`), or `.agents/skills/` is empty while that other harness directory exists | Wrong target: `apm.yml` has no `targets:` and the machine default (`apm config set target`, `~/.apm/config.json`) or auto-detection chose another harness | Add `targets: [opencode]` to `apm.yml` (Step 4) and re-run the wrapper; the wrapper refuses to run without it |
| `.agents/skills/<name>/references/guidelines.md` missing after install | Not an install problem — packages never ship the rendered file | Phase 6 Part 3 renders it; Part 3.5 verifies it |
| `.agents/skills/<name>/project-config.json` reverted to `initialized: false` after an update | `apm install`/`apm update` redeployed the package copy over the initialized one | Always install through `apm-install-preserving.js` — it restores the initialized copy and logs `preserved:`; if a plain `apm install` already ran, restore the file from git history |
| New package agents, commands or skills are not visible to the agent after install | OpenCode reads its configuration once at startup | Restart OpenCode; initialization itself continues in the current session because later phases read files, not the skill tool |

## What this phase explicitly does NOT do anymore

- It does not call `/moduleActivate` (the command no longer exists).
- It does not write `.opencode/rules/role-packs-state.json` (removed).
- It does not clone the Workplace template into `.opencode/.temp-rolepacks-clone/` (replaced by HTTPS index fetch).
- It does not "copy byte-for-byte" agent/skill/command files (APM does it via its deploy step).
- It does not rely on package hooks to activate modules — the opencode target deploys none, so step 5.2 invokes each module's `scripts/activate.*` directly and verifies the result.
