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
    statusType: "active",
    mode: "active",
    required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    optional: ["SUPABASE_ANON_KEY", "SUPABASE_DB_URL"]
  },
  {
    name: "Naver Place",
    statusType: "active",
    mode: "active manual/admin",
    required: [],
    optional: ["NAVER_PLACE_BUSINESS_NAME", "NAVER_PLACE_URL"]
  },
  {
    name: "Naver SearchAd API",
    statusType: "optional",
    mode: "optional if paid Naver ads need API reporting",
    required: [
      "NAVER_SEARCHAD_API_KEY",
      "NAVER_SEARCHAD_SECRET_KEY",
      "NAVER_SEARCHAD_CUSTOMER_ID"
    ],
    optional: []
  },
  {
    name: "Danggeun Ads",
    statusType: "active",
    mode: "active manual/admin",
    required: [],
    optional: ["DAANGN_BUSINESS_PROFILE_URL", "DAANGN_REPORT_SOURCE"]
  },
  {
    name: "Instagram notices/promotions",
    statusType: "active",
    mode: "active manual, not connected to Meta Ads",
    required: [],
    optional: ["INSTAGRAM_ACCOUNT_HANDLE", "INSTAGRAM_REPORT_SOURCE"]
  },
  {
    name: "Google Ads / GA4",
    statusType: "inactive",
    mode: "inactive unless enabled later",
    required: [],
    optional: [
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_CLIENT_ID",
      "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_REFRESH_TOKEN",
      "GOOGLE_ADS_CUSTOMER_ID",
      "GA4_PROPERTY_ID"
    ]
  },
  {
    name: "Notifications",
    statusType: "optional",
    mode: "optional",
    required: [],
    optional: ["SLACK_WEBHOOK_URL", "SLACK_CHANNEL"]
  },
  {
    name: "Obsidian",
    statusType: "active",
    mode: "active",
    required: ["OBSIDIAN_VAULT_PATH"],
    optional: []
  },
  {
    name: "Meta Ads API",
    statusType: "inactive",
    mode: "inactive, Instagram is not connected to Meta Ads",
    required: [],
    optional: ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "META_BUSINESS_ID"]
  },
  {
    name: "Imweb",
    statusType: "inactive",
    mode: "inactive",
    required: [],
    optional: ["IMWEB_API_KEY", "IMWEB_API_SECRET"]
  }
];

console.log("External API readiness check");
for (const group of groups) {
  const missingRequired = group.required.filter(key => !configured(env, key));
  const missingOptional = group.optional.filter(key => !configured(env, key));
  let status = missingRequired.length ? "NOT READY" : "READY";
  if (group.statusType === "optional" && missingRequired.length) status = "OPTIONAL NOT CONFIGURED";
  if (group.statusType === "inactive") status = "INACTIVE";
  console.log(`- ${group.name}: ${status}`);
  if (group.mode) console.log(`  - mode: ${group.mode}`);
  if (missingRequired.length) console.log(`  - missing required: ${missingRequired.join(", ")}`);
  if (missingOptional.length) console.log(`  - missing optional: ${missingOptional.join(", ")}`);
}
