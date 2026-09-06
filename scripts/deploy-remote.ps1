$ErrorActionPreference = "Stop"

$SERVER_HOST = "server.trkhoang.com"
$SERVER_PORT = "2222"
$SERVER_USER = "hoaug"
$REMOTE_DIR = "/home/$SERVER_USER/reported"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " REPORTED - PRODUCTION REMOTE DEPLOYMENT (POWERSHELL)     " -ForegroundColor Cyan
Write-Host " Host: ${SERVER_HOST}:${SERVER_PORT} | Target: ${REMOTE_DIR}    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "`n[1/5] Testing SSH connectivity..." -ForegroundColor Yellow
$sshTest = ssh -p $SERVER_PORT -o BatchMode=yes -o ConnectTimeout=8 "$SERVER_USER@$SERVER_HOST" "echo Connected"
if ($sshTest -notmatch "Connected") {
    Write-Error "Failed to connect to ${SERVER_HOST}:${SERVER_PORT} via SSH."
    exit 1
}
Write-Host "SSH connection verified successfully." -ForegroundColor Green

Write-Host "`n[2/5] Creating remote destination directory..." -ForegroundColor Yellow
ssh -p $SERVER_PORT "$SERVER_USER@$SERVER_HOST" "mkdir -p $REMOTE_DIR"

Write-Host "`n[3/5] Syncing project files to remote server..." -ForegroundColor Yellow
$tempTar = "$env:TEMP\reported_deploy_payload.tar.gz"
if (Test-Path $tempTar) {
    Remove-Item -Force $tempTar
}

tar --exclude="node_modules" `
    --exclude=".git" `
    --exclude="dist" `
    --exclude=".cache" `
    --exclude=".env" `
    --exclude="*.log" `
    -czf $tempTar .

scp -P $SERVER_PORT $tempTar "$SERVER_USER@$SERVER_HOST`:$REMOTE_DIR/payload.tar.gz"
Remove-Item -Force $tempTar

ssh -p $SERVER_PORT "$SERVER_USER@$SERVER_HOST" "cd $REMOTE_DIR && tar -xzf payload.tar.gz && rm -f payload.tar.gz"
Write-Host "Project files transferred and unpacked." -ForegroundColor Green

Write-Host "`n[4/5] Synchronizing production environment secrets..." -ForegroundColor Yellow
if (Test-Path ".env.production") {
    scp -P $SERVER_PORT .env.production "$SERVER_USER@$SERVER_HOST`:$REMOTE_DIR/.env"
    Write-Host "Transferred .env.production as .env on remote server." -ForegroundColor Green
} else {
    Write-Host "Warning: Local .env.production not found. Remote .env retained." -ForegroundColor DarkYellow
}

Write-Host "`n[5/5] Building & Launching Docker containers on server..." -ForegroundColor Yellow
ssh -p $SERVER_PORT "$SERVER_USER@$SERVER_HOST" @"
set -e
cd $REMOTE_DIR
echo 'Starting Docker Compose build...'
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
echo ''
echo 'Container Status:'
docker compose -f docker-compose.prod.yml ps
echo ''
echo 'Cleaning up dangling Docker images...'
docker image prune -f || true
"@

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host " Edge URL: https://reported-engwithme.trkhoang.com" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
