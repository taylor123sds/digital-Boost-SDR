/**
 * Document Schemas for Licitacoes and Contratos
 *
 * These schemas define the structure for extracting structured data
 * from legal/bidding documents with evidence tracking.
 */

// Field type definitions
export const FieldTypes = {
  STRING: 'string',
  TEXT: 'text',
  DATE: 'date',
  DATETIME: 'datetime',
  CURRENCY: 'currency',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ENUM: 'enum',
  ARRAY: 'array',
  OBJECT: 'object'
};

// Licitacao (Bidding Process) Schema
export const LicitacaoSchema = {
  name: 'licitacao',
  displayName: 'Licitacao',
  description: 'Schema para documentos de licitacao publica',
  version: '1.0.0',

  fields: {
    // Identificacao
    numero_processo: {
      type: FieldTypes.STRING,
      required: true,
      label: 'Numero do Processo',
      description: 'Numero identificador do processo licitatorio',
      patterns: [
        /\d{2,5}[\/.]\d{4}/,
        /PE\s*\d+[\/.]\d{4}/,
        /PREG[AÃ]O.*\d+/i
      ]
    },

    modalidade: {
      type: FieldTypes.ENUM,
      required: true,
      label: 'Modalidade',
      values: [
        'pregao_eletronico',
        'pregao_presencial',
        'concorrencia',
        'tomada_precos',
        'convite',
        'concurso',
        'leilao',
        'dialogo_competitivo',
        'rdc'
      ],
      labels: {
        pregao_eletronico: 'Pregao Eletronico',
        pregao_presencial: 'Pregao Presencial',
        concorrencia: 'Concorrencia',
        tomada_precos: 'Tomada de Precos',
        convite: 'Convite',
        concurso: 'Concurso',
        leilao: 'Leilao',
        dialogo_competitivo: 'Dialogo Competitivo',
        rdc: 'RDC (Regime Diferenciado de Contratacoes)'
      }
    },

    orgao: {
      type: FieldTypes.STRING,
      required: true,
      label: 'Orgao Contratante',
      description: 'Nome do orgao publico responsavel pela licitacao'
    },

    uasg: {
      type: FieldTypes.STRING,
      required: false,
      label: 'UASG',
      description: 'Codigo da Unidade Administrativa de Servicos Gerais',
      patterns: [/UASG[:\s]*(\d{6})/i]
    },

    // Cronograma
    data_publicacao: {
      type: FieldTypes.DATE,
      required: false,
      label: 'Data de Publicacao',
      description: 'Data de publicacao do edital'
    },

    data_abertura: {
      type: FieldTypes.DATETIME,
      required: true,
      label: 'Data de Abertura',
      description: 'Data e hora da abertura das propostas'
    },

    prazo_impugnacao: {
      type: FieldTypes.DATE,
      required: false,
      label: 'Prazo para Impugnacao',
      description: 'Data limite para impugnacao do edital'
    },

    prazo_esclarecimentos: {
      type: FieldTypes.DATE,
      required: false,
      label: 'Prazo para Esclarecimentos',
      description: 'Data limite para pedidos de esclarecimento'
    },

    // Objeto
    objeto_resumo: {
      type: FieldTypes.TEXT,
      required: true,
      label: 'Objeto (Resumo)',
      description: 'Descricao resumida do objeto da licitacao',
      maxLength: 500
    },

    objeto_detalhado: {
      type: FieldTypes.TEXT,
      required: false,
      label: 'Objeto (Detalhado)',
      description: 'Descricao completa do objeto'
    },

    valor_estimado: {
      type: FieldTypes.CURRENCY,
      required: false,
      label: 'Valor Estimado',
      description: 'Valor total estimado da contratacao',
      currency: 'BRL'
    },

    valor_sigilo: {
      type: FieldTypes.BOOLEAN,
      required: false,
      label: 'Valor Sigiloso',
      description: 'Se o valor estimado e sigiloso'
    },

    // Lotes/Itens
    lotes: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Lotes',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          numero: { type: FieldTypes.STRING, label: 'Numero do Lote' },
          descricao: { type: FieldTypes.TEXT, label: 'Descricao' },
          valor_estimado: { type: FieldTypes.CURRENCY, label: 'Valor Estimado' },
          quantidade: { type: FieldTypes.NUMBER, label: 'Quantidade' },
          unidade: { type: FieldTypes.STRING, label: 'Unidade' }
        }
      }
    },

    // Habilitacao
    documentos_habilitacao: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Documentos de Habilitacao',
      description: 'Lista de documentos exigidos para habilitacao',
      items: { type: FieldTypes.STRING }
    },

    habilitacao_juridica: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Habilitacao Juridica',
      items: { type: FieldTypes.STRING }
    },

    regularidade_fiscal: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Regularidade Fiscal',
      items: { type: FieldTypes.STRING }
    },

    qualificacao_tecnica: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Qualificacao Tecnica',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          requisito: { type: FieldTypes.TEXT, label: 'Requisito' },
          comprovacao: { type: FieldTypes.TEXT, label: 'Forma de Comprovacao' },
          quantidade_minima: { type: FieldTypes.STRING, label: 'Quantidade Minima' }
        }
      }
    },

    qualificacao_economica: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Qualificacao Economica-Financeira',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          indice: { type: FieldTypes.STRING, label: 'Indice' },
          valor_minimo: { type: FieldTypes.STRING, label: 'Valor Minimo' },
          formula: { type: FieldTypes.TEXT, label: 'Formula' }
        }
      }
    },

    // Julgamento
    tipo_julgamento: {
      type: FieldTypes.ENUM,
      required: false,
      label: 'Tipo de Julgamento',
      values: [
        'menor_preco',
        'menor_preco_por_item',
        'menor_preco_por_lote',
        'menor_preco_global',
        'tecnica_preco',
        'melhor_tecnica',
        'maior_desconto',
        'maior_lance'
      ]
    },

    criterios_desempate: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Criterios de Desempate',
      items: { type: FieldTypes.STRING }
    },

    margem_preferencia: {
      type: FieldTypes.OBJECT,
      required: false,
      label: 'Margem de Preferencia',
      properties: {
        aplicavel: { type: FieldTypes.BOOLEAN, label: 'Aplicavel' },
        percentual: { type: FieldTypes.NUMBER, label: 'Percentual' },
        beneficiarios: { type: FieldTypes.ARRAY, items: { type: FieldTypes.STRING }, label: 'Beneficiarios' }
      }
    },

    // Contrato
    prazo_vigencia: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Prazo de Vigencia',
      description: 'Prazo de vigencia do contrato resultante'
    },

    prazo_execucao: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Prazo de Execucao',
      description: 'Prazo para execucao do objeto'
    },

    local_execucao: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Local de Execucao',
      description: 'Local onde o objeto sera executado/entregue'
    },

    garantia_contratual: {
      type: FieldTypes.OBJECT,
      required: false,
      label: 'Garantia Contratual',
      properties: {
        exigida: { type: FieldTypes.BOOLEAN, label: 'Exigida' },
        percentual: { type: FieldTypes.NUMBER, label: 'Percentual' },
        modalidades: { type: FieldTypes.ARRAY, items: { type: FieldTypes.STRING }, label: 'Modalidades Aceitas' }
      }
    },

    // Pagamento
    condicoes_pagamento: {
      type: FieldTypes.TEXT,
      required: false,
      label: 'Condicoes de Pagamento',
      description: 'Forma e prazo de pagamento'
    },

    dotacao_orcamentaria: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Dotacao Orcamentaria'
    },

    // Penalidades
    penalidades: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Penalidades',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          tipo: { type: FieldTypes.STRING, label: 'Tipo' },
          descricao: { type: FieldTypes.TEXT, label: 'Descricao' },
          percentual: { type: FieldTypes.NUMBER, label: 'Percentual' }
        }
      }
    },

    // Anexos
    anexos: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Anexos do Edital',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          numero: { type: FieldTypes.STRING, label: 'Numero' },
          nome: { type: FieldTypes.STRING, label: 'Nome' },
          descricao: { type: FieldTypes.TEXT, label: 'Descricao' }
        }
      }
    },

    // Contatos
    pregoeiro: {
      type: FieldTypes.OBJECT,
      required: false,
      label: 'Pregoeiro/Presidente da Comissao',
      properties: {
        nome: { type: FieldTypes.STRING, label: 'Nome' },
        email: { type: FieldTypes.STRING, label: 'Email' },
        telefone: { type: FieldTypes.STRING, label: 'Telefone' }
      }
    },

    // Portal
    portal: {
      type: FieldTypes.ENUM,
      required: false,
      label: 'Portal de Compras',
      values: [
        'comprasnet',
        'bec_sp',
        'licitacoes_e',
        'portal_de_compras_mg',
        'banrisul',
        'outro'
      ]
    },

    link_edital: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Link do Edital'
    }
  },

  // Sections for organized extraction
  sections: [
    { id: 'identificacao', label: 'Identificacao', fields: ['numero_processo', 'modalidade', 'orgao', 'uasg', 'portal', 'link_edital'] },
    { id: 'cronograma', label: 'Cronograma', fields: ['data_publicacao', 'data_abertura', 'prazo_impugnacao', 'prazo_esclarecimentos'] },
    { id: 'objeto', label: 'Objeto', fields: ['objeto_resumo', 'objeto_detalhado', 'valor_estimado', 'valor_sigilo', 'lotes'] },
    { id: 'habilitacao', label: 'Habilitacao', fields: ['documentos_habilitacao', 'habilitacao_juridica', 'regularidade_fiscal', 'qualificacao_tecnica', 'qualificacao_economica'] },
    { id: 'julgamento', label: 'Julgamento', fields: ['tipo_julgamento', 'criterios_desempate', 'margem_preferencia'] },
    { id: 'contratacao', label: 'Contratacao', fields: ['prazo_vigencia', 'prazo_execucao', 'local_execucao', 'garantia_contratual'] },
    { id: 'financeiro', label: 'Financeiro', fields: ['condicoes_pagamento', 'dotacao_orcamentaria'] },
    { id: 'penalidades', label: 'Penalidades', fields: ['penalidades'] },
    { id: 'anexos', label: 'Anexos', fields: ['anexos'] },
    { id: 'contato', label: 'Contato', fields: ['pregoeiro'] }
  ]
};

