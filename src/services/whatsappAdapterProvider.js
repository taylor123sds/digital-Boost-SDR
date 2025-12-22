import { getContainer } from '../config/di-container.js';

let adapterPromise = null;

export async function getWhatsAppAdapter() {
  if (!adapterPromise) {
    const container = getContainer();
    adapterPromise = container.resolve('whatsappAdapter');
  }

  return adapterPromise;
}

export async function sendWhatsAppText(number, text) {
  const adapter = await getWhatsAppAdapter();
  return adapter.sendTextMessage(number, text);
}

export async function sendWhatsAppAudio(number, audio) {
  const adapter = await getWhatsAppAdapter();
  return adapter.sendAudioMessage(number, audio);
}

export async function sendWhatsAppMedia(number, media, options = {}) {
  const adapter = await getWhatsAppAdapter();
  return adapter.sendMediaMessage(number, media, options);
}

