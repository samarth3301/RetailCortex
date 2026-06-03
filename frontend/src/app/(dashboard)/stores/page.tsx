'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type StoreZoneSummary = {
  id: string;
  name: string;
  floor: number;
};

type StoreCategorySummary = {
  id: string;
  name: string;
};

type StoreListItem = {
  id: string;
  name: string;
  description: string;
  floor: number;
  unit_number: string;
  zone?: StoreZoneSummary | null;
  category?: StoreCategorySummary | null;
  admin_email?: string | null;
};

type ZoneListItem = {
  id: string;
  name: string;
  floor: number;
  capacity: number;
};

type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
};

export default function StoresPage() {
  const { getToken } = useAuth();
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [zones, setZones] = useState<ZoneListItem[]>([]);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading stores...');
  const [showOnboardForm, setShowOnboardForm] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [floor, setFloor] = useState(0);
  const [unitNumber, setUnitNumber] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadStores() {
    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores', token);
      if (!res.ok) {
        setMessage('Could not load stores.');
        return;
      }
      const data = (await res.json()) as StoreListItem[];
      setStores(data);
      setMessage(data.length ? `Showing ${data.length} stores.` : 'No stores have been added yet.');
    } catch {
      setMessage('Could not load stores.');
    }
  }

  async function loadMetadata() {
    try {
      const token = await getToken();
      const [zonesRes, categoriesRes] = await Promise.all([
        apiFetch('/api/v1/stores/zones', token),
        apiFetch('/api/v1/stores/categories', token),
      ]);

      if (zonesRes.ok) {
        const zonesData = (await zonesRes.json()) as ZoneListItem[];
        setZones(zonesData);
        if (zonesData.length) setSelectedZoneId(zonesData[0].id);
      }
      if (categoriesRes.ok) {
        const categoriesData = (await categoriesRes.json()) as CategoryListItem[];
        setCategories(categoriesData);
      }
    } catch (e) {
      console.error('Error loading metadata', e);
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadStores(), loadMetadata()]);
      setLoading(false);
    }
    void init();
  }, [getToken]);

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !unitNumber || !selectedZoneId) {
      setFormError('Please fill in name, unit number, and select a zone.');
      return;
    }

    setFormError('');
    setFormBusy(true);

    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          floor: Number(floor),
          unit_number: unitNumber,
          zone_id: selectedZoneId,
          category_id: selectedCategoryId || null,
          admin_email: adminEmail || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setFormError(errorData?.detail ?? 'Failed to onboard store.');
        setFormBusy(false);
        return;
      }

      // Success
      setName('');
      setDescription('');
      setFloor(0);
      setUnitNumber('');
      setAdminEmail('');
      setFormBusy(false);
      setShowOnboardForm(false);

      // Reload Stores
      setLoading(true);
      await loadStores();
      setLoading(false);
    } catch {
      setFormError('Connection error. Failed to onboard.');
      setFormBusy(false);
    }
  }

  async function handleUpdateZone(storeId: string, zoneId: string) {
    if (!zoneId) return;
    try {
      const token = await getToken();
      const res = await apiFetch(`/api/v1/stores/${storeId}/zone`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: zoneId }),
      });
      if (res.ok) {
        // Reload Stores
        await loadStores();
      } else {
        const errorData = await res.json().catch(() => null);
        console.error('Failed to update zone:', errorData?.detail);
      }
    } catch (e) {
      console.error('Error updating store zone', e);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">Store Management</p>
          <h1 className="mt-2 text-3xl font-semibold text-white font-serif">Onboard Stores</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 font-light">
            Register and configure commercial tenant stores across mall levels and zones.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowOnboardForm(!showOnboardForm)}
            className="inline-flex w-fit items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            {showOnboardForm ? 'Close onboard form' : 'Onboard New Store'}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
          >
            Back to overview
          </Link>
        </div>
      </div>

      {/* Onboard Form Card */}
      {showOnboardForm && (
        <form
          onSubmit={handleOnboard}
          className="rounded-3xl border border-white/5 bg-zinc-950/40 p-6 space-y-4 max-w-xl"
        >
          <h2 className="text-lg font-semibold text-white font-serif border-b border-zinc-900 pb-2">
            Store Details
          </h2>

          {formError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-200">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-zinc-400">Store Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nike Flagship"
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs text-zinc-400">Admin Email Address</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="e.g. nike.admin@mall.com"
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs text-zinc-400">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Premium athletic footwear and sportswear catalog..."
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500 min-h-20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Floor Level</label>
              <input
                type="number"
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Unit Number</label>
              <input
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g. L2-204"
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Layout Zone</label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500 cursor-pointer"
              >
                {!zones.length && <option value="">No zones added yet</option>}
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} (L{z.floor})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Product Category</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">None (General Retail)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={formBusy || !zones.length}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {formBusy ? 'Registering Store...' : 'Complete Onboarding'}
          </button>
        </form>
      )}

      {/* Message Info Box */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 text-xs text-zinc-400 font-mono">
        {message}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-zinc-950/40 p-8 text-zinc-500 font-mono text-xs">
          Loading store list...
        </div>
      ) : stores.length ? (
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-950/40 shadow-xl backdrop-blur">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left font-medium">Store details</th>
                <th className="px-6 py-4 text-left font-medium">Floor</th>
                <th className="px-6 py-4 text-left font-medium">Unit</th>
                <th className="px-6 py-4 text-left font-medium">Zone assignment</th>
                <th className="px-6 py-4 text-left font-medium">Retail Type</th>
                <th className="px-6 py-4 text-left font-medium">Store Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 bg-zinc-950/20 text-zinc-300">
              {stores.map((store) => (
                <tr key={store.id} className="hover:bg-zinc-900/10">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white">{store.name}</div>
                    <div className="text-xs text-zinc-500 font-light mt-0.5">
                      {store.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{store.floor}</td>
                  <td className="px-6 py-4 font-mono text-xs">{store.unit_number || '—'}</td>
                  <td className="px-6 py-4 text-xs">
                    {store.unit_number === '' ? (
                      <span className="text-zinc-500 italic">Imported Catalog</span>
                    ) : (
                      <select
                        value={store.zone?.id ?? ''}
                        onChange={(e) => handleUpdateZone(store.id, e.target.value)}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-zinc-300 outline-none focus:border-indigo-500 cursor-pointer text-xs"
                      >
                        <option value="">No Zone</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} (L{z.floor})
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {store.category ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 font-medium text-emerald-400">
                        {store.category.name}
                      </span>
                    ) : (
                      <span className="text-zinc-500">General</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">
                    {store.admin_email ? (
                      <span className="text-indigo-400 font-medium">{store.admin_email}</span>
                    ) : (
                      <span className="text-zinc-600">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-zinc-950/20 p-8 text-center text-zinc-500 font-light">
          No registered stores found. Configure a zone and onboard a new tenant above.
        </div>
      )}
    </div>
  );
}
