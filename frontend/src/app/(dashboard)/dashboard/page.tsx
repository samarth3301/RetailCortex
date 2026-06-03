'use client';

import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type StoreSummary = {
  total_products: number;
  in_stock: number;
  out_of_stock: number;
  categories: number;
  low_stock: number;
};

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [apiStatus, setApiStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [summary, setSummary] = useState<StoreSummary | null>(null);

  useEffect(() => {
    async function checkBackend() {
      try {
        const token = await getToken();
        if (!token) return;
        const [meRes, summaryRes] = await Promise.all([
          apiFetch('/api/v1/users/me', token),
          apiFetch('/api/v1/products/summary', token),
        ]);
        setApiStatus(meRes.ok && summaryRes.ok ? 'ok' : 'error');
        if (summaryRes.ok) {
          setSummary(await summaryRes.json());
        }
      } catch {
        setApiStatus('error');
      }
    }
    checkBackend();
  }, [getToken]);

  const stats = [
    { label: 'Products tracked', value: summary?.total_products ?? '—' },
    { label: 'In stock', value: summary?.in_stock ?? '—' },
    { label: 'Out of stock', value: summary?.out_of_stock ?? '—' },
    { label: 'Categories', value: summary?.categories ?? '—' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Here&apos;s your retail intelligence overview.</p>
      </div>

      {/* API connection badge */}
      <div className="mb-6 flex items-center gap-2 text-xs">
        <span
          className={`w-2 h-2 rounded-full ${
            apiStatus === 'ok'
              ? 'bg-emerald-400'
              : apiStatus === 'error'
                ? 'bg-red-400'
                : 'bg-zinc-600'
          }`}
        />
        <span className="text-zinc-500">
          {apiStatus === 'ok'
            ? 'Connected to backend'
            : apiStatus === 'error'
              ? 'Backend unreachable — check API'
              : 'Checking backend…'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-500 text-xs mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder content area */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-64 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <span className="text-indigo-400 text-xl">◈</span>
        </div>
        <p className="text-zinc-300 font-medium mb-1">CSV onboarding ready</p>
        <p className="text-zinc-600 text-sm max-w-sm mb-4">
          Upload a CSV catalog to import products, create inventory records, and populate the search
          index.
        </p>
        <Link
          href="/dashboard/store"
          className="inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
        >
          Open store upload
        </Link>
      </div>
    </div>
  );
}
