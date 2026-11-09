# Phase 5 - Part 3: Web Performance Requirements

> **Step file.** Core Web Vitals, performance budgets, and optimisation strategy. Skipped for BA-only runs, for projects with no web surface, and whenever `performance-context` is not installed; when it runs, defaults are written and questions are the exception.
>
> **Parent:** [requirements.md](../requirements.md) - Phase 5 router
> **Read first:** [overview.md](overview.md) - adaptive mode and the skip-by-default policy that govern every Part
> **Previous step file:** [part-2-architecture.md](part-2-architecture.md) - architecture decisions
> **Next step file:** [part-4-general.md](part-4-general.md) - general requirements

---

## Part 3: Web Performance Requirements

> **Gate check first.** This Part persists into `performance-context/project-config.json`, which exists only when the `performance` package was installed in Phase 1.7-APM (role-matched for `performance` and `fullstack`). If `.agents/skills/performance-context/` is absent, **skip the Part** with one Q-block (`User answer: skipped — performance-context not installed`) and ask no performance question; Phase 6 will not configure a performance domain either. Also skip for BA-only runs and for projects without a web surface (no frontend framework in Phase 3, no `frontend` / `fullstack` / `mobile` / `performance` role).
>
> **Defaults, not questions.** When the Part runs, Core Web Vitals, bundle budget and Lighthouse targets take the industry defaults below unless the repository carries its own numbers (`lighthouserc*`, `budget.json`, `size-limit` / `bundlesize` config, `web-vitals` reporting, values already present in `performance-context/project-config.json`). Write them as `auto-filled — default` in the Q-block. Non-functional targets rank last in the question budget ([SKILL.md → priority order](../../SKILL.md#adaptive-question-principle-project-wide-rule)): ask only when (a) the `performance` role was selected **and** (b) a target is genuinely undecidable from the code — at most **one batched question**, never the two rounds below in full. The Round bodies are the option library for that single question.

### Round 1 - Core Web Vitals & Performance Budgets (option library — the defaults below are written silently):

```
1. What are your Core Web Vitals targets?
   Default targets (if no specific requirements):
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1
   
   Custom targets:
   (e.g., "LCP < 1.5s for landing pages", "Strict: LCP < 1.8s, FID < 50ms, CLS < 0.05")

2. What is your bundle size budget?
   Options:
   - Strict: < 150KB initial JS (gzipped)
   - Standard: < 200KB initial JS (gzipped) ← Recommended
   - Relaxed: < 300KB initial JS (gzipped)
   - No specific budget
   
   Additional JS loaded on interaction:
   (e.g., "Allow up to 500KB for additional features")

3. What is your target Lighthouse Performance score?
   Options:
   - Aggressive: 95-100 (all pages)
   - Standard: 90-95 (critical pages), 80+ (others) ← Recommended
   - Basic: 80+ (all pages)
   - No specific target
```

### Round 2 - Optimization Strategy (option library — derive from the build tool and framework first; Next.js, Nuxt, Vite and Angular each imply their own image, splitting and caching defaults):

```
4. What is your image optimization strategy?
   (e.g., "Next.js Image component with WebP/AVIF", "Cloudinary for transforms", "Manual optimization", "Not decided")

5. What code splitting approach will you use?
   Options:
   - Route-based splitting (default for Next.js, etc.)
   - Component-based lazy loading
   - Dynamic imports for heavy features
   - Aggressive splitting with granular chunks
   - No specific strategy yet

6. What is your caching strategy?
   (e.g., "Service Worker with Workbox", "CDN caching (CloudFront)", "Redis for API responses", "Not decided")

7. Are there specific performance-critical features?
   (e.g., "Infinite scroll must be smooth", "Real-time updates without lag", "3D visualization must load fast")
```

### Persistence Targets

> Performance values live in `.agents/skills/performance-context/project-config.json` (package skill root); the ledger carries only Q-blocks.

| Topic | Authoritative artifact | Field(s) |
|-------|------------------------|----------|
| Core Web Vitals targets (LCP, FID/INP, CLS, FCP, TTI) | `performance-context/project-config.json` | `coreWebVitals.{lcp,fid,cls,fcp,tti}` |
| Bundle size budgets | `performance-context/project-config.json` | `budgets.{js,css,total,images}` |
| Lighthouse score targets | `performance-context/project-config.json` | `lighthouse.{performance,a11y,bestPractices,seo}` |
| Optimization strategies (images, code splitting, caching) | `performance-context/project-config.json` | `optimization.*` |
| Performance-critical features | `performance-context/project-config.json` | `criticalFeatures[]` |
| Monitoring & measurement tooling | `performance-context/project-config.json` + `infrastructure-context/project-config.json` | `monitoring.*` |

Update `Supplemental Source Manifest` row "Performance budgets and Core Web Vitals targets" to point to `performance-context/project-config.json`. Append one Q-block for the Part to Decision Log §5 — the values written (`auto-filled — default` or `from <repo config>`) plus any question actually asked — with `Decision stored in: .agents/skills/performance-context/project-config.json`.
