#!/bin/bash
# activate-refactored-webhook.sh
# Script para ativar webhook handler refatorado

set -e  # Exit on error

echo "🚀 ====================================="
echo "🚀  ORBION Webhook Refactoring"
echo "🚀  Ativação do Handler Refatorado"
echo "🚀 ====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script da raiz do projeto${NC}"
    exit 1
fi

# Check if refactored file exists
if [ ! -f "src/api/routes/webhook.routes.refactored.js" ]; then
    echo -e "${RED}❌ Erro: Arquivo refatorado não encontrado${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Etapa 1: Verificando backups...${NC}"
if [ -d "backups/webhook-refactor-"*/ ]; then
    BACKUP_DIR=$(ls -td backups/webhook-refactor-*/ | head -1)
    echo -e "${GREEN}✅ Backup encontrado: $BACKUP_DIR${NC}"
else
    echo -e "${RED}❌ Erro: Backup não encontrado. Execute o script de backup primeiro.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 Etapa 2: Parando servidor (se rodando)...${NC}"
if pgrep -f "node src/server.js" > /dev/null; then
    echo "🛑 Servidor detectado rodando, parando..."
    pkill -f "node src/server.js" || true
    sleep 2
    echo -e "${GREEN}✅ Servidor parado${NC}"
else
    echo "ℹ️  Servidor não estava rodando"
fi

echo ""
echo -e "${YELLOW}📋 Etapa 3: Renomeando arquivo antigo...${NC}"
if [ -f "src/api/routes/webhook.routes.js" ]; then
    mv src/api/routes/webhook.routes.js \
       src/api/routes/webhook.routes.OLD.js
    echo -e "${GREEN}✅ Arquivo antigo renomeado para webhook.routes.OLD.js${NC}"
else
    echo -e "${YELLOW}⚠️  Arquivo antigo não encontrado (já foi movido?)${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Etapa 4: Ativando arquivo refatorado...${NC}"
mv src/api/routes/webhook.routes.refactored.js \
   src/api/routes/webhook.routes.js
echo -e "${GREEN}✅ Arquivo refatorado ativado!${NC}"

echo ""
echo -e "${YELLOW}📋 Etapa 5: Verificando sintaxe...${NC}"
if node -c src/api/routes/webhook.routes.js 2>&1; then
    echo -e "${GREEN}✅ Sintaxe válida${NC}"
else
    echo -e "${RED}❌ Erro de sintaxe detectado!${NC}"
    echo -e "${YELLOW}🔄 Revertendo...${NC}"

    mv src/api/routes/webhook.routes.js \
       src/api/routes/webhook.routes.FAILED.js

    mv src/api/routes/webhook.routes.OLD.js \
       src/api/routes/webhook.routes.js

    echo -e "${RED}❌ Ativação falhou. Arquivo antigo restaurado.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📋 Etapa 6: Iniciando servidor...${NC}"
echo "Por favor, inicie o servidor manualmente com:"
echo -e "${GREEN}  npm start${NC}"
echo "ou"
echo -e "${GREEN}  node src/server.js${NC}"

echo ""
echo -e "${GREEN}✅ ====================================="
echo -e "✅  ATIVAÇÃO COMPLETA!"
echo -e "✅ =====================================${NC}"
echo ""
echo "📊 Próximos passos:"
echo "  1. Inicie o servidor"
echo "  2. Teste com webhook: curl -X POST http://localhost:3001/api/webhook/evolution"
echo "  3. Verifique health: curl http://localhost:3001/api/webhook/health"
echo "  4. Monitore logs por 24h"
echo ""
echo "🔙 Para reverter:"
echo "  ./rollback-webhook-refactoring.sh"
echo ""
