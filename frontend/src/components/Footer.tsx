"use client";

import React from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "🌙" },
  { href: "/profile",   label: "My Profile", icon: "✨" },
  { href: "/notifications", label: "Alerts",  icon: "🔔" },
];

const HEALTH_TIPS = [
  { icon: "🩸", tip: "Track your cycle daily for best results" },
  { icon: "🥦", tip: "Iron-rich foods help during menstrual phase" },
  { icon: "💧", tip: "Stay hydrated — aim for 8 glasses/day" },
  { icon: "🌿", tip: "Magnesium eases PMS & luteal cramps" },
];

const BADGES = [
  { icon: "🔒", label: "Privacy First" },
  { icon: "🤖", label: "AI-Powered" },
  { icon: "🌸", label: "Made for Women" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto relative">

      {/* Decorative top divider */}
      <div className="w-full overflow-hidden leading-none">
        <svg
          viewBox="0 0 1440 40"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-8 fill-white/40"
          preserveAspectRatio="none"
        >
          <path d="M0,20 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" />
        </svg>
      </div>

      {/* Main footer body */}
      <div className="bg-white/55 backdrop-blur-xl border-t border-pink-100/60 mt-4">

        {/* Top content grid */}
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 pb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">

          {/* ── Brand Column ── */}
          <div className="flex flex-col gap-4">
            {/* Logo + name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xl shadow-lg shadow-pink-200/40">
                🌙
              </div>
              <div>
                <span className="font-display font-bold text-xl text-earth-900 tracking-tight">
                  LunaFemCare
                </span>
                <p className="text-[10px] text-earth-500 font-medium tracking-widest uppercase">
                  Feminine Wellness AI
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-earth-700/80 dark:text-earth-300/80 leading-relaxed max-w-xs">
              Your AI-driven sanctuary for women's health — syncing nutrition,
              cycle awareness, and holistic well-being into one seamless experience.
            </p>

            {/* Pill badges */}
            <div className="flex flex-wrap gap-2 mt-1">
              {BADGES.map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/70 text-earth-700 px-3 py-1.5 rounded-full border border-pink-100/80 shadow-sm backdrop-blur-sm"
                >
                  {b.icon} {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Quick Links Column ── */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-[11px] text-earth-500 uppercase tracking-[0.15em]">
              Navigate
            </h4>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="group flex items-center gap-3 text-sm text-earth-700 hover:text-pink-600 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-xl bg-white/70 flex items-center justify-center text-base shadow-sm group-hover:bg-pink-50 transition-colors">
                      {l.icon}
                    </span>
                    <span className="font-medium">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Disclaimer notice */}
            <div className="mt-2 bg-rose-50/70 border border-rose-100/60 rounded-2xl p-3.5">
              <p className="text-[11px] text-rose-800/80 leading-relaxed flex gap-2">
                <span className="flex-shrink-0">⚠️</span>
                <span>
                  LunaFemCare provides <strong>informational insights only</strong> and does{" "}
                  <strong>not</strong> constitute medical advice. Always consult a healthcare professional.
                </span>
              </p>
            </div>
          </div>

          {/* ── Health Tips Column ── */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-[11px] text-earth-500 uppercase tracking-[0.15em]">
              Wellness Insights
            </h4>
            <ul className="space-y-3">
              {HEALTH_TIPS.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-earth-600 leading-relaxed"
                >
                  <span className="w-7 h-7 flex-shrink-0 rounded-xl bg-white/70 flex items-center justify-center shadow-sm text-base">
                    {item.icon}
                  </span>
                  <span>{item.tip}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-pink-100/40">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Branding — exact specification */}
            <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
              <p className="text-base font-bold text-earth-800">
                Made with 🤍 for feminine care.
              </p>
              <p className="text-sm italic text-earth-600">
                by LunarLily
              </p>
              <p className="text-[11px] text-earth-400 mt-0.5">
                &copy; 2026 LunaFemCare. All rights reserved.
              </p>
            </div>

            {/* Status + version */}
            <div className="flex items-center gap-4 text-xs text-earth-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-300/50" />
                System Online
              </span>
              <span className="px-2.5 py-1 bg-white/60 rounded-full border border-pink-100/50 font-medium">
                v2.0.0
              </span>
            </div>

          </div>
        </div>

      </div>
    </footer>
  );
}
