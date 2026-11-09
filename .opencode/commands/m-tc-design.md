---
description: Convert a Playwright codegen recording plus human notes into a structured
  test scenario description for AI test generation.
---

<!--
How to prepare input files:
1. Record test actions using Playwright Codegen: npx playwright codegen <URL>
2. Save recorded test to TestGeneration/tests/TestDesign/TestDesignPreparation/test-track.md
3. Create TestGeneration/tests/TestDesign/TestDesignPreparation/test-notes.md with 5 sections:
   - Test Name and Objective
   - Pages (list of pages/popups in order of appearance)
   - Test Data (random/fixed rules for each field)
   - Notes (conditional steps, values to save between steps, dynamic calculations)
   - Verifications (what to check at the end)

Usage: Attach this command to Cursor conversation and trigger to start.
Purpose: Converts Playwright codegen recording + human notes into a structured test scenario description for AI test generation.
Output: TestGeneration/tests/TestDesign/<tc_name>.md
-->

# Test Scenario Design Request

## Input Files
- **Playwright Recording**: `TestGeneration/tests/TestDesign/TestDesignPreparation/test-track.md`
- **Manual Notes**: `TestGeneration/tests/TestDesign/TestDesignPreparation/test-notes.md`

## Task

Read both input files. Generate a structured test scenario description in the output format defined below.

Ask the user for the output filename before generating (format: `tc_<short_name>.md`).

## Output Format

### File location
`TestGeneration/tests/TestDesign/<tc_name>.md`

### Document structure

```markdown
# Test Scenario: [Name from notes]

## Overview
- **Test Name**: [from notes]
- **Test Type**: [surface set from {UI, API, DB, SSH} joined with ` + `, e.g. `UI` / `API` / `UI + API`]
- **Objective**: [from notes]
- **Preconditions**: [system/credentials requirements extracted from recording]

## Systems Referenced

| System Name | Purpose | Configuration Source |
|---|---|---|
| [SYSTEM_NAME] | [brief purpose] | `environment-configuration.json → systems.[SYSTEM_NAME].connections.[CONNECTION_TYPE]` |

## Test Data Requirements
- **[Field]**: [random/fixed rule from notes — no example values]

## Test Steps

### Step N: [Action Summary]
**Page**: [page name from notes Pages list]

- [action verb] [element] → `[locator from recording]`
- [action verb] [element] → `[locator from recording]`

**Result**: [non-obvious outcome only — navigation, popup appearance, value to save for later]

## Verification Points

1. **[Topic]** — [brief description]
```

## Rules

**Test Type field (in `## Overview`):**
- Required. A **set of surfaces** the test touches, from the vocabulary `{UI, API, DB, SSH}`, joined with ` + `. Examples: `UI`, `API`, `DB`, `SSH`, `UI + API`, `API + DB`.
- Each surface drives what gets generated: `UI` → Page Objects + locators; `API`/`DB`/`SSH` → Business Workflows over the matching helper (no Page Objects). Common layers (Test Scenario, TestData, tags) are always generated.
- **Routing rule:** the orchestrator runs Phase 1-2 (UI research / locators) **iff the set contains `UI`**. A set without `UI` (e.g. `API`, `API + DB`) skips Phase 1-2. This command's codegen path always produces a set containing `UI`.
- The value is a static fact about the source, set once at design time — not decided later at runtime.

**Step actions:**
- One action per line in format: `- [verb] [element description] → \`[locator]\``
- Verbs: `Fill`, `Click`, `Select`, `Navigate to`
- For `fill` actions: one line with the field and locator — do NOT add a separate `click` line for the same field
- For `checkbox` elements: use verb `Click` — never `Check`
- For `select`/`dropdown` elements: use verb `Select`
- For navigation (`goto`): use verb `Navigate to` with the URL — no locator needed
- If a locator from the recording contains a hardcoded test value (e.g. a specific name, number, or date), replace it with a `{placeholder}` that reflects the dynamic nature: e.g. `{customerAccountNumber}`, `{day}`, `{title} {firstName} {lastName}`
- If the recording clicks the same element twice in a row (artifact of codegen): include only one line

**Page boundaries:**
- Use the Pages list from notes to assign `**Page**:` to each step
- Each step belongs to exactly one page
- When the recording transitions to a new page (via `goto`, popup open, navigation), start a new step group under the new page name

**Result line:**
- Include only when something non-obvious happens: navigation to a new page, popup appears, value must be saved for a later step
- Skip for steps where the only result is "field filled" or "button clicked"

**Env placeholders:**
- Replace all hardcoded environment values (URLs, usernames, passwords) from the recording with `{{SystemName.field}}` notation
- `SystemName` can be any readable alias (e.g. `CSRDESKTOP`, `MainUI`) — it just needs to match the alias used in `## Systems Referenced`
- Fields: `.url`, `.username`, `.password`
- Use the same notation in Preconditions: `System must be accessible at {{SystemName.url}}`

**Systems Referenced section:**
- Required when the descriptor contains `{{...}}` placeholders
- One row per system; `Configuration Source` must point to the exact path inside `environment-configuration.json` (e.g. `systems.CSRDESKTOP.connections.HTTP`)
- The `System Name` column is the alias used in the placeholders — it may differ from the key in the env JSON

