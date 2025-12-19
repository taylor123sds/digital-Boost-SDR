'use client';

import { useState } from 'react';
import { ArrowLeft, Bot, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import TopBar from '@/components/layout/TopBar';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;

const agentTypes = [
  {
    id: 'sdr',
    name: 'SDR Agent',
    description: 'Agente de prospecção e qualificação de leads',
    features: ['Prospecção automática', 'Qualificação BANT', 'Agendamento de reuniões'],
  },
  {
    id: 'support',
    name: 'Suporte',
    description: 'Agente para atendimento e suporte ao cliente',
    features: ['Respostas FAQ', 'Escalonamento inteligente', 'Satisfação do cliente'],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Crie um agente personalizado do zero',
    features: ['Totalmente customizável', 'Persona personalizada', 'Fluxos sob demanda'],
  },
];

const channels = [
  { id: 'whatsapp', name: 'WhatsApp', icon: '📱' },
  { id: 'email', name: 'Email', icon: '📧' },
  { id: 'chat', name: 'Chat Web', icon: '💬' },
];

export default function NewAgentPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '' as 'sdr' | 'support' | 'custom' | '',
    channel: '' as 'whatsapp' | 'email' | 'chat' | '',
    description: '',
  });

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api.createAgent({
        name: formData.name,
        type: formData.type as 'sdr' | 'support' | 'custom',
        channel: formData.channel as 'whatsapp' | 'email' | 'chat',
        status: 'paused',
      });
      window.location.href = '/agents';
    } catch (error) {
      console.error('Erro ao criar agente:', error);
      // For demo, redirect anyway
      window.location.href = '/agents';
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!formData.type;
      case 2: return !!formData.channel;
      case 3: return !!formData.name;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Novo Agente" />

      <div className="p-6 max-w-4xl mx-auto">
        {/* Back + Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Criar Novo Agente</h1>
            <p className="text-gray-400 mt-1">Configure seu agente de IA em poucos passos</p>
          </div>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all',
                  step >= s
                    ? 'bg-gradient-to-r from-cyan to-violet text-dark-bg'
                    : 'bg-white/10 text-gray-400'
                )}
              >
                {step > s ? <Check size={18} /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    'w-20 h-1 mx-2 rounded-full transition-all',
                    step > s ? 'bg-gradient-to-r from-cyan to-violet' : 'bg-white/10'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Type */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center">Escolha o tipo de agente</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agentTypes.map((type) => (
                <Card
                  key={type.id}
                  hover
                  className={cn(
                    'cursor-pointer transition-all',
                    formData.type === type.id && 'border-cyan ring-2 ring-cyan/20'
                  )}
                  onClick={() => setFormData({ ...formData, type: type.id as typeof formData.type })}
                >
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center mb-4">
                      <Bot size={32} className="text-cyan" />
                    </div>
                    <h3 className="font-semibold text-lg">{type.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{type.description}</p>
                  </div>
                  <ul className="space-y-2">
                    {type.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check size={14} className="text-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Channel */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center">Escolha o canal de comunicação</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {channels.map((channel) => (
                <Card
                  key={channel.id}
                  hover
                  className={cn(
                    'cursor-pointer text-center py-8 transition-all',
                    formData.channel === channel.id && 'border-cyan ring-2 ring-cyan/20'
                  )}
                  onClick={() => setFormData({ ...formData, channel: channel.id as typeof formData.channel })}
                >
                  <span className="text-4xl mb-4 block">{channel.icon}</span>
                  <h3 className="font-semibold">{channel.name}</h3>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 3 && (
          <div className="space-y-6 max-w-xl mx-auto">
            <h2 className="text-xl font-semibold text-center">Configure seu agente</h2>
            <Card>
              <div className="space-y-4">
                <Input
                  label="Nome do Agente"
                  placeholder="Ex: ORBION SDR"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Descrição (opcional)
                  </label>
                  <textarea
                    className="w-full bg-dark-bg2 border border-glass-border rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan/50 transition-all resize-none"
                    rows={3}
                    placeholder="Descreva o objetivo deste agente..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="font-medium mb-2">Resumo</h4>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Tipo: <span className="text-white">{agentTypes.find(t => t.id === formData.type)?.name}</span></p>
                    <p>Canal: <span className="text-white">{channels.find(c => c.id === formData.channel)?.name}</span></p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="secondary"
            onClick={() => setStep((s) => (s - 1) as Step)}
            disabled={step === 1}
          >
            Voltar
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canProceed()}>
              Continuar
            </Button>
          ) : (
            <Button onClick={handleCreate} loading={loading} disabled={!canProceed()}>
              Criar Agente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
