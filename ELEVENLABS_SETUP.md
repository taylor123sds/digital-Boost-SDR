# 🎙️ ElevenLabs TTS Integration - ORBION Voice Setup

## Voz Premium Ultra-Natural Integrada

O ORBION agora suporta a voz **xWdpADtEio43ew1zGxUQ** da ElevenLabs, uma das vozes mais naturais e humanas disponíveis no mercado.

## 🚀 Configuração Rápida

### 1. Obter API Key da ElevenLabs

1. Acesse [ElevenLabs.io](https://elevenlabs.io)
2. Crie uma conta ou faça login
3. Vá em **Profile → API Keys**
4. Gere uma nova API Key

### 2. Configurar no ORBION

Edite o arquivo `.env`:

```bash
# ElevenLabs TTS API - Voz Premium Ultra-Natural
ELEVENLABS_API_KEY=sua_chave_api_aqui
```

### 3. Testar o Sistema

1. Inicie o ORBION: `npm start`
2. Acesse: http://localhost:3001
3. No seletor de voz, escolha "🎙️ ElevenLabs Premium"
4. Teste comandos de voz

## 🎯 Voz Configurada

**Voice ID**: `xWdpADtEio43ew1zGxUQ`
- **Qualidade**: Ultra-natural, quase indistinguível de voz humana
- **Idioma**: Português BR nativo
- **Características**: Tom profissional, clara articulação, expressividade natural

## ⚙️ Configurações Otimizadas

```javascript
{
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.5,        // Naturalidade vs Consistência
    similarity_boost: 0.75, // Manter características da voz
    style: 0.3,            // Expressividade
    use_speaker_boost: true // Otimização automática
  }
}
```

## 💰 Custos e Limites

### Planos ElevenLabs:
- **Free**: 10.000 caracteres/mês
- **Starter**: $5/mês - 30.000 caracteres
- **Creator**: $22/mês - 100.000 caracteres
- **Pro**: $99/mês - 500.000 caracteres

### Exemplo de Uso:
- Resposta típica (50 caracteres): ~$0.0015
- Conversa de 10 minutos: ~$0.15
- Uso diário moderado: ~$5-15/mês

## 🔄 Sistema Híbrido

O ORBION usa sistema inteligente:

1. **ElevenLabs**: Respostas importantes, conversas principais
2. **Voz Local**: Comandos rápidos, fallback automático
3. **Seleção Manual**: Controle total pelo usuário

## 🛠️ Troubleshooting

### Voz não funciona?
1. Verificar API Key no `.env`
2. Verificar saldo na conta ElevenLabs
3. Verificar conexão com internet
4. Sistema faz fallback automático para voz local

### Erro 401 (Unauthorized)?
- API Key inválida ou expirada
- Regenerar chave na ElevenLabs

### Erro 429 (Rate Limit)?
- Limite de caracteres excedido
- Aguardar reset ou upgrade do plano

### Latência alta?
- Normal para primeira requisição (cache)
- Considerar otimizar texto (menos caracteres)

## 🎮 Comandos de Teste

Teste a qualidade da voz com:

- "Olá, sou o ORBION da Digital Boost"
- "Quantos leads temos cadastrados?"
- "Abrir WhatsApp e mostrar últimas mensagens"
- "Analisar dados do dashboard"

## 📊 Monitoramento

Logs no console mostram:
- `🎙️ ElevenLabs TTS: "texto..."` - Usando voz premium
- `🔊 ORBION falando (local): "texto..."` - Usando voz local
- `⚠️ ElevenLabs falhou, usando voz local` - Fallback ativo

## 🔐 Segurança

- API Key nunca exposta no frontend
- Requisições server-side apenas
- Cache de 1 hora para otimização
- Rate limiting automático

## 🚀 Próximos Passos

1. **Voice Cloning**: Clonar sua própria voz
2. **Multiple Voices**: Diferentes vozes por contexto
3. **Emotional TTS**: Adaptar emoção da resposta
4. **Real-time Streaming**: Reduzir latência ainda mais

---

**Resultado**: Voz 10x mais natural que sistemas tradicionais! 🎯