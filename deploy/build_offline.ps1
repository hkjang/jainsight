# Check if running from project root
if (!(Test-Path "nx.json")) {
    Write-Host "Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Create deploy directory if not exists
if (!(Test-Path "deploy")) {
    New-Item -ItemType Directory -Force -Path "deploy"
}

Write-Host "Building API image..." -ForegroundColor Green
docker build -f apps/api/Dockerfile -t jainsight-api:latest .
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Saving API image to deploy/jainsight-api.tar..." -ForegroundColor Green
docker save jainsight-api:latest -o deploy/jainsight-api.tar

Write-Host "Building Web image..." -ForegroundColor Green
docker build -f apps/web/Dockerfile -t jainsight-web:latest .
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Saving Web image to deploy/jainsight-web.tar..." -ForegroundColor Green
docker save jainsight-web:latest -o deploy/jainsight-web.tar

Write-Host "Done! Images are in deploy/ folder." -ForegroundColor Cyan
