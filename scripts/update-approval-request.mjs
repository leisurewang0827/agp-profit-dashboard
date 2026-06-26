import { readFileSync } from "node:fs";
import { recordRun } from "./automation-log.mjs";

function loadEnv(path = ".env.local") {
  const env = {};
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function assertConfigured(env, key) {
  if (!env[key]) throw new Error(`${key} is missing or empty in .env.local`);
}

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

async function patchApproval(env, id, status, note) {
  const patch = {
    status,
    updated_at: new Date().toISOString()
  };
  if (status === "approved") {
    patch.approved_by = "codex";
    patch.approved_at = new Date().toISOString();
  }
  if (status === "executed") {
    patch.executed_at = new Date().toISOString();
  }
  if (note) {
    patch.description = note;
  }

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/approval_requests?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(patch)
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`approval_requests update failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }
  const rows = await response.json();
  if (!rows.length) throw new Error(`No approval request updated for id ${id}`);
  return rows[0];
}

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

const id = argValue("id");
const status = argValue("status", "cancelled");
const note = argValue("note");
const allowed = new Set(["pending", "approved", "rejected", "cancelled", "executed"]);

if (!id) throw new Error("Missing --id");
if (!allowed.has(status)) throw new Error(`Invalid --status ${status}`);

const result = await recordRun(env, {
  jobName: "update_approval_request",
  summary: `Updated approval request ${id} to ${status}.`,
  metrics: { approval_request_id: id, status }
}, async () => {
  const request = await patchApproval(env, id, status, note);
  return {
    request,
    summary: `Updated approval request ${id} to ${status}.`,
    metrics: {
      approval_request_id: id,
      status
    }
  };
});

console.log("Approval request updated");
console.log(`- ID: ${result.request.id}`);
console.log(`- Status: ${result.request.status}`);
