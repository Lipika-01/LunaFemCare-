"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function BackgroundBubbles() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="mesh-gradient-bg" />;

  return (
    <>
      {/* Animated CSS mesh gradient — always visible, no JS dependency */}
      <div className="mesh-gradient-bg" />

      {/* Framer-motion floating blobs on top for extra depth */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">

        {/* Large soft rose blob — top left */}
        <motion.div
          animate={{ x: [0, 50, -15, 0], y: [0, -35, 25, 0], scale: [1, 1.06, 0.96, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full"
          style={{
            background: "radial-gradient(circle at 45% 45%, rgba(252,228,244,0.85), rgba(248,187,225,0.45) 55%, transparent 100%)",
            filter: "blur(70px)",
          }}
        />

        {/* Cream/peach blob — bottom right */}
        <motion.div
          animate={{ x: [0, -45, 18, 0], y: [0, 45, -25, 0], scale: [1, 0.93, 1.05, 1] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-48 -right-48 w-[750px] h-[750px] rounded-full"
          style={{
            background: "radial-gradient(circle at 55% 55%, rgba(255,240,250,0.80), rgba(252,218,240,0.40) 55%, transparent 100%)",
            filter: "blur(80px)",
          }}
        />

        {/* Soft lavender blob — center top */}
        <motion.div
          animate={{ x: [0, 35, -28, 0], y: [0, -55, 18, 0], scale: [1, 1.08, 0.92, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[3%] left-[28%] w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(250,235,255,0.75), rgba(240,210,255,0.35) 55%, transparent 100%)",
            filter: "blur(65px)",
          }}
        />

        {/* Warm peach accent — center right */}
        <motion.div
          animate={{ x: [0, -20, 30, 0], y: [0, 30, -18, 0], scale: [1, 1.12, 0.90, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[42%] right-[8%] w-[380px] h-[380px] rounded-full"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(255,235,240,0.70), rgba(255,200,220,0.30) 55%, transparent 100%)",
            filter: "blur(55px)",
          }}
        />

      </div>
    </>
  );
}
