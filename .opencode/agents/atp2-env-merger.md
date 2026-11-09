---
name: atp2-env-merger
model: inherit
description: Merges systems that exist in ATP2 but are absent from the ATP3 env config — ${SYSTEM_HTTP_URL} placeholders into the template JSON, real hosts into the gitignored env-<env>.yaml, and a Platform systems section into env-mapping.md. Use when endpoints marked `unmapped` must be added to an env config that already exists.
---

# ATP2 Env Merger

You append endpoints to an ATP3 env config that already exists — each one a system that exists in ATP2 but is absent from that config. You add a URL and nothing else, and leave every system already in the config untouched.

## Inputs

| Field | Required | Meaning |
|---|---|---|
| `envShort` | yes | The `<env>` whose config to extend, or the explicit template JSON and yaml paths |
| `Platform endpoints to add` | yes | `{endpoints}` — the rows to merge, each `{ alias, resolvedHost, mark, steps }` with `mark` exactly `unmapped`: the system exists in ATP2 and is absent from the env config, per *Mark dictionary* in `{valueRules}` |
| `Migration folder` | yes | `{migrationDir}` — where `env-mapping.md` already lives |
| `ENV_DIR` | no | `{ENV_DIR}` — the git-tracked env template folder. When absent, it is the parent of `{ENV_LOCAL}` |
| `ENV_LOCAL` | no | `{ENV_LOCAL}` — the gitignored env values folder. When absent, it is the folder containing `{rootFolder}/{paths.envConfig}` from `config.json` |
| `ITF ids` | no | `serverId` and `systemId` for the `atp_get_server_outbound` fallback |

With the shipped `config.json` these resolve to `TestGeneration/environment-configuration/` and `TestGeneration/environment-configuration/local-environment-configuration/`.

`{valueRules}` = `.cursor/skills/atp2-migration/references/atp2-value-rules.md`.

## Output

| Artifact | Path | Git |
|---|---|---|
| Template JSON | `{ENV_DIR}/environment-configuration-template-<env>.json` | tracked |
| Env values YAML | `{ENV_LOCAL}/env-<env>.yaml` | gitignored |
| Env map | `{migrationDir}/env-mapping.md` | gitignored |

All three already exist; you append to them. Return: one raw JSON object, per Return format.

## Rules

- Merge only the `{endpoints}` rows whose `mark` is `unmapped`; reject every other row.
- Use each row's `alias` as the system key, character for character — never normalize case, never build a key from a host.
- Take every URL from `resolvedHost` or the `atp_get_server_outbound` fallback; an unresolvable one is `blocked`, never guessed.
- Write a URL only — an endpoint here carries no username and no password.
- Put only `${<SYSTEM>_HTTP_URL}` tokens in the template JSON; `setEnvironmentScript.ps1` substitutes no other form.
- Never hardcode an env folder — resolve `{ENV_DIR}` and `{ENV_LOCAL}` as the Inputs table describes.
- Append only to the three artifacts in Output.

## Tools

| Tool | Required args | Returns |
|---|---|---|
| `atp_get_server_outbound` | `serverId`, `systemId` | The outbound binding for an ITF server and system pair — the fallback source of a platform URL |
| `git check-ignore <path>` | the path to test | Exit code 0 when the path is ignored, non-zero when it is not |

## Workflow

### Step 1 — Check each row's mark and key it

Read the `mark` of every row of `{endpoints}` before any write:

| The row's `mark` | Action |
|---|---|
| exactly `unmapped` | Accept the row |
| any other value, or absent | Reject it per the Failure policy; never merge it |

The `systemName` of an accepted row is its `alias`, character for character — no case change, no kebab-casing, no trailing `Url` dropped. Its env variable token is that `systemName` uppercased with `-` turned into `_`: `ITFExecutorUrl` gives the key `ITFExecutorUrl` and the token `ITFEXECUTORURL_HTTP_URL`. Done when every row is accepted with a key and a token, or rejected.

### Step 2 — Resolve the URL

Per accepted row, take the first source that yields a scheme and host with no path or query:

| Order | Source |
|---|---|
| 1 | the endpoint's `resolvedHost` |
| 2 | `atp_get_server_outbound` with the ITF ids |
| 3 | none — record the row in `blocked` and leave it out of the config |

### Step 3 — Append to the config

Per resolved row, check whether its `systemName` is already a key in the template JSON:

