"use client";

import React from "react";
import { RecommendationResponse } from "@/lib/api";
import { AlertCircle, AlertTriangle, CheckCircle, Utensils } from "lucide-react";

interface RecommendationsPanelProps {
  recommendation: RecommendationResponse;
}

// Map nutrients to food emojis for visual flair
const FOOD_EMOJI_MAP: Record<string, string> = {
  Iron: "🩸", Calcium: "🥛", "Vit A": "🥕", Fiber: "🌾", Protein: "🥚",
  Energy: "⚡", Sodium: "🧂", Fat: "🥑", Carbs: "🌾",
};

function getFoodEmoji(food: string): string {
  const f = food.toLowerCase();
  if (f.includes("spinach") || f.includes("kale") || f.includes("greens")) return "🥬";
  if (f.includes("egg")) return "🥚";
  if (f.includes("chicken") || f.includes("turkey")) return "🍗";
  if (f.includes("fish") || f.includes("salmon") || f.includes("tuna")) return "🐟";
  if (f.includes("milk") || f.includes("yogurt") || f.includes("cheese") || f.includes("dairy")) return "🥛";
  if (f.includes("banana") || f.includes("fruit")) return "🍌";
  if (f.includes("apple")) return "🍎";
  if (f.includes("orange") || f.includes("citrus")) return "🍊";
  if (f.includes("lentil") || f.includes("bean") || f.includes("legume")) return "🫘";
  if (f.includes("nut") || f.includes("almond") || f.includes("walnut")) return "🥜";
  if (f.includes("rice") || f.includes("grain") || f.includes("quinoa") || f.includes("oat")) return "🌾";
  if (f.includes("broccoli") || f.includes("cauliflower")) return "🥦";
  if (f.includes("carrot") || f.includes("sweet potato")) return "🥕";
  if (f.includes("tomato")) return "🍅";
  if (f.includes("avocado")) return "🥑";
  if (f.includes("tofu") || f.includes("soy")) return "🧆";
  if (f.includes("beef") || f.includes("meat") || f.includes("liver")) return "🥩";
  if (f.includes("water") || f.includes("fluid")) return "💧";
  if (f.includes("seed") || f.includes("flax")) return "🌱";
  return "🍽️";
}

const CARD_COLORS = [
  { bg: "from-rose-50 to-pink-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-700" },
  { bg: "from-violet-50 to-purple-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-700" },
  { bg: "from-amber-50 to-orange-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
  { bg: "from-teal-50 to-emerald-50", border: "border-teal-200", badge: "bg-teal-100 text-teal-700" },
  { bg: "from-sky-50 to-blue-50", border: "border-sky-200", badge: "bg-sky-100 text-sky-700" },
  { bg: "from-lime-50 to-green-50", border: "border-lime-200", badge: "bg-lime-100 text-lime-700" },
];

export default function RecommendationsPanel({ recommendation }: RecommendationsPanelProps) {
  return (
    <div className="w-full space-y-6">

      {/* Nutrient Breakdown — deficiencies + surpluses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Deficiencies */}
        <div className="bg-orange-50/80 backdrop-blur-md rounded-[2rem] p-6 border border-orange-100/50 shadow-lg">
          <h4 className="flex items-center gap-2 text-base font-display font-semibold text-orange-900 mb-4">
            <AlertTriangle className="w-4 h-4" /> Needs Attention
          </h4>
          {recommendation.deficiencies.length === 0 ? (
            <p className="text-sm text-orange-800/70">All minimum nutrient targets met! 🎉</p>
          ) : (
            <ul className="space-y-3">
              {recommendation.deficiencies.map((def, idx) => (
                <li key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-orange-900">{def.nutrient.replace(/_/g, " ")}</span>
                    <span className="text-orange-700 font-semibold">{def.pct_met}%</span>
                  </div>
                  <div className="w-full bg-orange-200/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(def.pct_met, 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Surpluses */}
        <div className="bg-emerald-50/80 backdrop-blur-md rounded-[2rem] p-6 border border-emerald-100/50 shadow-lg">
          <h4 className="flex items-center gap-2 text-base font-display font-semibold text-emerald-900 mb-4">
            <CheckCircle className="w-4 h-4" /> Well Supplied
          </h4>
          {recommendation.surpluses.length === 0 ? (
            <p className="text-sm text-emerald-800/70">No major surpluses detected.</p>
          ) : (
            <ul className="space-y-3">
              {recommendation.surpluses.map((sur, idx) => (
                <li key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-emerald-900">{sur.nutrient.replace(/_/g, " ")}</span>
                    <span className="text-emerald-700 font-semibold">{sur.pct_met}%</span>
                  </div>
                  <div className="w-full bg-emerald-200/50 rounded-full h-2">
                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full w-full" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Suggested Foods ── */}
      {recommendation.food_suggestions.length > 0 && (
        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 sm:p-8 border border-white/50 shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <Utensils className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-earth-900">Suggested Foods</h3>
              <p className="text-xs text-earth-500">AI-curated picks for your phase &amp; nutrition gaps</p>
            </div>
          </div>

          <div className="overflow-x-auto mt-4 rounded-xl border border-white/60 bg-white/40 shadow-sm">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                    <tr className="bg-earth-100/50 text-earth-800 text-sm font-semibold border-b border-white/60">
                        <th className="px-4 py-3">Food Item</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Target Nutrient</th>
                        <th className="px-4 py-3 min-w-[200px]">Why?</th>
                        <th className="px-4 py-3">Nutrition (per 100g)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
                {recommendation.food_suggestions.map((food, idx) => {
                  const emoji = getFoodEmoji(food.food);
                  const targetNutrient = food.target_nutrient?.replace(/_/g, " ") || "";
                  const category = (food as any).category || "General";
                  
                  return (
                    <tr key={idx} className="hover:bg-white/60 transition-colors group">
                        <td className="px-4 py-3 font-medium text-earth-900 flex items-center gap-2">
                           <span className="text-xl bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm">{emoji}</span>
                           <span className="capitalize">{food.food}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-earth-600">
                           <span className="bg-earth-100 px-2 py-0.5 rounded-md border border-earth-200">
                               {category}
                           </span>
                        </td>
                        <td className="px-4 py-3">
                           {targetNutrient && (
                              <span className="bg-rose-50 text-rose-700 text-xs font-bold px-2 py-1 rounded-full border border-rose-100">
                                  {targetNutrient}
                              </span>
                           )}
                        </td>
                        <td className="px-4 py-3 text-sm text-earth-700 leading-relaxed">
                            {food.reason}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-earth-800">
                           {food.value_per100g !== null ? (
                               <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                  {food.value_per100g}
                               </span>
                           ) : "—"}
                        </td>
                    </tr>
                  )
                })}
                </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Symptom Insights */}
      {recommendation.symptom_insights.length > 0 && (
        <div className="bg-primary-50/80 backdrop-blur-md rounded-[2rem] p-6 sm:p-8 border border-primary-100/50 shadow-xl">
          <h3 className="text-lg font-display font-semibold text-earth-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary-500" /> Symptom Insights
          </h3>
          <ul className="space-y-4">
            {recommendation.symptom_insights.map((insight, idx) => (
              <li key={idx} className="flex flex-col gap-1">
                <span className="font-semibold text-earth-900 capitalize text-sm">{insight.symptom}</span>
                <span className="text-sm text-earth-700 leading-relaxed">{insight.tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
