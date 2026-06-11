'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Product = {
  id: string;
  product_id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
};

type ProductResponse = {
  message: string;
  data: Product[];
};

export default function InventoryPage() {
  const { getToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadInventory() {
      try {
        const token = await getToken();
        const res = await apiFetch('/api/v1/products/', token);
        if (!res.ok) { setError('Could not load inventory.'); return; }
        const resData = (await res.json()) as ProductResponse;
        setProducts(resData.data || []);
      } catch {
        setError('Could not load inventory.');
      } finally {
        setLoading(false);
      }
    }
    void loadInventory();
  }, [getToken]);

  const inStock   = products.filter(p => p.stock > 5).length;
  const lowStock  = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outStock  = products.filter(p => p.stock <= 0).length;

  const stockBadge = (stock: number) => {
    if (stock <= 0)  return { cls: 'bg-red-500/10 text-red-400 border-red-500/20',   label: 'Out of Stock', Icon: TrendingDown };
    if (stock <= 5)  return { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Low Stock', Icon: AlertTriangle };
    return { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'In Stock', Icon: CheckCircle2 };
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8 py-6 animate-entrance">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">Store Operations</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white tracking-tight sm:text-4xl font-serif">Inventory Intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 font-light leading-relaxed">
            Track SKU catalog, monitor stock levels, and manage product pricing across all registered stores.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/store"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(91,77,255,0.2)] hover:shadow-[0_0_25px_rgba(91,77,255,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload CSV
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Overview
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      {!loading && (  
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total SKUs', value: products.length, desc: 'registered', color: 'indigo', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
            { label: 'In Stock', value: inStock, desc: 'healthy', color: 'emerald', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Low Stock', value: lowStock, desc: 'need reorder', color: 'amber', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> },
            { label: 'Out of Stock', value: outStock, desc: 'depleted', color: 'red', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
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
        <span>Inventory Console: {loading ? 'Synchronizing records…' : error || `Showing ${products.length} SKUs.`}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-950/20 p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
          <span>Synchronizing catalog records…</span>
        </div>
      ) : products.length ? (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/30 shadow-xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-900 text-sm">
              <thead className="bg-zinc-950/60 text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4 text-left">SKU</th>
                  <th className="px-6 py-4 text-left">Product</th>
                  <th className="px-6 py-4 text-left">Brand</th>
                  <th className="px-6 py-4 text-left">Price</th>
                  <th className="px-6 py-4 text-left">Stock</th>
                  <th className="px-6 py-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/30 bg-zinc-950/10 text-zinc-300">
                {products.map(p => {
                  const badge = stockBadge(p.stock);
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] hover:scale-[1.002] transition-all duration-300">
                      <td className="px-6 py-4 font-mono text-xs text-zinc-500">{p.product_id || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-xs text-zinc-500 font-light mt-0.5">{p.category || 'General'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">{p.brand}</td>
                      <td className="px-6 py-4 font-mono text-xs text-white">₹{p.price.toLocaleString()}</td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-300">{p.stock}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${badge.cls}`}>
                          <badge.Icon size={10} />
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-zinc-950/20 p-12 text-center text-zinc-500 font-light flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <span className="text-sm">No products in catalog. Upload a CSV to populate inventory.</span>
          <Link href="/dashboard/store" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all duration-300">
            Upload CSV Catalog
          </Link>
        </div>
      )}
    </div>
  );
}