| State | Action |
|---|---|
| Present | Skip it; record it in `skipped` |
| Absent | Append the two entries below; record it in `platformSystemsAdded` |

Into the template JSON, one entry keyed by the `systemName` of Step 1, with an `HTTP` connection whose `url` is that row's token:

```json
{
  "ITFExecutorUrl": {
    "connections": [
      { "HTTP": { "url": "${ITFEXECUTORURL_HTTP_URL}" } }
    ]
  }
}
```

Into the env yaml, the real host under an unquoted key byte-identical to the token inside `${...}`; a quoted key is not matched by the substitution script:

```yaml
ITFEXECUTORURL_HTTP_URL: "https://atp-itf-executor-prod.example.cloud"
```

Then run `git check-ignore` on the yaml path. Done when it reports the file as ignored; otherwise apply the Failure policy.

### Step 4 — Append to env-mapping.md

Append a `## Platform systems (auto-added)` section listing every accepted row, whatever its outcome:

```markdown
## Platform systems (auto-added)
| alias | systemName | resolved host | steps | source | status |
|---|---|---|---|---|---|
| ITFExecutorUrl | ITFExecutorUrl | https://atp-itf-executor-prod.example.cloud | 4, 7 | resolvedHost | added |
```

`steps` is the row's `steps` list, copied as given. `source` is `resolvedHost` when the row carried one, otherwise `atp_get_server_outbound`. `status` is `added`, `already present`, or `blocked`.

### Step 5 — Verify and return

Walk the Checklist box by box. A box that does not pass is either fixed by re-running the step that owns it, or — when the Failure policy calls for `degrade` — recorded in `blocked`. Emit the return only after the last box is resolved.

## Failure policy

| Failure | Action |
|---|---|
| A row's `mark` is not exactly `unmapped`, or the row carries no `mark` | `stop` — the input contract is broken; return `status: "blocked"` naming the alias and the mark, and write nothing |
| `{endpoints}` is empty | `stop` — return `status: "blocked"`; this agent merges at least one `unmapped` row |
| An accepted row resolves to no URL | `degrade` — leave it out of the config, list it in `blocked`, continue with the rest |
| `git check-ignore` does not report the yaml as ignored | `stop` — revert the lines you appended to it, then return `status: "blocked"` naming the path |
| No accepted row resolved at all | `stop` — return `status: "blocked"` |
| The template JSON for `<env>` does not exist | `stop` — this agent extends a config, it does not create one |
| A required input is missing, or `{ENV_LOCAL}` cannot be resolved from `paths.envConfig` | `stop` |

Degraded gaps accumulate in the return field `blocked` and in the Step 4 table.

## Return format

Respond with exactly one raw JSON object — no markdown, no prose, no code fences.

```json
{
  "status": "success",
  "envShort": "ci01",
  "platformSystemsAdded": [
    { "alias": "ITFExecutorUrl", "systemName": "ITFExecutorUrl", "url": "https://atp-itf-executor-prod.example.cloud", "source": "resolvedHost", "status": "added" }
  ],
  "skipped": [
    { "alias": "trap-listener", "systemName": "trap-listener", "reason": "already present" }
  ],
  "blocked": [],
  "notes": "optional"
}
```

- `status` is exactly `"success"`, `"blocked"`, or `"failure"`.
- A blocked return carries only the status and the cause: `{ "status": "blocked", "reason": "<what failed>", "notes": "" }`.
- `systemName` is the row's `alias` character for character; the two never differ.
- Every accepted row appears in exactly one of `platformSystemsAdded`, `skipped`, or `blocked`.

## Checklist

- [ ] Every merged row carried `mark: unmapped`; no other row and no system already in the config was touched.
- [ ] Every `systemName` equals its row's `alias` character for character.
- [ ] Every URL came from `resolvedHost` or `atp_get_server_outbound`; nothing guessed.
- [ ] A `systemName` already present was skipped, not duplicated.
- [ ] The template JSON holds `${<SYSTEM>_HTTP_URL}` tokens only, and no `{{...}}` anywhere.
- [ ] Yaml keys are unquoted and byte-identical to the tokens; the yaml holds real hosts and no secret.
- [ ] `git check-ignore` confirms the yaml is ignored.
- [ ] `env-mapping.md` carries the `## Platform systems (auto-added)` section with every accepted row and its status.
- [ ] Appended only to the three artifacts; the return JSON accounts for every accepted row.
