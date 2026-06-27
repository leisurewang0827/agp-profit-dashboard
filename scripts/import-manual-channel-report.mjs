import { readFileSync } from "node:fs";
import { recordRun } from "./automation-log.mjs";

const allowedChannels = new Set(["naver_place", "daangn_ads", "instagram_notice"]);
const numericFields = [
  "spend",
  "impressions",
  "clicks",
  "inquiries",
  "reservations",
  "revenue",
  "followers_delta",
  "profile_visits",
  "messages"
];

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find(arg => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows.filter(item => item.some(cell => cell.trim()));
  if (!headers?.length) throw new Error("CSV header row is missing");

  return dataRows.map((cells, rowIndex) => {
    const item = {};
    headers.forEach((header, cellIndex) => {
      item[header.trim()] = (cells[cellIndex] ?? "").trim();
    });
    item.__rowNumber = rowIndex + 2;
    return item;
  });
}

function parseDate(value, rowNumber) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Row ${rowNumber}: report_date must be YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Row ${rowNumber}: report_date is invalid`);
  }
  return value;
}

function asNumber(value, field, rowNumber) {
  if (value === "") return 0;
  const normalized = String(value).replace(/,/g, "");
  const number = Number(normalized);
  if (!Number.isFinite(number)) {
    throw new Error(`Row ${rowNumber}: ${field} must be numeric`);
  }
  return number;
}

function normalizeRow(row) {
  const rowNumber = row.__rowNumber;
  const channel = row.channel;
  if (!allowedChannels.has(channel)) {
    throw new Error(`Row ${rowNumber}: channel must be one of ${[...allowedChannels].join(", ")}`);
  }

  const normalized = {
    report_date: parseDate(row.report_date, rowNumber),
    channel,
    campaign_name: row.campaign_name || "daily",
    notes: row.notes || null,
    source_url: row.source_url || null,
    source: "manual_csv",
    raw: Object.fromEntries(Object.entries(row).filter(([key]) => key !== "__rowNumber"))
  };

  for (const field of numericFields) {
    normalized[field] = asNumber(row[field] ?? "", field, rowNumber);
  }

  normalized.impressions = Math.trunc(normalized.impressions);
  normalized.clicks = Math.trunc(normalized.clicks);
  normalized.inquiries = Math.trunc(normalized.inquiries);
  normalized.reservations = Math.trunc(normalized.reservations);
  normalized.followers_delta = Math.trunc(normalized.followers_delta);
  normalized.profile_visits = Math.trunc(normalized.profile_visits);
  normalized.messages = Math.trunc(normalized.messages);
  normalized.updated_at = new Date().toISOString();

  return normalized;
}

async function upsertRows(env, rows) {
  const endpoint = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/stg_active_channel_daily?on_conflict=report_date,channel,campaign_name`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`stg_active_channel_daily upsert failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }
}

function summarize(rows) {
  const byChannel = new Map();
  for (const row of rows) {
    const current = byChannel.get(row.channel) || { rows: 0, spend: 0, revenue: 0, inquiries: 0, reservations: 0 };
    current.rows += 1;
    current.spend += row.spend;
    current.revenue += row.revenue;
    current.inquiries += row.inquiries;
    current.reservations += row.reservations;
    byChannel.set(row.channel, current);
  }
  return Object.fromEntries(byChannel);
}

const csvPath = argValue("file", "data/manual-channel-template.csv");
const write = process.argv.includes("--write");
const rows = parseCsv(readFileSync(csvPath, "utf8")).map(normalizeRow);
const metrics = {
  write,
  csv_path: csvPath,
  rows: rows.length,
  channels: summarize(rows)
};

console.log("Manual channel report import");
console.log(`- File: ${csvPath}`);
console.log(`- Mode: ${write ? "write" : "dry-run"}`);
console.log(`- Rows: ${rows.length}`);
for (const [channel, item] of Object.entries(metrics.channels)) {
  console.log(`- ${channel}: ${item.rows} row(s), spend ${item.spend}, revenue ${item.revenue}, inquiries ${item.inquiries}, reservations ${item.reservations}`);
}

if (write) {
  const env = loadEnv();
  if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL is missing or empty in .env.local");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing or empty in .env.local");

  await recordRun(env, {
    jobName: "import_manual_channel_report",
    summary: "Imported manual active-channel report CSV.",
    metrics
  }, async () => {
    await upsertRows(env, rows);
    return {
      summary: "Imported manual active-channel report CSV.",
      metrics
    };
  });

  console.log("- Supabase: synced");
} else {
  console.log("- Supabase: skipped; add --write after applying migration 004");
}
