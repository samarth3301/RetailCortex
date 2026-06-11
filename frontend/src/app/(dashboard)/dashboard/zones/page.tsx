'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Modal from '@/components/modal';

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
  const [message, setMessage] = useState('Loading zones…');
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [floor, setFloor] = useState(0);
  const [capacity, setCapacity] = useState(100);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  async function loadZones() {
    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores/zones', token);
      if (!res.ok) { setMessage('Could not load zones.'); return; }
      const data = (await res.json()) as ZoneListItem[];
      setZones(data);
      setMessage(data.length ? `Showing ${data.length} zone${data.length !== 1 ? 's' : ''}.` : 'No zones configured yet.');
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

  function closeModal() {
    setModalOpen(false);
    setName(''); setFloor(0); setCapacity(100); setFormError('');
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || capacity <= 0) { setFormError('Enter a valid zone name and capacity.'); return; }
    setFormError(''); setFormBusy(true);
    try {
      const token = await getToken();
      const res = await apiFetch('/api/v1/stores/zones', token, {
        method: 'POST',
        body: JSON.stringify({ name, floor: Number(floor), capacity: Number(capacity) }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setFormError(d?.detail ?? 'Failed to add zone.');
        setFormBusy(false);
        return;
      }
      setFormBusy(false);
      closeModal();
      setLoading(true); await loadZones(); setLoading(false);
    } catch {
      setFormError('Connection error.');
      setFormBusy(false);
    }
  }

  const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0);
  const floorCount = [...new Set(zones.map(z => z.floor))].length;
  const avgCapacity = zones.length ? Math.round(totalCapacity / zones.length) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8 py-6 animate-entrance">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-400">Layout Configuration</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white tracking-tight sm:text-4xl font-serif">Manage Zones</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 font-light leading-relaxed">
            Define floor sections, set pedestrian capacity limits, and map physical mall layout zones.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(91,77,255,0.2)] hover:shadow-[0_0_25px_rgba(91,77,255,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add New Zone
        </button>
      </div>

      {/* KPI Strip */}
      {!loading && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Zones', value: zones.length, desc: 'registered', color: 'indigo', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg> },
            { label: 'Total Capacity', value: totalCapacity.toLocaleString(), desc: 'max pax', color: 'emerald', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg> },
            { label: 'Floor Levels', value: floorCount, desc: 'in layout', color: 'amber', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg> },
            { label: 'Avg Capacity', value: avgCapacity.toLocaleString(), desc: 'per zone', color: 'purple', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg> },
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
          <span>Synchronizing zone records…</span>
        </div>
      ) : zones.length ? (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/30 shadow-xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-900 text-sm">
              <thead className="bg-zinc-950/60 text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4 text-left">Zone Name</th>
                  <th className="px-6 py-4 text-left">Floor</th>
                  <th className="px-6 py-4 text-left">Max Capacity</th>
                  <th className="px-6 py-4 text-left">Zone ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/30 bg-zinc-950/10 text-zinc-300">
                {zones.map(zone => (
                  <tr key={zone.id} className="hover:bg-white/[0.02] hover:scale-[1.002] transition-all duration-300">
                    <td className="px-6 py-4 font-semibold text-white">{zone.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-mono font-medium text-zinc-400 border border-zinc-800">L{zone.floor}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">{zone.capacity.toLocaleString()} pax</td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-600">{zone.id.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-zinc-950/20 p-12 text-center text-zinc-500 font-light flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
          </svg>
          <span className="text-sm">No zones configured. Add a zone to start mapping your mall layout.</span>
          <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all duration-300">
            Add First Zone
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={closeModal} title="Register New Zone" subtitle="Provide floor location, zone name, and pedestrian capacity.">
        <form onSubmit={handleAdd} className="space-y-5">
          {formError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {formError}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Zone Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. North Wing Atrium"
              className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Floor Level</label>
              <input type="number" value={floor} onChange={e => setFloor(Number(e.target.value))}
                className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Capacity (pax)</label>
              <input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))}
                className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-zinc-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all duration-300" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={closeModal}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 hover:text-white transition-all duration-300">
              Cancel
            </button>
            <button type="submit" disabled={formBusy}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(91,77,255,0.2)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
              {formBusy ? 'Registering…' : 'Register Zone'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
