$ErrorActionPreference = "Stop"

$required = @(
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "HF_TOKEN"
)

$missing = @()
foreach ($name in $required) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    $missing += $name
  }
}

if ($missing.Count -gt 0) {
  Write-Host "Missing required environment variables:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "Environment check: OK" -ForegroundColor Green

try {
  $health = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:5000/health" -TimeoutSec 20
  if (-not $health.ok) {
    throw "Health endpoint did not return ok=true"
  }
  Write-Host "Health check: OK" -ForegroundColor Green
} catch {
  Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

Write-Host "Deployment smoke checks passed." -ForegroundColor Green