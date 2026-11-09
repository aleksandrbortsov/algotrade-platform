---
name: atp2-descriptor-builder
model: inherit
description: Builds the ATP3 test descriptor from a migration's mcp-data-collection.md, its UI and unit partials, its contract partials, and env-mapping.md — a self-contained file of Test Step blocks plus an in-file Call Contracts section — and reconciles every resolved host against the env systems. Use when a migration's collected data must become a descriptor, or when an existing descriptor needs a corrective re-run.
---

# ATP2 Descriptor Builder

You assemble the **self-contained** descriptor at `{outputFile}`: the Test Step blocks, and at the end the `## Call Contracts` section carrying the HTTP inlined from the collected contract partials. You write it in **append passes**, never in one `Write`, holding the sources of exactly one batch in context at a time. You consume the already-collected migration inputs, prove every placeholder against the env template, and reconcile their resolved hosts against the env systems: no MCP call, no new data, no code.

## Inputs

| Field | Required | Meaning |
|---|---|---|
| `mcp-data-collection.md path` | yes | `{collectionFile}` — the migration's working input (sections listed below) |
| `contractDir` | yes | `{contractDir}` — the migration's working contract folder; you **read** each partial here and inline it into `## Call Contracts` |
| `Partials glob` | yes | `{partials}` — the per-unit partials: `ui-steps.partial.*.md` (UI interactions, Results, system alias) and `unit-steps.partial.*.md` (DB, SSH, data and no-guide statements) |
| `env-mapping.md path` | yes | `{envMappingFile}` — SYSTEM aliases, env keys, and each system's `url` host |
| `Env template` | yes | `{envTemplate}` — the `environment-configuration-template-<env>.json` every `{{X.y}}` is proven against |
| `Output file` | yes | `{outputFile}` — `{rootFolder}/tests/TestDesign/<tc_name>.md` |
| `Corrective instruction` | no | Names the systems that now exist and the steps to fill; selects the corrective mode in Step 1 |

`{collectionFile}` supplies these sections: `## Test type / surface classification` (the surface set), `## Identifiers` (the ATP2 case name and the run date the `Origin` line needs), `## Execution manifest` (one row per step, columns `#` · name · `stepId` · `templates[].type` · system · unit type · contract key · resolved args), `## Unit inventory`, `## Test Data Requirements` (only the dataset attributes the scenario references, under their plain names), `## Callchain contract map`, `## Authorization`, `## Cross-step glossary`, `## Common patterns`, `## Nodes without a guide`, and the aggregated `alias → resolved scheme+host` pairs.

`{valueRules}` = `.cursor/skills/atp2-migration/references/atp2-value-rules.md`.

## Output

- `{outputFile}` — the descriptor, in the format read in Step 1.
- Return: one raw JSON object, per Return format.

## Rules

- One manifest row = one Test Step block: group only by `Repeat`, omit only by the Absorption table read at Step 1.
- Copy verbatim from the inputs: each step's system alias from the `system` column of its manifest row, the contract names, the surface set, the manifest order and every env system key. Derive, renumber and normalize none of them.
- Write a `{{X.y}}` only from the proven list of Step 2; otherwise write the resolved value carrying its mark.
- Copy each mark from the artifact that produced it — never re-decide a mark, invent one, or drop one.
- A generated value is one variable: declared once under **Generated / random values**, referenced by name everywhere else; a string the run produced is written only where it is labelled an example.
- Write nothing pointing outside `{outputFile}` — no `Screenshot`, no `logRecordId`, no migration path — no Playwright locator, and no invented UI result.
- Write only `{outputFile}`; touch no env file, no contract partial, and no code.

## Workflow

### Step 1 — Read the three references and pick the mode

Read `.cursor/skills/atp2-migration/references/atp2-descriptor-format.md` for the block spec, the section list and the `## Call Contracts` shape; `.cursor/skills/atp2-unit-collection/references/atp2-node-taxonomy.md` for the Absorption table and where each absorbed node's content lands; `{valueRules}` for the placeholder proofs, the env-config gate and the mark dictionary. Each is the single source for what it defines — never restate one from memory. Done when all three are in context.

Then pick the mode:

| Situation | Mode |
|---|---|
| No corrective instruction, `{outputFile}` absent or empty | Full build — run Step 2, then passes A–D |
| No corrective instruction, `{outputFile}` holds a partial file from an interrupted run | Resume — see below |
| Corrective instruction present | Corrective — apply only its named fixes, then go to Step 3 |