// Contrato (Contract) Schema
export const ContratoSchema = {
  name: 'contrato',
  displayName: 'Contrato',
  description: 'Schema para contratos publicos e privados',
  version: '1.0.0',

  fields: {
    // Identificacao
    numero_contrato: {
      type: FieldTypes.STRING,
      required: true,
      label: 'Numero do Contrato',
      patterns: [/CONTRATO[:\s]*N[º°]?\s*(\d+[\/.]\d{4})/i]
    },

    tipo_contrato: {
      type: FieldTypes.ENUM,
      required: false,
      label: 'Tipo de Contrato',
      values: [
        'prestacao_servicos',
        'fornecimento',
        'obras',
        'locacao',
        'concessao',
        'parceria',
        'convenio',
        'aditivo'
      ]
    },

    processo_origem: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Processo de Origem',
      description: 'Numero do processo licitatorio de origem'
    },

    // Partes
    contratante: {
      type: FieldTypes.OBJECT,
      required: true,
      label: 'Contratante',
      properties: {
        nome: { type: FieldTypes.STRING, required: true, label: 'Nome/Razao Social' },
        cnpj: { type: FieldTypes.STRING, label: 'CNPJ' },
        endereco: { type: FieldTypes.STRING, label: 'Endereco' },
        representante: { type: FieldTypes.STRING, label: 'Representante Legal' },
        cargo: { type: FieldTypes.STRING, label: 'Cargo' }
      }
    },

    contratada: {
      type: FieldTypes.OBJECT,
      required: true,
      label: 'Contratada',
      properties: {
        nome: { type: FieldTypes.STRING, required: true, label: 'Nome/Razao Social' },
        cnpj: { type: FieldTypes.STRING, label: 'CNPJ' },
        endereco: { type: FieldTypes.STRING, label: 'Endereco' },
        representante: { type: FieldTypes.STRING, label: 'Representante Legal' },
        cargo: { type: FieldTypes.STRING, label: 'Cargo' }
      }
    },

    // Objeto
    objeto: {
      type: FieldTypes.TEXT,
      required: true,
      label: 'Objeto do Contrato'
    },

    descricao_servicos: {
      type: FieldTypes.TEXT,
      required: false,
      label: 'Descricao Detalhada dos Servicos'
    },

    // Valores
    valor_total: {
      type: FieldTypes.CURRENCY,
      required: true,
      label: 'Valor Total',
      currency: 'BRL'
    },

    valor_mensal: {
      type: FieldTypes.CURRENCY,
      required: false,
      label: 'Valor Mensal',
      currency: 'BRL'
    },

    valor_unitario: {
      type: FieldTypes.CURRENCY,
      required: false,
      label: 'Valor Unitario',
      currency: 'BRL'
    },

    // Vigencia
    data_assinatura: {
      type: FieldTypes.DATE,
      required: true,
      label: 'Data de Assinatura'
    },

    vigencia_inicio: {
      type: FieldTypes.DATE,
      required: false,
      label: 'Inicio da Vigencia'
    },

    vigencia_fim: {
      type: FieldTypes.DATE,
      required: false,
      label: 'Fim da Vigencia'
    },

    prazo_vigencia: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Prazo de Vigencia',
      description: 'Ex: 12 meses, 24 meses'
    },

    renovacao_automatica: {
      type: FieldTypes.BOOLEAN,
      required: false,
      label: 'Renovacao Automatica'
    },

    limite_renovacoes: {
      type: FieldTypes.NUMBER,
      required: false,
      label: 'Limite de Renovacoes'
    },

    // Obrigacoes
    obrigacoes_contratante: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Obrigacoes do Contratante',
      items: { type: FieldTypes.TEXT }
    },

    obrigacoes_contratada: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Obrigacoes da Contratada',
      items: { type: FieldTypes.TEXT }
    },

    // Pagamento
    forma_pagamento: {
      type: FieldTypes.TEXT,
      required: false,
      label: 'Forma de Pagamento'
    },

    prazo_pagamento: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Prazo de Pagamento',
      description: 'Ex: 30 dias apos medicao'
    },

    conta_bancaria: {
      type: FieldTypes.OBJECT,
      required: false,
      label: 'Dados Bancarios',
      properties: {
        banco: { type: FieldTypes.STRING, label: 'Banco' },
        agencia: { type: FieldTypes.STRING, label: 'Agencia' },
        conta: { type: FieldTypes.STRING, label: 'Conta' }
      }
    },

    // Reajuste
    indice_reajuste: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Indice de Reajuste',
      description: 'Ex: IPCA, IGP-M, INPC'
    },

    periodicidade_reajuste: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Periodicidade do Reajuste',
      description: 'Ex: Anual, a cada 12 meses'
    },

    data_base_reajuste: {
      type: FieldTypes.DATE,
      required: false,
      label: 'Data Base para Reajuste'
    },

    // Garantias
    garantia_contratual: {
      type: FieldTypes.OBJECT,
      required: false,
      label: 'Garantia Contratual',
      properties: {
        exigida: { type: FieldTypes.BOOLEAN, label: 'Exigida' },
        percentual: { type: FieldTypes.NUMBER, label: 'Percentual' },
        valor: { type: FieldTypes.CURRENCY, label: 'Valor' },
        modalidade: { type: FieldTypes.STRING, label: 'Modalidade' },
        validade: { type: FieldTypes.DATE, label: 'Validade' }
      }
    },

    // SLAs
    slas: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'SLAs (Niveis de Servico)',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          metrica: { type: FieldTypes.STRING, label: 'Metrica' },
          meta: { type: FieldTypes.STRING, label: 'Meta' },
          penalidade: { type: FieldTypes.TEXT, label: 'Penalidade por Descumprimento' }
        }
      }
    },

    // Penalidades
    multas: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Multas',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          tipo: { type: FieldTypes.STRING, label: 'Tipo' },
          percentual: { type: FieldTypes.NUMBER, label: 'Percentual' },
          base_calculo: { type: FieldTypes.STRING, label: 'Base de Calculo' },
          condicao: { type: FieldTypes.TEXT, label: 'Condicao de Aplicacao' }
        }
      }
    },

    penalidades_administrativas: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Penalidades Administrativas',
      items: { type: FieldTypes.TEXT }
    },

    // Rescisao
    clausulas_rescisao: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Clausulas de Rescisao',
      items: { type: FieldTypes.TEXT }
    },

    aviso_previo_rescisao: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Aviso Previo para Rescisao',
      description: 'Ex: 30 dias, 60 dias'
    },

    // Fiscalizacao
    fiscal_contrato: {
      type: FieldTypes.OBJECT,
      required: false,
      label: 'Fiscal do Contrato',
      properties: {
        nome: { type: FieldTypes.STRING, label: 'Nome' },
        cargo: { type: FieldTypes.STRING, label: 'Cargo' },
        matricula: { type: FieldTypes.STRING, label: 'Matricula' }
      }
    },

    gestor_contrato: {
      type: FieldTypes.OBJECT,
      required: false,
      label: 'Gestor do Contrato',
      properties: {
        nome: { type: FieldTypes.STRING, label: 'Nome' },
        cargo: { type: FieldTypes.STRING, label: 'Cargo' },
        matricula: { type: FieldTypes.STRING, label: 'Matricula' }
      }
    },

    // Foro
    foro: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Foro',
      description: 'Foro competente para resolucao de controversias'
    },

    // Anexos
    anexos: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Anexos do Contrato',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          numero: { type: FieldTypes.STRING, label: 'Numero' },
          nome: { type: FieldTypes.STRING, label: 'Nome' },
          descricao: { type: FieldTypes.TEXT, label: 'Descricao' }
        }
      }
    },

    // Testemunhas
    testemunhas: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Testemunhas',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          nome: { type: FieldTypes.STRING, label: 'Nome' },
          cpf: { type: FieldTypes.STRING, label: 'CPF' }
        }
      }
    }
  },

  sections: [
    { id: 'identificacao', label: 'Identificacao', fields: ['numero_contrato', 'tipo_contrato', 'processo_origem'] },
    { id: 'partes', label: 'Partes', fields: ['contratante', 'contratada'] },
    { id: 'objeto', label: 'Objeto', fields: ['objeto', 'descricao_servicos'] },
    { id: 'valores', label: 'Valores', fields: ['valor_total', 'valor_mensal', 'valor_unitario'] },
    { id: 'vigencia', label: 'Vigencia', fields: ['data_assinatura', 'vigencia_inicio', 'vigencia_fim', 'prazo_vigencia', 'renovacao_automatica', 'limite_renovacoes'] },
    { id: 'obrigacoes', label: 'Obrigacoes', fields: ['obrigacoes_contratante', 'obrigacoes_contratada'] },
    { id: 'pagamento', label: 'Pagamento', fields: ['forma_pagamento', 'prazo_pagamento', 'conta_bancaria'] },
    { id: 'reajuste', label: 'Reajuste', fields: ['indice_reajuste', 'periodicidade_reajuste', 'data_base_reajuste'] },
    { id: 'garantias', label: 'Garantias', fields: ['garantia_contratual'] },
    { id: 'sla', label: 'SLAs', fields: ['slas'] },
    { id: 'penalidades', label: 'Penalidades', fields: ['multas', 'penalidades_administrativas'] },
    { id: 'rescisao', label: 'Rescisao', fields: ['clausulas_rescisao', 'aviso_previo_rescisao'] },
    { id: 'fiscalizacao', label: 'Fiscalizacao', fields: ['fiscal_contrato', 'gestor_contrato'] },
    { id: 'disposicoes', label: 'Disposicoes Finais', fields: ['foro', 'anexos', 'testemunhas'] }
  ]
};

