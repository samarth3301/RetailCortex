'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Campaign = {
  id: string;
  name: string;
  discountRate: number;
  couponCode: string;
  targetZone: string;
  status: 'active' | 'scheduled' | 'expired';
  clicksCount: number;
};

type ZoneListItem = {
  id: string;
  name: string;
  floor: number;
};

export default function CampaignsPage() {
  const { getToken } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [zones, setZones] = useState<ZoneListItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [discountRate, setDiscountRate] = useState(15);
  const [couponCode, setCouponCode] = useState('');
  const [targetZone, setTargetZone] = useState('');

  // Initial Seed
  useEffect(() => {
    const saved = localStorage.getItem('rc_campaigns');
    if (saved) {
      setCampaigns(JSON.parse(saved));
    } else {
      const defaultCampaigns: Campaign[] = [
        {
          id: 'c1',
          name: 'Summer Athletic Rush',
          discountRate: 20,
          couponCode: 'RUNSUMMER20',
          targetZone: 'North Wing Atrium (L1)',
          status: 'active',
          clicksCount: 142,
        },
        {
          id: 'c2',
          name: 'Flash Weekend Footwear Sale',
          discountRate: 15,
          couponCode: 'SHOEFLASH15',
          targetZone: 'Central Atrium Escalator (L2)',
          status: 'scheduled',
          clicksCount: 0,
        },
      ];
      setCampaigns(defaultCampaigns);
      localStorage.setItem('rc_campaigns', JSON.stringify(defaultCampaigns));
    }
  }, []);

  useEffect(() => {
    async function loadZones() {
      try {
        const token = await getToken();
        const res = await apiFetch('/api/v1/stores/zones', token);
        if (res.ok) {
          const data = (await res.json()) as ZoneListItem[];
          setZones(data);
          if (data.length) setTargetZone(`${data[0].name} (L${data[0].floor})`);
        }
      } catch (e) {
        console.error(e);
      }
    }
    void loadZones();
  }, [getToken]);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !couponCode || !targetZone) return;

    const newCampaign: Campaign = {
      id: `c-${Date.now()}`,
      name,
      discountRate: Number(discountRate),
      couponCode: couponCode.toUpperCase().replace(/\s+/g, ''),
      targetZone,
      status: 'active',
      clicksCount: 0,
    };

    const updated = [newCampaign, ...campaigns];
    setCampaigns(updated);
    localStorage.setItem('rc_campaigns', JSON.stringify(updated));

    // Reset Form
    setName('');
    setDiscountRate(15);
    setCouponCode('');
    setShowAddForm(false);
  };

  const getStatusClass = (status: string) => {
    if (status === 'active')
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (status === 'scheduled')
      return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-400 font-sans">
            Store Operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white font-serif">Store Campaigns</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 font-light">
            Launch and monitor spatial promotional codes pushed dynamically to shoppers in targeted
            mall layout zones.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex w-fit items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            {showAddForm ? 'Close form' : 'Create Campaign'}
          </button>
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
          >
            Back to overview
          </Link>
        </div>
      </div>

      {/* Create Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateCampaign}
          className="rounded-3xl border border-white/5 bg-zinc-950/40 p-6 space-y-4 max-w-md"
        >
          <h2 className="text-lg font-semibold text-white font-serif border-b border-zinc-900 pb-2">
            Campaign Parameters
          </h2>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Campaign Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Back to School Discount"
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Discount Rate (%)</label>
                <input
                  type="number"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Number(e.target.value))}
                  className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Coupon Code</label>
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. SCHOOL15"
                  className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500 font-mono text-xs uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Target Mall Zone</label>
              <select
                value={targetZone}
                onChange={(e) => setTargetZone(e.target.value)}
                className="w-full text-sm rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-indigo-500 cursor-pointer"
              >
                {!zones.length && <option value="">No layout zones found</option>}
                {zones.map((z) => (
                  <option key={z.id} value={`${z.name} (L${z.floor})`}>
                    {z.name} (L{z.floor})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            Activate Campaign
          </button>
        </form>
      )}

      {/* Campaigns list display */}
      <div className="grid gap-6 sm:grid-cols-2">
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-white/5 bg-zinc-950/40 p-6 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusClass(c.status)}`}
                >
                  {c.status}
                </span>
                <span className="text-xs font-semibold text-zinc-500 font-mono">
                  CODE: {c.couponCode}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-normal text-white font-serif">{c.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Offers{' '}
                  <span className="text-emerald-400 font-semibold">{c.discountRate}% off</span> at
                  target space: {c.targetZone}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-900 pt-3.5 flex justify-between items-center text-xs text-zinc-500 mt-4">
              <span>Dynamic push views</span>
              <span className="font-semibold text-white font-mono text-sm">
                {c.clicksCount} clicks
              </span>
            </div>
          </div>
        ))}
        {!campaigns.length && (
          <div className="col-span-2 rounded-3xl border border-white/5 bg-zinc-950/20 p-8 text-center text-zinc-500 font-light">
            No active store promotional campaigns. Create one above to launch dynamically.
          </div>
        )}
      </div>
    </div>
  );
}
