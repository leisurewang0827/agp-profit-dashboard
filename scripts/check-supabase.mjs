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

async function restQuery({ url, serviceRoleKey, table }) {
  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/${table}?select=*&limit=1`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  return {
    table,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText
  };
}

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

if (env.SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_secret_")) {
  console.log("Warning: SUPABASE_SERVICE_ROLE_KEY starts with sb_secret_.");
  console.log("Use the legacy service_role JWT if PostgREST returns 401.");
}

const tables = [
  "mart_daily_profit_gauge_latest_closed",
  "stg_ads_daily",
  "meta_ad_profit_daily_summary",
  "vw_ad_profit_platform_daily_summary"
];

console.log("Supabase connection check");
console.log(`- URL configured: ${env.SUPABASE_URL.replace(/\/$/, "")}`);
console.log("- Service role key: configured");

for (const table of tables) {
  try {
    const result = await restQuery({
      url: env.SUPABASE_URL,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      table
    });
    const hint = result.status === 401
      ? " (check that SUPABASE_SERVICE_ROLE_KEY is the legacy service_role JWT)"
      : "";
    console.log(`- ${result.table}: ${result.ok ? "OK" : `HTTP ${result.status} ${result.statusText}${hint}`}`);
  } catch (error) {
    console.log(`- ${table}: ERROR ${error.message}`);
  }
}
