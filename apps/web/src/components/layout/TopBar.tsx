'use client';

import { Bell, Search, User } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-16 glass border-b border-glass-border flex items-center justify-between px-6">
      {/* Page title */}
      <h2 className="text-xl font-semibold">{title}</h2>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-dark-bg2 border border-glass-border rounded-lg px-4 py-2 w-64 focus:outline-none focus:border-cyan transition-colors"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
            >
              <Search size={20} />
            </button>
          )}
        </div>

        {/* Notifications */}
        <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-cyan rounded-full" />
        </button>

        {/* User */}
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan to-violet flex items-center justify-center">
            <User size={16} className="text-dark-bg" />
          </div>
          <span className="text-sm font-medium hidden md:block">Admin</span>
        </button>
      </div>
    </header>
  );
}
