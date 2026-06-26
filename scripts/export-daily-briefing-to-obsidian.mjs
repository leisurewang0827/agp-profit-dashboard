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
  if (!env[key]) {
    throw new Error(`${key} is missing or empty in .env.local`);
  }
}

function todaySeoul() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

async function fetchBriefing(env, date) {
  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/daily_briefings?briefing_date=eq.${date}&select=*`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`daily_briefings query failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }

  const rows = await response.json();
  if (!rows.length) {
    throw new Error(`No daily briefing found for ${date}`);
  }
  return rows[0];
}

function markdownFor(briefing) {
  const metrics = briefing.metrics || {};
  const actionItems = briefing.action_items || [];
  const lines = [
    "---",
    `date: ${briefing.briefing_date}`,
    "type: agp-daily-briefing",
    `status: ${briefing.status}`,
    "source: supabase",
    "---",
    "",
    `# ${briefing.title}`,
    "",
    "## Summary",
    "",
    briefing.summary || "",
    "",
    "## Metrics",
    "",
    `- Main latest date: ${metrics.main_latest_date || "none"}`,
    `- Main rows: ${metrics.main_rows ?? 0}`,
    `- Ad category latest date: ${metrics.ad_category_latest_date || "none"}`,
    `- Ad category rows: ${metrics.ad_category_rows ?? 0}`,
    `- Ad channel latest date: ${metrics.ad_channel_latest_date || "none"}`,
    `- Ad channel rows: ${metrics.ad_channel_rows ?? 0}`,
    `- Recent successful runs: ${metrics.recent_successful_runs ?? 0}`,
    `- Recent failed runs: ${metrics.recent_failed_runs ?? 0}`,
    `- Pending approvals: ${metrics.pending_approvals ?? 0}`,
    "",
    "## Action Items",
    ""
  ];

  if (actionItems.length) {
    for (const item of actionItems) {
      lines.push(`- [ ] ${item.label || item.type}`);
    }
  } else {
    lines.push("- No action items.");
  }

  lines.push(
    "",
    "## Links",
    "",
    "- [[AGP 자동화]]",
    "- [[자동화 실행 기록]]",
    "",
    `Updated: ${new Date().toISOString()}`,
    ""
  );

  return lines.join("\n");
}

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

const date = process.argv[2] || todaySeoul();
const vaultPath = env.OBSIDIAN_VAULT_PATH || "C:\\Users\\user\\Documents\\GitHub\\app-automation-vault";
const targetDir = join(vaultPath, "30-Records", "AGP");
const targetPath = join(targetDir, `${date} AGP 운영 브리핑.md`);

const result = await recordRun(env, {
  jobName: "export_daily_briefing_to_obsidian",
  summary: `Exported AGP daily briefing ${date} to Obsidian.`
}, async () => {
  const briefing = await fetchBriefing(env, date);
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(targetPath, markdownFor(briefing), "utf8");
  return {
    summary: `Exported AGP daily briefing ${date} to Obsidian.`,
    metrics: {
      briefing_date: date,
      target_path: targetPath,
      status: briefing.status
    },
    targetPath
  };
});

console.log("Daily briefing exported to Obsidian");
console.log(`- Date: ${date}`);
console.log(`- Path: ${result.targetPath}`);
