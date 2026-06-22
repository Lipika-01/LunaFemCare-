"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import SharedNav from "@/components/SharedNav";
import Footer from "@/components/Footer";
import { getFoodDatabase, UserProfile } from "@/lib/api";
import { motion } from "framer-motion";

type SortKey = string;

export default function NutritionDatabasePage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("food_name");
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 50;

  useEffect(() => {
    // Optionally restrict to authenticated users
    const raw = localStorage.getItem("luna_user");
    if (!raw) {
      router.push("/");
      return;
    }

    getFoodDatabase()
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        setError(err.message || "Failed to load nutrition database.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filtered = data
    .filter((item) =>
      item.food_name?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal || "");
      const bStr = String(bVal || "");
      return sortAsc ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : " ⇅";

  return (
    <main className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
      {/* Background bubbles are handled globally in RootLayout */}

      <div className="z-10 relative">
        <SharedNav />
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 w-full z-10 relative">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.back()}
            className="self-start flex items-center gap-1.5 text-sm text-earth-500 hover:text-earth-800 bg-white border border-earth-200 px-3 py-1.5 rounded-full transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-3xl font-display font-semibold text-earth-900">Nutrition Database</h1>
            <p className="text-earth-500 text-sm mt-1">Explore our comprehensive food database for women's health</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-earth-400">🔍</span>
          <input
            id="nutrition-search"
            type="text"
            placeholder="Search for food..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-earth-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 text-earth-800 placeholder:text-earth-400"
          />
        </div>

        {/* Data Table */}
        <div className="bg-white/40 dark:bg-earth-800/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-xl rounded-3xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-3">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
              <span className="text-earth-500 text-sm">Loading nutrition database...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <p className="text-3xl mb-2">⚠️</p>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1200px]">
                  <thead>
                    <tr className="bg-earth-50/80 border-b border-earth-100">
                      {[
                        { key: "food_name", label: "Food Name" },
                        { key: "category", label: "Category" },
                        { key: "Energy_kcal_per100g", label: "Energy (kcal)" },
                        { key: "Protein_g_per100g", label: "Protein (g)" },
                        { key: "Fat_g_per100g", label: "Fat (g)" },
                        { key: "Carbs_g_per100g", label: "Carbs (g)" },
                        { key: "Fiber_g_per100g", label: "Fiber (g)" },
                        { key: "Iron_mg_per100g", label: "Iron (mg)" },
                        { key: "Calcium_mg_per100g", label: "Calcium (mg)" },
                        { key: "Vit_A_mcg_per100g", label: "Vit A (mcg)" },
                        { key: "Sodium_mg_per100g", label: "Sodium (mg)" },
                      ].map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="px-4 py-3.5 text-left font-semibold text-earth-700 cursor-pointer hover:text-primary-600 select-none whitespace-nowrap"
                        >
                          {col.label}
                          {sortIcon(col.key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-earth-50 bg-white">
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-10 text-center text-earth-400">
                          No food items found matching "{search}"
                        </td>
                      </tr>
                    ) : (
                      paginated.map((item, i) => (
                        <tr key={i} className="hover:bg-rose-50/20 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-earth-900 capitalize">
                            {item.food_name || "—"}
                          </td>
                          <td className="px-4 py-3.5 text-earth-600 text-xs">
                            <span className="bg-earth-100 px-2 py-0.5 rounded-full capitalize">
                              {item.category || "General"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-earth-800">{item.Energy_kcal_per100g}</td>
                          <td className="px-4 py-3.5 text-earth-800">{item.Protein_g_per100g}</td>
                          <td className="px-4 py-3.5 text-earth-800">{item.Fat_g_per100g}</td>
                          <td className="px-4 py-3.5 text-earth-800">{item.Carbs_g_per100g}</td>
                          <td className="px-4 py-3.5 text-earth-800">{item.Fiber_g_per100g}</td>
                          <td className="px-4 py-3.5 text-earth-800">{item.Iron_mg_per100g}</td>
                          <td className="px-4 py-3.5 text-earth-800">{item.Calcium_mg_per100g}</td>
                          <td className="px-4 py-3.5 text-earth-800">{item.Vit_A_mcg_per100g}</td>
                          <td className="px-4 py-3.5 text-earth-800">{item.Sodium_mg_per100g}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-earth-50 border-t border-earth-100">
                  <span className="text-sm text-earth-500">
                    Showing {Math.min((page - 1) * rowsPerPage + 1, filtered.length)} to{" "}
                    {Math.min(page * rowsPerPage, filtered.length)} of {filtered.length} entries
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 bg-white border border-earth-200 rounded-lg text-sm text-earth-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-earth-700 font-medium">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 bg-white border border-earth-200 rounded-lg text-sm text-earth-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <p className="text-xs text-earth-400 text-center">
          Note: All values are per 100g portion.
        </p>
      </div>
      <Footer />
    </main>
  );
}
