'use client';

import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useActiveRole } from '@/lib/auth-sim';
import {
  TrendingDown,
  MapPin,
  User,
  Clock,
  ChevronRight,
  ArrowUpRight,
  Store,
  BarChart3,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

type StoreSummary = {
  total_products: number;
  in_stock: number;
  out_of_stock: number;
  categories: number;
  low_stock: number;
};

type StoreListItem = {
  id: string;
  name: string;
  description: string;
  floor: number;
  unit_number: string;
  zone?: { id: string; name: string; floor: number } | null;
  category?: { id: string; name: string } | null;
  admin_email?: string | null;
};

type Notification = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

type NotificationListResponse = {
  items: Notification[];
  total: number;
  unread_count: number;
};

const CATEGORY_COLORS: Record<string, { tag: string; accent: string; bg: string }> = {
  Footwear:  { tag: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5', accent: '#10b981', bg: 'bg-emerald-500/10' },
  Clothing:  { tag: 'text-blue-400 border-blue-400/30 bg-blue-400/5',          accent: '#3b82f6', bg: 'bg-blue-500/10'    },
  Lifestyle: { tag: 'text-amber-400 border-amber-400/30 bg-amber-400/5',       accent: '#f59e0b', bg: 'bg-amber-500/10'  },
  default:   { tag: 'text-indigo-400 border-indigo-400/30 bg-indigo-400/5',    accent: '#6366f1', bg: 'bg-indigo-500/10' },
};

function storeColors(categoryName?: string | null) {
  return CATEGORY_COLORS[categoryName ?? ''] ?? CATEGORY_COLORS.default;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type Stat = { label: string; value: string; delta: string; positive: true | false | null };
const STATS: Stat[] = [
  { label: 'Total Revenue',   value: '$1.2M',  delta: '+8.4% vs last month', positive: true  },
  { label: 'Active Stores',   value: '—',      delta: 'Loading…',            positive: null  },
  { label: 'Network Growth',  value: '+12.4%', delta: '+2.1% vs last month', positive: true  },
  { label: 'Avg Order Value', value: '$85',    delta: '+5.2% vs last month', positive: true  },
];

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { role } = useActiveRole();
  const [apiStatus, setApiStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [summary, setSummary] = useState<StoreSummary | null>(null);
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [activity, setActivity] = useState<Notification[]>([]);
  const [stats, setStats] = useState(STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        if (!token) return;

        const [meRes, summaryRes, storesRes, notifRes] = await Promise.all([
          apiFetch('/api/v1/users/me', token),
          apiFetch('/api/v1/products/summary', token),
          apiFetch('/api/v1/stores', token),
          apiFetch('/api/v1/notifications/me?limit=6', token),
        ]);

        setApiStatus(meRes.ok ? 'ok' : 'error');
        if (summaryRes.ok) setSummary(await summaryRes.json());

        if (storesRes.ok) {
          const storeData = (await storesRes.json()) as StoreListItem[];
          setStores(storeData);
          setStats(prev => prev.map(s =>
            s.label === 'Active Stores'
              ? { ...s, value: String(storeData.length), delta: `${storeData.length} registered`, positive: true as const }
              : s
          ));
        }

        if (notifRes.ok) {
          const notifData = (await notifRes.json()) as NotificationListResponse;
          setActivity(notifData.items.slice(0, 6));
        }
      } catch {
        setApiStatus('error');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [getToken]);

  const firstName = user?.firstName ?? 'Admin';

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8 py-6 animate-entrance">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">Operations Hub</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white tracking-tight sm:text-4xl font-serif">
            Welcome back, {firstName}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${
              apiStatus === 'ok' ? 'bg-emerald-400' : apiStatus === 'error' ? 'bg-red-400' : 'bg-zinc-600 animate-pulse'
            }`} />
            <p className="text-sm text-zinc-400 font-light">
              {apiStatus === 'ok' ? 'All systems operational' : apiStatus === 'error' ? 'Backend unreachable' : 'Connecting…'}
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {role === 'store_admin' && (
            <Link href="/dashboard/store"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(91,77,255,0.2)] hover:shadow-[0_0_25px_rgba(91,77,255,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
              <ArrowUpRight size={16} />
              Upload Catalog
            </Link>
          )}
          <Link href="/dashboard/stores"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all duration-300">
            <Store size={14} />
            Manage Stores
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      {!loading && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map(stat => (
            <div key={stat.label} className="glass-card rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-500" />
              <span className="text-xs font-medium text-zinc-400 tracking-wider">{stat.label}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {stat.positive === true  && <TrendingUp  size={11} className="text-emerald-400 shrink-0" />}
                {stat.positive === false && <TrendingDown size={11} className="text-red-400 shrink-0" />}
                <span className={`text-xs font-light ${stat.positive === true ? 'text-emerald-400' : stat.positive === false ? 'text-red-400' : 'text-zinc-500'}`}>
                  {stat.delta}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Status console */}
      <div className="rounded-xl border border-zinc-900/50 bg-zinc-900/10 p-4 text-xs text-zinc-500 font-mono flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-600" />
        </span>
        <span>Operations Console: {loading ? 'Synchronizing data…' : `${stores.length} stores · ${activity.length} notifications · ${summary?.total_products ?? 0} products indexed`}</span>
      </div>

      {/* Main grid: Store Directory + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Store Directory */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Store Directory</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{stores.length} tenant{stores.length !== 1 ? 's' : ''} registered</p>
            </div>
            <Link href="/dashboard/stores" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              View all
              <ChevronRight size={12} />
            </Link>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {loading ? (
              <div className="p-8 flex items-center justify-center gap-3 text-zinc-600 text-xs font-mono">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
                Loading stores…
              </div>
            ) : stores.length ? stores.slice(0, 8).map(store => {
              const colors = storeColors(store.category?.name);
              const initials = store.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={store.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors group cursor-pointer">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border"
                    style={{ background: `${colors.accent}15`, borderColor: `${colors.accent}30`, color: colors.accent }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{store.name}</span>
                      {store.category && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${colors.tag}`}>
                          {store.category.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <User size={10} className="text-zinc-600 shrink-0" />
                      <span className="text-[11px] text-zinc-500 truncate">{store.admin_email ?? 'No admin assigned'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {store.zone && (
                      <div className="hidden sm:flex items-center gap-1">
                        <MapPin size={10} className="text-zinc-600" />
                        <span className="text-xs text-zinc-500">{store.zone.name}</span>
                      </div>
                    )}
                    <span className={`w-2 h-2 rounded-full ${store.admin_email ? 'bg-emerald-400 shadow-[0_0_5px_#10b981]' : 'bg-zinc-700'}`} />
                    <ChevronRight size={13} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-zinc-600 text-sm font-light">
                {apiStatus === 'error' ? 'Backend unreachable.' : 'No stores registered yet.'}
              </div>
            )}
          </div>

          {stores.length > 8 && (
            <div className="px-6 py-3 border-t border-white/5 text-center">
              <Link href="/dashboard/stores" className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors">
                +{stores.length - 8} more stores
              </Link>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Recent Activity</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Latest notifications</p>
            </div>
          </div>

          <div className="flex-1 divide-y divide-white/[0.04]">
            {loading ? (
              <div className="p-6 flex items-center justify-center gap-3 text-zinc-600 text-xs font-mono">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
                Loading…
              </div>
            ) : activity.length ? activity.map(item => (
              <div key={item.id} className={`px-5 py-4 hover:bg-white/[0.02] transition-colors ${!item.is_read ? 'border-l-2 border-indigo-500/40' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!item.is_read ? 'bg-indigo-400' : 'bg-zinc-700'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 leading-snug">{item.title}</p>
                    <p className="text-[11px] text-zinc-500 font-light mt-1 leading-relaxed line-clamp-2">{item.body}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Clock size={9} className="text-zinc-700" />
                      <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{timeAgo(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-6 text-center text-zinc-600 text-xs font-light">No recent activity.</div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-white/5">
            <button className="w-full text-xs text-zinc-500 hover:text-indigo-400 transition-colors text-center">
              View all activity
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Summary */}
      {summary && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-zinc-300 tracking-wide">Inventory Snapshot</h2>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Products', value: summary.total_products, icon: ShoppingBag, color: 'indigo' },
              { label: 'In Stock',       value: summary.in_stock,       icon: BarChart3,   color: 'emerald' },
              { label: 'Out of Stock',   value: summary.out_of_stock,   icon: TrendingDown, color: 'red' },
              { label: 'Categories',     value: summary.categories,     icon: Store,       color: 'purple' },
            ].map(item => (
              <div key={item.label} className="glass-card rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className={`p-2.5 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/15 text-${item.color}-400 shrink-0`}>
                  <item.icon size={15} />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{item.label}</p>
                  <p className="text-xl font-extrabold text-white tracking-tight mt-0.5">{item.value ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-zinc-300 tracking-wide">Quick Actions</h2>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Inventory',  href: '/dashboard/inventory',  icon: ShoppingBag, desc: 'Manage SKUs'       },
            { label: 'Campaigns',  href: '/dashboard/campaigns',  icon: BarChart3,   desc: 'Promotions'        },
            { label: 'Categories', href: '/dashboard/categories', icon: Store,       desc: 'Product taxonomy'  },
            { label: 'Zones',      href: '/dashboard/zones',      icon: MapPin,      desc: 'Floor mapping'     },
          ].map(q => (
            <Link key={q.label} href={q.href}
              className="glass-card rounded-2xl px-5 py-4 flex items-center gap-4 hover:scale-[1.02] hover:border-indigo-500/20 transition-all duration-300 group">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors shrink-0">
                <q.icon size={15} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{q.label}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{q.desc}</p>
              </div>
              <ChevronRight size={13} className="ml-auto text-zinc-700 group-hover:text-indigo-400 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
