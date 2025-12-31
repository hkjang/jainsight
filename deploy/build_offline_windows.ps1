# Check if running from project root
if (!(Test-Path "nx.json")) {
    Write-Host "Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Create deploy directory if not exists
if (!(Test-Path "deploy")) {
    New-Item -ItemType Directory -Force -Path "deploy" | Out-Null
}

$ErrorActionPreference = "Stop"

try {
    Write-Host "Building API image..." -ForegroundColor Green
    docker build -f apps/api/Dockerfile -t jainsight-api:latest .
    if ($LASTEXITCODE -ne 0) { throw "API build failed" }
    
    Write-Host "Saving API image to deploy/jainsight-api.tar..." -ForegroundColor Green
    docker save jainsight-api:latest -o deploy/jainsight-api.tar
    if ($LASTEXITCODE -ne 0) { throw "API save failed" }

    Write-Host "Building Web image..." -ForegroundColor Green
    docker build -f apps/web/Dockerfile -t jainsight-web:latest .
    if ($LASTEXITCODE -ne 0) { throw "Web build failed" }
    
    Write-Host "Saving Web image to deploy/jainsight-web.tar..." -ForegroundColor Green
    docker save jainsight-web:latest -o deploy/jainsight-web.tar
    if ($LASTEXITCODE -ne 0) { throw "Web save failed" }

    Write-Host "Done! Images are in deploy/ folder." -ForegroundColor Cyan
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
    exit 1
}
