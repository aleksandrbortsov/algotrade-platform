#!/usr/bin/env node
/**
 * Validator for the initialization analysis artifacts in .opencode/project/analysis/.
 *
 * Three jobs, in order of usefulness:
 *   1. Structure   - every <component>.json carries the fields downstream phases read.
 *   2. Budgets     - reports stayed inside the caps from references/subagent-contract.md.
 *   3. Shallowness - heuristics that catch a report which is well-formed but says nothing
 *                    concrete (a backend component with zero entities and zero endpoint
 *                    groups is not a finished analysis, it is a failed one).
 *
 * Deliberately hand-rolled: initialization runs in projects with no node_modules of ours,
 * so this must work with a bare Node install. It mirrors assets/analysis-report.schema.json
 * - keep the two in sync when either changes.
 *
 * Usage:  node .opencode/skills/project-initialization/scripts/validate-analysis.js [--json] [--dir <path>] [--quiet]
 *   --dir    Analysis directory (default: .opencode/project/analysis)
 *   --json   Machine-readable output
 *   --quiet  Suppress the OK lines; only problems are printed
 * Exit:   0 = every artifact usable, 1 = at least one needs a follow-up dispatch
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');
const args = process.argv.slice(2);
const asJson = args.includes('--json');
const quiet = args.includes('--quiet');
const dirArgIndex = args.indexOf('--dir');
const ANALYSIS_DIR = dirArgIndex !== -1 && args[dirArgIndex + 1]
  ? path.resolve(args[dirArgIndex + 1])
  : path.join(ROOT, '.opencode', 'project', 'analysis');

const MAX_JSON_BYTES = 30 * 1024;
const MAX_MD_LINES = 400;
const KINDS = ['frontend', 'backend', 'mobile', 'infra', 'library', 'mixed'];
const DELEGATION_MODES = ['parallel-subagents', 'inline-json', 'sequential-inline'];

/** Required arrays every report carries, even when empty. */
const REQUIRED_ARRAYS = ['businessModules', 'entities', 'endpointGroups', 'integrations', 'gaps'];
const REQUIRED_SCALARS = ['schemaVersion', 'component', 'path', 'kind', 'coverage', 'generatedAt'];

/**
 * Per-kind expectations. A miss is not a schema error - it is a signal that the brief
 * came back shallow and the component deserves one narrowed follow-up.
 */
const EXPECTATIONS = {
  backend: [
    { field: 'entities', min: 1, why: 'a backend with no domain entities is almost always an incomplete scan' },
    { field: 'endpointGroups', min: 1, why: 'a backend with no endpoint groups leaves api-context with nothing concrete' },
    { field: 'businessModules', min: 1, why: 'business modules drive Phase 5 and Phase 6 question adaptation' },
  ],
  frontend: [
    { field: 'businessModules', min: 1, why: 'feature areas / routes drive frontend-context' },
  ],
  mobile: [
    { field: 'businessModules', min: 1, why: 'screen tree / feature areas drive the mobile context' },
  ],
  mixed: [
    { field: 'businessModules', min: 1, why: 'a whole-repo analysis with no named modules is not usable downstream' },
    { field: 'entities', min: 1, why: 'a whole-repo analysis with no entities is not usable downstream' },
  ],
  library: [
    { field: 'businessModules', min: 1, why: 'the public surface must be named' },
  ],
  infra: [],
};

const GENERIC_NAME = /^(module|service|component|api|backend|frontend|core|main|app|misc|other|various|unknown|n\/a|tbd)$/i;

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf-8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function countLines(file) {
  try {
    return fs.readFileSync(file, 'utf-8').split(/\r?\n/).length;
  } catch {
    return null;
  }
}

