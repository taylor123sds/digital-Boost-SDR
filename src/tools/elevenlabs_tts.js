import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Inicializar cliente ElevenLabs
let elevenLabsClient = null;
if (ELEVENLABS_API_KEY) {
  elevenLabsClient = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
  console.log(" ElevenLabs Client inicializado");
} else {
  console.warn("  ELEVENLABS_API_KEY não encontrada - TTS premium desabilitado");
}

/**
 * Gera áudio usando ElevenLabs TTS
 * @param {string} text - Texto para converter em áudio
 * @param {string} voiceId - ID da voz (default: voz feminina brasileira natural)
 * @returns {Promise<Buffer>} - Buffer do áudio gerado
 */
export async function generateElevenLabsTTS(text, voiceId = "21m00Tcm4TlvDq8ikWAM") {
  if (!elevenLabsClient) {
    throw new Error("ElevenLabs API key não configurada");
  }

  try {
    console.log(` Gerando TTS com ElevenLabs (${text.length} caracteres)...`);

    const audio = await elevenLabsClient.textToSpeech.convert(voiceId, {
      text: text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
      }
    });

    // Converter stream para buffer
    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    console.log(` TTS gerado com sucesso (${audioBuffer.length} bytes)`);
    return audioBuffer;

  } catch (error) {
    console.error(" Erro ao gerar TTS com ElevenLabs:", error);
    throw error;
  }
}

/**
 * Salva áudio em arquivo MP3
 * @param {Buffer} audioBuffer - Buffer do áudio
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @returns {Promise<string>} - Caminho do arquivo salvo
 */
export async function saveAudioToFile(audioBuffer, filename) {
  const audioDir = path.join(__dirname, "../../audio");

  // Criar diretório se não existir
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  const filePath = path.join(audioDir, `${filename}.mp3`);
  fs.writeFileSync(filePath, audioBuffer);

  console.log(` Áudio salvo em: ${filePath}`);
  return filePath;
}

/**
 * Gera e salva áudio explicativo
 * @param {string} text - Texto para converter
 * @param {string} filename - Nome do arquivo
 * @returns {Promise<string>} - Caminho do arquivo salvo
 */
export async function generateAndSaveAudio(text, filename) {
  const audioBuffer = await generateElevenLabsTTS(text);
  const filePath = await saveAudioToFile(audioBuffer, filename);
  return filePath;
}

// Conteúdo explicativo curto sobre a Digital Boost (aprox. 20 segundos)
export const DIGITAL_BOOST_PRESENTATION_SHORT = `
Olá! Estou te enviando a apresentação completa da Digital Boost.

Somos uma empresa de Growth e Inteligência Artificial para pequenas e médias empresas. Organizamos atendimento, dados e vendas criando agentes de I A que conversam no WhatsApp.

Dá uma olhada no P D F que estou enviando para conhecer todos os detalhes sobre nosso trabalho!
`;
