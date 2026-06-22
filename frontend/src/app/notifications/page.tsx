"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserProfile } from "@/lib/api";
import SharedNav from "@/components/SharedNav";
import Footer from "@/components/Footer";
import { addDays, differenceInDays } from "date-fns";
import { motion } from "framer-motion";

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("luna_user");
    if (!raw) { router.push("/"); return; }
    const u = JSON.parse(raw);
    setUser(u);
  }, [router]);

  const notifications = useMemo(() => {
    if (!user) return [];
    const alerts: any[] = [];

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const flags = (user.health_flags || {}) as Record<string, any>;
    const maritalStatus = flags.marital_status || user.marital_status || "Single";
    const isMarried = maritalStatus === "Married";
    const isPregnant = user.is_pregnant;
    const childrenCount = Number(flags.children_count ?? user.children_count ?? 0);
    const pregnancyPlanning = user.pregnancy_planning;
    const cycleLen = Number(user.cycle_metadata?.cycle_length) || 28;
    const lastPeriodStr = String(user.cycle_metadata?.last_period || "");
    const periodEndStr = String(user.cycle_metadata?.period_end_date || "");

    // ── Pregnancy Mode ──
    if (isPregnant) {
      alerts.push({
        id: "pregnancy_mode",
        type: "success",
        icon: "🤰",
        title: "Pregnancy Mode Active",
        message: "Cycle predictions and period tracking are paused. Log your daily symptoms to monitor your pregnancy wellness.",
        date: today.toISOString(),
      });
    }

    // ── Cycle Alerts (non-pregnant) ──
    if (!isPregnant && lastPeriodStr && cycleLen) {
      const lastPeriod = parseLocalDate(lastPeriodStr);
      const nextPeriod = addDays(lastPeriod, cycleLen);
      const diffNext = differenceInDays(nextPeriod, today);

      // Period approaching (3-day warning)
      if (diffNext >= 0 && diffNext <= 3) {
        alerts.push({
          id: "period_soon",
          type: "warning",
          icon: "🩸",
          title: "Period Approaching",
          message: `Your next cycle is predicted to start in ${diffNext === 0 ? "today" : `${diffNext} day(s)`}. Stock up on comfort essentials and iron-rich foods!`,
          date: today.toISOString(),
        });
      }

      // Period overdue
      if (diffNext < 0 && Math.abs(diffNext) <= 7) {
        alerts.push({
          id: "period_overdue",
          type: "warning",
          icon: "⏰",
          title: "Period Overdue",
          message: `Your period was expected ${Math.abs(diffNext)} day(s) ago. If late, consider consulting your doctor.`,
          date: today.toISOString(),
        });
      }

      // Current phase context
      const startTime = parseLocalDate(lastPeriodStr).getTime();
      let isMenstruating = false;
      if (periodEndStr) {
        const endTime = parseLocalDate(periodEndStr).getTime();
        if (today.getTime() >= startTime && today.getTime() <= endTime + 86400000) isMenstruating = true;
      }
      const dayOfCycle = Math.floor((today.getTime() - startTime) / 86400000) % cycleLen;

      if (isMenstruating) {
        alerts.push({
          id: "menstrual_phase",
          type: "info",
          icon: "🌿",
          title: "Menstrual Phase Wellness",
          message: "You're in your menstrual phase. Prioritize rest, warmth, and iron-rich foods like spinach and lentils. Stay hydrated!",
          date: today.toISOString(),
        });
      }

      // ── Fertility Alerts for Married Users / Those Seeking Conception ──
      const seekingConception = isMarried && (
        childrenCount === 0 && pregnancyPlanning && pregnancyPlanning !== "No plans right now"
      );

      if (isMarried || seekingConception) {
        // Ovulation date (approx 14 days before next period)
        const ovulationDate = addDays(nextPeriod, -14);
        const diffOvulation = differenceInDays(ovulationDate, today);

        // High fertility window: 5 days before ovulation + ovulation day
        if (diffOvulation >= -1 && diffOvulation <= 5) {
          alerts.push({
            id: "high_fertility",
            type: "info",
            icon: "🌸",
            title: seekingConception ? "🌸 High Fertility Window — Optimal Conception Time!" : "🌸 High Fertility Window",
            message: seekingConception
              ? `You are in your highest fertility window! Ovulation is estimated ${diffOvulation === 0 ? "today" : `in ${diffOvulation} day(s)`}. This is your best time to conceive. Make sure you're taking folic acid supplements!`
              : `Your estimated peak fertility window is active. Ovulation expected ${diffOvulation === 0 ? "today" : `in ${diffOvulation} day(s)`}.`,
            date: today.toISOString(),
          });
        }

        // Low fertility window: days right after period and before fertile window
        if (dayOfCycle >= 1 && dayOfCycle <= 7) {
          alerts.push({
            id: "low_fertility",
            type: "success",
            icon: "🍀",
            title: "Low Fertility Phase",
            message: "You are currently in a low fertility phase (just after menstruation). It's a good time to focus on nutritional recovery and self-care.",
            date: today.toISOString(),
          });
        }

        // Pre-ovulation (fertile buildup)
        if (dayOfCycle >= 8 && dayOfCycle <= 11) {
          alerts.push({
            id: "pre_ovulation",
            type: "info",
            icon: "🌱",
            title: "Rising Fertility",
            message: "Estrogen is rising! Fertility is increasing. If planning conception, start tracking basal body temperature and mucus changes.",
            date: today.toISOString(),
          });
        }

        // Post-ovulation (luteal phase)
        if (dayOfCycle >= 17 && dayOfCycle <= cycleLen - 4) {
          alerts.push({
            id: "luteal_phase",
            type: "success",
            icon: "🍂",
            title: "Luteal Phase",
            message: "You're in the luteal phase. Fertility is lower now. Focus on magnesium-rich foods, rest, and self-care to ease any PMS symptoms.",
            date: today.toISOString(),
          });
        }
      }
    }

    // ── Health Condition Reminders ──
    if (flags.pcos) {
      alerts.push({
        id: "pcos_reminder",
        type: "warning",
        icon: "🔵",
        title: "PCOS Wellness Reminder",
        message: "Regular exercise, low-GI diet, and daily symptom tracking can significantly help manage PCOS. Don't skip your log today!",
        date: today.toISOString(),
      });
    }
    if (flags.thyroid) {
      alerts.push({
        id: "thyroid_reminder",
        type: "warning",
        icon: "🟡",
        title: "Thyroid Health Tip",
        message: "Iodine and selenium-rich foods support thyroid function. Consult your doctor regularly for TSH monitoring.",
        date: today.toISOString(),
      });
    }
    if (flags.anemia) {
      alerts.push({
        id: "anemia_reminder",
        type: "warning",
        icon: "⚫",
        title: "Anemia Nutrition Reminder",
        message: "Your iron intake is critical. Log your meals daily and aim for iron-rich foods. Vitamin C enhances iron absorption!",
        date: today.toISOString(),
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: "all_good",
        type: "success",
        icon: "✨",
        title: "All Clear!",
        message: "You have no urgent warnings today. Keep maintaining your healthy habits and log your meals for best results 🌸",
        date: today.toISOString(),
      });
    }

    return alerts;
  }, [user]);

  if (!user) return null;

  const typeColors = {
    warning: {
      border: "border-rose-200",
      bg: "bg-rose-50",
      icon: "bg-rose-100",
      title: "text-rose-900",
    },
    info: {
      border: "border-blue-200",
      bg: "bg-blue-50/60",
      icon: "bg-blue-100",
      title: "text-blue-900",
    },
    success: {
      border: "border-emerald-200",
      bg: "bg-emerald-50/60",
      icon: "bg-emerald-100",
      title: "text-emerald-900",
    },
  };

  const warningCount = notifications.filter(n => n.type === "warning").length;

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative overflow-hidden">
      {/* Background bubbles are handled globally in RootLayout */}

      <div className="z-10 relative">
        <SharedNav userName={user.name} role={user.role} />
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 z-10 relative">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-4 flex items-center gap-1.5 text-sm text-earth-500 hover:text-earth-800 bg-white border border-earth-200 px-3 py-1.5 rounded-full transition-colors shadow-sm"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-display font-semibold text-earth-900">Notifications</h1>
          <p className="text-earth-500 mt-1">
            Personalized health alerts & cycle insights for {user.name} 🌸
          </p>
          {warningCount > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              {warningCount} active warning{warningCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {notifications.map((alert, idx) => {
            const colors = typeColors[alert.type as keyof typeof typeColors] || typeColors.success;
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className={`p-5 sm:p-6 rounded-3xl border bg-white/70 backdrop-blur-md shadow-sm transition-all hover:shadow-md flex gap-4 items-start ${colors.border}`}
              >
                <div className={`text-3xl rounded-2xl w-14 h-14 flex items-center justify-center shrink-0 shadow-inner ${colors.icon}`}>
                  {alert.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-display font-bold mb-1 leading-tight ${colors.title}`}>
                    {alert.title}
                  </h3>
                  <p className="text-earth-700 leading-relaxed text-sm">
                    {alert.message}
                  </p>
                </div>
                <div className={`shrink-0 w-2.5 h-2.5 rounded-full mt-2 ${
                  alert.type === "warning" ? "bg-rose-400" :
                  alert.type === "info" ? "bg-blue-400" : "bg-emerald-400"
                }`} />
              </motion.div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs text-earth-400 text-center mt-8">
          Notifications are generated based on your profile data and cycle information. Keep your profile updated for accurate alerts.
        </p>
      </main>

      <div className="z-10 relative">
        <Footer />
      </div>
    </div>
  );
}
