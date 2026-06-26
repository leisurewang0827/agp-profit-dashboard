import { readFileSync } from "node:fs";
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

function readText(path) {
  return readFileSync(path, "utf8");
}

function extractJsObject(source, marker, endMarker) {
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Could not find marker: ${marker}`);
  }

  const objectStart = source.indexOf("{", start);
  const end = source.indexOf(endMarker, objectStart);
  if (objectStart === -1 || end === -1) {
    throw new Error(`Could not isolate object for marker: ${marker}`);
  }

  const objectSource = source.slice(objectStart, end).trim().replace(/;$/, "");
  return Function(`"use strict"; return (${objectSource});`)();
}

function asNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function mainDashboardRows() {
  const html = readText("index.html");
  const rowsByMonth = extractJsObject(
    html,
    "const dailyRowsByMonth",
    "const categoryRowsByMonth"
  );

  return Object.entries(rowsByMonth).flatMap(([month, rows]) =>
    rows.map(row => ({
      report_date: `${month}-${String(row.day).padStart(2, "0")}`,
      revenue: asNumber(row.revenue),
      self_revenue_api: asNumber(row.selfRevenueApi),
      naver_revenue_api: asNumber(row.naverRevenueApi),
      imweb_profit: asNumber(row.imweb),
      naver_profit: asNumber(row.naver),
      meta_ad_spend: asNumber(row.meta),
      google_ad_spend: asNumber(row.googleAd),
      naver_search_ad_spend: asNumber(row.naverAd),
      imweb_delivery_fee: asNumber(row.imwebDeliveryFee),
      naver_delivery_fee: asNumber(row.naverDeliveryFee),
      total_delivery_fee: asNumber(row.totalDeliveryFee),
      quality: row.quality || "STATIC_DASHBOARD"
    }))
  );
}

function adProfitRows() {
  const payload = JSON.parse(readText("ad-profit-dashboard/data/ad_profit_dashboard_data.json"));
  const categoryRows = (payload.daily_rows || []).map(row => ({
    report_date: row.report_date,
    platform: row.platform,
    category: row.category,
    spend: asNumber(row.spend),
    revenue: asNumber(row.revenue),
    net_profit: asNumber(row.net_profit),
    order_count: Math.trunc(asNumber(row.order_count)),
    real_roi: asNumber(row.real_roi),
    source: "static_dashboard"
  }));

  const channelRows = (payload.channel_rows || []).map(row => ({
    report_date: row.report_date,
    platform: row.channel_code,
    ad_spend: asNumber(row.ad_spend),
    impressions: Math.trunc(asNumber(row.impressions)),
    clicks: Math.trunc(asNumber(row.clicks)),
    ad_conversions: asNumber(row.ad_conversions),
    ad_conversion_value: asNumber(row.ad_conversion_value),
    source: "static_dashboard",
    raw: row
  }));

  return { categoryRows, channelRows };
}

async function upsertRows({ env, table, rows, onConflict, chunkSize = 500, dryRun = false }) {
  if (!rows.length) {
    return { table, rows: 0, chunks: 0 };
  }

  if (dryRun) {
    return { table, rows: rows.length, chunks: Math.ceil(rows.length / chunkSize), dryRun: true };
  }

  const baseUrl = env.SUPABASE_URL.replace(/\/$/, "");
  let chunks = 0;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    chunks += 1;
    const endpoint = `${baseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(chunk)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${table} upsert failed: HTTP ${response.status} ${response.statusText} ${body}`);
    }
  }

  return { table, rows: rows.length, chunks };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const env = loadEnv();
  assertConfigured(env, "SUPABASE_URL");
  assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

  const mainRows = mainDashboardRows();
  const { categoryRows, channelRows } = adProfitRows();

  console.log("Static dashboard -> Supabase sync");
  console.log(`- Mode: ${dryRun ? "dry-run" : "write"}`);
  console.log(`- Main daily rows: ${mainRows.length}`);
  console.log(`- Ad category rows: ${categoryRows.length}`);
  console.log(`- Ad channel rows: ${channelRows.length}`);

  const result = await recordRun(env, {
    jobName: dryRun ? "sync_static_data_to_supabase_dry_run" : "sync_static_data_to_supabase",
    summary: dryRun
      ? "Planned static dashboard data sync to Supabase."
      : "Synced static dashboard data to Supabase.",
    metrics: {
      dry_run: dryRun,
      main_daily_rows: mainRows.length,
      ad_category_rows: categoryRows.length,
      ad_channel_rows: channelRows.length
    }
  }, async () => {
    const results = [];
    results.push(await upsertRows({
      env,
      table: "mart_daily_profit_gauge_latest_closed",
      rows: mainRows,
      onConflict: "report_date",
      dryRun
    }));
    results.push(await upsertRows({
      env,
      table: "ad_profit_platform_category_daily",
      rows: categoryRows,
      onConflict: "report_date,platform,category",
      dryRun
    }));
    results.push(await upsertRows({
      env,
      table: "stg_ads_daily",
      rows: channelRows,
      onConflict: "report_date,platform",
      dryRun
    }));

    return {
      results,
      summary: dryRun
        ? "Static dashboard data sync dry-run completed."
        : "Static dashboard data sync completed.",
      metrics: {
        dry_run: dryRun,
        main_daily_rows: mainRows.length,
        ad_category_rows: categoryRows.length,
        ad_channel_rows: channelRows.length
      }
    };
  });

  for (const item of result.results) {
    console.log(`- ${item.table}: ${item.rows} rows, ${item.chunks} chunk(s)${item.dryRun ? " planned" : " synced"}`);
  }
}

await main();
