import Link from 'next/link';
import { HomeHeaderUser } from '@/components/home-header-user';

export default function LandingPage() {

  return (
    <main className="flex min-h-screen flex-col bg-[#0d0d0d] font-sans text-zinc-100 antialiased selection:bg-white/10 selection:text-white">
      {/* Header Navigation */}
      <header
        id="main-header"
        className="absolute top-0 z-50 w-full border-b border-white/5 bg-transparent"
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <span className="text-[10px] font-bold text-white tracking-widest">RC</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white font-sans">
              RetailCortex
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-xs tracking-wider uppercase font-semibold text-zinc-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#developers" className="hover:text-white transition-colors">
              Developers
            </a>
            <a href="#metrics" className="hover:text-white transition-colors">
              Metrics
            </a>
          </div>

          {/* CTA / Auth Actions */}
          <div className="flex items-center gap-4">
            <HomeHeaderUser />
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 text-center bg-[#0d0d0d]">
        {/* Full Bleed Oil Painting Background */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero_landscape.png')" }}
        />

        {/* Uniform Dark Overlay for Text Legibility */}
        <div className="absolute inset-0 z-10 bg-black/45 pointer-events-none" />

        {/* Bottom Fade to transition into the next black section */}
        <div className="absolute inset-x-0 bottom-0 z-10 h-36 bg-gradient-to-t from-[#0d0d0d] to-transparent pointer-events-none" />

        <div className="relative z-20 mx-auto max-w-4xl px-4 flex flex-col items-center">
          {/* Subtitle */}
          <p className="text-xs sm:text-sm tracking-[0.25em] uppercase text-zinc-300/80 font-sans font-light">
            Next-gen mall operations brain from Yellow Labs
          </p>

          {/* Headline */}
          <h1 className="mt-8 text-4xl sm:text-6xl font-normal tracking-tight text-white font-serif leading-[1.12]">
            Malls change constantly.
            <br />
            <span className="italic font-light opacity-90">
              Your operations brain doesn&apos;t.
            </span>
          </h1>

          {/* Paragraph / Product Description */}
          <p className="mt-8 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-300 font-sans font-light">
            An AI-powered mall operations brain that helps shoppers find products faster while
            helping mall operators predict congestion, optimize promotions, and reduce facility
            downtime in real time.
          </p>

          {/* Button pills */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard/store"
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-zinc-950 shadow-xl transition-all hover:bg-zinc-200 active:scale-[0.98]"
            >
              Open CSV uploader
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md px-8 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              View dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Core Modules Grid */}
      <section id="features" className="py-24 border-b border-zinc-800 bg-[#0d0d0d]">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-normal tracking-tight text-white sm:text-4xl font-serif">
              The Complete Mall Intelligence Stack
            </h2>
            <p className="mt-4 text-sm text-zinc-400 font-light leading-relaxed">
              Expose real-time data across shoppers, store managers, and property operators from a
              single backend.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Card 1: Vector Search */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-850 bg-zinc-950/20 p-8 shadow-sm transition-all hover:border-zinc-700/60">
              <div className="mb-8">
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
                    Shopper Experience
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-normal text-white font-serif">
                  Shopper Vector Search & Discovery
                </h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-zinc-400">
                  Allow shoppers to execute semantic queries across your directory. Search handles
                  spell checks, multi-category tags, and proximity routing.
                </p>
              </div>

              {/* Simulated Shopper Search Mockup */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 font-mono text-[11px] text-zinc-300">
                <div className="flex items-center gap-2 rounded bg-zinc-900/60 px-3 py-2 text-zinc-500">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span>Search for: &quot;comfy running shoes with red details&quot;</span>
                </div>
                <div className="mt-3.5 space-y-2">
                  <div className="flex items-center justify-between rounded border border-zinc-900/60 bg-zinc-900/20 px-3 py-2">
                    <span className="text-white">Nike Air Max</span>
                    <span className="text-zinc-500 text-[10px]">Level 2 • 20m</span>
                  </div>
                  <div className="flex items-center justify-between rounded border border-zinc-900/60 bg-zinc-900/20 px-3 py-2">
                    <span className="text-white">Adidas Ultraboost</span>
                    <span className="text-zinc-500 text-[10px]">Level 1 • 45m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Catalog Upload */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-850 bg-zinc-950/20 p-8 shadow-sm transition-all hover:border-zinc-700/60">
              <div className="mb-8">
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
                    Tenant Management
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-normal text-white font-serif">
                  CSV Catalog Onboarding & Validator
                </h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-zinc-400">
                  Allow tenant retailers to submit bulk CSV catalogs. Automate verification of
                  product formats, invalid price points, and duplicate SKUs instantly.
                </p>
              </div>

              {/* Simulated CSV validator Mockup */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 font-mono text-[11px] text-zinc-300">
                <div className="flex items-center justify-between border-b border-zinc-900/80 pb-2 mb-3">
                  <span className="text-zinc-500">catalog_upload.csv</span>
                  <span className="text-emerald-400 text-[10px] font-bold">VALIDATED</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-400 text-[10px]">
                    <span className="text-emerald-400">✔</span> Row format verified.
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400 text-[10px]">
                    <span className="text-emerald-400">✔</span> Price numeric fields parsed.
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-emerald-500 h-full w-[100%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Congestion Analytics */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-850 bg-zinc-950/20 p-8 shadow-sm transition-all hover:border-zinc-700/60">
              <div className="mb-8">
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
                    Spatial Intelligence
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-normal text-white font-serif">
                  Congestion & Foot Traffic Analytics
                </h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-zinc-400">
                  Leverage camera sensors and Wi-Fi beacons to map heat flow. Target layout upgrades
                  and security details based on real-time pedestrian volume.
                </p>
              </div>

              {/* Simulated Congestion Mockup */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 font-mono text-[11px] text-zinc-300">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                    CROWD STATUS
                  </span>
                  <span className="text-[10px] text-zinc-500 border border-zinc-850 px-2 py-0.5 rounded">
                    Live
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] border-b border-zinc-900/60 py-1">
                    <span className="text-zinc-500">North Entrance Plaza</span>
                    <span className="text-red-400 font-semibold">HIGH DENSITY (90%)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] border-b border-zinc-900/60 py-1">
                    <span className="text-zinc-500">Central Atrium Escalator</span>
                    <span className="text-amber-400 font-semibold">MODERATE (65%)</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] py-1">
                    <span className="text-zinc-500">Food Court Sector C</span>
                    <span className="text-emerald-400 font-semibold">NORMAL (25%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Predictive Maintenance */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-850 bg-zinc-950/20 p-8 shadow-sm transition-all hover:border-zinc-700/60">
              <div className="mb-8">
                <div className="flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                  </svg>
                  <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
                    Facilities
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-normal text-white font-serif">
                  Predictive Infrastructure & Maintenance
                </h3>
                <p className="mt-2 text-sm font-light leading-relaxed text-zinc-400">
                  Track machine diagnostics in elevator belts, escalators, and building air quality
                  systems. Dispatch warning orders when equipment shows thermal anomalies.
                </p>
              </div>

              {/* Simulated Infrastructure Dashboard Mockup */}
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 font-mono text-[11px] text-zinc-300">
                <div className="mb-2 flex items-center justify-between text-[9px] text-zinc-500 tracking-wider">
                  <span>SENSOR_ID</span>
                  <span>STATUS</span>
                  <span>METRIC</span>
                </div>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center rounded bg-zinc-900/30 px-2.5 py-1">
                    <span className="text-white">Escalator_WingA</span>
                    <span className="text-emerald-400 font-semibold">NOMINAL</span>
                    <span className="text-zinc-500">0.02 mm</span>
                  </div>
                  <div className="flex justify-between items-center rounded bg-zinc-900/30 px-2.5 py-1">
                    <span className="text-white">Lift_Central_Plaza</span>
                    <span className="text-amber-400 font-semibold">SERVICE_DUE</span>
                    <span className="text-amber-500">1.25 mm</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Resource Integrations */}
      <section id="developers" className="py-24 border-b border-zinc-800 bg-[#0d0d0d]">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-normal tracking-tight text-white sm:text-4xl font-serif">
              Built for Enterprise Integration
            </h2>
            <p className="mt-4 text-sm text-zinc-400 font-light leading-relaxed">
              Power your smart-displays, customer mobile apps, and administrative consoles using our
              SDKs and REST APIs.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Adapters Card */}
            <div className="rounded-2xl border border-zinc-850 bg-zinc-950/20 p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-normal text-white font-serif">SDKs & Adapters</h4>
                <p className="mt-2 text-xs text-zinc-400 font-light leading-relaxed">
                  Integrate mall directories in under 10 lines of code with pre-built adapters for
                  React, iOS (Swift), Android (Kotlin), and Web SDKs.
                </p>
              </div>

              {/* Adapter Tech Grid */}
              <div className="mt-8 grid grid-cols-3 gap-2">
                {['Next.js', 'React', 'iOS', 'Android', 'Node', 'Python'].map((tech) => (
                  <div
                    key={tech}
                    className="flex h-9 items-center justify-center rounded border border-zinc-800 bg-zinc-950/40 text-[10px] font-mono text-zinc-400"
                  >
                    {tech}
                  </div>
                ))}
              </div>
            </div>

            {/* Sync API Card */}
            <div className="rounded-2xl border border-zinc-850 bg-zinc-950/20 p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-normal text-white font-serif">Tenant Inventory API</h4>
                <p className="mt-2 text-xs text-zinc-400 font-light leading-relaxed">
                  Flagship tenants can configure WebHooks or run automated scripts to sync their
                  catalog updates directly with the mall database.
                </p>
              </div>

              {/* JSON Code Snippet Mockup */}
              <div className="mt-8 rounded border border-zinc-800 bg-[#0d0d0d] p-3 text-[9px] font-mono text-zinc-400 overflow-x-auto">
                <span className="text-indigo-400">POST</span> /api/v1/products/import
                <div className="mt-0.5 text-zinc-600">{'{'}</div>
                <div className="pl-3">
                  <span className="text-emerald-400">&quot;store&quot;</span>:{' '}
                  <span className="text-amber-400">&ldquo;Shoe Outlet&quot;</span>,
                </div>
                <div className="pl-3">
                  <span className="text-emerald-400">&quot;csv&quot;</span>:{' '}
                  <span className="text-amber-400">&quot;product_id...&quot;</span>
                </div>
                <div className="text-zinc-600">{'}'}</div>
              </div>
            </div>

            {/* Event Streams Webhooks Card */}
            <div className="rounded-2xl border border-zinc-850 bg-zinc-950/20 p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-normal text-white font-serif">Webhook Events</h4>
                <p className="mt-2 text-xs text-zinc-400 font-light leading-relaxed">
                  Trigger third-party applications or automate notifications to security teams or
                  facility management dashboards.
                </p>
              </div>

              {/* Event Streams Mockup */}
              <div className="mt-8 space-y-1.5 text-[9px] font-mono">
                <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950/40 p-2 text-zinc-400">
                  <span>crowd.congestion_alert</span>
                  <span className="text-red-400 font-semibold">TRIGGERED</span>
                </div>
                <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950/40 p-2 text-zinc-400">
                  <span>facility.escalator_offline</span>
                  <span className="text-amber-400 font-semibold">DISPATCHED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section id="metrics" className="py-24 border-b border-zinc-800 bg-[#0d0d0d]">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-normal tracking-tight text-white sm:text-4xl font-serif">
              Engineered for High-Frequency Spaces
            </h2>
            <p className="mt-4 text-sm text-zinc-400 font-light">
              Expose real-time data across shoppers, store managers, and property operators from a
              single dashboard.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Stat 1 */}
            <div
              className="grid-bg rounded-xl border border-zinc-850 bg-[#0c0c0c] p-8"
              style={
                {
                  '--grid-line-color': 'rgba(255,255,255,0.015)',
                  '--grid-size': '16px',
                } as React.CSSProperties
              }
            >
              <h3 className="text-5xl font-light tracking-tight text-white font-serif">98%</h3>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mt-4">
                Search Completion
              </p>
              <p className="text-xs text-zinc-500 font-light mt-1">
                Successfully routed shoppers straight to relevant product SKUs.
              </p>
            </div>

            {/* Stat 2 */}
            <div
              className="grid-bg rounded-xl border border-zinc-850 bg-[#0c0c0c] p-8"
              style={
                {
                  '--grid-line-color': 'rgba(255,255,255,0.015)',
                  '--grid-size': '16px',
                } as React.CSSProperties
              }
            >
              <h3 className="text-5xl font-light tracking-tight text-white font-serif">15 min</h3>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mt-4">
                Store Onboarding
              </p>
              <p className="text-xs text-zinc-500 font-light mt-1">
                Average catalog validator processing & indexing time.
              </p>
            </div>

            {/* Stat 3 */}
            <div
              className="grid-bg rounded-xl border border-zinc-850 bg-[#0c0c0c] p-8"
              style={
                {
                  '--grid-line-color': 'rgba(255,255,255,0.015)',
                  '--grid-size': '16px',
                } as React.CSSProperties
              }
            >
              <h3 className="text-5xl font-light tracking-tight text-white font-serif">35%</h3>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mt-4">
                Downtime Reduction
              </p>
              <p className="text-xs text-zinc-500 font-light mt-1">
                Preventative repairs scheduled through real-time telemetry.
              </p>
            </div>

            {/* Stat 4 */}
            <div
              className="grid-bg rounded-xl border border-zinc-850 bg-[#0c0c0c] p-8"
              style={
                {
                  '--grid-line-color': 'rgba(255,255,255,0.015)',
                  '--grid-size': '16px',
                } as React.CSSProperties
              }
            >
              <h3 className="text-5xl font-light tracking-tight text-white font-serif">1.8x</h3>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mt-4">
                Promotion CTR
              </p>
              <p className="text-xs text-zinc-500 font-light mt-1">
                Targeted discount codes delivered at optimal layouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-[#0d0d0d] py-16 text-sm text-zinc-500">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Product
              </h4>
              <ul className="mt-4 space-y-2 text-zinc-500 text-xs">
                <li>
                  <a href="#features" className="hover:text-zinc-300">
                    Catalog Validator
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-zinc-300">
                    Semantic Search
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-zinc-300">
                    Congestion Metrics
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-zinc-300">
                    Maintenance Predictor
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Developers
              </h4>
              <ul className="mt-4 space-y-2 text-zinc-500 text-xs">
                <li>
                  <a href="#developers" className="hover:text-zinc-300">
                    REST API Docs
                  </a>
                </li>
                <li>
                  <a href="#developers" className="hover:text-zinc-300">
                    Adapters Overview
                  </a>
                </li>
                <li>
                  <a href="#developers" className="hover:text-zinc-300">
                    Webhooks Portal
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Company
              </h4>
              <ul className="mt-4 space-y-2 text-zinc-500 text-xs">
                <li>
                  <a href="https://yellowlabs.co" className="hover:text-zinc-300">
                    Yellow Labs
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-zinc-300">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-zinc-300">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Legal
              </h4>
              <ul className="mt-4 space-y-2 text-zinc-500 text-xs">
                <li>
                  <a href="#" className="hover:text-zinc-300">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-zinc-300">
                    Terms of Use
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-zinc-300">
                    Security Audit
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-16 border-t border-zinc-900 pt-8 text-center text-xs text-zinc-600">
            © {new Date().getFullYear()} RetailCortex · An Intelligent Mall Operations Platform ·
            Built by Yellow Labs. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
