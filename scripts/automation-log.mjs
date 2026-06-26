function baseUrl(env) {
  return env.SUPABASE_URL.replace(/\/$/, "");
}

function headers(env, prefer = "return=representation") {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: prefer
  };
}

async function postRow(env, table, row) {
  const response = await fetch(`${baseUrl(env)}/rest/v1/${table}`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify(row)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table} insert failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }

  const rows = await response.json();
  return rows[0];
}

async function patchRow(env, table, id, patch) {
  const response = await fetch(`${baseUrl(env)}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers(env, "return=minimal"),
    body: JSON.stringify(patch)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table} update failed: HTTP ${response.status} ${response.statusText} ${body}`);
  }
}

export async function startRun(env, { jobName, source = "main_computer", summary = null, metrics = {} }) {
  const startedAt = new Date();
  const row = await postRow(env, "automation_runs", {
    job_name: jobName,
    status: "running",
    source,
    started_at: startedAt.toISOString(),
    summary,
    metrics
  });

  return {
    id: row.id,
    startedAt
  };
}

export async function finishRun(env, run, { status = "success", summary = null, metrics = {}, errorMessage = null }) {
  if (!run?.id) return;
  const finishedAt = new Date();
  await patchRow(env, "automation_runs", run.id, {
    status,
    finished_at: finishedAt.toISOString(),
    duration_ms: Math.max(0, finishedAt.getTime() - run.startedAt.getTime()),
    summary,
    metrics,
    error_message: errorMessage
  });
}

export async function recordRun(env, runOptions, action) {
  const run = await startRun(env, runOptions);
  try {
    const result = await action();
    await finishRun(env, run, {
      status: "success",
      summary: result?.summary || runOptions.summary || null,
      metrics: result?.metrics || {}
    });
    return result;
  } catch (error) {
    await finishRun(env, run, {
      status: "failed",
      summary: runOptions.summary || null,
      metrics: {},
      errorMessage: error.message
    });
    throw error;
  }
}
