"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import clsx from "clsx";

export type CyclePhase = "Follicular" | "Ovulatory" | "Luteal" | "Menstrual" | "Pregnancy";

interface PhaseCardProps {
  phase: CyclePhase;
  description?: string;
  recommendations?: string[];
  isActive?: boolean;
}

const getPhaseStyles = (phase: CyclePhase) => {
  switch (phase) {
    case "Follicular":
      return "bg-secondary-50 border-secondary-200 text-secondary-800";
    case "Ovulatory":
      return "bg-accent/10 border-accent/30 text-accent-800";
    case "Luteal":
      return "bg-primary-50 border-primary-200 text-primary-800";
    case "Menstrual":
      return "bg-primary-100 border-primary-300 text-primary-900";
    case "Pregnancy":
      return "bg-earth-200 border-earth-300 text-earth-800";
    default:
      return "bg-earth-100 border-earth-200 text-earth-800";
  }
};

const getTitleStyle = (phase: CyclePhase) => {
  switch (phase) {
    case "Follicular":
      return "text-secondary-700";
    case "Ovulatory":
      return "text-[#b28247]"; // darker accent
    case "Luteal":
      return "text-primary-600";
    case "Menstrual":
      return "text-primary-800";
    case "Pregnancy":
      return "text-earth-900";
    default:
      return "text-earth-900";
  }
};

export default function PhaseCard({
  phase,
  description = "Understand your current physiological needs.",
  recommendations = ["Stay hydrated.", "Focus on gentle movement.", "Prioritize rest."],
  isActive = false,
}: PhaseCardProps) {
  const styles = getPhaseStyles(phase);
  const titleStyle = getTitleStyle(phase);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={clsx(
        "backdrop-blur-lg rounded-3xl p-8 border border-white/50 dark:border-earth-700/50 transition-all duration-300 ease-in-out relative overflow-hidden",
        styles,
        isActive ? "ring-2 ring-offset-2 ring-primary-500 shadow-xl" : "opacity-90 hover:opacity-100 shadow-md"
      )}
    >
      <div className="absolute top-0 right-0 p-6 opacity-10">
        <div className="w-32 h-32 rounded-full border-4 border-current"></div>
      </div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className={clsx("text-2xl font-display font-semibold tracking-tight", titleStyle)}>
            {phase} Phase
          </h3>
          <Info className="w-5 h-5 opacity-60" />
        </div>
        
        <p className="text-sm opacity-80 mb-6 leading-relaxed">
          {description}
        </p>
        
        <div className="mt-auto">
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 opacity-70">
            Focus Areas
          </h4>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <motion.li 
                key={i} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start text-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 mr-2 opacity-60 flex-shrink-0" />
                <span className="opacity-90">{rec}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
