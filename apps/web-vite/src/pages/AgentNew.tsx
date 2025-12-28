import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, HeadphonesIcon, ArrowLeft, Save,
  CheckSquare, ToggleLeft, Calendar, Brain, User, Building,
  Package, Users, Shield, Flag, MessageSquare, Plug, BookOpen,
  Eye, Plus, Trash2, AlertTriangle, CheckCircle, Database, FileText, type LucideIcon
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import TopBar from '../components/layout/TopBar';
import { cn } from '../lib/utils';
import { api, type AgentPresets } from '../lib/api';
import { WhatsAppConnector, CRMConnector, CalendarConnector } from '../components/integrations';
import { DocumentRoutingConfig } from '../components/document';

// Types
type AgentType = 'sdr' | 'specialist' | 'scheduler' | 'support' | 'document_handler';

interface DocumentRoute {
  id: string;
  documentType: string;
  destination: string;
  emailTo: string[];
  whatsappTo: string[];
  autoApprove: boolean;
  sendDocument: boolean;
}
type Sector = 'energia_solar' | 'saas' | 'consultoria' | 'ecommerce' | 'varejo' | 'educacao' | 'imobiliario' | 'financeiro' | 'saude' | 'outro';
type CTAType = 'reuniao' | 'demonstracao' | 'orcamento' | 'visita' | 'teste_gratis';
type AudienceType = 'b2b' | 'b2c' | 'both';
type QualificationFramework = 'bant' | 'spin' | 'meddic' | 'custom';

interface Service {
  id: string;
  name: string;
  description: string;
  price?: string;
}

interface Objection {
  id: string;
  trigger: string;
  response: string;
}

interface AgentForm {
  // Step 0 - Identidade
  name: string;
  language: string;
  tone: number; // 1-5 scale (1=formal, 5=casual)
  persona: string;

  // Step 1 - Empresa
  company: string;
  website: string;
  sector: Sector | '';
  niche: string;
  description: string;
  valueProp: string;
  differentiators: string[];

  // Step 2 - Oferta
  type: AgentType;
  services: Service[];
  offerings: string;

  // Step 3 - ICP (Ideal Customer Profile)
  audienceType: AudienceType;
  regions: string[];
  budgetRange: string;
  pains: string[];
  commonObjections: string[];
  qualificationFramework: QualificationFramework;

  // Step 4 - Politicas
  cancellationPolicy: string;
  returnPolicy: string;
  discountPolicy: string;
  lgpdCompliance: boolean;

  // Step 5 - Objetivos
  ctaType: CTAType;
  ctaDuration: string;
  ctaDescription: string;
  ctaValue: string;
  kpis: string[];
  allowedPromises: string[];
  forbiddenTopics: string[];

  // Step 6 - Canais
  channels: string[];
  operatingHours: {
    start: string;
    end: string;
    days: string[];
  };
  outOfHoursMessage: string;

  // Step 7 - Integracoes
  calendarIntegration: boolean;
  calendarType: string;
  whatsappIntegration: boolean;
  whatsappInstance: string;
  crmIntegration: string;

  // Step 8 - Playbooks
  objectionHandlers: Objection[];
  handoffCriteria: string[];
  followUpCadence: string;

  // Step 9 - Preview & Status
  bantFields: {
    budget: boolean;
    authority: boolean;
    need: boolean;
    timeline: boolean;
    companySize: boolean;
    decisionProcess: boolean;
    painPoints: boolean;
    currentSolution: boolean;
  };
  isActive: boolean;

  // Document Handler specific
  documentRoutes: DocumentRoute[];
}

const iconMap: Record<string, LucideIcon> = {
  Phone,
  HeadphonesIcon,
  Calendar,
  Brain,
  User,
  Building,
  Package,
  Users,
  Shield,
  Flag,
  MessageSquare,
  Plug,
  BookOpen,
  Eye,
  FileText
};