**API steps (Response Schema + exact types):**
- If any step carries an API call, it MUST include a trimmed real **Response Schema** (structure to match on, not prose) and keep exact data types — numeric fields unquoted (never quote a numeric placeholder). See the canonical rule in `.cursor/skills/test-generation-orchestrator/references/test-description-template.md` §7 (T3). Unobserved responses are marked `UNKNOWN (reason)`, not fabricated.

**Conditional steps:**
- If notes say a page/alert "may or may not appear" — describe the step with "If present:" prefix

**Test Data Requirements:**
- List every field from notes Test Data section
- Format: `- **[Field]**: [rule]` — random format or fixed value, no example values

**Verification Points:**
- One line per point from notes Verifications section
- Format: `N. **[Topic]** — [brief description]`
- Do not add verification points not mentioned in notes

**Do NOT:**
- Generate TypeScript, JavaScript, or any code
- Add `## Expected Final State` section
- Include "codegen used" or example values in Test Data
- Add locator hints that are not in the recording
- Invent steps not present in the recording or notes
- Include hardcoded URLs, usernames, or passwords from the recording — replace with env placeholders (see below)

## Example output (excerpt)

```markdown
# Test Scenario: Create Residential Customer with Billing Account and Payment Instrument

## Overview
- **Test Name**: Create and Verify Residential Customer Account
- **Test Type**: UI
- **Objective**: Verify that a new residential customer can be created with complete personal details, billing account, and payment instrument
- **Preconditions**:
  - System must be accessible at {{CSRDESKTOP.url}}

## Systems Referenced

| System Name | Purpose | Configuration Source |
|---|---|---|
| CSRDESKTOP | CSR Desktop UI | `environment-configuration.json → systems.CSRDESKTOP.connections.HTTP` |

## Test Data Requirements
- **Email**: random (format: `{random}@test.com`)
- **First Name**: random text, 6 characters
- **Postcode**: fixed `B33 8TH`
- **Date of Birth**: 25 years back from current date (calculate dynamically)

## Test Steps

### Step 3: Login to Main System
**Page**: Login Page ({{CSRDESKTOP}})

- Fill {{CSRDESKTOP.username}} in the Username field → `page.getByRole('textbox', { name: 'Username' })`
- Fill {{CSRDESKTOP.password}} in the password field → `page.locator('#pass')`
- Click 'Log In' button → `page.getByRole('button', { name: 'Log In' })`

**Result**: User logged in; main dashboard displayed with navigation menu

### Step 4: Close successful login alert
**Page**: Main Dashboard

- If present: click the close (cross) icon → `page.getByText('Close')`

### Step 8: Fill Customer Personal Details
**Page**: New Residential Customer Account Popup

- Select random title from the Title dropdown → `page.getByLabel('Title')`
- Fill First Name (see Test Data) in 'First Name *' field → `page.getByRole('textbox', { name: 'First Name *' })`
- Fill Last Name (see Test Data) in 'Last Name *' field → `page.getByRole('textbox', { name: 'Last Name *' })`

**Result**: All values displayed in their fields; form remains editable

### Step 14: Capture Customer Account Number
**Page**: Customer Summary Page

- Read and save the Customer Account Number link for later verification → `page.getByRole('link', { name: '{customerAccountNumber}' })`

**Result**: Customer Account Number captured and stored for Step 21

## Verification Points

1. **Customer Account Created** — customer object ID in URL; summary page shows all personal info
2. **Personal Details Match** — First Name, Last Name, Title, Date of Birth all match entered values
```

## Processing Steps

1. Read `test-track.md` — extract all actions in order
2. Read `test-notes.md` — extract Test Data rules, Notes, Verifications
3. Read the environment configuration — resolve its path from `config.json` (`{rootFolder}/{paths.envConfig}`, concretely `TestGeneration/environment-configuration/local-environment-configuration/environment-configuration.json`) and read that file with the Read tool
   - If the file is missing: fall back to the deprecated `ATP_ENVGENE_CONFIGURATION` environment variable. Do **not** `echo` it — it holds real credentials; read it without printing its value
   - If neither source is available or the JSON is invalid: stop and report "No environment configuration found at {rootFolder}/{paths.envConfig}. Generate it with environment-configuration/setEnvironmentScript.ps1 (see local-environment-configuration/LOCAL-SETUP.md) before running this command."
   - Parse the JSON — extract all system names and their connection types and URLs
4. **Sanity check**: if `test-track.md` contains any `page.goto(url)` calls, check whether any of those URLs appear in the parsed env config
   - If none match: warn the user — "None of the URLs in test-track match the active environment configuration. The env may be wrong. Proceed?"
   - If at least one matches: continue silently
5. Ask user for output filename (`tc_<short_name>.md`)
6. Generate the document following the Output Format and Rules above:
   - Replace all hardcoded env values with `{{SystemName.field}}` placeholders (see Env placeholders rule)
   - Generate `## Systems Referenced` section with `Configuration Source` pointing to the exact JSON path
   - Do NOT include raw URLs, usernames, or passwords in the output
7. Write output to `TestGeneration/tests/TestDesign/<tc_name>.md`