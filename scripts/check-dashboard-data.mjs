import { readFileSync } from "node:fs";

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

function summarizeMainDashboard() {
  const html = readText("index.html");
  const rowsByMonth = extractJsObject(
    html,
    "const dailyRowsByMonth",
    "const categoryRowsByMonth"
  );

  const months = Object.entries(rowsByMonth)
    .map(([month, rows]) => {
      const days = rows.map(row => Number(row.day || 0)).filter(Boolean);
      const latestDay = days.length ? Math.max(...days) : null;
      return {
        month,
        rowCount: rows.length,
        latestDate: latestDay ? `${month}-${String(latestDay).padStart(2, "0")}` : null
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    name: "main",
    latestDate: [...months].reverse().find(month => month.latestDate)?.latestDate || null,
    months
  };
}

function summarizeAdDashboard() {
  const html = readText("ad-profit-dashboard/index.html");
  const match = html.match(/<script id="dashboard-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Could not find ad dashboard JSON payload");
  }

  const payload = JSON.parse(match[1]);
  return {
    name: "ad-profit",
    generatedAt: payload.generated_at || null,
    latestDate: payload.latest_date || null,
    dailyRows: payload.daily_rows?.length || 0,
    monthlyRows: payload.monthly_rows?.length || 0,
    channelRows: payload.channel_rows?.length || 0
  };
}

const main = summarizeMainDashboard();
const ad = summarizeAdDashboard();

console.log("Dashboard data check");
console.log(`- Main dashboard latest date: ${main.latestDate}`);
for (const month of main.months) {
  console.log(`  - ${month.month}: ${month.rowCount} rows, latest ${month.latestDate || "none"}`);
}
console.log(`- Ad dashboard latest date: ${ad.latestDate}`);
console.log(`  - generated_at: ${ad.generatedAt}`);
console.log(`  - daily_rows: ${ad.dailyRows}`);
console.log(`  - monthly_rows: ${ad.monthlyRows}`);
console.log(`  - channel_rows: ${ad.channelRows}`);
