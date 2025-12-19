/**
 * @file audit-conversations.js
 * @description Analisa conversas desde uma data e gera relatório de erros
 *
 * USO:
 *   node scripts/audit-conversations.js           # Desde ontem
 *   node scripts/audit-conversations.js 2024-12-01 # Desde data específica
 *
 * @author ORBION Team
 */

import conversationSupervisor from '../src/intelligence/ConversationSupervisor.js';
//  FIX: Usar getDatabase() que verifica e reconecta se necessário
import { getDatabase } from '../src/db/index.js';

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════

const args = process.argv.slice(2);

// Calcular "desde ontem" por padrão
function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday.toISOString();
}

const sinceDate = args[0] || getYesterdayDate();

// ═══════════════════════════════════════════════════════════════
// EXECUÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║      AUDITORIA DE CONVERSAS - SUPERVISOR ORBION                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n Analisando conversas desde: ${new Date(sinceDate).toLocaleString('pt-BR')}\n`);

  //  FIX: Obter conexão fresh
  const db = getDatabase();
  // Buscar conversas
  const conversations = db.prepare(`
    SELECT DISTINCT contact_id, COUNT(*) as message_count, MIN(created_at) as first_msg, MAX(created_at) as last_msg
    FROM whatsapp_messages
    WHERE created_at >= ?
    AND contact_id IS NOT NULL
    GROUP BY contact_id
    ORDER BY last_msg DESC
  `).all(sinceDate);

  if (!conversations || conversations.length === 0) {
    console.log(' Nenhuma conversa encontrada desde a data especificada.\n');
    return;
  }

  console.log(` Encontradas ${conversations.length} conversas para análise\n`);
  console.log('═'.repeat(80));

  // Estatísticas globais
  const stats = {
    total: conversations.length,
    audited: 0,
    errorCount: 0,
    byQuality: { good: 0, medium: 0, poor: 0, unknown: 0 },
    errorTypes: {},
    criticalErrors: [],
    recommendations: new Set()
  };

  // Auditar cada conversa
  for (const conv of conversations) {
    console.log(`\n Auditando: ${conv.contact_id}`);
    console.log(`   Mensagens: ${conv.message_count} | Período: ${new Date(conv.first_msg).toLocaleString('pt-BR')} - ${new Date(conv.last_msg).toLocaleString('pt-BR')}`);

    try {
      const audit = await conversationSupervisor.auditConversation(conv.contact_id);

      if (audit.success) {
        stats.audited++;
        const quality = audit.overall_quality || 'unknown';
        stats.byQuality[quality] = (stats.byQuality[quality] || 0) + 1;

        if (audit.errors && audit.errors.length > 0) {
          stats.errorCount += audit.errors.length;
          console.log(`     ${audit.errors.length} erro(s) encontrado(s):`);

          for (const error of audit.errors) {
            const errorType = error.error_type || 'unknown';
            stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + 1;

            // Mostrar erros críticos
            if (error.severity === 'critical') {
              console.log(`       CRÍTICO: ${error.what_went_wrong}`);
              stats.criticalErrors.push({
                contact: conv.contact_id,
                ...error
              });
            } else if (error.severity === 'medium') {
              console.log(`       MÉDIO: ${error.what_went_wrong?.substring(0, 60)}...`);
            }
          }
        } else {
          console.log(`    Conversa OK`);
        }

        // Coletar recomendações
        if (audit.recommendations) {
          audit.recommendations.forEach(r => stats.recommendations.add(r));
        }
      } else {
        console.log(`    Erro na auditoria: ${audit.error}`);
      }

      // Pausa para não sobrecarregar API
      await new Promise(r => setTimeout(r, 1500));

    } catch (error) {
      console.log(`    Erro: ${error.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RELATÓRIO FINAL
  // ═══════════════════════════════════════════════════════════════

  console.log('\n\n' + '═'.repeat(80));
  console.log(' RELATÓRIO FINAL DA AUDITORIA');
  console.log('═'.repeat(80));

  console.log(`\n ESTATÍSTICAS GERAIS:`);
  console.log(`   Total de conversas: ${stats.total}`);
  console.log(`   Auditadas com sucesso: ${stats.audited}`);
  console.log(`   Erros encontrados: ${stats.errorCount}`);

  console.log(`\n QUALIDADE DAS CONVERSAS:`);
  console.log(`    Boas: ${stats.byQuality.good}`);
  console.log(`    Médias: ${stats.byQuality.medium}`);
  console.log(`    Ruins: ${stats.byQuality.poor}`);
  if (stats.byQuality.unknown > 0) {
    console.log(`    Não avaliadas: ${stats.byQuality.unknown}`);
  }

  if (Object.keys(stats.errorTypes).length > 0) {
    console.log(`\n TIPOS DE ERROS MAIS FREQUENTES:`);
    const sortedErrors = Object.entries(stats.errorTypes)
      .sort((a, b) => b[1] - a[1]);

    for (const [type, count] of sortedErrors) {
      const icon = type === 'bot_not_detected' ? '' :
                   type === 'rejection_ignored' ? '' :
                   type === 'context_misunderstood' ? '' :
                   type === 'tone_wrong' ? '' :
                   type === 'spin_forced' ? '' : '';
      console.log(`   ${icon} ${type}: ${count} ocorrências`);
    }
  }

  if (stats.criticalErrors.length > 0) {
    console.log(`\n ERROS CRÍTICOS DETALHADOS:`);
    for (const error of stats.criticalErrors.slice(0, 5)) {
      console.log(`\n    Contato: ${error.contact}`);
      console.log(`    Erro: ${error.what_went_wrong}`);
      console.log(`    Deveria: ${error.what_should_have_done}`);
    }
    if (stats.criticalErrors.length > 5) {
      console.log(`\n   ... e mais ${stats.criticalErrors.length - 5} erros críticos`);
    }
  }

  if (stats.recommendations.size > 0) {
    console.log(`\n RECOMENDAÇÕES DE MELHORIA:`);
    const recs = Array.from(stats.recommendations).slice(0, 10);
    for (const rec of recs) {
      console.log(`    ${rec}`);
    }
  }

  // Salvar relatório em arquivo
  const reportPath = `/tmp/audit_report_${Date.now()}.json`;
  const report = {
    date: new Date().toISOString(),
    sinceDate,
    stats: {
      ...stats,
      recommendations: Array.from(stats.recommendations)
    }
  };

  try {
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n Relatório salvo em: ${reportPath}`);
  } catch (e) {
    // Ignorar se não conseguir salvar
  }

  console.log('\n' + '═'.repeat(80));
  console.log(' AUDITORIA CONCLUÍDA');
  console.log('═'.repeat(80) + '\n');
}

main().catch(error => {
  console.error(' Erro fatal:', error);
  process.exit(1);
});