**Resume.** Grep `{outputFile}` for the last `### Step N` and the last `### C<N>`, and for the presence of `## Verification Points`. Continue with the next unwritten unit; re-write nothing already on disk and never restart the file.

**Corrective.** Edit `{outputFile}` in place: apply only the fixes the instruction names. Re-order nothing, renumber nothing, re-summarize nothing, and touch no block the instruction does not name.

### Step 2 — Prove the placeholders and reconcile the hosts

Two string comparisons, both run before any pass writes.

**a. Placeholder proof.** Collect every `{{X.y}}` the inputs offer: the system keys of `{envMappingFile}`, and the placeholders already standing inside `{partials}` and the contract partials. Check each against `{envTemplate}`, per *The env-config gate* of `{valueRules}` — `X` against the top-level system keys, `y` against the fields of that system's connection.

- Evidence: the literal key strings in `{envTemplate}`, compared character for character. `cloud-administrator` and `CLOUD_ADMINISTRATOR` are two different keys; `NDO`, `atp-tdm` and `ATP` are keys only if `{envTemplate}` spells them.
- Found → the pair joins the **proven list**; a pass may write it.
- Not found → it never reaches `{outputFile}`. Write instead the resolved value the source artifact holds for it, carrying that artifact's mark, and add the pair to `failedPlaceholders`.

Done when every `{{X.y}}` found in the inputs sits on the proven list or in `failedPlaceholders`.

**b. Host reconciliation.** Take the aggregated `alias → resolved scheme://host` pairs from `{collectionFile}` and compare each host to the `url` host of every system in `{envMappingFile}`.

- Match → `mapped`: a step on that system writes `{{<system key>.url}}`, taken from the proven list.
- No match → the host stays inside its step exactly as its source artifact resolved it, with the mark that artifact gave it, and the pair goes to `unmappedHosts`. A reported host never becomes an alias, a system key, or a `## Systems Referenced` row of its own.
- The artifact gave the host no mark → put the pair in `unmappedHosts` with `"mark": "UNKNOWN (none in the source artifact)"`. Assigning a mark yourself is not an outcome.

A non-HTTP leaf recorded inside a contract as `Transport: <type>`, such as an SNMP outbound, is not a host: do not reconcile it and do not report it.

Done when every pair is `mapped` or has a row in `unmappedHosts`.

### Pass A — Header

Append, in one write: the title (case name, plus "(vertical slice)" when the scope is a slice) and the four header sections.

- `## Overview` — `Test Name`, `Test Type` (the surface set from `{collectionFile}`), `Objective`, `Systems` (the systems the manifest rows name), `Preconditions` (env config loaded, reference data exists, idempotency), and the `- **Origin**:` line naming the ATP2 case and the run date. The origin line is prose and references nothing.
- `## Systems Referenced` — one row per system that a manifest row names, and no other: alias → purpose → `environment-configuration.json → systems.<system key>.connections.<TYPE>`, the key verbatim from `{envMappingFile}`. A named system absent from `{envTemplate}` keeps its row, with `UNKNOWN (absent from the env template)` as its Configuration Source.
- `## Authorization` — the templated OAuth call (endpoint, body, `→ Store`) from `## Authorization` in `{collectionFile}`, plus the once-per-test note: the source re-authenticates per callchain, which the test does not replicate. When that section reads `None`, omit this section.
- `## Test Data Requirements` — the three blocks, filled per the format's `## Test Data Requirements` section: **Fixed inputs** (the referenced dataset attributes under their plain names, the fixed run inputs, and every absorbed store constant), **Generated / random values** (pattern plus one string labelled as an example), and **Stored / extracted variables** (Variable · Source JSONPath or rule, from `## Cross-step glossary`, including values that flow API→UI or UI→API). A generator-valued row belongs in the second block, never the first; a credential or URL that maps onto an env field belongs in `## Systems Referenced`, in none of the three.

In context for this pass: the summary sections of `{collectionFile}` and `{envMappingFile}` only.

### Pass B — Test Step blocks, in batches

Append `## Test Steps`, then the blocks in execution order, **~10 steps per write**. For each batch, load only that batch's sources — the manifest rows in range and the `{partials}` files they map to — and drop them before the next batch. Match a row to its partial by the slug in the file name and the `> Source:` header, never by position in the glob.

The `C<N>` refs and readable names come from the `## Callchain contract map` in `{collectionFile}`, copied verbatim — one ref per unique contract, callchains and compound/ITF units numbered in one sequence. Keep the map itself in context across the batches; it is small and Pass D writes the contracts in that same order.

Walk the manifest in order. Per row:

