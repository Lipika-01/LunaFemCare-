"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/api";
import Footer from "@/components/Footer";
import SharedNav from "@/components/SharedNav";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = ["Personal", "Family", "Cycle", "Health", "Ready"];

interface ChildDetail {
  age: string;
  gender: string;
}

interface FormData {
  name: string;
  age: string;
  height: string;
  weight: string;
  marital_status: string;
  is_pregnant: boolean;
  pregnancy_week: string;
  expected_due_date: string;
  pregnancy_complications: string;
  children_count: string;
  children_details: ChildDetail[];
  pregnancy_planning: string;
  cycleLength: string;
  lastPeriod: string;
  periodIsOver: string;  // "yes" | "no"
  periodEndDate: string;
  regularity: string;
  pcos: boolean;
  thyroid: boolean;
  endometriosis: boolean;
  anemia: boolean;
}

const defaultForm: FormData = {
  name: "", age: "", height: "", weight: "",
  marital_status: "Single",
  is_pregnant: false,
  pregnancy_week: "",
  expected_due_date: "",
  pregnancy_complications: "",
  children_count: "0",
  children_details: [],
  pregnancy_planning: "",
  cycleLength: "28", lastPeriod: "", periodIsOver: "yes", periodEndDate: "", regularity: "regular",
  pcos: false, thyroid: false, endometriosis: false, anemia: false,
};

