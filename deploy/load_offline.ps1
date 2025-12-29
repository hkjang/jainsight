$currentDir = Get-Location

Write-Host "Loading API image..." -ForegroundColor Green
if (Test-Path "$currentDir/jainsight-api.tar") {
    docker load -i "$currentDir/jainsight-api.tar"
}
else {
    Write-Host "jainsight-api.tar not found!" -ForegroundColor Red
}

Write-Host "Loading Web image..." -ForegroundColor Green
if (Test-Path "$currentDir/jainsight-web.tar") {
    docker load -i "$currentDir/jainsight-web.tar"
}
else {
    Write-Host "jainsight-web.tar not found!" -ForegroundColor Red
}

Write-Host "Images loaded. You can now run:" -ForegroundColor Cyan
Write-Host "docker-compose -f docker-compose.offline.yml up -d" -ForegroundColor Yellow
