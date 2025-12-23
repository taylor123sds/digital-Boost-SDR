#!/bin/bash
# =============================================================================
# LEADLY SDR Agent - Deploy Script
# =============================================================================
#
# Uso:
#   ./scripts/deploy.sh <version>
#
# Exemplo:
#   ./scripts/deploy.sh sha-abc1234
#   ./scripts/deploy.sh v2.3.0
#
# O script faz:
#   0. Sync docker-compose.prod.yml do repo (previne drift)
#   1. Pull da imagem do registry
#   2. Backup do database
#   3. Executa migrations (fail-fast)
#   4. Restart dos containers
#   5. Verifica health check
#
# =============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="${DEPLOY_DIR:-/opt/orbion}"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${DEPLOY_DIR}/backups"
DATA_DIR="${DEPLOY_DIR}/data"
DATABASE_FILE="${DATA_DIR}/orbion.db"

# GitHub repo configuration for syncing compose file
# This ensures docker-compose.prod.yml stays in sync with the deployed version
# and prevents configuration drift between repo and VPS
GITHUB_REPO="taylor123sds/digital-Boost-SDR"
COMPOSE_RAW_URL="https://raw.githubusercontent.com/${GITHUB_REPO}"
COMPOSE_FILENAME="docker-compose.prod.yml"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check arguments
if [ -z "$1" ]; then
    log_error "Version required!"
    echo ""
    echo "Usage: $0 <version>"
    echo "Example: $0 sha-abc1234"
    echo "         $0 v2.3.0"
    exit 1
fi

APP_VERSION="$1"

if [ "${APP_VERSION}" = "latest" ]; then
    log_error "Refusing to deploy 'latest'. Use a commit SHA tag."
    exit 1
fi
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo ""
echo "============================================="
echo " LEADLY SDR Agent - Production Deploy"
echo "============================================="
echo " Version: ${APP_VERSION}"
echo " Time: ${BUILD_TIME}"
echo " Dir: ${DEPLOY_DIR}"
echo "============================================="
echo ""

# Check if compose file exists
if [ ! -f "${COMPOSE_FILE}" ]; then
    log_error "Compose file not found: ${COMPOSE_FILE}"
    exit 1
fi

cd "${DEPLOY_DIR}"

# =============================================================================
# STEP 0: Sync docker-compose.prod.yml from repo (prevents config drift)
# =============================================================================
log_info "Step 0/6: Syncing compose file from repo..."

COMPOSE_URL="${COMPOSE_RAW_URL}/${APP_VERSION}/${COMPOSE_FILENAME}"
COMPOSE_TMP="${DEPLOY_DIR}/.compose-download-tmp"
COMPOSE_BACKUP="${COMPOSE_FILE}.bak-$(date +%Y%m%d-%H%M%S)"

# Build curl command (add auth header if GITHUB_TOKEN is set)
CURL_OPTS="-fsSL --connect-timeout 10 --max-time 30"
if [ -n "${GITHUB_TOKEN}" ]; then
    CURL_OPTS="${CURL_OPTS} -H \"Authorization: token ${GITHUB_TOKEN}\""
fi

# Download to temp file
if curl ${CURL_OPTS} -o "${COMPOSE_TMP}" "${COMPOSE_URL}" 2>/dev/null; then
    # Validate file is not empty and contains expected content
    if [ -s "${COMPOSE_TMP}" ] && grep -q "leadly:" "${COMPOSE_TMP}"; then
        # Backup current compose file
        if [ -f "${COMPOSE_FILE}" ]; then
            cp "${COMPOSE_FILE}" "${COMPOSE_BACKUP}"
            log_info "Compose backup: ${COMPOSE_BACKUP}"
        fi
        # Replace with downloaded version
        mv "${COMPOSE_TMP}" "${COMPOSE_FILE}"
        log_success "Compose file synced from ${APP_VERSION}"
    else
        log_warn "Downloaded compose file appears invalid, keeping current version"
        rm -f "${COMPOSE_TMP}"
    fi
else
    log_warn "Failed to download compose file from repo (continuing with current version)"
    log_warn "URL attempted: ${COMPOSE_URL}"
    rm -f "${COMPOSE_TMP}"
fi

# Keep only last 5 compose backups
ls -t "${COMPOSE_FILE}".bak-* 2>/dev/null | tail -n +6 | xargs -r rm -f

