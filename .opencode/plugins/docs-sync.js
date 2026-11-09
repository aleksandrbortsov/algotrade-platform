// docs-sync.js — NC AI Workplace (OpenCode line) documentation-sync plugin.
//
// Loaded automatically by OpenCode from .opencode/plugins/ (bundled Bun runtime).
// After a session goes idle it runs the documentation-drift analysis of
// .opencode/hooks/docs-sync-check.js and, when the change set is significant,
// submits a /docs-sync recommendation as the next user-role message of that
// session — OpenCode then starts an agent turn on it, exactly like a typed
// message. The receiving agent follows orchestrator.md → "Documentation Sync
// Recommendations": it presents the two options and never starts a sync on its own.
//
// Guards: never in subagent (child) sessions; at most one submission per idle
// event; the analysis's own 24 h suppression window; an analysis error produces
// at most one message per session per day; `"enabled": false` in
// .opencode/hooks/docs-sync-config.json switches the plugin off.
//
// The plugin has no npm dependencies on purpose: OpenCode would otherwise write
// package.json / bun.lock / node_modules under .opencode/.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const check = require("../hooks/docs-sync-check.js");

const IDLE_DEDUPE_MS = 5000;
const ERROR_SUPPRESS_MS = 24 * 60 * 60 * 1000;

export const DocsSyncPlugin = async ({ client, directory }) => {
  const handled = new Map(); // sessionID -> timestamp of the last idle we acted on
  try {
    await client.app.log({ body: { service: "docs-sync", level: "info", message: "docs-sync plugin initialized", extra: { directory } } });
  } catch {
    // logging is best-effort
  }
  const errored = new Map(); // sessionID -> timestamp of the last error message

  async function isChildSession(sessionID) {
    try {
      const res = await client.session.get({ path: { id: sessionID } });
      const info = res && res.data ? res.data : res;
      return Boolean(info && info.parentID);
    } catch {
      return true; // cannot tell — stay silent rather than risk a subagent session
    }
  }

  async function submit(sessionID, text) {
    await client.session.promptAsync({
      path: { id: sessionID },
      body: { parts: [{ type: "text", text }] },
    });
  }

  async function onIdle(sessionID) {
    if (!sessionID) return;
    const now = Date.now();
    if ((handled.get(sessionID) || 0) > now - IDLE_DEDUPE_MS) return;
    handled.set(sessionID, now);

    let config;
    try {
      config = check.loadConfig(directory);
    } catch {
      return;
    }
    if (config.enabled === false) return;
    if (await isChildSession(sessionID)) return;

    let result;
    try {
      result = check.analyze(directory);
    } catch (err) {
      if ((errored.get(sessionID) || 0) > now - ERROR_SUPPRESS_MS) return;
      errored.set(sessionID, now);
      result = { recommendation: check.errorRecommendation(err) };
    }
    if (!result || !result.recommendation) return;
    try {
      await submit(sessionID, result.recommendation);
    } catch {
      // The session may already be gone; nothing to do.
    }
  }

  return {
    event: async ({ event }) => {
      // `session.idle` fires once per finished agent turn in OpenCode 1.18.x. Newer
      // builds also emit `session.status` with `status.type === "idle"`; switch the
      // listener when upgrading past a release that drops `session.idle`.
      if (event && event.type === "session.idle") {
        await onIdle(event.properties && event.properties.sessionID);
      }
    },
    "experimental.session.compacting": async (_input, output) => {
      // While an initialization is in progress, keep its pointers alive across
      // context compaction (ledger, artifact index, resumption rule). Pointers only.
      try {
        const state = check.initState(directory);
        if (state && output && Array.isArray(output.context)) output.context.push(state.summary);
      } catch {
        // never break compaction
      }
    },
  };
};

export default DocsSyncPlugin;
