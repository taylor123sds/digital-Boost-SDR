// src/tools/theme_manager.js
// Sistema de gerenciamento de temas para o ORBION

// ===== THEME TOOL DEFINITIONS FOR OPENAI =====
export const themeTools = [
  {
    type: "function",
    function: {
      name: "change_theme",
      description: "Altera o tema visual do dashboard do ORBION",
      parameters: {
        type: "object",
        properties: {
          themeName: {
            type: "string",
            description: "Nome do tema a ser aplicado",
            enum: ["default", "cyberpunk", "matrix", "corporate", "minimal"]
          }
        },
        required: ["themeName"]
      }
    }
  }
];

// ===== THEME EXECUTION FUNCTION =====
export async function executeThemeTool(toolName, parameters) {
  try {
    console.log(`🎨 Executando tool de tema: ${toolName}`, parameters);

    switch (toolName) {
      case 'change_theme':
        return await changeTheme(parameters);

      default:
        throw new Error(`Tool não reconhecido: ${toolName}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao executar tool ${toolName}:`, error);
    return {
      success: false,
      error: error.message,
      message: `Erro ao executar ${toolName}: ${error.message}`
    };
  }
}

// ===== IMPLEMENTATION FUNCTION =====
async function changeTheme({ themeName }) {
  try {
    // Validar se o tema existe
    const validThemes = ['default', 'cyberpunk', 'matrix', 'corporate', 'minimal'];
    if (!validThemes.includes(themeName)) {
      return {
        success: false,
        message: `Tema "${themeName}" não é válido. Temas disponíveis: ${validThemes.join(', ')}`
      };
    }

    // Mapear nomes amigáveis para nomes técnicos
    const themeDescriptions = {
      default: 'Padrão Azul/Roxo',
      cyberpunk: 'Cyberpunk Rosa/Azul Neon',
      matrix: 'Matrix Verde/Preto',
      corporate: 'Corporativo Azul/Cinza',
      minimal: 'Minimalista Branco/Cinza'
    };

    return {
      success: true,
      themeName: themeName,
      description: themeDescriptions[themeName],
      message: `Tema alterado para ${themeDescriptions[themeName]}! 🎨`,
      action: 'theme_changed'
    };

  } catch (error) {
    throw new Error(`Erro ao alterar tema: ${error.message}`);
  }
}

// ===== HELPER FUNCTIONS =====
export function getAvailableThemes() {
  return [
    { name: 'default', description: 'Padrão Azul/Roxo' },
    { name: 'cyberpunk', description: 'Cyberpunk Rosa/Azul Neon' },
    { name: 'matrix', description: 'Matrix Verde/Preto' },
    { name: 'corporate', description: 'Corporativo Azul/Cinza' },
    { name: 'minimal', description: 'Minimalista Branco/Cinza' }
  ];
}

export function detectThemeFromMessage(message) {
  const themeKeywords = {
    cyberpunk: ['cyberpunk', 'cyber punk', 'rosa', 'neon', 'futuro', 'futurista'],
    matrix: ['matrix', 'verde', 'hacker', 'código'],
    corporate: ['corporativo', 'corporativa', 'empresa', 'escritório', 'profissional'],
    minimal: ['minimalista', 'minimal', 'simples', 'limpo', 'branco'],
    default: ['padrão', 'default', 'original', 'normal', 'azul']
  };

  const messageLower = message.toLowerCase();

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      return theme;
    }
  }

  return null;
}

console.log('🎨 Sistema de gerenciamento de temas inicializado');