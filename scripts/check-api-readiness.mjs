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

function configured(env, key) {
  const value = env[key];
  return Boolean(value && value !== "optional" && !String(value).startsWith("<"));
}

const env = loadEnv();
const groups = [
  {
    name: "Supabase",
    required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    optional: ["SUPABASE_ANON_KEY", "SUPABASE_DB_URL"]
  },
  {
    name: "Meta Ads read-only",
    required: ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"],
    optional: ["META_BUSINESS_ID"]
  },
  {
    name: "Google Ads / GA4",
    required: [
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_CLIENT_ID",
      "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_REFRESH_TOKEN",
      "GOOGLE_ADS_CUSTOMER_ID",
      "GA4_PROPERTY_ID"
    ],
    optional: []
  },
  {
    name: "Naver",
    required: [
      "NAVER_SEARCHAD_API_KEY",
      "NAVER_SEARCHAD_SECRET_KEY",
      "NAVER_SEARCHAD_CUSTOMER_ID"
    ],
    optional: ["NAVER_COMMERCE_APPLICATION_ID", "NAVER_COMMERCE_APPLICATION_SECRET"]
  },
  {
    name: "Imweb",
    required: ["IMWEB_API_KEY", "IMWEB_API_SECRET"],
    optional: []
  },
  {
    name: "Notifications",
    required: [],
    optional: ["SLACK_WEBHOOK_URL", "SLACK_CHANNEL"]
  },
  {
    name: "Obsidian",
    required: ["OBSIDIAN_VAULT_PATH"],
    optional: []
  }
];

console.log("External API readiness check");
for (const group of groups) {
  const missingRequired = group.required.filter(key => !configured(env, key));
  const missingOptional = group.optional.filter(key => !configured(env, key));
  const status = missingRequired.length ? "NOT READY" : "READY";
  console.log(`- ${group.name}: ${status}`);
  if (missingRequired.length) console.log(`  - missing required: ${missingRequired.join(", ")}`);
  if (missingOptional.length) console.log(`  - missing optional: ${missingOptional.join(", ")}`);
}
