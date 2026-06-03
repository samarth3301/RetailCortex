'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Product = {
  id: string;
  product_id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  image_url?: string;
  description?: string;
};

type ProductResponse = {
  message: string;
  data: Product[];
};

export default function InventoryPage() {
  const { getToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading inventory records...');

  useEffect(() => {
    async function loadInventory() {
      try {
        const token = await getToken();
        const res = await apiFetch('/api/v1/products/', token);
        if (!res.ok) {
          setMessage('Could not load inventory catalog.');
          setLoading(false);
          return;
        }

        const resData = (await res.json()) as ProductResponse;
        setProducts(resData.data || []);
        setMessage(
          resData.data?.length
            ? `Showing ${resData.data.length} tracked catalog products.`
            : 'No inventory records found. Upload a CSV catalog to register products.',
        );
      } catch {
        setMessage('Could not load inventory.');
      } finally {
        setLoading(false);
      }
    }

    void loadInventory();
  }, [getToken]);

  const getStockBadgeClass = (stock: number) => {
    if (stock <= 0) return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (stock <= 5) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  };

  const getStockLabel = (stock: number) => {
    if (stock <= 0) return 'Out of stock';
    if (stock <= 5) return 'Low Stock';
    return 'In stock';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-400 font-sans">
            Store Operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white font-serif">Manage Inventory</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 font-light">
            Monitor and configure retail SKU stock counts, pricing lists, and catalog availability.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/store"
            className="inline-flex w-fit items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Upload CSV Catalog
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
          >
            Back to overview
          </Link>
        </div>
      </div>

      {/* Info Status Box */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 text-xs text-zinc-400 font-mono">
        {message}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-zinc-950/40 p-8 text-zinc-500 font-mono text-xs">
          Loading items...
        </div>
      ) : products.length ? (
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-950/40 shadow-xl backdrop-blur">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left font-medium">SKU ID</th>
                <th className="px-6 py-4 text-left font-medium">Product details</th>
                <th className="px-6 py-4 text-left font-medium">Brand</th>
                <th className="px-6 py-4 text-left font-medium">Price</th>
                <th className="px-6 py-4 text-left font-medium">Stock count</th>
                <th className="px-6 py-4 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 bg-zinc-950/20 text-zinc-300">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-900/10">
                  <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                    {p.product_id || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-xs text-zinc-500 font-light mt-0.5">
                      {p.category || 'General'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs">{p.brand}</td>
                  <td className="px-6 py-4 font-mono text-xs">Rs. {p.price.toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-xs">{p.stock}</td>
                  <td className="px-6 py-4 text-xs">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${getStockBadgeClass(p.stock)}`}
                    >
                      {getStockLabel(p.stock)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-zinc-950/20 p-8 text-center text-zinc-500 font-light">
          No inventory products recorded. Open the CSV uploader to import bulk product rows.
        </div>
      )}
    </div>
  );
}
