"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, X } from "lucide-react";
import PhaseCard, { CyclePhase } from "@/components/PhaseCard";
import SymptomTracker, { isVaginalConcern } from "@/components/SymptomTracker";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import NutriScoreCircle from "@/components/NutriScoreCircle";
import NutritionLogger from "@/components/NutritionLogger";
import PDFExport from "@/components/PDFExport";
import Footer from "@/components/Footer";
import SharedNav from "@/components/SharedNav";
import {
  getRecommendations,
  saveLog,
  getHistory,
  RecommendationResponse,
  NutrientVector,
  UserProfile,
} from "@/lib/api";

// Phase metadata (display only – not selectable by user)
const PHASE_INFO: { phase: CyclePhase; description: string; recommendations: string[] }[] = [
  {
    phase: "Menstrual",
    description: "A time for rest and inward reflection. Energy levels may be low.",
    recommendations: ["Iron-rich foods (Spinach, Lentils)", "Warm, grounding meals", "Restorative yoga"],
  },
  {
    phase: "Follicular",
    description: "Rising estrogen brings renewed energy and creativity.",
    recommendations: ["Light, fresh vegetables", "Lean proteins", "High-intensity workouts"],
  },
  {
    phase: "Ovulatory",
    description: "Peak energy outwardly. Communication and social stamina are high.",
    recommendations: ["Raw foods, salads", "Cruciferous veggies", "Social activities"],
  },
  {
    phase: "Luteal",
    description: "Winding down. Progesterone rises, encouraging nesting.",
    recommendations: ["Complex carbs (Sweet potato, Quinoa)", "Magnesium-rich foods", "Pilates or walking"],
  },
];

const PHASE_ICONS: Record<CyclePhase, string> = {
  Menstrual:  "🩸",
  Follicular: "🌱",
  Ovulatory:  "🌕",
  Luteal:     "🍂",
  Pregnancy:  "🤰",
};

const PHASE_COLORS: Record<CyclePhase, { bg: string; border: string; text: string; badge: string }> = {
  Menstrual:  { bg: "from-red-50 to-rose-50",      border: "border-red-200",    text: "text-red-700",      badge: "bg-red-100 text-red-700" },
  Follicular: { bg: "from-green-50 to-teal-50",    border: "border-green-200",  text: "text-green-700",    badge: "bg-green-100 text-green-700" },
  Ovulatory:  { bg: "from-amber-50 to-yellow-50",  border: "border-amber-200",  text: "text-amber-700",    badge: "bg-amber-100 text-amber-700" },
  Luteal:     { bg: "from-orange-50 to-amber-50",  border: "border-orange-200", text: "text-orange-700",   badge: "bg-orange-100 text-orange-700" },
  Pregnancy:  { bg: "from-purple-50 to-violet-50", border: "border-purple-200", text: "text-purple-700",   badge: "bg-purple-100 text-purple-700" },
};

const EMPTY_NUTRIENTS: NutrientVector = {
  Energy_kcal: 0, Protein_g: 0, Fat_g: 0, Carbs_g: 0,
  Fiber_g: 0, Iron_mg: 0, Calcium_mg: 0, Vit_A_mcg: 0, Sodium_mg: 0,
};

