'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/modal';

type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
};

export default function CategoriesPage() {
  const { getToken } = useAuth();
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading categories…');
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadCategories() {
    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores/categories', token);
      if (!res.ok) { setMessage('Could not load categories.'); return; }
      const data = (await res.json()) as CategoryListItem[];
      setCategories(data);
      setMessage(data.length ? `Showing ${data.length} categor${data.length !== 1 ? 'ies' : 'y'}.` : 'No categories registered yet.');
    } catch {
      setMessage('Could not load categories.');
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadCategories();
      setLoading(false);
    }
    void init();
  }, [getToken]);

  function closeModal() {
    setModalOpen(false);
    setName(''); setSlug(''); setFormError('');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !slug) { setFormError('Enter a name and slug.'); return; }
    setFormError(''); setFormBusy(true);
    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores/categories', token, {
        method: 'POST',
        body: JSON.stringify({ name, slug: slug.toLowerCase().replace(/\s+/g, '-') }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setFormError(d?.detail ?? 'Failed to add category.');
        setFormBusy(false);
        return;
      }
      setFormBusy(false);
      closeModal();
      setLoading(true); await loadCategories(); setLoading(false);
    } catch {
      setFormError('Connection error.');
      setFormBusy(false);
    }
  }

  const slugged = categories.filter(c => c.slug).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8 py-6 animate-entrance">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">Inventory Classification</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white tracking-tight sm:text-4xl font-serif">Product Categories</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 font-light leading-relaxed">
            Define product taxonomy, manage catalog slugs, and structure your retail classification hierarchy.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(91,77,255,0.2)] hover:shadow-[0_0_25px_rgba(91,77,255,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Category
        </button>
      </div>

      {/* KPI Strip */}
      {!loading && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Categories', value: categories.length, desc: 'registered', color: 'indigo', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.464 1.464 0 002.07 0l4.319-4.319a1.464 1.464 0 000-2.07l-9.581-9.581a2.25 2.25 0 00-1.591-.659zM6 7.5h.008v.008H6V7.5z" /></svg> },
            { label: 'Active', value: categories.length, desc: 'in catalog', color: 'emerald', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Slugs Registered', value: slugged, desc: 'url-mapped', color: 'amber', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg> },
            { label: 'Coverage', value: categories.length > 0 ? `${Math.round((slugged / categories.length) * 100)}%` : '—', desc: 'slug rate', color: 'purple', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
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
        <span>Status Console: {message}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-950/20 p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
          <span>Synchronizing category records…</span>
        </div>
      ) : categories.length ? (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/30 shadow-xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-900 text-sm">
              <thead className="bg-zinc-950/60 text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4 text-left">Category</th>
                  <th className="px-6 py-4 text-left">URL Slug</th>
                  <th className="px-6 py-4 text-left">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/30 bg-zinc-950/10 text-zinc-300">
                {categories.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02] hover:scale-[1.002] transition-all duration-300">
                    <td className="px-6 py-4 font-semibold text-white">{c.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 text-xs font-mono font-medium text-purple-400">
                        /{c.slug}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-600">{c.id.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-zinc-950/20 p-12 text-center text-zinc-500 font-light flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.464 1.464 0 002.07 0l4.319-4.319a1.464 1.464 0 000-2.07l-9.581-9.581a2.25 2.25 0 00-1.591-.659zM6 7.5h.008v.008H6V7.5z" />
          </svg>
          <span className="text-sm">No categories configured. Add one to begin classifying your product catalog.</span>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all duration-300">
            Add First Category
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={closeModal} title="New Category" subtitle="Define a product classification and its URL-friendly slug.">
        <form onSubmit={handleAdd} className="space-y-5">
          {formError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {formError}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Category Name</label>
            <input value={name}
              onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')); }}
              placeholder="e.g. Shoes & Footwear"
              className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">URL Slug</label>
            <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all duration-300">
              <span className="px-3 text-zinc-600 text-sm font-mono border-r border-zinc-800 py-2.5">/</span>
              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="shoes-footwear"
                className="flex-1 bg-transparent text-sm font-mono text-zinc-100 px-3 py-2.5 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all duration-300">
              Cancel
            </button>
            <button type="submit" disabled={formBusy}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(91,77,255,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
              {formBusy ? 'Creating…' : 'Register Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
