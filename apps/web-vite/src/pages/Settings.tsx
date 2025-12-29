import { useEffect, useState } from 'react';
import { User, Bell, Shield, Palette, Key, Building } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import TopBar from '../components/layout/TopBar';
import { cn } from '../lib/utils';
import { api, type UserSettings } from '../lib/api';

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: ''
  });

  useEffect(() => {
    const loadSettings = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        const data = await api.getSettings();
        if (data) {
          setSettings(data);
        } else {
          // Create default settings if none returned
          setSettings({
            profile: { name: '', email: '', company: '', sector: '' },
            preferences: {
              phone: '',
              title: '',
              website: '',
              cnpj: '',
              notifications: { leads: true, messages: true, campaigns: false, reports: false },
              appearance: { theme: 'dark' },
              apiKeys: []
            }
          });
        }
      } catch (err) {
        setError('Erro ao carregar configuracoes');
        // Set default settings so page can render
        setSettings({
          profile: { name: '', email: '', company: '', sector: '' },
          preferences: {
            phone: '',
            title: '',
            website: '',
            cnpj: '',
            notifications: { leads: true, messages: true, campaigns: false, reports: false },
            appearance: { theme: 'dark' },
            apiKeys: []
          }
        });
      } finally {
        setInitialLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!settings) return;
      const updated = await api.updateSettings(settings);
      if (updated) {
        setSettings(updated);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.next !== passwordForm.confirm) {
      alert('As senhas nao conferem.');
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: '', next: '', confirm: '' });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = (field: keyof UserSettings['profile'], value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      profile: {
        ...settings.profile,
        [field]: value
      }
    });
  };

  const updatePreferences = (field: keyof UserSettings['preferences'], value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      preferences: {
        ...settings.preferences,
        [field]: value
      }
    });
  };

  const updateNotification = (field: 'leads' | 'messages' | 'campaigns' | 'reports', value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      preferences: {
        ...settings.preferences,
        notifications: {
          ...settings.preferences.notifications,
          [field]: value
        }
      }
    });
  };

  const updateTheme = (theme: 'dark' | 'light' | 'system') => {
    if (!settings) return;
    setSettings({
      ...settings,
      preferences: {
        ...settings.preferences,
        appearance: {
          ...settings.preferences.appearance,
          theme
        }
      }
    });
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Configuracoes" />

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}
        {initialLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : settings ? (
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
                    <Input
                      label="Nome"
                      value={settings?.profile.name || ''}
                      onChange={(e) => updateProfile('name', e.target.value)}
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={settings?.profile.email || ''}
                      onChange={(e) => updateProfile('email', e.target.value)}
                    />
                    <Input
                      label="Telefone"
                      value={settings?.preferences.phone || ''}
                      onChange={(e) => updatePreferences('phone', e.target.value)}
                    />
                    <Input
                      label="Cargo"
                      value={settings?.preferences.title || ''}
                      onChange={(e) => updatePreferences('title', e.target.value)}
                    />
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
                    <Input
                      label="Nome da empresa"
                      value={settings?.profile.company || ''}
                      onChange={(e) => updateProfile('company', e.target.value)}
                    />
                    <Input
                      label="CNPJ"
                      value={settings?.preferences.cnpj || ''}
                      onChange={(e) => updatePreferences('cnpj', e.target.value)}
                    />
                    <Input
                      label="Website"
                      value={settings?.preferences.website || ''}
                      onChange={(e) => updatePreferences('website', e.target.value)}
                    />
                    <Input
                      label="Setor"
                      value={settings?.profile.sector || ''}
                      onChange={(e) => updateProfile('sector', e.target.value)}
                    />
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
                    { title: 'Novos leads', description: 'Receber alerta quando um novo lead entrar', key: 'leads' },
                    { title: 'Mensagens', description: 'Notificar sobre novas mensagens', key: 'messages' },
                    { title: 'Campanhas', description: 'Atualizacoes sobre campanhas ativas', key: 'campaigns' },
                    { title: 'Relatorios', description: 'Relatorios semanais por email', key: 'reports' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-gray-400">{item.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings?.preferences.notifications?.[item.key as keyof NonNullable<UserSettings['preferences']['notifications']>] ?? false}
                          onChange={(e) => updateNotification(item.key as 'leads' | 'messages' | 'campaigns' | 'reports', e.target.checked)}
                          className="sr-only peer"
                        />
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
                    <Input
                      label="Senha atual"
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    />
                    <Input
                      label="Nova senha"
                      type="password"
                      value={passwordForm.next}
                      onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                    />
                    <Input
                      label="Confirmar nova senha"
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    />
                  </div>
                  <Button loading={loading} onClick={handlePasswordChange}>
                    Alterar senha
                  </Button>
                </div>
              </Card>
            )}

            {activeTab === 'api' && (
              <Card>
                <h2 className="text-xl font-semibold mb-6">Chaves de API</h2>
                <div className="space-y-4">
                  {(settings?.preferences.apiKeys || []).length === 0 ? (
                    <div className="p-4 rounded-lg bg-white/5 text-sm text-gray-400">
                      Nenhuma API key configurada.
                    </div>
                  ) : (
                    (settings?.preferences.apiKeys || []).map((key) => (
                      <div key={key.id} className="p-4 rounded-lg bg-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{key.label || 'API Key'}</span>
                        </div>
                        <code className="text-sm text-cyan bg-dark-bg2 px-3 py-2 rounded-lg block">
                          {key.key}
                        </code>
                      </div>
                    ))
                  )}
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
                        { id: 'dark', label: 'Escuro' },
                        { id: 'light', label: 'Claro' },
                        { id: 'system', label: 'Sistema' },
                      ].map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => updateTheme(theme.id as 'dark' | 'light' | 'system')}
                          className={cn(
                            'px-6 py-3 rounded-lg border transition-all',
                            settings?.preferences.appearance?.theme === theme.id
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
        ) : (
          <div className="text-center py-12 text-gray-400">
            Nao foi possivel carregar as configuracoes.
          </div>
        )}
      </div>
    </div>
  );
}
