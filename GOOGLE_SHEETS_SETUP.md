# 🚀 Google Sheets Setup - ORBION

## ⚡ Setup Rápido (5 minutos)

### 1. Criar Projeto no Google Cloud
1. Acesse: https://console.cloud.google.com/
2. Clique em **"Novo Projeto"**
3. Nome: `ORBION Sheets API`
4. Clique **"Criar"**

### 2. Habilitar APIs
1. No menu lateral: **APIs e Serviços** → **Biblioteca**
2. Habilite estas 3 APIs:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API**
   - ✅ **Google Calendar API**

### 3. Criar Credenciais OAuth2
1. **APIs e Serviços** → **Credenciais**
2. **+ Criar Credenciais** → **ID do cliente OAuth 2.0**
3. Tipo: **Aplicativo da Web**
4. Nome: `ORBION Client`
5. **URIs de redirecionamento autorizados:**
   ```
   http://localhost:3001/oauth2callback
   ```
6. Clique **Criar**

### 4. Baixar e Configurar
1. **Baixe o JSON** das credenciais
2. **Renomeie** para: `google_credentials.json`
3. **Mova** para a pasta raiz do projeto (mesmo nível do package.json)

### 5. Testar Integração
1. Reinicie o servidor: `npm start`
2. Acesse: http://localhost:3001/sheets-dashboard.html
3. Clique em **"🔐 URL Autorização"**
4. **Autorize** o acesso ao Google
5. Teste os endpoints!

---

## 🧪 Endpoints Prontos

### Básicos
```bash
# Buscar planilhas
GET /api/sheets/search?q=nome

# Ler dados
GET /api/sheets/SEU_SHEET_ID/read?range=Sheet1!A:Z

# Obter informações
GET /api/sheets/SEU_SHEET_ID/info
```

### Criar e Modificar
```bash
# Criar nova planilha
POST /api/sheets/create
{
  "title": "Minha Planilha ORBION",
  "sheetNames": ["Leads", "Interações"]
}

# Adicionar dados
POST /api/sheets/SEU_SHEET_ID/append
{
  "range": "Leads!A:J",
  "values": [["Nome", "Telefone", "Empresa"]]
}
```

### Automação ORBION
```bash
# Salvar lead automaticamente
POST /api/sheets/save-lead
{
  "spreadsheetId": "SEU_SHEET_ID",
  "leadData": {
    "phone": "558496791624",
    "name": "João Silva",
    "company": "Empresa XYZ",
    "segment": "Varejo",
    "revenue": "80000",
    "source": "WhatsApp ORBION"
  }
}

# Salvar interação
POST /api/sheets/save-interaction
{
  "spreadsheetId": "SEU_SHEET_ID",
  "interaction": {
    "phone": "558496791624",
    "message": "Olá, preciso de ajuda",
    "response": "Claro! Como posso ajudar?",
    "sentiment": "positivo",
    "intent": "suporte"
  }
}
```

---

## 🛠️ Integração Automática WhatsApp → Sheets

Para salvar leads automaticamente quando chegarem via WhatsApp, adicione no seu `.env`:

```bash
# Google Sheets para leads
GOOGLE_LEADS_SHEET_ID=SEU_SHEET_ID_AQUI

# Google Sheets para interações
GOOGLE_INTERACTIONS_SHEET_ID=SEU_SHEET_ID_AQUI
```

O ORBION vai salvar automaticamente:
- ✅ **Leads qualificados** → Planilha de Leads
- ✅ **Todas interações** → Planilha de Interações
- ✅ **Análises de perfil** → Planilha de Análises

---

## 📊 Estrutura das Planilhas

### Planilha "Leads" (colunas A-J):
| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Data/Hora | Telefone | Nome | Empresa | Segmento | Faturamento | Funcionários | Fonte | Status | Observações |

### Planilha "Interações" (colunas A-H):
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Data/Hora | Telefone | Mensagem | Resposta | Sentimento | Intenção | Tempo Proc. | Fonte |

---

## 🔥 Próximos Passos

1. **Configure as credenciais** seguindo os passos acima
2. **Teste no dashboard**: http://localhost:3001/sheets-dashboard.html
3. **Crie suas planilhas** ou use as existentes
4. **Configure automação** adicionando SHEET_IDs no .env
5. **Pronto!** O ORBION salvará tudo automaticamente

---

## ❓ Resolução de Problemas

### "Token não encontrado"
→ Execute autorização OAuth primeiro

### "Insufficient authentication scopes"
→ Reautorize com os novos escopos

### "Planilha não encontrada"
→ Verifique se o SHEET_ID está correto

### Arquivo de credenciais
→ Certifique-se que `google_credentials.json` existe na raiz

---

**🎉 Pronto! Google Sheets integrado ao ORBION!**