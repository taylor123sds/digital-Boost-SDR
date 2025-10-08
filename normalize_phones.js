import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Normaliza número de telefone para formato WhatsApp
 * Regras:
 * - Deve ter 55 (Brasil)
 * - DDD 84 (Natal)
 * - Celular deve ter 9 dígitos (9XXXX-XXXX)
 * - Fixo deve ter 8 dígitos (3XXX-XXXX ou 2XXX-XXXX)
 */
function normalizePhone(phone) {
  // Remove tudo que não é dígito
  let cleaned = phone.replace(/\D/g, '');
  
  // Se não tem o código do país, adiciona
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  // Extrai as partes
  const countryCode = cleaned.substring(0, 2); // 55
  const areaCode = cleaned.substring(2, 4); // 84
  let number = cleaned.substring(4); // resto
  
  // Verifica se é Natal/RN (84)
  if (areaCode !== '84') {
    console.log(`⚠️ DDD diferente de 84: ${phone} -> ${areaCode}`);
    return cleaned; // Retorna como está
  }
  
  // Se tem 8 dígitos e começa com 9, está OK (celular)
  if (number.length === 8 && number.startsWith('9')) {
    // Adiciona o 9 extra para celular (formato novo)
    number = '9' + number;
  }
  // Se tem 9 dígitos e começa com 9, está OK (celular novo formato)
  else if (number.length === 9 && number.startsWith('9')) {
    // Já está correto
  }
  // Se tem 8 dígitos e começa com 2, 3 ou 4, é fixo
  else if (number.length === 8 && (number.startsWith('2') || number.startsWith('3') || number.startsWith('4'))) {
    // Fixo, mantém como está
  }
  // Se é um número placeholder (999000X, etc) - de teste
  else if (number.startsWith('99900')) {
    // Converte para formato de celular válido adicionando 9 na frente
    number = '9' + number;
  }
  // Se tem 7 dígitos começando com 999, adiciona dígitos para formar celular
  else if (number.length === 7 && number.startsWith('999')) {
    // Adiciona 99 na frente para formar celular válido
    number = '99' + number;
  }
  // Casos especiais
  else {
    console.log(`⚠️ Formato não reconhecido: ${phone} -> ${number}`);
  }
  
  return countryCode + areaCode + number;
}

// Lê o arquivo CSV
const csvPath = path.join(__dirname, 'data', 'leads', 'leads_natal.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// Processa linha por linha
const processedLines = lines.map((line, index) => {
  // Pula header
  if (index === 0) return line;
  
  // Pula linhas vazias
  if (!line.trim()) return line;
  
  // Divide os campos (cuidado com vírgulas dentro de aspas)
  const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
  if (!parts || parts.length < 2) return line;
  
  // Normaliza o número (segunda coluna)
  const originalPhone = parts[1].replace(/"/g, '');
  const normalizedPhone = normalizePhone(originalPhone);
  
  if (originalPhone !== normalizedPhone) {
    console.log(`✅ ${parts[0]}: ${originalPhone} -> ${normalizedPhone}`);
    parts[1] = normalizedPhone;
  }
  
  return parts.join(',');
});

// Salva o arquivo atualizado
const outputPath = path.join(__dirname, 'data', 'leads', 'leads_natal_normalized.csv');
fs.writeFileSync(outputPath, processedLines.join('\n'));

console.log('\n📱 Normalização concluída!');
console.log(`📄 Arquivo salvo em: ${outputPath}`);

// Estatísticas
const totalLines = lines.length - 1; // menos o header
const validLines = processedLines.filter(line => line.trim()).length - 1;
console.log(`📊 Total de leads processadas: ${validLines}/${totalLines}`);