const isSingle = (status: string) => status === "Single";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof FormData, val: any) =>
    setForm(prev => ({ ...prev, [field]: val }));

  const next = () => {
    setError("");
    if (step === 1 && form.is_pregnant) {
      // Skip cycle step if pregnant
      setStep(3);
    } else {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }
  };
  const back = () => {
    setError("");
    if (step === 3 && form.is_pregnant) {
      setStep(1);
    } else {
      setStep(s => Math.max(s - 1, 0));
    }
  };

  const updateChild = (index: number, field: keyof ChildDetail, value: string) => {
    const newDetails = [...form.children_details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    update("children_details", newDetails);
  };

  const handleChildrenCountChange = (val: string) => {
    const count = parseInt(val) || 0;
    update("children_count", val);
    const newDetails = Array.from({ length: count }, (_, i) => form.children_details[i] || { age: "", gender: "Girl" });
    update("children_details", newDetails);
  };

  const handleFinish = async () => {
    setLoading(true); setError("");
    try {
      const storedRaw = localStorage.getItem("luna_user");
      if (!storedRaw) throw new Error("Session lost. Please sign up again.");
      const stored = JSON.parse(storedRaw);

      const childrenCount = isSingle(form.marital_status) ? 0 : (parseInt(form.children_count) || 0);
      const childrenDetails = isSingle(form.marital_status) ? [] : form.children_details;

      const healthFlags = {
        pcos: form.pcos,
        thyroid: form.thyroid,
        endometriosis: form.endometriosis,
        anemia: form.anemia,
        marital_status: form.marital_status,
        children_count: childrenCount,
        children_details: childrenDetails,
        ...(form.pregnancy_week && { pregnancy_week: form.pregnancy_week }),
        ...(form.expected_due_date && { expected_due_date: form.expected_due_date }),
        ...(form.pregnancy_complications && { pregnancy_complications: form.pregnancy_complications }),
      };

      const cycleMetadata = form.is_pregnant
        ? {}
        : {
            cycle_length: parseInt(form.cycleLength) || 28,
            last_period: form.lastPeriod,
            period_end_date: form.periodIsOver === "yes" ? form.periodEndDate : "",
            regularity: form.regularity,
          };

      // ── Persist to backend (fixes admin panel empty columns) ──
      const profilePayload = {
        name: form.name || stored.name,
        age: parseInt(form.age) || undefined,
        height: parseFloat(form.height) || undefined,
        weight: parseFloat(form.weight) || undefined,
        marital_status: form.marital_status,
        children_count: childrenCount,
        children_details: childrenDetails,
        pregnancy_planning: form.is_pregnant ? undefined : form.pregnancy_planning,
        is_pregnant: form.is_pregnant,
        health_flags: healthFlags,
        cycle_metadata: cycleMetadata,
        ...(form.pregnancy_week && { pregnancy_week: form.pregnancy_week }),
        ...(form.expected_due_date && { expected_due_date: form.expected_due_date }),
        ...(form.pregnancy_complications && { pregnancy_complications: form.pregnancy_complications }),
      };

      await updateProfile(stored.id, profilePayload);

      // Update localStorage with full profile
      const updatedUser = {
        ...stored,
        name: form.name || stored.name,
        age: parseInt(form.age) || undefined,
        height: parseFloat(form.height) || undefined,
        weight: parseFloat(form.weight) || undefined,
        marital_status: form.marital_status,
        children_count: childrenCount,
        children_details: childrenDetails,
        pregnancy_planning: form.pregnancy_planning,
        pregnancy_week: form.pregnancy_week,
        expected_due_date: form.expected_due_date,
        health_flags: healthFlags,
        cycle_metadata: cycleMetadata,
        is_pregnant: form.is_pregnant,
      };
      localStorage.setItem("luna_user", JSON.stringify(updatedUser));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  // Whether to show children-related fields (only for non-single users)
  const showChildrenFields = !isSingle(form.marital_status);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="z-10 relative">
        <SharedNav />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 z-10 relative">
        <div className="w-full max-w-lg">
          <button
            onClick={() => router.push("/")}
            className="mb-6 flex items-center gap-1.5 text-sm text-earth-500 hover:text-earth-800 bg-white/80 backdrop-blur-md border border-earth-200 px-3 py-1.5 rounded-full transition-colors shadow-sm w-fit"
          >
            ← Back to Home
          </button>

          {/* Progress bar */}
          <div className="mb-8 bg-white/60 p-4 rounded-2xl backdrop-blur-md border border-white/70 shadow-sm">
            <div className="flex justify-between text-xs text-earth-500 mb-2">
              {STEPS.map((s, i) => (
                <span key={s} className={`transition-colors ${i === step ? "text-primary-600 font-bold" : i < step ? "text-primary-400" : ""}`}>{s}</span>
              ))}
            </div>
            <div className="h-2 bg-earth-200/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full"
              />
            </div>
          </div>

          <div className="bg-white/85 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border border-white/80">
            <AnimatePresence mode="wait">

              {/* Step 1: Personal */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="text-5xl mb-3 text-center">👤</div>
                  <h2 className="text-2xl font-display font-semibold text-earth-900 mb-1 text-center">About You ✨</h2>
                  <p className="text-earth-500 text-sm mb-6 text-center">Tell us a little about yourself</p>

                  <div className="space-y-4">
                    <Field label="Your Name *" id="name">
                      <input id="name" type="text" value={form.name}
                        onChange={e => update("name", e.target.value)}
                        placeholder="e.g. Lipika"
                        className="input-field" />
                    </Field>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Age" id="age">
                        <input id="age" type="number" value={form.age}
                          onChange={e => update("age", e.target.value)}
                          placeholder="25" className="input-field" />
                      </Field>
                      <Field label="Height (cm)" id="height">
                        <input id="height" type="number" value={form.height}
                          onChange={e => update("height", e.target.value)}
                          placeholder="160" className="input-field" />
                      </Field>
                      <Field label="Weight (kg)" id="weight">
                        <input id="weight" type="number" value={form.weight}
                          onChange={e => update("weight", e.target.value)}
                          placeholder="58" className="input-field" />
                      </Field>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Family Info */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="text-5xl mb-3 text-center">🌸</div>
                  <h2 className="text-2xl font-display font-semibold text-earth-900 mb-1 text-center">Family & Life Stage</h2>
                  <p className="text-earth-500 text-sm mb-6 text-center">Personalize your journey for your life stage.</p>

                  <div className="space-y-4">

                    {/* Marital Status */}
                    <Field label="Marital Status" id="marital_status">
                      <select id="marital_status" value={form.marital_status}
                        onChange={e => {
                          update("marital_status", e.target.value);
                          if (e.target.value === "Single") {
                            update("children_count", "0");
                            update("children_details", []);
                          }
                        }}
                        className="input-field">
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </Field>

                    {/* Children fields — only for non-single users */}
                    <AnimatePresence>
                      {showChildrenFields && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 pt-2 border-t border-earth-100"
                        >
                          <Field label="Number of Children" id="children_count">
                            <input type="number" min="0" max="10" value={form.children_count}
                              onChange={e => handleChildrenCountChange(e.target.value)}
                              className="input-field" placeholder="0" />
                          </Field>

                          {parseInt(form.children_count) > 0 && form.children_details.map((child, i) => (
                            <div key={i} className="flex gap-2 p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                              <Field label={`Child ${i + 1} Age`} id={`c_age_${i}`}>
                                <input type="number" value={child.age} onChange={e => updateChild(i, "age", e.target.value)} className="input-field w-24" placeholder="e.g. 3" />
                              </Field>
                              <Field label={"Gender"} id={`c_gen_${i}`}>
                                <select value={child.gender} onChange={e => updateChild(i, "gender", e.target.value)} className="input-field">
                                  <option>Girl</option><option>Boy</option><option>Other</option>
                                </select>
                              </Field>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Planning to conceive */}
                    {!form.is_pregnant && (
                      <Field label="Are you planning to conceive?" id="pregnancy_planning">
                        <select value={form.pregnancy_planning} onChange={e => update("pregnancy_planning", e.target.value)} className="input-field">
                          <option value="">Select option</option>
                          <option value="Within 1 month">Within 1 month</option>
                          <option value="Within 3 months">Within 3 months</option>
                          <option value="Within 6 months">Within 6 months</option>
                          <option value="1 year or later">1 year or later</option>
                          <option value="No plans right now">No plans right now</option>
                        </select>
                      </Field>
                    )}

                    {/* Pregnancy Status */}
                    <Field label="Are you currently pregnant?" id="is_pregnant">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-earth-200 bg-white hover:bg-rose-50 flex-1 transition-colors">
                          <input type="radio" name="is_pregnant" checked={form.is_pregnant} onChange={() => update("is_pregnant", true)} />
                          <span>🤰 Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-earth-200 bg-white hover:bg-earth-50 flex-1 transition-colors">
                          <input type="radio" name="is_pregnant" checked={!form.is_pregnant} onChange={() => update("is_pregnant", false)} />
                          <span>No</span>
                        </label>
                      </div>
                    </Field>

                    {/* Additional Pregnancy Questions */}
                    {form.is_pregnant && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-2 border-t border-purple-100 bg-purple-50/30 p-4 rounded-2xl">
                        <p className="text-purple-700 text-sm font-medium">🤰 Pregnancy Details <span className="font-normal opacity-80">(Prenatal Mode)</span></p>
                        <Field label="Current Pregnancy Week (approx.)" id="pregnancy_week">
                          <input type="number" min="1" max="42" value={form.pregnancy_week}
                            onChange={e => update("pregnancy_week", e.target.value)}
                            placeholder="e.g. 12" className="input-field" />
                        </Field>
                        <Field label="Expected Due Date (EDD)" id="expected_due_date">
                          <input type="date" value={form.expected_due_date}
                            onChange={e => update("expected_due_date", e.target.value)}
                            className="input-field" />
                        </Field>
                        <Field label="Any known complications?" id="pregnancy_complications">
                          <select value={form.pregnancy_complications} onChange={e => update("pregnancy_complications", e.target.value)} className="input-field">
                            <option value="">None / Not sure</option>
                            <option value="Gestational Diabetes">Gestational Diabetes</option>
                            <option value="Hypertension / Preeclampsia">Hypertension / Preeclampsia</option>
                            <option value="Anaemia">Anaemia</option>
                            <option value="Thyroid Issues">Thyroid Issues</option>
                            <option value="Multiple Pregnancy">Multiple Pregnancy (Twins, etc.)</option>
                            <option value="Other">Other</option>
                          </select>
                        </Field>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Cycle Tracker (non-pregnant only) */}
              {step === 2 && !form.is_pregnant && (
                <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="text-5xl mb-3 text-center">🌙</div>
                  <h2 className="text-2xl font-display font-semibold text-earth-900 mb-1 text-center">Menstrual History</h2>
                  <p className="text-earth-500 text-sm mb-6 text-center">Help us personalize your phase predictions</p>

                  <div className="space-y-4">
                    <Field label="Average Cycle Length (days)" id="cycleLength">
                      <input id="cycleLength" type="number" value={form.cycleLength}
                        onChange={e => update("cycleLength", e.target.value)}
                        min={20} max={45} className="input-field" placeholder="e.g. 28" />
                    </Field>

                    <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-100 space-y-4">
                      <p className="text-rose-700 text-sm font-semibold">🩸 Last Period Information</p>
                      <Field label="Last Period Start Date" id="lastPeriod">
                        <input id="lastPeriod" type="date" value={form.lastPeriod}
                          onChange={e => update("lastPeriod", e.target.value)}
                          className="input-field" />
                      </Field>

                      <Field label="Has your period ended?" id="periodIsOver">
                        <div className="flex gap-3">
                          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-earth-200 bg-white hover:bg-earth-50 flex-1 text-sm">
                            <input type="radio" name="periodIsOver" value="yes" checked={form.periodIsOver === "yes"} onChange={() => update("periodIsOver", "yes")} />
                            Yes, it's over ✅
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-earth-200 bg-white hover:bg-earth-50 flex-1 text-sm">
                            <input type="radio" name="periodIsOver" value="no" checked={form.periodIsOver === "no"} onChange={() => update("periodIsOver", "no")} />
                            No, still ongoing 🩸
                          </label>
                        </div>
                      </Field>

                      {form.periodIsOver === "yes" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Field label="Last Period End Date" id="periodEndDate">
                            <input id="periodEndDate" type="date" value={form.periodEndDate}
                              onChange={e => update("periodEndDate", e.target.value)}
                              className="input-field" />
                          </Field>
                        </motion.div>
                      )}

                      {form.periodIsOver === "no" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <div className="bg-rose-100/50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
                            🩸 Got it — your menstruation phase will be marked as ongoing. Update the end date in your profile once it ends.
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <Field label="Cycle Regularity" id="regularity">
                      <select id="regularity" value={form.regularity}
                        onChange={e => update("regularity", e.target.value)}
                        className="input-field">
                        <option value="regular">Regular (predictable)</option>
                        <option value="irregular">{"Irregular (varies >7 days)"}</option>
                        <option value="very_irregular">Very Irregular / Absent</option>
                      </select>
                    </Field>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Health Status */}
              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="text-5xl mb-3 text-center">🩺</div>
                  <h2 className="text-2xl font-display font-semibold text-earth-900 mb-1 text-center">Health Status</h2>
                  <p className="text-earth-500 text-sm mb-6 text-center">Select any conditions that apply (helps our AI model)</p>

                  <div className="space-y-3">
                    {[
                      { key: "pcos", label: "PCOS", emoji: "🔵", desc: "Polycystic Ovary Syndrome" },
                      { key: "thyroid", label: "Thyroid Disorder", emoji: "🟡", desc: "Hypo / Hyperthyroidism" },
                      { key: "endometriosis", label: "Endometriosis", emoji: "🔴", desc: "Tissue growth outside uterus" },
                      { key: "anemia", label: "Anemia / Iron Deficiency", emoji: "⚫", desc: "Low hemoglobin levels" },
                    ].map(item => (
                      <label key={item.key}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          form[item.key as keyof FormData]
                            ? "bg-rose-50 border-rose-300 shadow-sm"
                            : "bg-earth-50/50 border-earth-200 hover:border-earth-300 hover:bg-white"
                        }`}>
                        <input type="checkbox"
                          checked={Boolean(form[item.key as keyof FormData])}
                          onChange={e => update(item.key as keyof FormData, e.target.checked)}
                          className="hidden" />
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors ${
                          form[item.key as keyof FormData] ? "bg-rose-500 border-rose-500" : "border-earth-300 bg-white"
                        }`}>
                          {form[item.key as keyof FormData] && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className="text-lg">{item.emoji}</span>
                        <div>
                          <span className="font-medium text-earth-800">{item.label}</span>
                          <p className="text-xs text-earth-500 mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 5: Ready */}
              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center">
                  <div className="text-6xl mb-4 animate-bounce">🌺</div>
                  <h2 className="text-3xl font-display font-bold text-earth-900 mb-2">You're All Set!</h2>
                  <p className="text-earth-500 text-sm mb-6 max-w-sm mx-auto">
                    Your personalized LunaFemCare sanctuary is ready. Built just for you 🌸
                  </p>
                  <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-3xl p-5 text-left text-sm text-earth-800 space-y-2.5 mb-6 shadow-sm">
                    {form.name && <p>👤 <strong>Name:</strong> {form.name}</p>}
                    {form.marital_status && <p>💍 <strong>Status:</strong> {form.marital_status}</p>}
                    {form.is_pregnant ? (
                      <div className="space-y-1">
                        <p>🤰 <strong>Pregnancy Mode</strong> activated.</p>
                        {form.pregnancy_week && <p>📅 <strong>Week:</strong> {form.pregnancy_week}</p>}
                        {form.expected_due_date && <p>🗓️ <strong>EDD:</strong> {form.expected_due_date}</p>}
                      </div>
                    ) : form.cycleLength && (
                      <p>🌙 <strong>Cycle:</strong> {form.cycleLength}-day track enabled</p>
                    )}
                    {!form.is_pregnant && form.lastPeriod && (
                      <p>🩸 <strong>Last Period:</strong> {form.lastPeriod} {form.periodIsOver === "yes" && form.periodEndDate ? `→ ${form.periodEndDate}` : "(ongoing)"}</p>
                    )}
                    {showChildrenFields && parseInt(form.children_count) > 0 && (
                      <p>👶 <strong>Children:</strong> {form.children_count}</p>
                    )}
                    {form.pregnancy_planning && !form.is_pregnant && (
                      <p>🌸 <strong>Conception Plan:</strong> {form.pregnancy_planning}</p>
                    )}
                    {(form.pcos || form.thyroid || form.endometriosis || form.anemia) && (
                      <p>🩺 <strong>Health:</strong> {
                        [form.pcos && "PCOS", form.thyroid && "Thyroid", form.endometriosis && "Endometriosis", form.anemia && "Anemia"].filter(Boolean).join(", ")
                      }</p>
                    )}
                  </div>

                  {/* Pregnancy/TTC food warning */}
                  {(form.is_pregnant || (form.pregnancy_planning && form.pregnancy_planning !== "No plans right now")) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left mb-4 shadow-sm"
                    >
                      <p className="text-amber-800 font-semibold text-sm mb-2">
                        ⚠️ {form.is_pregnant ? "Important Pregnancy Food Alert" : "TTC Food Safety Reminder"}
                      </p>
                      <p className="text-amber-700 text-xs leading-relaxed">
                        {form.is_pregnant
                          ? "As you're pregnant, our AI will alert you when you log high-risk foods like papaya, pineapple, raw eggs, high-mercury fish, and unpasteurized dairy. Your safety is our priority 💛"
                          : "Since you're planning to conceive, we'll flag foods that may affect fertility or early pregnancy. Foods like papaya, excess alcohol, and high-mercury fish will be highlighted. 🌸"}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex justify-between mt-8 gap-3 relative z-20">
              {step > 0 ? (
                <button onClick={back}
                  className="px-6 py-3 rounded-full border border-earth-300 bg-white/50 text-earth-700 hover:bg-white font-medium transition-colors shadow-sm">
                  ← Back
                </button>
              ) : <div />}

              {step < STEPS.length - 1 ? (
                <button
                  id="onboarding-next"
                  onClick={next}
                  disabled={step === 0 && !form.name.trim()}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white font-medium transition-all disabled:opacity-50 shadow-md hover:shadow-lg hover:-translate-y-0.5">
                  Continue →
                </button>
              ) : (
                <button
                  id="onboarding-finish"
                  onClick={handleFinish}
                  disabled={loading}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                  {loading ? "Saving to your profile..." : "Enter Sanctuary 🌙"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          border: 1.5px solid #e8e1d5;
          border-radius: 1rem;
          padding: 0.85rem 1.25rem;
          font-size: 0.875rem;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(8px);
          color: #4a3f35;
          outline: none;
          transition: all 0.3s ease;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
        }
        .input-field:focus {
          border-color: #fca5a5;
          background: white;
          box-shadow: 0 0 0 4px rgba(252, 165, 165, 0.2);
        }
      `}</style>

      <div className="z-10 relative">
        <Footer />
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-earth-800 mb-1.5 ml-1">{label}</label>
      {children}
    </div>
  );
}
