// src/tools/exit_detector_simple.js
// Arquivo temporário para manter compatibilidade - foi substituído pelo sistema híbrido

export function isExitIntent(text) {
  const exitKeywords = [
    'tchau', 'adeus', 'até logo', 'falou', 'xau', 'bye', 'goodbye',
    'não quero', 'não preciso', 'não tenho interesse', 'cancelar',
    'sair', 'parar', 'encerrar', 'fim'
  ];

  const normalizedText = text.toLowerCase().trim();
  return exitKeywords.some(keyword => normalizedText.includes(keyword));
}

export function generateExitResponse(context = {}) {
  const responses = [
    "Entendo! Se mudar de ideia, estarei aqui. Tenha um ótimo dia! 😊",
    "Sem problemas! Qualquer coisa, pode contar comigo. Até mais! 👋",
    "Tudo bem! Fico à disposição quando precisar. Sucesso aí! ✨"
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

// Função isBlacklisted removida - usar a versão completa de ./exit_detector.js