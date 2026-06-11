'use client';

import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { apiFetch, agentQuery } from '@/lib/api';
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
  Sparkles,
  Send,
  Loader2,
  Zap,
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

  // Guest Chat & Congestion States
  const [queryInput, setQueryInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: number; role: 'user' | 'assistant'; text: string; toolUsed?: string | null }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [congestionZones, setCongestionZones] = useState<any[]>([]);
  const [loadingCongestion, setLoadingCongestion] = useState(false);

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

  useEffect(() => {
    if (role === 'user') {
      async function loadCongestion() {
        setLoadingCongestion(true);
        try {
          const token = await getToken();
          if (!token) return;
          const res = await apiFetch('/api/v1/operations/congestion', token);
          if (res.ok) {
            const data = await res.json();
            setCongestionZones(data.data || []);
          }
        } catch (err) {
          console.error("Failed to load congestion", err);
        } finally {
          setLoadingCongestion(false);
        }
      }
      void loadCongestion();
    }
  }, [role, getToken]);

  async function handleSendQuery(text: string) {
    const q = text.trim();
    if (!q || chatLoading) return;
    setQueryInput('');
    setChatMessages(prev => [...prev, { id: Date.now(), role: 'user', text: q }]);
    setChatLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const res = await agentQuery(q, token);
      setChatMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: res.answer, toolUsed: res.tool_used }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: err instanceof Error ? err.message : 'Assistant query failed.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  const firstName = user?.firstName ?? 'User';
  const isAdmin = role === 'super_admin' || role === 'store_admin';

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8 py-6 animate-entrance">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">
            {isAdmin ? 'Operations Hub' : 'Guest Portal'}
          </p>
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
          {isAdmin && (
            <Link href="/dashboard/stores"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all duration-300">
              <Store size={14} />
              Manage Stores
            </Link>
          )}
        </div>
      </div>

      {/* ─── GUEST/USER VIEW (NON-ADMINS) ─── */}
      {!isAdmin && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Chat history / Interactive chat console */}
          <div className="lg:col-span-3 flex flex-col glass-card rounded-2xl overflow-hidden border border-white/5 bg-[#0d0d0d]/40 min-h-[550px]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0 bg-zinc-950/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
                  <Sparkles size={14} className="text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white leading-none font-serif">RetailCortex AI Chat Console</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Gemini 2.5 Flash · Operations Assistant</p>
                </div>
              </div>
              {chatMessages.length > 0 && (
                <button
                  onClick={() => setChatMessages([])}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  Clear History
                </button>
              )}
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[400px] min-h-[350px] custom-scrollbar">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                    <Sparkles size={22} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Interactive Operations Assistant</h3>
                    <p className="text-[11px] text-zinc-500 mt-1.5 max-w-sm">
                      Check customer congestion, file facility reports, verify product details, or query tenant stores.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-w-md w-full pt-4">
                    {[
                      { label: 'Check mall health', query: 'Show me the current mall health status and any open issues' },
                      { label: 'Live congestion', query: 'Which zones are most congested right now?' },
                      { label: 'Low stock check', query: 'Which products are low on stock across all stores?' },
                      { label: 'Promotions list', query: 'What promotional campaigns are currently active?' },
                    ].map(s => (
                      <button
                        key={s.label}
                        onClick={() => handleSendQuery(s.query)}
                        className="text-left text-[11px] text-zinc-400 px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:border-indigo-500/30 hover:text-zinc-200 hover:bg-indigo-500/5 transition-all duration-200"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-5 h-5 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <Sparkles size={10} className="text-indigo-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/20 border border-indigo-500/25 text-zinc-100 rounded-tr-sm'
                      : 'bg-zinc-950/60 border border-white/5 text-zinc-300 rounded-tl-sm'
                  }`}>
                    <div className="whitespace-pre-wrap space-y-1">{msg.text}</div>
                    {msg.toolUsed && (
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
                        <Zap size={9} className="text-indigo-400 shrink-0" />
                        <span className="text-[10px] text-zinc-500 font-mono">Tool: {msg.toolUsed}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start items-start gap-2">
                  <div className="w-5 h-5 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={10} className="text-indigo-400" />
                  </div>
                  <div className="bg-zinc-950/60 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 size={12} className="text-indigo-400 animate-spin shrink-0" />
                    <span className="text-[11px] text-zinc-500">Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-white/5 bg-zinc-950/20 mt-auto">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3.5 py-2.5 focus-within:border-indigo-500/30 transition-all">
                <input
                  type="text"
                  value={queryInput}
                  onChange={e => setQueryInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendQuery(queryInput); } }}
                  placeholder="Ask about live congestion, facility issues, product catalog..."
                  disabled={chatLoading}
                  className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-700 outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => handleSendQuery(queryInput)}
                  disabled={!queryInput.trim() || chatLoading}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Congestion Data */}
          <div className="lg:col-span-2 flex flex-col glass-card rounded-2xl overflow-hidden border border-white/5 bg-[#0d0d0d]/40 p-5 gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Live Zone Congestion</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Real-time crowd densities per level</p>
            </div>

            {loadingCongestion ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-500 font-mono text-[11px] py-12">
                <Loader2 size={16} className="text-indigo-400 animate-spin" />
                <span>Polling congestion events…</span>
              </div>
            ) : congestionZones.length > 0 ? (
              <div className="space-y-4 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
                {congestionZones.map(zone => {
                  const pct = zone.occupancy_pct;
                  const level = zone.level?.toLowerCase() ?? '';
                  let badgeCls = 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5';
                  let barCls = 'bg-emerald-500';
                  if (level === 'critical' || pct > 85) {
                    badgeCls = 'text-red-400 border-red-400/20 bg-red-400/5 animate-pulse';
                    barCls = 'bg-red-500';
                  } else if (level === 'high' || pct > 65) {
                    badgeCls = 'text-amber-500 border-amber-500/20 bg-amber-500/5';
                    barCls = 'bg-amber-500';
                  } else if (level === 'medium' || pct > 40) {
                    badgeCls = 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5';
                    barCls = 'bg-yellow-400';
                  }

                  return (
                    <div key={zone.zone_id} className="p-3.5 rounded-xl border border-white/5 bg-zinc-950/20 flex flex-col gap-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-semibold text-white">{zone.zone_name}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Floor {zone.floor}</p>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badgeCls}`}>
                          {zone.level}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${barCls} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                          <span>{zone.occupancy} / {zone.capacity} occupants</span>
                          <span>{pct}% full</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 py-12">
                <MapPin size={24} className="text-zinc-700 mb-2" />
                <p className="text-xs">No live congestion readings found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ADMIN VIEW ─── */}
      {isAdmin && (
        <>
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

          {/* Main grid: Store Directory + Activity Feed & Logins */}
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

            {/* Right column: Activity Feed & Logins */}
            <div className="space-y-5">
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

              {/* Developer & Admin Credentials Panel */}
              <div className="glass-card rounded-2xl overflow-hidden border border-white/5 bg-zinc-950/20 p-5 flex flex-col gap-4">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Super Admin Logins</h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Use these credentials for switching roles</p>
                </div>
                <div className="space-y-3 font-mono text-[10px]">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-indigo-400">Super Administrator</span>
                      <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300">super_admin</span>
                    </div>
                    <p className="text-zinc-400">Email: <span className="text-white select-all">superadmin@retailcortex.dev</span></p>
                    <p className="text-zinc-400">Pass: <span className="text-white select-all">RetailCortex2026!</span></p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-amber-400">Store Tenant Admin</span>
                      <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">store_admin</span>
                    </div>
                    <p className="text-zinc-400">Email: <span className="text-white select-all">stride@retailcortex.dev</span></p>
                    <p className="text-zinc-400">Pass: <span className="text-white select-all">RetailCortex2026!</span></p>
                  </div>
                </div>
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
        </>
      )}

    </div>
  );
}
