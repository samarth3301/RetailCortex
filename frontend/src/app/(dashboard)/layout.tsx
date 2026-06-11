'use client';

import { UserButton, useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useActiveRole, UserRole } from '@/lib/auth-sim';
import { apiFetch } from '@/lib/api';
import {
  LayoutDashboard,
  Package,
  Store,
  BarChart2,
  FileText,
  Settings,
  Bell,
  Search,
  Plus,
} from 'lucide-react';
import AiChat from '@/components/ai-chat';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoaded } = useActiveRole();
  const { user } = useUser();
  const { getToken } = useAuth();
  const pathname = usePathname();
  const [localRole, setLocalRole] = useState<UserRole>('super_admin');

  useEffect(() => {
    async function verifyAndSyncRole() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await apiFetch('/api/v1/users/me', token);
        if (res.ok) {
          const meData = await res.json();
          const dbRole = meData.role;
          const effectiveClerkRole = user?.publicMetadata?.role || 'user';
          if (dbRole && effectiveClerkRole !== dbRole) {
            const lastSync = sessionStorage.getItem('rc_last_role_sync');
            const now = Date.now();
            if (!lastSync || now - parseInt(lastSync, 10) > 10000) {
              sessionStorage.setItem('rc_last_role_sync', now.toString());
              await user?.reload();
              window.location.reload();
            }
          }
        }
      } catch (err) {
        console.error('Failed to verify and sync user role:', err);
      }
    }
    if (isLoaded && user) verifyAndSyncRole();
  }, [getToken, isLoaded, user]);

  useEffect(() => { setLocalRole(role); }, [role]);

  useEffect(() => {
    const handleRoleChange = () => {
      const saved = localStorage.getItem('rc_simulated_role') as UserRole | null;
      if (saved) setLocalRole(saved);
    };
    window.addEventListener('rc-role-change', handleRoleChange);
    return () => window.removeEventListener('rc-role-change', handleRoleChange);
  }, []);

  const isActive = (href: string) => pathname === href;

  const navItem = (href: string, Icon: React.ElementType, label: string) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-150 group ${
          active
            ? 'text-white bg-white/5'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/4 h-1/2 w-[2px] rounded-r-full bg-white/40" />
        )}
        <Icon
          size={15}
          className={`shrink-0 transition-colors ${active ? 'text-zinc-200' : 'text-zinc-600 group-hover:text-zinc-400'}`}
        />
        <span className={`font-light tracking-wide ${active ? 'font-normal' : ''}`}>{label}</span>
      </Link>
    );
  };

  const currentPageTitle = () => {
    if (isActive('/dashboard')) return 'Overview';
    const last = pathname.split('/').pop();
    return last ? last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Dashboard';
  };

  return (
    <div className="flex min-h-screen bg-[#0d0d0d] text-white font-sans antialiased">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex flex-col shrink-0 border-r border-white/5 bg-[#0d0d0d]">

        {/* Branding */}
        <div className="px-5 pt-6 pb-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-white/5 border border-white/10">
              <span className="text-[10px] font-bold text-white tracking-wider">RC</span>
            </div>
            <div>
              <p className="text-sm font-serif font-normal tracking-tight text-white leading-none">RetailCortex</p>
              <p className="text-[9px] font-light text-zinc-600 uppercase tracking-widest mt-0.5">
                Operations
              </p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-0.5">
          {navItem('/dashboard', LayoutDashboard, 'Dashboard')}
          {navItem('/dashboard/stores', Package, 'Inventory')}
          {navItem('/dashboard/zones', Store, 'Zones')}
          {navItem('/dashboard/categories', BarChart2, 'Categories')}
          {navItem('/dashboard/campaigns', FileText, 'Campaigns')}
          {navItem('/dashboard/settings', Settings, 'Settings')}
        </nav>

        {/* User */}
        {isLoaded && user && (
          <div className="px-3 py-4 border-t border-white/5">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.03] border border-white/5">
              <UserButton showName={false} />
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-normal text-zinc-200 truncate">
                  {user.fullName || user.username || 'Admin'}
                </p>
                <p className="text-[10px] text-zinc-600 font-light truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* + New Store */}
        <div className="px-3 pb-5">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/8 bg-white/[0.02] text-xs font-light text-zinc-400 hover:border-white/15 hover:text-zinc-200 hover:bg-white/[0.05] transition-all duration-150">
            <Plus size={12} />
            New Store
          </button>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Top Header */}
        <header className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#0d0d0d]/80 backdrop-blur-sm shrink-0">

          {/* Left: title */}
          <div className="flex items-center gap-4">
            <h1 className="text-base font-serif font-normal text-white leading-none tracking-tight">
              {currentPageTitle()}
            </h1>
            <span className="h-3 w-px bg-white/10" />
            <span className="text-xs font-light text-zinc-500">RetailCortex</span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-3 text-zinc-600" />
              <input
                type="text"
                placeholder="Search…"
                className="bg-white/[0.03] border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/20 focus:bg-white/5 transition-all w-40 font-light"
              />
            </div>

            {/* Bell */}
            <button className="relative p-1.5 rounded-md hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-200">
              <Bell size={14} />
              <span className="absolute top-1 right-1 w-1 h-1 bg-zinc-300 rounded-full" />
            </button>

            {/* Avatar */}
            {isLoaded && user && (
              <div className="w-7 h-7 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-xs font-light text-zinc-300 shrink-0 overflow-hidden">
                {user.imageUrl
                  ? <img src={user.imageUrl} alt="avatar" className="w-full h-full object-cover" />
                  : (user.firstName?.[0] ?? 'U')}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#0d0d0d]">
          {children}
        </main>
      </div>

      <AiChat />
    </div>
  );
}
