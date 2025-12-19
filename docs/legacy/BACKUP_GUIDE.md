# 🔒 Guia de Backup do Banco de Dados ORBION

## 📋 Visão Geral

Sistema de backup automático para o banco de dados `orbion.db`, garantindo a segurança dos dados de conversas, leads e configurações do agente.

---

## 🚀 Comandos Disponíveis

### Criar Backup
```bash
npm run backup
```

**O que faz:**
- Cria uma cópia do `orbion.db` no diretório `/backups`
- Nome do arquivo: `orbion_YYYY-MM-DD_HH-MM-SS.db`
- Remove backups antigos (mantém últimos 30)

**Saída esperada:**
```
✅ [BACKUP] Backup criado com sucesso!
   📁 Arquivo: orbion_2025-10-21_14-12-50.db
   📊 Tamanho: 0.75 MB
   📍 Local: /Users/.../backups/orbion_2025-10-21_14-12-50.db
```

---

### Listar Backups
```bash
npm run backup:list
```

**O que faz:**
- Lista todos os backups disponíveis
- Mostra data, hora e tamanho de cada backup
- Ordenado do mais recente para o mais antigo

**Saída esperada:**
```
📋 [LIST] Backups disponíveis:

   1. orbion_2025-10-21_14-12-50.db
      📅 21/10/2025, 14:12:50
      📊 0.75 MB
```

---

### Restaurar Backup
```bash
npm run backup:restore orbion_2025-10-21_14-12-50.db
```

**O que faz:**
- Restaura um backup específico
- **IMPORTANTE:** Cria backup de segurança do banco atual antes de restaurar (`orbion.db.before_restore`)
- Sobrescreve o `orbion.db` atual

**Exemplo:**
```bash
# 1. Listar backups disponíveis
npm run backup:list

# 2. Restaurar o backup desejado
npm run backup:restore orbion_2025-10-21_14-12-50.db
```

**Saída esperada:**
```
🔄 [RESTORE] Restaurando backup: orbion_2025-10-21_14-12-50.db
   💾 Backup de segurança criado: /path/to/orbion.db.before_restore
✅ [RESTORE] Backup restaurado com sucesso!
```

---

## ⚙️ Configurações

**Arquivo:** `scripts/backup_database.js`

```javascript
const DB_PATH = 'orbion.db';              // Banco principal
const BACKUP_DIR = 'backups/';            // Diretório de backups
const MAX_BACKUPS = 30;                   // Máximo de backups mantidos
```

---

## 🤖 Automação com Cron

### Backup Diário (3h da manhã)

**Linux/macOS:**
```bash
crontab -e
```

Adicione:
```bash
0 3 * * * cd /caminho/para/agent-js-starter && npm run backup >> /tmp/orbion-backup.log 2>&1
```

**Explicação:**
- `0 3 * * *` = Todo dia às 3h
- `>> /tmp/orbion-backup.log` = Salva logs

---

### Backup a cada 6 horas

```bash
0 */6 * * * cd /caminho/para/agent-js-starter && npm run backup >> /tmp/orbion-backup.log 2>&1
```

**Horários:** 00:00, 06:00, 12:00, 18:00

---

### Backup via systemd (Linux)

**Arquivo:** `/etc/systemd/system/orbion-backup.service`
```ini
[Unit]
Description=ORBION Database Backup
After=network.target

[Service]
Type=oneshot
User=seu_usuario
WorkingDirectory=/caminho/para/agent-js-starter
ExecStart=/usr/bin/npm run backup
StandardOutput=journal
StandardError=journal
```

**Arquivo:** `/etc/systemd/system/orbion-backup.timer`
```ini
[Unit]
Description=Run ORBION backup daily at 3AM

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

**Ativar:**
```bash
sudo systemctl enable orbion-backup.timer
sudo systemctl start orbion-backup.timer
sudo systemctl status orbion-backup.timer
```

---

## 📂 Estrutura de Diretórios

```
agent-js-starter/
├── orbion.db                          # Banco principal
├── backups/                           # Diretório de backups (auto-criado)
│   ├── orbion_2025-10-21_03-00-00.db
│   ├── orbion_2025-10-21_09-00-00.db
│   ├── orbion_2025-10-21_14-12-50.db
│   └── ...                            # (máximo 30 backups)
└── scripts/
    └── backup_database.js             # Script de backup
