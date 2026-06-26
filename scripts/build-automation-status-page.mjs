import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusClass(status) {
  if (status === "success" || status === "ready") return "good";
  if (status === "running" || status === "draft") return "warn";
  return "bad";
}

function pageHtml({ runs, approvals, briefing }) {
  const generatedAt = new Date().toISOString();
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AGP Automation Status</title>
  <style>
    :root { color-scheme: light; --bg:#f7f8fb; --panel:#fff; --line:#d9dee8; --text:#162033; --muted:#667085; --good:#147d45; --warn:#b76e00; --bad:#b42318; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, "Noto Sans KR", sans-serif; background: var(--bg); color: var(--text); }
    .page { max-width: 1180px; margin: 0 auto; padding: 32px 20px 48px; }
    header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; border-bottom: 1px solid var(--line); padding-bottom: 18px; margin-bottom: 22px; }
    h1 { margin: 0; font-size: 30px; }
    .muted { color: var(--muted); font-size: 14px; }
    .grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 18px; }
    section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px; }
    h2 { margin: 0 0 14px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border-bottom: 1px solid var(--line); padding: 10px 8px; text-align: left; vertical-align: top; }
    th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .pill { display: inline-block; border-radius: 999px; padding: 3px 8px; font-size: 12px; font-weight: 700; background: #eef2f6; }
    .good { color: var(--good); }
    .warn { color: var(--warn); }
    .bad { color: var(--bad); }
    pre { white-space: pre-wrap; font-family: inherit; line-height: 1.55; margin: 0; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-bottom: 18px; }
    .card { border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: #fbfcfe; }
    .metric { font-size: 22px; font-weight: 700; margin-top: 6px; }
    @media (max-width: 860px) { .grid, .cards { grid-template-columns: 1fr; } header { display:block; } }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <div>
        <h1>AGP Automation Status</h1>
        <div class="muted">Generated ${escapeHtml(generatedAt)}</div>
      </div>
      <div class="muted">Source: Supabase automation tables</div>
    </header>
    <div class="cards">
      <div class="card"><div class="muted">Briefing status</div><div class="metric ${statusClass(briefing?.status)}">${escapeHtml(briefing?.status || "none")}</div></div>
      <div class="card"><div class="muted">Pending approvals</div><div class="metric">${approvals.length}</div></div>
      <div class="card"><div class="muted">Recent failed runs</div><div class="metric ${runs.some(run => run.status === "failed") ? "bad" : "good"}">${runs.filter(run => run.status === "failed").length}</div></div>
    </div>
    <div class="grid">
      <section>
        <h2>Recent Runs</h2>
        <table>
          <thead><tr><th>Started</th><th>Job</th><th>Status</th><th>Duration</th></tr></thead>
          <tbody>
            ${runs.map(run => `<tr><td>${escapeHtml(run.started_at)}</td><td>${escapeHtml(run.job_name)}</td><td><span class="pill ${statusClass(run.status)}">${escapeHtml(run.status)}</span></td><td>${run.duration_ms ?? "-"} ms</td></tr>`).join("")}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Daily Briefing</h2>
        ${briefing ? `<p><strong>${escapeHtml(briefing.title)}</strong></p><pre>${escapeHtml(briefing.summary)}</pre>` : `<p class="muted">No briefing found.</p>`}
      </section>
      <section>
        <h2>Pending Approvals</h2>
        ${approvals.length ? `<table><thead><tr><th>Created</th><th>Risk</th><th>Title</th></tr></thead><tbody>${approvals.map(item => `<tr><td>${escapeHtml(item.created_at)}</td><td>${escapeHtml(item.risk_level)}</td><td>${escapeHtml(item.title)}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No pending approvals.</p>`}
      </section>
    </div>
  </main>
</body>
</html>`;
}

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

const result = await recordRun(env, {
  jobName: "build_automation_status_page",
  summary: "Built static automation status page."
}, async () => {
  const [runs, approvals, briefings] = await Promise.all([
    fetchJson(env, "automation_runs", "select=job_name,status,started_at,duration_ms&order=started_at.desc&limit=20"),
    fetchJson(env, "approval_requests", "select=created_at,risk_level,title&status=eq.pending&order=created_at.desc&limit=20"),
    fetchJson(env, "daily_briefings", "select=briefing_date,status,title,summary&order=briefing_date.desc&limit=1")
  ]);
  const outputDir = "automation-status";
  const outputPath = join(outputDir, "index.html");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, pageHtml({ runs, approvals, briefing: briefings[0] || null }), "utf8");
  return {
    summary: "Built static automation status page.",
    metrics: {
      recent_runs: runs.length,
      pending_approvals: approvals.length,
      has_briefing: Boolean(briefings[0])
    },
    outputPath
  };
});

console.log("Automation status page built");
console.log(`- Path: ${result.outputPath}`);
