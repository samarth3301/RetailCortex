'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
};

export default function CategoriesPage() {
  const { getToken } = useAuth();
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading categories...');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadCategories() {
    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores/categories', token);
      if (!res.ok) {
        setMessage('Could not load categories.');
        return;
      }
      const data = (await res.json()) as CategoryListItem[];
      setCategories(data);
      setMessage(
        data.length
          ? `Showing ${data.length} categories.`
          : 'No retail categories have been added yet.',
      );
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

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !slug) {
      setFormError('Please enter a valid category name and slug.');
      return;
    }

    setFormError('');
    setFormBusy(true);

    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores/categories', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug: slug.toLowerCase().replace(/\s+/g, '-') }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setFormError(errorData?.detail ?? 'Failed to add category.');
        setFormBusy(false);
        return;
      }

      // Success
      setName('');
      setSlug('');
      setFormBusy(false);
      setShowAddForm(false);

      // Reload Categories
      setLoading(true);
      await loadCategories();
      setLoading(false);
    } catch {
      setFormError('Connection error. Failed to add category.');
      setFormBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">
            Inventory Classification
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white font-serif">Manage Categories</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 font-light">
            Configure retail store classification categories and taxonomy catalog slugs.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex w-fit items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            {showAddForm ? 'Close form' : 'Add Category'}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
          >
            Back to overview
          </Link>
        </div>
      </div>

      {/* Add Category Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddCategory}
          className="rounded-3xl border border-white/5 bg-zinc-950/40 p-6 space-y-4 max-w-md"
        >
          <h2 className="text-lg font-semibold text-white font-serif border-b border-zinc-900 pb-2">
            Category parameters
          </h2>

          {formError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-200">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Category Name</label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                }}
                placeholder="e.g. Shoes & Footwear"
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">URL Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. shoes-footwear"
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500 font-mono text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={formBusy}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {formBusy ? 'Creating Category...' : 'Register Category'}
          </button>
        </form>
      )}

      {/* Message Info Box */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 text-xs text-zinc-400 font-mono">
        {message}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-zinc-950/40 p-8 text-zinc-500 font-mono text-xs">
          Loading categories...
        </div>
      ) : categories.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-white/5 bg-zinc-950/40 p-6 space-y-2"
            >
              <h3 className="text-xl font-normal text-white font-serif">{c.name}</h3>
              <p className="text-xs font-mono text-indigo-400">slug: {c.slug}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-zinc-950/20 p-8 text-center text-zinc-500 font-light">
          No product categories configured yet.
        </div>
      )}
    </div>
  );
}
