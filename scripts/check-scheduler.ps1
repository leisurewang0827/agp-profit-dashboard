$ErrorActionPreference = "Stop"

$TaskName = "AGP Dashboard Daily Refresh"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $RepoRoot "logs"

Write-Host "AGP scheduler check"

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
$info = $task | Get-ScheduledTaskInfo

Write-Host "- Task: $TaskName"
Write-Host "- State: $($task.State)"
Write-Host "- Last run: $($info.LastRunTime)"
Write-Host "- Last result: $($info.LastTaskResult)"
Write-Host "- Next run: $($info.NextRunTime)"

if (-not (Test-Path $LogDir)) {
  throw "Log directory is missing: $LogDir"
}

$latestLog = Get-ChildItem -Path $LogDir -Filter "daily-refresh-*.log" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latestLog) {
  throw "No daily refresh logs found in $LogDir"
}

$tail = Get-Content -LiteralPath $latestLog.FullName -Tail 20
$completed = $tail -match "AGP daily refresh completed"
$failed = $tail -match "failed with exit code|ERROR|Error:"

Write-Host "- Latest log: $($latestLog.Name)"
Write-Host "- Latest log updated: $($latestLog.LastWriteTime)"
Write-Host "- Latest log completed: $([bool]$completed)"

if ($tail.Count -gt 0) {
  Write-Host "- Latest log tail:"
  $tail | ForEach-Object { Write-Host "  $_" }
}

if ($info.LastTaskResult -ne 0) {
  throw "Scheduled task last result is $($info.LastTaskResult)"
}

if (-not $completed) {
  throw "Latest daily refresh log did not reach completion"
}

if ($failed) {
  throw "Latest daily refresh log contains a failure marker"
}
