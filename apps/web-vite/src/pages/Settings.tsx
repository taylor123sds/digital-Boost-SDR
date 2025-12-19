import { useState } from 'react';
import { User, Bell, Shield, Palette, Key, Building } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import TopBar from '../components/layout/TopBar';
import { cn } from '../lib/utils';

const tabs = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'company', label: 'Empresa', icon: Building },
  { id: 'notifications', label: 'Notificacoes', icon: Bell },
  { id: 'security', label: 'Seguranca', icon: Shield },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'appearance', label: 'Aparencia', icon: Palette },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Configuracoes" />

      <div className="p-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-cyan/20 to-violet/20 text-cyan'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      )}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Informacoes do Perfil</h2>
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan to-violet flex items-center justify-center">
                      <User size={32} className="text-dark-bg" />
                    </div>
                    <div>
                      <Button variant="secondary" size="sm">
                        Alterar foto
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">JPG, PNG ou GIF. Max 2MB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Nome" defaultValue="Admin User" />
                    <Input label="Email" type="email" defaultValue="admin@leadly.ai" />
                    <Input label="Telefone" defaultValue="+55 11 99999-9999" />
                    <Input label="Cargo" defaultValue="Administrador" />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button variant="secondary">Cancelar</Button>
                    <Button loading={loading} onClick={handleSave}>
                      Salvar alteracoes
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'company' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Dados da Empresa</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Nome da empresa" defaultValue="Minha Empresa" />
                    <Input label="CNPJ" defaultValue="00.000.000/0001-00" />
                    <Input label="Website" defaultValue="https://minhaempresa.com" />
                    <Input label="Setor" defaultValue="Tecnologia" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="secondary">Cancelar</Button>
                    <Button loading={loading} onClick={handleSave}>
                      Salvar
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Preferencias de Notificacoes</h2>
                <div className="space-y-4">
                  {[
                    { title: 'Novos leads', description: 'Receber alerta quando um novo lead entrar' },
                    { title: 'Mensagens', description: 'Notificar sobre novas mensagens' },
                    { title: 'Campanhas', description: 'Atualizacoes sobre campanhas ativas' },
                    { title: 'Relatorios', description: 'Relatorios semanais por email' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-gray-400">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Seguranca</h2>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Input label="Senha atual" type="password" placeholder="********" />
                    <Input label="Nova senha" type="password" placeholder="********" />
                    <Input label="Confirmar nova senha" type="password" placeholder="********" />
                  </div>
                  <Button loading={loading} onClick={handleSave}>
                    Alterar senha
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'api' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Chaves de API</h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">API Key Principal</span>
                      <Button variant="secondary" size="sm">
                        Regenerar
                      </Button>
                    </div>
                    <code className="text-sm text-cyan bg-dark-bg2 px-3 py-2 rounded-lg block">
                      sk-leadly-xxxxxxxxxxxxxxxxxxxx
                    </code>
                  </div>
                  <Button variant="secondary">
                    Criar nova API Key
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'appearance' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Aparencia</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Tema</label>
                    <div className="flex gap-3">
                      {[
                        { id: 'dark', label: 'Escuro', active: true },
                        { id: 'light', label: 'Claro', active: false },
                        { id: 'system', label: 'Sistema', active: false },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          className={cn(
                            'px-6 py-3 rounded-lg border transition-all',
                            theme.active
                              ? 'border-cyan bg-cyan/10 text-cyan'
                              : 'border-glass-border text-gray-400 hover:border-gray-500'
                          )}
                        >
                          {theme.label}
                        </button>
                      ))}
                    </div>
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
