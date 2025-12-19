#!/bin/bash
# rollback-webhook-refactoring.sh
# Script para reverter para webhook handler antigo

set -e

echo "🔙 ====================================="
echo "🔙  ORBION Webhook Refactoring"
echo "🔙  Rollback para Versão Anterior"
echo "🔙 ====================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running from project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script da raiz do projeto${NC}"
    exit 1
fi

# Check if OLD file exists
if [ ! -f "src/api/routes/webhook.routes.OLD.js" ]; then
    echo -e "${RED}❌ Erro: Arquivo OLD não encontrado. Nada para reverter.${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  ATENÇÃO: Este script irá reverter para a versão ANTIGA do webhook handler.${NC}"
echo -e "${YELLOW}   Todas as melhorias serão desfeitas.${NC}"
echo ""
read -p "Tem certeza que deseja continuar? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Rollback cancelado${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}📋 Etapa 1: Parando servidor...${NC}"
if pgrep -f "node src/server.js" > /dev/null; then
    pkill -f "node src/server.js" || true
    sleep 2
    echo -e "${GREEN}✅ Servidor parado${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Etapa 2: Salvando versão refatorada...${NC}"
if [ -f "src/api/routes/webhook.routes.js" ]; then
    mv src/api/routes/webhook.routes.js \
       src/api/routes/webhook.routes.REFACTORED.js
    echo -e "${GREEN}✅ Versão refatorada salva como webhook.routes.REFACTORED.js${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Etapa 3: Restaurando versão antiga...${NC}"
mv src/api/routes/webhook.routes.OLD.js \
   src/api/routes/webhook.routes.js
echo -e "${GREEN}✅ Versão antiga restaurada${NC}"

echo ""
echo -e "${GREEN}✅ ====================================="
echo -e "✅  ROLLBACK COMPLETO!"
echo -e "✅ =====================================${NC}"
echo ""
echo "📊 Próximos passos:"
echo "  1. Inicie o servidor: npm start"
echo "  2. Verifique se sistema está funcionando"
echo ""
echo "💡 A versão refatorada foi salva em:"
echo "   src/api/routes/webhook.routes.REFACTORED.js"
echo ""
