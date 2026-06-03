import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">RC</span>
          </div>
          <span className="font-semibold text-white tracking-tight">RetailCortex</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-md transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
          Retail intelligence platform
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight max-w-3xl leading-tight mb-6">
          Smarter stores.{" "}
          <span className="text-indigo-400">Sharper decisions.</span>
        </h1>

        <p className="text-zinc-400 text-lg max-w-xl leading-relaxed mb-10">
          RetailCortex gives you real-time visibility into store congestion,
          product performance, and customer flow — all in one dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/sign-up"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Start for free
          </Link>
          <Link
            href="/sign-in"
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Sign in to dashboard
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-8 pb-24 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "◈",
              title: "Congestion analytics",
              desc: "Track foot traffic and hot-spots across every zone in real time.",
            },
            {
              icon: "◉",
              title: "Product intelligence",
              desc: "Monitor stock movement, shelf performance, and promotion ROI.",
            },
            {
              icon: "◎",
              title: "Store operations",
              desc: "Manage facilities, zones, and staff allocation from a single view.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
            >
              <span className="text-indigo-400 text-xl">{f.icon}</span>
              <h3 className="text-white font-semibold mt-3 mb-1">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-8 py-5 text-center text-zinc-600 text-xs">
        © {new Date().getFullYear()} RetailCortex · Built by Yellow Labs
      </footer>
    </main>
  );
}
