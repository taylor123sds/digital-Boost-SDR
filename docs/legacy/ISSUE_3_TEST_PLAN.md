# ISSUE #3 FIX - TEST PLAN
## "Travando no Need" - Sistema não consultativo

### Expected Flow (AFTER FIX)

```
SDR Agent → Specialist Agent (pain_discovery) → Need (specific) → Budget → Authority → Timing → Scheduler
```

### Test Scenario 1: Growth Marketing Lead

**Step 1: SDR Handoff**
- SDR detects pain: "growth_marketing"
- SDR hands off with: `painDescription: "Crescimento/Marketing/Vendas"`
- **Expected**: Specialist starts in `pain_discovery` stage

**Step 2: First Specialist Message**
```
User Message: (receives handoff)
Expected Response: Pergunta consultiva sobre DOR específica
Example: "Entendi! Pelo que você trouxe, vejo que o foco é escalar o crescimento...
Me conta uma coisa: quando você pensa em crescimento hoje, qual é a principal trava? É mais:
• Falta de visibilidade (poucos leads chegando)
• Conversão baixa (leads chegam mas não fecham)
• Custo de aquisição muito alto
• Falta de previsibilidade (não sabe quanto vai vender no mês)
Qual desses te incomoda mais?"

Verification:
- leadState.state.current === 'pain_discovery'
- leadState.painDiscoveryCompleted === false
- leadState.bant.need === null (NOT filled yet)
- leadState.bant.context === "Crescimento/Marketing/Vendas"
```

**Step 3: Lead Responds with Specific Pain**
```
User Message: "O maior problema é conversão baixa. Leads chegam mas não fecham."
Expected Response: Mensagem de transição que DEMONSTRA COMPREENSÃO da dor + pergunta sobre budget
Example: "Perfeito! **Conversão baixa** é um problema clássico — e frustrante.
Você investe tempo e dinheiro pra trazer leads, mas na hora H eles não fecham...
Me conta: como vocês costumam estruturar investimento em otimização de vendas?"

Verification:
- leadState.state.current === 'need' (advanced from pain_discovery)
- leadState.painDiscoveryCompleted === true
- leadState.painDetails.category === 'conversão'
- leadState.bant.need === "O maior problema é conversão baixa. Leads chegam mas não fecham."
- Next stage should be 'budget'
```

**Step 4: Lead Responds about Budget**
```
User Message: "No momento decidimos conforme o projeto, não temos orçamento fixo"
Expected Response: Pergunta sobre Authority
Example: "Legal! Agora me tira uma dúvida: quando vocês contratam parceiros estratégicos..."

Verification:
- leadState.state.current === 'authority'
- leadState.bant.budget === "No momento decidimos conforme o projeto, não temos orçamento fixo"
- leadState.bant.need is PRESERVED (not lost)
```

### Test Scenario 2: Sites Lead

**Step 1: SDR Handoff**
- SDR detects pain: "sites"
- SDR hands off with: `painDescription: "Site/Landing/SEO"`

**Step 2: First Specialist Message**
```
Expected Response: Consultative pain discovery question about website issues
Example: "Show! Vejo que o site é uma preocupação real...
Me ajuda a entender melhor: quando você pensa no site, qual é a dor que mais te incomoda hoje?
• Site não aparece no Google (SEO ruim)
• Site é lento e visitantes desistem
• Design não reflete a qualidade da marca
• Site não converte visitante em lead/venda
Qual desses é o problema número 1 pra vocês?"

Verification:
- Stage: pain_discovery
- No BANT fields filled yet
```

**Step 3: Lead Responds**
```
User Message: "SEO tá ruim demais, ninguém acha a gente no Google"
Expected: Transition message showing understanding + budget question

Verification:
- leadState.bant.need === "SEO tá ruim demais, ninguém acha a gente no Google"
- painDetails.category === 'seo'
- painDiscoveryCompleted === true
```

### Test Scenario 3: Verify Issue #2 Fixes Remain Intact

**Critical Verification Points:**

1. **BANT Data Persistence**
```javascript
// After each stage, verify ALL previous BANT data is preserved
leadState.bant.need // Should NOT be null after pain_discovery
leadState.bant.budget // Should NOT be null after budget stage
leadState.bant.authority // Should NOT be null after authority stage
leadState.bant.timing // Should NOT be null after timing stage
```

