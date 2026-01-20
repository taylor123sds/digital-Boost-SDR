import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Users,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CreditCard,
  ClipboardList,
  FileText,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: MessageSquare },
  { href: '/agents', label: 'Agentes', icon: Bot },
  { href: '/crm', label: 'CRM', icon: Users },
  { href: '/documents', label: 'Documentos', icon: FileText },
  { href: '/campaigns', label: 'Campanhas', icon: Megaphone },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/audit', label: 'Audit Log', icon: ClipboardList },
  { href: '/settings', label: 'Config', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/app/login';
  };

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen glass flex flex-col z-50 transition-all duration-300',
          // Mobile: slide in/out
          'transform md:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          // Width
          collapsed ? 'w-64 md:w-20' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="p-4 md:p-6 flex items-center justify-between border-b border-glass-border">
          {(!collapsed || window.innerWidth < 768) && (
            <h1 className="text-lg md:text-xl font-orbitron gradient-text font-bold">
              LEADLY AI
            </h1>
          )}
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors md:hidden"
          >
            <X size={20} />
          </button>
          {/* Desktop collapse button */}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors hidden md:block"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 md:p-4 space-y-1 md:space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-cyan/20 to-violet/20 border border-cyan/30 text-cyan'
                    : 'hover:bg-white/5 text-gray-400 hover:text-white'
                )}
              >
                <Icon size={18} className="md:w-5 md:h-5 flex-shrink-0" />
                {(!collapsed || window.innerWidth < 768) && (
                  <span className="font-medium text-sm md:text-base">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 md:p-4 border-t border-glass-border">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl w-full',
              'text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all'
            )}
          >
            <LogOut size={18} className="md:w-5 md:h-5" />
            {(!collapsed || window.innerWidth < 768) && <span className="text-sm md:text-base">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
