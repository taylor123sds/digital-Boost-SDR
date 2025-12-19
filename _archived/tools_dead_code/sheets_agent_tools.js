// src/tools/sheets_agent_tools.js
// Tools para integração do agente com Google Sheets
import * as googleSheets from './google_sheets.js';

// ===== TOOLS DEFINITIONS FOR OPENAI =====
export const sheetsTools = [
  {
    type: "function",
    function: {
      name: "search_leads",
      description: "Busca leads na planilha Google Sheets usando filtros específicos",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Termo de busca para filtrar leads (nome, empresa, telefone, etc.)"
          },
          limit: {
            type: "number",
            description: "Limite de resultados (padrão: 10)",
            default: 10
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_lead_status",
      description: "Atualiza o status ou informações de um lead específico na planilha",
      parameters: {
        type: "object",
        properties: {
          leadIdentifier: {
            type: "string",
            description: "Identificador do lead (nome, email ou telefone)"
          },
          status: {
            type: "string",
            description: "Novo status do lead",
            enum: ["NOVO", "CONTACTADO", "QUALIFICADO", "PROPOSTA", "FECHADO", "PERDIDO"]
          },
          notes: {
            type: "string",
            description: "Notas ou observações sobre a interação"
          },
          nextAction: {
            type: "string",
            description: "Próxima ação a ser tomada com o lead"
          }
        },
        required: ["leadIdentifier"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_new_lead",
      description: "Cria um novo lead na planilha Google Sheets",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Nome completo do lead"
          },
          email: {
            type: "string",
            description: "Email do lead"
          },
          phone: {
            type: "string",
            description: "Telefone do lead"
          },
          company: {
            type: "string",
            description: "Empresa do lead"
          },
          source: {
            type: "string",
            description: "Origem do lead (WhatsApp, site, indicação, etc.)"
          },
          interest: {
            type: "string",
            description: "Interesse ou necessidade identificada"
          },
          status: {
            type: "string",
            description: "Status inicial do lead",
            enum: ["NOVO", "CONTACTADO", "QUALIFICADO"],
            default: "NOVO"
          }
        },
        required: ["name", "phone"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_interaction",
      description: "Registra uma interação ou conversa com um lead na planilha",
      parameters: {
        type: "object",
        properties: {
          leadIdentifier: {
            type: "string",
            description: "Identificador do lead (nome, email ou telefone)"
          },
          interactionType: {
            type: "string",
            description: "Tipo de interação",
            enum: ["CALL", "WHATSAPP", "EMAIL", "MEETING", "FOLLOW_UP"]
          },
          summary: {
            type: "string",
            description: "Resumo da interação"
          },
          outcome: {
            type: "string",
            description: "Resultado da interação"
          },
          nextSteps: {
            type: "string",
            description: "Próximos passos definidos"
          }
        },
        required: ["leadIdentifier", "interactionType", "summary"]
      }
    }
  }
];

// ===== TOOL EXECUTION FUNCTIONS =====

export async function executeSheetsTool(toolName, parameters) {
  try {
    console.log(`🔧 Executando tool Google Sheets: ${toolName}`, parameters);

    switch (toolName) {
      case 'search_leads':
        return await searchLeads(parameters);

      case 'update_lead_status':
        return await updateLeadStatus(parameters);

      case 'create_new_lead':
        return await createNewLead(parameters);

      case 'log_interaction':
        return await logInteraction(parameters);

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

// ===== IMPLEMENTATION FUNCTIONS =====

async function searchLeads({ query, limit = 10 }) {
  try {
    // Buscar todos os leads
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();

    if (!query || query.trim() === '') {
      // Retornar os primeiros leads se não houver query
      return {
        success: true,
        leads: allLeads.slice(0, limit),
        total: allLeads.length,
        message: `Encontrados ${allLeads.length} leads na planilha. Mostrando ${Math.min(limit, allLeads.length)} primeiros.`
      };
    }

    // Filtrar leads baseado na query
    const queryLower = query.toLowerCase();
    const filteredLeads = allLeads.filter(lead => {
      return (
        lead.Nome?.toLowerCase().includes(queryLower) ||
        lead.nome?.toLowerCase().includes(queryLower) ||
        lead.Empresa?.toLowerCase().includes(queryLower) ||
        lead.empresa?.toLowerCase().includes(queryLower) ||
        lead.Telefone?.includes(query) ||
        lead.telefone?.includes(query) ||
        lead.Email?.toLowerCase().includes(queryLower) ||
        lead.email?.toLowerCase().includes(queryLower) ||
        lead.Status?.toLowerCase().includes(queryLower) ||
        lead.status?.toLowerCase().includes(queryLower) ||
        lead.Segmento?.toLowerCase().includes(queryLower) ||
        lead.segmento?.toLowerCase().includes(queryLower)
      );
    });

    return {
      success: true,
      leads: filteredLeads.slice(0, limit),
      total: filteredLeads.length,
      query: query,
      message: `Encontrados ${filteredLeads.length} leads para "${query}". Mostrando ${Math.min(limit, filteredLeads.length)} resultados.`
    };

  } catch (error) {
    throw new Error(`Erro ao buscar leads: ${error.message}`);
  }
}

async function updateLeadStatus({ leadIdentifier, status, notes, nextAction }) {
  try {
    // Primeiro, encontrar o lead
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();
    const identifier = leadIdentifier.toLowerCase();

    const leadIndex = allLeads.findIndex(lead => {
      return (
        lead.Nome?.toLowerCase().includes(identifier) ||
        lead.nome?.toLowerCase().includes(identifier) ||
        lead.Telefone?.includes(leadIdentifier) ||
        lead.telefone?.includes(leadIdentifier) ||
        lead.Email?.toLowerCase().includes(identifier) ||
        lead.email?.toLowerCase().includes(identifier)
      );
    });

    if (leadIndex === -1) {
      return {
        success: false,
        message: `Lead não encontrado: ${leadIdentifier}`
      };
    }

    const lead = allLeads[leadIndex];

    // Preparar dados de atualização
    const updateData = {
      name: lead.Nome || lead.nome,
      phone: lead.Telefone || lead.telefone,
      company: lead.Empresa || lead.empresa || '',
      email: lead.Email || lead.email || '',
      status: status || lead.Status || lead.status,
      segment: lead.Segmento || lead.segmento || '',
      revenue: lead.Faturamento || lead.faturamento || '',
      employees: lead.Funcionários || lead.funcionarios || '',
      source: lead.Fonte || lead.fonte || 'WhatsApp',
      notes: notes || lead.Observações || lead.observacoes || ''
    };

    // Salvar atualização via saveLead (que adiciona nova linha)
    const spreadsheetId = process.env.GOOGLE_LEADS_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_LEADS_SHEET_ID não configurado');
    }

    await googleSheets.saveLead(spreadsheetId, updateData);

    return {
      success: true,
      lead: updateData,
      message: `Lead ${lead.nome} atualizado com sucesso. Status: ${status || 'mantido'}`
    };

  } catch (error) {
    throw new Error(`Erro ao atualizar lead: ${error.message}`);
  }
}

async function createNewLead({ name, email, phone, company, source, interest, status = 'NOVO' }) {
  try {
    const leadData = {
      nome: name,
      telefone: phone,
      empresa: company || '',
      email: email || '',
      status: status,
      interesse: interest || '',
      fonte: source || 'Agente AI',
      dataContato: new Date().toLocaleString('pt-BR'),
      observacoes: 'Lead criado pelo agente ORBION',
      proximaAcao: 'Primeiro contato'
    };

    const spreadsheetId = process.env.GOOGLE_LEADS_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_LEADS_SHEET_ID não configurado');
    }

    await googleSheets.saveLead(spreadsheetId, leadData);

    return {
      success: true,
      lead: leadData,
      message: `Novo lead ${name} criado com sucesso na planilha`
    };

  } catch (error) {
    throw new Error(`Erro ao criar lead: ${error.message}`);
  }
}

async function logInteraction({ leadIdentifier, interactionType, summary, outcome, nextSteps }) {
  try {
    // Buscar o lead
    const allLeads = await googleSheets.getLeadsFromGoogleSheets();
    const identifier = leadIdentifier.toLowerCase();

    const lead = allLeads.find(lead => {
      return (
        lead.Nome?.toLowerCase().includes(identifier) ||
        lead.nome?.toLowerCase().includes(identifier) ||
        lead.Telefone?.includes(leadIdentifier) ||
        lead.telefone?.includes(leadIdentifier) ||
        lead.Email?.toLowerCase().includes(identifier) ||
        lead.email?.toLowerCase().includes(identifier)
      );
    });

    if (!lead) {
      return {
        success: false,
        message: `Lead não encontrado para registrar interação: ${leadIdentifier}`
      };
    }

    // Registrar interação na planilha de interações (se configurada)
    const interactionData = {
      timestamp: new Date().toLocaleString('pt-BR'),
      leadNome: lead.nome,
      telefone: lead.telefone,
      tipoInteracao: interactionType,
      resumo: summary,
      resultado: outcome || '',
      proximosPassos: nextSteps || '',
      agente: 'ORBION AI'
    };

    const interactionSheetId = process.env.GOOGLE_INTERACTIONS_SHEET_ID;
    if (interactionSheetId) {
      await googleSheets.saveInteraction(interactionSheetId, interactionData);
    }

    // Também atualizar o lead principal com a última interação
    const updatedLead = {
      ...lead,
      ultimaInteracao: new Date().toLocaleString('pt-BR'),
      observacoes: `${lead.observacoes || ''}\n[${interactionType}] ${summary}`.trim()
    };

    const leadSheetId = process.env.GOOGLE_LEADS_SHEET_ID;
    if (leadSheetId) {
      await googleSheets.saveLead(leadSheetId, updatedLead);
    }

    return {
      success: true,
      interaction: interactionData,
      message: `Interação registrada para ${lead.nome}: ${interactionType} - ${summary}`
    };

  } catch (error) {
    throw new Error(`Erro ao registrar interação: ${error.message}`);
  }
}

// ===== HELPER FUNCTIONS =====

export function formatLeadsForAgent(leads) {
  if (!leads || leads.length === 0) {
    return "Nenhum lead encontrado.";
  }

  return leads.map(lead => {
    return `• ${lead.nome} (${lead.telefone}) - ${lead.empresa || 'N/A'} - Status: ${lead.status || 'N/A'}`;
  }).join('\n');
}

export function isValidLeadStatus(status) {
  const validStatuses = ["NOVO", "CONTACTADO", "QUALIFICADO", "PROPOSTA", "FECHADO", "PERDIDO"];
  return validStatuses.includes(status?.toUpperCase());
}