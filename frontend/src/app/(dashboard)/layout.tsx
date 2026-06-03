'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useActiveRole, UserRole } from '@/lib/auth-sim';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, changeRole, isLoaded } = useActiveRole();
  const { user } = useUser();
  const pathname = usePathname();
  const [localRole, setLocalRole] = useState<UserRole>('super_admin');

  useEffect(() => {
    setLocalRole(role);
  }, [role]);

  // Listen to custom event for dynamic re-renders across pages
  useEffect(() => {
    const handleRoleChange = () => {
      const saved = localStorage.getItem('rc_simulated_role') as UserRole | null;
      if (saved) setLocalRole(saved);
    };
    window.addEventListener('rc-role-change', handleRoleChange);
    return () => window.removeEventListener('rc-role-change', handleRoleChange);
  }, []);

  const isActive = (href: string) => pathname === href;

  const linkClass = (href: string) => {
    const active = isActive(href);
    return `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
    }`;
  };

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
      {/* Sidebar aside panel */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-900/10 backdrop-blur-md flex flex-col shrink-0">
        {/* Branding header */}
        <div className="p-6 border-b border-zinc-900">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/30">
              <span className="text-xs font-bold text-white tracking-wider">RC</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">RetailCortex</span>
          </Link>
        </div>

        {/* Sidebar Nav menu scroll list */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* General Section */}
          <div className="space-y-2">
            <span className="px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block">
              Main Menu
            </span>
            <Link href="/dashboard" className={linkClass('/dashboard')}>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"
                />
              </svg>
              Overview
            </Link>
          </div>

          {/* Super Admin Sections */}
          {localRole === 'super_admin' && (
            <div className="space-y-2">
              <span className="px-4 text-[10px] font-semibold text-indigo-400 uppercase tracking-widest block">
                Super Admin Only
              </span>

              <Link href="/dashboard/stores" className={linkClass('/dashboard/stores')}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                Onboard Stores
              </Link>

              <Link href="/dashboard/zones" className={linkClass('/dashboard/zones')}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Manage Zones
              </Link>

              <Link href="/dashboard/categories" className={linkClass('/dashboard/categories')}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 7h.01M6 20h12a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Manage Categories
              </Link>
            </div>
          )}

          {/* Store Admin Sections */}
          {localRole === 'store_admin' && (
            <div className="space-y-2">
              <span className="px-4 text-[10px] font-semibold text-emerald-400 uppercase tracking-widest block">
                Store Admin Only
              </span>

              <Link href="/dashboard/store" className={linkClass('/dashboard/store')}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                CSV Upload Products
              </Link>

              <Link href="/dashboard/inventory" className={linkClass('/dashboard/inventory')}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                Manage Inventory
              </Link>

              <Link href="/dashboard/campaigns" className={linkClass('/dashboard/campaigns')}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
                Store Campaigns
              </Link>
            </div>
          )}

          {/* User/Shopper Sections (Debug Placeholder) */}
          {localRole === 'user' && (
            <div className="space-y-2">
              <span className="px-4 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block">
                Shopper View
              </span>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-center">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Shopper controls are managed in the Mobile App.
                </p>
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 space-y-4">
          {/* Active Role details */}
          {isLoaded && user && (
            <div className="flex items-center justify-between gap-3 bg-zinc-900/20 border border-zinc-900 p-3 rounded-2xl">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <UserButton showName={false} />
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">
                    {user.fullName || user.username || 'Admin User'}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {user.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-900 px-8 flex items-center justify-between bg-zinc-950/20 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-zinc-500">Workspace</span>
            <span className="text-xs text-zinc-700">/</span>
            <span className="text-xs text-zinc-300 font-semibold uppercase tracking-wider">
              {isActive('/dashboard') ? 'Overview' : pathname.split('/').pop()?.replace('-', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${localRole === 'super_admin' ? 'bg-indigo-500' : localRole === 'store_admin' ? 'bg-emerald-500' : 'bg-zinc-500'}`}
            />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
              {localRole} Mode
            </span>
          </div>
        </header>

        {/* Dashboard inner content */}
        <main className="flex-1 px-8 py-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