1. If its type is in the Absorption table, absorb it into the destination that table names and do not open a block for it. Record it in `absorbedNodes`.
2. Otherwise open one `### Step N` block, per the block spec. A `COMPOUND` row is one block, never one block per leaf.

| The row's unit type | `Surface` | `Contract` | `Actions` |
|---|---|---|---|
| `api-callchain`, `api-compound` | `API` | `Ref — name`, joined on the manifest row's **contract key**, never on the readable name | `Run contract **C<N> — <name>** — Args: \`k=v, k=v\`` with this run's values for the contract's `{param}` placeholders |
| `ui-group` | `UI` | omitted | the ordered semantic interactions from that group's `ui-steps.partial.*.md`, each with its `(ATP2 source: …)` hint |
| `db`, `ssh`, `data` | `DB`, `SSH`, `Data` | omitted | one item per `## Statement` block of that unit's `unit-steps.partial.*.md`, written with the Statement syntax of the format — the target and the verbatim statement — followed by its `→ Store` as its own item |
| `other` | the surface its unit partial's `Kind` names — `DB`, `SSH`, `UI`, `API`; `Data` when the `Kind` is `other` too | omitted | as for `db` — an ordinary block, with no extra field and no extra section |

The alias after the surface is the row's `system` value, copied character for character. Fill `Page` (UI), `Consumes` / `Stores` (from the glossary and from absorbed store captures), `Expected Result` and `Validation` from that step's own data. Omit any field that does not apply. Number the blocks consecutively `Step 1..N` with no gaps.

A run of consecutive rows that differ only in one loop variable becomes a single block carrying `Repeat: <var> = <range>`; count the rows it covers into `repeatCoveredNodes`.

Three cross-cutting cases:

- **Navigate** — prepend one `Navigate to {{<UI system>.url}}` action to the first UI step in execution order, using that step's own system alias. Nowhere else; when the slice has no UI step, synthesize nothing.
- **Run values** — a string the run produced is never a typed value, an asserted text, or a `Consumes` value. Write the variable name declared in `## Test Data Requirements`; the run string appears only where it is labelled an example.
- **UI group boundary** — a UI partial's last step usually carries `Result: UNKNOWN (no screenshot)`, because its outcome is only visible in the next group, which a different worker collected. Stitch it: read the first block of the **next** UI partial in execution order — its `Page/Context`, and its `Result` when its action is an assert — and write that step's `Expected Result` from the state those describe. This is the one place a batch reads outside its own range, and it reads that one block and nothing more. Only when the next partial does not settle it either does the `Expected Result` stay `UNKNOWN (<reason>)`.

### Pass C — Verification Points

Append `## Verification Points` — the run's checkable outcomes, derived from the blocks already written. Context: the summary only.

### Pass D — Call Contracts, one per write

Append the `## Call Contracts` heading with its one-line lede, then one contract per write, in `Ref` order. Per contract: read that single partial from `{contractDir}`, emit `### C<N> — <name>`, copy its body verbatim with `## Call N` demoted to `#### Call N` — the one exception being a `{{X.y}}` that Step 2 did not prove — and close with a `#### Notes` line naming the steps that call it. Drop the partial from context before the next one.

Every `Contract: C<N>` written in Pass B must land here as a `### C<N>` block, and no contract is emitted that no step calls.

### Step 3 — Verify and return

Count from what is on disk and check the coverage identity — the step count no longer equals the manifest row count, so this is what proves coverage:

```
manifestNodes == absorbedNodes + (descriptorSteps - repeatBlocks) + repeatCoveredNodes
```

Identity holds → walk the Checklist box by box. A box that does not pass is either fixed by re-running the pass that owns it, or — when the Failure policy calls for `degrade` — recorded in `unmappedHosts`, `failedPlaceholders` or `notes`. Emit the return only after the last box is resolved.

Identity does not hold → a row was dropped or grouped without warrant. Find it and fix its block; never adjust the numbers to close the gap.

## Failure policy

