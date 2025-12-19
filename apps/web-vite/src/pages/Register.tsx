import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Building } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas nao coincidem');
      return;
    }

    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { token } = await api.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        company: formData.company || undefined,
      });
      localStorage.setItem('token', token);
      window.location.href = '/app/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="matrix-bg" />
      <Card className="p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-orbitron gradient-text font-bold mb-2">
            LEADLY AI
          </h1>
          <p className="text-gray-400">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Nome"
            name="name"
            placeholder="Seu nome"
            value={formData.name}
            onChange={handleChange}
            icon={<User size={18} />}
            required
          />

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            value={formData.email}
            onChange={handleChange}
            icon={<Mail size={18} />}
            required
          />

          <Input
            label="Empresa (opcional)"
            name="company"
            placeholder="Nome da empresa"
            value={formData.company}
            onChange={handleChange}
            icon={<Building size={18} />}
          />

          <Input
            label="Senha"
            name="password"
            type="password"
            placeholder="Min. 8 caracteres"
            value={formData.password}
            onChange={handleChange}
            icon={<Lock size={18} />}
            required
          />

          <Input
            label="Confirmar senha"
            name="confirmPassword"
            type="password"
            placeholder="Repita a senha"
            value={formData.confirmPassword}
            onChange={handleChange}
            icon={<Lock size={18} />}
            required
          />

          <Button type="submit" loading={loading} className="w-full">
            Criar conta
          </Button>

          <p className="text-center text-sm text-gray-400">
            Ja tem conta?{' '}
            <Link to="/login" className="text-cyan hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
