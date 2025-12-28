import { useEffect, useState, useRef } from 'react';
import {
  MessageSquare, Search, Send, Phone, User,
  MoreVertical, Bot, CheckCheck,
  AlertCircle, ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import TopBar from '../components/layout/TopBar';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

// Types - matches ConversationSummary from api.ts
interface Conversation {
  id: string;
  phone: string;
  name: string;
  company?: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'waiting' | 'closed' | 'handoff';
  agentId?: string | null;
  agentName?: string | null;
  stage?: string | null;
  totalMessages?: number;
}

interface Message {
  id: string;
  content: string;
  from: 'agent' | 'user';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

export default function InboxPage() {
  const PAGE_SIZE = 50;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [totalConversations, setTotalConversations] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check mobile view
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadConversations(true);
    setSelectedConversation(null);
    setMessages([]);
  }, [filterStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async (reset = false) => {
    if (!reset && (loadingMore || !hasMore)) {
      return;
    }

    if (reset) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = reset ? 0 : page * PAGE_SIZE;
      const reduceStatus = filterStatus === 'all' ? undefined : filterStatus;
      const result = await api.getConversations(PAGE_SIZE, offset, reduceStatus);

      setConversations(prev => {
        const merged = reset ? result.data : [...prev, ...result.data];
        setHasMore(merged.length < result.total);
        return merged;
      });
      setTotalConversations(result.total);
      setPage(prevPage => (reset ? 1 : prevPage + 1));
    } finally {
      if (reset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await api.getConversationMessages(conversationId);
      setMessages(data);
      setConversations(prev => prev.map(conv => (
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      )));
    } catch {
      setMessages([]);
    }
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    loadMessages(conv.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      from: 'agent',
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      await api.sendMessage(selectedConversation.phone, newMessage);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Agora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getStatusBadge = (status: Conversation['status']) => {
    const config = {
      active: { variant: 'success' as const, label: 'Ativo' },
      waiting: { variant: 'warning' as const, label: 'Aguardando' },
      closed: { variant: 'default' as const, label: 'Fechado' },
      handoff: { variant: 'danger' as const, label: 'Handoff' },
    };
    const { variant, label } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.phone.includes(searchQuery) ||
                         conv.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || conv.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const renderConversationList = () => (
    <div className={cn(
      "border-r border-white/10 flex flex-col",
      isMobileView && selectedConversation ? "hidden" : "w-full md:w-96"
    )}>
      {/* Search and Filter */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 text-sm"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'active', 'waiting', 'handoff'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg transition-colors",
                filterStatus === status
                  ? "bg-cyan/20 text-cyan"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              )}
            >
              {status === 'all' ? 'Todas' :
               status === 'active' ? 'Ativas' :
               status === 'waiting' ? 'Aguardando' : 'Handoff'}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={cn(
                "w-full p-4 border-b border-white/5 text-left hover:bg-white/5 transition-colors",
                selectedConversation?.id === conv.id && "bg-cyan/10"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center shrink-0">
                  <User size={18} className="text-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">{conv.name}</span>
                    <span className="text-xs text-gray-400">{formatTime(conv.lastMessageTime)}</span>
                  </div>
                  {conv.company && (
                    <p className="text-xs text-gray-400 truncate mb-1">{conv.company}</p>
                  )}
                  <p className="text-sm text-gray-300 truncate">{conv.lastMessage}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(conv.status)}
                    {conv.stage && <span className="text-xs text-gray-500">{conv.stage}</span>}
                    {conv.unreadCount > 0 && (
                      <span className="ml-auto w-5 h-5 bg-cyan text-dark-bg text-xs rounded-full flex items-center justify-center font-medium">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
        {!loading && hasMore && (
          <div className="p-4">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => loadConversations(false)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Carregando...' : 'Carregar mais'}
            </Button>
            {totalConversations > 0 && (
              <p className="mt-2 text-xs text-gray-500 text-center">
                {conversations.length} de {totalConversations} conversas
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderChatArea = () => (
    <div className={cn(
      "flex-1 flex flex-col",
      isMobileView && !selectedConversation && "hidden"
    )}>
      {selectedConversation ? (
        <>
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobileView && (
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-2 hover:bg-white/5 rounded-lg"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center">
                <User size={18} className="text-cyan" />
              </div>
              <div>
                <h3 className="font-medium">{selectedConversation.name}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Phone size={12} />
                  <span>{selectedConversation.phone}</span>
                  {selectedConversation.company && (
                    <>
                      <span className="text-gray-600">|</span>
                      <span>{selectedConversation.company}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(selectedConversation.status)}
              <button className="p-2 hover:bg-white/5 rounded-lg">
                <MoreVertical size={18} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.from === 'agent' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[70%] p-3 rounded-2xl",
                  msg.from === 'agent'
                    ? "bg-gradient-to-r from-cyan/20 to-violet/20 rounded-br-sm"
                    : "bg-white/10 rounded-bl-sm"
                )}>
                  {msg.from === 'agent' && (
                    <div className="flex items-center gap-1 mb-1 text-xs text-cyan">
                      <Bot size={12} />
                      <span>Agente</span>
                    </div>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.from === 'agent' && msg.status && (
                      <CheckCheck
                        size={14}
                        className={cn(
                          msg.status === 'read' ? 'text-cyan' : 'text-gray-500'
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Handoff Warning */}
          {selectedConversation.status === 'handoff' && (
            <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-2 text-sm text-amber-400">
              <AlertCircle size={16} />
              <span>Este lead solicitou falar com um humano</span>
              <Button variant="secondary" size="sm" className="ml-auto">
                Assumir Conversa
              </Button>
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan/50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                icon={<Send size={18} />}
              >
                Enviar
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <MessageSquare size={48} className="mx-auto text-gray-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
            <p className="text-gray-400">Escolha uma conversa na lista para visualizar</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen">
      <TopBar title="Inbox" />

      <div className="h-[calc(100vh-64px)] flex">
        {renderConversationList()}
        {renderChatArea()}
      </div>
    </div>
  );
}
