import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "ad-profit-dashboard", "deposit-reconciliation.html");
const dataPath = path.join(root, "ad-profit-dashboard", "data", "deposit_reconciliation_dashboard_data.json");
const indexPath = path.join(root, "ad-profit-dashboard", "index.html");

const requiredSummaryFields = [
  "aggregate_rows",
  "income_total",
  "expense_total",
  "net_total",
  "review_needed_total",
];

const requiredChannelFields = [
  "month",
  "channel",
  "channel_label",
  "source_system",
  "account_type",
  "cash_flow_type",
  "row_count",
  "income_amount",
  "expense_amount",
  "net_amount",
  "review_needed_count",
];

const blockedTerms = [
  "payer_alias",
  "safe_memo",
  "deposit_time",
  "transaction_time",
  "phone",
  "account_number",
  "api_key",
  "password",
  "secret",
  "access_token",
  "refresh_token",
];

const sensitivePatterns = [
  { label: "possible phone number", pattern: /\b01[016789]-?\d{3,4}-?\d{4}\b/ },
  { label: "possible account number", pattern: /\b\d{2,6}-\d{2,6}-\d{2,6}-\d{2,8}\b/ },
  { label: "possible email", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
];

function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${path.relative(root, filePath)}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function assertNoBlockedText(label, text) {
  const lower = text.toLowerCase();
  const foundTerms = blockedTerms.filter((term) => lower.includes(term));
  if (foundTerms.length) {
    throw new Error(`${label} contains blocked terms: ${foundTerms.join(", ")}`);
  }

  const foundPatterns = sensitivePatterns.filter(({ pattern }) => pattern.test(text));
  if (foundPatterns.length) {
    throw new Error(`${label} contains sensitive patterns: ${foundPatterns.map((item) => item.label).join(", ")}`);
  }
}

function assertIntegerField(row, fieldName) {
  if (!Number.isInteger(row[fieldName])) {
    throw new Error(`Channel row has non-integer ${fieldName}`);
  }
}

const pageText = readText(pagePath);
const indexText = readText(indexPath);
const dataText = readText(dataPath);
const data = JSON.parse(dataText);

if (!pageText.includes("deposit_reconciliation_dashboard_data.json")) {
  throw new Error("Deposit dashboard page does not load the deposit reconciliation JSON file.");
}

if (!indexText.includes("deposit-reconciliation.html")) {
  throw new Error("Main dashboard index does not link to deposit-reconciliation.html.");
}

if (!data.summary || typeof data.summary !== "object") {
  throw new Error("Deposit dashboard JSON is missing summary.");
}

for (const fieldName of requiredSummaryFields) {
  assertIntegerField(data.summary, fieldName);
}

if (!Array.isArray(data.channels) || data.channels.length === 0) {
  throw new Error("Deposit dashboard JSON must include at least one channel row.");
}

for (const row of data.channels) {
  for (const fieldName of requiredChannelFields) {
    if (!(fieldName in row)) {
      throw new Error(`Channel row is missing ${fieldName}`);
    }
  }

  for (const fieldName of ["row_count", "income_amount", "expense_amount", "net_amount", "review_needed_count"]) {
    assertIntegerField(row, fieldName);
  }
}

assertNoBlockedText("deposit dashboard data", dataText);

console.log(`Deposit dashboard check passed: ${data.channels.length} channel rows.`);
