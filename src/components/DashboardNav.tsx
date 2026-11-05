'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { UtensilsCrossed, ChefHat, BookOpen, QrCode, Settings, ExternalLink, LogOut } from 'lucide-react';
import { Restaurant } from '@/types';

interface DashboardNavProps {
  restaurant: Restaurant;
  userEmail: string;
}

export function DashboardNav({ restaurant, userEmail }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinks = [
    { href: '/dashboard/kitchen', label: 'Live Kitchen', icon: ChefHat },
    { href: '/dashboard/menu', label: 'Menu & Items', icon: BookOpen },
    { href: '/dashboard/tables', label: 'Tables & QR', icon: QrCode },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Store */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard/kitchen" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold shadow-sm shadow-orange-500/20">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight block text-base leading-tight">
                  {restaurant.name}
                </span>
                <span className="text-xs text-slate-500">BistroQR Dashboard</span>
              </div>
            </Link>

            {/* Nav Items */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href === '/dashboard/kitchen' && pathname === '/dashboard');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              href={`/s/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <span>View Customer Menu</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition border border-rose-200/60"
              title={`Logged in as ${userEmail}`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-100 py-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/dashboard/kitchen' && pathname === '/dashboard');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
                  isActive ? 'text-orange-600' : 'text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
