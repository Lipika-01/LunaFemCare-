"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminGetUsers, UserProfile } from "@/lib/api";
import Footer from "@/components/Footer";
import SharedNav from "@/components/SharedNav";
import { motion } from "framer-motion";

type SortKey = "name" | "age" | "role" | "created_at";

function inferPhase(lastPeriodStr: string, periodEndDateStr: string, cycleLength: number): string {
  if (!lastPeriodStr) return "—";
  const start = new Date(lastPeriodStr).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0); const todayTime = today.getTime();
  
  let isMenstruating = false;
  let dayOfCycle = -1;
  if (start <= todayTime) {
    dayOfCycle = Math.floor((todayTime - start) / 86400000) % cycleLength;
  }

  if (periodEndDateStr) {
    const end = new Date(periodEndDateStr).getTime();
    if (todayTime >= start && todayTime <= end) {
      isMenstruating = true;
    } else if (todayTime > end) {
      isMenstruating = false;
    }
  } else {
    if (dayOfCycle >= 0 && dayOfCycle <= 5) isMenstruating = true;
  }
  
  if (dayOfCycle < 0) return "🌱 Follicular";
  if (isMenstruating) return "🩸 Menstrual";
  if (dayOfCycle <= 13) return "🌱 Follicular";
  if (dayOfCycle <= 16) return "🌸 Ovulatory";
  return "🍂 Luteal";
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("luna_user");
    if (!raw) { router.push("/"); return; }
    const u = JSON.parse(raw);
    if (u.role !== "admin") { router.push("/dashboard"); return; }

    (async () => {
      try {
        const res = await adminGetUsers();
        setUsers(res.users);
      } catch (err: any) {
        setError(err.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingId(userId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "X-Admin-Passkey": "admin" },
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setShowDeleteConfirm(null);
      } else {
        const d = await res.json();
        alert(d.detail || "Failed to delete user.");
      }
    } catch {
      alert("Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users
    .filter(u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.passkey?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = String((a as any)[sortKey] || "");
      const bVal = String((b as any)[sortKey] || "");
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : " ⇅";

  return (
    <main className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
      {/* Background bubbles are handled globally in RootLayout */}

      <div className="z-10 relative">
        <SharedNav role="admin" />
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 w-full z-10 relative">

        {/* Header */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="self-start flex items-center gap-1.5 text-sm text-earth-500 hover:text-earth-800 bg-white border border-earth-200 px-3 py-1.5 rounded-full transition-colors shadow-sm"
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-display font-semibold text-earth-900">Admin Dashboard</h1>
            <p className="text-earth-500 text-sm mt-1">Complete user management & health analytics</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: users.length, icon: "👥", color: "text-primary-600" },
            { label: "Pregnant Users", value: users.filter(u => u.is_pregnant).length, icon: "🤰", color: "text-purple-600" },
            { label: "With PCOS", value: users.filter(u => u.health_flags?.pcos).length, icon: "🔵", color: "text-blue-600" },
            { label: "Married", value: users.filter(u => (u as any).health_flags?.marital_status === "Married" || u.marital_status === "Married").length, icon: "💍", color: "text-rose-600" },
          ].map(stat => (
            <div key={stat.label} className="bg-white/40 dark:bg-earth-800/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-sm rounded-3xl p-5 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className={`text-3xl font-display font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-earth-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400">🔍</span>
          <input
            id="admin-search"
            type="text"
            placeholder="Search by name or passkey..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-earth-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 text-earth-800 placeholder:text-earth-400"
          />
        </div>

        {/* Full User Data Table */}
        <div className="bg-white/40 dark:bg-earth-800/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-xl rounded-3xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-3">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
              <span className="text-earth-500 text-sm">Loading users...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <p className="text-3xl mb-2">⚠️</p>
              <p>{error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-earth-50/80 border-b border-earth-100">
                    {[
                      { key: "created_at" as SortKey, label: "Registered At" },
                      { key: "name" as SortKey, label: "User" },
                      { key: "age" as SortKey, label: "Age" },
                      { key: "role" as SortKey, label: "Role" },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-4 py-3.5 text-left font-semibold text-earth-700 cursor-pointer hover:text-primary-600 select-none whitespace-nowrap"
                      >
                        {col.label}{sortIcon(col.key)}
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-left font-semibold text-earth-700 whitespace-nowrap">Passkey</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-earth-700 whitespace-nowrap">Height/Weight</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-earth-700 whitespace-nowrap">Marital</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-earth-700 whitespace-nowrap">Children</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-earth-700 whitespace-nowrap">Pregnancy</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-earth-700 whitespace-nowrap">Cycle Phase</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-earth-700 whitespace-nowrap">Last Period</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-earth-700 whitespace-nowrap">Health Flags</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-earth-700 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-5 py-10 text-center text-earth-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((user, i) => {
                      const flags = (user.health_flags || {}) as Record<string, any>;
                      const conditions = ["pcos", "thyroid", "endometriosis", "anemia"].filter(c => flags[c]);
                      const cycleLen = Number((user.cycle_metadata as any)?.cycle_length) || 28;
                      const lastPeriod = String((user.cycle_metadata as any)?.last_period || "");
                      const periodEnd = String((user.cycle_metadata as any)?.period_end_date || "");
                      const maritalStatus = flags.marital_status || user.marital_status || "—";
                      const childrenCount = flags.children_count ?? user.children_count ?? 0;
                      const childrenDetails: any[] = flags.children_details || user.children_details || [];

                      const createdAt = (user as any).created_at
                        ? new Date((user as any).created_at).toLocaleString("en-IN", {
                            year: "numeric", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })
                        : "—";

                      let phase = "—";
                      if (user.is_pregnant) {
                        phase = "🤰 Pregnancy";
                      } else if (lastPeriod) {
                        phase = inferPhase(lastPeriod, periodEnd, cycleLen);
                      }

                      return (
                        <React.Fragment key={user.id || i}>
                          <tr
                            className="border-b border-earth-50 hover:bg-rose-50/20 transition-colors"
                          >
                            {/* Timestamp */}
                            <td className="px-4 py-3.5 text-[11px] text-earth-500 whitespace-nowrap">{createdAt}</td>

                            {/* User */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700 shrink-0">
                                  {(user.name || "?").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-earth-900">{user.name || "—"}</p>
                                </div>
                              </div>
                            </td>

                            {/* Age */}
                            <td className="px-4 py-3.5 text-earth-700 font-medium">{user.age ? `${user.age} yrs` : "—"}</td>

                            {/* Role */}
                            <td className="px-4 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold ${
                                user.role === "admin"
                                  ? "bg-primary-100 text-primary-700"
                                  : "bg-earth-100 text-earth-700"
                              }`}>
                                {user.role || "user"}
                              </span>
                            </td>

                            {/* Passkey */}
                            <td className="px-4 py-3.5">
                              <code className="text-[11px] font-mono bg-primary-50 text-primary-700 px-2 py-0.5 rounded border border-primary-100">{user.passkey}</code>
                            </td>

                            {/* Height / Weight */}
                            <td className="px-4 py-3.5 text-earth-600 text-xs">
                              {user.height ? `${user.height}cm` : "—"} / {user.weight ? `${user.weight}kg` : "—"}
                            </td>

                            {/* Marital */}
                            <td className="px-4 py-3.5">
                              <span className="bg-earth-100 text-earth-700 text-[10px] px-2 py-0.5 rounded-full">{maritalStatus}</span>
                            </td>

                            {/* Children */}
                            <td className="px-4 py-3.5 text-earth-600 text-xs">
                              {childrenCount > 0 ? (
                                <div>
                                  <span className="font-bold text-earth-800">{childrenCount}</span>
                                  {childrenDetails.length > 0 && (
                                    <div className="mt-0.5 flex flex-wrap gap-1">
                                      {childrenDetails.map((c: any, ci: number) => (
                                        <span key={ci} className="bg-yellow-50 text-yellow-700 text-[9px] px-1.5 py-0.5 rounded">
                                          {c.gender === "Boy" ? "👦" : "👧"}{c.age}yr
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : <span className="text-earth-300">0</span>}
                            </td>

                            {/* Pregnancy */}
                            <td className="px-4 py-3.5">
                              {user.is_pregnant ? (
                                <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full">🤰 Pregnant</span>
                              ) : user.pregnancy_planning ? (
                                <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-100">🌸 {user.pregnancy_planning}</span>
                              ) : (
                                <span className="text-earth-300 text-xs">—</span>
                              )}
                            </td>

                            {/* Cycle Phase */}
                            <td className="px-4 py-3.5 text-earth-800 font-medium text-xs whitespace-nowrap">{phase}</td>

                            {/* Last Period */}
                            <td className="px-4 py-3.5 text-earth-600 text-xs whitespace-nowrap">
                              {lastPeriod ? (
                                <div>
                                  <p>Start: {lastPeriod}</p>
                                  {periodEnd && <p className="text-earth-400">End: {periodEnd}</p>}
                                  <p className="text-earth-400">Len: {cycleLen}d</p>
                                </div>
                              ) : "—"}
                            </td>

                            {/* Health Flags */}
                            <td className="px-4 py-3.5">
                              {conditions.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {conditions.map(c => (
                                    <span key={c} className="bg-rose-50 border border-rose-100 text-rose-700 text-[9px] px-1.5 py-0.5 rounded-full capitalize">{c}</span>
                                  ))}
                                </div>
                              ) : <span className="text-earth-300 text-xs">None</span>}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5">
                              <button
                                onClick={() => setShowDeleteConfirm(user.id)}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2.5 py-1 rounded-lg transition-colors font-medium"
                              >
                                🗑 Delete
                              </button>
                            </td>
                          </tr>

                          {/* Delete Confirmation */}
                          {showDeleteConfirm === user.id && (
                            <tr className="bg-red-50/50">
                              <td colSpan={14} className="px-5 py-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <span className="text-sm text-red-700 font-medium">⚠️ Delete <strong>{user.name}</strong>? This cannot be undone.</span>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={deletingId === user.id}
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-1.5 rounded-lg font-medium transition-colors"
                                  >
                                    {deletingId === user.id ? "Deleting..." : "Confirm Delete"}
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="bg-white border border-earth-200 text-earth-700 text-xs px-4 py-1.5 rounded-lg font-medium transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-earth-400 text-center">
          🔒 Admin access only. All user data is encrypted and stored securely in Supabase.
        </p>
      </div>
      <Footer />
    </main>
  );
}
