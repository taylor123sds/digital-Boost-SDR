#!/bin/bash
#
# ORBION SDR Agent - Nginx + SSL Setup
# Execute apos o deploy-hetzner.sh
#
# Uso:
#   DOMAIN=seudominio.com bash scripts/setup-nginx.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "=============================================="
echo "   ORBION - Nginx + SSL Setup"
echo "=============================================="
echo -e "${NC}"

# Configuration
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
APP_PORT=3001

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check root
if [ "$EUID" -ne 0 ]; then
    log_error "Execute como root: sudo bash setup-nginx.sh"
    exit 1
fi

# Check domain
if [ -z "$DOMAIN" ]; then
    log_error "DOMAIN nao configurado!"
    echo "Uso: DOMAIN=seudominio.com bash setup-nginx.sh"
    exit 1
fi

log_info "Configurando Nginx para: ${DOMAIN}"

# Step 1: Install Nginx
log_info "Instalando Nginx..."
apt-get update
apt-get install -y nginx

# Step 2: Install Certbot
log_info "Instalando Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Step 3: Create Nginx configuration
log_info "Criando configuracao Nginx..."

cat > /etc/nginx/sites-available/orbion << NGINXEOF
# ORBION SDR Agent - Nginx Configuration
# Domain: ${DOMAIN}

# Rate limiting zone
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream para o Node.js
upstream orbion_backend {
    server 127.0.0.1:${APP_PORT};
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL Configuration (will be configured by Certbot)
    # ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Logging
    access_log /var/log/nginx/orbion_access.log;
    error_log /var/log/nginx/orbion_error.log;

    # Max body size (for file uploads)
    client_max_body_size 50M;

    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://orbion_backend;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Webhook endpoints (no rate limit for Evolution API callbacks)
    location /webhook/ {
        proxy_pass http://orbion_backend;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files and dashboard
    location / {
        proxy_pass http://orbion_backend;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            proxy_pass http://orbion_backend;
            expires 7d;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://orbion_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }
}
NGINXEOF

# Step 4: Enable site
log_info "Ativando site..."
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/orbion /etc/nginx/sites-enabled/

# Step 5: Test Nginx configuration
log_info "Testando configuracao..."
nginx -t

# Step 6: Reload Nginx
log_info "Recarregando Nginx..."
systemctl reload nginx
systemctl enable nginx

# Step 7: Obtain SSL certificate
log_info "Obtendo certificado SSL..."
log_warn "Certifique-se que o DNS de ${DOMAIN} aponta para este servidor!"
echo ""
read -p "DNS configurado? (y/n): " dns_ready

if [ "$dns_ready" = "y" ] || [ "$dns_ready" = "Y" ]; then
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email ${EMAIL} --redirect
    log_success "Certificado SSL instalado!"
else
    log_warn "Executando sem SSL por enquanto..."
    log_warn "Execute depois: certbot --nginx -d ${DOMAIN}"
fi

# Step 8: Setup auto-renewal
log_info "Configurando renovacao automatica..."
systemctl enable certbot.timer
systemctl start certbot.timer

# Step 9: Update .env with domain
if [ -f "/opt/orbion/.env" ]; then
    log_info "Atualizando ALLOWED_ORIGINS..."
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}|" /opt/orbion/.env

    # Restart app to pick up new config
    cd /opt/orbion && pm2 restart orbion-sdr
fi

# Done
echo ""
echo -e "${GREEN}=============================================="
echo "   Setup Concluido!"
echo "==============================================${NC}"
echo ""
echo "Seu site esta disponivel em:"
echo "  https://${DOMAIN}"
echo ""
echo "Comandos uteis:"
echo "  nginx -t                 - Testar configuracao"
echo "  systemctl reload nginx   - Recarregar Nginx"
echo "  certbot renew --dry-run  - Testar renovacao SSL"
echo "  tail -f /var/log/nginx/orbion_error.log - Ver erros"
echo ""
