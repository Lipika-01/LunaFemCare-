"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authLogin, authSignup } from "@/lib/api";
import Footer from "@/components/Footer";

type AuthMode = "none" | "login" | "signup";

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode]         = useState<AuthMode>("none");
  const [passkey, setPasskey]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("luna_user");
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed.role === "admin") router.push("/admin");
      else router.push("/dashboard");
    }
  }, [router]);

  const openModal = (m: AuthMode) => { setMode(m); setPasskey(""); setError(""); };
  const closeModal = () => { setMode("none"); setError(""); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await authLogin(passkey.trim());
      localStorage.setItem("luna_user", JSON.stringify(res.user));
      if (res.role === "admin") router.push("/admin");
      else router.push(!res.user.age ? "/onboarding" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your passkey.");
    } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const key = passkey.trim();
    if (!key || key.toLowerCase() === "admin") {
      setError("Invalid passkey. Cannot be empty or 'admin'.");
      setLoading(false); return;
    }
    try {
      const res = await authSignup({ passkey: key, name: key });
      localStorage.setItem("luna_user", JSON.stringify(res.user));
      router.push("/onboarding");
    } catch (err: any) {
      setError(err.message || "Signup failed. Try a different passkey.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">

      {/* Header */}
      <header className="w-full py-4 px-6 sm:px-8 flex items-center justify-between border-b border-white/50 bg-white/55 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-md">🌙</div>
          <span className="font-display font-semibold text-earth-900 text-xl tracking-tight">LunaFemCare</span>
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <a href="#features" className="hidden md:block text-earth-700 hover:text-pink-600 transition-colors">Features</a>
          <button
            onClick={() => openModal("login")}
            className="px-4 py-1.5 rounded-full border border-pink-200 text-earth-700 hover:bg-pink-50 transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => openModal("signup")}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white transition-all shadow-sm hover:shadow-md"
          >
            Get Started
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur text-pink-700 text-sm font-medium mb-6 shadow-sm border border-pink-100">
          🌙 AI-Driven Women&apos;s Health Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-semibold text-earth-900 tracking-tight leading-[1.1] mb-6 max-w-4xl">
          Sync Your Health<br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500"> with Your Cycle</span>
        </h1>
        <p className="text-xl md:text-2xl text-earth-700/70 max-w-2xl mx-auto mb-10 leading-relaxed">
          LunaFemCare is a premium, AI-driven sanctuary providing personalized, phase-based insights for your nutrition, physical health, and emotional well-being.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
          <button
            id="cta-get-started"
            onClick={() => openModal("signup")}
            className="px-9 py-3.5 bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white rounded-full font-medium text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 active:translate-y-0"
          >
            Get Started Free
          </button>
          <button
            id="cta-login"
            onClick={() => openModal("login")}
            className="px-9 py-3.5 bg-white/70 backdrop-blur border border-pink-100 text-earth-800 hover:bg-white/90 rounded-full font-medium text-lg shadow-sm transition-all hover:-translate-y-1"
          >
            I Have a Passkey
          </button>
        </div>
        <p className="text-xs text-earth-600">
          🔒 All data is for informational purposes only. Please consult a doctor for severe symptoms.
        </p>
      </section>

      {/* Feature Cards */}
      <section id="features" className="w-full max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-16 px-6 relative z-10">
        {[
          { emoji: "🌱", title: "What is it?", body: "LunaFemCare uses a cutting-edge 2-Stage ML Pipeline to parse your physical state and provide targeted phase-specific nutrition recommendations." },
          { emoji: "✨", title: "Why use it?", body: "Stop guessing. Understand how your cycle influences your energy, get instant severe-symptom alerts, and export doctor-ready reports." },
          { emoji: "🧘‍♀️", title: "How it works", body: "Log meals, symptoms, and secretions daily. Our AI scores your day from Red to Sage Green — and guides you toward feeling your best." },
        ].map((card) => (
          <div key={card.title} className="bg-white/55 backdrop-blur-md border border-white/75 shadow-sm p-8 rounded-3xl hover:shadow-lg hover:-translate-y-1 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">{card.emoji}</div>
            <h3 className="text-xl font-display font-semibold mb-3 text-earth-900 text-center">{card.title}</h3>
            <p className="text-earth-700/70 leading-relaxed text-sm text-center">{card.body}</p>
          </div>
        ))}
      </section>

      {/* Stats strip */}
      <section className="w-full max-w-5xl mx-auto grid grid-cols-3 gap-4 mb-16 px-6 relative z-10">
        {[
          { value: "2-Stage", label: "AI Model Pipeline" },
          { value: "5 Phases", label: "Cycle-Aware Nutrition" },
          { value: "100%", label: "Data Privacy First" },
        ].map(stat => (
          <div key={stat.label} className="bg-white/55 backdrop-blur-md border border-white/75 shadow-sm rounded-3xl py-8 text-center">
            <div className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500 mb-1">{stat.value}</div>
            <div className="text-sm text-earth-600">{stat.label}</div>
          </div>
        ))}
      </section>

      <Footer />

      {/* Auth Modal */}
      {mode !== "none" && (
        <div
          className="fixed inset-0 bg-earth-900/30 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white/95 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl max-w-sm w-full relative border border-white/80">
            <button id="modal-close" onClick={closeModal}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-pink-50 text-earth-500 font-bold text-lg transition-colors">
              &#x2715;
            </button>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center mx-auto mb-5 text-3xl shadow-inner">🌙</div>
            <h2 className="text-2xl font-display font-semibold text-earth-900 mb-1 text-center">
              {mode === "login" ? "Welcome Back" : "Create Your Passkey"}
            </h2>
            <p className="text-earth-500 text-sm text-center mb-6">
              {mode === "login" ? "Enter your unique passkey to access your sanctuary" : "Choose a memorable passkey — this is your only credential"}
            </p>
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="flex flex-col gap-4">
              <div>
                <label htmlFor="passkey-input" className="block text-sm font-medium text-earth-800 mb-1">Your Passkey</label>
                <input
                  id="passkey-input" type="text" value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="input-field"
                  placeholder={mode === "login" ? "Enter your passkey" : "Create a unique passkey"}
                  autoFocus autoComplete="off"
                />
                {mode === "login" && (
                  <p className="text-xs text-earth-400 mt-1.5">
                    Admins: use <code className="bg-pink-50 px-1 rounded border border-pink-100">admin</code>
                  </p>
                )}
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>
              )}
              <button id="auth-submit" type="submit" disabled={loading || !passkey.trim()}
                className="mt-1 w-full py-3 bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all shadow-md">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : (mode === "login" ? "Secure Login →" : "Create & Continue →")}
              </button>
              <p className="text-center text-sm text-earth-500">
                {mode === "login" ? "New here?" : "Already have a passkey?"}{" "}
                <button type="button" onClick={() => openModal(mode === "login" ? "signup" : "login")}
                  className="text-pink-600 hover:text-pink-700 underline underline-offset-2">
                  {mode === "login" ? "Sign up" : "Log in"}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
