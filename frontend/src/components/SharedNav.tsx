"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

interface SharedNavProps {
  userName?: string;
  role?: string;
}

export default function SharedNav({ userName, role }: SharedNavProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("luna_user");
    router.push("/");
  };

  return (
    <nav className="bg-white/40 dark:bg-earth-900/40 backdrop-blur-lg sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/40 dark:border-earth-700/50">
      <Link href={role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
        <span className="text-xl sm:text-2xl">🌙</span>
        <span className="font-display font-semibold text-earth-900 text-base sm:text-lg hidden sm:block dark:text-earth-100">LunaFemCare</span>
        {role === "admin" && (
          <span className="px-2 py-1 sm:px-3 sm:py-1 bg-primary-100 text-primary-700 rounded-full text-[10px] sm:text-xs font-semibold ml-2">
            Admin
          </span>
        )}
      </Link>
      
      <div className="flex items-center gap-2 sm:gap-4">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-earth-100 dark:hover:bg-earth-800 transition-colors text-earth-700 dark:text-earth-200"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        {userName && role !== "admin" && (
          <Link href="/profile" className="hidden sm:flex items-center gap-2 bg-earth-50 dark:bg-earth-800 px-3 py-1.5 rounded-full border border-earth-200 dark:border-earth-700 hover:bg-earth-100 dark:hover:bg-earth-700 transition-colors">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-200 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary-700">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs sm:text-sm text-earth-700 dark:text-earth-200 font-medium">Profile</span>
          </Link>
        )}
        
        {/* Notifications Icon */}
        {userName && role !== "admin" && (
           <Link href="/notifications" className="relative p-2 rounded-full hover:bg-earth-100 dark:hover:bg-earth-800 transition-colors cursor-pointer text-earth-700 dark:text-earth-200">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
             <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white dark:border-earth-800 rounded-full animate-pulse"></span>
           </Link>
        )}

        {/* Mobile profile icon */}
        {userName && role !== "admin" && (
          <Link href="/profile" className="sm:hidden w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-xs font-bold text-primary-700 border border-primary-300">
             {userName.charAt(0).toUpperCase()}
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="text-[10px] sm:text-xs text-earth-500 dark:text-earth-400 hover:text-earth-700 dark:hover:text-earth-200 px-2 py-1.5 sm:px-3 rounded-full hover:bg-earth-200 dark:hover:bg-earth-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
