import { useState } from 'react';
import { X, User, Phone, Mail, Building } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import type { Lead } from '../../lib/api';

interface LeadCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (lead: Lead) => void;
}

export default function LeadCreateModal({ isOpen, onClose, onCreate }: LeadCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Nome e obrigatorio');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Telefone e obrigatorio');
      return;
    }

    setSaving(true);
    try {
      const lead = await api.createLead({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined
      });

      onCreate?.(lead);

      // Reset form
      setFormData({ name: '', phone: '', email: '', company: '' });
      onClose();
    } catch (err: any) {
      if (err.status === 409) {
        setError('Lead com este telefone ja existe');
      } else {
        setError(err.message || 'Erro ao criar lead');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-dark-card rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold">Novo Lead</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Nome <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="Nome do lead"
              value={formData.name}
              onChange={handleChange('name')}
              icon={<User size={18} />}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Telefone <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="(11) 99999-9999"
              value={formData.phone}
              onChange={handleChange('phone')}
              icon={<Phone size={18} />}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Email
            </label>
            <Input
              type="email"
              placeholder="email@empresa.com"
              value={formData.email}
              onChange={handleChange('email')}
              icon={<Mail size={18} />}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Empresa
            </label>
            <Input
              placeholder="Nome da empresa"
              value={formData.company}
              onChange={handleChange('company')}
              icon={<Building size={18} />}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Criando...' : 'Criar Lead'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
