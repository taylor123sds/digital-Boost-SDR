/**
 * GERENCIADOR UNIFICADO DE ESTADO DE CONTATOS
 * Resolve conflitos de primeira interação e inconsistências
 * @version 1.0.0 - Resolução de Conflitos Críticos
 */

import { getMemory, setMemory } from '../memory.js';

/**
 * Estados possíveis de um contato
 */
export const CONTACT_STATES = {
  NEW: 'new',                    // Nunca conversou antes
  INTRODUCED: 'introduced',       // Já recebeu apresentação
  ENGAGED: 'engaged',            // Respondeu e está engajado
  QUALIFIED: 'qualified',        // Lead qualificado
  CONVERTED: 'converted',        // Agendou reunião/converteu
  INACTIVE: 'inactive'           // Parou de responder
};

/**
 * Gerenciador unificado de estado de contatos
 */
class ContactStateManager {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 30 * 60 * 1000; // 30 minutos
  }

  /**
   * Obtém estado completo de um contato
   * @param {string} contactId - ID do contato (número telefone limpo)
   * @returns {Promise<object>} Estado completo do contato
   */
  async getContactState(contactId) {
    const cleanId = this.cleanContactId(contactId);

    // Verifica cache primeiro
    const cached = this.cache.get(cleanId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.state;
    }

    // Busca no banco de dados
    const state = await this.loadFromDatabase(cleanId);

    // Atualiza cache
    this.cache.set(cleanId, {
      state,
      timestamp: Date.now()
    });

    return state;
  }

  /**
   * Carrega estado do banco de dados
   * @param {string} cleanId - ID limpo do contato
   * @returns {Promise<object>} Estado do contato
   */
  async loadFromDatabase(cleanId) {
    try {
      // Busca histórico de mensagens
      const messageHistory = await getMemory(`whatsapp_history_${cleanId}`) || [];
      const interactionCount = messageHistory.length;

      // Busca metadados salvos
      const savedMetadata = await getMemory(`contact_metadata_${cleanId}`) || {};

      // Determina estado atual baseado em dados reais
      const state = {
        contactId: cleanId,
        currentState: this.determineCurrentState(messageHistory, savedMetadata),
        isFirstContact: interactionCount === 0,
        hasBeenIntroduced: savedMetadata.hasBeenIntroduced || false,
        lastInteractionTime: savedMetadata.lastInteractionTime || null,
        interactionCount,
        salesPhase: savedMetadata.salesPhase || 'identification',
        leadQuality: savedMetadata.leadQuality || 'unknown',
        segment: savedMetadata.segment || 'generic',
        preferences: savedMetadata.preferences || {},

        // Flags críticas para resolver conflitos
        needsIntroduction: this.needsIntroduction(messageHistory, savedMetadata),
        shouldUseTemplate: this.shouldUseTemplate(messageHistory, savedMetadata),
        conversationFlow: savedMetadata.conversationFlow || 'structured',

        // Timestamps
        createdAt: savedMetadata.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log(`📊 ESTADO UNIFICADO - ${cleanId}:`, {
        state: state.currentState,
        firstContact: state.isFirstContact,
        needsIntro: state.needsIntroduction,
        interactions: state.interactionCount
      });

      return state;

    } catch (error) {
      console.error(`❌ Erro ao carregar estado de ${cleanId}:`, error);
      return this.createDefaultState(cleanId);
    }
  }

  /**
   * Determina estado atual baseado no histórico
   * @param {Array} messageHistory - Histórico de mensagens
   * @param {object} metadata - Metadados salvos
   * @returns {string} Estado atual
   */
  determineCurrentState(messageHistory, metadata) {
    if (messageHistory.length === 0) return CONTACT_STATES.NEW;
    if (metadata.hasConverted) return CONTACT_STATES.CONVERTED;
    if (metadata.isQualified) return CONTACT_STATES.QUALIFIED;
    if (messageHistory.length > 3) return CONTACT_STATES.ENGAGED;
    if (metadata.hasBeenIntroduced) return CONTACT_STATES.INTRODUCED;

    return CONTACT_STATES.NEW;
  }

  /**
   * Determina se precisa de apresentação
   * RESOLVE CONFLITO: Regra única e clara
   * @param {Array} messageHistory - Histórico de mensagens
   * @param {object} metadata - Metadados salvos
   * @returns {boolean} Se precisa apresentação
   */
  needsIntroduction(messageHistory, metadata) {
    // REGRA ABSOLUTA: Apresentação apenas se nunca foi feita
    return !metadata.hasBeenIntroduced && messageHistory.length === 0;
  }

  /**
   * Determina se deve usar template ou IA livre
   * @param {Array} messageHistory - Histórico de mensagens
   * @param {object} metadata - Metadados salvos
   * @returns {boolean} Se deve usar template
   */
  shouldUseTemplate(messageHistory, metadata) {
    // Templates para primeiros contatos e situações estruturadas
    return messageHistory.length < 3 || metadata.preferTemplate;
  }

  /**
   * Atualiza estado do contato
   * @param {string} contactId - ID do contato
   * @param {object} updates - Atualizações para aplicar
   * @returns {Promise<object>} Estado atualizado
   */
  async updateContactState(contactId, updates) {
    const cleanId = this.cleanContactId(contactId);
    const currentState = await this.getContactState(cleanId);

    const updatedState = {
      ...currentState,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Salva no banco de dados
    await this.saveToDatabase(cleanId, updatedState);

    // Atualiza cache
    this.cache.set(cleanId, {
      state: updatedState,
      timestamp: Date.now()
    });

    console.log(`✅ ESTADO ATUALIZADO - ${cleanId}:`, updates);
    return updatedState;
  }

  /**
   * Salva estado no banco de dados
   * @param {string} cleanId - ID limpo do contato
   * @param {object} state - Estado para salvar
   */
  async saveToDatabase(cleanId, state) {
    try {
      // Extrai metadados para salvar
      const metadata = {
        hasBeenIntroduced: state.hasBeenIntroduced,
        lastInteractionTime: state.lastInteractionTime,
        salesPhase: state.salesPhase,
        leadQuality: state.leadQuality,
        segment: state.segment,
        preferences: state.preferences,
        conversationFlow: state.conversationFlow,
        hasConverted: state.currentState === CONTACT_STATES.CONVERTED,
        isQualified: state.currentState === CONTACT_STATES.QUALIFIED,
        preferTemplate: state.shouldUseTemplate,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt
      };

      await setMemory(`contact_metadata_${cleanId}`, metadata);

    } catch (error) {
      console.error(`❌ Erro ao salvar estado de ${cleanId}:`, error);
    }
  }

  /**
   * Marca contato como apresentado
   * @param {string} contactId - ID do contato
   */
  async markAsIntroduced(contactId) {
    return await this.updateContactState(contactId, {
      hasBeenIntroduced: true,
      needsIntroduction: false,
      currentState: CONTACT_STATES.INTRODUCED,
      lastInteractionTime: new Date().toISOString()
    });
  }

  /**
   * Registra nova interação
   * @param {string} contactId - ID do contato
   * @param {object} interaction - Dados da interação
   */
  async recordInteraction(contactId, interaction) {
    const currentState = await this.getContactState(contactId);

    return await this.updateContactState(contactId, {
      interactionCount: currentState.interactionCount + 1,
      lastInteractionTime: new Date().toISOString(),
      currentState: this.advanceState(currentState.currentState, interaction)
    });
  }

  /**
   * Avança estado baseado na interação
   * @param {string} currentState - Estado atual
   * @param {object} interaction - Dados da interação
   * @returns {string} Novo estado
   */
  advanceState(currentState, interaction) {
    switch (currentState) {
      case CONTACT_STATES.NEW:
        return CONTACT_STATES.INTRODUCED;
      case CONTACT_STATES.INTRODUCED:
        return interaction.showsInterest ? CONTACT_STATES.ENGAGED : CONTACT_STATES.INTRODUCED;
      case CONTACT_STATES.ENGAGED:
        return interaction.isQualified ? CONTACT_STATES.QUALIFIED : CONTACT_STATES.ENGAGED;
      case CONTACT_STATES.QUALIFIED:
        return interaction.converted ? CONTACT_STATES.CONVERTED : CONTACT_STATES.QUALIFIED;
      default:
        return currentState;
    }
  }

  /**
   * Limpa ID do contato
   * @param {string} contactId - ID original
   * @returns {string} ID limpo
   */
  cleanContactId(contactId) {
    return contactId.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
  }

  /**
   * Cria estado padrão
   * @param {string} cleanId - ID limpo
   * @returns {object} Estado padrão
   */
  createDefaultState(cleanId) {
    return {
      contactId: cleanId,
      currentState: CONTACT_STATES.NEW,
      isFirstContact: true,
      hasBeenIntroduced: false,
      lastInteractionTime: null,
      interactionCount: 0,
      salesPhase: 'identification',
      leadQuality: 'unknown',
      segment: 'generic',
      preferences: {},
      needsIntroduction: true,
      shouldUseTemplate: true,
      conversationFlow: 'structured',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Verifica se é realmente primeiro contato
   * RESOLVE CONFLITO PRINCIPAL
   * @param {string} contactId - ID do contato
   * @returns {Promise<boolean>} Se é primeiro contato real
   */
  async isFirstContact(contactId) {
    const state = await this.getContactState(contactId);
    return state.isFirstContact && !state.hasBeenIntroduced;
  }

  /**
   * Limpa cache (para testes)
   */
  clearCache() {
    this.cache.clear();
  }
}

// Instância singleton
const contactStateManager = new ContactStateManager();

export default contactStateManager;

/**
 * Funções de conveniência para compatibilidade
 */
export async function isFirstContact(contactId) {
  return await contactStateManager.isFirstContact(contactId);
}

export async function markContactAsIntroduced(contactId) {
  return await contactStateManager.markAsIntroduced(contactId);
}

export async function getContactState(contactId) {
  return await contactStateManager.getContactState(contactId);
}

export async function recordContactInteraction(contactId, interaction) {
  return await contactStateManager.recordInteraction(contactId, interaction);
}

console.log('🏗️ ContactStateManager inicializado - Conflitos resolvidos');