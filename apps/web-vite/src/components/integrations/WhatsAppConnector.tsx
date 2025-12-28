import { useState, useEffect, useRef } from 'react';
import { MessageSquare, QrCode, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

interface WhatsAppConnectorProps {
  agentId?: string;
  instanceName?: string;
  onConnectionChange?: (connected: boolean, instanceName?: string) => void;
  className?: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'error';

export function WhatsAppConnector({
  agentId,
  instanceName = 'leadly_main',
  onConnectionChange,
  className
}: WhatsAppConnectorProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check initial status
  useEffect(() => {
    if (agentId) {
      checkStatus();
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [agentId]);

  const checkStatus = async () => {
    if (!agentId) return;

    try {
      const data = await api.getEvolutionStatus(agentId);
      if (data?.connected || data?.state === 'open' || data?.status === 'connected') {
        setStatus('connected');
        setPhoneNumber(data?.phoneNumber || data?.phone || null);
        onConnectionChange?.(true, instanceName);
      } else {
        setStatus('disconnected');
        onConnectionChange?.(false);
      }
    } catch {
      setStatus('disconnected');
    }
  };

  const connect = async () => {
    if (!agentId) {
      setError('Agente precisa ser salvo primeiro');
      return;
    }

    setStatus('connecting');
    setError(null);
    setQrCode(null);

    try {
      const data = await api.connectEvolution(agentId, { instanceName });

      if (data?.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
        setStatus('qr_ready');
        startPolling();
      } else if (data?.status === 'open' || data?.connected) {
        setStatus('connected');
        setPhoneNumber(data?.phoneNumber || null);
        onConnectionChange?.(true, instanceName);
      }
    } catch (err) {
      setStatus('error');
      setError((err as Error).message || 'Erro ao conectar');
    }
  };

  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      if (!agentId) return;

      try {
        const data = await api.getEvolutionStatus(agentId);
        if (data?.connected || data?.state === 'open' || data?.status === 'connected') {
          setStatus('connected');
          setPhoneNumber(data?.phoneNumber || data?.phone || null);
          setQrCode(null);
          onConnectionChange?.(true, instanceName);

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch {
        // Continue polling
      }
    }, 3000);

    // Stop polling after 2 minutes
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        if (status === 'qr_ready') {
          setStatus('disconnected');
          setQrCode(null);
          setError('QR Code expirou. Tente novamente.');
        }
      }
    }, 120000);
  };

  const disconnect = async () => {
    if (!agentId) return;

    try {
      await api.disconnectEvolution(agentId);
      setStatus('disconnected');
      setPhoneNumber(null);
      onConnectionChange?.(false);
    } catch (err) {
      setError((err as Error).message || 'Erro ao desconectar');
    }
  };

  const refreshQR = async () => {
    setQrCode(null);
    await connect();
  };

  return (
    <div className={cn("p-4 border border-white/10 rounded-xl bg-white/5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <MessageSquare className="text-green-500" size={20} />
          </div>
          <div>
            <h4 className="font-medium">WhatsApp</h4>
            <p className="text-sm text-gray-400">Evolution API</p>
          </div>
        </div>
        <Badge variant={
          status === 'connected' ? 'success' :
          status === 'connecting' || status === 'qr_ready' ? 'warning' :
          status === 'error' ? 'danger' : 'default'
        }>
          {status === 'connected' ? 'Conectado' :
           status === 'connecting' ? 'Conectando...' :
           status === 'qr_ready' ? 'Aguardando scan' :
           status === 'error' ? 'Erro' : 'Desconectado'}
        </Badge>
      </div>

      {/* Connected State */}
      {status === 'connected' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm">WhatsApp conectado</span>
          </div>
          {phoneNumber && (
            <p className="text-sm text-gray-400">Numero: {phoneNumber}</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            icon={<XCircle size={14} />}
            className="text-red-400"
          >
            Desconectar
          </Button>
        </div>
      )}

      {/* Disconnected State */}
      {status === 'disconnected' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Conecte seu WhatsApp para enviar e receber mensagens
          </p>
          <Button
            onClick={connect}
            icon={<QrCode size={16} />}
            disabled={!agentId}
          >
            {agentId ? 'Conectar WhatsApp' : 'Salve o agente primeiro'}
          </Button>
        </div>
      )}

      {/* Connecting State */}
      {status === 'connecting' && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan mx-auto mb-2" />
            <p className="text-sm text-gray-400">Gerando QR Code...</p>
          </div>
        </div>
      )}

      {/* QR Code State */}
      {status === 'qr_ready' && qrCode && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg mx-auto w-fit">
            <img src={qrCode} alt="QR Code WhatsApp" className="w-48 h-48" />
          </div>
          <p className="text-sm text-gray-400 text-center">
            Abra o WhatsApp no celular e escaneie o QR Code
          </p>
          <div className="flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshQR}
              icon={<RefreshCw size={14} />}
            >
              Gerar novo QR
            </Button>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle size={16} />
            <span className="text-sm">{error || 'Erro ao conectar'}</span>
          </div>
          <Button
            variant="secondary"
            onClick={connect}
            icon={<RefreshCw size={16} />}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && status !== 'error' && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

export default WhatsAppConnector;