2. **Deep Merge Verification**
```javascript
// When updating state, nested objects should merge, not replace
// Example: If bant.need exists and we update bant.budget:
Before: { bant: { need: "X", budget: null } }
Update: { bant: { budget: "Y" } }
After:  { bant: { need: "X", budget: "Y" } } // ✅ CORRECT - need preserved
NOT:    { bant: { budget: "Y" } } // ❌ WRONG - need lost
```

3. **Stage Restoration**
```javascript
// When lead returns after interruption, stage should be restored
// Not recalculated from scratch
leadState.state.current === 'budget'
// Should remain 'budget', not jump to 'need' or 'pain_discovery'
```

### Test Scenario 4: Migration Path for Existing Leads

**For leads already in database with old flow:**

```
Lead State (Old):
- state.current: 'budget'
- painDetails: null
- bant.need: "Crescimento/Marketing/Vendas" (from SDR)

Expected Behavior:
- System detects missing painDetails
- Redirects to pain_discovery ONCE
- Sets painDiscoveryMigrated flag to prevent loop
- After pain_discovery, continues normally to budget
```

### Success Criteria

✅ **Consultative Flow**
- System asks deep pain discovery questions BEFORE jumping to BANT
- Demonstrates understanding of lead's pain before asking about money
- Build rapport through multi-layer exploration

✅ **Data Integrity**
- All BANT fields preserved across stages (Issue #2 fix intact)
- painDescription (SDR context) separated from need (specific pain)
- Deep merge works correctly for nested objects

✅ **Stage Management**
- pain_discovery comes BEFORE need in priority
- determineCurrentStage() respects painDiscoveryCompleted flag
- Stage restoration from database works correctly

✅ **No Regression**
- Issue #2 fixes remain intact
- No infinite loops
- No lost data during handoffs

### Manual Testing Commands

**Test via WhatsApp:**
1. Reset conversation: Send "resetar" to start fresh
2. Trigger SDR detection: "Preciso de ajuda com marketing"
3. Wait for SDR → Specialist handoff
4. Respond to pain_discovery question with specific pain
5. Verify transition message shows understanding
6. Continue through BANT stages
7. Verify all data preserved in each stage

**Test via API:**
```bash
# Reset lead
curl -X POST http://localhost:3000/api/reset-conversation \
  -H "Content-Type: application/json" \
  -d '{"phone": "5584999999999"}'

# Simulate SDR handoff
curl -X POST http://localhost:3000/api/test-handoff \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5584999999999",
    "agent": "specialist",
    "painType": "growth_marketing",
    "painDescription": "Crescimento/Marketing/Vendas"
  }'

# Send message
curl -X POST http://localhost:3000/api/webhook/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "key": {
        "remoteJid": "5584999999999@s.whatsapp.net"
      },
      "message": {
        "conversation": "O maior problema é conversão baixa"
      }
    }
  }'

# Check state
curl http://localhost:3000/api/lead-state/5584999999999
```

### Monitoring Points

During testing, watch console logs for:

```
🎯 [SPECIALIST] Iniciando em 'pain_discovery' (surface layer)
✅ [SPECIALIST] Contexto do SDR salvo: "Crescimento/Marketing/Vendas"
🔍 [SPECIALIST] Need será coletado via pain_discovery multi-layer

🔍 [BANT] Pain Discovery ainda não completo - permanecendo em pain_discovery

✅ [SPECIALIST] Need coletado do Pain Discovery: "conversão baixa..."
🔧 [FIX] Pain Discovery marcado como completo

📊 [BANT] ESTADO COMPLETO:
   - Stage: budget
   - Need: conversão baixa leads não fecham ✅
   - Budget: ❌ FALTANDO
   - Authority: ❌ FALTANDO
   - Timing: ❌ FALTANDO
```

### Rollback Plan

If fix causes issues:
```bash
git revert <commit-hash>
```

Affected files:
- `/Users/taylorlpticloud.com/Desktop/agent-js-starter/src/tools/bant_unified.js`
- `/Users/taylorlpticloud.com/Desktop/agent-js-starter/src/agents/specialist_agent.js`