// Termo de Referencia Schema
export const TermoReferenciaSchema = {
  name: 'termo_referencia',
  displayName: 'Termo de Referencia',
  description: 'Schema para Termos de Referencia de licitacoes',
  version: '1.0.0',

  fields: {
    objeto: {
      type: FieldTypes.TEXT,
      required: true,
      label: 'Objeto'
    },

    justificativa: {
      type: FieldTypes.TEXT,
      required: true,
      label: 'Justificativa da Contratacao'
    },

    especificacoes_tecnicas: {
      type: FieldTypes.TEXT,
      required: true,
      label: 'Especificacoes Tecnicas'
    },

    quantidades: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Quantidades',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          item: { type: FieldTypes.STRING, label: 'Item' },
          descricao: { type: FieldTypes.TEXT, label: 'Descricao' },
          unidade: { type: FieldTypes.STRING, label: 'Unidade' },
          quantidade: { type: FieldTypes.NUMBER, label: 'Quantidade' },
          valor_unitario: { type: FieldTypes.CURRENCY, label: 'Valor Unitario' },
          valor_total: { type: FieldTypes.CURRENCY, label: 'Valor Total' }
        }
      }
    },

    local_execucao: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Local de Execucao'
    },

    prazo_execucao: {
      type: FieldTypes.STRING,
      required: false,
      label: 'Prazo de Execucao'
    },

    cronograma: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Cronograma',
      items: {
        type: FieldTypes.OBJECT,
        properties: {
          etapa: { type: FieldTypes.STRING, label: 'Etapa' },
          descricao: { type: FieldTypes.TEXT, label: 'Descricao' },
          prazo: { type: FieldTypes.STRING, label: 'Prazo' }
        }
      }
    },

    criterios_aceitacao: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Criterios de Aceitacao',
      items: { type: FieldTypes.TEXT }
    },

    obrigacoes_contratante: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Obrigacoes do Contratante',
      items: { type: FieldTypes.TEXT }
    },

    obrigacoes_contratada: {
      type: FieldTypes.ARRAY,
      required: false,
      label: 'Obrigacoes da Contratada',
      items: { type: FieldTypes.TEXT }
    },

    gestao_contrato: {
      type: FieldTypes.TEXT,
      required: false,
      label: 'Gestao e Fiscalizacao do Contrato'
    }
  },

  sections: [
    { id: 'objeto', label: 'Objeto e Justificativa', fields: ['objeto', 'justificativa'] },
    { id: 'especificacoes', label: 'Especificacoes', fields: ['especificacoes_tecnicas', 'quantidades'] },
    { id: 'execucao', label: 'Execucao', fields: ['local_execucao', 'prazo_execucao', 'cronograma'] },
    { id: 'aceitacao', label: 'Aceitacao', fields: ['criterios_aceitacao'] },
    { id: 'obrigacoes', label: 'Obrigacoes', fields: ['obrigacoes_contratante', 'obrigacoes_contratada'] },
    { id: 'gestao', label: 'Gestao', fields: ['gestao_contrato'] }
  ]
};

