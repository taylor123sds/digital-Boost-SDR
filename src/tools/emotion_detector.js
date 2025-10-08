// tools/emotion_detector.js
// 🎭 MELHORIA #8: Detector de Emoções

/**
 * 🎭 EMOTION DETECTOR - MELHORIA #8
 *
 * Detecta emoção do lead para ajustar tom da resposta:
 * 😤 Frustrado → Tom empático + solução urgente
 * 😃 Empolgado → Tom animado + fechar rápido
 * 🤔 Cético → Tom consultivo + provas sociais
 * 😐 Neutro → Tom profissional padrão
 */

class EmotionDetector {
  constructor() {
    this.emotionPatterns = {
      frustrated: {
        keywords: ['frustrado', 'cansado', 'irritado', 'não aguento', 'perdendo', 'problema', 'dificuldade', 'demora', 'lento', 'ruim', 'péssimo', 'horrível'],
        intensity: 'high',
        tone: 'empatico_urgente',
        action: 'resolver_imediatamente'
      },
      excited: {
        keywords: ['interessante', 'legal', 'show', 'ótimo', 'perfeito', 'excelente', 'amei', 'adorei', 'quero', 'bora', 'vamos'],
        intensity: 'high',
        tone: 'animado_proativo',
        action: 'fechar_rapido'
      },
      skeptical: {
        keywords: ['não sei', 'dúvida', 'será', 'funciona mesmo', 'não acredito', 'desconfio', 'promessa', 'garantia', 'prova'],
        intensity: 'medium',
        tone: 'consultivo_confiavel',
        action: 'dar_provas'
      },
      confused: {
        keywords: ['não entendi', 'confuso', 'complicado', 'difícil', 'explica', 'como assim'],
        intensity: 'medium',
        tone: 'didatico_paciente',
        action: 'simplificar'
      },
      anxious: {
        keywords: ['urgente', 'rápido', 'agora', 'preciso', 'hoje', 'já'],
        intensity: 'high',
        tone: 'rapido_direto',
        action: 'atender_urgencia'
      },
      neutral: {
        keywords: [],
        intensity: 'low',
        tone: 'profissional_padrao',
        action: 'continuar_qualificacao'
      }
    };

    console.log('🎭 [EMOTION-DETECTOR] Sistema de detecção de emoções inicializado');
  }

  detectEmotion(message) {
    const lowerMessage = message.toLowerCase();
    const detectedEmotions = [];

    for (const [emotion, config] of Object.entries(this.emotionPatterns)) {
      if (emotion === 'neutral') continue;

      const matches = config.keywords.filter(keyword => lowerMessage.includes(keyword));
      if (matches.length > 0) {
        detectedEmotions.push({
          emotion,
          matches,
          score: matches.length,
          ...config
        });
      }
    }

    if (detectedEmotions.length === 0) {
      return { emotion: 'neutral', ...this.emotionPatterns.neutral, score: 0 };
    }

    detectedEmotions.sort((a, b) => b.score - a.score);
    const primary = detectedEmotions[0];

    console.log(`🎭 [EMOTION] Detectado: ${primary.emotion} (${primary.score} matches)`);

    return {
      emotion: primary.emotion,
      tone: primary.tone,
      action: primary.action,
      intensity: primary.intensity,
      score: primary.score,
      alternativeEmotions: detectedEmotions.slice(1, 3)
    };
  }

  getToneInstructions(emotion) {
    const instructions = {
      frustrated: '🎯 Tom empático e solucionador. Reconheça a dor, mostre que entende e apresente solução imediata. Ex: "Entendo perfeitamente. Muitos clientes tinham esse problema. Resolvemos com..."',
      excited: '⚡ Tom animado e proativo. Aproveite o momentum, crie senso de urgência. Ex: "Show que está empolgado! Vamos acelerar? Posso te mostrar agora..."',
      skeptical: '🔬 Tom consultivo e baseado em provas. Dê cases, dados, garantias. Ex: "Entendo a cautela. Veja o case da empresa X que teve Y% de resultado..."',
      confused: '📚 Tom didático e paciente. Simplifique, use exemplos. Ex: "Deixa eu explicar de forma simples..."',
      anxious: '🚀 Tom rápido e direto. Vá direto ao ponto, mostre próximos passos. Ex: "Entendi a urgência. Podemos resolver hoje..."',
      neutral: '💼 Tom profissional padrão. Continue qualificação normal.'
    };

    return instructions[emotion] || instructions.neutral;
  }
}

const emotionDetector = new EmotionDetector();
export default emotionDetector;

export function detectEmotion(message) {
  return emotionDetector.detectEmotion(message);
}

export function getEmotionToneInstructions(emotion) {
  return emotionDetector.getToneInstructions(emotion);
}
