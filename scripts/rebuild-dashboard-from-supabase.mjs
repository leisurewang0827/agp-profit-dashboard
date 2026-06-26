import { readFileSync, writeFileSync } from "node:fs";
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

async function fetchRows({ env, table, query }) {
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

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthKey(reportDate) {
  return String(reportDate).slice(0, 7);
}

function dayNumber(reportDate) {
  return Number(String(reportDate).slice(8, 10));
}

function replaceConstObject(source, constName, replacement) {
  const pattern = new RegExp(`(const\\s+${constName}\\s*=\\s*)[\\s\\S]*?(;\\s*const\\s+categoryRowsByMonth\\s*=)`);
  if (!pattern.test(source)) {
    throw new Error(`Could not replace const object: ${constName}`);
  }
  return source.replace(pattern, `$1${replacement}$2`);
}

function groupMainRows(rows) {
  const byMonth = {};
  for (const row of rows) {
    const key = monthKey(row.report_date);
    byMonth[key] ||= [];
    byMonth[key].push({
      day: dayNumber(row.report_date),
      revenue: number(row.revenue),
      selfRevenueApi: number(row.self_revenue_api),
      naverRevenueApi: number(row.naver_revenue_api),
      imweb: number(row.imweb_profit),
      naver: number(row.naver_profit),
      meta: number(row.meta_ad_spend),
      googleAd: number(row.google_ad_spend),
      naverAd: number(row.naver_search_ad_spend),
      imwebDeliveryFee: number(row.imweb_delivery_fee),
      naverDeliveryFee: number(row.naver_delivery_fee),
      totalDeliveryFee: number(row.total_delivery_fee),
      metaSource: "supabase",
      googleSource: "supabase",
      naverSearchSource: "supabase",
      quality: row.quality || "SUPABASE"
    });
  }

  for (const rowsForMonth of Object.values(byMonth)) {
    rowsForMonth.sort((a, b) => a.day - b.day);
  }

  return Object.fromEntries(
    Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
  );
}

function aggregateMonthlyRows(categoryRows) {
  const byKey = new Map();
  for (const row of categoryRows) {
    const key = `${monthKey(row.report_date)}|${row.platform}|${row.category}`;
    const current = byKey.get(key) || {
      month: monthKey(row.report_date),
      platform: row.platform,
      category: row.category,
      spend: 0,
      revenue: 0,
      net_profit: 0,
      order_count: 0,
      real_roi: 0
    };
    current.spend += number(row.spend);
    current.revenue += number(row.revenue);
    current.net_profit += number(row.net_profit);
    current.order_count += number(row.order_count);
    byKey.set(key, current);
  }

  const rows = [...byKey.values()];
  for (const row of rows) {
    row.real_roi = row.spend ? row.net_profit / row.spend : 0;
  }
  return rows.sort((a, b) =>
    a.month.localeCompare(b.month) ||
    a.platform.localeCompare(b.platform) ||
    a.category.localeCompare(b.category)
  );
}

function latestDate(rows, field = "report_date") {
  return rows.map(row => row[field]).filter(Boolean).sort().at(-1) || null;
}

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

const result = await recordRun(env, {
  jobName: "rebuild_dashboard_from_supabase",
  summary: "Rebuilt dashboard artifacts from Supabase data."
}, async () => {
  const mainRows = await fetchRows({
    env,
    table: "mart_daily_profit_gauge_latest_closed",
    query: "select=*&order=report_date.asc"
  });
  const categoryRows = await fetchRows({
    env,
    table: "ad_profit_platform_category_daily",
    query: "select=report_date,platform,category,spend,revenue,net_profit,order_count,real_roi&order=report_date.asc,platform.asc,category.asc"
  });
  const channelRows = await fetchRows({
    env,
    table: "stg_ads_daily",
    query: "select=report_date,platform,ad_spend,impressions,clicks,ad_conversions,ad_conversion_value,raw&order=report_date.asc,platform.asc"
  });

  const dailyRowsByMonth = groupMainRows(mainRows);
  const rootHtmlPath = "index.html";
  const rootHtml = readFileSync(rootHtmlPath, "utf8");
  const updatedRootHtml = replaceConstObject(
    rootHtml,
    "dailyRowsByMonth",
    JSON.stringify(dailyRowsByMonth, null, 10)
  );
  writeFileSync(rootHtmlPath, updatedRootHtml, "utf8");

  const adDailyRows = categoryRows.map(row => ({
    report_date: row.report_date,
    platform: row.platform,
    category: row.category,
    spend: number(row.spend),
    revenue: number(row.revenue),
    net_profit: number(row.net_profit),
    order_count: number(row.order_count),
    real_roi: number(row.real_roi)
  }));
  const adChannelRows = channelRows.map(row => ({
    report_date: row.report_date,
    channel_code: row.platform,
    ad_spend: number(row.ad_spend),
    impressions: number(row.impressions),
    clicks: number(row.clicks),
    ad_conversions: number(row.ad_conversions),
    ad_conversion_value: number(row.ad_conversion_value),
    ga4_revenue: number(row.raw?.ga4_revenue),
    attributed_order_revenue: number(row.raw?.attributed_order_revenue),
    gross_margin: number(row.raw?.gross_margin),
    net_profit: number(row.raw?.net_profit)
  }));
  const adPayload = {
    generated_at: new Date().toISOString(),
    latest_date: latestDate([...adDailyRows, ...adChannelRows]),
    platforms: [
      { code: "meta", label: "Meta" },
      { code: "naver_searchad", label: "Naver SearchAd" },
      { code: "google_ads", label: "Google Ads" }
    ],
    platform_labels: {
      meta: "Meta",
      naver_searchad: "Naver SearchAd",
      google_ads: "Google Ads"
    },
    daily_rows: adDailyRows,
    monthly_rows: aggregateMonthlyRows(adDailyRows),
    channel_rows: adChannelRows
  };

  const adJson = `${JSON.stringify(adPayload, null, 2)}\n`;
  writeFileSync("ad-profit-dashboard/data/ad_profit_dashboard_data.json", adJson, "utf8");

  const adHtmlPath = "ad-profit-dashboard/index.html";
  const adHtml = readFileSync(adHtmlPath, "utf8");
  const updatedAdHtml = adHtml.replace(
    /<script id="dashboard-data" type="application\/json">[\s\S]*?<\/script>/,
    `<script id="dashboard-data" type="application/json">${JSON.stringify(adPayload)}</script>`
  );
  if (updatedAdHtml === adHtml) {
    throw new Error("Could not replace ad dashboard JSON payload");
  }
  writeFileSync(adHtmlPath, updatedAdHtml, "utf8");

  return {
    mainRows,
    adDailyRows,
    adChannelRows,
    summary: "Dashboard rebuild from Supabase completed.",
    metrics: {
      main_rows: mainRows.length,
      main_latest_date: latestDate(mainRows),
      ad_category_rows: adDailyRows.length,
      ad_category_latest_date: latestDate(adDailyRows),
      ad_channel_rows: adChannelRows.length,
      ad_channel_latest_date: latestDate(adChannelRows)
    }
  };
});

console.log("Dashboard rebuilt from Supabase");
console.log(`- Main rows: ${result.mainRows.length}, latest ${latestDate(result.mainRows)}`);
console.log(`- Ad category rows: ${result.adDailyRows.length}, latest ${latestDate(result.adDailyRows)}`);
console.log(`- Ad channel rows: ${result.adChannelRows.length}, latest ${latestDate(result.adChannelRows)}`);
