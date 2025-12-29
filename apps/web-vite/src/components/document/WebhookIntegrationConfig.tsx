import { useState, useEffect } from 'react';
import { Webhook, Key, Copy, Check, RefreshCw, Trash2, Code, FileText, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { api, type WebhookInfo } from '../../lib/api';

interface WebhookIntegrationConfigProps {
  agentId?: string | null;
  isNewAgent?: boolean;
  className?: string;
}

export function WebhookIntegrationConfig({
  agentId,
  isNewAgent = false,
  className
}: WebhookIntegrationConfigProps) {
  const [webhookInfo, setWebhookInfo] = useState<WebhookInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<'url' | 'key' | 'curl' | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');

  useEffect(() => {
    if (agentId && !isNewAgent) {
      loadWebhookInfo();
    }
  }, [agentId, isNewAgent]);

  const loadWebhookInfo = async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const info = await api.getWebhookInfo(agentId);
      setWebhookInfo(info);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!agentId) return;
    setGenerating(true);
    try {
      const result = await api.generateApiKey(agentId);
      if (result) {
        setNewApiKey(result.apiKey);
        await loadWebhookInfo();
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!agentId) return;
    if (!confirm('Revogar a API key? Sistemas externos nao poderao mais enviar documentos.')) return;

    try {
      await api.revokeApiKey(agentId);
      setNewApiKey(null);
      await loadWebhookInfo();
    } catch (error) {
      console.error('Failed to revoke key:', error);
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'key' | 'curl') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const getCurlExample = (type: 'file' | 'text') => {
    const apiKey = newApiKey || '<SUA_API_KEY>';
    const url = type === 'file'
      ? webhookInfo?.webhookUrl || `https://api.orbion.ai/api/webhook/documents/${agentId || '<AGENT_ID>'}`
      : webhookInfo?.textWebhookUrl || `https://api.orbion.ai/api/webhook/documents/${agentId || '<AGENT_ID>'}/text`;

    if (type === 'file') {
      return `curl -X POST "${url}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -F "file=@documento.pdf" \\
  -F 'metadata={"origem":"sistema_rh","tipo":"ferias"}'`;
    }

    return `curl -X POST "${url}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Joao Silva entrou de ferias de 01/01 a 15/01", "metadata": {"origem": "sistema_rh"}}'`;
  };

  // Show placeholder for new agents
  if (isNewAgent) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Webhook className="text-violet-500" size={20} />
          </div>
          <div>
            <h4 className="font-medium">Integracao via API</h4>
            <p className="text-sm text-gray-400">Configure sistemas externos para enviar documentos</p>
          </div>
        </div>

        <div className="p-6 bg-violet-500/10 border border-violet-500/20 rounded-lg text-center">
          <Webhook className="mx-auto text-violet-500 mb-3" size={32} />
          <p className="text-sm text-gray-300 mb-2">
            Apos salvar o agente, voce podera gerar uma API key para integrar sistemas externos.
          </p>
          <p className="text-xs text-gray-500">
            Sistemas como ERPs, CRMs e outros poderao enviar documentos automaticamente para este agente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <Webhook className="text-violet-500" size={20} />
        </div>
        <div>
          <h4 className="font-medium">Integracao via API</h4>
          <p className="text-sm text-gray-400">Configure sistemas externos para enviar documentos</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* API Key Section */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-amber-500" />
                <span className="font-medium">API Key</span>
              </div>
              {webhookInfo?.hasApiKey ? (
                <Badge variant="success">Ativa</Badge>
              ) : (
                <Badge variant="default">Nao configurada</Badge>
              )}
            </div>

            {newApiKey && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-xs text-green-400 mb-2">Nova API key gerada! Copie e guarde em local seguro:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-green-300 bg-dark-bg px-3 py-2 rounded font-mono break-all">
                    {newApiKey}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(newApiKey, 'key')}
                  >
                    {copied === 'key' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </Button>
                </div>
                <p className="text-xs text-amber-400 mt-2">
                  Esta key nao sera exibida novamente!
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGenerateKey}
                loading={generating}
                icon={<RefreshCw size={14} />}
              >
                {webhookInfo?.hasApiKey ? 'Regenerar API Key' : 'Gerar API Key'}
              </Button>

              {webhookInfo?.hasApiKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevokeKey}
                  className="text-red-400"
                  icon={<Trash2 size={14} />}
                >
                  Revogar
                </Button>
              )}
            </div>

            {webhookInfo?.apiKeyCreatedAt && (
              <p className="text-xs text-gray-500 mt-2">
                Criada em: {new Date(webhookInfo.apiKeyCreatedAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          {/* Webhook URL */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Webhook size={16} className="text-violet-500" />
              <span className="font-medium">Webhook URL</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <code className="flex-1 text-sm text-cyan bg-dark-bg px-3 py-2 rounded font-mono text-xs break-all">
                {webhookInfo?.webhookUrl || `https://api.orbion.ai/api/webhook/documents/${agentId}`}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(webhookInfo?.webhookUrl || '', 'url')}
              >
                {copied === 'url' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Use esta URL para enviar documentos via POST com autenticacao Bearer token.
            </p>
          </div>

          {/* Example Code */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Code size={16} className="text-cyan" />
              <span className="font-medium">Exemplo de Uso</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('file')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                  activeTab === 'file'
                    ? "bg-cyan/20 text-cyan"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <FileText size={14} />
                Enviar Arquivo
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                  activeTab === 'text'
                    ? "bg-cyan/20 text-cyan"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <MessageSquare size={14} />
                Enviar Texto
              </button>
            </div>

            <div className="relative">
              <pre className="text-xs text-gray-300 bg-dark-bg p-4 rounded-lg overflow-x-auto font-mono">
                {getCurlExample(activeTab)}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(getCurlExample(activeTab), 'curl')}
              >
                {copied === 'curl' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-300">Campos do metadata (opcionais):</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li><code className="text-cyan">origem</code> - Sistema de origem (ex: "sistema_rh", "erp")</li>
                <li><code className="text-cyan">tipo</code> - Tipo de documento (ex: "ferias", "atestado")</li>
                <li><code className="text-cyan">prioridade</code> - alta, media, baixa</li>
              </ul>
            </div>
          </div>

          {/* How it works */}
          <div className="p-4 bg-gradient-to-r from-violet-500/10 to-cyan/10 rounded-lg border border-violet-500/20">
            <h5 className="font-medium mb-3">Como funciona</h5>
            <ol className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-500/30 text-violet-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Sistema externo envia documento/mensagem via API</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-500/30 text-violet-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Agente analisa e extrai informacoes automaticamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-500/30 text-violet-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Notificacoes sao enviadas para os destinos configurados (Email/WhatsApp)</span>
              </li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

export default WebhookIntegrationConfig;
