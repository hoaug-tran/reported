#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-server.trkhoang.com}"
SERVER_PORT="${SERVER_PORT:-2222}"
SERVER_USER="${SERVER_USER:-hoaug}"
REMOTE_DIR="${REMOTE_DIR:-/home/hoaug/reported}"

echo "=========================================================="
echo " REPORTED - PRODUCTION REMOTE DEPLOYMENT (BASH)           "
echo " Host: ${SERVER_HOST}:${SERVER_PORT} | Target: ${REMOTE_DIR} "
echo "=========================================================="

echo ""
echo "[1/5] Testing SSH connectivity..."
ssh -p "${SERVER_PORT}" -o BatchMode=yes -o ConnectTimeout=8 "${SERVER_USER}@${SERVER_HOST}" "echo Connected"

echo ""
echo "[2/5] Creating remote destination directory..."
ssh -p "${SERVER_PORT}" "${SERVER_USER}@${SERVER_HOST}" "mkdir -p ${REMOTE_DIR}"

echo ""
echo "[3/5] Streaming project archive to remote server..."
tar --exclude="node_modules" \
    --exclude=".git" \
    --exclude="dist" \
    --exclude=".cache" \
    --exclude=".env" \
    --exclude="*.log" \
    -czf - . | ssh -p "${SERVER_PORT}" "${SERVER_USER}@${SERVER_HOST}" "tar -xzf - -C ${REMOTE_DIR}"

echo "Files successfully synced."

echo ""
echo "[4/5] Synchronizing production environment secrets..."
if [ -f ".env.production" ]; then
    scp -P "${SERVER_PORT}" .env.production "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/.env"
    echo "Transferred .env.production as .env on remote server."
else
    echo "Notice: Local .env.production not found. Remote .env retained."
fi

echo ""
echo "[5/5] Building & Launching Docker containers on server..."
ssh -p "${SERVER_PORT}" "${SERVER_USER}@${SERVER_HOST}" "
    set -e
    cd ${REMOTE_DIR}
    echo 'Starting Docker Compose build...'
    docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
    echo ''
    echo 'Container Status:'
    docker compose -f docker-compose.prod.yml ps
    echo ''
    echo 'Cleaning up dangling Docker images...'
    docker image prune -f || true
"

echo ""
echo "=========================================================="
echo " Deployment Complete!"
echo " Edge URL: https://reported-engwithme.trkhoang.com"
echo "=========================================================="
