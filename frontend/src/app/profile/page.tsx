"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, addDays, differenceInDays } from "date-fns";
import SharedNav from "@/components/SharedNav";
import Footer from "@/components/Footer";
import { getHistory, markMenstruation, UserProfile } from "@/lib/api";
import { motion } from "framer-motion";

/** Parse a yyyy-MM-dd string as LOCAL date (avoids UTC-offset day-shift bug) */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function predictNextPeriods(lastDateStr: string, cycleLength: number) {
  const lastDate = parseLocalDate(lastDateStr);
  return [
    addDays(lastDate, cycleLength),
    addDays(lastDate, cycleLength * 2),
    addDays(lastDate, cycleLength * 3),
  ];
}

function getCyclePhase(lastPeriodStr: string, periodEndDateStr: string, cycleLength: number) {
  if (!lastPeriodStr) return null;
  const start = parseLocalDate(lastPeriodStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  const startTime = start.getTime();

  let isMenstruating = false;
  let dayOfCycle = -1;
  if (startTime <= todayTime) {
    dayOfCycle = Math.floor((todayTime - startTime) / 86400000) % cycleLength;
  }

  if (periodEndDateStr) {
    const end = parseLocalDate(periodEndDateStr).getTime();
    if (todayTime >= startTime && todayTime <= end) {
      isMenstruating = true;
    } else if (todayTime > end) {
      isMenstruating = false;
    }
  } else {
    if (dayOfCycle >= 0 && dayOfCycle <= 5) isMenstruating = true;
  }

  if (dayOfCycle < 0) return { phase: "Follicular 🌱", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", day: dayOfCycle };
  if (isMenstruating) return { phase: "Menstrual 🩸", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", day: dayOfCycle };
  if (dayOfCycle <= 13) return { phase: "Follicular 🌱", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", day: dayOfCycle };
  if (dayOfCycle <= 16) return { phase: "Ovulatory 🌕", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", day: dayOfCycle };
  return { phase: "Luteal 🍂", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", day: dayOfCycle };
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isToggling, setIsToggling] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [activeSection, setActiveSection] = useState<"calendar" | "profile" | "logs">("profile");

  useEffect(() => {
    const raw = localStorage.getItem("luna_user");
    if (!raw) { router.push("/"); return; }
    const u: UserProfile = JSON.parse(raw);
    setUser(u);

    getHistory(u.id, 90).then(data => {
      setHistory(data);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, [router]);

  const markedMenstruationDates = useMemo(() =>
    history.filter(log => log.symptoms?.is_menstruating === true).map(log => parseLocalDate(log.log_date)),
    [history]
  );

  const markedLogDates = useMemo(() =>
    history.map(log => parseLocalDate(log.log_date)),
    [history]
  );

  const upcomingPredictions = useMemo(() => {
    if (user?.is_pregnant) return [];
    if (!user?.cycle_metadata?.last_period || !user?.cycle_metadata?.cycle_length) return [];
    return predictNextPeriods(
      String(user.cycle_metadata.last_period),
      Number(user.cycle_metadata.cycle_length)
    );
  }, [user]);

  const cyclePhase = useMemo(() => {
    if (user?.is_pregnant) return null;
    if (!user?.cycle_metadata?.last_period || !user?.cycle_metadata?.cycle_length) return null;
    return getCyclePhase(
      String(user.cycle_metadata.last_period),
      String(user.cycle_metadata.period_end_date || ""),
      Number(user.cycle_metadata.cycle_length)
    );
  }, [user]);

  const selectedLog = useMemo(() => {
    const dStr = format(selectedDate, "yyyy-MM-dd");
    return history.find(l => l.log_date === dStr);
  }, [selectedDate, history]);

  const alertWarning = useMemo(() => {
    if (upcomingPredictions.length === 0) return null;
    const diff = differenceInDays(upcomingPredictions[0], new Date());
    if (diff >= 0 && diff <= 2) {
      return `Your cycle is approaching! Expected${diff === 0 ? " today" : ` in ${diff} day(s)`}.`;
    }
    return null;
  }, [upcomingPredictions]);

  const handleToggleMenstruation = async () => {
    if (!user || isToggling) return;
    if (user.is_pregnant) return; // BLOCK for pregnant users
    setIsToggling(true);
    try {
      const dStr = format(selectedDate, "yyyy-MM-dd");
      const isCurrentlyMenstruating = selectedLog?.symptoms?.is_menstruating || false;
      const willBeMenstruating = !isCurrentlyMenstruating;

      const newLog = await markMenstruation(user.id, dStr, willBeMenstruating);

      setHistory(prev => {
        const existIdx = prev.findIndex(l => l.log_date === dStr);
        if (existIdx >= 0) {
          const clone = [...prev];
          clone[existIdx] = newLog.log;
          return clone;
        }
        return [newLog.log, ...prev];
      });

      if (willBeMenstruating) {
        setUser(prev => {
          if (!prev) return prev;
          const currentLast = prev.cycle_metadata?.last_period || "1970-01-01";
          if (dStr >= String(currentLast)) {
            const u = {
              ...prev,
              cycle_metadata: { ...prev.cycle_metadata, last_period: dStr }
            };
            localStorage.setItem("luna_user", JSON.stringify(u));
            return u;
          }
          return prev;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsToggling(false);
    }
  };

  const stats = useMemo(() => {
    const last30 = history.slice(0, 30);
    const totalDays = last30.length;
    const avgScore = totalDays > 0
      ? Math.round(last30.reduce((s, l) => s + (l.nutri_score || 0), 0) / totalDays)
      : 0;
    const menstrDays = last30.filter(l => l.symptoms?.is_menstruating).length;
    const loggedMeals = last30.filter(l => l.food_intake?.length > 0).length;
    return { totalDays, avgScore, menstrDays, loggedMeals };
  }, [history]);

  if (!user || loading) return (
    <div className="min-h-screen bg-earth-100 flex items-center justify-center">
      <span className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    </div>
  );

  const flags = (user.health_flags || {}) as Record<string, any>;
  const healthConditions = ["pcos", "thyroid", "endometriosis", "anemia"].filter(c => flags[c]);
  const cycleLen = Number(user.cycle_metadata?.cycle_length) || 28;
  const lastPeriod = String(user.cycle_metadata?.last_period || "—");
  const periodEnd = String(user.cycle_metadata?.period_end_date || "—");
  const regularity = String(user.cycle_metadata?.regularity || "—");

  return (
    <main className="min-h-screen bg-transparent flex flex-col relative overflow-hidden">
      {/* Background bubbles are handled globally in RootLayout */}

      <div className="z-10 relative">
        <SharedNav userName={user.name} role={user.role} />
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 z-10 relative">

        {/* Header */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="self-start flex items-center gap-1.5 text-sm text-earth-500 hover:text-earth-800 bg-white border border-earth-200 px-3 py-1.5 rounded-full transition-colors shadow-sm"
          >
            ← Back to Dashboard
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <h1 className="text-3xl font-display font-semibold text-earth-900">My Profile & Sanctuary</h1>
              <p className="text-earth-500 text-sm mt-1">Your personal health hub — track, reflect, and bloom 🌸</p>
            </div>
            {/* Passkey Badge */}
            <div className="sm:ml-auto flex items-center gap-2 bg-white/80 backdrop-blur border border-primary-200 px-4 py-2 rounded-xl shadow-sm">
              <span className="text-xs text-earth-500 font-medium">🔑 Your Passkey:</span>
              <code className="text-sm font-mono text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded">{user.passkey}</code>
            </div>
          </div>
        </div>

        {/* Period Approaching Alert */}
        {alertWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-300 p-4 rounded-2xl flex items-center gap-3 shadow-sm"
          >
            <span className="text-2xl">🩸</span>
            <div>
              <p className="font-semibold text-rose-800">Menstruation Prediction</p>
              <p className="text-sm text-rose-600">{alertWarning}</p>
            </div>
          </motion.div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Logs (90d)", value: stats.totalDays, icon: "📋", color: "text-primary-600" },
            { label: "Avg Nutri-Score", value: stats.avgScore, icon: "🎯", color: "text-green-600" },
            { label: "Menstrual Days", value: stats.menstrDays, icon: "🩸", color: "text-rose-600" },
            { label: "Meals Logged", value: stats.loggedMeals, icon: "🥗", color: "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="bg-white/40 dark:bg-earth-800/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-sm rounded-3xl p-4 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-earth-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-earth-200/60 rounded-xl p-1 gap-1">
          {([
            { key: "profile", label: "👤 Profile" },
            { key: "calendar", label: "📅 Cycle Calendar" },
            { key: "logs", label: "📋 Log History" },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSection === tab.key
                  ? "bg-white text-earth-900 shadow-sm"
                  : "text-earth-600 hover:text-earth-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─────────────────────────────────────────── */}
        {/* PROFILE TAB */}
        {/* ─────────────────────────────────────────── */}
        {activeSection === "profile" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Personal Info Table */}
            <div className="bg-white rounded-3xl border border-earth-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-earth-100 flex items-center gap-2 bg-gradient-to-r from-primary-50 to-rose-50">
                <span className="text-lg">👤</span>
                <h2 className="font-display font-semibold text-earth-900">Personal Information</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-earth-50">
                    <tr className="hover:bg-earth-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-earth-500 font-medium w-1/3">Full Name</td>
                      <td className="px-5 py-3.5 text-earth-900 font-semibold">{user.name || "—"}</td>
                    </tr>
                    <tr className="hover:bg-earth-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-earth-500 font-medium">Age</td>
                      <td className="px-5 py-3.5 text-earth-900">{user.age ? `${user.age} years` : "—"}</td>
                    </tr>
                    <tr className="hover:bg-earth-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-earth-500 font-medium">Height</td>
                      <td className="px-5 py-3.5 text-earth-900">{user.height ? `${user.height} cm` : "—"}</td>
                    </tr>
                    <tr className="hover:bg-earth-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-earth-500 font-medium">Weight</td>
                      <td className="px-5 py-3.5 text-earth-900">{user.weight ? `${user.weight} kg` : "—"}</td>
                    </tr>
                    <tr className="hover:bg-earth-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-earth-500 font-medium">Marital Status</td>
                      <td className="px-5 py-3.5 text-earth-900">
                        <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-primary-100">
                          {flags.marital_status || user.marital_status || "—"}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-earth-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-earth-500 font-medium">Pregnancy Status</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          user.is_pregnant
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}>
                          {user.is_pregnant ? "🤰 Currently Pregnant" : "✅ Not Pregnant"}
                        </span>
                      </td>
                    </tr>
                    {(flags.marital_status === "Married" || user.marital_status === "Married") && (
                      <>
                        <tr className="hover:bg-earth-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-earth-500 font-medium">No. of Children</td>
                          <td className="px-5 py-3.5 text-earth-900">{flags.children_count ?? user.children_count ?? "0"}</td>
                        </tr>
                        {user.pregnancy_planning && (
                          <tr className="hover:bg-earth-50/50 transition-colors">
                            <td className="px-5 py-3.5 text-earth-500 font-medium">Pregnancy Planning</td>
                            <td className="px-5 py-3.5">
                              <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full border border-blue-100 font-medium">
                                🌸 {user.pregnancy_planning}
                              </span>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cycle Information Table */}
            {!user.is_pregnant && (
              <div className="bg-white rounded-3xl border border-earth-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-earth-100 flex items-center gap-2 bg-gradient-to-r from-rose-50 to-pink-50">
                  <span className="text-lg">🌙</span>
                  <h2 className="font-display font-semibold text-earth-900">Menstrual Cycle Information</h2>
                </div>

                {/* Current Phase Banner */}
                {cyclePhase && (
                  <div className={`mx-5 mt-4 p-4 rounded-2xl ${cyclePhase.bg} border ${cyclePhase.border} flex items-center gap-3`}>
                    <div>
                      <p className="text-xs text-earth-500 font-medium">Current Phase (AI Predicted)</p>
                      <p className={`text-lg font-display font-bold ${cyclePhase.color}`}>{cyclePhase.phase}</p>
                      <p className="text-xs text-earth-500">Day {cyclePhase.day + 1} of your cycle</p>
                    </div>
                    <div className="ml-auto text-xs bg-white/70 text-primary-700 px-2 py-1 rounded-full border border-primary-100 font-medium">
                      ✨ AI Predicted
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm mt-2">
                    <tbody className="divide-y divide-earth-50">
                      <tr className="hover:bg-earth-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-earth-500 font-medium w-1/3">Cycle Length</td>
                        <td className="px-5 py-3.5 text-earth-900">{cycleLen} days</td>
                      </tr>
                      <tr className="hover:bg-earth-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-earth-500 font-medium">Last Period Start</td>
                        <td className="px-5 py-3.5 text-earth-900">{lastPeriod !== "—" ? format(parseLocalDate(lastPeriod), "MMMM d, yyyy") : "—"}</td>
                      </tr>
                      <tr className="hover:bg-earth-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-earth-500 font-medium">Last Period End</td>
                        <td className="px-5 py-3.5 text-earth-900">{periodEnd !== "—" ? format(parseLocalDate(periodEnd), "MMMM d, yyyy") : "Not set"}</td>
                      </tr>
                      <tr className="hover:bg-earth-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-earth-500 font-medium">Cycle Regularity</td>
                        <td className="px-5 py-3.5 text-earth-900 capitalize">{regularity}</td>
                      </tr>
                      {upcomingPredictions.length > 0 && (
                        <tr className="hover:bg-earth-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-earth-500 font-medium">Next Period (Predicted)</td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-2">
                              {upcomingPredictions.slice(0, 2).map((d, i) => (
                                <span key={i} className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                  {i === 0 ? "Next: " : "After: "}{format(d, "MMM d, yyyy")}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pregnancy Info */}
            {user.is_pregnant && (
              <div className="bg-purple-50 border border-purple-200 rounded-3xl p-5 flex items-center gap-4">
                <span className="text-4xl">🤰</span>
                <div>
                  <h3 className="font-display font-bold text-purple-900 text-lg">Pregnancy Mode Active</h3>
                  <p className="text-purple-700 text-sm mt-1">Cycle tracking and period marking are disabled during pregnancy. Nutrition recommendations are tailored for your pregnancy.</p>
                </div>
              </div>
            )}

            {/* Health Conditions Table */}
            <div className="bg-white rounded-3xl border border-earth-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-earth-100 flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50">
                <span className="text-lg">🩺</span>
                <h2 className="font-display font-semibold text-earth-900">Health Conditions</h2>
              </div>
              <div className="p-5">
                {healthConditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {healthConditions.map(c => (
                      <span key={c} className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-full text-sm font-medium capitalize">
                        {c === "pcos" ? "🔵 PCOS" : c === "thyroid" ? "🟡 Thyroid" : c === "endometriosis" ? "🔴 Endometriosis" : "⚫ Anemia"}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-earth-400 text-sm italic">No health conditions reported.</p>
                )}
              </div>
            </div>

            {/* Children Details */}
            {(flags.children_count > 0 || user.children_count! > 0) && (flags.children_details || user.children_details || []).length > 0 && (
              <div className="bg-white rounded-3xl border border-earth-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-earth-100 flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50">
                  <span className="text-lg">👶</span>
                  <h2 className="font-display font-semibold text-earth-900">Children Details</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-earth-50 border-b border-earth-100">
                        <th className="px-5 py-3 text-left text-earth-600 font-semibold">Child</th>
                        <th className="px-5 py-3 text-left text-earth-600 font-semibold">Age</th>
                        <th className="px-5 py-3 text-left text-earth-600 font-semibold">Gender</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-earth-50">
                      {(flags.children_details || user.children_details || []).map((child: any, i: number) => (
                        <tr key={i} className="hover:bg-earth-50/50 transition-colors">
                          <td className="px-5 py-3 text-earth-700 font-medium">Child {i + 1}</td>
                          <td className="px-5 py-3 text-earth-700">{child.age || "—"} yrs</td>
                          <td className="px-5 py-3 text-earth-700">{child.gender === "Boy" ? "👦" : child.gender === "Girl" ? "👧" : "🧒"} {child.gender}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─────────────────────────────────────────── */}
        {/* CALENDAR TAB */}
        {/* ─────────────────────────────────────────── */}
        {activeSection === "calendar" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-2 gap-6"
          >
            {/* Calendar */}
            <div className="bg-white/40 dark:bg-earth-800/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-xl rounded-[2rem] p-5 sm:p-6 flex flex-col items-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                modifiers={{
                  menstruation: markedMenstruationDates,
                  predicted: upcomingPredictions,
                  logged: markedLogDates,
                }}
                modifiersStyles={{
                  menstruation: {
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    fontWeight: "bold",
                    borderRadius: "50%",
                  },
                  predicted: {
                    textDecoration: "underline",
                    textDecorationColor: "#fca5a5",
                    textUnderlineOffset: "4px",
                  },
                  logged: {
                    borderBottom: "3px solid #fed7aa",
                  },
                }}
                className="font-sans w-full"
              />

              <div className="mt-4 w-full pt-4 border-t border-earth-200 flex flex-col items-center text-center gap-3">
                <p className="text-sm text-earth-700 font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>

                {user.is_pregnant ? (
                  <div className="bg-purple-50 px-4 py-3 rounded-2xl text-purple-700 text-sm font-medium border border-purple-200 w-full text-center">
                    🤰 Cycle tracking is disabled during pregnancy.
                  </div>
                ) : (
                  <button
                    onClick={handleToggleMenstruation}
                    disabled={isToggling}
                    className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all shadow-md w-full ${
                      selectedLog?.symptoms?.is_menstruating
                        ? "bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200"
                        : "bg-white hover:bg-rose-50 text-rose-600 border border-rose-200"
                    }`}
                  >
                    {isToggling
                      ? "Saving..."
                      : selectedLog?.symptoms?.is_menstruating
                      ? "✓ Marked as Menstruation Day"
                      : "🩸 Mark as Menstruation Day"}
                  </button>
                )}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-earth-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300" />
                  Menstruation
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-orange-200 rounded" />
                  Logged Day
                </div>
                <div className="flex items-center gap-1.5">
                  <u className="decoration-red-300 underline-offset-2">12</u>
                  Predicted
                </div>
              </div>
            </div>

            {/* Day Detail */}
            <div className="space-y-4">
              <h3 className="text-xl font-display font-semibold text-earth-900 border-b border-earth-200 pb-2">
                Log Details — {format(selectedDate, "MMM d, yyyy")}
              </h3>

              {!selectedLog && (
                <div className="p-8 text-center bg-earth-50 rounded-2xl border border-earth-200 text-earth-500 text-sm">
                  No log for this day. Go to Dashboard to create one!
                </div>
              )}

              {selectedLog && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-earth-200 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-xs text-earth-500 font-medium">{format(parseLocalDate(selectedLog.log_date), "EEEE, MMMM d, yyyy")}</p>
                      <p className="text-earth-700 text-sm mt-0.5">Daily log entry</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-earth-400 mb-0.5">Nutri-Score</p>
                      <span className={`text-2xl font-display font-bold ${
                        selectedLog.nutri_score > 70 ? "text-green-600"
                        : selectedLog.nutri_score > 40 ? "text-orange-500"
                        : "text-red-500"
                      }`}>
                        {selectedLog.nutri_score ?? 0}
                        <span className="text-sm font-normal text-earth-400">/100</span>
                      </span>
                    </div>
                  </div>

                  {selectedLog.symptoms?.is_menstruating && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-red-700">
                      <span>🩸</span><span className="font-medium">Menstruation day</span>
                    </div>
                  )}

                  {Object.keys(selectedLog.symptoms || {}).filter(k => k !== "is_menstruating" && selectedLog.symptoms[k]).length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-earth-200 shadow-sm">
                      <h4 className="font-semibold text-earth-800 mb-3 flex items-center gap-2 text-sm">🩺 Symptoms Logged</h4>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {Object.entries(selectedLog.symptoms || {}).map(([k, v]) => {
                          if (k === "is_menstruating" || !v) return null;
                          return (
                            <span key={k} className="bg-earth-100 text-earth-700 px-3 py-1 rounded-full capitalize">
                              <span className="opacity-60 mr-1">{k.replace(/_/g, " ")}:</span>{String(v)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedLog.food_intake?.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-earth-200 shadow-sm">
                      <h4 className="font-semibold text-earth-800 mb-3 flex items-center gap-2 text-sm">🥗 Meals Logged ({selectedLog.food_intake.length})</h4>
                      <ul className="space-y-2">
                        {selectedLog.food_intake.map((food: any, idx: number) => (
                          <li key={idx} className="rounded-xl bg-earth-50 border border-earth-100 p-3">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-semibold text-earth-800 text-sm capitalize">{food.matched_food || food.input || "Unknown food"}</span>
                              <span className="text-xs text-earth-500 bg-white border border-earth-200 px-2 py-0.5 rounded-full">{food.quantity_grams}g</span>
                            </div>
                            {food.nutrients && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-100">⚡ {Number(food.nutrients.Energy_kcal || 0).toFixed(0)} kcal</span>
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">💪 {Number(food.nutrients.Protein_g || 0).toFixed(1)}g protein</span>
                                <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">🩸 {Number(food.nutrients.Iron_mg || 0).toFixed(2)}mg iron</span>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────── */}
        {/* LOGS TAB */}
        {/* ─────────────────────────────────────────── */}
        {activeSection === "logs" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {history.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-earth-200 text-earth-500">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-lg font-semibold text-earth-700">No logs yet</p>
                <p className="text-sm mt-1">Start logging meals and symptoms from your Dashboard.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-earth-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-earth-100 flex items-center justify-between">
                  <h2 className="font-display font-semibold text-earth-900">Recent Log History</h2>
                  <span className="text-xs text-earth-400">{history.length} entries</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-earth-50 border-b border-earth-100">
                        <th className="px-5 py-3 text-left text-earth-600 font-semibold">Date</th>
                        <th className="px-5 py-3 text-left text-earth-600 font-semibold">Status</th>
                        <th className="px-5 py-3 text-left text-earth-600 font-semibold">Meals</th>
                        <th className="px-5 py-3 text-left text-earth-600 font-semibold">Nutri-Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-earth-50">
                      {history.slice(0, 60).map((log: any, i) => (
                        <tr
                          key={i}
                          onClick={() => { setSelectedDate(parseLocalDate(log.log_date)); setActiveSection("calendar"); }}
                          className="hover:bg-earth-50/70 transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3 font-medium text-earth-800">
                            {format(parseLocalDate(log.log_date), "MMM d, yyyy (EEE)")}
                          </td>
                          <td className="px-5 py-3">
                            {log.symptoms?.is_menstruating && (
                              <span className="bg-red-50 text-red-700 border border-red-200 text-xs px-2 py-0.5 rounded-full">🩸 Menstruation</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-earth-600">
                            {log.food_intake?.length > 0 ? (
                              <span className="text-green-700">{log.food_intake.length} item(s)</span>
                            ) : <span className="text-earth-300">None</span>}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              log.nutri_score > 70 ? "bg-green-100 text-green-700"
                              : log.nutri_score > 40 ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                            }`}>
                              {log.nutri_score ?? 0}/100
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="z-10 relative">
        <Footer />
      </div>
    </main>
  );
}
