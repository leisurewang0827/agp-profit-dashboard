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

function baseUrl(env) {
  return env.SUPABASE_URL.replace(/\/$/, "");
}

function authHeaders(env, prefer = null) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function fetchJson(env, table, query) {
  const endpoint = `${baseUrl(env)}/rest/v1/${table}?${query}`;
  const response = await fetch(endpoint, {
    headers: authHeaders(env)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table} query failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }

  return response.json();
}

async function upsertDailyBriefing(env, briefing) {
  const endpoint = `${baseUrl(env)}/rest/v1/daily_briefings?on_conflict=briefing_date`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: authHeaders(env, "resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify([briefing])
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`daily_briefings upsert failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }
}

async function tableSummary(env, table) {
  const rows = await fetchJson(env, table, "select=report_date&order=report_date.desc");
  return {
    rows: rows.length,
    latestDate: rows[0]?.report_date || null
  };
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

function statusFrom({ failedRuns, pendingApprovals }) {
  if (failedRuns > 0 || pendingApprovals > 0) return "draft";
  return "ready";
}

const env = loadEnv();
assertConfigured(env, "SUPABASE_URL");
assertConfigured(env, "SUPABASE_SERVICE_ROLE_KEY");

const result = await recordRun(env, {
  jobName: "generate_daily_briefing",
  summary: "Generated AGP daily operations briefing."
}, async () => {
  const [main, adCategory, adChannel, recentRuns, pendingApprovals] = await Promise.all([
    tableSummary(env, "mart_daily_profit_gauge_latest_closed"),
    tableSummary(env, "ad_profit_platform_category_daily"),
    tableSummary(env, "stg_ads_daily"),
    fetchJson(
      env,
      "automation_runs",
      "select=job_name,status,started_at,duration_ms,error_message&order=started_at.desc&limit=20"
    ),
    fetchJson(
      env,
      "approval_requests",
      "select=id,action_type,risk_level,title,created_at&status=eq.pending&order=created_at.desc&limit=20"
    )
  ]);

  const failedRuns = recentRuns.filter(run => run.status === "failed").length;
  const successfulRuns = recentRuns.filter(run => run.status === "success").length;
  const briefingDate = todaySeoul();
  const actionItems = [];

  if (failedRuns > 0) {
    actionItems.push({
      type: "review_failed_runs",
      label: "최근 실패한 자동화 실행을 확인합니다.",
      count: failedRuns
    });
  }
  if (pendingApprovals.length > 0) {
    actionItems.push({
      type: "review_pending_approvals",
      label: "승인 대기 작업을 검토합니다.",
      count: pendingApprovals.length
    });
  }
  if (!main.latestDate || !adCategory.latestDate || !adChannel.latestDate) {
    actionItems.push({
      type: "missing_data",
      label: "대시보드 원천 데이터 최신일을 확인합니다."
    });
  }

  const metrics = {
    main_rows: main.rows,
    main_latest_date: main.latestDate,
    ad_category_rows: adCategory.rows,
    ad_category_latest_date: adCategory.latestDate,
    ad_channel_rows: adChannel.rows,
    ad_channel_latest_date: adChannel.latestDate,
    recent_successful_runs: successfulRuns,
    recent_failed_runs: failedRuns,
    pending_approvals: pendingApprovals.length
  };

  const summary = [
    `메인 손익 데이터는 ${main.latestDate || "없음"}까지 ${main.rows}행입니다.`,
    `광고 카테고리 데이터는 ${adCategory.latestDate || "없음"}까지 ${adCategory.rows}행입니다.`,
    `광고 채널 데이터는 ${adChannel.latestDate || "없음"}까지 ${adChannel.rows}행입니다.`,
    `최근 자동화 실행 ${recentRuns.length}건 중 성공 ${successfulRuns}건, 실패 ${failedRuns}건입니다.`,
    `승인 대기 작업은 ${pendingApprovals.length}건입니다.`
  ].join("\n");

  const briefing = {
    briefing_date: briefingDate,
    status: statusFrom({ failedRuns, pendingApprovals: pendingApprovals.length }),
    title: `AGP 운영 브리핑 ${briefingDate}`,
    summary,
    metrics,
    action_items: actionItems,
    updated_at: new Date().toISOString()
  };

  await upsertDailyBriefing(env, briefing);

  return {
    briefing,
    summary: `Generated daily briefing for ${briefingDate}.`,
    metrics
  };
});

console.log("Daily briefing generated");
console.log(`- Date: ${result.briefing.briefing_date}`);
console.log(`- Status: ${result.briefing.status}`);
console.log(`- Pending approvals: ${result.briefing.metrics.pending_approvals}`);
console.log(`- Recent failed runs: ${result.briefing.metrics.recent_failed_runs}`);
