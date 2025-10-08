/**
 * Análise profunda do arquivo criptografado do WhatsApp
 * Para descobrir se há estruturas ocultas
 */

import { decryptWhatsAppMedia } from './src/tools/whatsapp_crypto.js';
import fs from 'fs';

// Dados reais do webhook
const realData = {
  url: "https://mmg.whatsapp.net/v/t62.7117-24/25402015_2214555455639485_8059266388525223773_n.enc?ccb=11-4&oh=01_Q5Aa2QEPHFzXNkMyCkX4O6Ced9U96riirqO8XueLv-SyW03lIw&oe=68E1304B&_nc_sid=5e03e0&mms3=true",
  mediaKey: "50TsbBjZr7kmjiG6h7ooMwwfPIjYUB1QwfLA8VHRZvU=",
  fileLength: "16499"
};

async function analyzeEncryptedStructure() {
  try {
    console.log('🔍 ANÁLISE PROFUNDA: Estrutura do arquivo criptografado WhatsApp');
    
    // Baixar arquivo criptografado
    const response = await fetch(realData.url);
    const encryptedData = Buffer.from(await response.arrayBuffer());
    
    console.log(`📊 Arquivo criptografado: ${encryptedData.length} bytes`);
    console.log(`📏 Tamanho esperado descriptografado: ${realData.fileLength} bytes`);
    
    // Analisar estrutura do arquivo criptografado
    console.log('\n🔍 ANÁLISE DO ARQUIVO CRIPTOGRAFADO:');
    console.log(`   - Primeiros 32 bytes: ${encryptedData.slice(0, 32).toString('hex')}`);
    console.log(`   - Últimos 32 bytes: ${encryptedData.slice(-32).toString('hex')}`);
    
    // MAC está nos últimos 10 bytes
    const macSize = 10;
    const encryptedContent = encryptedData.slice(0, encryptedData.length - macSize);
    const fileMac = encryptedData.slice(-macSize);
    
    console.log(`\n🔐 ESTRUTURA DE CRIPTOGRAFIA:`);
    console.log(`   - Dados criptografados: ${encryptedContent.length} bytes`);
    console.log(`   - MAC (últimos 10 bytes): ${fileMac.toString('hex')}`);
    
    // Tentar descriptografar com diferentes offsets para encontrar dados válidos
    console.log('\n🧪 TENTANDO DESCRIPTOGRAFIA COM DIFERENTES OFFSETS:');
    
    for (let offset = 0; offset <= 64; offset += 16) {
      console.log(`\n📍 Testando offset: ${offset} bytes`);
      
      try {
        // Aplicar offset aos dados criptografados
        const adjustedData = encryptedContent.slice(offset);
        const testData = Buffer.concat([adjustedData, fileMac]);
        
        if (testData.length < 32) {
          console.log('   ⏭️ Dados muito pequenos, pulando...');
          continue;
        }
        
        const decrypted = decryptWhatsAppMedia(testData, realData.mediaKey, 'audio', parseInt(realData.fileLength) - offset);
        
        if (decrypted && decrypted.length > 4) {
          const header = decrypted.slice(0, 4).toString('hex');
          console.log(`   📋 Header com offset ${offset}: ${header}`);
          
          if (header === '4f676753') {
            console.log('   🎉 ENCONTRADO! Header OGG válido com offset:', offset);
            
            // Salvar arquivo válido
            fs.writeFileSync(`valid_ogg_offset_${offset}.ogg`, decrypted);
            console.log(`   💾 Arquivo salvo: valid_ogg_offset_${offset}.ogg`);
            break;
          } else if (header.startsWith('fff')) {
            console.log('   🎵 Header MP3 detectado com offset:', offset);
          }
        }
      } catch (error) {
        console.log(`   ❌ Erro com offset ${offset}:`, error.message.substring(0, 50));
      }
    }
    
    // Tentar análise de padrões nos dados
    console.log('\n🔍 ANÁLISE DE PADRÕES:');
    const patterns = [
      '4f676753', // OggS
      'fff3', 'fff2', // MP3
      '52494646', // RIFF (WAV)
      '00000000', // Null bytes
      'ffffffff'  // All FF
    ];
    
    for (let i = 0; i < Math.min(encryptedContent.length - 4, 100); i++) {
      const segment = encryptedContent.slice(i, i + 4).toString('hex');
      for (const pattern of patterns) {
        if (segment === pattern) {
          console.log(`   📍 Padrão ${pattern} encontrado no offset ${i}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
  }
}

// Executar análise
analyzeEncryptedStructure();