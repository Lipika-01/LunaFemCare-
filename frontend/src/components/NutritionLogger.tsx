"use client";

import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import { getFoodDictionary, processFood, NutrientVector } from "@/lib/api";

interface FoodEntry {
  option: { value: string; label: string; calories?: number } | null;
  quantity: number;
}

interface NutritionLoggerProps {
  onNutrientsUpdated: (nutrients: NutrientVector, parsedItems: any[]) => void;
  isLoading?: boolean;
}

const emptyEntry = (): FoodEntry => ({ option: null, quantity: 100 });

export default function NutritionLogger({ onNutrientsUpdated, isLoading: parentLoading }: NutritionLoggerProps) {
  const [foodOptions, setFoodOptions]     = useState<any[]>([]);
  const [entries, setEntries]             = useState<FoodEntry[]>([emptyEntry()]);
  const [analyzing, setAnalyzing]         = useState(false);
  const [error, setError]                 = useState("");
  const [parsedResults, setParsedResults] = useState<any[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    (async () => {
      try {
        const res = await getFoodDictionary();
        // food_mapping.json is an array of objects with keys like {frontend_label, model_key, calories, ...}
        const options = Array.isArray(res.data)
          ? res.data.map((item: any) => ({
              value: item.model_key || item.frontend_label || item,
              label: item.frontend_label || item.model_key || String(item),
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fats: item.fats,
            }))
          : Object.keys(res.data).map((key: string) => ({
              value: key,
              label: (res.data as unknown as Record<string, string>)[key] || key,
            }));
        setFoodOptions(options);
      } catch {
        // Fallback: allow free-text entry even if dictionary fails
        setFoodOptions([]);
      } finally {
        setOptionsLoading(false);
      }
    })();
  }, []);

  const updateEntry = (i: number, field: keyof FoodEntry, val: any) =>
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  const addEntry = () => setEntries(prev => [...prev, emptyEntry()]);
  const removeEntry = (i: number) => setEntries(prev => prev.filter((_, idx) => idx !== i));

  const handleAnalyze = async () => {
    const validEntries = entries.filter(e => e.option);
    if (validEntries.length === 0) { setError("Select at least one food item."); return; }
    setError(""); setAnalyzing(true);

    try {
      const foodItems = validEntries.map(e => ({
        description: `${e.quantity}g ${e.option!.value}`,
      }));
      const res = await processFood({ food_items: foodItems });
      setParsedResults(res.parsed_items);
      onNutrientsUpdated(res.total_nutrients, res.parsed_items);
    } catch (err: any) {
      setError(err.message || "Failed to analyze meal.");
    } finally {
      setAnalyzing(false);
    }
  };

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: state.isFocused ? "#c68574" : "#e8e1d5",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(182,118,100,0.2)" : "none",
      borderRadius: "0.75rem",
      padding: "2px 4px",
      backgroundColor: "#faf7f2",
      "&:hover": { borderColor: "#c68574" },
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? "#b67664" : state.isFocused ? "#f5ece9" : "white",
      color: state.isSelected ? "white" : "#4a3f35",
      cursor: "pointer",
      fontSize: "0.875rem",
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: "0.75rem",
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(74,63,53,0.1)",
    }),
    singleValue: (base: any) => ({ ...base, color: "#4a3f35" }),
    placeholder: (base: any) => ({ ...base, color: "#b2bba1", fontSize: "0.875rem" }),
  };

  return (
    <div className="bg-white/40 dark:bg-earth-800/40 backdrop-blur-lg border border-white/50 dark:border-earth-700/50 shadow-xl rounded-3xl p-6 sm:p-8 relative overflow-hidden">
      {/* Decorative blob */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-200 rounded-full blur-3xl opacity-40 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-display font-semibold text-earth-900">Log a Meal</h2>
          <span className="text-xs text-earth-400 bg-white px-2 py-1 rounded-full">
            {optionsLoading ? "Loading foods..." : `${foodOptions.length} foods available`}
          </span>
        </div>
        <p className="text-earth-800/70 mb-5 text-sm leading-relaxed">
          Select foods and adjust quantity — our AI Nutrient Processor will analyze your intake.
        </p>

        <div className="space-y-3 mb-4">
          {entries.map((entry, i) => (
            <div key={i} className="flex gap-3 items-start">
              {/* Food select */}
              <div className="flex-1 min-w-0">
                <Select
                  inputId={`food-select-${i}`}
                  value={entry.option}
                  onChange={val => updateEntry(i, "option", val)}
                  options={foodOptions}
                  styles={selectStyles}
                  placeholder="Search food..."
                  isClearable
                  isLoading={optionsLoading}
                  filterOption={(option, input) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                  noOptionsMessage={() => "No foods found"}
                />
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-1 w-24 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <input
                    id={`qty-${i}`}
                    type="number"
                    min={1} max={1000}
                    value={entry.quantity}
                    onChange={e => updateEntry(i, "quantity", Number(e.target.value))}
                    className="w-14 border border-earth-200 rounded-lg px-2 py-2 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                  <span className="text-xs text-earth-500">g</span>
                </div>
                <input
                  type="range" min={1} max={500} value={entry.quantity}
                  onChange={e => updateEntry(i, "quantity", Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
              </div>

              {/* Remove */}
              {entries.length > 1 && (
                <button
                  onClick={() => removeEntry(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-earth-400 hover:bg-red-50 hover:text-red-500 transition-colors mt-1 flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <button
            id="add-food-item"
            onClick={addEntry}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            + Add another item
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <button
          id="analyze-meal"
          onClick={handleAnalyze}
          disabled={analyzing || parentLoading || entries.every(e => !e.option)}
          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-7 py-2.5 rounded-full font-medium transition-colors shadow-md flex items-center gap-2"
        >
          {analyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : "🧬 Analyze Meal"}
        </button>

        {/* Parsed food results */}
        {parsedResults.length > 0 && (
          <div className="mt-5 border-t border-earth-100 pt-4">
            <p className="text-xs font-semibold text-earth-500 uppercase tracking-wider mb-3">Matched Foods</p>
            <div className="space-y-2">
              {parsedResults.map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-white rounded-xl px-3 py-2 text-sm border border-earth-100">
                  <div>
                    <span className="font-medium text-earth-900">{item.matched_food}</span>
                    <span className="text-earth-400 ml-2">({item.quantity_grams}g)</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.match_confidence > 0.4
                        ? "bg-emerald-100 text-emerald-700"
                        : item.match_confidence > 0.1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {Math.round(item.match_confidence * 100)}% match
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
