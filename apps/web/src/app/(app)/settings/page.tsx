'use client';

import { useState } from 'react';
import {
  User,
  Building,
  Key,
  Bell,
  Link2,
  Shield,
  Palette,
  Globe,
  Save
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import TopBar from '@/components/layout/TopBar';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'company' | 'api' | 'notifications' | 'integrations' | 'security';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'company', label: 'Empresa', icon: Building },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notificações', icon: Bell },
  { id: 'integrations', label: 'Integrações', icon: Link2 },
  { id: 'security', label: 'Segurança', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Configurações" />

      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <Card className="lg:w-64 p-2 h-fit">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left',
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-cyan/20 to-violet/20 text-cyan border border-cyan/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </Card>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <Card>
                <h3 className="text-lg font-semibold mb-6">Informações do Perfil</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan to-violet flex items-center justify-center text-2xl font-bold">
                      A
                    </div>
                    <div>
                      <Button variant="secondary" size="sm">
                        Alterar foto
                      </Button>
                      <p className="text-sm text-gray-400 mt-2">JPG, PNG. Max 1MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Nome" defaultValue="Admin" />
                    <Input label="Email" type="email" defaultValue="admin@leadly.ai" />
                    <Input label="Telefone" defaultValue="+55 84 99999-0000" />
                    <Input label="Cargo" defaultValue="Administrador" />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} loading={saving} icon={<Save size={18} />}>
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'company' && (
              <Card>
                <h3 className="text-lg font-semibold mb-6">Dados da Empresa</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Nome da Empresa" defaultValue="LEADLY AI" />
                    <Input label="CNPJ" defaultValue="00.000.000/0001-00" />
                    <Input label="Website" defaultValue="https://leadly.ai" />
                    <Input label="Setor" defaultValue="Tecnologia" />
                  </div>

                  <div>
                    <Input
                      label="Endereço"
                      defaultValue="Av. Principal, 1000 - Natal/RN"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} loading={saving} icon={<Save size={18} />}>
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'api' && (
              <Card>
                <h3 className="text-lg font-semibold mb-6">API Keys</h3>
                <div className="space-y-6">
                  <div className="p-4 bg-white/5 rounded-lg border border-glass-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">API Key Principal</p>
                      <Button variant="ghost" size="sm">Copiar</Button>
                    </div>
                    <code className="text-sm text-gray-400 break-all">
                      ldy_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
                    </code>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg border border-glass-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">Webhook Secret</p>
                      <Button variant="ghost" size="sm">Copiar</Button>
                    </div>
                    <code className="text-sm text-gray-400 break-all">
                      whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
                    </code>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="secondary">Regenerar API Key</Button>
                    <Button variant="secondary">Regenerar Webhook Secret</Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <h3 className="text-lg font-semibold mb-6">Preferências de Notificação</h3>
                <div className="space-y-6">
                  {[
                    { label: 'Novos leads', description: 'Receber notificação quando um novo lead entrar', enabled: true },
                    { label: 'Mensagens importantes', description: 'Alertas sobre mensagens que precisam de atenção', enabled: true },
                    { label: 'Relatórios semanais', description: 'Resumo semanal de performance por email', enabled: false },
                    { label: 'Atualizações do sistema', description: 'Novidades e atualizações da plataforma', enabled: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-gray-400">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked={item.enabled}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'integrations' && (
              <Card>
                <h3 className="text-lg font-semibold mb-6">Integrações</h3>
                <div className="space-y-4">
                  {[
                    { name: 'WhatsApp (Evolution API)', status: 'connected', icon: '📱' },
                    { name: 'OpenAI', status: 'connected', icon: '🤖' },
                    { name: 'Google Calendar', status: 'disconnected', icon: '📅' },
                    { name: 'Google Sheets', status: 'connected', icon: '📊' },
                    { name: 'Slack', status: 'disconnected', icon: '💬' },
                  ].map((integration) => (
                    <div key={integration.name} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{integration.icon}</span>
                        <div>
                          <p className="font-medium">{integration.name}</p>
                          <p className={cn(
                            'text-sm',
                            integration.status === 'connected' ? 'text-green-400' : 'text-gray-400'
                          )}>
                            {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
                          </p>
                        </div>
                      </div>
                      <Button variant={integration.status === 'connected' ? 'secondary' : 'primary'} size="sm">
                        {integration.status === 'connected' ? 'Configurar' : 'Conectar'}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <h3 className="text-lg font-semibold mb-6">Segurança</h3>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Alterar Senha</h4>
                    <Input label="Senha Atual" type="password" />
                    <Input label="Nova Senha" type="password" />
                    <Input label="Confirmar Nova Senha" type="password" />
                    <Button>Atualizar Senha</Button>
                  </div>

                  <hr className="border-glass-border" />

                  <div className="space-y-4">
                    <h4 className="font-medium">Autenticação de Dois Fatores</h4>
                    <p className="text-sm text-gray-400">
                      Adicione uma camada extra de segurança à sua conta
                    </p>
                    <Button variant="secondary">Ativar 2FA</Button>
                  </div>

                  <hr className="border-glass-border" />

                  <div className="space-y-4">
                    <h4 className="font-medium text-red-400">Zona de Perigo</h4>
                    <p className="text-sm text-gray-400">
                      Ações irreversíveis. Tenha certeza antes de prosseguir.
                    </p>
                    <Button variant="danger">Excluir Conta</Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