function validateReport(file, name) {
  const errors = [];
  const warnings = [];
  const shallow = [];

  const bytes = fs.statSync(file).size;
  if (bytes > MAX_JSON_BYTES) {
    warnings.push(`${(bytes / 1024).toFixed(1)} KB exceeds the ${MAX_JSON_BYTES / 1024} KB budget - trim the report or split the component`);
  }

  let data;
  try {
    data = readJson(file);
  } catch (e) {
    return { component: name, file, ok: false, errors: [`unparseable JSON: ${e.message}`], warnings, shallow, counts: {} };
  }

  for (const key of REQUIRED_SCALARS) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      errors.push(`missing required field "${key}"`);
    }
  }
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(data[key])) errors.push(`field "${key}" must be an array (even if empty)`);
  }
  if (data.schemaVersion !== undefined && data.schemaVersion !== 1) {
    errors.push(`unsupported schemaVersion ${data.schemaVersion} (this validator understands 1)`);
  }
  if (data.kind !== undefined && !KINDS.includes(data.kind)) {
    errors.push(`kind "${data.kind}" is not one of ${KINDS.join(', ')}`);
  }
  if (data.coverage !== undefined && !['full', 'partial'].includes(data.coverage)) {
    errors.push(`coverage "${data.coverage}" must be "full" or "partial"`);
  }
  if (data.coverage === 'partial' && Array.isArray(data.gaps) && data.gaps.length === 0) {
    errors.push('coverage is "partial" but gaps[] is empty - a partial report must say what it missed');
  }

  // Item-level conformance. The schema marks a key required on each item, and Phase 6 harvests
  // exactly those keys to build its project vocabulary - a nameless module contributes nothing,
  // so an array of shapeless objects passes an Array.isArray check and then fails Part 3.5 with
  // a misleading "guidelines are too generic" verdict. Catch it here, where the cause is.
  const ITEM_REQUIRED_KEY = {
    businessModules: 'name',
    entities: 'name',
    endpointGroups: 'pathPattern',
    integrations: 'name',
  };
  for (const [key, required] of Object.entries(ITEM_REQUIRED_KEY)) {
    if (!Array.isArray(data[key])) continue;
    const bad = data[key].filter((it) => !it || typeof it !== 'object' || !it[required]);
    if (bad.length) {
      errors.push(`${bad.length} of ${data[key].length} ${key} item(s) have no "${required}" - Phase 6 cannot cite them`);
    }
  }

  const counts = {};
  for (const key of REQUIRED_ARRAYS) {
    // Count only conforming items, so the shallowness heuristics below are not satisfied
    // by placeholder objects.
    const required = ITEM_REQUIRED_KEY[key];
    counts[key] = Array.isArray(data[key])
      ? (required ? data[key].filter((it) => it && typeof it === 'object' && it[required]).length : data[key].length)
      : 0;
  }

  // The companion markdown report.
  const mdFile = file.replace(/\.json$/, '.md');
  if (fs.existsSync(mdFile)) {
    const lines = countLines(mdFile);
    if (lines !== null && lines > MAX_MD_LINES) {
      warnings.push(`${path.basename(mdFile)} is ${lines} lines, over the ${MAX_MD_LINES}-line budget`);
    }
  } else {
    warnings.push(`no companion ${path.basename(mdFile)} - the narrative report is missing`);
  }

  if (errors.length === 0) {
    // Shallowness only makes sense on a structurally valid report.
    const expectations = EXPECTATIONS[data.kind] || [];
    for (const exp of expectations) {
      const n = counts[exp.field] ?? 0;
      if (n < exp.min) {
        shallow.push(`${exp.field}: ${n} (expected >= ${exp.min}) - ${exp.why}`);
      }
    }
    // Generic placeholder names defeat the whole concreteness requirement.
    for (const field of ['businessModules', 'entities', 'integrations']) {
      const generic = (data[field] || [])
        .map((x) => (x && typeof x === 'object' ? x.name : x))
        .filter((n) => typeof n === 'string' && GENERIC_NAME.test(n.trim()));
      if (generic.length) {
        shallow.push(`${field} contains generic placeholder name(s): ${[...new Set(generic)].join(', ')}`);
      }
    }
    // Modules without a path cannot be cited in guidelines.
    const pathless = (data.businessModules || []).filter((m) => m && typeof m === 'object' && !m.path).length;
    if (pathless > 0 && counts.businessModules > 0) {
      warnings.push(`${pathless} of ${counts.businessModules} businessModules have no "path" - they cannot be cited concretely in guidelines.md`);
    }
  }

  return {
    component: data.component || name,
    kind: data.kind,
    coverage: data.coverage,
    file,
    ok: errors.length === 0 && shallow.length === 0,
    errors,
    warnings,
    shallow,
    counts,
  };
}

