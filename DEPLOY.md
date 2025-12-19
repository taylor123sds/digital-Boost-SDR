# LEADLY SDR Agent - Deploy para Hetzner

## Status de Prontidao

| Item | Status | Notas |
|------|--------|-------|
| Dockerfile | OK | Node 20 Alpine com FFmpeg |
| docker-compose.yml | OK | 4 servicos: Postgres, Redis, Evolution, LEADLY |
| .env.production.example | OK | Template de producao |
| .dockerignore | OK | Exclui arquivos sensiveis |
| .gitignore | OK | Protege credenciais |
| API Health | OK | 223 rotas funcionando |
| Autenticacao JWT | OK | Login funcionando |
| Automacoes | OK | Cadence + Prospecting configurados |

---

## Arquitetura de Deploy

```
Hetzner VPS (CX21 recomendado: 2 vCPU, 4GB RAM)
    |
    +-- Docker Compose
         |
         +-- postgres (PostgreSQL 15)
         +-- redis (Redis 7)
         +-- evolution-api (WhatsApp)
         +-- leadly (AI Agent) <-- Porta 3001
```

---

## Passo a Passo para Deploy

### 1. Preparar o Servidor Hetzner

```bash
# Conectar via SSH
ssh root@SEU_IP_HETZNER

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y

# Criar diretorio do projeto
mkdir -p /opt/leadly
cd /opt/leadly
```

### 2. Transferir Arquivos

```bash
# No seu Mac, execute:
cd ~/Desktop/agent-js-starter

# Transferir projeto (excluindo node_modules e .env)
rsync -avz --exclude 'node_modules' --exclude '.env' --exclude '*.db' \
  --exclude 'uploads/*' --exclude 'logs/*' --exclude 'backups/*' \
  ./ root@SEU_IP_HETZNER:/opt/leadly/
```

### 3. Configurar Variaveis de Ambiente

```bash
# No servidor Hetzner
cd /opt/leadly

# Copiar template de producao
cp .env.production.example .env

# Editar com suas credenciais REAIS
nano .env
```

**IMPORTANTE: Substitua TODOS os valores `CHANGE_ME`:**

- `JWT_SECRET` - Gere com: `openssl rand -hex 64`
- `OPENAI_API_KEY` - Sua chave da OpenAI
- `EVOLUTION_API_KEY` - Chave segura para Evolution
- `POSTGRES_PASSWORD` - Senha forte para PostgreSQL
- `REDIS_PASSWORD` - Senha forte para Redis
- `GOOGLE_LEADS_SHEET_ID` - ID da sua planilha
- `EMAIL_PASSWORD` - App Password do Gmail
- `ALLOWED_ORIGINS` - Seu dominio real

### 4. Transferir Credenciais Google

```bash
# No seu Mac:
scp ~/Desktop/agent-js-starter/google_credentials.json root@SEU_IP:/opt/leadly/
scp ~/Desktop/agent-js-starter/google_token.json root@SEU_IP:/opt/leadly/
```

### 5. Iniciar os Servicos

```bash
# No servidor Hetzner
cd /opt/leadly

# Build e start
docker compose up -d --build

# Verificar logs
docker compose logs -f leadly

# Verificar saude
curl http://localhost:3001/api/health
```

### 6. Configurar Nginx + SSL (Recomendado)

```bash
apt install nginx certbot python3-certbot-nginx -y

# Criar config
cat > /etc/nginx/sites-available/leadly << 'EOF'
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/leadly /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL com Let's Encrypt
certbot --nginx -d seu-dominio.com
```

### 7. Configurar Webhook no Evolution API

Apos o deploy, configure o webhook no Evolution:

```bash
curl -X POST "http://SEU_IP:8080/webhook/set/digitalboost" \
  -H "apikey: SUA_EVOLUTION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seu-dominio.com/api/webhook/evolution",
    "enabled": true,
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "QRCODE_UPDATED",
      "CONNECTION_UPDATE"
    ]
  }'
```

---

## Comandos Uteis

```bash
# Ver status dos containers
docker compose ps

# Reiniciar um servico
docker compose restart leadly

# Ver logs em tempo real
docker compose logs -f leadly

# Parar tudo
docker compose down

# Atualizar apos mudancas
git pull
docker compose up -d --build

# Backup do banco
docker compose exec leadly cp /app/orbion.db /app/backups/orbion_$(date +%Y%m%d).db
```

---

## Checklist Pre-Deploy

- [ ] Copiar `.env.production.example` para `.env`
- [ ] Preencher TODAS as variaveis de ambiente
- [ ] Transferir `google_credentials.json`
- [ ] Transferir `google_token.json`
- [ ] Configurar DNS apontando para o servidor
- [ ] Testar conexao com Evolution API
- [ ] Testar login no dashboard
- [ ] Configurar webhook do WhatsApp
- [ ] Ativar SSL com Certbot

---

## Monitoramento

### Health Check
```bash
curl https://seu-dominio.com/api/health
```

### Metricas
```bash
curl https://seu-dominio.com/api/metrics/dashboard
```

### Logs
```bash
docker compose logs -f --tail 100 leadly
```

---

## Troubleshooting

### Container nao inicia
```bash
docker compose logs leadly
# Verifique se .env esta correto
```

### Erro de conexao com Evolution
```bash
# Verificar se Evolution esta rodando
docker compose ps evolution-api
docker compose logs evolution-api
```

### WhatsApp nao recebe mensagens
```bash
# Verificar webhook
curl https://seu-dominio.com/api/whatsapp/status
```

### Database corrompido
```bash
# Restaurar backup
docker compose exec leadly cp /app/backups/orbion_YYYYMMDD.db /app/orbion.db
docker compose restart leadly
```

---

## Custos Estimados

| Recurso | Custo Mensal |
|---------|-------------|
| Hetzner CX21 | EUR 5.77 |
| Dominio .com | ~USD 1/mes |
| OpenAI API | ~USD 5-20 (depende do uso) |
| **Total** | ~USD 15-30/mes |
