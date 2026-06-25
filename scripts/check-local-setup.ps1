$ErrorActionPreference = "Continue"

function Write-Status {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Detail
  )

  $mark = if ($Ok) { "[OK]" } else { "[!!]" }
  Write-Host "$mark $Name - $Detail"
}

function Test-Command {
  param(
    [string]$Name,
    [string]$Command,
    [string[]]$Arguments = @()
  )

  $cmd = Get-Command $Command -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Write-Status $Name $false "$Command not found"
    return
  }

  try {
    $output = & $Command @Arguments 2>$null
    $firstLine = ($output | Select-Object -First 1)
    if ([string]::IsNullOrWhiteSpace($firstLine)) {
      $firstLine = $cmd.Source
    }
    Write-Status $Name $true $firstLine
  } catch {
    Write-Status $Name $false $_.Exception.Message
  }
}

Write-Host "AGP local automation setup check"
Write-Host "Repository: $PWD"
Write-Host ""

Test-Command "Git" "git" @("--version")
Test-Command "Node.js" "node" @("--version")
Test-Command "npm" "npm.cmd" @("--version")
Test-Command "npx" "npx.cmd" @("--version")
Test-Command "Python" "python" @("--version")

$chromeCandidates = @(@(
  "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${Env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$Env:LocalAppData\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path $_) })

if ($chromeCandidates.Count -gt 0) {
  Write-Status "Chrome" $true $chromeCandidates[0]
} else {
  Write-Status "Chrome" $false "not found in common Windows install paths"
}

Write-Host ""

if (Test-Path ".env.local") {
  $envContent = Get-Content ".env.local" -ErrorAction SilentlyContinue
  $requiredKeys = @(
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "META_ACCESS_TOKEN",
    "META_AD_ACCOUNT_ID"
  )

  foreach ($key in $requiredKeys) {
    $hasValue = $false
    foreach ($line in $envContent) {
      if ($line -match "^\s*$([regex]::Escape($key))\s*=\s*.+") {
        $hasValue = $true
        break
      }
    }
    Write-Status "Env $key" $hasValue $(if ($hasValue) { "configured" } else { "missing or empty" })
  }
} else {
  Write-Status ".env.local" $false "copy .env.example to .env.local and fill local secrets"
}

Write-Host ""
Write-Host "Reminder: do not print or commit real secret values."
