---
name: migrate-test-cases-shared-steps-agent
description: Shared-step and scenario reuse for /migrate-test-cases. Runs multistep corpus reuse before clarification and intra-TestDesignPlan extraction after clarification. Sole writer of SharedStepCandidates.yaml append/merge for the active pass.
---
# Migrate Test Cases Shared Steps Agent

> Read `test-design-shared-steps` skill: [step-reuse-rules.md](../../apm_modules/test-description-generation/.apm/skills/test-design-shared-steps/references/step-reuse-rules.md), [semantic-match-rules.md](../../apm_modules/test-description-generation/.apm/skills/test-design-shared-steps/references/semantic-match-rules.md), [data-flow.md](../../apm_modules/test-description-generation/.apm/skills/test-design-shared-steps/references/data-flow.md), [shared-step-candidates-schema.md](../../apm_modules/test-description-generation/.apm/skills/test-design-shared-steps/references/run/shared-step-candidates-schema.md).

## Handoff

| `handoff.subPhase` | Pass | When |
| --- | --- | --- |
| `corpus` | `multistep-corpus` | After classification gate, **before** clarification |
| `intra-plan` | `intra-plan` | After clarification gate |

Migrate does **not** run `compound-corpus`; migrated `TestDesignPlan.yaml` has no `prefix: compound` steps.

## `multistep-corpus` (pre-clarification)

1. Read `TestDesignPlan.yaml`, `knowledge/shared-steps-catalog.yaml`, scenario catalog index, and `{corpusRoot}/**/*_yaml/*.yaml`.
2. For each contiguous range of **2+** migrated steps, search shared steps first, then scenario catalog/YAML, using `semantic-match-rules.md`.
3. Write/append `SharedStepCandidates.yaml` v1 rows when a match, partial pair, or `reuse + resolution: review` is needed:
   - `sourcePass: multistep-corpus`
   - `candidateKind: multistep`
   - `action`, `status`, `candidateType`, and `resolution` per `step-reuse-rules.md`
   - Partial overlap → `create` (`candidateType: shared-step`) + `decompose` (`candidateType: shared-step` or `scenario`) pair with `decompositionGroupId` and `sharedCollapse` on the decompose row when split is known (**SHARED-DECOMPOSE** — apply via `shared-steps.mjs decompose` after QA confirm)
   - Borderline full → `reuse + resolution: review` (SHARED-REVIEW when applicable on paths that run CG)
   - Partial `create` row: `source` (fragment provenance), `steps[]`, `proposedId`; optional `targets[]` for norm/plan patch
   - Partial `decompose` row: full-container `source`, `steps[]` (before view), `sharedCollapse`; omit `proposedId` and `targets[]`
4. Do **not** write rows for multistep no-match.
5. Apply only `action: reuse`, `status: confirmed`, `resolution: auto-apply`, full-overlap rows via:

```bash
node skills/test-design-shared-steps/scripts/shared-steps.mjs apply \
  --candidates {runDir}/SharedStepCandidates.yaml \
  --run-dir {runDir} \
  --config-source migration \
  --added-via migrate-test-cases
```

6. `create`, `decompose`, `resolution: review`, partial, and `rejected` rows stay in `SharedStepCandidates.yaml` only — pipeline does not apply them; review/write-plan may surface them for QA. SHARED-REVIEW apply after CG: [`qa-answer-apply.md`](../../apm_modules/test-description-generation/.apm/skills/test-design-clarification/references/qa-answer-apply.md).

## `intra-plan` (post-clarification)

1. Read **only** `{runDir}/TestDesignPlan.yaml`.
2. **FORBIDDEN:** full yaml corpus scan, scenario catalog scan, compound search, `@scenario` candidates.
3. Find repeating subsequences of **2+** steps across at least two scenarios.
4. Optional helper: `node shared-steps.mjs detect-intra --run-dir ... --scope plan`.
5. Append candidates with:
   - `sourcePass: intra-plan`
   - `candidateKind: intra`
   - `@shared:SS-*` proposals only
   - `source` + `targets[]` with `artifact: TestDesignPlan.yaml`
6. Apply only `action: reuse` + `status: confirmed` + `resolution: auto-apply` + full-overlap rows.
7. Partial/low confidence → `create`/`decompose` pair (review-only in SSC) or `reuse + resolution: review`; no blocking clarification for pairs. **FORBIDDEN:** apply create/decompose rows.

## Task Summary

Return:

`sharedStepCandidatesTotal`, `sharedStepConfirmedCount`, `sharedStepDecomposeCount`, `sharedStepReviewCount`, `sharedStepPartialPairCount`, `sharedStepRefsApplied`, `scenarioRefsApplied`, `sourcePass`.

## Forbidden

- `.md` corpus.
- Compound corpus search.
- Intra-plan yaml corpus scan.
- Applying candidates whose `resolution` is not `auto-apply` (including create/decompose pairs).
- Blocking ClarificationGate for create/decompose rows.
- Writing multistep no-match rows to `candidates[]`.
- `confirmed` without full overlap.
- Paraphrase yaml wording into `candidate.steps[]`.
- `reuseTarget` or nested `clarification` blocks in `SharedStepCandidates.yaml`.
