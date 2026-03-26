'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Users,
  Settings,
  TrendingUp,
  Tag,
  Boxes,
  BadgeDollarSign,
  LogOut,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/dashboard/products', icon: ShoppingBag },
  { label: 'Stocks', href: '/dashboard/stocks', icon: Boxes },
  { label: 'Orders', href: '/dashboard/orders', icon: ClipboardList },
  { label: 'Sales', href: '/dashboard/sales', icon: BadgeDollarSign },
  { label: 'Users', href: '/dashboard/users', icon: Users },
  { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  { label: 'Promotions', href: '/dashboard/promotions', icon: Tag },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.username || 'Admin User';
  const displayEmail = user?.email || user?.username || 'admin@shop.com';
  const avatarInitial = (displayName.charAt(0) || 'A').toUpperCase();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <aside className={`bg-white shadow-lg flex flex-col h-full transition-all duration-300 ${isOpen ? 'w-52' : 'w-14'}`}>
      {/* Logo */}
      <div className={`border-b border-slate-800 bg-black h-16 ${isOpen ? 'px-4' : 'px-3'}`}>
        <div className={`h-full flex items-center ${isOpen ? 'gap-2 justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            {isOpen && (
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-700">
                <ShoppingBag className="w-4 h-4 text-slate-400" />
              </div>
            )}
            {isOpen && (
              <div className="min-w-0 leading-tight">
                <h1 className="text-sm font-semibold text-slate-400 truncate">e-Store Admin Panel</h1>
                <p className="text-[11px] text-slate-400 truncate">Management Panel</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-900 hover:text-slate-400 transition-colors"
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {isOpen && (
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </p>
        )}
        <ul className="space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive(href)
                    ? 'bg-slate-200 text-black'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                } ${isOpen ? 'gap-3' : 'justify-center'}`}
                title={!isOpen ? label : undefined}
              >
                <Icon
                  className={`w-4.5 h-4.5 flex-shrink-0 ${
                    isActive(href) ? 'text-black' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                  size={18}
                />
                {isOpen && <span className="flex-1">{label}</span>}
                {isOpen && isActive(href) && (
                  <ChevronRight size={14} className="text-black" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom profile */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleLogout}
          className={`w-full min-w-0 overflow-hidden flex items-center px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors ${
            isOpen ? 'gap-3' : 'justify-center gap-2'
          }`}
          title="Logout"
          aria-label="Logout"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-black flex items-center justify-center text-slate-400 text-sm font-bold flex-shrink-0">
            {avatarInitial}
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-semibold text-slate-700 truncate">{displayName}</p>
              <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
            </div>
          )}
          {isOpen && <LogOut size={16} className="text-slate-400 flex-shrink-0" />}
        </button>
      </div>
    </aside>
  );
}
