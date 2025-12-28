import { useState } from 'react';
import { Database, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api, type ApiError } from '../../lib/api';
import { cn } from '../../lib/utils';

interface CRMProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const CRM_PROVIDERS: CRMProvider[] = [
  { id: 'kommo', name: 'Kommo', icon: '🔵', description: 'Antigo amoCRM' },
  { id: 'hubspot', name: 'HubSpot', icon: '🟠', description: 'CRM gratuito' },
  { id: 'pipedrive', name: 'Pipedrive', icon: '🟢', description: 'CRM de vendas' },
];

interface CRMConnectorProps {
  selectedProvider?: string;
  isConnected?: boolean;
  onConnectionChange?: (provider: string | null, connected: boolean) => void;
  className?: string;
}

export function CRMConnector({
  selectedProvider,
  isConnected = false,
  onConnectionChange,
  className
}: CRMConnectorProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<string | null>(isConnected ? selectedProvider || null : null);

  const handleConnect = async (providerId: string) => {
    setConnecting(providerId);
    setError(null);

    try {
      const data = await api.startCrmOauth(providerId);

      if (data.data?.authUrl) {
        // Open OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.data.authUrl,
          'crm_oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for popup close
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            setConnecting(null);
            // Check if OAuth was successful
            checkConnection(providerId);
          }
        }, 500);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkPopup);
          if (!popup?.closed) {
            popup?.close();
          }
          setConnecting(null);
        }, 300000);
      }
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.data && (apiError.data as { upgradeRequired?: boolean }).upgradeRequired) {
        setError('Limite de integracoes atingido. Faca upgrade do seu plano.');
      } else {
        setError(apiError.message || 'Erro ao conectar CRM');
      }
      setConnecting(null);
    }
  };

  const checkConnection = async (providerId: string) => {
    // In a real implementation, you would check the integration status
    // For now, we'll assume success if the popup was closed
    setConnected(providerId);
    onConnectionChange?.(providerId, true);
  };

  const handleDisconnect = async () => {
    // In a real implementation, you would disconnect the integration
    setConnected(null);
    onConnectionChange?.(null, false);
  };

  const handleSelect = (providerId: string) => {
    if (connected === providerId) {
      handleDisconnect();
    } else if (!connected) {
      handleConnect(providerId);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet/20 flex items-center justify-center">
          <Database className="text-violet" size={20} />
        </div>
        <div>
          <h4 className="font-medium">CRM</h4>
          <p className="text-sm text-gray-400">Sincronize seus leads</p>
        </div>
      </div>

      {/* CRM Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {CRM_PROVIDERS.map((provider) => {
          const isSelected = connected === provider.id;
          const isLoading = connecting === provider.id;

          return (
            <button
              key={provider.id}
              onClick={() => handleSelect(provider.id)}
              disabled={isLoading || (connected !== null && connected !== provider.id)}
              className={cn(
                "p-4 rounded-xl border text-left transition-all",
                isSelected
                  ? "border-cyan bg-cyan/10"
                  : connected
                  ? "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{provider.icon}</span>
                {isSelected && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle size={12} />
                    Conectado
                  </Badge>
                )}
                {isLoading && (
                  <Loader2 size={16} className="animate-spin text-cyan" />
                )}
              </div>
              <h5 className="font-medium">{provider.name}</h5>
              <p className="text-xs text-gray-400 mt-1">{provider.description}</p>
            </button>
          );
        })}
      </div>

      {/* Connected State */}
      {connected && (
        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm">
              {CRM_PROVIDERS.find(p => p.id === connected)?.name} conectado
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            icon={<XCircle size={14} />}
            className="text-red-400"
          >
            Desconectar
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <XCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Helper Text */}
      {!connected && !error && (
        <p className="text-xs text-gray-500">
          Selecione um CRM para sincronizar leads automaticamente
        </p>
      )}
    </div>
  );
}

export default CRMConnector;
