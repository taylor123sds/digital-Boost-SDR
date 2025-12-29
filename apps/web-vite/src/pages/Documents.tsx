import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Upload,
  Search,
  Filter,
  RefreshCw,
  FolderOpen,
  Package,
  Eye,
  Trash2,
  Download,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock,
  FileCheck
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import TopBar from '../components/layout/TopBar';
import { api } from '../lib/api';
import { useActiveAgentId, useAgent } from '../contexts/AgentContext';

interface Document {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  origin: string;
  agent_id?: string;
  created_at: string;
  metadata?: any;
}

interface DocumentPackage {
  id: string;
  name: string;
  process_number?: string;
  organization?: string;
  package_type: string;
  status: string;
  created_at: string;
  documents?: any[];
}

type ViewMode = 'documents' | 'packages';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [packages, setPackages] = useState<DocumentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('documents');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);

  const agentId = useActiveAgentId();
  const { activeAgent, loading: agentLoading } = useAgent();

  // Load data when agent changes
  useEffect(() => {
    if (!agentLoading) {
      loadData();
    }
  }, [agentId, agentLoading, viewMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'documents') {
        const response = await api.get('/api/documents', {
          params: { agentId, limit: 50 }
        });
        setDocuments(response.documents || []);
      } else {
        const response = await api.get('/api/packages', {
          params: { agentId, limit: 50 }
        });
        setPackages(response.packages || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setDocuments([]);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (agentId) formData.append('agentId', agentId);

      const response = await api.upload('/api/documents/upload', formData);

      if (response.success) {
        loadData();
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      await api.delete(`/api/documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle size={12} /> Processado</Badge>;
      case 'processing':
        return <Badge variant="info" className="flex items-center gap-1"><Clock size={12} /> Processando</Badge>;
      case 'error':
        return <Badge variant="danger" className="flex items-center gap-1"><AlertCircle size={12} /> Erro</Badge>;
      default:
        return <Badge variant="default" className="flex items-center gap-1"><Clock size={12} /> Pendente</Badge>;
    }
  };

  const getPackageTypeBadge = (type: string) => {
    switch (type) {
      case 'licitacao':
        return <Badge variant="info">Licitacao</Badge>;
      case 'contrato':
        return <Badge variant="success">Contrato</Badge>;
      case 'aditivo':
        return <Badge variant="warning">Aditivo</Badge>;
      default:
        return <Badge variant="default">Outro</Badge>;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return doc.name?.toLowerCase().includes(searchLower);
  });

  const filteredPackages = packages.filter(pkg => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      pkg.name?.toLowerCase().includes(searchLower) ||
      pkg.process_number?.toLowerCase().includes(searchLower) ||
      pkg.organization?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen">
      <TopBar title="Documentos" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">Gestao de Documentos</h1>
              {activeAgent && (
                <span className="px-2 py-1 text-xs bg-cyan/10 text-cyan border border-cyan/20 rounded-full">
                  {activeAgent.name}
                </span>
              )}
            </div>
            <p className="text-gray-400 mt-1">
              {viewMode === 'documents'
                ? `${filteredDocuments.length} documentos`
                : `${filteredPackages.length} pacotes`
              }
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode('documents')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'documents'
                    ? 'bg-cyan/20 text-cyan'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText size={16} className="inline-block mr-1" />
                Documentos
              </button>
              <button
                onClick={() => setViewMode('packages')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === 'packages'
                    ? 'bg-cyan/20 text-cyan'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Package size={16} className="inline-block mr-1" />
                Pacotes
              </button>
            </div>

            <div className="w-64">
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>

            <button
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              title="Recarregar"
            >
              <RefreshCw size={20} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button icon={<Upload size={18} />} disabled={uploading}>
                {uploading ? 'Enviando...' : 'Upload'}
              </Button>
            </label>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Carregando...</p>
            </div>
          </div>
        ) : viewMode === 'documents' ? (
          /* Documents Grid */
          filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium mb-2">Nenhum documento</h3>
              <p className="text-gray-400 mb-4">
                Faca upload de um documento para comecar.
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button icon={<Upload size={18} />}>
                  Enviar Documento
                </Button>
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} hover className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center">
                        <FileText size={20} className="text-cyan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{doc.name}</h4>
                        <p className="text-xs text-gray-400">
                          {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-xs text-gray-500">
                      Origem: {doc.origin}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-cyan transition-colors"
                        title="Visualizar"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          /* Packages List */
          filteredPackages.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={48} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium mb-2">Nenhum pacote</h3>
              <p className="text-gray-400">
                Pacotes sao criados automaticamente ao processar documentos relacionados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPackages.map((pkg) => (
                <Card key={pkg.id} hover className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center">
                        <FolderOpen size={24} className="text-cyan" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{pkg.name}</h4>
                          {getPackageTypeBadge(pkg.package_type)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                          {pkg.process_number && (
                            <span>Processo: {pkg.process_number}</span>
                          )}
                          {pkg.organization && (
                            <span>Orgao: {pkg.organization}</span>
                          )}
                          <span>
                            {pkg.documents?.length || 0} documento(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant={pkg.status === 'completed' ? 'success' : 'default'}>
                        {pkg.status}
                      </Badge>
                      <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
