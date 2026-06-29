const storageKey = "agp.manualChannelRows.v1";
const channels = {
  naver_place: "네이버플레이스",
  daangn_ads: "당근광고",
  instagram_notice: "인스타 공고"
};
const fields = [
  "report_date",
  "channel",
  "campaign_name",
  "spend",
  "impressions",
  "clicks",
  "inquiries",
  "reservations",
  "revenue",
  "followers_delta",
  "profile_visits",
  "messages",
  "notes",
  "source_url"
];
const numberFields = new Set([
  "spend",
  "impressions",
  "clicks",
  "inquiries",
  "reservations",
  "revenue",
  "followers_delta",
  "profile_visits",
  "messages"
]);

const today = new Date().toISOString().slice(0, 10);
let selectedChannel = "naver_place";
let rows = loadRows();

const rowsEl = document.querySelector("#rows");
const rowTemplate = document.querySelector("#row-template");
const channelTitle = document.querySelector("#channel-title");
const csvFile = document.querySelector("#csv-file");

function defaultRows() {
  return [
    blankRow("naver_place", "place_daily"),
    blankRow("daangn_ads", "local_campaign"),
    blankRow("instagram_notice", "notice_post")
  ];
}

function blankRow(channel = selectedChannel, campaignName = "daily") {
  return {
    id: crypto.randomUUID(),
    report_date: today,
    channel,
    campaign_name: campaignName,
    spend: 0,
    impressions: 0,
    clicks: 0,
    inquiries: 0,
    reservations: 0,
    revenue: 0,
    followers_delta: 0,
    profile_visits: 0,
    messages: 0,
    notes: "",
    source_url: ""
  };
}

function loadRows() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) && parsed.length ? parsed : defaultRows();
  } catch {
    return defaultRows();
  }
}

function saveRows() {
  localStorage.setItem(storageKey, JSON.stringify(rows));
}

function numberValue(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmtWon(value) {
  return `${Math.round(numberValue(value)).toLocaleString("ko-KR")}원`;
}

function currentRows() {
  return rows.filter(row => row.channel === selectedChannel);
}

function updateCounts() {
  for (const channel of Object.keys(channels)) {
    const el = document.querySelector(`#${channel}-count`);
    if (el) el.textContent = rows.filter(row => row.channel === channel).length;
  }
}

function updateMetrics() {
  const summary = currentRows().reduce((acc, row) => {
    acc.spend += numberValue(row.spend);
    acc.inquiries += numberValue(row.inquiries);
    acc.reservations += numberValue(row.reservations);
    acc.revenue += numberValue(row.revenue);
    return acc;
  }, { spend: 0, inquiries: 0, reservations: 0, revenue: 0 });

  document.querySelector("#metric-spend").textContent = fmtWon(summary.spend);
  document.querySelector("#metric-inquiries").textContent = summary.inquiries.toLocaleString("ko-KR");
  document.querySelector("#metric-reservations").textContent = summary.reservations.toLocaleString("ko-KR");
  document.querySelector("#metric-revenue").textContent = fmtWon(summary.revenue);
}

function render() {
  channelTitle.textContent = channels[selectedChannel];
  document.querySelectorAll(".channel-button").forEach(button => {
    button.classList.toggle("active", button.dataset.channel === selectedChannel);
  });

  rowsEl.innerHTML = "";
  for (const row of currentRows()) {
    const fragment = rowTemplate.content.cloneNode(true);
    const tr = fragment.querySelector("tr");
    tr.dataset.id = row.id;
    fragment.querySelectorAll("input[data-field]").forEach(input => {
      const field = input.dataset.field;
      input.value = row[field] ?? "";
    });
    rowsEl.appendChild(fragment);
  }

  updateCounts();
  updateMetrics();
}

function updateRow(rowId, field, value) {
  const row = rows.find(item => item.id === rowId);
  if (!row) return;
  row[field] = numberFields.has(field) ? numberValue(value) : value;
  saveRows();
  updateCounts();
  updateMetrics();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(items) {
  const lines = [fields.join(",")];
  for (const row of items) {
    lines.push(fields.map(field => csvEscape(row[field] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function downloadCsv() {
  const csv = rowsToCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `manual-channel-report-${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const parsedRows = [];
  let parsedRow = [];
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
      parsedRow.push(value);
      value = "";
    } else if (char === "\n") {
      parsedRow.push(value);
      parsedRows.push(parsedRow);
      parsedRow = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value || parsedRow.length) {
    parsedRow.push(value);
    parsedRows.push(parsedRow);
  }

  const [headers, ...data] = parsedRows.filter(item => item.some(cell => cell.trim()));
  if (!headers) return [];

  return data.map(cells => {
    const row = blankRow();
    headers.forEach((header, index) => {
      const key = header.trim();
      if (!fields.includes(key)) return;
      const cell = (cells[index] ?? "").trim();
      row[key] = numberFields.has(key) ? numberValue(cell) : cell;
    });
    if (!channels[row.channel]) row.channel = selectedChannel;
    if (!row.campaign_name) row.campaign_name = "daily";
    return row;
  });
}

document.querySelectorAll(".channel-button").forEach(button => {
  button.addEventListener("click", () => {
    selectedChannel = button.dataset.channel;
    render();
  });
});

document.querySelector("#add-row").addEventListener("click", () => {
  rows.push(blankRow(selectedChannel));
  saveRows();
  render();
});

document.querySelector("#reset-demo").addEventListener("click", () => {
  rows = defaultRows();
  saveRows();
  render();
});

document.querySelector("#download-csv").addEventListener("click", downloadCsv);

rowsEl.addEventListener("input", event => {
  const input = event.target.closest("input[data-field]");
  if (!input) return;
  const tr = input.closest("tr");
  updateRow(tr.dataset.id, input.dataset.field, input.value);
});

rowsEl.addEventListener("click", event => {
  const button = event.target.closest("button[data-action='delete']");
  if (!button) return;
  const tr = button.closest("tr");
  rows = rows.filter(row => row.id !== tr.dataset.id);
  saveRows();
  render();
});

csvFile.addEventListener("change", async () => {
  const file = csvFile.files?.[0];
  if (!file) return;
  const importedRows = parseCsv(await file.text());
  if (importedRows.length) {
    rows = importedRows;
    selectedChannel = importedRows[0].channel;
    saveRows();
    render();
  }
  csvFile.value = "";
});

render();
