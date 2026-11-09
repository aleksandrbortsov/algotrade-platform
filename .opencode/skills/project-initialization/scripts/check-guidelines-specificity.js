#!/usr/bin/env node
/**
 * Specificity gate for rendered `references/guidelines.md` files.
 *
 * Part 3.5 already blocks unrendered `{{PLACEHOLDER}}` tokens. That catches a guidelines
 * file that was never filled — it does not catch one that was filled with plausible
 * generalities ("use meaningful variable names", "handle errors consistently"). Those read
 * as complete and are useless at runtime: an agent gets no project-specific instruction
 * from them, and the user ends up rewriting them by hand.
 *
 * This script mechanises the difference. It builds a vocabulary of concrete names from the
 * analysis artifacts in .opencode/project/analysis/ (module paths, entity names, endpoint
 * patterns, integration and dependency names) and requires each guidelines file to actually
 * cite some of them. It also enforces the one-home-per-fact rule: only
 * `coding-standards-context` may define cross-cutting rules; every other domain must link
 * to it instead of restating them.
 *
 * Until the analysis artifacts exist, the vocabulary is empty and specificity is reported
 * as unmeasurable (a warning) — the placeholder, emptiness, install and ownership checks
 * still run and still block.
 *
 * It is also the last line of defence against a required context skill that is not
 * there at all. Discovering skills by "has a project-config.json" silently skips a
 * directory an interrupted APM install left empty — exactly the skills the Phase 6
 * gate exists to protect. Pass the required set with --required / --required-from and
 * those names are checked whether or not anything was deployed to them.
 *
 * Usage:
 *   node .opencode/skills/project-initialization/scripts/check-guidelines-specificity.js [options]
 *     --min <n>            Minimum distinct concrete tokens per guidelines file (default 5)
 *     --skill <name>       Check a single skill instead of every initialized one
 *     --required <list>    Comma-separated context skills that MUST pass (missing or
 *                          empty directories become failures instead of being skipped).
 *                          Non-`*-context` names are ignored with a note.
 *     --required-from <f>  Read requiredContextSkills from a JSON file. Passing this flag
 *                          explicitly is a promise that the file exists and carries the set:
 *                          if it does not, the script exits 2 rather than running an empty
 *                          gate. Note that Phase 1.7-APM deletes
 *                          .opencode/.temp-apm-selection.json at the end of the phase, so
 *                          Phase 6 Part 3.5 must use --required instead.
 *     --skills-dir         Core skills root (default .opencode/skills)
 *     --package-skills-dir APM package skills root (default .agents/skills — the opencode target path)
 *     --analysis-dir       Analysis artifacts root (default .opencode/project/analysis)
 *     --json               Machine-readable output
 *     --quiet              Only print problems
 * Exit: 0 = every checked file is specific enough, 1 = at least one needs re-rendering,
 *       2 = the invocation itself is unusable (bad --min, or an explicit --required-from
 *           that yields no required set — never a silent pass).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');
const args = process.argv.slice(2);

function argValue(flag, fallback) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const asJson = args.includes('--json');
const quiet = args.includes('--quiet');
// A non-numeric --min (an agent writing `--min high`, or `--min` followed by another flag)
// must not silently disable the specificity half of a hard gate: NaN < NaN is false.
const MIN_HITS_RAW = parseInt(argValue('--min', '5'), 10);
if (!Number.isFinite(MIN_HITS_RAW) || MIN_HITS_RAW < 0) {
  console.error(`--min must be a non-negative integer (got "${argValue('--min', '5')}").`);
  process.exit(2);
}
const MIN_HITS = MIN_HITS_RAW;
const ONLY_SKILL = argValue('--skill', null);
const SKILLS_DIRS = [
  path.resolve(argValue('--skills-dir', path.join(ROOT, '.opencode', 'skills'))),
  path.resolve(argValue('--package-skills-dir', path.join(ROOT, '.agents', 'skills'))),
];
/** A skill lives in exactly one root: Core context skills under .opencode/skills/, package skills under .agents/skills/. */
function resolveSkillDir(name) {
  for (const root of SKILLS_DIRS) {
    const dir = path.join(root, name);
    if (fs.existsSync(dir)) return dir;
  }
  return path.join(SKILLS_DIRS[1], name);
}
const ANALYSIS_DIR = path.resolve(argValue('--analysis-dir', path.join(ROOT, '.opencode', 'project', 'analysis')));
const REQUIRED_FROM = argValue('--required-from', path.join(ROOT, '.opencode', '.temp-apm-selection.json'));
/** True when the caller passed --required-from explicitly rather than falling back to the default path. */
const REQUIRED_FROM_EXPLICIT = args.includes('--required-from');

