# 🚀 GUIA COMPLETO DE DEPLOY DO ORBION EM VPS

## 📋 Índice
1. [Requisitos](#requisitos)
2. [Preparação da VPS](#preparação-da-vps)
3. [Instalação de Dependências](#instalação-de-dependências)
4. [Configuração do Projeto](#configuração-do-projeto)
5. [Configuração do PM2](#configuração-do-pm2)
6. [Nginx Reverse Proxy](#nginx-reverse-proxy)
7. [SSL/HTTPS com Let's Encrypt](#ssl-com-lets-encrypt)
8. [Variáveis de Ambiente](#variáveis-de-ambiente)
9. [Monitoramento e Logs](#monitoramento-e-logs)
10. [Troubleshooting](#troubleshooting)

---

## 1. Requisitos

### VPS Recomendada:
- **CPU:** 2 cores mínimo (4 cores recomendado)
- **RAM:** 4GB mínimo (8GB recomendado)
- **Armazenamento:** 40GB SSD
- **SO:** Ubuntu 22.04 LTS (recomendado) ou Ubuntu 20.04 LTS
- **Largura de banda:** Ilimitada ou mínimo 1TB/mês

### Provedores Recomendados:
- DigitalOcean (Droplet $24/mês - 4GB RAM)
- Linode (Nanode $12/mês - 2GB RAM)
- Vultr (Cloud Compute $12/mês - 2GB RAM)
- AWS EC2 (t3.medium)
- Google Cloud Platform (e2-medium)
- Contabo (VPS M - €8.99/mês - 4GB RAM)

---

## 2. Preparação da VPS

### 2.1 Conectar na VPS via SSH
```bash
ssh root@SEU_IP_VPS
# ou
ssh seu_usuario@SEU_IP_VPS
```

### 2.2 Atualizar Sistema
```bash
# Atualizar lista de pacotes
sudo apt update

# Atualizar pacotes instalados
sudo apt upgrade -y

# Instalar utilitários essenciais
sudo apt install -y curl wget git build-essential
```

### 2.3 Criar Usuário para Deploy (Segurança)
```bash
# Criar usuário 'orbion'
sudo adduser orbion

# Adicionar ao grupo sudo
sudo usermod -aG sudo orbion

# Trocar para o usuário
su - orbion
```

### 2.4 Configurar Firewall
```bash
# Instalar UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP
sudo ufw allow 80/tcp

# Permitir HTTPS
sudo ufw allow 443/tcp

# Permitir porta do ORBION (3001)
sudo ufw allow 3001/tcp

# Permitir porta do Evolution API (8080)
sudo ufw allow 8080/tcp

# Ativar firewall
sudo ufw enable

# Verificar status
sudo ufw status
```

---

## 3. Instalação de Dependências

### 3.1 Instalar Node.js (v20.x)
```bash
# Instalar NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Recarregar shell
source ~/.bashrc

# Instalar Node.js 20
nvm install 20

# Definir como padrão
nvm use 20
nvm alias default 20

# Verificar instalação
node --version  # Deve mostrar v20.x.x
npm --version   # Deve mostrar v10.x.x
```

### 3.2 Instalar Docker (para Evolution API)
```bash
# Instalar dependências do Docker
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Adicionar chave GPG do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Atualizar lista de pacotes
sudo apt update

# Instalar Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker --version
docker-compose --version
```

**IMPORTANTE:** Logout e login novamente para aplicar permissões do Docker:
```bash
exit
ssh orbion@SEU_IP_VPS
```

### 3.3 Instalar PM2 (Process Manager)
```bash
npm install -g pm2

# Verificar instalação
pm2 --version
```

### 3.4 Instalar FFmpeg (para processamento de áudio)
```bash
sudo apt install -y ffmpeg

# Verificar instalação
ffmpeg -version
```

---

## 4. Configuração do Projeto

### 4.1 Clonar Repositório
```bash
# Criar diretório de projetos
mkdir -p ~/projects
cd ~/projects

# OPÇÃO 1: Clonar do Git (se tiver repositório)
git clone https://github.com/SEU_USUARIO/agent-js-starter.git orbion
cd orbion

# OPÇÃO 2: Fazer upload manual via SCP do seu computador
# No seu computador local, execute:
# scp -r /Users/taylorlpticloud.com/Desktop/agent-js-starter orbion@SEU_IP_VPS:~/projects/orbion
```

### 4.2 Instalar Dependências do Projeto
```bash
cd ~/projects/orbion

# Instalar dependências
npm install

# Verificar se instalou corretamente
npm list --depth=0
```

### 4.3 Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar arquivo .env
nano .env
```

**Configurações importantes no `.env`:**
```bash
# Porta do servidor (use 3001 em produção)
PORT=3001

# OpenAI
OPENAI_API_KEY=sua_chave_api_aqui
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMB_MODEL=text-embedding-3-small

# Evolution API
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=SUA_CHAVE_FORTE_AQUI
EVOLUTION_INSTANCE=orbion

# WhatsApp Meta Cloud API (opcional)
WA_PHONE_NUMBER_ID=
WA_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=

# Google Integrations (opcional)
GOOGLE_CREDENTIALS_FILE=./google_credentials.json
GOOGLE_TOKEN_PATH=./google_token.json
GOOGLE_REDIRECT_URI=https://seudominio.com/oauth2callback
GOOGLE_LEADS_SHEET_ID=
GOOGLE_INTERACTIONS_SHEET_ID=

# Database
DATABASE_PATH=./orbion.db

# Leads
LEADS_FILE=./data/leads.xlsx
```

Salvar: `Ctrl + O`, Enter, `Ctrl + X`

### 4.4 Criar Diretórios Necessários
```bash
# Criar diretórios
mkdir -p ~/projects/orbion/data
mkdir -p ~/projects/orbion/logs
mkdir -p ~/projects/orbion/temp

# Dar permissões
chmod 755 ~/projects/orbion/data
chmod 755 ~/projects/orbion/logs
chmod 755 ~/projects/orbion/temp
```

### 4.5 Subir Evolution API com Docker
```bash
cd ~/projects/orbion

# Verificar se docker-compose.yml existe
ls -la docker-compose.yml

# Subir containers
docker-compose up -d

# Verificar se está rodando
docker-compose ps

# Ver logs
docker-compose logs -f
```

**Aguardar 30 segundos** para Evolution API inicializar completamente.

---

## 5. Configuração do PM2

### 5.1 Criar Arquivo de Configuração PM2
```bash
cd ~/projects/orbion
nano ecosystem.config.js
```

**Conteúdo do `ecosystem.config.js`:**
```javascript
module.exports = {
  apps: [{
    name: 'orbion',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 5000
  }]
};
```

Salvar: `Ctrl + O`, Enter, `Ctrl + X`

### 5.2 Iniciar ORBION com PM2
```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs em tempo real
pm2 logs orbion

# Salvar configuração para reiniciar automaticamente
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
# Copie e execute o comando que aparecer
```

### 5.3 Comandos Úteis do PM2
```bash
# Parar aplicação
pm2 stop orbion

# Reiniciar aplicação
pm2 restart orbion

# Recarregar (zero-downtime)
pm2 reload orbion

# Ver logs
pm2 logs orbion

# Ver logs com filtro
pm2 logs orbion --lines 100

# Monitorar recursos
pm2 monit

# Listar processos
pm2 list

# Deletar processo
pm2 delete orbion

# Limpar logs
pm2 flush
```

---

## 6. Nginx Reverse Proxy

### 6.1 Instalar Nginx
```bash
sudo apt install -y nginx

# Verificar instalação
nginx -v

# Iniciar Nginx
sudo systemctl start nginx

# Habilitar no boot
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

### 6.2 Configurar Nginx para ORBION
```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/orbion
```

**Conteúdo do arquivo:**
```nginx
# Upstreams
upstream orbion_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

upstream evolution_backend {
    server 127.0.0.1:8080;
    keepalive 64;
}

# Servidor ORBION
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    # Logs
    access_log /var/log/nginx/orbion-access.log;
    error_log /var/log/nginx/orbion-error.log;

    # Limite de tamanho de upload (para arquivos e áudios)
    client_max_body_size 50M;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Proxy para ORBION
    location / {
        proxy_pass http://orbion_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy para Evolution API Manager
    location /evolution/ {
        proxy_pass http://evolution_backend/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts maiores para Evolution
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

Salvar: `Ctrl + O`, Enter, `Ctrl + X`

**IMPORTANTE:** Substitua `seudominio.com` pelo seu domínio real!

### 6.3 Ativar Configuração
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/orbion /etc/nginx/sites-enabled/

# Remover configuração default (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Se OK, recarregar Nginx
sudo systemctl reload nginx

# Verificar status
sudo systemctl status nginx
```

---

## 7. SSL com Let's Encrypt

### 7.1 Instalar Certbot
```bash
# Instalar Certbot e plugin do Nginx
sudo apt install -y certbot python3-certbot-nginx

# Verificar instalação
certbot --version
```

### 7.2 Obter Certificado SSL
```bash
# Obter certificado (substitua seudominio.com)
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Durante o processo, responda:
# 1. Email: seu@email.com
# 2. Aceitar termos: Y
# 3. Compartilhar email: N (ou Y se quiser)
# 4. Redirecionar HTTP para HTTPS: 2 (recomendado)
```

### 7.3 Renovação Automática
```bash
# Testar renovação
sudo certbot renew --dry-run

# Certbot já configura renovação automática via cron
# Verificar:
sudo systemctl status certbot.timer
```

---

## 8. Variáveis de Ambiente

### 8.1 Arquivo .env Completo para Produção
```bash
nano ~/projects/orbion/.env
```

```bash
# ============================================
# SERVIDOR
# ============================================
PORT=3001
NODE_ENV=production

# ============================================
# OPENAI
# ============================================
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXX
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMB_MODEL=text-embedding-3-small

# ============================================
# EVOLUTION API (WHATSAPP)
# ============================================
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=CHAVE_FORTE_AQUI_MIN_32_CARACTERES
EVOLUTION_INSTANCE=orbion

# ============================================
# META CLOUD API (OPCIONAL)
# ============================================
WA_PHONE_NUMBER_ID=
WA_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=

# ============================================
# GOOGLE INTEGRATIONS (OPCIONAL)
# ============================================
GOOGLE_CREDENTIALS_FILE=./google_credentials.json
GOOGLE_TOKEN_PATH=./google_token.json
GOOGLE_REDIRECT_URI=https://seudominio.com/oauth2callback
GOOGLE_LEADS_SHEET_ID=
GOOGLE_INTERACTIONS_SHEET_ID=

# ============================================
# DATABASE
# ============================================
DATABASE_PATH=./orbion.db

# ============================================
# LEADS
# ============================================
LEADS_FILE=./data/leads.xlsx

# ============================================
# LOGS
# ============================================
LOG_LEVEL=info
LOG_FILE=./logs/orbion.log
```

### 8.2 Proteger Arquivo .env
```bash
# Restringir permissões
chmod 600 ~/projects/orbion/.env

# Verificar
ls -la ~/projects/orbion/.env
```

---

## 9. Monitoramento e Logs

### 9.1 Logs do ORBION
```bash
# Ver logs PM2
pm2 logs orbion

# Ver logs específicos
pm2 logs orbion --lines 100
pm2 logs orbion --err  # Apenas erros

# Logs do aplicação
tail -f ~/projects/orbion/logs/orbion.log
```

### 9.2 Logs do Nginx
```bash
# Access logs
sudo tail -f /var/log/nginx/orbion-access.log

# Error logs
sudo tail -f /var/log/nginx/orbion-error.log
```

### 9.3 Logs do Evolution API
```bash
# Ver logs dos containers
docker-compose -f ~/projects/orbion/docker-compose.yml logs -f

# Logs apenas do Evolution
docker logs -f evolution-api
```

### 9.4 Monitoramento de Recursos
```bash
# Monitorar CPU, RAM, processos
htop

# Se não estiver instalado:
sudo apt install -y htop

# Monitorar PM2
pm2 monit

# Status do sistema
free -h              # Memória
df -h                # Disco
uptime               # Uptime e load average
```

### 9.5 Configurar Rotação de Logs
```bash
# Configurar PM2 log rotation
pm2 install pm2-logrotate

# Configurar limite de tamanho
pm2 set pm2-logrotate:max_size 50M

# Manter últimos 7 dias
pm2 set pm2-logrotate:retain 7

# Comprimir logs antigos
pm2 set pm2-logrotate:compress true
```

---

## 10. Troubleshooting

### 10.1 ORBION não inicia
```bash
# Ver logs de erro
pm2 logs orbion --err

# Verificar porta em uso
sudo lsof -i :3001

# Verificar variáveis de ambiente
cat ~/projects/orbion/.env

# Tentar iniciar manualmente para ver erros
cd ~/projects/orbion
node src/server.js
```

### 10.2 Evolution API não conecta
```bash
# Verificar containers
docker-compose ps

# Ver logs
docker-compose logs evolution-api

# Reiniciar container
docker-compose restart evolution-api

# Verificar porta
sudo lsof -i :8080
```

### 10.3 Nginx não responde
```bash
# Verificar status
sudo systemctl status nginx

# Testar configuração
sudo nginx -t

# Ver logs de erro
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 10.4 SSL não funciona
```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Ver logs do Certbot
sudo cat /var/log/letsencrypt/letsencrypt.log
```

### 10.5 Servidor sem espaço
```bash
# Verificar uso de disco
df -h

# Limpar logs antigos
sudo journalctl --vacuum-time=7d

# Limpar cache do Docker
docker system prune -a

# Limpar logs do PM2
pm2 flush
```

### 10.6 Alta CPU/RAM
```bash
# Ver processos consumindo recursos
top

# Ver processos PM2
pm2 monit

# Reiniciar ORBION
pm2 restart orbion

# Verificar memory leaks
pm2 logs orbion | grep -i "memory"
```

---

## 🎯 Checklist Final de Deploy

### Antes do Deploy:
- [ ] VPS criada e acessível via SSH
- [ ] Domínio apontando para IP da VPS (DNS configurado)
- [ ] Chaves API do OpenAI obtidas
- [ ] Firewall configurado

### Durante o Deploy:
- [ ] Node.js 20.x instalado
- [ ] Docker e Docker Compose instalados
- [ ] PM2 instalado globalmente
- [ ] FFmpeg instalado
- [ ] Projeto clonado ou enviado via SCP
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` configurado
- [ ] Evolution API rodando no Docker
- [ ] ORBION rodando no PM2
- [ ] Nginx configurado e rodando
- [ ] SSL configurado com Let's Encrypt

### Após o Deploy:
- [ ] ORBION acessível via HTTPS
- [ ] Evolution API Manager acessível em `/evolution/`
- [ ] QR Code do WhatsApp escaneado
- [ ] Webhook configurado no Evolution
- [ ] Logs funcionando corretamente
- [ ] PM2 configurado para reiniciar no boot
- [ ] Monitoramento ativo

---

## 📞 Acessos Após Deploy

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **ORBION Dashboard** | `https://seudominio.com` | Dashboard principal |
| **Evolution Manager** | `https://seudominio.com/evolution/manager` | Gerenciar instâncias WhatsApp |
| **Health Check** | `https://seudominio.com/api/health` | Status do sistema |
| **API Docs** | `https://seudominio.com/api` | Documentação da API |

---

## 🔄 Atualizar Projeto em Produção

```bash
# Conectar na VPS
ssh orbion@SEU_IP_VPS

# Ir para o diretório
cd ~/projects/orbion

# OPÇÃO 1: Pull do Git
git pull origin main

# OPÇÃO 2: Upload via SCP (do seu computador)
# scp -r /Users/taylorlpticloud.com/Desktop/agent-js-starter/* orbion@SEU_IP_VPS:~/projects/orbion/

# Instalar novas dependências (se houver)
npm install

# Reiniciar PM2
pm2 restart orbion

# Ver logs
pm2 logs orbion
```

---

## 🆘 Suporte

Se encontrar problemas durante o deploy:

1. **Verificar logs:** `pm2 logs orbion`
2. **Verificar status:** `pm2 status`
3. **Verificar Nginx:** `sudo nginx -t`
4. **Verificar Docker:** `docker-compose ps`
5. **Verificar firewall:** `sudo ufw status`

---

**Desenvolvido por:** Digital Boost
**Documentação atualizada:** 2025-10-12
