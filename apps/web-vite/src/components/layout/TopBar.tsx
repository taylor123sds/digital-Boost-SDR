import { Bell, Search, User, Menu } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  title: string;
  onMenuClick?: () => void;
}

export default function TopBar({ title, onMenuClick }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-14 md:h-16 glass border-b border-glass-border flex items-center justify-between px-3 md:px-6">
      {/* Left side: Menu button + title */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* Mobile menu button */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white md:hidden"
          >
            <Menu size={22} />
          </button>
        )}

        {/* Page title */}
        <h2 className="text-base md:text-xl font-semibold truncate">{title}</h2>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Search - hidden on mobile */}
        <div className="relative hidden sm:block">
          {searchOpen ? (
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-dark-bg2 border border-glass-border rounded-lg px-4 py-2 w-48 md:w-64 focus:outline-none focus:border-cyan transition-colors text-sm"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
            >
              <Search size={18} className="md:w-5 md:h-5" />
            </button>
          )}
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white relative">
          <Bell size={18} className="md:w-5 md:h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-cyan rounded-full" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-r from-cyan to-violet flex items-center justify-center">
            <User size={14} className="md:w-4 md:h-4 text-dark-bg" />
          </div>
          <span className="text-sm font-medium hidden md:block">Admin</span>
        </button>
      </div>
    </header>
  );
}