/** The one skill allowed to define cross-cutting rules. */
const CROSS_CUTTING_OWNER = 'coding-standards-context';

/** Required regardless of role selection or technology detection (Phase 6 Part 3.5). */
const CORE_CONTEXT_SKILLS = ['coding-standards-context', 'infrastructure-context'];

/**
 * Only `*-context` skills carry the project-config.json + references/guidelines.md pair this
 * gate reads. Callers legitimately pass wider lists — /docs-sync forwards the docs-sync hook's
 * "potentially affected skills", which mixes in Core skills such as documentation-management —
 * and a Core skill would then fail as "install incomplete" and be prescribed an APM purge it
 * has no package for. Filtering here is the one place that cannot be forgotten at a call site.
 */
function toContextSkills(names, origin) {
  const kept = [];
  const dropped = [];
  for (const n of names) {
    if (n.endsWith('-context')) kept.push(n);
    else dropped.push(n);
  }
  if (dropped.length && !quiet && !asJson) {
    console.error(`note: ignoring non-context skill(s) from ${origin}: ${dropped.join(', ')} — this gate only reads *-context skills.`);
  }
  return kept;
}

/**
 * The set the Phase 6 gate must not let through. Explicit --required wins; otherwise the
 * selection file written by prepare-apm-packages.ps1 supplies it. The two coreContextSkills
 * are always in the set: they ship with the template and Phase 6 Part 3.5 requires them
 * regardless of role selection, so an empty or absent selection file must still gate on them
 * rather than degrading to "check whatever happens to be initialized on disk".
 */
function buildRequiredSet() {
  const explicit = argValue('--required', null);
  if (explicit) {
    const names = toContextSkills(explicit.split(',').map((s) => s.trim()).filter(Boolean), '--required');
    return { set: new Set(names.concat(CORE_CONTEXT_SKILLS)), explicit: true };
  }
  if (fs.existsSync(REQUIRED_FROM)) {
    try {
      const sel = readJson(REQUIRED_FROM);
      const names = toContextSkills((sel.requiredContextSkills || []).filter(Boolean), REQUIRED_FROM);
      if (names.length) return { set: new Set(names.concat(CORE_CONTEXT_SKILLS)), explicit: true };
      if (REQUIRED_FROM_EXPLICIT) {
        console.error(`--required-from ${REQUIRED_FROM} carries no usable "requiredContextSkills" — refusing to run a gate with an empty required set. Pass --required <names> instead.`);
        process.exit(2);
      }
    } catch (e) {
      // An unreadable selection file must never silently disable the check.
      if (REQUIRED_FROM_EXPLICIT) {
        console.error(`--required-from ${REQUIRED_FROM} is unreadable (${e.message}) — refusing to run a gate with an empty required set. Pass --required <names> instead.`);
        process.exit(2);
      }
    }
  } else if (REQUIRED_FROM_EXPLICIT) {
    console.error(`--required-from ${REQUIRED_FROM} does not exist — refusing to run a gate with an empty required set. Phase 1.7-APM deletes .opencode/.temp-apm-selection.json at the end of the phase, so Phase 6 must pass --required <names> computed from apm.lock.yaml instead.`);
    process.exit(2);
  }
  // No list was supplied. Still gate on the two coreContextSkills — they ship with the
  // template and Part 3.5 requires them whatever the role selection — but treat the set as
  // implicit, so a configured domain outside it keeps failing hard instead of becoming advisory.
  return { set: new Set(CORE_CONTEXT_SKILLS), explicit: false };
}

