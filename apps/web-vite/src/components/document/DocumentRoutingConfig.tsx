import { useState } from 'react';
import { FileText, Mail, MessageSquare, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

interface DocumentType {
  id: string;
  name: string;
  icon: string;
  requiredFields: string[];
  autoApprove: boolean;
}

interface RoutingDestination {
  id: string;
  name: string;
  description: string;
}

interface DocumentRoute {
  id: string;
  documentType: string;
  destination: string;
  emailTo: string[];
  whatsappTo: string[];
  autoApprove: boolean;
  sendDocument: boolean;
}

interface DocumentRoutingConfigProps {
  documentTypes: DocumentType[];
  routingDestinations: RoutingDestination[];
  routes: DocumentRoute[];
  onRoutesChange: (routes: DocumentRoute[]) => void;
  className?: string;
}

export function DocumentRoutingConfig({
  documentTypes = [],
  routingDestinations = [],
  routes = [],
  onRoutesChange,
  className
}: DocumentRoutingConfigProps) {
  const [newRoute, setNewRoute] = useState<Partial<DocumentRoute>>({
    documentType: '',
    destination: '',
    emailTo: [],
    whatsappTo: [],
    autoApprove: false,
    sendDocument: true
  });
  const [emailInput, setEmailInput] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');

  const addRoute = () => {
    if (!newRoute.documentType || !newRoute.destination) return;

    const route: DocumentRoute = {
      id: `route_${Date.now()}`,
      documentType: newRoute.documentType,
      destination: newRoute.destination,
      emailTo: newRoute.emailTo || [],
      whatsappTo: newRoute.whatsappTo || [],
      autoApprove: newRoute.autoApprove || false,
      sendDocument: newRoute.sendDocument !== false
    };

    onRoutesChange([...routes, route]);
    setNewRoute({
      documentType: '',
      destination: '',
      emailTo: [],
      whatsappTo: [],
      autoApprove: false,
      sendDocument: true
    });
    setEmailInput('');
    setWhatsappInput('');
  };

  const removeRoute = (id: string) => {
    onRoutesChange(routes.filter(r => r.id !== id));
  };

  const addEmail = () => {
    if (!emailInput.trim() || !emailInput.includes('@')) return;
    setNewRoute(prev => ({
      ...prev,
      emailTo: [...(prev.emailTo || []), emailInput.trim()]
    }));
    setEmailInput('');
  };

  const addWhatsapp = () => {
    const cleaned = whatsappInput.replace(/\D/g, '');
    if (cleaned.length < 10) return;
    setNewRoute(prev => ({
      ...prev,
      whatsappTo: [...(prev.whatsappTo || []), cleaned]
    }));
    setWhatsappInput('');
  };

  const removeEmail = (email: string) => {
    setNewRoute(prev => ({
      ...prev,
      emailTo: (prev.emailTo || []).filter(e => e !== email)
    }));
  };

  const removeWhatsapp = (number: string) => {
    setNewRoute(prev => ({
      ...prev,
      whatsappTo: (prev.whatsappTo || []).filter(n => n !== number)
    }));
  };

  const getDocType = (id: string) => documentTypes.find(d => d.id === id);
  const getDestination = (id: string) => routingDestinations.find(d => d.id === id);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <FileText className="text-blue-500" size={20} />
        </div>
        <div>
          <h4 className="font-medium">Roteamento de Documentos</h4>
          <p className="text-sm text-gray-400">Configure para onde cada tipo de documento sera enviado</p>
        </div>
      </div>

      {/* Existing Routes */}
      {routes.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-gray-300">Rotas Configuradas</h5>
          {routes.map((route) => {
            const docType = getDocType(route.documentType);
            const dest = getDestination(route.destination);

            return (
              <div key={route.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{docType?.icon || '📄'}</span>
                    <div>
                      <div className="font-medium">{docType?.name || route.documentType}</div>
                      <div className="text-sm text-gray-400">→ {dest?.name || route.destination}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {route.autoApprove && (
                      <Badge variant="success" className="text-xs">Auto-aprovar</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRoute(route.id)}
                      className="text-red-400"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {route.emailTo.map((email) => (
                    <span key={email} className="px-2 py-1 bg-cyan/20 text-cyan rounded text-xs flex items-center gap-1">
                      <Mail size={10} />
                      {email}
                    </span>
                  ))}
                  {route.whatsappTo.map((number) => (
                    <span key={number} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs flex items-center gap-1">
                      <MessageSquare size={10} />
                      {number}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Route */}
      <div className="p-4 border border-dashed border-white/20 rounded-lg space-y-4">
        <h5 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Plus size={14} />
          Adicionar Nova Rota
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document Type Selection */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de Documento</label>
            <select
              value={newRoute.documentType}
              onChange={(e) => setNewRoute(prev => ({ ...prev, documentType: e.target.value }))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 text-sm"
            >
              <option value="">Selecione...</option>
              {documentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Selection */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Destino</label>
            <select
              value={newRoute.destination}
              onChange={(e) => setNewRoute(prev => ({ ...prev, destination: e.target.value }))}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan/50 text-sm"
            >
              <option value="">Selecione...</option>
              {routingDestinations.map((dest) => (
                <option key={dest.id} value={dest.id}>{dest.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Email Recipients */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            <Mail size={12} className="inline mr-1" />
            Emails de Destino
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="email@empresa.com"
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addEmail()}
            />
            <Button variant="secondary" size="sm" onClick={addEmail}>
              <Plus size={14} />
            </Button>
          </div>
          {(newRoute.emailTo?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {newRoute.emailTo?.map((email) => (
                <span key={email} className="px-2 py-1 bg-cyan/20 text-cyan rounded text-xs flex items-center gap-1">
                  {email}
                  <button onClick={() => removeEmail(email)} className="ml-1 hover:text-white">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp Recipients */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            <MessageSquare size={12} className="inline mr-1" />
            WhatsApp de Destino
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              placeholder="5511999999999"
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addWhatsapp()}
            />
            <Button variant="secondary" size="sm" onClick={addWhatsapp}>
              <Plus size={14} />
            </Button>
          </div>
          {(newRoute.whatsappTo?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {newRoute.whatsappTo?.map((number) => (
                <span key={number} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs flex items-center gap-1">
                  {number}
                  <button onClick={() => removeWhatsapp(number)} className="ml-1 hover:text-white">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newRoute.autoApprove}
              onChange={(e) => setNewRoute(prev => ({ ...prev, autoApprove: e.target.checked }))}
              className="w-4 h-4 accent-green-500 rounded"
            />
            <span className="text-sm text-gray-300 flex items-center gap-1">
              <CheckCircle size={14} className="text-green-500" />
              Auto-aprovar documentos validos
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newRoute.sendDocument !== false}
              onChange={(e) => setNewRoute(prev => ({ ...prev, sendDocument: e.target.checked }))}
              className="w-4 h-4 accent-cyan rounded"
            />
            <span className="text-sm text-gray-300">Enviar documento anexo</span>
          </label>
        </div>

        {/* Add Button */}
        <Button
          onClick={addRoute}
          disabled={!newRoute.documentType || !newRoute.destination || ((newRoute.emailTo?.length || 0) === 0 && (newRoute.whatsappTo?.length || 0) === 0)}
          className="w-full"
          icon={<Plus size={16} />}
        >
          Adicionar Rota
        </Button>
      </div>

      {/* Help Text */}
      {routes.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200">
              Configure ao menos uma rota para que o agente saiba para onde enviar os documentos recebidos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentRoutingConfig;
