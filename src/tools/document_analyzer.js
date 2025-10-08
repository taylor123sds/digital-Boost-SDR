/**
 * Document Analyzer - Analisador de Documentos Multimídia para ORBION
 * Suporte para PDFs, imagens, áudio e vídeo
 */

import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';

// Import dynamic para evitar problemas no carregamento inicial
let pdf = null;
let pdf2pic = null;
let sharp = null;

async function loadPdfModules() {
    if (!pdf) {
        const pdfModule = await import('pdf-parse');
        pdf = pdfModule.default;
    }
    if (!pdf2pic) {
        const pdf2picModule = await import('pdf2pic');
        pdf2pic = pdf2picModule.default;
    }
}

async function loadSharp() {
    if (!sharp) {
        try {
            const sharpModule = await import('sharp');
            sharp = sharpModule.default;
        } catch (error) {
            console.log('⚠️ Sharp não disponível, análise de imagens limitada:', error.message);
            sharp = null;
        }
    }
    return sharp;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Inicializar OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Classe principal para análise de documentos
 */
class DocumentAnalyzer {
    constructor() {
        this.supportedTypes = {
            pdf: ['.pdf'],
            image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
            audio: ['.mp3', '.wav', '.m4a', '.ogg', '.flac'],
            video: ['.mp4', '.avi', '.mov', '.mkv', '.webm']
        };
        this.uploadsDir = path.join(__dirname, '../../uploads');
        this.ensureUploadsDir();
    }

    ensureUploadsDir() {
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    /**
     * Analisar arquivo baseado no tipo
     */
    async analyzeFile(filePath, options = {}) {
        try {
            const fileExt = path.extname(filePath).toLowerCase();
            const fileName = path.basename(filePath);
            
            console.log(`🔍 Analisando arquivo: ${fileName}`);
            
            // Determinar tipo de arquivo
            let fileType = null;
            for (const [type, extensions] of Object.entries(this.supportedTypes)) {
                if (extensions.includes(fileExt)) {
                    fileType = type;
                    break;
                }
            }

            if (!fileType) {
                throw new Error(`Tipo de arquivo não suportado: ${fileExt}`);
            }

            // Analisar baseado no tipo
            let result = {
                fileName,
                fileType,
                fileSize: fs.statSync(filePath).size,
                analyzedAt: new Date().toISOString(),
                content: null,
                summary: null,
                metadata: {}
            };

            switch (fileType) {
                case 'pdf':
                    result = await this.analyzePDF(filePath, result, options);
                    break;
                case 'image':
                    result = await this.analyzeImage(filePath, result, options);
                    break;
                case 'audio':
                    result = await this.analyzeAudio(filePath, result, options);
                    break;
                case 'video':
                    result = await this.analyzeVideo(filePath, result, options);
                    break;
            }

            return result;
        } catch (error) {
            console.error('❌ Erro na análise do arquivo:', error);
            throw error;
        }
    }

    /**
     * Analisar PDF
     */
    async analyzePDF(filePath, result, options) {
        console.log('📄 Analisando PDF...');
        
        try {
            // Carregar módulos PDF se necessário
            await loadPdfModules();
            
            // Extrair texto do PDF
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdf(dataBuffer);
            
            result.content = pdfData.text;
            result.metadata = {
                pages: pdfData.numpages,
                info: pdfData.info || {},
                version: pdfData.version
            };

            // Se o PDF não tem texto (escaneado), tentar OCR
            if (!result.content || result.content.trim().length < 50) {
                console.log('📸 PDF parece ser escaneado, convertendo para imagem para OCR...');
                result = await this.performOCROnPDF(filePath, result);
            }

            // Gerar resumo inteligente
            if (result.content && result.content.length > 100) {
                result.summary = await this.generateSummary(result.content, 'pdf');
                result.keyPoints = await this.extractKeyPoints(result.content);
            }

            return result;
        } catch (error) {
            console.error('❌ Erro na análise de PDF:', error);
            throw error;
        }
    }

    /**
     * Realizar OCR em PDF escaneado
     */
    async performOCROnPDF(filePath, result) {
        try {
            await loadPdfModules();
            
            const convert = pdf2pic.fromPath(filePath, {
                density: 300,
                saveFilename: "page",
                savePath: this.uploadsDir,
                format: "png",
                width: 2000,
                height: 2000
            });

            // Converter primeira página para testar
            const convertResult = await convert(1);
            
            if (convertResult && convertResult.path) {
                // Usar OpenAI Vision para OCR
                const imageBuffer = fs.readFileSync(convertResult.path);
                const base64Image = imageBuffer.toString('base64');
                
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Por favor, extraia todo o texto desta imagem de documento. Retorne apenas o texto extraído, mantendo a formatação original quando possível."
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/png;base64,${base64Image}`
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 4000
                });

                result.content = response.choices[0].message.content;
                result.metadata.ocrUsed = true;
                
                // Limpar arquivo temporário
                fs.unlinkSync(convertResult.path);
            }

            return result;
        } catch (error) {
            console.error('❌ Erro no OCR:', error);
            result.content = 'Erro ao extrair texto do documento escaneado';
            return result;
        }
    }

    /**
     * Analisar imagem
     */
    async analyzeImage(filePath, result, options) {
        console.log('🖼️ Analisando imagem...');
        
        try {
            const sharpInstance = await loadSharp();
            
            // Obter metadados da imagem
            let metadata = { width: 0, height: 0, format: 'unknown' };
            let imageBuffer = fs.readFileSync(filePath);
            
            if (sharpInstance) {
                try {
                    metadata = await sharpInstance(filePath).metadata();
                    result.metadata = {
                        width: metadata.width,
                        height: metadata.height,
                        format: metadata.format,
                        colorSpace: metadata.space,
                        hasAlpha: metadata.hasAlpha,
                        density: metadata.density
                    };

                    // Redimensionar se muito grande (para economizar tokens)
                    if (metadata.width > 2000 || metadata.height > 2000) {
                        imageBuffer = await sharpInstance(filePath)
                            .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
                            .jpeg({ quality: 85 })
                            .toBuffer();
                    }
                } catch (sharpError) {
                    console.log('⚠️ Erro no Sharp, usando imagem original:', sharpError.message);
                }
            } else {
                result.metadata = { note: 'Sharp não disponível - metadados limitados' };
            }

            const base64Image = imageBuffer.toString('base64');

            // Analisar com OpenAI Vision
            const analysisPrompt = options.customPrompt || 
                "Analise esta imagem detalhadamente. Descreva o que você vê, identifique objetos, pessoas, texto visível, contexto e qualquer informação relevante. Se houver texto na imagem, extraia-o completamente.";

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: analysisPrompt
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 4000
            });

            result.content = response.choices[0].message.content;
            result.summary = await this.generateSummary(result.content, 'image');

            return result;
        } catch (error) {
            console.error('❌ Erro na análise de imagem:', error);
            throw error;
        }
    }

    /**
     * Analisar áudio
     */
    async analyzeAudio(filePath, result, options) {
        console.log('🎵 Analisando áudio...');
        
        try {
            // Converter para formato compatível se necessário
            const tempWavFile = path.join(this.uploadsDir, `temp_${Date.now()}.wav`);
            
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .toFormat('wav')
                    .audioFrequency(16000)
                    .audioChannels(1)
                    .on('end', resolve)
                    .on('error', reject)
                    .save(tempWavFile);
            });

            // Transcrever com Whisper
            console.log('🎙️ Transcrevendo áudio...');
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempWavFile),
                model: "whisper-1",
                language: "pt"
            });

            result.content = transcription.text;
            result.metadata.transcriptionModel = "whisper-1";
            result.metadata.language = "pt";

            // Gerar resumo e análise
            if (result.content && result.content.length > 50) {
                result.summary = await this.generateSummary(result.content, 'audio');
                result.keyPoints = await this.extractKeyPoints(result.content);
                result.sentiment = await this.analyzeSentiment(result.content);
            }

            // Limpar arquivo temporário
            fs.unlinkSync(tempWavFile);

            return result;
        } catch (error) {
            console.error('❌ Erro na análise de áudio:', error);
            throw error;
        }
    }

    /**
     * Analisar vídeo
     */
    async analyzeVideo(filePath, result, options) {
        console.log('🎬 Analisando vídeo...');
        
        try {
            // Extrair metadados do vídeo
            const metadata = await this.getVideoMetadata(filePath);
            result.metadata = metadata;

            // Extrair áudio para transcrição
            const tempAudioFile = path.join(this.uploadsDir, `temp_audio_${Date.now()}.wav`);
            
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .output(tempAudioFile)
                    .audioCodec('pcm_s16le')
                    .audioFrequency(16000)
                    .audioChannels(1)
                    .noVideo()
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });

            // Transcrever áudio
            console.log('🎙️ Transcrevendo áudio do vídeo...');
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(tempAudioFile),
                model: "whisper-1",
                language: "pt"
            });

            result.content = transcription.text;

            // Extrair frames para análise visual (opcional)
            if (options.analyzeFrames) {
                const frames = await this.extractFrames(filePath, options.frameCount || 3);
                result.visualAnalysis = await this.analyzeVideoFrames(frames);
            }

            // Gerar resumo
            if (result.content && result.content.length > 50) {
                result.summary = await this.generateSummary(result.content, 'video');
                result.keyPoints = await this.extractKeyPoints(result.content);
                result.sentiment = await this.analyzeSentiment(result.content);
            }

            // Limpar arquivo temporário
            fs.unlinkSync(tempAudioFile);

            return result;
        } catch (error) {
            console.error('❌ Erro na análise de vídeo:', error);
            throw error;
        }
    }

    /**
     * Obter metadados do vídeo
     */
    async getVideoMetadata(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                    const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
                    
                    resolve({
                        duration: metadata.format.duration,
                        size: metadata.format.size,
                        bitrate: metadata.format.bit_rate,
                        video: videoStream ? {
                            codec: videoStream.codec_name,
                            width: videoStream.width,
                            height: videoStream.height,
                            fps: eval(videoStream.r_frame_rate)
                        } : null,
                        audio: audioStream ? {
                            codec: audioStream.codec_name,
                            sampleRate: audioStream.sample_rate,
                            channels: audioStream.channels
                        } : null
                    });
                }
            });
        });
    }

    /**
     * Gerar resumo usando OpenAI
     */
    async generateSummary(content, type) {
        try {
            const prompts = {
                pdf: "Resuma este documento PDF destacando os pontos principais, conclusões e informações relevantes:",
                image: "Resuma esta análise de imagem destacando os elementos mais importantes identificados:",
                audio: "Resuma esta transcrição de áudio destacando os pontos principais da conversa:",
                video: "Resuma esta transcrição de vídeo destacando os pontos principais do conteúdo:"
            };

            const response = await openai.chat.completions.create({
                model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Você é um assistente especializado em resumir e analisar conteúdo. Seja conciso mas completo."
                    },
                    {
                        role: "user",
                        content: `${prompts[type]}\n\n${content.substring(0, 8000)}`
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('❌ Erro ao gerar resumo:', error);
            return 'Erro ao gerar resumo';
        }
    }

    /**
     * Extrair pontos-chave
     */
    async extractKeyPoints(content) {
        try {
            const response = await openai.chat.completions.create({
                model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Extraia os pontos-chave mais importantes do texto. Retorne uma lista de até 5 pontos principais."
                    },
                    {
                        role: "user",
                        content: content.substring(0, 6000)
                    }
                ],
                max_tokens: 300,
                temperature: 0.2
            });

            return response.choices[0].message.content
                .split('\n')
                .filter(line => line.trim() && (line.includes('•') || line.includes('-') || line.match(/^\d+\./)))
                .slice(0, 5);
        } catch (error) {
            console.error('❌ Erro ao extrair pontos-chave:', error);
            return [];
        }
    }

    /**
     * Analisar sentimento
     */
    async analyzeSentiment(content) {
        try {
            const response = await openai.chat.completions.create({
                model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "Analise o sentimento do texto e classifique como: positivo, negativo, neutro ou misto. Explique brevemente."
                    },
                    {
                        role: "user",
                        content: content.substring(0, 4000)
                    }
                ],
                max_tokens: 100,
                temperature: 0.1
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('❌ Erro na análise de sentimento:', error);
            return 'Sentimento não determinado';
        }
    }
}

// Instância singleton
const documentAnalyzer = new DocumentAnalyzer();

/**
 * Função principal para uso externo
 */
export async function analyzeDocument(filePath, options = {}) {
    return await documentAnalyzer.analyzeFile(filePath, options);
}

/**
 * Função para listar tipos suportados
 */
export function getSupportedTypes() {
    return documentAnalyzer.supportedTypes;
}

/**
 * Função para verificar se um arquivo é suportado
 */
export function isFileSupported(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    return Object.values(documentAnalyzer.supportedTypes)
        .some(extensions => extensions.includes(ext));
}

export default documentAnalyzer;