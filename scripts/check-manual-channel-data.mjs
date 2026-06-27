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

async function fetchRows(env, table, query) {
  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}?${query}`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (response.status === 404) {
    return { missing: true, rows: [] };
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table} query failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }

  return { missing: false, rows: await response.json() };
}

const env = loadEnv();
if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL is missing or empty in .env.local");
if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing or empty in .env.local");

console.log("Manual active-channel data check");

const latest = await fetchRows(
  env,
  "vw_active_channel_daily_summary",
  "select=report_date,channel,spend,impressions,clicks,inquiries,reservations,revenue&order=report_date.desc,channel.asc&limit=10"
);

if (latest.missing) {
  console.log("- Status: migration 004 not applied yet");
  console.log("- Next: apply supabase/migrations/004_active_manual_channels.sql in Supabase SQL Editor");
} else {
  console.log(`- Recent summary rows: ${latest.rows.length}`);
  if (!latest.rows.length) {
    console.log("- Data: no manual channel rows imported yet");
  } else {
    for (const row of latest.rows) {
      console.log(`- ${row.report_date} ${row.channel}: spend ${row.spend}, impressions ${row.impressions}, clicks ${row.clicks}, inquiries ${row.inquiries}, reservations ${row.reservations}, revenue ${row.revenue}`);
    }
  }
}