// ── Dangerous foods for pregnant / TTC women ──────────────────────────────────
const DANGEROUS_FOODS_PREGNANT: { keywords: string[]; name: string; reason: string; severity: "high" | "medium" }[] = [
  { keywords: ["papaya", "raw papaya", "green papaya", "papaya salad"], name: "Papaya", reason: "Contains papain enzyme — can trigger uterine contractions and cause miscarriage, especially raw/unripe papaya.", severity: "high" },
  { keywords: ["pineapple", "ananas", "pineapple juice"], name: "Pineapple", reason: "High bromelain content may soften the cervix and cause early labour. Avoid in first trimester.", severity: "medium" },
  { keywords: ["raw egg", "half boiled egg", "undercooked egg", "sunny side", "poached egg"], name: "Undercooked Eggs", reason: "Risk of Salmonella infection, which can be severe during pregnancy.", severity: "high" },
  { keywords: ["alcohol", "beer", "wine", "vodka", "whiskey", "spirits", "rum"], name: "Alcohol", reason: "No safe amount of alcohol during pregnancy — linked to fetal alcohol spectrum disorder.", severity: "high" },
  { keywords: ["shark", "swordfish", "king mackerel", "tilefish", "tuna steak"], name: "High-Mercury Fish", reason: "Mercury accumulation harms fetal brain and nervous system development.", severity: "high" },
  { keywords: ["raw meat", "rare steak", "raw chicken", "uncooked meat", "sashimi", "raw fish", "carpaccio"], name: "Raw/Undercooked Meat", reason: "Risk of Listeria and Toxoplasma, which can cause severe fetal complications.", severity: "high" },
  { keywords: ["unpasteurized", "raw milk", "brie", "camembert", "blue cheese", "feta", "soft cheese"], name: "Unpasteurized Dairy", reason: "May contain Listeria bacteria, dangerous to both mother and baby.", severity: "high" },
  { keywords: ["liver", "liver pâté", "beef liver", "chicken liver"], name: "Liver / Liver Paté", reason: "Very high in Vitamin A — excess retinol can cause birth defects in high quantities.", severity: "medium" },
  { keywords: ["ajinomoto", "msg", "monosodium glutamate"], name: "MSG / Ajinomoto", reason: "Best avoided during pregnancy as it may cross the placental barrier.", severity: "medium" },
];

const DANGEROUS_FOODS_TTC: { keywords: string[]; name: string; reason: string; severity: "high" | "medium" }[] = [
  { keywords: ["papaya", "raw papaya", "green papaya"], name: "Papaya", reason: "Papain may interfere with progesterone, potentially affecting implantation.", severity: "high" },
  { keywords: ["alcohol", "beer", "wine", "spirits"], name: "Alcohol", reason: "Regular alcohol reduces fertility in both men and women and affects early embryo development.", severity: "high" },
  { keywords: ["shark", "swordfish", "king mackerel"], name: "High-Mercury Fish", reason: "Mercury can persist in the body and affect conception and early fetal development.", severity: "medium" },
  { keywords: ["trans fat", "vanaspati", "partially hydrogenated"], name: "Trans Fats", reason: "Trans fats are linked to ovulatory infertility and lower conception rates.", severity: "medium" },
];

function detectDangerousFoods(
  parsedItems: any[],
  mode: "pregnant" | "ttc" | null
): { name: string; reason: string; severity: "high" | "medium" }[] {
  if (!mode || parsedItems.length === 0) return [];
  const list = mode === "pregnant" ? DANGEROUS_FOODS_PREGNANT : DANGEROUS_FOODS_TTC;
  const found: { name: string; reason: string; severity: "high" | "medium" }[] = [];
  const seen = new Set<string>();

  parsedItems.forEach(item => {
    const foodText = ((item.matched_food || "") + " " + (item.input || "")).toLowerCase();
    list.forEach(danger => {
      if (!seen.has(danger.name) && danger.keywords.some(kw => foodText.includes(kw))) {
        found.push({ name: danger.name, reason: danger.reason, severity: danger.severity });
        seen.add(danger.name);
      }
    });
  });
  return found;
}

import { motion } from "framer-motion";

/** AI/logic-inferred phase based on last period date and cycle length */
function inferPhase(lastPeriodStr: string, periodEndDateStr: string, cycleLength: number): CyclePhase {
  if (!lastPeriodStr) return "Follicular";
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
     if (dayOfCycle <= 5 && dayOfCycle >= 0) isMenstruating = true;
  }
  
  if (dayOfCycle < 0) return "Follicular";
  if (isMenstruating) return "Menstrual";
  if (dayOfCycle <= 13) return "Follicular";
  if (dayOfCycle <= 16) return "Ovulatory";
  return "Luteal";
}

/** Days until next period (negative = overdue) */
function daysUntilNextPeriod(lastPeriodStr: string, cycleLength: number): number {
  if (!lastPeriodStr) return Infinity;
  const [y, m, d] = lastPeriodStr.split("-").map(Number);
  const last = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayOfCycle = Math.floor((today.getTime() - last.getTime()) / 86400000) % cycleLength;
  return cycleLength - dayOfCycle;
}

