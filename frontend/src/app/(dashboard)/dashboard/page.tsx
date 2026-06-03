"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [apiStatus, setApiStatus] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    async function checkBackend() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await apiFetch("/api/v1/users/me", token);
        setApiStatus(res.ok ? "ok" : "error");
      } catch {
        setApiStatus("error");
      }
    }
    checkBackend();
  }, [getToken]);

  const stats = [
    { label: "Active stores", value: "—" },
    { label: "Products tracked", value: "—" },
    { label: "Zones monitored", value: "—" },
    { label: "Avg. congestion", value: "—" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Here&apos;s your retail intelligence overview.
        </p>
      </div>

      {/* API connection badge */}
      <div className="mb-6 flex items-center gap-2 text-xs">
        <span
          className={`w-2 h-2 rounded-full ${
            apiStatus === "ok"
              ? "bg-emerald-400"
              : apiStatus === "error"
              ? "bg-red-400"
              : "bg-zinc-600"
          }`}
        />
        <span className="text-zinc-500">
          {apiStatus === "ok"
            ? "Connected to backend"
            : apiStatus === "error"
            ? "Backend unreachable — check API"
            : "Checking backend…"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
          >
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
        <p className="text-zinc-300 font-medium mb-1">No data yet</p>
        <p className="text-zinc-600 text-sm max-w-sm">
          Connect your first store to start seeing real-time analytics and
          congestion data.
        </p>
      </div>
    </div>
  );
}
