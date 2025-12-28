import { useState, useEffect, useRef } from 'react';
import {
  X, Send, Phone, Mail, Building, Calendar,
  MessageCircle, User, Star, ChevronDown,
  CheckCircle
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import type { Lead, Message } from '../../lib/api';

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (lead: Lead) => void;
  stages?: Array<{ id: string; label: string; color: 'default' | 'success' | 'warning' | 'danger' | 'info' }>;
}

export default function LeadDetailModal({ lead, isOpen, onClose, onUpdate, stages = [] }: LeadDetailModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'info' | 'timeline'>('chat');
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lead && isOpen) {
      loadMessages();
    }
  }, [lead, isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!lead) return;
    setLoading(true);
    try {
      const data = await api.getConversationMessages(lead.phone);
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !lead) return;

    setSending(true);
    try {
      await api.sendMessage(lead.phone, newMessage);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: newMessage,
        from: 'agent' as const,
        timestamp: new Date().toISOString()
      }]);
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!lead) return;
    try {
      await api.updateLead(lead.id, { stage: newStage });
      onUpdate?.({ ...lead, stage: newStage });
      setStageDropdownOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar estagio:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!isOpen || !lead) return null;

  const currentStage = stages.find(s => s.id === lead.stage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-dark-card rounded-2xl border border-white/10 shadow-2xl flex overflow-hidden">
        {/* Left Panel - Lead Info */}
        <div className="w-80 border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan to-violet flex items-center justify-center text-2xl font-bold text-dark-bg">
                {lead.name?.charAt(0) || '?'}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <h2 className="text-xl font-semibold">{lead.name}</h2>
            <p className="text-gray-400 text-sm mt-1">{lead.company}</p>

            {/* Stage Dropdown */}
            <div className="relative mt-4">
              <button
                onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                className="flex items-center gap-2 w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Badge variant={currentStage?.color as any}>{currentStage?.label}</Badge>
                <ChevronDown size={16} className="ml-auto text-gray-400" />
              </button>

              {stageDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-dark-bg border border-white/10 rounded-lg shadow-xl z-10">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                      className={`w-full p-3 text-left hover:bg-white/5 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 ${
                        stage.id === lead.stage ? 'bg-white/5' : ''
                      }`}
                    >
                      <Badge variant={stage.color as any}>{stage.label}</Badge>
                      {stage.id === lead.stage && (
                        <CheckCircle size={16} className="ml-auto text-cyan" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center gap-3 text-sm">
              <Phone size={18} className="text-gray-400" />
              <span>{lead.phone}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail size={18} className="text-gray-400" />
                <span>{lead.email}</span>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-3 text-sm">
                <Building size={18} className="text-gray-400" />
                <span>{lead.company}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={18} className="text-gray-400" />
              <span>Criado em {formatDate(lead.createdAt)}</span>
            </div>

            {/* Score */}
            <div className="p-4 bg-white/5 rounded-xl mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Lead Score</span>
                <Star size={18} className="text-yellow-400" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{lead.score}</span>
                <span className="text-gray-400 mb-1">/100</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    lead.score >= 80 ? 'bg-green-500' :
                    lead.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${lead.score}%` }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 mt-6">
              <Button variant="secondary" className="w-full justify-start gap-2">
                <Calendar size={18} />
                Agendar Reuniao
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-2">
                <Phone size={18} />
                Ligar Agora
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(['chat', 'info', 'timeline'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'chat' && 'Conversa'}
                {tab === 'info' && 'Informacoes'}
                {tab === 'timeline' && 'Timeline'}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan to-violet" />
                )}
              </button>
            ))}
          </div>

          {activeTab === 'chat' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageCircle size={48} className="mb-4 opacity-50" />
                    <p>Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                          msg.from === 'agent'
                            ? 'bg-gradient-to-r from-cyan to-violet text-dark-bg'
                            : 'bg-white/10'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.from === 'agent' ? 'text-dark-bg/70' : 'text-gray-500'
                        }`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan/50 text-sm"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    icon={<Send size={18} />}
                  >
                    {sending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'info' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 rounded-xl">
                  <h4 className="text-sm text-gray-400 mb-2">Nome Completo</h4>
                  <p className="font-medium">{lead.name}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <h4 className="text-sm text-gray-400 mb-2">Empresa</h4>
                  <p className="font-medium">{lead.company || '-'}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <h4 className="text-sm text-gray-400 mb-2">Telefone</h4>
                  <p className="font-medium">{lead.phone}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl">
                  <h4 className="text-sm text-gray-400 mb-2">Email</h4>
                  <p className="font-medium">{lead.email || '-'}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl col-span-2">
                  <h4 className="text-sm text-gray-400 mb-2">Observacoes</h4>
                  <p className="text-sm text-gray-300">
                    Lead captado via campanha WhatsApp. Interesse demonstrado em automacao de marketing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan/20 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-cyan" />
                  </div>
                  <div>
                    <p className="font-medium">Lead criado</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Lead adicionado ao pipeline via campanha automatica
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(lead.createdAt)} as {formatTime(lead.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={18} className="text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Primeira mensagem enviada</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Agente ORBION iniciou conversa
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(lead.createdAt)} as {formatTime(lead.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet/20 flex items-center justify-center flex-shrink-0">
                    <Star size={18} className="text-violet" />
                  </div>
                  <div>
                    <p className="font-medium">Score atualizado para {lead.score}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Qualificacao automatica baseada em engajamento
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Hoje</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
