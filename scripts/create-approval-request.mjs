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

async function insertApproval(env, request) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/approval_requests`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(request)
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`approval_requests insert failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }
  const rows = await response.json();
  return rows[0];
}

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

const actionType = argValue("action-type", "manual_review");
const riskLevel = argValue("risk-level", "low");
const title = argValue("title", "Manual review needed");
const description = argValue("description", "Review this item before any external side effect is performed.");

const result = await recordRun(env, {
  jobName: "create_approval_request",
  summary: `Created approval request: ${title}`,
  metrics: { action_type: actionType, risk_level: riskLevel }
}, async () => {
  const request = await insertApproval(env, {
    action_type: actionType,
    risk_level: riskLevel,
    title,
    description,
    requested_payload: {
      source: "codex",
      created_by_script: "create-approval-request.mjs"
    }
  });
  return {
    request,
    summary: `Created approval request ${request.id}.`,
    metrics: {
      approval_request_id: request.id,
      action_type: actionType,
      risk_level: riskLevel
    }
  };
});

console.log("Approval request created");
console.log(`- ID: ${result.request.id}`);
console.log(`- Status: ${result.request.status}`);
console.log(`- Title: ${result.request.title}`);