# =============================================================================
# STEP 1: Pull new image
# =============================================================================
log_info "Step 1/6: Pulling new image..."

export APP_VERSION
export BUILD_TIME
export GIT_COMMIT="${APP_VERSION}"
export GIT_BRANCH="main"
export IMAGE_TAG="${APP_VERSION}"

docker compose -f "${COMPOSE_FILE}" pull leadly leadly-worker || {
    log_error "Failed to pull images!"
    exit 1
}
log_success "Images pulled successfully"

# =============================================================================
# STEP 2: Backup database
# =============================================================================
log_info "Step 2/6: Backing up database..."

mkdir -p "${BACKUP_DIR}"
BACKUP_FILE="${BACKUP_DIR}/orbion_$(date +%Y%m%d_%H%M%S).db"

if [ -f "${DATABASE_FILE}" ]; then
    cp "${DATABASE_FILE}" "${BACKUP_FILE}"
    log_success "Database backed up to: ${BACKUP_FILE}"
else
    log_warn "No database found at ${DATABASE_FILE} - skipping backup"
fi

# Keep only last 10 backups
log_info "Cleaning old backups..."
ls -t "${BACKUP_DIR}"/orbion_*.db 2>/dev/null | tail -n +11 | xargs -r rm -f
log_success "Backup cleanup complete"

# =============================================================================
# STEP 3: Run migrations (BEFORE starting containers)
# =============================================================================
log_info "Step 3/6: Running migrations..."

# Run migrations in a temporary container
docker compose -f "${COMPOSE_FILE}" run --rm \
    -e DATABASE_PATH=/app/data/orbion.db \
    leadly node src/db/migrate.js || {
    log_error "Migration failed! Aborting deploy."
    log_info "Restoring backup..."
    if [ -f "${BACKUP_FILE}" ]; then
        cp "${BACKUP_FILE}" "${DATABASE_FILE}"
        log_success "Database restored from backup"
    fi
    exit 1
}
log_success "Migrations completed successfully"

# Verify schema after migrations (drift detection)
log_info "Verifying schema (drift detection)..."
docker compose -f "${COMPOSE_FILE}" run --rm \
    -e DATABASE_PATH=/app/data/orbion.db \
    -e NODE_ENV=production \
    leadly node -e "
      import { detectSchemaDrift } from './src/db/migrate.js';
      const result = detectSchemaDrift();
      if (result.hasDrift) {
        console.error('DRIFT DETECTED:', result.issues);
        process.exit(1);
      }
      console.log('No schema drift detected');
      process.exit(0);
    " || {
    log_error "Schema drift detected after migrations!"
    log_error "This should not happen. Check migration files."
    exit 1
}
log_success "Schema verified (no drift)"

# =============================================================================
# STEP 4: Restart containers
# =============================================================================
log_info "Step 4/6: Restarting containers..."

docker compose -f "${COMPOSE_FILE}" up -d leadly leadly-worker || {
    log_error "Failed to start containers!"
    exit 1
}
log_success "Containers started"

# Wait for containers to be ready
log_info "Waiting for containers to start (15s)..."
sleep 15

# =============================================================================
# STEP 5: Health check
# =============================================================================
log_info "Step 5/6: Running health check..."

MAX_RETRIES=10
RETRY_DELAY=3
HEALTH_URL="http://localhost:3001/api/health"

for i in $(seq 1 $MAX_RETRIES); do
    RESPONSE=$(curl -s "${HEALTH_URL}" 2>/dev/null || echo "")

    if echo "${RESPONSE}" | grep -q '"status":"healthy"'; then
        log_success "Health check passed!"
        echo ""
        echo "============================================="
        echo " Deploy completed successfully!"
        echo "============================================="
        echo " Version: ${APP_VERSION}"
        echo " API: ${HEALTH_URL}"
        echo " Status: $(echo ${RESPONSE} | jq -r '.status' 2>/dev/null || echo 'ok')"
        echo "============================================="
        echo ""

        # Show container status
        docker compose -f "${COMPOSE_FILE}" ps
        exit 0
    fi

    log_warn "Health check failed (attempt ${i}/${MAX_RETRIES}), retrying in ${RETRY_DELAY}s..."
    sleep "${RETRY_DELAY}"
done

log_error "Health check failed after ${MAX_RETRIES} attempts!"
log_info "Container logs:"
docker compose -f "${COMPOSE_FILE}" logs --tail=50 leadly

exit 1
