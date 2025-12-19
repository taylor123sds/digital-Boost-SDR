'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  Building,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';
import TopBar from '@/components/layout/TopBar';
import { api, Lead } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

const STAGES = [
  { id: 'novo', label: 'Novo', color: 'bg-blue-500' },
  { id: 'qualificado', label: 'Qualificado', color: 'bg-cyan' },
  { id: 'proposta', label: 'Proposta', color: 'bg-violet' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-yellow-500' },
  { id: 'fechado', label: 'Fechado', color: 'bg-green-500' },
  { id: 'perdido', label: 'Perdido', color: 'bg-red-500' },
];

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLeads();
  }, [search, selectedStage, page]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params: { search?: string; stage?: string; page?: number } = { page };
      if (search) params.search = search;
      if (selectedStage) params.stage = selectedStage;

      const data = await api.getLeads(params);
      setLeads(data.leads);
      setTotal(data.total);
    } catch (error) {
      // Mock data
      setLeads([
        { id: '1', name: 'João Silva', phone: '5584999990001', email: 'joao@empresa.com', company: 'Tech Corp', stage: 'qualificado', score: 85, createdAt: '2024-03-15T10:30:00Z' },
        { id: '2', name: 'Maria Santos', phone: '5584999990002', email: 'maria@startup.io', company: 'Startup IO', stage: 'proposta', score: 92, createdAt: '2024-03-14T14:20:00Z' },
        { id: '3', name: 'Carlos Oliveira', phone: '5584999990003', company: 'Oliveira & Cia', stage: 'novo', score: 65, createdAt: '2024-03-13T09:15:00Z' },
        { id: '4', name: 'Ana Costa', phone: '5584999990004', email: 'ana@digital.com', company: 'Digital Agency', stage: 'negociacao', score: 78, createdAt: '2024-03-12T16:45:00Z' },
        { id: '5', name: 'Pedro Lima', phone: '5584999990005', company: 'Lima Serviços', stage: 'fechado', score: 95, createdAt: '2024-03-11T11:00:00Z' },
      ]);
      setTotal(127);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="success">{score}</Badge>;
    if (score >= 60) return <Badge variant="warning">{score}</Badge>;
    return <Badge variant="danger">{score}</Badge>;
  };

  const getStageBadge = (stageId: string) => {
    const stage = STAGES.find(s => s.id === stageId);
    if (!stage) return null;

    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      novo: 'info',
      qualificado: 'info',
      proposta: 'default',
      negociacao: 'warning',
      fechado: 'success',
      perdido: 'danger',
    };

    return <Badge variant={variants[stageId] || 'default'}>{stage.label}</Badge>;
  };

  return (
    <div className="min-h-screen">
      <TopBar title="CRM" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Leads</h2>
            <p className="text-gray-400 mt-1">{total} leads no total</p>
          </div>
          <Button icon={<Plus size={18} />}>
            Adicionar Lead
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome, telefone ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <Button
                variant={selectedStage === null ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedStage(null)}
              >
                Todos
              </Button>
              {STAGES.map((stage) => (
                <Button
                  key={stage.id}
                  variant={selectedStage === stage.id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedStage(stage.id)}
                >
                  {stage.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan to-violet flex items-center justify-center text-sm font-medium">
                            {lead.name.charAt(0)}
                          </div>
                          <span className="font-medium">{lead.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Phone size={14} />
                            <span className="text-sm">{lead.phone}</span>
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-2 text-gray-400">
                              <Mail size={14} />
                              <span className="text-sm">{lead.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.company && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Building size={14} />
                            <span>{lead.company}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStageBadge(lead.stage)}</TableCell>
                      <TableCell>{getScoreBadge(lead.score)}</TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {formatDateTime(lead.createdAt)}
                      </TableCell>
                      <TableCell>
                        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-glass-border">
                <p className="text-sm text-gray-400">
                  Mostrando {leads.length} de {total} leads
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="px-4 py-2 text-sm">Página {page}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={leads.length < 10}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
