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

async function fetchJson({ env, table, query }) {
  const baseUrl = env.SUPABASE_URL.replace(/\/$/, "");
  const endpoint = `${baseUrl}/rest/v1/${table}?${query}`;
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

async function summarizeTable(env, table, dateField) {
  const countRows = await fetchJson({
    env,
    table,
    query: "select=*&limit=1"
  });
  const latestRows = await fetchJson({
    env,
    table,
    query: `select=${dateField}&order=${dateField}.desc&limit=1`
  });
  const allDates = await fetchJson({
    env,
    table,
    query: `select=${dateField}`
  });

  return {
    table,
    rows: allDates.length,
    sampleExists: countRows.length > 0,
    latestDate: latestRows[0]?.[dateField] || null
  };
}

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

const summaries = [
  await summarizeTable(env, "mart_daily_profit_gauge_latest_closed", "report_date"),
  await summarizeTable(env, "ad_profit_platform_category_daily", "report_date"),
  await summarizeTable(env, "stg_ads_daily", "report_date")
];

console.log("Supabase data verification");
for (const summary of summaries) {
  console.log(`- ${summary.table}: ${summary.rows} rows, latest ${summary.latestDate || "none"}`);
}
