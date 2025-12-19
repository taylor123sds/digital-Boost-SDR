import { useEffect, useState } from 'react';
import {
  Activity, Download, Search, User, Bot,
  Settings, Database, AlertTriangle, CheckCircle,
  Clock, ChevronDown
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import TopBar from '../components/layout/TopBar';
import { cn } from '../lib/utils';

// Types
interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  category: 'auth' | 'agent' | 'lead' | 'message' | 'config' | 'billing' | 'system';
  actor: {
    type: 'user' | 'agent' | 'system';
    id: string;
    name: string;
  };
  target?: {
    type: string;
    id: string;
    name?: string;
  };
  details?: Record<string, unknown>;
  ip?: string;
  status: 'success' | 'failure' | 'warning';
}

const categoryConfig = {
  auth: { label: 'Autenticacao', icon: User, color: 'text-blue-500' },
  agent: { label: 'Agente', icon: Bot, color: 'text-cyan' },
  lead: { label: 'Lead', icon: Database, color: 'text-green-500' },
  message: { label: 'Mensagem', icon: Activity, color: 'text-violet' },
  config: { label: 'Configuracao', icon: Settings, color: 'text-yellow-500' },
  billing: { label: 'Billing', icon: Activity, color: 'text-amber-500' },
  system: { label: 'Sistema', icon: AlertTriangle, color: 'text-red-500' },
};

