import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Corrige números de telefone de 13 para 12 dígitos
 * Remove o último dígito de números que têm 13 dígitos
 */
function fixPhoneNumber(phone) {
  // Remove tudo que não é dígito
  let cleaned = phone.replace(/\D/g, '');
  
  // Se tem 13 dígitos e começa com 5584, remove o último dígito
  if (cleaned.length === 13 && cleaned.startsWith('5584')) {
    cleaned = cleaned.substring(0, 12);
    console.log(`✅ Corrigido: ${phone} -> ${cleaned}`);
    return cleaned;
  }
  
  // Se já tem 12 dígitos e começa com 5584, está OK
  if (cleaned.length === 12 && cleaned.startsWith('5584')) {
    return cleaned;
  }
  
  console.log(`⚠️ Número não alterado: ${phone}`);
  return cleaned;
}

// Lê o arquivo CSV
const csvPath = path.join(__dirname, 'data', 'leads', 'leads_natal.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

console.log('📱 Corrigindo números de telefone de 13 para 12 dígitos...\n');

// Processa linha por linha
const processedLines = lines.map((line, index) => {
  // Pula header
  if (index === 0) return line;
  
  // Pula linhas vazias
  if (!line.trim()) return line;
  
  // Divide os campos
  const parts = line.split(',');
  if (parts.length < 2) return line;
  
  // Corrige o número (segunda coluna)
  const originalPhone = parts[1];
  const fixedPhone = fixPhoneNumber(originalPhone);
  
  if (originalPhone !== fixedPhone) {
    parts[1] = fixedPhone;
  }
  
  return parts.join(',');
});

// Salva o arquivo atualizado
fs.writeFileSync(csvPath, processedLines.join('\n'));

console.log('\n📱 Correção de números concluída!');
console.log(`📄 Arquivo atualizado: ${csvPath}`);

// Estatísticas
const totalLines = lines.length - 1; // menos o header
const validLines = processedLines.filter(line => line.trim()).length - 1;
console.log(`📊 Total de leads processadas: ${validLines}/${totalLines}`);