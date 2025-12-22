/**
 * @file digital_boost_audio_service.js
 * @description Serviço para envio de áudio explicativo do Digital Boost
 * Extraído de response_manager.js para eliminar dependência circular
 */

/**
 * Envia áudio explicativo do Digital Boost para o contato
 * @param {string} to - Número do destinatário
 * @returns {Promise<Object>} Resultado do envio
 */
export async function sendDigitalBoostAudio(to) {
  try {
    console.log(` [DIGITAL-BOOST-AUDIO] Enviando áudio explicativo para ${to}`);

    const { sendDigitalBoostAudioExplanation } = await import('../tools/digital_boost_explainer.js');
    const { sendWhatsAppAudio } = await import('./whatsappAdapterProvider.js');

    // Função wrapper para enviar áudio
    const sendAudioFunc = async (recipient, audioPath) => {
      return await sendWhatsAppAudio(recipient, audioPath);
    };

    const result = await sendDigitalBoostAudioExplanation(to, sendAudioFunc);

    console.log(` [DIGITAL-BOOST-AUDIO] Áudio enviado com sucesso para ${to}`);

    return {
      sent: true,
      type: 'audio',
      result
    };

  } catch (error) {
    console.error(` [DIGITAL-BOOST-AUDIO] Erro ao enviar áudio para ${to}:`, error);
    throw error;
  }
}
