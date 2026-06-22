"use client";

import React, { useState } from "react";

interface SymptomTrackerProps {
  symptoms: Record<string, string>;
  onChange: (symptoms: Record<string, string>) => void;
}

const SYMPTOM_SECTIONS = [
  {
    title: "Energy & Mood",
    emoji: "⚡",
    items: [
      {
        key: "energy_level",
        label: "Energy Level",
        options: ["High Energy", "Moderate", "Low Energy", "Exhausted"],
      },
      {
        key: "mood",
        label: "Mood",
        options: ["Great / Positive", "Neutral", "Irritable", "Anxious", "Depressed"],
      },
      {
        key: "sleep_quality",
        label: "Sleep Quality",
        options: ["Excellent", "Good", "Poor", "Insomnia"],
      },
    ],
  },
  {
    title: "Physical Symptoms",
    emoji: "🩺",
    items: [
      {
        key: "cramps",
        label: "Cramps / Pelvic Pain",
        options: ["None", "Mild", "Moderate", "Severe"],
      },
      {
        key: "bloating",
        label: "Bloating",
        options: ["None", "Mild", "Moderate", "Severe"],
      },
      {
        key: "headache",
        label: "Headache",
        options: ["None", "Mild", "Moderate", "Severe / Migraine"],
      },
      {
        key: "breast_tenderness",
        label: "Breast Tenderness",
        options: ["None", "Mild", "Moderate", "Severe"],
      },
    ],
  },
  {
    title: "🔬 Vaginal Secretion Indicators",
    emoji: "🔬",
    description: "These are important health signals. Answer honestly — this data helps detect potential infections.",
    items: [
      {
        key: "discharge_color",
        label: "Discharge Color",
        options: [
          "Clear / Transparent",
          "White / Creamy",
          "Yellow",
          "Green",
          "Brown / Rusty",
          "Bloody",
          "None",
        ],
      },
      {
        key: "discharge_consistency",
        label: "Discharge Consistency",
        options: [
          "Watery",
          "Egg-white / Stretchy",
          "Thick / Creamy",
          "Chunky / Cottage Cheese",
          "None",
        ],
      },
      {
        key: "discharge_smell",
        label: "Discharge Smell",
        options: [
          "Odorless / Normal",
          "Mild / Slightly Musky",
          "Fishy Odor",
          "Yeasty / Bread-like",
          "Strong / Unpleasant",
        ],
      },
    ],
  },
];

// Flags potential concern based on vaginal secretion answers
function isVaginalConcern(symptoms: Record<string, string>): boolean {
  const color = symptoms.discharge_color || "";
  const smell = symptoms.discharge_smell || "";
  const consistency = symptoms.discharge_consistency || "";
  return (
    color === "Green" ||
    color === "Yellow" ||
    smell === "Fishy Odor" ||
    smell === "Strong / Unpleasant" ||
    consistency === "Chunky / Cottage Cheese"
  );
}

export default function SymptomTracker({ symptoms, onChange }: SymptomTrackerProps) {
  const [openSection, setOpenSection] = useState<number | null>(0);
  const vaginalConcern = isVaginalConcern(symptoms);

  const setSymptom = (key: string, val: string) => {
    onChange({ ...symptoms, [key]: val });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-earth-900">Daily Symptom Log</h2>
        <span className="text-xs bg-secondary-100 text-secondary-700 px-3 py-1 rounded-full font-medium">
          {Object.keys(symptoms).length} recorded
        </span>
      </div>

      {/* Vaginal concern alert */}
      {vaginalConcern && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Possible concern detected</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your secretion indicators may suggest an infection. Consider consulting a doctor. You can export a doctor-ready report below.
            </p>
          </div>
        </div>
      )}

      {SYMPTOM_SECTIONS.map((section, si) => (
        <div key={si} className="bg-white/40 dark:bg-earth-800/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 rounded-3xl overflow-hidden shadow-sm">
          {/* Section header */}
          <button
            id={`symptom-section-${si}`}
            onClick={() => setOpenSection(openSection === si ? null : si)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-earth-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{section.emoji}</span>
              <div>
                <p className="font-semibold text-earth-900 text-sm">
                  {section.title.replace(/^🔬\s*/, "")}
                  {si === 2 && (
                    <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                      Health Indicator
                    </span>
                  )}
                </p>
                <p className="text-xs text-earth-500">
                  {section.items.filter(item => symptoms[item.key]).length} / {section.items.length} answered
                </p>
              </div>
            </div>
            <span className={`text-earth-400 transition-transform ${openSection === si ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>

          {/* Section content */}
          {openSection === si && (
            <div className="px-4 pb-4 space-y-5 border-t border-earth-100">
              {section.description && (
                <p className="text-xs text-earth-500 bg-earth-50 rounded-lg p-3 mt-3 leading-relaxed">
                  ℹ️ {section.description}
                </p>
              )}
              {section.items.map((item) => (
                <div key={item.key}>
                  <p className="text-sm font-medium text-earth-800 mb-2">{item.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.options.map((opt) => (
                      <button
                        key={opt}
                        id={`symptom-${item.key}-${opt.replace(/\s+/g, "-").toLowerCase()}`}
                        onClick={() => setSymptom(item.key, symptoms[item.key] === opt ? "" : opt)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          symptoms[item.key] === opt
                            ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                            : "bg-white text-earth-700 border-earth-200 hover:border-primary-300 hover:bg-primary-50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export { isVaginalConcern };