interface Notification {
  id: string;
  type: "period" | "nutrition" | "water";
  title: string;
  message: string;
  icon: string;
  color: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [user, setUser]                   = useState<UserProfile | null>(null);
  const [currentPhase, setCurrentPhase]   = useState<CyclePhase>("Follicular");
  const [isPregnant, setIsPregnant]       = useState(false);
  const [symptoms, setSymptoms]           = useState<Record<string, string>>({});
  const [nutrients, setNutrients]         = useState<NutrientVector>(EMPTY_NUTRIENTS);
  const [parsedItems, setParsedItems]     = useState<any[]>([]);
  const [recommendation, setRec]          = useState<RecommendationResponse | null>(null);
  const [loading, setLoading]             = useState(false);
  const [savingLog, setSavingLog]         = useState(false);
  const [logSaved, setLogSaved]           = useState(false);
  const [userHistory, setUserHistory]     = useState<any[]>([]);
  const [dismissedNotifs, setDismissedNotifs] = useState<Set<string>>(new Set());

  // Load user from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("luna_user");
    if (!raw) { router.push("/"); return; }
    const u: UserProfile = JSON.parse(raw);
    if (u.role === "admin") { router.push("/admin"); return; }
    setUser(u);
    setIsPregnant(u.is_pregnant || false);

    // AI-inferred cycle phase — not user-selectable
    if (u.cycle_metadata?.last_period && u.cycle_metadata?.cycle_length) {
      const phase = inferPhase(
        String(u.cycle_metadata.last_period),
        String(u.cycle_metadata.period_end_date || ""),
        Number(u.cycle_metadata.cycle_length)
      );
      setCurrentPhase(phase);
    }

