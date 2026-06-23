"use client";

import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header
      className="flex justify-between items-center pb-4 mb-6 select-none"
      style={{ borderBottom: "1px solid var(--border-base)" }}
    >
      {/* Left: Logo + Tagline */}
      <div>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" aria-hidden="true">🌌</span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Dry Run Visualizer
          </h1>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{
              background: "var(--bg-badge)",
              border: "1px solid rgba(96,165,250,0.4)",
              color: "var(--text-accent)",
            }}
          >
            Board Visualizer
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          Analyze code dry runs with pointer-synced arrays and clean variable pills.
        </p>
      </div>

      {/* Right: Live badge + Theme Toggle */}
      <div className="flex items-center gap-3">
        {/* Live Compilation Sync Badge */}
        <div
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg"
          style={{
            color: "var(--text-secondary)",
            background: "var(--live-bg)",
            border: "1px solid var(--live-border)",
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Synced</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-80 active:scale-95"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-base)",
          }}
        >
          {/* Icon */}
          <span
            className="text-base transition-transform duration-300"
            style={{ transform: isDark ? "rotate(0deg)" : "rotate(180deg)" }}
          >
            {isDark ? "🌙" : "☀️"}
          </span>

          {/* Animated pill switch */}
          <div className="theme-toggle-track" aria-hidden="true">
            <div className="theme-toggle-thumb" />
          </div>
        </button>
      </div>
    </header>
  );
}