function countFiles(dir) {
  let n = 0;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    if (e.isDirectory()) n += countFiles(path.join(dir, e.name));
    else n += 1;
  }
  return n;
}

/** Headings that mean "this file is redefining a cross-cutting rule". */
const CROSS_CUTTING_HEADINGS = [
  /naming\s+(convention|rule|standard)/i,
  /error\s+handling/i,
  /code\s+organi[sz]ation/i,
  /commit\s+(message|format|convention)/i,
  /documentation\s+style/i,
];

/**
 * Phrases that carry no project-specific information. Their presence is not fatal on its
 * own — the concrete-token count is the real gate — but a file that is mostly these is
 * reported so the agent knows what to replace.
 */
const GENERIC_PHRASES = [
  /\buse meaningful (variable |function )?names\b/i,
  /\bfollow best practices\b/i,
  /\bwrite clean,? readable code\b/i,
  /\bkeep functions small\b/i,
  /\bhandle errors (appropriately|consistently|properly)\b/i,
  /\badd (appropriate|proper) (comments|documentation)\b/i,
  /\bavoid code duplication\b/i,
  /\bensure (proper|adequate) test coverage\b/i,
  /\buse (consistent|appropriate) (formatting|indentation)\b/i,
  /\bkeep dependencies up to date\b/i,
];

const STOPWORDS = new Set([
  'api', 'app', 'src', 'lib', 'core', 'main', 'test', 'tests', 'docs', 'doc', 'index',
  'server', 'client', 'service', 'services', 'module', 'modules', 'component', 'components',
  'model', 'models', 'util', 'utils', 'common', 'shared', 'types', 'type', 'data', 'code',
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, ''));
}

/** Tokens worth counting: distinctive enough that their presence proves grounding. */
function harvestToken(value, bag) {
  if (typeof value !== 'string') return;
  const v = value.trim();
  if (!v) return;
  if (v.length < 3) return;
  if (STOPWORDS.has(v.toLowerCase())) return;
  bag.add(v);
}

function buildVocabulary(dir) {
  const bag = new Set();
  const sources = [];
  if (!fs.existsSync(dir)) return { tokens: bag, sources };

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
    const full = path.join(dir, file);
    let data;
    try {
      data = readJson(full);
    } catch {
      continue;
    }
    sources.push(file);
    for (const m of data.businessModules || []) {
      harvestToken(m && m.name, bag);
      harvestToken(m && m.path, bag);
    }
    for (const e of data.entities || []) {
      harvestToken(e && e.name, bag);
      harvestToken(e && e.path, bag);
    }
    for (const g of data.endpointGroups || []) {
      harvestToken(g && g.pathPattern, bag);
      harvestToken(g && g.sourceFile, bag);
    }
    for (const i of data.integrations || []) {
      harvestToken(i && i.name, bag);
      harvestToken(i && i.package, bag);
    }
    for (const d of data.dependencies || []) harvestToken(d && d.name, bag);
    for (const p of data.patterns || []) harvestToken(p && p.name, bag);
    for (const ep of data.entryPoints || []) harvestToken(ep && ep.path, bag);
    harvestToken(data.path, bag);
  }
  return { tokens: bag, sources };
}

/** Count how many distinct vocabulary tokens the document actually cites. */
function countHits(text, tokens) {
  const hits = [];
  const haystack = text.toLowerCase();
  for (const t of tokens) {
    const needle = t.toLowerCase();
    // Path-ish and symbol-ish tokens are matched literally; short words need a boundary
    // so that "Tenant" does not match inside "tenants-are-great" prose accidentally.
    if (/[\/.@*]/.test(needle)) {
      if (haystack.includes(needle)) hits.push(t);
    } else {
      const re = new RegExp(`(^|[^a-z0-9_])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9_]|$)`, 'i');
      if (re.test(text)) hits.push(t);
    }
  }
  return hits;
}

function listSkills() {
  const names = new Set();
  for (const root of SKILLS_DIRS) {
    if (!fs.existsSync(root)) continue;
    for (const d of fs.readdirSync(root, { withFileTypes: true })) {
      if (d.isDirectory()) names.add(d.name);
    }
  }
  return [...names].filter((n) => (ONLY_SKILL ? n === ONLY_SKILL : true));
}