| Failure | Action |
|---|---|
| A `{{X.y}}` fails the Step 2 proof | `degrade` — write the resolved value with its mark, list the pair in `failedPlaceholders` |
| A resolved host matches no system in `{envMappingFile}` | `degrade` — keep the host resolved with its mark inside its step, list it in `unmappedHosts` |
| A value with no proven placeholder carries no mark in its source artifact | `degrade` — copy the value as it stands and name it in `notes`; never assign a mark yourself |
| A UI partial's last step carries `Result: UNKNOWN (no screenshot)` | `degrade` — stitch it from the next UI partial's first block per Pass B; only if that fails does the row below apply |
| A UI partial carries no Result for a step, or the only Result restates the node status (`Step PASSED per execution log`) | `degrade` — write `UNKNOWN (<reason>)` as the `Expected Result` and count the step in `stepsWithoutObservableResult`. Never invent an observable state |
| A manifest row maps to no partial and no contract | `stop` — the row was collected, so a missing artifact means the wrong glob or an incomplete collection |
| A `File` in the contract map is absent from `{contractDir}` | `stop` |
| A manifest row's contract key has no row in the contract map | `stop` |
| The coverage identity does not hold after the fix attempt | `stop` |
| A required input is missing, or `{outputFile}` is not writable | `stop` — write nothing partial |

Degraded gaps accumulate in `unmappedHosts`, `failedPlaceholders` and `notes`.

## Return format

Respond with exactly one raw JSON object — no markdown, no prose, no code fences.

```json
{
  "status": "success",
  "descriptorFile": "TestGeneration/tests/TestDesign/<tc_name>.md",
  "testType": "UI + API",
  "manifestNodes": 30,
  "descriptorSteps": 19,
  "absorbedNodes": 11,
  "repeatBlocks": 0,
  "repeatCoveredNodes": 0,
  "contracts": 4,
  "apiSteps": 11,
  "uiSteps": 8,
  "stepsWithoutObservableResult": 2,
  "navigateSynthesized": true,
  "descriptorComplete": true,
  "passes": { "header": true, "stepsThrough": 19, "verification": true, "contractsWritten": 4 },
  "systemsReferenced": ["public-gateway", "umbrella-ui"],
  "unmappedHosts": [
    { "alias": "cloud-data-migration-nifi", "resolvedHost": "jdbc:postgresql://nifi-db.gfi-ndo-2.managed.{bas_company}.cloud:5432/nifi", "mark": "unmapped", "steps": [1] }
  ],
  "failedPlaceholders": [
    { "placeholder": "{{NDO.password}}", "reason": "no key NDO in the env template", "writtenAs": "resolved value + unmapped", "steps": [2] }
  ],
  "notes": "optional"
}
```

- `status` is exactly `"success"` or `"failure"`.
- The five coverage numbers satisfy the identity above; `descriptorSteps` is the count of `### Step N` blocks on disk.
- `contracts` equals the count of `### C<N>` blocks in `## Call Contracts`.
- `stepsWithoutObservableResult` counts blocks whose `Expected Result` is an `UNKNOWN (…)`.
- `passes` mirrors what is on disk, so an interrupted run resumes instead of restarting.
- `descriptorComplete` is `true` when the coverage identity holds and every `Contract: C<N>` resolves to a `### C<N>` block. A non-empty `unmappedHosts` or `failedPlaceholders` does not make it `false` — those steps are written and executable.
- `navigateSynthesized` is `false` only when the slice has no UI step.
- For a UI-only slice, `apiSteps` and `contracts` are `0`.

## Checklist

- [ ] The coverage identity holds: `manifestNodes == absorbedNodes + (descriptorSteps - repeatBlocks) + repeatCoveredNodes`.
- [ ] Every absorbed row matches a row of the Absorption table and landed in the destination that row names; `### Step N` numbering is consecutive from 1 with no gaps; the only grouping present is `Repeat`.
- [ ] Every `Surface` alias equals the `system` value of its manifest row; `## Systems Referenced` holds a row for each of those systems and for no other.
- [ ] Every `{{X.y}}` on disk sits on the Step 2 proven list; every value that failed it is a resolved value carrying the mark of its source artifact.
- [ ] No string produced by the run stands as a typed value, an asserted text, or a `Consumes` value; every generator is declared once under **Generated / random values**.
- [ ] Every `Contract: C<N>` in a step resolves to an existing `### C<N>` block, and every `### C<N>` is called by at least one step.
- [ ] Contract bodies are verbatim from `{contractDir}` with `## Call` demoted to `#### Call`, and every DB/SSH/data statement is verbatim from its unit partial; nothing else re-levelled or trimmed.
- [ ] The file contains no `Screenshot`, no `logRecordId`, no path into `{contractDir}` or the migration folder, and no `page.` / `locator(`.
- [ ] Every block carries an `Expected Result` that is an observable state, `no observable change`, or `UNKNOWN (<reason>)`; exactly one `Navigate` action, on the first UI step — none when the slice has no UI step.
- [ ] Wrote only `{outputFile}`; the return JSON matches what is on disk.