```

---

## 🔐 Segurança

### Proteção do Diretório de Backups

**Linux/macOS:**
```bash
chmod 700 backups/
```

Apenas o dono pode ler/escrever/executar.

---

### Backup Externo (Recomendado)

**Copiar backups para servidor remoto:**
```bash
rsync -avz backups/ usuario@servidor:/backups/orbion/
```

**Automação (adicionar ao cron após backup):**
```bash
0 4 * * * cd /caminho/para/agent-js-starter && npm run backup && rsync -avz backups/ usuario@servidor:/backups/orbion/
```

---

### Backup em Cloud

**AWS S3:**
```bash
npm install aws-sdk
```

Modificar `scripts/backup_database.js` para incluir upload S3.

**Google Cloud Storage:**
```bash
npm install @google-cloud/storage
```

---

## 🚨 Recuperação de Desastres

### Cenário 1: Banco Corrompido

```bash
# 1. Verificar integridade
sqlite3 orbion.db "PRAGMA integrity_check;"

# 2. Se corrompido, restaurar último backup
npm run backup:list
npm run backup:restore orbion_2025-10-21_14-12-50.db

# 3. Reiniciar servidor
npm restart
```

---

### Cenário 2: Dados Perdidos

```bash
# 1. Listar backups
npm run backup:list

# 2. Identificar backup anterior à perda
# (ex: perda ocorreu às 15h, usar backup das 14h)

# 3. Restaurar
npm run backup:restore orbion_2025-10-21_14-00-00.db
```

---

### Cenário 3: Migração de Servidor

```bash
# SERVIDOR ANTIGO:
npm run backup

# Copiar arquivo de backup para novo servidor
scp backups/orbion_2025-10-21_14-12-50.db usuario@novo_servidor:/caminho/

# NOVO SERVIDOR:
npm run backup:restore orbion_2025-10-21_14-12-50.db
```

---

## 📊 Monitoramento

### Verificar Último Backup

```bash
ls -lht backups/ | head -5
```

**Saída esperada:**
```
-rw-r--r--  1 user  staff   750K Oct 21 14:12 orbion_2025-10-21_14-12-50.db
-rw-r--r--  1 user  staff   748K Oct 21 09:00 orbion_2025-10-21_09-00-00.db
```

---

### Alertas de Backup Faltando

**Script de monitoramento (opcional):**
```bash
#!/bin/bash
# check_backup.sh

LAST_BACKUP=$(ls -t backups/*.db | head -1)
AGE=$(stat -f %m "$LAST_BACKUP")
NOW=$(date +%s)
DIFF=$((NOW - AGE))
MAX_AGE=$((24 * 60 * 60))  # 24 horas

if [ $DIFF -gt $MAX_AGE ]; then
  echo "⚠️ ALERTA: Último backup há mais de 24h!"
  # Enviar notificação (email, Slack, etc)
fi
```

---

## ✅ Checklist de Backup

- [ ] Backup automático configurado (cron/systemd)
- [ ] Backups sendo criados diariamente
- [ ] Diretório `/backups` protegido (chmod 700)
- [ ] Backups copiados para local externo/cloud
- [ ] Teste de restauração realizado
- [ ] Monitoramento de backups ativo
- [ ] Plano de recuperação documentado

---

## 🧪 Testes

### Testar Backup e Restore

```bash
# 1. Criar backup
npm run backup

# 2. Modificar banco (inserir dado de teste)
sqlite3 orbion.db "INSERT INTO memory (key, value) VALUES ('test', 'backup_test');"

# 3. Restaurar backup
npm run backup:restore orbion_2025-10-21_14-12-50.db

# 4. Verificar se dado de teste foi removido
sqlite3 orbion.db "SELECT * FROM memory WHERE key='test';"
# Deve retornar vazio (dado foi removido pelo restore)
```

---

## 📞 Suporte

**Problemas com backup?**
1. Verificar permissões do diretório `/backups`
2. Verificar espaço em disco: `df -h`
3. Verificar logs: `npm run backup 2>&1 | tee backup.log`

**Erro: "Banco de dados não encontrado"**
- Verificar se `orbion.db` existe
- Verificar caminho no script: `scripts/backup_database.js`

**Erro: "Backup não encontrado"**
- Rodar `npm run backup:list` para ver backups disponíveis
- Verificar nome do arquivo (case-sensitive)

---

**Data:** 2025-10-21
**Versão:** 1.0
**Gerado por:** Claude Code Implementation