const mockAuditLogs: AuditEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    action: 'agent.message.sent',
    category: 'message',
    actor: { type: 'agent', id: 'agent-1', name: 'ORBION SDR' },
    target: { type: 'lead', id: 'lead-123', name: 'Maria Silva' },
    details: { messageType: 'whatsapp', template: 'follow_up' },
    status: 'success'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    action: 'user.login',
    category: 'auth',
    actor: { type: 'user', id: 'user-1', name: 'Taylor Lapenda' },
    ip: '186.235.xxx.xxx',
    status: 'success'
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    action: 'lead.stage.updated',
    category: 'lead',
    actor: { type: 'agent', id: 'agent-1', name: 'ORBION SDR' },
    target: { type: 'lead', id: 'lead-456', name: 'Joao Santos' },
    details: { fromStage: 'discovery', toStage: 'qualification' },
    status: 'success'
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    action: 'agent.config.updated',
    category: 'config',
    actor: { type: 'user', id: 'user-1', name: 'Taylor Lapenda' },
    target: { type: 'agent', id: 'agent-1', name: 'ORBION SDR' },
    details: { field: 'persona.tone', oldValue: 'formal', newValue: 'consultivo' },
    status: 'success'
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    action: 'system.whatsapp.reconnect',
    category: 'system',
    actor: { type: 'system', id: 'system', name: 'Sistema' },
    details: { reason: 'connection_lost', attempts: 3 },
    status: 'warning'
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: 'billing.subscription.renewed',
    category: 'billing',
    actor: { type: 'system', id: 'system', name: 'Sistema' },
    details: { plan: 'professional', amount: 297 },
    status: 'success'
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    action: 'user.login.failed',
    category: 'auth',
    actor: { type: 'user', id: 'unknown', name: 'Desconhecido' },
    ip: '45.xxx.xxx.xxx',
    details: { reason: 'invalid_password', attempts: 3 },
    status: 'failure'
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    action: 'agent.handoff.triggered',
    category: 'agent',
    actor: { type: 'agent', id: 'agent-1', name: 'ORBION SDR' },
    target: { type: 'lead', id: 'lead-789', name: 'Ana Costa' },
    details: { reason: 'user_request', escalatedTo: 'sales_team' },
    status: 'success'
  },
];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadLogs();
  }, [filterCategory, filterStatus, dateRange, page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      setLogs(mockAuditLogs);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const rows = (logs.length > 0 ? logs : mockAuditLogs).map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        action: log.action,
        category: log.category,
        actor: log.actor?.name,
        target: log.target?.name || '',
        status: log.status,
        ip: log.ip || ''
      }));

      const header = Object.keys(rows[0] || {}).join(',');
      const body = rows.map(row => Object.values(row).map(value =>
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')).join('\n');
      const csv = `${header}\n${body}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  const formatAction = (action: string) => {
    const parts = action.split('.');
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' > ');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m atras`;
    if (diff < 86400000) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.target?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: AuditEntry['status']) => {
    if (status === 'success') return <CheckCircle size={16} className="text-green-500" />;
    if (status === 'failure') return <AlertTriangle size={16} className="text-red-500" />;
    return <Clock size={16} className="text-yellow-500" />;
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Audit Log" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Log de Auditoria</h1>
            <p className="text-gray-400 mt-1">Historico completo de acoes no sistema</p>
          </div>
          <Button onClick={exportLogs} icon={<Download size={16} />} variant="secondary">
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por acao, ator ou alvo..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 text-sm"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 text-sm"
            >
              <option value="all">Todas Categorias</option>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 text-sm"
            >
              <option value="all">Todos Status</option>
              <option value="success">Sucesso</option>
              <option value="failure">Falha</option>
              <option value="warning">Alerta</option>
            </select>

            {/* Date Range */}
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 text-sm"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 text-sm"
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-sm text-gray-400">Total de Eventos</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-500">
              {logs.filter(l => l.status === 'success').length}
            </div>
            <div className="text-sm text-gray-400">Sucesso</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-500">
              {logs.filter(l => l.status === 'failure').length}
            </div>
            <div className="text-sm text-gray-400">Falhas</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-yellow-500">
              {logs.filter(l => l.status === 'warning').length}
            </div>
            <div className="text-sm text-gray-400">Alertas</div>
          </Card>
        </div>

        {/* Logs Table */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Activity size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Acao</th>
                    <th className="p-4">Ator</th>
                    <th className="p-4">Alvo</th>
                    <th className="p-4">Status</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => {
                    const catConfig = categoryConfig[log.category];
                    const Icon = catConfig.icon;

                    return (
                      <>
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-gray-500" />
                              {formatTimestamp(log.timestamp)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Icon size={16} className={catConfig.color} />
                              <span className="text-sm">{catConfig.label}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-mono bg-white/5 px-2 py-1 rounded">
                              {formatAction(log.action)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {log.actor.type === 'agent' ? (
                                <Bot size={14} className="text-cyan" />
                              ) : log.actor.type === 'user' ? (
                                <User size={14} className="text-violet" />
                              ) : (
                                <Settings size={14} className="text-gray-400" />
                              )}
                              <span className="text-sm">{log.actor.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-400">
                            {log.target ? (
                              <span>{log.target.name || log.target.id}</span>
                            ) : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              <Badge variant={
                                log.status === 'success' ? 'success' :
                                log.status === 'failure' ? 'danger' : 'warning'
                              }>
                                {log.status === 'success' ? 'Sucesso' :
                                 log.status === 'failure' ? 'Falha' : 'Alerta'}
                              </Badge>
                            </div>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                              className="p-2 hover:bg-white/5 rounded-lg"
                            >
                              <ChevronDown
                                size={16}
                                className={cn(
                                  "transition-transform",
                                  expandedLog === log.id && "rotate-180"
                                )}
                              />
                            </button>
                          </td>
                        </tr>
                        {expandedLog === log.id && (
                          <tr className="bg-white/5">
                            <td colSpan={7} className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400 block">ID do Evento</span>
                                  <span className="font-mono">{log.id}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 block">Timestamp Completo</span>
                                  <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                                </div>
                                {log.ip && (
                                  <div>
                                    <span className="text-gray-400 block">IP</span>
                                    <span>{log.ip}</span>
                                  </div>
                                )}
                                {log.details && (
                                  <div className="col-span-2 md:col-span-4">
                                    <span className="text-gray-400 block mb-2">Detalhes</span>
                                    <pre className="bg-dark-bg p-3 rounded-lg overflow-x-auto text-xs">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <span className="text-sm text-gray-400">
                Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredLogs.length)} de {filteredLogs.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= filteredLogs.length}
                >
                  Proximo
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
