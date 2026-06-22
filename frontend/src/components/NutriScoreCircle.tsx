"use client";

import React, { useEffect, useState } from "react";

interface NutriScoreCircleProps {
  score: number; // 0–100
  size?: number;
}

function getScoreColor(score: number): { stroke: string; label: string; bg: string } {
  if (score < 40) return { stroke: "#d9534f", label: "Needs Work", bg: "bg-red-50" };
  if (score < 70) return { stroke: "#f0ad4e", label: "Good", bg: "bg-amber-50" };
  return { stroke: "#8c9071", label: "Excellent", bg: "bg-emerald-50" };
}

export default function NutriScoreCircle({ score, size = 140 }: NutriScoreCircleProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius      = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset      = circumference - (animatedScore / 100) * circumference;
  const color       = getScoreColor(score);

  return (
    <div className={`flex flex-col items-center gap-3`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e8e1d5"
            strokeWidth={10}
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s ease, stroke 0.5s ease" }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-display font-bold"
            style={{ color: color.stroke, transition: "color 0.5s ease" }}
          >
            {Math.round(animatedScore)}
          </span>
          <span className="text-xs text-earth-500 font-medium">/ 100</span>
        </div>
      </div>
      <div
        className="px-4 py-1 rounded-full text-xs font-semibold"
        style={{ backgroundColor: `${color.stroke}20`, color: color.stroke }}
      >
        {color.label}
      </div>
    </div>
  );
}
