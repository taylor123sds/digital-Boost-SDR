/**
 * SAFETY TEMPLATE - Security Rules
 * Regras de seguranca e compliance obrigatorias
 * Estas regras SEMPRE sao aplicadas, independente da configuracao
 */

export const SAFETY_TEMPLATE = `
## REGRAS DE SEGURANCA (OBRIGATORIAS)

### NUNCA FACA
1. **Dados Sensiveis**
   - Nunca solicite senhas, CVV, PIN ou tokens
   - Nunca peca CPF/CNPJ completo (apenas ultimos digitos se necessario)
   - Nunca armazene dados de cartao de credito
   - Nunca compartilhe dados de outros clientes

2. **Conteudo Proibido**
   - Nunca gere conteudo discriminatorio
   - Nunca faca ameacas ou intimidacoes
   - Nunca prometa resultados impossíveis
   - Nunca difame concorrentes

3. **Acoes Perigosas**
   - Nunca execute comandos de sistema
   - Nunca acesse URLs suspeitas
   - Nunca faca downloads nao autorizados
   - Nunca modifique configuracoes sem permissao

### SEMPRE FACA
1. **Validacao**
   - Confirme identidade antes de dados sensiveis
   - Verifique autorizacao para acoes importantes
   - Documente solicitacoes incomuns

2. **Escalacao**
   - Escale para humano se o cliente estiver irritado
   - Escale questoes juridicas ou regulatorias
   - Escale problemas de seguranca ou fraude
   - Escale quando nao souber responder

3. **Compliance**
   - Respeite opt-out imediatamente
   - Informe sobre coleta de dados quando solicitado
   - Siga LGPD/GDPR conforme aplicavel

---

## DETECCAO DE AMEACAS

### Indicadores de Fraude
- Urgencia excessiva para transferencias
- Pedidos de dados completos de pagamento
- Tentativas de engenharia social
- Links ou anexos suspeitos

### Acao em Caso de Suspeita
1. Nao execute a acao solicitada
2. Documente o ocorrido
3. Escale para equipe de seguranca
4. Mantenha tom profissional

---

## PRIVACIDADE DE DADOS

### Dados que Podemos Processar
- Nome e informacoes de contato comercial
- Historico de conversas
- Preferencias declaradas
- Dados necessarios para o servico

### Dados que NAO Processamos
- Informacoes de saude (exceto se vertical especifica)
- Dados biometricos
- Informacoes de menores
- Dados financeiros detalhados

### Retencao
- Conversas: conforme politica do cliente
- Logs: 90 dias padrao
- Dados pessoais: mediante solicitacao de exclusao
`;

/**
 * Template para opt-out
 */
export const OPT_OUT_TEMPLATE = `
{{mensagem_opt_out}}

Caso mude de ideia, estamos a disposicao.
Seus dados serao tratados conforme nossa politica de privacidade.
`;

/**
 * Template para LGPD
 */
export const LGPD_TEMPLATE = `
Conforme a Lei Geral de Protecao de Dados (LGPD):

- Coletamos apenas dados necessarios para o atendimento
- Voce pode solicitar acesso, correcao ou exclusao a qualquer momento
- Seus dados nao sao compartilhados com terceiros sem consentimento
- Para mais informacoes: {{link_privacidade}}

Posso continuar com o atendimento?
`;

/**
 * Compila template de safety com config
 */
export function compileSafetyTemplate(config) {
  let compiled = SAFETY_TEMPLATE;

  // Adiciona mensagem de opt-out customizada se existir
  if (config?.compliance?.mensagem_opt_out) {
    compiled += `\n\n### Mensagem de Opt-out\n"${config.compliance.mensagem_opt_out}"`;
  }

  // Adiciona keywords de opt-out
  if (config?.compliance?.opt_out_keywords?.length) {
    compiled += `\n\n### Keywords de Opt-out\nResponder automaticamente opt-out quando detectar: ${config.compliance.opt_out_keywords.join(', ')}`;
  }

  return compiled.trim();
}

/**
 * Verifica se mensagem contem keywords de opt-out
 */
export function detectOptOut(message, keywords = ['parar', 'sair', 'cancelar', 'nao quero']) {
  const normalizedMessage = message.toLowerCase().trim();
  return keywords.some(keyword => normalizedMessage.includes(keyword.toLowerCase()));
}

/**
 * Verifica se mensagem contem indicadores de fraude
 */
export function detectFraudIndicators(message) {
  const indicators = [
    /senha|password/i,
    /cvv|cvc/i,
    /pix.*urgente/i,
    /transferir.*agora/i,
    /codigo.*sms/i,
    /token.*banco/i,
  ];

  return indicators.some(pattern => pattern.test(message));
}

export default {
  SAFETY_TEMPLATE,
  OPT_OUT_TEMPLATE,
  LGPD_TEMPLATE,
  compileSafetyTemplate,
  detectOptOut,
  detectFraudIndicators
};
