#!/bin/bash

# Script para testar fluxo BANT completo
# Vai simular uma conversa do início ao fim e verificar se o ORBION segue o fluxo correto

CONTACT_ID="teste_bant_$(date +%s)"
API_URL="http://localhost:3001/api/chat"

echo "======================================================"
echo "🧪 TESTE DO FLUXO BANT COMPLETO"
echo "======================================================"
echo "Contact ID: $CONTACT_ID"
echo ""

# Função para enviar mensagem e extrair resposta
send_message() {
    local message="$1"
    local step="$2"

    echo "---------------------------------------------------"
    echo "📤 $step"
    echo "USER: $message"
    echo ""

    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"$message\",\"contactId\":\"$CONTACT_ID\",\"platform\":\"whatsapp\"}")

    # Extrair apenas a resposta do ORBION
    orbion_response=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('response', 'ERRO: ' + data.get('message', 'Sem resposta')))" 2>/dev/null || echo "ERRO AO PROCESSAR RESPOSTA")

    echo "🤖 ORBION: $orbion_response"
    echo ""

    # Aguardar um pouco antes da próxima mensagem
    sleep 2
}

# ========== TESTE DO FLUXO BANT ==========

# 1. OPENING - Primeira mensagem
send_message "Olá" "1️⃣ OPENING - Saudação inicial"

# 2. Resposta positiva para OPENING (deve avançar para BUDGET)
send_message "Sim, faz sentido" "2️⃣ OPENING - Demonstrando interesse"

# 3. Resposta BUDGET (deve avançar para AUTHORITY)
send_message "Gastamos cerca de R\$ 8 mil por mês com atendimento" "3️⃣ BUDGET - Informando orçamento"

# 4. Resposta AUTHORITY (deve avançar para NEED)
send_message "Eu analiso junto com o diretor comercial" "4️⃣ AUTHORITY - Informando decisores"

# 5. Resposta NEED (deve avançar para TIMING)
send_message "O maior problema é perder leads por demora no atendimento" "5️⃣ NEED - Informando dor principal"

# 6. Resposta TIMING (deve avançar para CLOSING)
send_message "Precisamos resolver isso ainda neste mês, antes da Black Friday" "6️⃣ TIMING - Informando urgência"

echo "======================================================"
echo "✅ TESTE COMPLETO!"
echo "======================================================"
echo ""
echo "🔍 VERIFICAÇÕES:"
echo "1. Mensagem 1 (OPENING) deve perguntar sobre problema/IA"
echo "2. Mensagem 2 (BUDGET) deve perguntar quanto gastam"
echo "3. Mensagem 3 (AUTHORITY) deve perguntar quem participa da decisão"
echo "4. Mensagem 4 (NEED) deve perguntar sobre desafios"
echo "5. Mensagem 5 (TIMING) deve perguntar sobre prazo"
echo "6. Mensagem 6 (CLOSING) deve fazer resumo BANT + propor reunião"
echo ""
