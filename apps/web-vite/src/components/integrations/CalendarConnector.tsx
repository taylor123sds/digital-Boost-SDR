import { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

interface CalendarConnectorProps {
  isConnected?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  className?: string;
}

export function CalendarConnector({
  isConnected = false,
  onConnectionChange,
  className
}: CalendarConnectorProps) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(isConnected);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      // Open Google OAuth in popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        '/auth/google',
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup close
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          setConnecting(false);
          // Check if OAuth was successful by checking localStorage or making an API call
          checkConnection();
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkPopup);
        if (!popup?.closed) {
          popup?.close();
        }
        setConnecting(false);
      }, 300000);
    } catch (err) {
      setError((err as Error).message || 'Erro ao conectar');
      setConnecting(false);
    }
  };

  const checkConnection = async () => {
    // In a real implementation, you would check the integration status
    // For now, we'll assume success if the popup was closed
    setConnected(true);
    onConnectionChange?.(true);
  };

  const handleDisconnect = async () => {
    setConnected(false);
    onConnectionChange?.(false);
  };

  return (
    <div className={cn("p-4 border border-white/10 rounded-xl bg-white/5", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Calendar className="text-blue-500" size={20} />
          </div>
          <div>
            <h4 className="font-medium">Google Calendar</h4>
            <p className="text-sm text-gray-400">Agende reunioes automaticamente</p>
          </div>
        </div>
        <Badge variant={connected ? 'success' : 'default'}>
          {connected ? 'Conectado' : 'Desconectado'}
        </Badge>
      </div>

      {/* Connected State */}
      {connected && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm">Google Calendar conectado</span>
          </div>
          <p className="text-sm text-gray-400">
            Reunioes serao agendadas automaticamente
          </p>
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

      {/* Disconnected State */}
      {!connected && !connecting && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Conecte seu Google Calendar para agendar reunioes com leads
          </p>
          <Button
            onClick={handleConnect}
            icon={<Calendar size={16} />}
          >
            Conectar Google Calendar
          </Button>
        </div>
      )}

      {/* Connecting State */}
      {connecting && (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan mx-auto mb-2" />
            <p className="text-sm text-gray-400">Conectando ao Google...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <XCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}

export default CalendarConnector;
