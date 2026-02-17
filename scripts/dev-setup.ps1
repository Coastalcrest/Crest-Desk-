# CrestDesk Local Development Setup
# Run from the monorepo root: .\scripts\dev-setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n=== CrestDesk Dev Setup ===" -ForegroundColor Cyan

# ─── Check prerequisites ─────────────────────────────────────────────────────

Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow

# Node.js
$nodeVersion = & node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "  MISSING: Node.js >= 20 is required. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green

# Docker
$dockerVersion = & docker --version 2>$null
if (-not $dockerVersion) {
    Write-Host "  MISSING: Docker Desktop is required. Install from https://docker.com" -ForegroundColor Red
    exit 1
}
Write-Host "  Docker: $dockerVersion" -ForegroundColor Green

# Docker Compose
$composeVersion = & docker compose version 2>$null
if (-not $composeVersion) {
    Write-Host "  MISSING: Docker Compose is required (included with Docker Desktop)" -ForegroundColor Red
    exit 1
}
Write-Host "  Compose: $composeVersion" -ForegroundColor Green

# ─── Create .env if missing ──────────────────────────────────────────────────

if (-not (Test-Path ".env")) {
    Write-Host "`nCreating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"

    # Generate JWT_SECRET
    $jwtSecret = & node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
    (Get-Content ".env") -replace 'CHANGE_ME_generate_a_random_64_char_hex_string', $jwtSecret | Set-Content ".env"

    # Set dev defaults
    (Get-Content ".env") -replace 'NODE_ENV=.*', 'NODE_ENV=development' | Set-Content ".env"

    Write-Host "  .env created with generated JWT_SECRET" -ForegroundColor Green
} else {
    Write-Host "`n.env already exists — skipping" -ForegroundColor Gray
}

# ─── Create apps/web/.env.local if missing ───────────────────────────────────

if (-not (Test-Path "apps\web\.env.local")) {
    Write-Host "Creating apps/web/.env.local..." -ForegroundColor Yellow
    "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" | Set-Content "apps\web\.env.local"
    Write-Host "  .env.local created" -ForegroundColor Green
}

# ─── Install dependencies ────────────────────────────────────────────────────

Write-Host "`nInstalling npm dependencies..." -ForegroundColor Yellow
& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  Dependencies installed" -ForegroundColor Green

# ─── Start Docker services ───────────────────────────────────────────────────

Write-Host "`nStarting Docker services (PostgreSQL, Redis, Elasticsearch)..." -ForegroundColor Yellow
& npm run docker:up
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Docker startup failed! Make sure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

# Wait for PostgreSQL to be ready
Write-Host "  Waiting for PostgreSQL..." -ForegroundColor Yellow
$maxRetries = 30
$retry = 0
do {
    Start-Sleep -Seconds 2
    $retry++
    $pgReady = & docker exec crestdesk-postgres pg_isready -U crestdesk -d crestdesk 2>$null
} while ($LASTEXITCODE -ne 0 -and $retry -lt $maxRetries)

if ($retry -ge $maxRetries) {
    Write-Host "  PostgreSQL did not become ready in time!" -ForegroundColor Red
    exit 1
}
Write-Host "  PostgreSQL is ready" -ForegroundColor Green

# Wait for Redis
Write-Host "  Waiting for Redis..." -ForegroundColor Yellow
$retry = 0
do {
    Start-Sleep -Seconds 1
    $retry++
    & docker exec crestdesk-redis redis-cli ping 2>$null | Out-Null
} while ($LASTEXITCODE -ne 0 -and $retry -lt 15)
Write-Host "  Redis is ready" -ForegroundColor Green

# ─── Run database migrations ─────────────────────────────────────────────────

Write-Host "`nRunning database migrations..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://crestdesk:crestdesk_dev@localhost:5432/crestdesk"
Set-Location packages\db
& npx tsx seeds/run-migrations.ts
if ($LASTEXITCODE -ne 0) {
    Set-Location ..\..
    Write-Host "  Migrations failed! Check DATABASE_URL in .env" -ForegroundColor Red
    exit 1
}
Write-Host "  Migrations complete" -ForegroundColor Green

# ─── Run seed data ───────────────────────────────────────────────────────────

Write-Host "`nSeeding database with demo data..." -ForegroundColor Yellow
& npx tsx seeds/index.ts
Set-Location ..\..
Write-Host "  Seed data loaded" -ForegroundColor Green

# ─── Done ─────────────────────────────────────────────────────────────────────

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start CrestDesk:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "Then open:" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor Green
Write-Host "  Gateway:   http://localhost:4000" -ForegroundColor Green
Write-Host "  API Docs:  http://localhost:4000/api/v1/docs" -ForegroundColor Green
Write-Host "  Health:    http://localhost:4000/health/ready" -ForegroundColor Green
Write-Host ""
Write-Host "Demo login credentials:" -ForegroundColor White
Write-Host "  Broker:  broker@demo.crestdesk.com / DemoPass123!" -ForegroundColor Green
Write-Host "  Agent:   alex@demo.crestdesk.com   / DemoPass123!" -ForegroundColor Green
Write-Host "  Agent:   jordan@demo.crestdesk.com / DemoPass123!" -ForegroundColor Green
Write-Host "  Agent:   maya@demo.crestdesk.com   / DemoPass123!" -ForegroundColor Green
Write-Host "  Staff:   office@demo.crestdesk.com / DemoPass123!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: AI features (copilot, compliance, docs) require Python services." -ForegroundColor Yellow
Write-Host "Core features (transactions, contacts, documents, signing) work without them." -ForegroundColor Yellow
Write-Host ""
