#!/bin/bash
#
# ORBION SDR Agent - Hetzner VPS Deployment Script
# Execute este script no seu VPS Hetzner (Ubuntu 22.04+)
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/SEU_REPO/main/scripts/deploy-hetzner.sh | bash
#   ou
#   scp scripts/deploy-hetzner.sh root@SEU_IP:/tmp/ && ssh root@SEU_IP "bash /tmp/deploy-hetzner.sh"
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=============================================="
echo "   ORBION SDR Agent - Hetzner Deployment"
echo "=============================================="
echo -e "${NC}"

# Configuration
APP_USER="orbion"
APP_DIR="/opt/orbion"
REPO_URL="${REPO_URL:-https://github.com/SEU_USUARIO/agent-js-starter.git}"
BRANCH="${BRANCH:-main}"
NODE_VERSION="20"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Execute este script como root: sudo bash deploy-hetzner.sh"
    exit 1
fi

# Step 1: Update system
log_info "Atualizando sistema..."
apt-get update && apt-get upgrade -y

# Step 2: Install essential packages
log_info "Instalando pacotes essenciais..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ufw \
    fail2ban \
    htop \
    vim \
    unzip

# Step 3: Install Node.js
log_info "Instalando Node.js ${NODE_VERSION}..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi
log_success "Node.js $(node --version) instalado"
log_success "npm $(npm --version) instalado"

# Step 4: Install PM2 globally
log_info "Instalando PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

# Step 5: Create app user
log_info "Criando usuario ${APP_USER}..."
if ! id -u ${APP_USER} > /dev/null 2>&1; then
    useradd -m -s /bin/bash ${APP_USER}
    log_success "Usuario ${APP_USER} criado"
else
    log_warn "Usuario ${APP_USER} ja existe"
fi

# Step 6: Setup firewall
log_info "Configurando firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp  # Para acesso direto durante testes
ufw --force enable
log_success "Firewall configurado"

# Step 7: Setup fail2ban
log_info "Configurando fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban
log_success "fail2ban ativo"

# Step 8: Create app directory
log_info "Criando diretorio da aplicacao..."
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/logs
mkdir -p ${APP_DIR}/backups

# Step 9: Clone repository (or ask for manual copy)
if [ -d "${APP_DIR}/.git" ]; then
    log_info "Atualizando repositorio existente..."
    cd ${APP_DIR}
    git fetch origin
    git reset --hard origin/${BRANCH}
else
    log_info "Clonando repositorio..."
    if [ "${REPO_URL}" != "https://github.com/SEU_USUARIO/agent-js-starter.git" ]; then
        git clone -b ${BRANCH} ${REPO_URL} ${APP_DIR}
    else
        log_warn "REPO_URL nao configurado. Use: REPO_URL=https://... bash deploy-hetzner.sh"
        log_warn "Ou copie os arquivos manualmente para ${APP_DIR}"

        echo ""
        echo -e "${YELLOW}Para copiar manualmente do seu Mac:${NC}"
        echo "  scp -r /path/to/agent-js-starter/* root@SEU_IP:${APP_DIR}/"
        echo ""
    fi
fi

# Step 10: Install dependencies
if [ -f "${APP_DIR}/package.json" ]; then
    log_info "Instalando dependencias..."
    cd ${APP_DIR}
    npm ci --production 2>/dev/null || npm install --production
    log_success "Dependencias instaladas"
fi

# Step 11: Create .env file template if not exists
if [ ! -f "${APP_DIR}/.env" ]; then
    log_info "Criando template .env..."
    cat > ${APP_DIR}/.env << 'ENVEOF'
# =============================================================================
# ORBION SDR Agent - Production Environment
# =============================================================================

# SERVER
PORT=3001
NODE_ENV=production

# SECURITY (REQUIRED!)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_64_BYTE_RANDOM_STRING

# CORS - Add your domain
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com

# OPENAI
OPENAI_API_KEY=sk-your-key-here
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMB_MODEL=text-embedding-3-small

# EVOLUTION API (WhatsApp)
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-key
EVOLUTION_INSTANCE=orbion

# GOOGLE (Optional)
GOOGLE_FUNIL_SHEET_ID=your-sheet-id
GOOGLE_LEADS_SHEET_ID=your-sheet-id
GOOGLE_CALENDAR_ID=primary
ENVEOF

    log_warn "IMPORTANTE: Edite ${APP_DIR}/.env com suas credenciais!"
    log_warn "  nano ${APP_DIR}/.env"
fi

# Step 12: Set permissions
log_info "Configurando permissoes..."
chown -R ${APP_USER}:${APP_USER} ${APP_DIR}
chmod 600 ${APP_DIR}/.env 2>/dev/null || true

# Step 13: Generate JWT Secret if needed
if grep -q "CHANGE_THIS" ${APP_DIR}/.env 2>/dev/null; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    sed -i "s/CHANGE_THIS_TO_A_SECURE_64_BYTE_RANDOM_STRING/${JWT_SECRET}/" ${APP_DIR}/.env
    log_success "JWT_SECRET gerado automaticamente"
fi

# Step 14: Setup PM2 to run as app user
log_info "Configurando PM2..."
cd ${APP_DIR}

# Create PM2 ecosystem if not exists
if [ ! -f "${APP_DIR}/ecosystem.config.cjs" ]; then
    cat > ${APP_DIR}/ecosystem.config.cjs << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'orbion-sdr',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    kill_timeout: 5000
  }]
};
PM2EOF
fi

# Step 15: Start application
if [ -f "${APP_DIR}/package.json" ] && [ -f "${APP_DIR}/.env" ]; then
    log_info "Iniciando aplicacao..."
    cd ${APP_DIR}

    # Stop if running
    pm2 stop orbion-sdr 2>/dev/null || true
    pm2 delete orbion-sdr 2>/dev/null || true

    # Start with PM2
    pm2 start ecosystem.config.cjs --env production
    pm2 save

    log_success "Aplicacao iniciada!"
fi

# Step 16: Show status
echo ""
echo -e "${GREEN}=============================================="
echo "   Deployment Concluido!"
echo "==============================================${NC}"
echo ""
echo "Proximos passos:"
echo ""
echo "1. Configure suas credenciais:"
echo "   nano ${APP_DIR}/.env"
echo ""
echo "2. Reinicie a aplicacao:"
echo "   cd ${APP_DIR} && pm2 restart orbion-sdr"
echo ""
echo "3. Verifique os logs:"
echo "   pm2 logs orbion-sdr"
echo ""
echo "4. Acesse a aplicacao:"
echo "   http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "5. (Opcional) Configure Nginx + SSL:"
echo "   bash ${APP_DIR}/scripts/setup-nginx.sh"
echo ""
echo "Comandos uteis:"
echo "  pm2 status        - Ver status"
echo "  pm2 logs          - Ver logs em tempo real"
echo "  pm2 restart all   - Reiniciar"
echo "  pm2 monit         - Monitor interativo"
echo ""
