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

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

const date = process.argv[2] || todaySeoul();
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
  console.log(`No daily briefing found for ${date}`);
  process.exit(0);
}

const briefing = rows[0];
console.log(`Daily briefing: ${briefing.briefing_date}`);
console.log(`- Status: ${briefing.status}`);
console.log(`- Title: ${briefing.title}`);
console.log("- Summary:");
for (const line of String(briefing.summary || "").split("\n")) {
  console.log(`  ${line}`);
}
console.log(`- Action items: ${(briefing.action_items || []).length}`);
for (const item of briefing.action_items || []) {
  console.log(`  - ${item.label || item.type}`);
}
