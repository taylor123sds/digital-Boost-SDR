import { useEffect, useState } from 'react';
import {
  Check, Zap, Crown, Building,
  Download, Calendar, ArrowUpRight, Clock, AlertTriangle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import TopBar from '../components/layout/TopBar';
import { cn } from '../lib/utils';

// Types
interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  features: string[];
  limits: {
    agents: number;
    messages: number;
    leads: number;
  };
  recommended?: boolean;
}

interface Subscription {
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface Usage {
  agents: { used: number; limit: number };
  messages: { used: number; limit: number };
  leads: { used: number; limit: number };
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl?: string;
}

const plans: Plan[] = [
  {
    id: 'trial',
    name: 'Trial',
    price: 0,
    billingPeriod: 'monthly',
    features: [
      '1 Agente SDR',
      '100 mensagens',
      '10 leads ativos',
      'Qualificacao BANT',
      'Dashboard basico',
      '7 dias de teste'
    ],
    limits: { agents: 1, messages: 100, leads: 10 }
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 97,
    billingPeriod: 'monthly',
    features: [
      '1 Agente SDR',
      '1.000 mensagens/mes',
      '100 leads ativos',
      'Qualificacao BANT',
      'Dashboard basico',
      'Suporte por email'
    ],
    limits: { agents: 1, messages: 1000, leads: 100 }
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 297,
    billingPeriod: 'monthly',
    features: [
      '3 Agentes (SDR, Specialist, Support)',
      '10.000 mensagens/mes',
      '1.000 leads ativos',
      'BANT + SPIN Selling',
      'Analytics avancado',
      'Integracoes CRM',
      'Suporte prioritario'
    ],
    limits: { agents: 3, messages: 10000, leads: 1000 },
    recommended: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 997,
    billingPeriod: 'monthly',
    features: [
      'Agentes ilimitados',
      'Mensagens ilimitadas',
      'Leads ilimitados',
      'Multi-tenant',
      'API completa',
      'White-label',
      'SLA garantido',
      'Gerente de conta dedicado'
    ],
    limits: { agents: -1, messages: -1, leads: -1 }
  }
];

// Invoices are loaded from backend

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const entitlementRes = await fetch('/api/auth/entitlements', { headers }).catch(() => null);

      // Check entitlements first (trial/billing status)
      if (entitlementRes?.ok) {
        const entData = await entitlementRes.json();
        if (entData.success && entData.data) {
          const ent = entData.data;
          // Map entitlements to subscription
          setSubscription({
            planId: ent.billingStatus === 'trial' ? 'trial' : ent.billingStatus === 'active' ? 'professional' : 'starter',
            status: ent.billingStatus === 'trial' ? 'trialing' : ent.billingStatus as Subscription['status'],
            currentPeriodEnd: ent.trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancelAtPeriodEnd: false
          });

          setUsage({
            agents: { used: 0, limit: ent.maxAgents || 1 },
            messages: { used: ent.messagesUsed || 0, limit: ent.maxMessagesPerMonth || 1000 },
            leads: { used: 0, limit: 100 }
          });
        }
      } else {
        // Default trial
        setSubscription({
          planId: 'trial',
          status: 'trialing',
          currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false
        });
      }

      if (!entitlementRes?.ok) {
        setUsage({
          agents: { used: 1, limit: 1 },
          messages: { used: 0, limit: 1000 },
          leads: { used: 0, limit: 100 }
        });
      }