// Map of all available schemas
export const DocumentSchemas = {
  licitacao: LicitacaoSchema,
  contrato: ContratoSchema,
  termo_referencia: TermoReferenciaSchema
};

// Get schema by type
export function getSchema(schemaType) {
  return DocumentSchemas[schemaType] || null;
}

// Get all schema names
export function getSchemaTypes() {
  return Object.keys(DocumentSchemas);
}

// Validate a field value against its type definition
export function validateFieldValue(value, fieldDef) {
  if (value === null || value === undefined) {
    return { valid: !fieldDef.required, error: fieldDef.required ? 'Campo obrigatorio' : null };
  }

  switch (fieldDef.type) {
    case FieldTypes.STRING:
    case FieldTypes.TEXT:
      if (typeof value !== 'string') return { valid: false, error: 'Valor deve ser texto' };
      if (fieldDef.maxLength && value.length > fieldDef.maxLength) {
        return { valid: false, error: `Texto excede ${fieldDef.maxLength} caracteres` };
      }
      return { valid: true, error: null };

    case FieldTypes.NUMBER:
      if (typeof value !== 'number' || isNaN(value)) return { valid: false, error: 'Valor deve ser numerico' };
      return { valid: true, error: null };

    case FieldTypes.BOOLEAN:
      if (typeof value !== 'boolean') return { valid: false, error: 'Valor deve ser booleano' };
      return { valid: true, error: null };

    case FieldTypes.DATE:
    case FieldTypes.DATETIME:
      const dateRegex = /^\d{4}-\d{2}-\d{2}/;
      if (!dateRegex.test(value)) return { valid: false, error: 'Formato de data invalido' };
      return { valid: true, error: null };

    case FieldTypes.CURRENCY:
      if (typeof value !== 'number' || isNaN(value)) return { valid: false, error: 'Valor monetario invalido' };
      return { valid: true, error: null };

    case FieldTypes.ENUM:
      if (!fieldDef.values.includes(value)) {
        return { valid: false, error: `Valor deve ser um de: ${fieldDef.values.join(', ')}` };
      }
      return { valid: true, error: null };

    case FieldTypes.ARRAY:
      if (!Array.isArray(value)) return { valid: false, error: 'Valor deve ser uma lista' };
      return { valid: true, error: null };

    case FieldTypes.OBJECT:
      if (typeof value !== 'object' || value === null) return { valid: false, error: 'Valor deve ser um objeto' };
      return { valid: true, error: null };

    default:
      return { valid: true, error: null };
  }
}

export default DocumentSchemas;
