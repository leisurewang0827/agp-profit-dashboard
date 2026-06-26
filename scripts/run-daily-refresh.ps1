param(
  [switch]$AutoPublish
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $RepoRoot "logs"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path $LogDir "daily-refresh-$Timestamp.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Invoke-Step {
  param(
    [string]$Name,
    [string[]]$Command
  )

  Write-Log "START $Name"
  Push-Location $RepoRoot
  try {
    & $Command[0] @($Command | Select-Object -Skip 1) 2>&1 | ForEach-Object {
      Add-Content -Path $LogFile -Value $_ -Encoding UTF8
      Write-Host $_
    }
    if ($LASTEXITCODE -ne 0) {
      throw "$Name failed with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
  Write-Log "END $Name"
}

Write-Log "AGP daily refresh started"
Write-Log "Repo: $RepoRoot"
Write-Log "AutoPublish: $AutoPublish"

Invoke-Step "check:supabase" @("npm.cmd", "run", "check:supabase")
Invoke-Step "sync:supabase:dry-run" @("npm.cmd", "run", "sync:supabase:dry-run")
Invoke-Step "sync:supabase" @("npm.cmd", "run", "sync:supabase")
Invoke-Step "verify:supabase-data" @("npm.cmd", "run", "verify:supabase-data")
Invoke-Step "build:from-supabase" @("npm.cmd", "run", "build:from-supabase")
Invoke-Step "check:automation" @("npm.cmd", "run", "check:automation")
Invoke-Step "check:data" @("npm.cmd", "run", "check:data")

if ($AutoPublish) {
  Write-Log "AutoPublish enabled"
  Invoke-Step "git-status" @("git", "status", "--short")
  Invoke-Step "git-add" @("git", "add", "index.html", "ad-profit-dashboard/index.html", "ad-profit-dashboard/data/ad_profit_dashboard_data.json")
  Invoke-Step "git-commit" @("git", "commit", "-m", "Update dashboard from scheduled refresh")
  Invoke-Step "git-push" @("git", "push", "origin", "main")
}
else {
  Write-Log "AutoPublish disabled. Review and push generated dashboard changes manually."
}

Write-Log "AGP daily refresh completed"
