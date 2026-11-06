'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChefHat, BookOpen, QrCode, Settings, ExternalLink, LogOut } from 'lucide-react';
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
    <header className="no-print bg-white border-b border-stone-200/80 sticky top-0 z-40 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Store */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard/kitchen" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-base font-bold">
                {restaurant.name.charAt(0)}
              </div>
              <div>
                <span className="font-serif font-bold text-stone-900 tracking-tight block text-sm sm:text-base leading-tight">
                  {restaurant.name}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">Operations</span>
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-stone-100 text-stone-900'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            <Link
              href={`/s/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition"
            >
              <span>View Customer Menu</span>
              <ExternalLink className="w-3 h-3 text-stone-400" />
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition border border-stone-200"
              title={`Logged in as ${userEmail}`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around border-t border-stone-100 py-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/dashboard/kitchen' && pathname === '/dashboard');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium ${
                  isActive ? 'text-stone-900 font-semibold' : 'text-stone-500'
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