export default function AgentNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [presets, setPresets] = useState<AgentPresets | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);

  const agentTypes = presets?.agentTypes || [];
  const sectors = presets?.sectors || [];
  const ctaTypes = presets?.ctaTypes || [];
  const qualificationFrameworks = presets?.qualificationFrameworks || [];
  const bantFieldsConfig = presets?.bantFieldsConfig || [];
  const weekDays = presets?.weekDays || [];
  const steps = presets?.steps || [];
  const toneLabels = presets?.toneLabels || [];

  useEffect(() => {
    const loadPresets = async () => {
      const data = await api.getAgentPresets();
      setPresets(data);
    };
    loadPresets();
  }, []);

  const [form, setForm] = useState<AgentForm>({
    // Step 0
    name: '',
    language: 'pt-BR',
    tone: 3,
    persona: '',

    // Step 1
    company: '',
    website: '',
    sector: '',
    niche: '',
    description: '',
    valueProp: '',
    differentiators: [],

    // Step 2
    type: 'sdr',
    services: [],
    offerings: '',

    // Step 3
    audienceType: 'b2b',
    regions: ['Brasil'],
    budgetRange: '',
    pains: [],
    commonObjections: [],
    qualificationFramework: 'bant',

    // Step 4
    cancellationPolicy: '',
    returnPolicy: '',
    discountPolicy: '',
    lgpdCompliance: true,

    // Step 5
    ctaType: 'reuniao',
    ctaDuration: '30 minutos',
    ctaDescription: '',
    ctaValue: '',
    kpis: [],
    allowedPromises: [],
    forbiddenTopics: [],

    // Step 6
    channels: ['whatsapp'],
    operatingHours: {
      start: '08:00',
      end: '18:00',
      days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
    },
    outOfHoursMessage: 'Obrigado pelo contato! Nosso horario de atendimento e de segunda a sexta, das 8h as 18h. Retornaremos em breve!',

    // Step 7
    calendarIntegration: false,
    calendarType: '',
    whatsappIntegration: true,
    whatsappInstance: '',
    crmIntegration: '',

    // Step 8
    objectionHandlers: [],
    handoffCriteria: ['Pedido explicito para falar com humano', 'Reclamacao grave', '3+ objecoes consecutivas'],
    followUpCadence: 'D1, D3, D7',

    // Step 9
    bantFields: {
      budget: true,
      authority: true,
      need: true,
      timeline: true,
      companySize: false,
      decisionProcess: false,
      painPoints: true,
      currentSolution: false,
    },
    isActive: true,

    // Document Handler specific
    documentRoutes: [],
  });

  const updateForm = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleBantField = (key: string) => {
    setForm(prev => ({
      ...prev,
      bantFields: {
        ...prev.bantFields,
        [key]: !prev.bantFields[key as keyof typeof prev.bantFields],
      },
    }));
  };

  const addService = () => {
    setForm(prev => ({
      ...prev,
      services: [...prev.services, { id: Date.now().toString(), name: '', description: '', price: '' }]
    }));
  };

  const updateService = (id: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const removeService = (id: string) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  const addObjection = () => {
    setForm(prev => ({
      ...prev,
      objectionHandlers: [...prev.objectionHandlers, { id: Date.now().toString(), trigger: '', response: '' }]
    }));
  };

  const updateObjection = (id: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      objectionHandlers: prev.objectionHandlers.map(o => o.id === id ? { ...o, [field]: value } : o)
    }));
  };

  const removeObjection = (id: string) => {
    setForm(prev => ({
      ...prev,
      objectionHandlers: prev.objectionHandlers.filter(o => o.id !== id)
    }));
  };

  const addToArray = (field: keyof AgentForm, value: string) => {
    if (!value.trim()) return;
    setForm(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value.trim()]
    }));
  };

  const removeFromArray = (field: keyof AgentForm, index: number) => {
    setForm(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const canProceed = () => {
    if (step === 0) return form.name.trim() && form.persona.trim();
    if (step === 1) return form.company.trim() && form.sector && form.description.trim();
    if (step === 2) return form.type && (form.services.length > 0 || form.offerings.trim());
    if (step === 3) return form.audienceType;
    if (step === 4) return true;
    if (step === 5) return form.ctaType && form.ctaDescription.trim();
    if (step === 6) return form.channels.length > 0;
    if (step === 7) return true;
    if (step === 8) return form.handoffCriteria.length > 0;
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          status: form.isActive ? 'active' : 'draft',
          config: {
            agent: {
              name: form.name,
              language: form.language,
              tone: form.tone,
              persona: form.persona,
            },
            business: {
              companyName: form.company,
              website: form.website,
              sector: form.sector,
              niche: form.niche,
              description: form.description,
              valueProp: form.valueProp,
              differentiators: form.differentiators,
            },
            offer: {
              services: form.services,
              offerings: form.offerings.split('\n').filter(Boolean),
            },
            audience: {
              type: form.audienceType,
              regions: form.regions,
              budgetRange: form.budgetRange,
              pains: form.pains,
              commonObjections: form.commonObjections,
              qualificationFramework: form.qualificationFramework,
            },
            policies: {
              cancellation: form.cancellationPolicy,
              returns: form.returnPolicy,
              discounts: form.discountPolicy,
              lgpdCompliance: form.lgpdCompliance,
            },
            goals: {
              cta: {
                type: form.ctaType,
                duration: form.ctaDuration,
                description: form.ctaDescription,
                value: form.ctaValue,
              },
              kpis: form.kpis,
              allowedPromises: form.allowedPromises,
              forbiddenTopics: form.forbiddenTopics,
            },
            channels: {
              active: form.channels,
              operatingHours: form.operatingHours,
              outOfHoursMessage: form.outOfHoursMessage,
            },
            integrations: {
              calendar: form.calendarIntegration ? { type: form.calendarType } : null,
              whatsapp: form.whatsappIntegration ? { instance: form.whatsappInstance } : null,
              crm: form.crmIntegration || null,
            },
            playbooks: {
              objectionHandlers: form.objectionHandlers,
              handoffCriteria: form.handoffCriteria,
              followUpCadence: form.followUpCadence,
            },
            qualification: {
              bant: form.bantFields,
            },
          },
        }),
      });

      if (response.ok) {
        const payload = await response.json().catch(() => null);
        const createdAgentId = payload?.data?.id || payload?.id || null;
        if (createdAgentId) {
          // Set agentId for integrations that need it
          setAgentId(createdAgentId);
          // Navigate to agent detail page (integrations are now configured in the wizard)
          navigate(`/agents/${createdAgentId}`);
        } else {
          navigate('/agents');
        }
      } else {
        navigate('/agents');
      }
    } catch (error) {
      console.error('Erro ao salvar agente:', error);
      navigate('/agents');
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Card>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="text-cyan" size={20} />
                Identidade do Agente
              </h2>
              <p className="text-sm text-gray-400 mt-1">Defina a personalidade e tom do seu agente</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Nome do Agente *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="Ex: Luna, Sofia, Leadly"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Idioma</label>
                  <select
                    value={form.language}
                    onChange={(e) => updateForm('language', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                  >
                    <option value="pt-BR">Portugues (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es">Espanol</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Tom de Comunicacao</label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={form.tone}
                    onChange={(e) => updateForm('tone', parseInt(e.target.value))}
                    className="w-full accent-cyan"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    {toneLabels.map((label, i) => (
                      <span key={i} className={form.tone === i + 1 ? 'text-cyan font-medium' : ''}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Persona / Descricao *</label>
                <textarea
                  value={form.persona}
                  onChange={(e) => updateForm('persona', e.target.value)}
                  rows={3}
                  placeholder="Descreva a personalidade do agente. Ex: Consultor especializado em energia solar, sempre positivo e focado em solucoes..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Tipo de Agente</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agentTypes.map((type) => {
                    const Icon = iconMap[type.icon] || Plug;
                    return (
                      <button
                        key={type.id}
                        onClick={() => updateForm('type', type.id)}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-all flex items-start gap-4",
                          form.type === type.id ? "border-cyan bg-cyan/10" : "border-white/10 hover:border-white/30"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                          form.type === type.id ? "bg-gradient-to-br from-cyan to-violet" : "bg-white/10"
                        )}>
                          <Icon size={24} className={form.type === type.id ? "text-dark-bg" : "text-gray-400"} />
                        </div>
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-sm text-gray-400 mt-1">{type.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        );

      case 1:
        return (
          <Card>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building className="text-violet" size={20} />
                Contexto da Empresa
              </h2>
              <p className="text-sm text-gray-400 mt-1">Informacoes sobre seu negocio</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Nome da Empresa *</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => updateForm('company', e.target.value)}
                    placeholder="Nome da sua empresa"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => updateForm('website', e.target.value)}
                    placeholder="https://suaempresa.com.br"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Setor *</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {sectors.map((sector) => (
                    <button
                      key={sector.id}
                      onClick={() => updateForm('sector', sector.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all flex items-center gap-2",
                        form.sector === sector.id ? "border-cyan bg-cyan/10" : "border-white/10 hover:border-white/30"
                      )}
                    >
                      <span className="text-lg">{sector.icon}</span>
                      <span className="text-sm">{sector.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Nicho Especifico</label>
                <input
                  type="text"
                  value={form.niche}
                  onChange={(e) => updateForm('niche', e.target.value)}
                  placeholder="Ex: Energia solar residencial, SaaS para RH, etc."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Descricao do Negocio *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  rows={2}
                  placeholder="O que sua empresa faz em uma frase"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Proposta de Valor</label>
                <textarea
                  value={form.valueProp}
                  onChange={(e) => updateForm('valueProp', e.target.value)}
                  rows={2}
                  placeholder="Principal beneficio que voce entrega aos clientes"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Diferenciais</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar diferencial"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('differentiators', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                      addToArray('differentiators', input.value);
                      input.value = '';
                    }}
                    icon={<Plus size={16} />}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.differentiators.map((diff, i) => (
                    <span key={i} className="px-3 py-1 bg-violet/20 text-violet rounded-full text-sm flex items-center gap-2">
                      {diff}
                      <button onClick={() => removeFromArray('differentiators', i)}>
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );

      case 2:
        return (
          <Card>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="text-green-500" size={20} />
                Oferta de Servicos/Produtos
              </h2>
              <p className="text-sm text-gray-400 mt-1">O que sua empresa oferece</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm text-gray-400">Servicos/Produtos</label>
                  <Button variant="secondary" size="sm" onClick={addService} icon={<Plus size={14} />}>
                    Adicionar Servico
                  </Button>
                </div>

                {form.services.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/20 rounded-lg">
                    <Package size={32} className="mx-auto text-gray-500 mb-2" />
                    <p className="text-gray-400 text-sm">Nenhum servico cadastrado</p>
                    <Button variant="secondary" size="sm" className="mt-4" onClick={addService}>
                      Adicionar Primeiro Servico
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.services.map((service) => (
                      <div key={service.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input
                            type="text"
                            value={service.name}
                            onChange={(e) => updateService(service.id, 'name', e.target.value)}
                            placeholder="Nome do servico"
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                          />
                          <input
                            type="text"
                            value={service.description}
                            onChange={(e) => updateService(service.id, 'description', e.target.value)}
                            placeholder="Descricao breve"
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={service.price || ''}
                              onChange={(e) => updateService(service.id, 'price', e.target.value)}
                              placeholder="Preco (opcional)"
                              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeService(service.id)}
                              className="text-red-400"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Ou descreva em texto (um por linha)</label>
                <textarea
                  value={form.offerings}
                  onChange={(e) => updateForm('offerings', e.target.value)}
                  rows={4}
                  placeholder="Sistema de gestao&#10;Consultoria especializada&#10;Suporte premium"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 resize-none font-mono text-sm"
                />
              </div>
            </div>
          </Card>
        );

      case 3:
        return (
          <Card>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="text-amber-500" size={20} />
                Perfil do Cliente Ideal (ICP)
              </h2>
              <p className="text-sm text-gray-400 mt-1">Quem sao seus clientes ideais</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tipo de Audiencia</label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'b2b', label: 'B2B', desc: 'Empresas' },
                    { id: 'b2c', label: 'B2C', desc: 'Consumidores' },
                    { id: 'both', label: 'Ambos', desc: 'B2B e B2C' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => updateForm('audienceType', opt.id)}
                      className={cn(
                        "p-4 rounded-lg border text-center transition-all",
                        form.audienceType === opt.id ? "border-amber-500 bg-amber-500/10" : "border-white/10 hover:border-white/30"
                      )}
                    >
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-xs text-gray-400">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Faixa de Orcamento</label>
                  <input
                    type="text"
                    value={form.budgetRange}
                    onChange={(e) => updateForm('budgetRange', e.target.value)}
                    placeholder="Ex: R$ 5.000 - R$ 50.000"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Framework de Qualificacao</label>
                  <select
                    value={form.qualificationFramework}
                    onChange={(e) => updateForm('qualificationFramework', e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                  >
                    {qualificationFrameworks.map((fw) => (
                      <option key={fw.id} value={fw.id}>{fw.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Principais Dores do Cliente</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar dor"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('pains', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.pains.map((pain, i) => (
                    <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm flex items-center gap-2">
                      {pain}
                      <button onClick={() => removeFromArray('pains', i)}><Trash2 size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Objecoes Comuns</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar objecao comum"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('commonObjections', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.commonObjections.map((obj, i) => (
                    <span key={i} className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm flex items-center gap-2">
                      {obj}
                      <button onClick={() => removeFromArray('commonObjections', i)}><Trash2 size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );

      case 4:
        return (
          <Card>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="text-blue-500" size={20} />
                Politicas e Regras
              </h2>
              <p className="text-sm text-gray-400 mt-1">Defina limites e politicas do agente</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Politica de Cancelamento</label>
                <textarea
                  value={form.cancellationPolicy}
                  onChange={(e) => updateForm('cancellationPolicy', e.target.value)}
                  rows={2}
                  placeholder="Descreva a politica de cancelamento..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Politica de Descontos</label>
                <textarea
                  value={form.discountPolicy}
                  onChange={(e) => updateForm('discountPolicy', e.target.value)}
                  rows={2}
                  placeholder="Quais descontos o agente pode oferecer? Quando?"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 resize-none"
                />
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.lgpdCompliance}
                    onChange={(e) => updateForm('lgpdCompliance', e.target.checked)}
                    className="w-5 h-5 accent-blue-500 rounded"
                  />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Shield size={16} className="text-blue-500" />
                      Conformidade LGPD
                    </div>
                    <div className="text-sm text-gray-400">Solicitar consentimento antes de coletar dados pessoais</div>
                  </div>
                </label>
              </div>
            </div>
          </Card>
        );

      case 5:
        return (
          <Card>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Flag className="text-green-500" size={20} />
                Objetivos e CTA
              </h2>
              <p className="text-sm text-gray-400 mt-1">O que o agente deve buscar</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Call to Action Principal</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ctaTypes.map((cta) => (
                    <button
                      key={cta.id}
                      onClick={() => updateForm('ctaType', cta.id)}
                      className={cn(
                        "p-4 rounded-lg border text-left transition-all",
                        form.ctaType === cta.id ? "border-green-500 bg-green-500/10" : "border-white/10 hover:border-white/30"
                      )}
                    >
                      <div className="font-medium">{cta.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{cta.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Duracao</label>
                  <input
                    type="text"
                    value={form.ctaDuration}
                    onChange={(e) => updateForm('ctaDuration', e.target.value)}
                    placeholder="Ex: 30 minutos"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Descricao do CTA *</label>
                  <input
                    type="text"
                    value={form.ctaDescription}
                    onChange={(e) => updateForm('ctaDescription', e.target.value)}
                    placeholder="Ex: Diagnostico gratuito para sua empresa"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Valor para o Lead</label>
                <input
                  type="text"
                  value={form.ctaValue}
                  onChange={(e) => updateForm('ctaValue', e.target.value)}
                  placeholder="O que o lead ganha (Ex: Plano de acao personalizado)"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Topicos Proibidos</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar topico proibido"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('forbiddenTopics', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.forbiddenTopics.map((topic, i) => (
                    <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm flex items-center gap-2">
                      <AlertTriangle size={12} />
                      {topic}
                      <button onClick={() => removeFromArray('forbiddenTopics', i)}><Trash2 size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );

      case 6:
        return (
          <Card>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="text-violet" size={20} />
                Canais e Horarios
              </h2>
              <p className="text-sm text-gray-400 mt-1">Onde e quando o agente atende</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Canais Ativos</label>
                <div className="flex flex-wrap gap-3">
                  {['whatsapp', 'webchat', 'email', 'instagram'].map((channel) => (
                    <label
                      key={channel}
                      className={cn(
                        "px-4 py-2 rounded-lg border cursor-pointer flex items-center gap-2",
                        form.channels.includes(channel) ? "border-violet bg-violet/10" : "border-white/10"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.channels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateForm('channels', [...form.channels, channel]);
                          } else {
                            updateForm('channels', form.channels.filter(c => c !== channel));
                          }
                        }}
                        className="hidden"
                      />
                      <span className="capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Horario de Atendimento</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Inicio</label>
                    <input
                      type="time"
                      value={form.operatingHours.start}
                      onChange={(e) => updateForm('operatingHours', { ...form.operatingHours, start: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fim</label>
                    <input
                      type="time"
                      value={form.operatingHours.end}
                      onChange={(e) => updateForm('operatingHours', { ...form.operatingHours, end: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Dias de Atendimento</label>
                <div className="flex gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day}
                      onClick={() => {
                        const days = form.operatingHours.days;
                        if (days.includes(day)) {
                          updateForm('operatingHours', { ...form.operatingHours, days: days.filter(d => d !== day) });
                        } else {
                          updateForm('operatingHours', { ...form.operatingHours, days: [...days, day] });
                        }
                      }}
                      className={cn(
                        "w-12 h-12 rounded-lg border font-medium",
                        form.operatingHours.days.includes(day) ? "border-violet bg-violet/20 text-violet" : "border-white/10 text-gray-400"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Mensagem Fora do Horario</label>
                <textarea
                  value={form.outOfHoursMessage}
                  onChange={(e) => updateForm('outOfHoursMessage', e.target.value)}
                  rows={2}
                  placeholder="Mensagem enviada fora do horario de atendimento"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 resize-none"
                />
              </div>
            </div>
          </Card>
        );

      case 7:
        return (
          <Card>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plug className="text-cyan" size={20} />
                Integracoes
              </h2>
              <p className="text-sm text-gray-400 mt-1">Conecte servicos externos ao seu agente</p>
            </div>
            <div className="p-6 space-y-6">
              {/* WhatsApp Integration */}
              <WhatsAppConnector
                agentId={agentId || undefined}
                instanceName={form.whatsappInstance || `agent_${form.name.toLowerCase().replace(/\s+/g, '_')}`}
                onConnectionChange={(connected, instanceName) => {
                  updateForm('whatsappIntegration', connected);
                  if (instanceName) {
                    updateForm('whatsappInstance', instanceName);
                  }
                }}
              />

              {/* Google Calendar Integration */}
              <CalendarConnector
                isConnected={form.calendarIntegration}
                onConnectionChange={(connected) => {
                  updateForm('calendarIntegration', connected);
                }}
              />

              {/* CRM Integration */}
              <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                <CRMConnector
                  selectedProvider={form.crmIntegration || undefined}
                  isConnected={!!form.crmIntegration}
                  onConnectionChange={(provider, connected) => {
                    updateForm('crmIntegration', connected ? provider || '' : '');
                  }}
                />
              </div>

              {/* Integration Summary */}
              <div className="p-4 bg-white/5 rounded-lg border border-dashed border-white/20">
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-cyan" />
                  Resumo das Integracoes
                </h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className={cn(
                    "p-3 rounded-lg border",
                    form.whatsappIntegration
                      ? "border-green-500/30 bg-green-500/10"
                      : "border-white/10 bg-white/5"
                  )}>
                    <MessageSquare size={20} className={form.whatsappIntegration ? "text-green-500 mx-auto mb-1" : "text-gray-500 mx-auto mb-1"} />
                    <div className="text-xs text-gray-400">WhatsApp</div>
                    <Badge variant={form.whatsappIntegration ? "success" : "default"} className="mt-1">
                      {form.whatsappIntegration ? "Conectado" : "Pendente"}
                    </Badge>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    form.calendarIntegration
                      ? "border-blue-500/30 bg-blue-500/10"
                      : "border-white/10 bg-white/5"
                  )}>
                    <Calendar size={20} className={form.calendarIntegration ? "text-blue-500 mx-auto mb-1" : "text-gray-500 mx-auto mb-1"} />
                    <div className="text-xs text-gray-400">Calendar</div>
                    <Badge variant={form.calendarIntegration ? "success" : "default"} className="mt-1">
                      {form.calendarIntegration ? "Conectado" : "Pendente"}
                    </Badge>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border",
                    form.crmIntegration
                      ? "border-violet/30 bg-violet/10"
                      : "border-white/10 bg-white/5"
                  )}>
                    <Database size={20} className={form.crmIntegration ? "text-violet mx-auto mb-1" : "text-gray-500 mx-auto mb-1"} />
                    <div className="text-xs text-gray-400">CRM</div>
                    <Badge variant={form.crmIntegration ? "success" : "default"} className="mt-1">
                      {form.crmIntegration ? form.crmIntegration.charAt(0).toUpperCase() + form.crmIntegration.slice(1) : "Pendente"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Note about agent requirement */}
              {!agentId && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-200">
                      Para conectar o WhatsApp, o agente precisa ser salvo primeiro.
                      Complete o wizard e salve o agente para ativar as integracoes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );

      case 8:
        // Document Handler agent shows Document Routing, others show Playbooks
        if (form.type === 'document_handler') {
          return (
            <Card>
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="text-blue-500" size={20} />
                  Roteamento de Documentos
                </h2>
                <p className="text-sm text-gray-400 mt-1">Configure para onde cada tipo de documento sera enviado</p>
              </div>
              <div className="p-6">
                <DocumentRoutingConfig
                  documentTypes={presets?.documentTypes || []}
                  routingDestinations={presets?.routingDestinations || []}
                  routes={form.documentRoutes}
                  onRoutesChange={(routes) => updateForm('documentRoutes', routes)}
                />
              </div>
            </Card>
          );
        }

        // Default: Playbooks for SDR, Support, etc.
        return (
          <Card>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="text-amber-500" size={20} />
                Playbooks
              </h2>
              <p className="text-sm text-gray-400 mt-1">Configure comportamentos especificos</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm text-gray-400">Respostas para Objecoes</label>
                  <Button variant="secondary" size="sm" onClick={addObjection} icon={<Plus size={14} />}>
                    Adicionar
                  </Button>
                </div>
                {form.objectionHandlers.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-white/20 rounded-lg">
                    <p className="text-gray-400 text-sm">Nenhuma objecao configurada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {form.objectionHandlers.map((obj) => (
                      <div key={obj.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={obj.trigger}
                            onChange={(e) => updateObjection(obj.id, 'trigger', e.target.value)}
                            placeholder="Gatilho (ex: esta muito caro)"
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={obj.response}
                              onChange={(e) => updateObjection(obj.id, 'response', e.target.value)}
                              placeholder="Resposta do agente"
                              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                            />
                            <Button variant="ghost" size="sm" onClick={() => removeObjection(obj.id)} className="text-red-400">
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Criterios para Handoff (escalar para humano)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Adicionar criterio"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addToArray('handoffCriteria', (e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.handoffCriteria.map((criteria, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm flex items-center gap-2">
                      {criteria}
                      <button onClick={() => removeFromArray('handoffCriteria', i)}><Trash2 size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Cadencia de Follow-up</label>
                <input
                  type="text"
                  value={form.followUpCadence}
                  onChange={(e) => updateForm('followUpCadence', e.target.value)}
                  placeholder="Ex: D1, D3, D7 (dias 1, 3 e 7)"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50"
                />
              </div>
            </div>
          </Card>
        );

      case 9:
        return (
          <div className="space-y-6">
            <Card>
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckSquare className="text-yellow-500" size={20} />
                  Campos de Qualificacao (BANT)
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bantFieldsConfig.map((field) => (
                    <label
                      key={field.key}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                        form.bantFields[field.key as keyof typeof form.bantFields]
                          ? "border-yellow-500/50 bg-yellow-500/10"
                          : "border-white/10 hover:border-white/30"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.bantFields[field.key as keyof typeof form.bantFields]}
                        onChange={() => toggleBantField(field.key)}
                        className="w-5 h-5 mt-0.5 accent-yellow-500 rounded"
                      />
                      <div>
                        <div className="font-medium">{field.label}</div>
                        <div className="text-sm text-gray-400 mt-1">{field.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ToggleLeft className="text-gray-400" size={20} />
                  Resumo e Status
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="p-4 bg-white/5 rounded-lg">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => updateForm('isActive', e.target.checked)}
                      className="w-6 h-6 accent-green-500 rounded"
                    />
                    <div>
                      <div className="font-medium">Agente Ativo</div>
                      <div className="text-sm text-gray-400">Se ativado, o agente comecara a responder imediatamente</div>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-cyan">Identidade</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">Nome:</span><span>{form.name || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Empresa:</span><span>{form.company || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Setor:</span><span>{sectors.find(s => s.id === form.sector)?.name || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Tipo:</span><span>{agentTypes.find(t => t.id === form.type)?.name || '-'}</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-green-500">CTA</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-400">Tipo:</span><span>{ctaTypes.find(c => c.id === form.ctaType)?.name || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">Duracao:</span><span>{form.ctaDuration || '-'}</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-violet">Canais</h3>
                    <div className="flex flex-wrap gap-2">
                      {form.channels.map(ch => (
                        <span key={ch} className="px-2 py-1 bg-violet/20 text-violet rounded text-xs capitalize">{ch}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-yellow-500">BANT</h3>
                    <div className="flex flex-wrap gap-2">
                      {bantFieldsConfig.filter(f => form.bantFields[f.key as keyof typeof form.bantFields]).map(f => (
                        <span key={f.key} className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded">{f.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Novo Agente" />

      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/agents')} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
                    <h1 className="text-2xl font-semibold">Criar Novo Agente</h1>
            <p className="text-gray-400 mt-1">Configure seu agente de IA em 10 passos</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex items-center gap-1 min-w-max bg-dark-card p-2 rounded-xl border border-white/10">
            {steps.map((s, idx) => {
              const Icon = iconMap[s.icon] || Plug;
              const isActive = step === s.id;
              const isCompleted = step > s.id;

              return (
                <div key={s.id} className="flex items-center">
                  <button
                    onClick={() => step > s.id && setStep(s.id)}
                    disabled={step < s.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                      isActive && "bg-cyan/20",
                      isCompleted && "cursor-pointer hover:bg-white/5",
                      !isActive && !isCompleted && "opacity-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-sm",
                        isActive ? "bg-gradient-to-r from-cyan to-violet text-dark-bg" :
                        isCompleted ? "bg-green-500/20 text-green-500" :
                        "bg-white/10 text-gray-400"
                      )}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="hidden lg:block text-left">
                      <div className={cn(
                        "text-xs font-medium",
                        isActive ? "text-cyan" : isCompleted ? "text-green-500" : "text-gray-400"
                      )}>
                        {s.title}
                      </div>
                    </div>
                  </button>
                  {idx < steps.length - 1 && (
                    <div className={cn("w-4 h-0.5 mx-1", isCompleted ? "bg-green-500" : "bg-white/10")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="secondary" onClick={() => step > 0 ? setStep(step - 1) : navigate('/agents')}>
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>

          {step < 9 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Proximo
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} icon={<Save size={18} />}>
              {saving ? 'Salvando...' : 'Criar Agente'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
