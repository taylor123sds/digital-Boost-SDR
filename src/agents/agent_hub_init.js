// agent_hub_init.js
// Inicialização do AgentHub com ROTEAMENTO INTELIGENTE

import { AgentHub } from './agent_hub.js';
import { SDRAgent } from './sdr_agent.js';
import { SpecialistAgent } from './specialist_agent.js';
import { SchedulerAgent } from './scheduler_agent.js';
import { AtendimentoAgent } from './atendimento_agent.js'; //  NOVO

let hubInstance = null;

/**
 * Retorna instância singleton do AgentHub
 * Inicializa os 4 agentes na primeira chamada
 *
 * AGENTES:
 * - sdr: Coleta inicial de dados (nome, empresa)
 * - specialist: Qualificação BANT consultiva
 * - atendimento: FAQ, preços, objeções
 * - scheduler: Agendamento de reunião
 *
 * ROTEAMENTO:
 * O IntentRouter classifica cada mensagem e decide qual agente processa
 */
export function getAgentHub() {
  if (!hubInstance) {
    console.log(' [HUB-INIT] Inicializando AgentHub com 4 agentes...');

    // Criar hub
    hubInstance = new AgentHub();

    // Criar e registrar os 4 agentes
    const sdrAgent = new SDRAgent();
    const specialistAgent = new SpecialistAgent();
    const schedulerAgent = new SchedulerAgent();
    const atendimentoAgent = new AtendimentoAgent(); //  NOVO

    hubInstance.registerAgent('sdr', sdrAgent);
    hubInstance.registerAgent('specialist', specialistAgent);
    hubInstance.registerAgent('scheduler', schedulerAgent);
    hubInstance.registerAgent('atendimento', atendimentoAgent); //  NOVO

    console.log(' [HUB-INIT] AgentHub inicializado com sucesso');
    console.log('    SDR Agent - Coleta inicial de dados');
    console.log('    Specialist Agent - Qualificação BANT consultiva');
    console.log('    Atendimento Agent - FAQ, preços, objeções'); //  NOVO
    console.log('    Scheduler Agent - Agendamento de reunião');
    console.log('    IntentRouter - Roteamento inteligente ativado');
  }

  return hubInstance;
}

export default getAgentHub;
