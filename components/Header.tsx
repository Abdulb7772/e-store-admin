'use client';

import { Bell, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/dashboard/products': 'Products',
  '/dashboard/orders': 'Orders',
  '/dashboard/rejected-orders': 'Rejected Orders',
  '/dashboard/users': 'Users',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/promotions': 'Promotions',
  '/dashboard/settings': 'Settings',
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  const title = pageTitles[pathname] ?? 'Admin Dashboard';
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'Admin User';
  return (
    <header className="bg-black border-b border-slate-800 px-4 sm:px-6 py-4 h-16 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-lg font-bold text-slate-400 truncate">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors flex-shrink-0">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-slate-400 rounded-full ring-2 ring-black"></span>
        </button>
        {/* Profile */}
        <button className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-black flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-slate-400" />
          </div>
          <span className="text-sm font-medium text-slate-400 hidden md:block whitespace-nowrap">{displayName}</span>
        </button>
      </div>
    </header>
  );
}
