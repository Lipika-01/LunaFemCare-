"use client";

import React, { useState } from "react";
import { NutrientVector, RecommendationResponse } from "@/lib/api";

interface PDFExportProps {
  user: {
    name: string;
    age?: number;
    is_pregnant?: boolean;
    health_flags?: Record<string, boolean>;
  };
  nutrientVector: NutrientVector;
  recommendation: RecommendationResponse | null;
  symptoms: Record<string, string>;
  today: string;
  history?: any[]; // Last 30 days of daily logs
}

/**
 * Generates a printable doctor-ready HTML report and opens it in a new window.
 * Includes 30-day history summary, nutrition trends, menstrual log,
 * and symptom frequency analysis.
 */
export default function PDFExport({ user, nutrientVector, recommendation, symptoms, today, history = [] }: PDFExportProps) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 200));

    const score = recommendation?.overall_score ?? 0;
    const phase = recommendation?.phase ?? "—";
    const deficiencies = recommendation?.deficiencies ?? [];
    const foodSuggestions = recommendation?.food_suggestions ?? [];

    const conditions = Object.entries(user.health_flags || {})
      .filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(", ") || "None reported";

    // ── Compute 30-day analytics ──────────────────────────────────────────────
    const last30 = history.slice(0, 30);

    const avgScore30 = last30.length > 0
      ? Math.round(last30.reduce((s, l) => s + (l.nutri_score || 0), 0) / last30.length)
      : 0;
    const minScore = last30.length ? Math.min(...last30.map(l => l.nutri_score || 0)) : 0;
    const maxScore = last30.length ? Math.max(...last30.map(l => l.nutri_score || 0)) : 0;
    const daysBelow40 = last30.filter(l => (l.nutri_score || 0) < 40).length;
    const menstrDays = last30.filter(l => l.symptoms?.is_menstruating).length;
    const mealDays = last30.filter(l => l.food_intake?.length > 0).length;

    // Menstruation date ranges
    const menstrDates = last30
      .filter(l => l.symptoms?.is_menstruating)
      .map(l => l.log_date)
      .sort();

    // Symptom frequency map
    const symptomFreq: Record<string, number> = {};
    last30.forEach(log => {
      Object.entries(log.symptoms || {}).forEach(([k, v]) => {
        if (k === "is_menstruating" || !v) return;
        const key = `${k}: ${v}`;
        symptomFreq[key] = (symptomFreq[key] || 0) + 1;
      });
    });
    const topSymptoms = Object.entries(symptomFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    // Collect all unique foods logged over 30 days
    const foodFreq: Record<string, number> = {};
    last30.forEach(log => {
      (log.food_intake || []).forEach((f: any) => {
        const name = f.matched_food || f.input || "Unknown";
        foodFreq[name] = (foodFreq[name] || 0) + 1;
      });
    });
    const topFoodsLogged = Object.entries(foodFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    // ── Build score color class ───────────────────────────────────────────────
    const scoreClass = (s: number) => s < 40 ? "red" : s < 70 ? "amber" : "sage";

    // ── Per-day table rows ────────────────────────────────────────────────────
    const dailyTableRows = last30.map(log => {
      const mScore = log.nutri_score || 0;
      const isMens = log.symptoms?.is_menstruating ? "🩸" : "";
      const foods = (log.food_intake || []).map((f: any) => f.matched_food || f.input || "?").join(", ");
      const symKeys = Object.entries(log.symptoms || {})
        .filter(([k, v]) => k !== "is_menstruating" && v)
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
        .join("; ");
      const scoreColor = mScore < 40 ? "#c0392b" : mScore < 70 ? "#b7770d" : "#4a6741";
      return `<tr>
        <td>${log.log_date}</td>
        <td style="font-weight:700;color:${scoreColor};">${mScore}/100</td>
        <td style="text-align:center;">${isMens}</td>
        <td style="font-size:11px;color:#5a4f45;">${foods || "—"}</td>
        <td style="font-size:11px;color:#7a6e65;">${symKeys || "—"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>LunaFemCare — Comprehensive Health Report ${today}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #4a3f35; background: white; font-size: 13px; }
    .page { max-width: 760px; margin: 0 auto; padding: 40px 40px 60px; }
    .header { border-bottom: 3px solid #b67664; padding-bottom: 20px; margin-bottom: 28px; }
    .brand { font-size: 26px; font-weight: 800; color: #b67664; letter-spacing: -0.5px; }
    .subtitle { color: #8c9071; font-size: 12px; margin-top: 4px; }
    .report-date { font-size: 11px; color: #b2bba1; margin-top: 6px; }
    .disclaimer { background: #fff8f0; border-left: 4px solid #f0ad4e; padding: 10px 14px; border-radius: 4px; font-size: 11px; color: #7a5c1e; margin-bottom: 24px; line-height: 1.5; }
    h2 { font-size: 15px; font-weight: 700; color: #4a3f35; margin: 26px 0 10px; border-bottom: 1px solid #e8e1d5; padding-bottom: 6px; }
    h3 { font-size: 13px; font-weight: 700; color: #4a3f35; margin: 14px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
    th { background: #f5ece9; text-align: left; padding: 7px 10px; font-weight: 600; color: #4a3f35; }
    td { padding: 6px 10px; border-bottom: 1px solid #f4f0e6; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .score-box { display: inline-block; padding: 5px 14px; border-radius: 20px; font-weight: 700; font-size: 20px; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .stat-card { background: #f5ece9; border-radius: 8px; padding: 12px; text-align: center; }
    .stat-value { font-size: 22px; font-weight: 800; color: #b67664; }
    .stat-label { font-size: 10px; color: #8c9071; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .red { background: #fde8e8; color: #c0392b; }
    .amber { background: #fef3cd; color: #b7770d; }
    .sage { background: #e8f0e6; color: #4a6741; }
    .badge { display: inline-block; background: #f5ece9; color: #935647; padding: 2px 9px; border-radius: 12px; font-size: 11px; margin: 2px; }
    .concern { background: #fff1f0; border: 1px solid #ffb8b8; padding: 10px 14px; border-radius: 6px; font-size: 11px; color: #c0392b; margin: 10px 0; }
    .mens-tag { background: #fde8e8; color: #c0392b; display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 11px; margin: 2px; }
    .footer-bar { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e1d5; font-size: 10px; color: #b2bba1; text-align: center; line-height: 1.6; }
    .section-note { font-size: 11px; color: #8c9071; font-style: italic; margin-bottom: 10px; }
    .trend-bar-wrap { background: #f4f0e6; border-radius: 6px; height: 8px; overflow: hidden; display: inline-block; width: 80px; vertical-align: middle; }
    .trend-bar { height: 100%; border-radius: 6px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="brand">🌙 LunaFemCare</div>
    <div class="subtitle">AI-Driven Women's Health Platform — Comprehensive Confidential Report</div>
    <div class="report-date">
      Report Generated: ${today} &nbsp;|&nbsp; 
      Current Phase: ${phase} &nbsp;|&nbsp; 
      Period Covering: Last 30 days (up to ${today})
    </div>
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    ⚠️ <strong>Medical Disclaimer:</strong> This report is computer-generated for informational purposes only. 
    It does <strong>not</strong> constitute medical advice, diagnosis, or treatment recommendations. 
    Always consult a qualified healthcare professional for medical concerns.
  </div>

  <!-- Patient Profile -->
  <h2>Patient Profile</h2>
  <table>
    <tr><th>Name</th><td>${user.name || "—"}</td><th>Age</th><td>${user.age || "—"}</td></tr>
    <tr><th>Pregnancy Status</th><td>${user.is_pregnant ? "Pregnant" : "Not Pregnant"}</td><th>Current Phase</th><td>${phase}</td></tr>
    <tr><th>Known Conditions</th><td colspan="3">${conditions}</td></tr>
  </table>

  <!-- 30-Day Summary Stats -->
  <h2>30-Day Health Overview</h2>
  <p class="section-note">Aggregated from ${last30.length} days of logged data.</p>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-value">${avgScore30}</div>
      <div class="stat-label">Avg Nutri-Score</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${minScore} – ${maxScore}</div>
      <div class="stat-label">Score Range</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:#c0392b;">${daysBelow40}</div>
      <div class="stat-label">Days Below 40</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:#c0392b;">${menstrDays}</div>
      <div class="stat-label">Menstrual Days</div>
    </div>
  </div>
  <table>
    <tr><th>Metric</th><th>Value</th><th>Details</th></tr>
    <tr><td>Days with Meal Logs</td><td><strong>${mealDays}</strong> / ${last30.length}</td><td>${mealDays === 0 ? "No meals recorded" : `${Math.round(mealDays/Math.max(last30.length,1)*100)}% logging rate`}</td></tr>
    <tr><td>Average Daily Nutri-Score</td><td><strong>${avgScore30}/100</strong></td><td>${avgScore30 < 40 ? "⚠️ Poor — dietary intervention recommended" : avgScore30 < 70 ? "⚡ Moderate — some nutrients require attention" : "✅ Good nutritional coverage"}</td></tr>
    <tr><td>Menstruation Days Recorded</td><td><strong>${menstrDays}</strong></td><td>${menstrDates.length > 0 ? "Dates: " + menstrDates.join(", ") : "None recorded"}</td></tr>
  </table>

  <!-- Today's Nutrition Score -->
  <h2>Today's Nutrition Score</h2>
  <p>Overall daily nutrition adequacy score:</p>
  <span class="score-box ${scoreClass(score)}">${score.toFixed(1)} / 100</span>
  <p style="font-size:12px;color:#8c9071;margin-top:8px;">
    ${score < 40 ? "⚠️ Significant nutritional deficiencies detected. Dietary intervention recommended."
      : score < 70 ? "Moderate nutritional coverage. Some nutrients require attention."
      : "Good nutritional coverage across key nutrients."}
  </p>

  <!-- Today's Nutrients -->
  <h2>Today's Nutrient Intake</h2>
  <table>
    <tr><th>Nutrient</th><th>Amount Consumed</th></tr>
    <tr><td>Energy</td><td>${nutrientVector.Energy_kcal.toFixed(1)} kcal</td></tr>
    <tr><td>Protein</td><td>${nutrientVector.Protein_g.toFixed(1)} g</td></tr>
    <tr><td>Fat</td><td>${nutrientVector.Fat_g.toFixed(1)} g</td></tr>
    <tr><td>Carbohydrates</td><td>${nutrientVector.Carbs_g.toFixed(1)} g</td></tr>
    <tr><td>Dietary Fiber</td><td>${nutrientVector.Fiber_g.toFixed(1)} g</td></tr>
    <tr><td>Iron</td><td>${nutrientVector.Iron_mg.toFixed(2)} mg</td></tr>
    <tr><td>Calcium</td><td>${nutrientVector.Calcium_mg.toFixed(1)} mg</td></tr>
    <tr><td>Vitamin A</td><td>${nutrientVector.Vit_A_mcg.toFixed(1)} mcg</td></tr>
    <tr><td>Sodium</td><td>${nutrientVector.Sodium_mg.toFixed(1)} mg</td></tr>
  </table>

  ${deficiencies.length > 0 ? `
  <h2>Deficiencies Identified (Today)</h2>
  <table>
    <tr><th>Nutrient</th><th>Consumed</th><th>Target</th><th>Coverage</th></tr>
    ${deficiencies.map(d => `<tr>
      <td>${d.nutrient.replace(/_/g, " ")}</td>
      <td>${Number(d.actual).toFixed(2)}</td>
      <td>${Number(d.target).toFixed(2)}</td>
      <td style="color:${d.pct_met < 40 ? "#c0392b" : "#b7770d"};font-weight:600;">${d.pct_met}%</td>
    </tr>`).join("")}
  </table>` : ""}

  <!-- Today's Symptoms -->
  <h2>Today's Reported Symptoms</h2>
  <div>
    ${Object.entries(symptoms).filter(([,v]) => v).length === 0
      ? "<p style='font-size:12px;color:#8c9071;'>No symptoms recorded for today.</p>"
      : Object.entries(symptoms).filter(([,v]) => v).map(([k,v]) =>
          `<span class="badge">${k.replace(/_/g," ")}: <strong>${v}</strong></span>`
        ).join(" ")}
  </div>

  ${(symptoms.discharge_color === "Green" || symptoms.discharge_color === "Yellow" || symptoms.discharge_smell === "Fishy Odor" || symptoms.discharge_smell === "Strong / Unpleasant" || symptoms.discharge_consistency === "Chunky / Cottage Cheese") ? `
  <div class="concern">
    🚨 <strong>Vaginal Secretion Alert:</strong> The reported discharge characteristics may indicate a possible infection (bacterial vaginosis, yeast infection, or STI). Immediate consultation with a gynecologist is strongly recommended.
    <br/><b>Reported:</b> Color: ${symptoms.discharge_color || "—"} | Consistency: ${symptoms.discharge_consistency || "—"} | Smell: ${symptoms.discharge_smell || "—"}
  </div>` : ""}

  <!-- 30-Day Symptom Frequency -->
  ${topSymptoms.length > 0 ? `
  <h2>30-Day Symptom Frequency Analysis</h2>
  <p class="section-note">Most frequently reported symptoms across the past 30 days.</p>
  <table>
    <tr><th>Symptom</th><th>Days Reported</th><th>Frequency</th></tr>
    ${topSymptoms.map(([sym, cnt]) => `<tr>
      <td>${sym.replace(/_/g, " ")}</td>
      <td>${cnt} day${cnt !== 1 ? "s" : ""}</td>
      <td>
        <div class="trend-bar-wrap"><div class="trend-bar" style="width:${Math.min(cnt/last30.length*100,100)}%;background:#b67664;"></div></div>
        &nbsp;${Math.round(cnt/Math.max(last30.length,1)*100)}%
      </td>
    </tr>`).join("")}
  </table>` : ""}

  <!-- Most Consumed Foods (30 days) -->
  ${topFoodsLogged.length > 0 ? `
  <h2>Most Frequently Consumed Foods (30 Days)</h2>
  <p class="section-note">Foods logged most often across the reporting period.</p>
  <table>
    <tr><th>Food</th><th>Times Logged</th></tr>
    ${topFoodsLogged.map(([name, cnt]) => `<tr><td>${name}</td><td>${cnt}</td></tr>`).join("")}
  </table>` : ""}

  <!-- AI Nutrition Recommendations -->
  ${foodSuggestions.length > 0 ? `
  <h2>AI Nutrition Recommendations</h2>
  <table>
    <tr><th>Suggested Food</th><th>Reason</th></tr>
    ${foodSuggestions.slice(0, 6).map(s => `<tr>
      <td><strong>${s.food}</strong></td>
      <td style="font-size:11px;">${s.reason}</td>
    </tr>`).join("")}
  </table>` : ""}

  <!-- 30-Day Daily Log Table -->
  ${last30.length > 0 ? `
  <h2>Day-by-Day Log (Last ${last30.length} Days)</h2>
  <p class="section-note">Complete chronological record of logged health data.</p>
  <table>
    <tr>
      <th>Date</th>
      <th>Nutri-Score</th>
      <th>Mens.</th>
      <th>Foods Consumed</th>
      <th>Symptoms</th>
    </tr>
    ${dailyTableRows}
  </table>` : `<p style="font-size:12px;color:#8c9071;margin-top:10px;">No historical log data available. Start logging daily from the Dashboard.</p>`}

  <!-- Menstrual Calendar Summary -->
  ${menstrDates.length > 0 ? `
  <h2>Menstrual Cycle Record</h2>
  <p class="section-note">Menstruation days marked during the reporting period:</p>
  <div style="margin-top:8px;">
    ${menstrDates.map(d => `<span class="mens-tag">🩸 ${d}</span>`).join(" ")}
  </div>` : ""}

  <div class="footer-bar">
    <strong style="font-size:14px;">Made with 🤍 for feminine care.</strong><br/>
    <em style="font-size:11px;">by LunarLily</em><br/><br/>
    Generated by LunaFemCare AI Health Platform on ${today}<br/>
    🔒 Confidential — For medical consultation purposes only &nbsp;|&nbsp; Not a substitute for professional medical advice<br/>
    Report covers data from ${last30.length > 0 ? last30[last30.length - 1]?.log_date + " to " + today : today}
  </div>
</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 600);
    }
    setGenerating(false);
  };

  return (
    <button
      id="export-pdf"
      onClick={generate}
      disabled={generating}
      className="flex items-center gap-2 px-5 py-2.5 bg-earth-800 hover:bg-earth-900 text-white rounded-xl font-medium text-sm transition-colors shadow-md disabled:opacity-60"
    >
      {generating ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Generating...
        </>
      ) : (
        <>📋 Doctor-Ready Report</>
      )}
    </button>
  );
}
