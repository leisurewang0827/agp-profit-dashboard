# AGP Profit Dashboard Handoff

## Current State

- Intended repository: `https://github.com/leisurewang0827/agp-profit-dashboard.git`
- Local path on this computer: `C:\Users\user\Documents\Codex\2026-06-25\codex-2\work\agp-profit-dashboard`
- Branch: `main`
- Source template: `2019yundiet-cloud/agp-profit-dashboard`, used only as a setup/reference template.
- Working tree at handoff: copied into a clean user-owned workspace for customization.

## What Exists

- `index.html`: main AGP net profit achievement dashboard.
- `codex-agent-setup/index.html`: public setup checklist page for Codex agents.
- `codex-agent-management/index.html`: public operating map for Codex agents.
- `ad-profit-dashboard/index.html`: static ad profit dashboard for Meta, Naver SearchAd, and Google Ads.
- `ad-profit-dashboard/README.md`: notes that Supabase is the source of truth for ad dashboard data.

## Setup Added On This Computer

- `.env.example`: safe list of environment variables to configure on each computer.
- `AUTOMATION_SETUP.md`: operating checklist for continuing the automation setup.
- `scripts/check-local-setup.ps1`: local readiness check for Git, Node, npm, Python, Chrome, and secret placeholders.
- `scripts/check-dashboard-data.mjs`: static dashboard data freshness check.
- `package.json`: lightweight helper commands for local checks and static serving.

## Important Findings

- Git, Node.js, npm via `npm.cmd`, and Python are installed on the main computer.
- PowerShell blocks direct `npm` because of execution policy, but `npm.cmd` works.
- Chrome is installed at `C:\Program Files\Google\Chrome\Application\chrome.exe`; browser automation should use that explicit path or a Codex/Chrome connector.
- The standalone JSON file at `ad-profit-dashboard/data/ad_profit_dashboard_data.json` can parse as JSON, but PowerShell console output may display Korean text with encoding damage.
- The ad dashboard HTML contains a separate inline JSON payload with readable Korean labels.
- `npm.cmd run check:data` currently reports the main dashboard through `2026-06-24` and the ad dashboard through `2026-04-27`.
- Do not push to `2019yundiet-cloud/agp-profit-dashboard` unless the owner explicitly grants access. Use a user-owned repository under `leisurewang0827` for ongoing work.

## Next Agent Prompt

Continue the user-owned AGP profit dashboard automation setup from:

`C:\Users\user\Documents\Codex\2026-06-25\codex-2\work\agp-profit-dashboard`

First run:

```powershell
npm.cmd run check:all
```

Then verify `.env.local` exists locally with non-empty values for the read-only services needed for the current task. Do not print secrets. Use GitHub as the shared handoff surface, keep generated dashboard artifacts committed, and require explicit user approval before any write action to ad accounts, databases, Slack, or external systems.

## Computer Split

- Main computer: execution machine for scheduled checks, local `.env.local`, Chrome/session-based work, Supabase/API reads, dashboard rebuilds, and reviewed Git publishing.
- Laptop: control/review machine for Obsidian instructions, task briefs, report review, and handoff prompts.
- If a login session exists only on the laptop, do the browser-only read there and hand the result back through GitHub/Obsidian or a Codex thread.