function checkSkill(name, vocab, required) {
  const dir = resolveSkillDir(name);
  const configFile = path.join(dir, 'project-config.json');
  const guidelinesFile = path.join(dir, 'references', 'guidelines.md');

  // `kind` separates the two failure classes, which have opposite remedies:
  // 'install' = the package never deployed the skill (fix the install; hand-writing the
  // files would hide it), 'render' = the skill is there but Phase 6 output is wrong.
  const fail = (msg, kind) => ({ skill: name, required, kind: kind || 'render', ok: false, errors: [msg], warnings: [], hits: [], genericPhrases: [], crossCutting: [] });

  // A required skill is checked even when nothing was deployed to it. Returning null
  // for a missing or empty directory is what let empty context skills pass this gate
  // unnoticed while the initialization ran on for several more phases.
  if (!fs.existsSync(dir)) {
    if (!required) return null;
    return fail('skill directory does not exist — the owning APM package is not installed (check apm.yml, then run node .opencode/skills/project-initialization/scripts/apm-install-preserving.js)', 'install');
  }
  if (required && countFiles(dir) === 0) {
    return fail('skill directory is empty (0 files) — the owning APM package is recorded as installed but deployed nothing. Purge its apm_modules/ tree and its apm.lock.yaml entry, then re-install; do NOT hand-create the files, and do NOT expect a plain re-run of apm install to help', 'install');
  }

  if (!fs.existsSync(configFile)) {
    if (!required) return null; // not a context/domain skill
    return fail('project-config.json is missing — the deployed skill is incomplete', 'install');
  }

  let config;
  try {
    config = readJson(configFile);
  } catch (e) {
    return fail(`project-config.json is unparseable: ${e.message}`, 'install');
  }
  if (config.initialized !== true) {
    if (!required) return null; // not configured in this project — out of scope
    return fail('project-config.json has "initialized": false — Phase 6 Part 2 never configured this domain', 'render');
  }

  if (!fs.existsSync(guidelinesFile)) {
    return fail('references/guidelines.md does not exist (Part 3.5 auto-recovery should render it)', 'render');
  }

  const text = fs.readFileSync(guidelinesFile, 'utf-8').replace(/^\uFEFF/, '');
  const errors = [];
  const warnings = [];

  if (/\{\{[A-Z0-9_]+\}\}/.test(text)) {
    errors.push('contains raw {{PLACEHOLDER}} tokens — Part 3.5 hard gate failure');
  }

  const hits = countHits(text, vocab.tokens);
  if (vocab.tokens.size === 0) {
    warnings.push('no analysis vocabulary available — specificity could not be measured (run Phase 4 first)');
  } else if (hits.length < MIN_HITS) {
    errors.push(`cites only ${hits.length} concrete project name(s); at least ${MIN_HITS} required`);
  }

  const genericPhrases = GENERIC_PHRASES
    .map((re) => (text.match(re) || [])[0])
    .filter(Boolean);
  if (genericPhrases.length >= 3) {
    warnings.push(`${genericPhrases.length} generic filler phrases — replace them with project-specific rules`);
  }

  const crossCutting = [];
  if (name !== CROSS_CUTTING_OWNER) {
    const headings = text.split(/\r?\n/).filter((l) => /^#{2,6}\s/.test(l));
    for (const h of headings) {
      if (CROSS_CUTTING_HEADINGS.some((re) => re.test(h))) crossCutting.push(h.trim());
    }
    if (crossCutting.length) {
      errors.push(`redefines cross-cutting rules owned by ${CROSS_CUTTING_OWNER}: ${crossCutting.join(' | ')} — link to it instead of restating`);
    }
  }

  return {
    skill: name,
    required,
    kind: 'render',
    ok: errors.length === 0,
    errors,
    warnings,
    hits,
    genericPhrases,
    crossCutting,
  };
}

function main() {
  const vocab = buildVocabulary(ANALYSIS_DIR);
  const { set: requiredSet, explicit: hasRequiredSet } = buildRequiredSet();

  // Union of what is on disk and what MUST be there — a required skill missing from
  // disk has to surface as a failure, not as an absent row.
  const names = new Set(listSkills());
  for (const r of requiredSet) {
    if (!ONLY_SKILL || r === ONLY_SKILL) names.add(r);
  }

  const results = [...names]
    .map((n) => checkSkill(n, vocab, requiredSet.has(n)))
    .filter(Boolean)
    .map((r) => {
      // With an explicit required set, a configured domain outside it is advisory:
      // leftovers of a superseded skill family must not make the gate unsatisfiable.
      if (hasRequiredSet && !r.required && r.errors.length) {
        return {
          ...r,
          ok: true,
          demoted: true,
          errors: [],
          warnings: [...r.warnings, ...r.errors.map((e) => `(not in requiredContextSkills) ${e}`)],
        };
      }
      return r;
    })
    .sort((a, b) => (b.required === true) - (a.required === true) || a.skill.localeCompare(b.skill));

  const failed = results.filter((r) => !r.ok);
  const exitCode = failed.length ? 1 : 0;

  if (asJson) {
    console.log(JSON.stringify({
      minHits: MIN_HITS,
      vocabularySize: vocab.tokens.size,
      vocabularySources: vocab.sources,
      requiredContextSkills: [...requiredSet],
      checked: results.length,
      results,
      ok: exitCode === 0,
    }, null, 2));
    process.exit(exitCode);
  }

  console.log(`Guidelines specificity gate — vocabulary: ${vocab.tokens.size} concrete name(s) from ${vocab.sources.length} analysis artifact(s), threshold ${MIN_HITS}`);
  console.log(hasRequiredSet
    ? `Required context skills (${requiredSet.size}): ${[...requiredSet].join(', ')}`
    : `No --required list supplied — falling back to the coreContextSkills that are required regardless of role (${[...requiredSet].join(', ')}), plus whatever else is initialized on disk.`);
  console.log('');

  if (results.length === 0) {
    console.log('  (no initialized context/domain skills found — nothing to check)');
    process.exit(0);
  }

  for (const r of results) {
    const tag = r.required ? '[required] ' : '';
    if (r.ok && !quiet) {
      if (r.demoted) console.log(`  SKIP    ${r.skill} — outside requiredContextSkills, not gated`);
      else console.log(`  OK      ${tag}${r.skill} — cites ${r.hits.length} concrete name(s)`);
    }
    for (const e of r.errors) console.log(`  FAIL    ${tag}${r.skill}: ${e}`);
    if (!quiet) for (const w of r.warnings) console.log(`  warn    ${tag}${r.skill}: ${w}`);
  }

  console.log('');
  if (exitCode === 0) {
    console.log(`All ${results.length} checked skill(s) pass.`);
    process.exit(0);
  }

  // Two failure classes with opposite remedies: an install failure must be fixed at the
  // package (re-rendering by hand would paper over it); a render failure is Phase 6 work.
  const notInstalled = failed.filter((f) => f.kind === 'install');
  const notRendered = failed.filter((f) => f.kind !== 'install');

  if (notInstalled.length) {
    console.log(`${notInstalled.length} required context skill(s) are NOT properly installed:`);
    for (const f of notInstalled) console.log(`  - ${f.skill}`);
    console.log('');
    console.log('Fix the install first — while the lock entry looks current, apm install redeploys nothing.');
    console.log('  powershell -ExecutionPolicy Bypass -File .opencode/skills/project-initialization/scripts/validate-apm-install.ps1');
  }
  if (notRendered.length) {
    if (notInstalled.length) console.log('');
    console.log(`${notRendered.length} guidelines file(s) must be re-rendered with the analysis artifacts injected:`);
    for (const f of notRendered) console.log(`  - ${f.skill}`);
    console.log('');
    console.log('Re-render per Phase 6 Part 3, feeding .opencode/project/analysis/<component>.json into the');
    console.log('enrichment step — do not hand-edit guidelines.md to satisfy the counter.');
  }
  process.exit(exitCode);
}

main();
