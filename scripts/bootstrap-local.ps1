# Bootstrap local development: env file template, npm install, optional Supabase.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path (Join-Path $root ".env.local"))) {
  Copy-Item (Join-Path $root ".env.example") (Join-Path $root ".env.local")
  Write-Host "Created .env.local from .env.example — add your Supabase anon key, Stripe pk_test, etc."
} else {
  Write-Host ".env.local already exists (skipped copy)."
}

if (Get-Command npm -ErrorAction SilentlyContinue) {
  npm install
  if (Get-Command npx -ErrorAction SilentlyContinue) {
    npx playwright install chromium 2>$null
  }
} else {
  Write-Host "npm not found on PATH. Install Node.js LTS or use the Dev Container (.devcontainer/devcontainer.json)."
}

if (Get-Command supabase -ErrorAction SilentlyContinue) {
  Write-Host "Running supabase db push (link project first if needed)..."
  supabase db push
  Write-Host "To serve edge functions locally: supabase functions serve"
} else {
  Write-Host "Supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
}
