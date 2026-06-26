import { readFileSync } from "node:fs";

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
  if (!env[key]) {
    throw new Error(`${key} is missing or empty in .env.local`);
  }
}

async function fetchJson(env, table, query) {
  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}?${query}`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table} query failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }

  return response.json();
}

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

const runs = await fetchJson(
  env,
  "automation_runs",
  "select=job_name,status,started_at,finished_at,duration_ms,summary,error_message&order=started_at.desc&limit=8"
);
const pendingApprovals = await fetchJson(
  env,
  "approval_requests",
  "select=id,action_type,risk_level,title,created_at&status=eq.pending&order=created_at.desc&limit=8"
);

console.log("Automation operations check");
console.log(`- Recent runs: ${runs.length}`);
for (const run of runs) {
  const duration = run.duration_ms == null ? "running" : `${run.duration_ms}ms`;
  console.log(`  - ${run.started_at} ${run.job_name}: ${run.status} (${duration})`);
  if (run.error_message) console.log(`    error: ${run.error_message}`);
}
console.log(`- Pending approvals: ${pendingApprovals.length}`);
for (const approval of pendingApprovals) {
  console.log(`  - ${approval.created_at} [${approval.risk_level}] ${approval.action_type}: ${approval.title}`);
}
