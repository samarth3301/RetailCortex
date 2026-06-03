import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">RC</span>
            </div>
            <span className="font-semibold text-white tracking-tight">
              RetailCortex
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {[
              { label: "Overview", href: "/dashboard" },
              { label: "Stores", href: "/dashboard/stores" },
              { label: "Products", href: "/dashboard/products" },
              { label: "Analytics", href: "/dashboard/analytics" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-800 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
