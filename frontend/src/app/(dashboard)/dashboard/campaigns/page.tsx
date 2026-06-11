'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/modal';

type PromotionStore = { id: string; name: string };

type Promotion = {
  id: string;
  title: string;
  description: string;
  discount_pct: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  store: PromotionStore;
  created_at: string;
};

type StoreListItem = { id: string; name: string; floor: number };

function statusLabel(p: Promotion): 'active' | 'scheduled' | 'expired' {
  const now = Date.now();
  const start = new Date(p.starts_at).getTime();
  const end = new Date(p.ends_at).getTime();
  if (!p.is_active || now > end) return 'expired';
  if (now < start) return 'scheduled';
  return 'active';
}

const STATUS_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  active:    { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400', label: 'Live' },
  scheduled: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',         dot: 'bg-blue-400',    label: 'Scheduled' },
  expired:   { badge: 'bg-zinc-900/60 text-zinc-500 border-zinc-800',             dot: 'bg-zinc-600',    label: 'Expired' },
};

function deriveCoupon(title: string, pct: number): string {
  const word = title.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8);
  return `${word}${Math.round(pct)}`;
}

function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default function CampaignsPage() {
  const { getToken } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading campaigns…');
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [discountPct, setDiscountPct] = useState(15);
  const [description, setDescription] = useState('');
  const [storeId, setStoreId] = useState('');
  const [startsAt, setStartsAt] = useState(isoDate(0));
  const [endsAt, setEndsAt] = useState(isoDate(30));
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadData() {
    try {
      const token = await getToken();
      const [promoRes, storesRes] = await Promise.all([
        apiFetch('/api/v1/promotions', token),
        apiFetch('/api/v1/stores', token),
      ]);
      if (promoRes.ok) {
        const data = (await promoRes.json()) as Promotion[];
        setPromotions(data);
        setMessage(data.length ? `Showing ${data.length} campaign${data.length !== 1 ? 's' : ''}.` : 'No campaigns yet.');
      } else {
        setMessage('Could not load campaigns.');
      }
      if (storesRes.ok) {
        const sdata = (await storesRes.json()) as StoreListItem[];
        setStores(sdata);
        if (sdata.length && !storeId) setStoreId(sdata[0].id);
      }
    } catch {
      setMessage('Connection error.');
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadData();
      setLoading(false);
    }
    void init();
  }, [getToken]);

  function closeModal() {
    setModalOpen(false);
    setTitle(''); setDescription(''); setDiscountPct(15);
    setStartsAt(isoDate(0)); setEndsAt(isoDate(30)); setFormError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !storeId) { setFormError('Enter a campaign title and select a store.'); return; }
    if (new Date(endsAt) <= new Date(startsAt)) { setFormError('End date must be after start date.'); return; }
    setFormError(''); setFormBusy(true);
    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/promotions', token, {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          discount_pct: Number(discountPct),
          store_id: storeId,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setFormError(d?.detail ?? 'Failed to create campaign.');
        setFormBusy(false);
        return;
      }
      const created = (await res.json()) as Promotion;
      void apiFetch('/api/v1/notifications/broadcast', token, {
        method: 'POST',
        body: JSON.stringify({
          title: `New Offer: ${created.title}`,
          body: `${created.discount_pct}% off at ${created.store?.name ?? 'store'}! Use code ${deriveCoupon(created.title, created.discount_pct)}.`,
        }),
      }).catch(() => {});
      setFormBusy(false);
      closeModal();
      setLoading(true); await loadData(); setLoading(false);
    } catch {
      setFormError('Connection error.');
      setFormBusy(false);
    }
  }

  async function toggleActive(p: Promotion) {
    try {
      const token = await getToken();
      await apiFetch(`/api/v1/promotions/${p.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      setPromotions(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
    } catch (err) { console.error(err); }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const active = promotions.filter(p => statusLabel(p) === 'active').length;
  const scheduled = promotions.filter(p => statusLabel(p) === 'scheduled').length;
  const storesCovered = new Set(promotions.map(p => p.store?.id).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8 py-6 animate-entrance">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">Store Operations</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white tracking-tight sm:text-4xl font-serif">Active Campaigns</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 font-light leading-relaxed">
            Create and manage promotional campaigns, broadcast discount offers across tenant stores.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(91,77,255,0.2)] hover:shadow-[0_0_25px_rgba(91,77,255,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Campaign
        </button>
      </div>

      {/* KPI Strip */}
      {!loading && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Campaigns', value: promotions.length, desc: 'registered', color: 'indigo', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg> },
            { label: 'Active Now', value: active, desc: 'live', color: 'emerald', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg> },
            { label: 'Scheduled', value: scheduled, desc: 'upcoming', color: 'amber', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Stores Covered', value: storesCovered, desc: 'with campaigns', color: 'purple', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.5a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75h-3.5a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" /></svg> },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className={`absolute -right-6 -top-6 w-20 h-20 bg-${s.color}-500/5 rounded-full blur-2xl group-hover:bg-${s.color}-500/10 transition-all duration-500`} />
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-zinc-400 tracking-wider">{s.label}</span>
                <div className={`p-2 rounded-lg bg-${s.color}-500/10 text-${s.color}-400 border border-${s.color}-500/15`}>{s.icon}</div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-white tracking-tight">{s.value}</span>
                <span className="text-xs text-zinc-500">{s.desc}</span>
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
        <span>Status Console: {loading ? 'Synchronizing campaign records…' : message}</span>
      </div>

      {/* Campaign Cards */}
      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-950/20 p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
          <span>Synchronizing campaign records…</span>
        </div>
      ) : promotions.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {promotions.map(p => {
            const sl = statusLabel(p);
            const s = STATUS_STYLES[sl];
            const coupon = deriveCoupon(p.title, p.discount_pct);
            const storeName = p.store?.name ?? 'Unknown Store';
            return (
              <div key={p.id} className="glass-card rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">
                {/* Glow blob */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-500" />

                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm leading-tight truncate">{p.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{storeName}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${s.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${sl === 'active' ? 'animate-pulse' : ''}`} />
                    {s.label}
                  </span>
                </div>

                {/* Discount banner */}
                <div className="rounded-xl bg-indigo-500/8 border border-indigo-500/15 px-4 py-3 flex items-center justify-between">
                  <span className="text-3xl font-extrabold text-white tracking-tight">{p.discount_pct}%</span>
                  <span className="text-xs text-indigo-300 font-medium uppercase tracking-wider">discount</span>
                </div>

                {/* Description */}
                {p.description && (
                  <p className="text-xs text-zinc-400 font-light leading-relaxed line-clamp-2">{p.description}</p>
                )}

                {/* Coupon + dates */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <button onClick={() => copyCode(coupon)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 transition-colors group/copy">
                    <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.464 1.464 0 002.07 0l4.319-4.319a1.464 1.464 0 000-2.07l-9.581-9.581a2.25 2.25 0 00-1.591-.659zM6 7.5h.008v.008H6V7.5z" />
                    </svg>
                    <span className="font-mono text-zinc-300">{coupon}</span>
                    <svg className={`w-3 h-3 transition-colors ${copied === coupon ? 'text-emerald-400' : 'text-zinc-600 group-hover/copy:text-zinc-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {copied === coupon
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />}
                    </svg>
                  </button>
                  <span className="text-zinc-600 font-mono">
                    {new Date(p.starts_at).toLocaleDateString()} – {new Date(p.ends_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Footer toggle */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-xs text-zinc-500">{p.is_active ? 'Campaign active' : 'Campaign paused'}</span>
                  <button onClick={() => toggleActive(p)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${p.is_active ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${p.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-zinc-950/20 p-12 text-center text-zinc-500 font-light flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
          </svg>
          <span className="text-sm">No campaigns yet. Create one to start pushing promotions to shoppers.</span>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all duration-300">
            Create First Campaign
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={closeModal} title="New Campaign" subtitle="Configure a promotional discount and broadcast to shoppers." maxWidth="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-5">
          {formError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Campaign Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Summer Athletic Rush"
              className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Discount %</label>
              <input type="number" min={1} max={100} value={discountPct} onChange={e => setDiscountPct(Number(e.target.value))}
                className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Store</label>
              <div className="relative">
                <select value={storeId} onChange={e => setStoreId(e.target.value)}
                  className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300 appearance-none cursor-pointer">
                  {!stores.length && <option value="">No stores found</option>}
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Start Date</label>
              <input type="date" value={startsAt} onChange={e => setStartsAt(e.target.value)}
                className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300 [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">End Date</label>
              <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)}
                className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300 [color-scheme:dark]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Description <span className="text-zinc-600 normal-case font-normal">(optional)</span>
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Campaign details for shoppers…"
              className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all duration-300">
              Cancel
            </button>
            <button type="submit" disabled={formBusy}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(91,77,255,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
              {formBusy ? 'Activating…' : 'Activate Campaign'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