    // Fetch 30-day history for doctor report
    getHistory(u.id, 30).then(data => {
      setUserHistory(data);
      const todayStr = new Date().toISOString().split("T")[0];
      const todayLog = data.find((l: any) => l.log_date === todayStr);
      if (todayLog) {
        if (todayLog.symptoms) setSymptoms(todayLog.symptoms);
        if (todayLog.food_intake && Array.isArray(todayLog.food_intake)) {
          setParsedItems(todayLog.food_intake);
          const totals = { ...EMPTY_NUTRIENTS };
          todayLog.food_intake.forEach((item: any) => {
            if (item.nutrients) {
              totals.Energy_kcal += item.nutrients.Energy_kcal || 0;
              totals.Protein_g += item.nutrients.Protein_g || 0;
              totals.Fat_g += item.nutrients.Fat_g || 0;
              totals.Carbs_g += item.nutrients.Carbs_g || 0;
              totals.Fiber_g += item.nutrients.Fiber_g || 0;
              totals.Iron_mg += item.nutrients.Iron_mg || 0;
              totals.Calcium_mg += item.nutrients.Calcium_mg || 0;
              totals.Vit_A_mcg += item.nutrients.Vit_A_mcg || 0;
              totals.Sodium_mg += item.nutrients.Sodium_mg || 0;
            }
          });
          setNutrients(totals);
        }
      }
    }).catch(() => {});
  }, [router]);

  // ── Notifications ──────────────────────────────────────────────────────────
  const notifications = useMemo<Notification[]>(() => {
    if (!user) return [];
    const notifs: Notification[] = [];

    // 1. Period prediction warning (2-day window)
    if (user.cycle_metadata?.last_period && user.cycle_metadata?.cycle_length) {
      const daysLeft = daysUntilNextPeriod(
        String(user.cycle_metadata.last_period),
        Number(user.cycle_metadata.cycle_length)
      );
      if (daysLeft >= 0 && daysLeft <= 2) {
        notifs.push({
          id: "period-soon",
          type: "period",
          title: daysLeft === 0 ? "Period Expected Today 🩸" : `Period in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          message: "Your predicted period is approaching. Stock up on comfort essentials and iron-rich snacks!",
          icon: "🩸",
          color: "bg-red-50 border-red-200 text-red-800",
        });
      }
    }

    // 2. Low nutrition score warning
    const score = recommendation?.overall_score ?? 0;
    if (recommendation && score < 50) {
      notifs.push({
        id: "low-nutrition",
        type: "nutrition",
        title: "Nutrition Score is Low ⚠️",
        message: `Your score is ${score.toFixed(0)}/100. Try adding iron-rich foods, leafy greens, or a protein source to your meals.`,
        icon: "🥗",
        color: "bg-amber-50 border-amber-200 text-amber-800",
      });
    }

    // 3. Low water / Nutri-A specific push
    if (recommendation && nutrients.Vit_A_mcg < 100) {
      notifs.push({
        id: "low-vita",
        type: "water",
        title: "Vitamin A Needs a Boost 🥕",
        message: "Your Vitamin A intake is very low today. Try carrots, sweet potatoes, or leafy greens!",
        icon: "🥕",
        color: "bg-orange-50 border-orange-200 text-orange-800",
      });
    }

    return notifs.filter(n => !dismissedNotifs.has(n.id));
  }, [user, recommendation, nutrients, dismissedNotifs]);

  // Fetch recommendations whenever nutrients, phase, or symptoms change
  const fetchRec = useCallback(async (nv: NutrientVector, phase: CyclePhase, preg: boolean, syms: Record<string, string>) => {
    setLoading(true);
    try {
      const symptomList = Object.entries(syms)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`);
      const res = await getRecommendations({
        nutrient_vector: nv,
        phase: preg ? "Pregnancy" : phase,
        is_pregnant: preg,
        symptoms: symptomList,
      });
      setRec(res);
    } catch {
      // Silently fail — show last recommendation
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRec(nutrients, currentPhase, isPregnant, symptoms);
  }, [nutrients, currentPhase, isPregnant, symptoms, fetchRec]);

  const handleNutrientsUpdated = (nv: NutrientVector, items: any[]) => {
    setNutrients(nv);
    setParsedItems(items);
    setLogSaved(false);
  };

  const handleSaveDay = async () => {
    if (!user) return;
    setSavingLog(true);
    try {
      await saveLog({
        user_id: user.id,
        log_date: today,
        symptoms,
        food_intake: parsedItems,
        nutri_score: Math.round(recommendation?.overall_score ?? 0),
      });
      setLogSaved(true);
    } catch {
      // Non-critical
    } finally {
      setSavingLog(false);
    }
  };

  const score       = recommendation?.overall_score ?? 0;
  const vaginalFlag = isVaginalConcern(symptoms);
  const severeCramps = symptoms.cramps === "Severe";
  const severeHealth = vaginalFlag || severeCramps;
  const isSevere    = score < 30 || severeHealth;

  const phaseInfo = PHASE_INFO.find(p => p.phase === currentPhase);
  const phaseColor = PHASE_COLORS[currentPhase];

  if (!user) return null;

  return (
    <main className="flex-1 flex flex-col min-h-screen bg-transparent relative overflow-hidden">
      
      {/* Background bubbles are handled globally in RootLayout */}

      {/* Top Nav */}
      <div className="z-10 relative">
        <SharedNav userName={user.name} role={user.role} />
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 z-10 relative">

        {/* Page Header with Back + Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-earth-500 hover:text-earth-800 bg-white border border-earth-200 px-3 py-1.5 rounded-full transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </button>
            <div>
              <h1 className="text-2xl font-display font-semibold text-earth-900">My Dashboard</h1>
              <p className="text-xs text-earth-400 mt-0.5">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        {/* ── Persistent Alerts & Insights Section ── */}
        {notifications.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-white/80 shadow-xl mb-6">
            <h3 className="font-display font-semibold text-earth-900 text-lg mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-500" /> Active Alerts & Insights
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 rounded-2xl p-4 border shadow-sm ${n.color} relative overflow-hidden group`}
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDismissedNotifs(prev => new Set([...prev, n.id]))}
                      className="text-current opacity-50 hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-3xl flex-shrink-0 bg-white/50 w-12 h-12 flex items-center justify-center rounded-xl shadow-sm">
                    {n.icon}
                  </div>
                  <div className="flex-1 pr-6">
                    <span className="block font-semibold text-[15px] mb-1">{n.title}</span>
                    <span className="block opacity-85 text-sm leading-relaxed">{n.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Severe Alert */}
        {isSevere && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="text-3xl">🚨</div>
            <div className="flex-1">
              <p className="font-semibold text-red-800">
                {severeHealth ? "Medical concern detected" : "Low nutrition score detected"}
              </p>
              <p className="text-sm text-red-600 mt-0.5">
                {severeHealth
                  ? "Your symptoms (such as severe pain or unusual secretions) may suggest an infection or underlying condition. Please consult a doctor."
                  : "Your nutrition score is critically low. Consider reviewing your diet and consulting a healthcare provider."}
              </p>
            </div>
            <PDFExport
              user={user}
              nutrientVector={nutrients}
              recommendation={recommendation}
              symptoms={symptoms}
              today={today}
              history={userHistory}
            />
          </div>
        )}

        {/* ── AI Cycle Overview ── */}
        <section>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-xl font-display font-semibold text-earth-900">Cycle Overview</h2>
              <p className="text-sm text-earth-500 mt-0.5">
                Today •{" "}
                <span className={`font-medium ${phaseColor.text}`}>
                  {isPregnant ? "🤰 Pregnancy Mode" : `${PHASE_ICONS[currentPhase]} ${currentPhase} Phase`}
                </span>
                {!isPregnant && (
                  <span className="ml-2 text-[11px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                    ✨ AI Predicted
                  </span>
                )}
              </p>
            </div>
            {isPregnant && (
              <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full border border-purple-200 shadow-sm">
                <span className="text-sm font-medium text-purple-700">🤰 Pregnancy Mode Active</span>
              </div>
            )}
          </div>

          {/* AI Phase Banner */}
          {!isPregnant && (
            <div className={`bg-gradient-to-r ${phaseColor.bg} border ${phaseColor.border} rounded-2xl p-4 sm:p-6 mb-5 flex items-start gap-4 shadow-sm`}>
              <div className="text-4xl flex-shrink-0 drop-shadow-sm">{PHASE_ICONS[currentPhase]}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${phaseColor.badge}`}>
                    {currentPhase} Phase
                  </span>
                  <span className="text-xs text-primary-700 bg-white/70 px-2 py-0.5 rounded-full border border-primary-200 shadow-sm font-medium flex items-center gap-1">
                    <span>🔮</span> Predicted by Lunar AI based on your body logs
                  </span>
                </div>
                <p className={`text-sm font-medium ${phaseColor.text} mb-2 mt-1 leading-relaxed`}>{phaseInfo?.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {phaseInfo?.recommendations.map((rec, i) => (
                    <span key={i} className="text-xs bg-white/70 text-earth-700 px-2.5 py-1 rounded-full border border-white shadow-sm">
                      {rec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* All 4 Phase cards (read-only highlight) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PHASE_INFO.map((p) => (
              <div key={p.phase} className="transition-transform hover:-translate-y-1">
                <PhaseCard
                  phase={p.phase}
                  description={p.description}
                  recommendations={p.recommendations}
                  isActive={currentPhase === p.phase && !isPregnant}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Layered Grid Architecture */}
        <div className="flex flex-col gap-8">
          
          {/* Middle Layer (Split View) */}
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Left: Symptom Logger */}
            <div className="bg-white/40 dark:bg-earth-900/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-xl rounded-[2rem] p-6 lg:p-8">
              <h3 className="text-xl font-display font-semibold text-earth-900 dark:text-earth-100 mb-6 flex items-center gap-2">
                🩺 Symptom Logger
              </h3>
              <SymptomTracker symptoms={symptoms} onChange={setSymptoms} />
              
              {/* Save Day button */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  id="save-day"
                  onClick={handleSaveDay}
                  disabled={savingLog}
                  className="px-6 py-2.5 bg-secondary-500 hover:bg-secondary-600 text-white rounded-full font-medium text-sm transition-colors shadow-md flex items-center gap-2"
                >
                  {savingLog ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                  ) : "💾 Save Today's Log"}
                </button>
                {logSaved && <span className="text-sm text-secondary-600 dark:text-secondary-400 font-medium">✓ Log saved</span>}
                {!isSevere && recommendation && (
                  <div className="ml-auto">
                    <PDFExport
                      user={user}
                      nutrientVector={nutrients}
                      recommendation={recommendation}
                      symptoms={symptoms}
                      today={today}
                      history={userHistory}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Right: Smart Plate Scanner */}
            <div className="bg-primary-50/40 dark:bg-earth-800/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-xl rounded-[2rem] p-6 lg:p-8">
              <h3 className="text-xl font-display font-semibold text-earth-900 dark:text-earth-100 mb-6 flex items-center gap-2">
                🥗 Smart Plate Scanner
              </h3>
              <NutritionLogger onNutrientsUpdated={handleNutrientsUpdated} isLoading={loading} />
            </div>

          </div>
          
          {/* Bottom Layer (Insights & Score) */}
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Nutri-Score Gauge */}
            <div className="lg:col-span-1 bg-white/40 dark:bg-earth-900/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-xl rounded-[2rem] p-6 lg:p-8 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-display font-semibold text-earth-900 dark:text-earth-100">Nutri-Score</h3>
                  <p className="text-earth-500 dark:text-earth-400 text-sm mt-1">
                    {isPregnant ? "Pregnancy" : currentPhase} Phase targets
                  </p>
                </div>
                <NutriScoreCircle score={score} size={100} />
              </div>
              
              {recommendation && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {[
                    { label: "Energy", val: `${nutrients.Energy_kcal.toFixed(0)} kcal` },
                    { label: "Protein", val: `${nutrients.Protein_g.toFixed(1)}g` },
                    { label: "Iron", val: `${nutrients.Iron_mg.toFixed(1)}mg` },
                    { label: "Calcium", val: `${nutrients.Calcium_mg.toFixed(0)}mg` },
                    { label: "Fiber", val: `${nutrients.Fiber_g.toFixed(1)}g` },
                    { label: "Vit A", val: `${nutrients.Vit_A_mcg.toFixed(0)}mcg` },
                  ].map(n => (
                    <div key={n.label} className="bg-white/50 dark:bg-earth-800/50 rounded-xl px-2 py-2 text-center">
                      <p className="text-[10px] text-earth-500 dark:text-earth-400 font-medium">{n.label}</p>
                      <p className="text-xs font-semibold text-earth-800 dark:text-earth-200 mt-0.5">{n.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Insights Panel */}
            <div className="lg:col-span-2 bg-white/40 dark:bg-earth-800/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-xl rounded-[2rem] p-6 lg:p-8">
              <h3 className="text-xl font-display font-semibold text-earth-900 dark:text-earth-100 mb-4">
                Daily Insights & AI Guidance
              </h3>
              {loading && !recommendation ? (
                <div className="flex items-center justify-center min-h-[150px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                    <p className="text-earth-500 dark:text-earth-400 text-sm font-medium">Analyzing your nutrient profile...</p>
                  </div>
                </div>
              ) : recommendation ? (
                <>
                  {detectDangerousFoods(
                    parsedItems,
                    isPregnant ? "pregnant" : (user?.pregnancy_planning && user.pregnancy_planning !== "No plans right now") ? "ttc" : null
                  ).length > 0 && (
                    <div className="mb-6 space-y-3">
                      {detectDangerousFoods(
                        parsedItems,
                        isPregnant ? "pregnant" : (user?.pregnancy_planning && user.pregnancy_planning !== "No plans right now") ? "ttc" : null
                      ).map((danger, i) => (
                        <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${danger.severity === "high" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                          <div className="text-2xl mt-0.5">⚠️</div>
                          <div>
                            <p className={`font-bold text-sm ${danger.severity === "high" ? "text-red-800" : "text-amber-800"}`}>
                              Avoid {danger.name}
                            </p>
                            <p className={`text-xs mt-1 ${danger.severity === "high" ? "text-red-700" : "text-amber-700"}`}>
                              {danger.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <RecommendationsPanel recommendation={recommendation} />
                </>
              ) : (
                <div className="text-center py-10 text-earth-500 dark:text-earth-400">
                   Log your meals and symptoms to get AI guidance for the day.
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