      setInvoices([]);
    } catch {
      // Use trial data on error
      setSubscription({
        planId: 'trial',
        status: 'trialing',
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false
      });
      setUsage({
        agents: { used: 1, limit: 1 },
        messages: { used: 0, limit: 1000 },
        leads: { used: 0, limit: 100 }
      });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setSelectedPlan(planId);
    setShowUpgradeModal(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      alert('Upgrade via dashboard ainda nao esta disponivel. Entre em contato com o suporte.');
      setShowUpgradeModal(false);
    } catch (error) {
      console.error('Erro ao fazer upgrade:', error);
    }
  };

  const currentPlan = plans.find(p => p.id === subscription?.planId);
  const yearlyDiscount = 0.2; // 20% discount for yearly

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-cyan';
  };

  const getPlanIcon = (planId: string) => {
    if (planId === 'trial') return <Clock size={20} />;
    if (planId === 'starter') return <Zap size={20} />;
    if (planId === 'professional') return <Crown size={20} />;
    return <Building size={20} />;
  };

  // Calculate days remaining in trial
  const getTrialDaysRemaining = () => {
    if (!subscription?.currentPeriodEnd) return 0;
    const endDate = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const trialDaysRemaining = getTrialDaysRemaining();
  const isTrialExpired = subscription?.status === 'trialing' && trialDaysRemaining <= 0;

  if (loading) {
    return (
      <div className="min-h-screen">
        <TopBar title="Billing" />
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Billing" />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Trial Banner */}
        {subscription?.status === 'trialing' && (
          <div className={cn(
            "mb-6 p-4 rounded-lg border flex items-center justify-between",
            isTrialExpired
              ? "bg-red-500/10 border-red-500/30"
              : trialDaysRemaining <= 3
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-cyan/10 border-cyan/30"
          )}>
            <div className="flex items-center gap-3">
              {isTrialExpired ? (
                <AlertTriangle className="text-red-500" size={24} />
              ) : (
                <Clock className={trialDaysRemaining <= 3 ? "text-yellow-500" : "text-cyan"} size={24} />
              )}
              <div>
                <h3 className="font-semibold">
                  {isTrialExpired
                    ? 'Seu trial expirou!'
                    : `${trialDaysRemaining} dias restantes no trial`}
                </h3>
                <p className="text-sm text-gray-400">
                  {isTrialExpired
                    ? 'Faca upgrade para continuar usando a plataforma.'
                    : 'Aproveite para explorar todas as funcionalidades.'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleUpgrade('starter')}
              className={isTrialExpired ? "bg-red-500 hover:bg-red-600" : ""}
              icon={<ArrowUpRight size={16} />}
            >
              Fazer Upgrade
            </Button>
          </div>
        )}

        {/* Current Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Plano Atual</h2>
                <p className="text-sm text-gray-400">Gerencie sua assinatura</p>
              </div>
              <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'}>
                {subscription?.status === 'active' ? 'Ativo' :
                 subscription?.status === 'trialing' ? 'Trial' :
                 subscription?.status === 'past_due' ? 'Atrasado' : 'Cancelado'}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan/20 to-violet/20 flex items-center justify-center">
                {currentPlan && getPlanIcon(currentPlan.id)}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{currentPlan?.name || 'Free'}</h3>
                <p className="text-gray-400">
                  R$ {currentPlan?.price || 0}/mes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>
                  Proximo pagamento: {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
                    : '-'}
                </span>
              </div>
              {subscription?.cancelAtPeriodEnd && (
                <Badge variant="warning">Cancela ao fim do periodo</Badge>
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Uso Atual</h3>
            <div className="space-y-4">
              {usage && (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Agentes</span>
                      <span className={getUsageColor(getUsagePercentage(usage.agents.used, usage.agents.limit))}>
                        {usage.agents.used}/{usage.agents.limit === -1 ? '∞' : usage.agents.limit}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan to-violet rounded-full transition-all"
                        style={{ width: `${getUsagePercentage(usage.agents.used, usage.agents.limit)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Mensagens</span>
                      <span className={getUsageColor(getUsagePercentage(usage.messages.used, usage.messages.limit))}>
                        {usage.messages.used.toLocaleString()}/{usage.messages.limit === -1 ? '∞' : usage.messages.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan to-violet rounded-full transition-all"
                        style={{ width: `${getUsagePercentage(usage.messages.used, usage.messages.limit)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Leads</span>
                      <span className={getUsageColor(getUsagePercentage(usage.leads.used, usage.leads.limit))}>
                        {usage.leads.used.toLocaleString()}/{usage.leads.limit === -1 ? '∞' : usage.leads.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan to-violet rounded-full transition-all"
                        style={{ width: `${getUsagePercentage(usage.leads.used, usage.leads.limit)}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Plans */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Planos Disponiveis</h2>
              <p className="text-sm text-gray-400">Escolha o plano ideal para seu negocio</p>
            </div>
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  "px-4 py-2 text-sm rounded-md transition-colors",
                  billingPeriod === 'monthly' ? "bg-cyan/20 text-cyan" : "text-gray-400"
                )}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn(
                  "px-4 py-2 text-sm rounded-md transition-colors",
                  billingPeriod === 'yearly' ? "bg-cyan/20 text-cyan" : "text-gray-400"
                )}
              >
                Anual (-20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => {
              const price = billingPeriod === 'yearly'
                ? Math.round(plan.price * (1 - yearlyDiscount))
                : plan.price;
              const isCurrentPlan = subscription?.planId === plan.id;

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "p-6 relative",
                    plan.recommended && "ring-2 ring-cyan"
                  )}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="default" className="bg-cyan text-dark-bg">
                        Recomendado
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      plan.id === 'starter' ? "bg-blue-500/20 text-blue-500" :
                      plan.id === 'professional' ? "bg-violet/20 text-violet" :
                      "bg-amber-500/20 text-amber-500"
                    )}>
                      {getPlanIcon(plan.id)}
                    </div>
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                  </div>

                  <div className="mb-6">
                    <span className="text-3xl font-bold">R$ {price}</span>
                    <span className="text-gray-400">/mes</span>
                    {billingPeriod === 'yearly' && (
                      <p className="text-xs text-green-500 mt-1">
                        Economia de R$ {Math.round(plan.price * 12 * yearlyDiscount)}/ano
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Plano Atual
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(plan.id)}
                      icon={<ArrowUpRight size={16} />}
                    >
                      {subscription?.planId && plans.findIndex(p => p.id === subscription.planId) < plans.findIndex(p => p.id === plan.id)
                        ? 'Fazer Upgrade'
                        : 'Selecionar'}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Invoices */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Historico de Faturas</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                  <th className="pb-3">Data</th>
                  <th className="pb-3">ID</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="border-b border-white/5">
                    <td className="py-4 text-sm">
                      {new Date(invoice.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 text-sm font-mono text-gray-400">
                      {invoice.id}
                    </td>
                    <td className="py-4 text-sm">
                      R$ {invoice.amount.toFixed(2)}
                    </td>
                    <td className="py-4">
                      <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'pending' ? 'warning' : 'danger'}>
                        {invoice.status === 'paid' ? 'Pago' : invoice.status === 'pending' ? 'Pendente' : 'Falhou'}
                      </Badge>
                    </td>
                    <td className="py-4">
                      <Button variant="ghost" size="sm" icon={<Download size={14} />}>
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Upgrade Modal */}
        {showUpgradeModal && selectedPlan && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Confirmar Upgrade</h3>

              <p className="text-gray-400 mb-6">
                Voce esta prestes a fazer upgrade para o plano{' '}
                <span className="text-white font-semibold">
                  {plans.find(p => p.id === selectedPlan)?.name}
                </span>
              </p>

              <div className="bg-white/5 p-4 rounded-lg mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Plano</span>
                  <span>{plans.find(p => p.id === selectedPlan)?.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Periodo</span>
                  <span>{billingPeriod === 'monthly' ? 'Mensal' : 'Anual'}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>
                    R$ {billingPeriod === 'yearly'
                      ? Math.round((plans.find(p => p.id === selectedPlan)?.price || 0) * (1 - yearlyDiscount))
                      : plans.find(p => p.id === selectedPlan)?.price}/mes
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={confirmUpgrade}>
                  Confirmar Upgrade
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
