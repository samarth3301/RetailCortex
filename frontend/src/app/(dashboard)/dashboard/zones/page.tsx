'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type ZoneListItem = {
  id: string;
  name: string;
  floor: number;
  capacity: number;
};

export default function ZonesPage() {
  const { getToken } = useAuth();
  const [zones, setZones] = useState<ZoneListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading zones...');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [floor, setFloor] = useState(0);
  const [capacity, setCapacity] = useState(100);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadZones() {
    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores/zones', token);
      if (!res.ok) {
        setMessage('Could not load zones.');
        return;
      }
      const data = (await res.json()) as ZoneListItem[];
      setZones(data);
      setMessage(
        data.length ? `Showing ${data.length} zones.` : 'No layout zones have been added yet.',
      );
    } catch {
      setMessage('Could not load zones.');
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadZones();
      setLoading(false);
    }
    void init();
  }, [getToken]);

  async function handleAddZone(e: React.FormEvent) {
    e.preventDefault();
    if (!name || capacity <= 0) {
      setFormError('Please enter a valid zone name and capacity.');
      return;
    }

    setFormError('');
    setFormBusy(true);

    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores/zones', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          floor: Number(floor),
          capacity: Number(capacity),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setFormError(errorData?.detail ?? 'Failed to add zone.');
        setFormBusy(false);
        return;
      }

      // Success
      setName('');
      setFloor(0);
      setCapacity(100);
      setFormBusy(false);
      setShowAddForm(false);

      // Reload Zones
      setLoading(true);
      await loadZones();
      setLoading(false);
    } catch {
      setFormError('Connection error. Failed to add zone.');
      setFormBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">
            Layout Configurations
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white font-serif">Manage Zones</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 font-light">
            Configure geographic zones, floor sections, and pedestrian capacity limits.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex w-fit items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            {showAddForm ? 'Close form' : 'Add Layout Zone'}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
          >
            Back to overview
          </Link>
        </div>
      </div>

      {/* Add Zone Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddZone}
          className="rounded-3xl border border-white/5 bg-zinc-950/40 p-6 space-y-4 max-w-md"
        >
          <h2 className="text-lg font-semibold text-white font-serif border-b border-zinc-900 pb-2">
            Zone Parameters
          </h2>

          {formError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-200">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Zone Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. North Wing Atrium"
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <label className="text-xs text-zinc-400">Safe Capacity (Max Occupancy)</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={formBusy}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {formBusy ? 'Adding Zone...' : 'Register Zone'}
          </button>
        </form>
      )}

      {/* Message Info Box */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-900/30 p-4 text-xs text-zinc-400 font-mono">
        {message}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-zinc-950/40 p-8 text-zinc-500 font-mono text-xs">
          Loading physical zones...
        </div>
      ) : zones.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="rounded-2xl border border-white/5 bg-zinc-950/40 p-6 space-y-4"
            >
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                  Level {zone.floor}
                </span>
                <h3 className="text-xl font-normal text-white font-serif mt-1">{zone.name}</h3>
              </div>
              <div className="flex justify-between items-center border-t border-zinc-900 pt-3">
                <span className="text-xs text-zinc-400">Max occupancy limit</span>
                <span className="text-sm font-semibold font-mono text-indigo-400">
                  {zone.capacity} shoppers
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-zinc-950/20 p-8 text-center text-zinc-500 font-light">
          No geographic layout zones configured yet.
        </div>
      )}
    </div>
  );
}
