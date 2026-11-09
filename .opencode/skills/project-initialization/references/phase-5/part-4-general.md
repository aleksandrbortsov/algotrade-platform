# Phase 5 - Part 4: General Requirements

> **Step file.** Cross-cutting requirements that do not belong to a single domain.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **Read first:** [overview.md](overview.md) - adaptive mode and the skip-by-default policy that govern every Part
> **Previous step file:** [part-3-performance.md](part-3-performance.md) - web performance requirements
> **Next step file:** [part-5-security.md](part-5-security.md) - security requirements

---

## Part 4: General Requirements Collection

> **Adaptive, not a form.** Nothing in this Part is asked by default. Every field below has a safe default or a code signal: the agent derives what it can, records the derivation, and surfaces at most **one batched question** for the fields that are genuinely LOW **and** matter for this project's audience. Non-functional targets rank last in the question budget ([SKILL.md → Adaptive Question Principle → priority order](../../SKILL.md#adaptive-question-principle-project-wide-rule)): a default is written silently as `auto-filled — default` rather than asked.

**Skip the Part entirely** — one Q-block, `User answer: skipped — not a web surface` — for backend-only, library, CLI and BA-only projects. Performance goals are **not** collected here: [Part 3](part-3-performance.md) owns them and is gated on `performance-context` being installed.

### Fields and how they are derived

| Field | Applies when | Derive from | Default when no signal | Ask only when |
|---|---|---|---|---|
| Browser / runtime support | web frontend (Phase 3 framework, or `frontend` / `fullstack` / `mobile` role) | `browserslist` (package.json or `.browserslistrc`), `tsconfig.target`, `engines`, Dockerfile base image, framework minimums | evergreen browsers; runtime per `engines` | the audience (Phase 2) is public or enterprise **and** no `browserslist` exists |
| Accessibility level | web frontend | `eslint-plugin-jsx-a11y`, `axe` / `@axe-core`, Storybook a11y addon, ARIA / `lang` usage, compliance hints from Phase 4 §11 | WCAG 2.1 AA for public-facing UIs; none stated for internal tools | a public-facing UI has neither a11y tooling nor a stated level |
| SEO | web frontend with public pages | SSR/SSG framework (Next.js, Nuxt, SvelteKit, Angular Universal), `robots.txt`, `sitemap*`, meta / Open Graph helpers | not applicable for SPAs behind login, internal tools, APIs | a public marketing or content surface exists and the rendering strategy is not visible |
| Offline / multi-language / other constraints | any | service worker or Workbox, i18n libraries (`i18next`, `@angular/localize`, `vue-i18n`, `next-intl`), locale folders, Phase 5 Part 2 constraints | none | Phase 2 / Phase 5 answers or Phase 4 findings hint at such a constraint (locale folders without an i18n library, a PWA manifest without a service worker) |

### Question template (used at most once, only for the LOW fields)

```
🔍 Phase 5 — Part 4: Constraints not visible in the code

**Derived (no question):**
- {e.g. Browser support: evergreen — `browserslist` in package.json}
- {e.g. Accessibility: WCAG 2.1 AA assumed — public-facing UI (Phase 2 audience), `eslint-plugin-jsx-a11y` configured}

**Open (answer, or press Enter for the default in brackets):**
1. {e.g. SEO — marketing pages under `src/app/(marketing)/` render client-side; is SEO a requirement? [default: no]}
2. {e.g. Multi-language — `locales/` has `en` and `de` but no i18n library; is localisation active or planned? [default: planned]}

  [Skip — mark as TBD]
```

### Persistence Targets

> General constraints live in `coding-standards-context/project-config.json → constraints` (the canonical target named in [overview.md](overview.md) → Phase Completion Actions). When `frontend-context` is installed, Phase 6 Part 2 copies the browser matrix and the accessibility level into its config so `{{BROWSER_SUPPORT}}` and `{{WCAG_LEVEL}}` render. The ledger carries only the Q-block.

| Topic | Authoritative artifact | Field(s) |
|-------|------------------------|----------|
| Browser / runtime support | `coding-standards-context/project-config.json` | `constraints.browserSupport`, `constraints.runtime` |
| Accessibility level | `coding-standards-context/project-config.json` (mirrored to `frontend-context` → `configuration.accessibility` when installed) | `constraints.accessibility` |
| SEO | `coding-standards-context/project-config.json` | `constraints.seo` |
| Offline / multi-language / other | `coding-standards-context/project-config.json` | `constraints.offline`, `constraints.i18n`, `constraints.other[]` |

Append **one** Q-block for the Part to Decision Log §5: the derived values with their sources, the question actually asked (or `none — all derived` / `skipped — not a web surface`), and `Decision stored in:` per the table. Defaults written without a signal are recorded as `auto-filled — default; refine via /docs-sync`.