function main() {
  if (!fs.existsSync(ANALYSIS_DIR)) {
    const msg = `Analysis directory not found: ${path.relative(ROOT, ANALYSIS_DIR) || ANALYSIS_DIR}`;
    if (asJson) {
      // Same key set and the same relative `dir` as the normal path, so a machine caller can
      // read `ok` and `indexErrors` without special-casing this branch.
      console.log(JSON.stringify({
        dir: path.relative(ROOT, ANALYSIS_DIR) || ANALYSIS_DIR,
        indexPresent: false,
        indexErrors: [msg],
        orphaned: [],
        reports: [],
        needsFollowUp: [],
        ok: false,
        error: msg,
      }, null, 2));
    } else {
      console.error(msg);
      console.error('Phase 0.5 creates it; Phase 4 fills it. Nothing to validate yet.');
    }
    process.exit(1);
  }

  const indexFile = path.join(ANALYSIS_DIR, 'index.json');
  let index = null;
  const indexErrors = [];
  if (fs.existsSync(indexFile)) {
    try {
      index = readJson(indexFile);
      if (!Array.isArray(index.components)) indexErrors.push('index.json: "components" must be an array');
      if (index.delegationMode === undefined) {
        indexErrors.push('index.json: "delegationMode" is missing - Phase 4 records how the wave was dispatched');
      } else if (!DELEGATION_MODES.includes(index.delegationMode)) {
        indexErrors.push(`index.json: delegationMode "${index.delegationMode}" is not one of ${DELEGATION_MODES.join(', ')}`);
      }
      if (index.coverage && typeof index.coverage !== 'object') indexErrors.push('index.json: "coverage" must be an object');
    } catch (e) {
      indexErrors.push(`index.json is unparseable: ${e.message}`);
    }
  } else {
    indexErrors.push('index.json is missing - Phase 4 writes it before the first dispatch');
  }

  const reportFiles = fs.readdirSync(ANALYSIS_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => path.join(ANALYSIS_DIR, f));

  const reports = reportFiles.map((f) => validateReport(f, path.basename(f, '.json')));

  // A component promised by index.json but with no artifact on disk is a dropped subagent.
  const orphaned = [];
  if (index && Array.isArray(index.components)) {
    for (const c of index.components) {
      const expected = path.join(ANALYSIS_DIR, `${c.name}.json`);
      if (c.status === 'completed' && !fs.existsSync(expected)) {
        orphaned.push(`${c.name}: index.json says "completed" but ${c.name}.json does not exist`);
      }
    }
  }

  const needsFollowUp = reports.filter((r) => !r.ok).map((r) => ({
    component: r.component,
    reasons: [...r.errors, ...r.shallow],
  }));

  const exitCode = (needsFollowUp.length || indexErrors.length || orphaned.length) ? 1 : 0;

  if (asJson) {
    console.log(JSON.stringify({
      dir: path.relative(ROOT, ANALYSIS_DIR),
      indexPresent: index !== null,
      indexErrors,
      orphaned,
      reports,
      needsFollowUp,
      ok: exitCode === 0,
    }, null, 2));
    process.exit(exitCode);
  }

  console.log(`Analysis artifacts in ${path.relative(ROOT, ANALYSIS_DIR)}`);
  console.log('');

  for (const e of indexErrors) console.log(`  INDEX   ${e}`);
  for (const o of orphaned) console.log(`  MISSING ${o}`);
  if (indexErrors.length || orphaned.length) console.log('');

  if (reports.length === 0) {
    console.log('  (no component reports yet)');
  }

  for (const r of reports) {
    const label = `${r.component}${r.kind ? ` [${r.kind}]` : ''}`;
    if (r.ok && !quiet) {
      const c = r.counts;
      console.log(`  OK      ${label} - modules ${c.businessModules}, entities ${c.entities}, endpoint groups ${c.endpointGroups}, integrations ${c.integrations}${r.coverage === 'partial' ? ' (partial)' : ''}`);
    }
    for (const e of r.errors) console.log(`  ERROR   ${label}: ${e}`);
    for (const s of r.shallow) console.log(`  SHALLOW ${label}: ${s}`);
    if (!quiet) for (const w of r.warnings) console.log(`  warn    ${label}: ${w}`);
  }

  console.log('');
  if (exitCode === 0) {
    console.log(`All ${reports.length} report(s) usable.`);
  } else if (needsFollowUp.length) {
    console.log(`${needsFollowUp.length} report(s) need a narrowed follow-up dispatch:`);
    for (const f of needsFollowUp) {
      console.log(`  - ${f.component}: ${f.reasons.join('; ')}`);
    }
    console.log('');
    console.log('Dispatch one brief per listed component, asking only for the missing facts by name.');
    console.log('Do NOT re-run the whole fan-out - see references/subagent-contract.md section 9.');
  } else {
    console.log('Reports themselves are usable; fix the index.json / missing-artifact problems above.');
  }
  process.exit(exitCode);
}

main();
