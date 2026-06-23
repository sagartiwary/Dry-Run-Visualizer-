"use client";

import React from "react";

interface StepperToolbarProps {
  selectedStep: number;
  setSelectedStep: (step: number) => void;
  traceLength: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  stepBack: () => void;
  stepForward: () => void;
  smartStep: boolean;
  setSmartStep: (v: boolean) => void;
}

export default function StepperToolbar({
  selectedStep,
  setSelectedStep,
  traceLength,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
  stepBack,
  stepForward,
  smartStep,
  setSmartStep,
}: StepperToolbarProps) {
  const isAtStart = selectedStep <= 0 || traceLength === 0;
  const isAtEnd = selectedStep >= traceLength - 1 || traceLength === 0;

  return (
    <footer
      className="shrink-0 pt-3 flex flex-col gap-2.5 select-none"
      style={{ borderTop: "1px solid var(--border-soft)" }}
    >
      {/* Row 1: controls */}
      <div className="flex items-center justify-between gap-3">

        {/* Step controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={stepBack}
            disabled={isAtStart}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            style={{
              background: "var(--btn-neutral-bg)",
              border: "1px solid var(--btn-neutral-border)",
              color: "var(--btn-neutral-text)",
            }}
          >
            ◀ Back
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={traceLength === 0}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
              isPlaying
                ? "bg-amber-950/80 border border-amber-800 text-amber-400"
                : "bg-blue-950/80 border border-blue-800 text-blue-400"
            }`}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>

          <button
            onClick={stepForward}
            disabled={isAtEnd}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            style={{
              background: "var(--btn-neutral-bg)",
              border: "1px solid var(--btn-neutral-border)",
              color: "var(--btn-neutral-text)",
            }}
          >
            Forward ▶
          </button>
        </div>

        {/* Progress scrubber */}
        <div className="flex-1 mx-4 flex items-center">
          <input
            type="range"
            min="0"
            max={Math.max(0, traceLength - 1)}
            value={selectedStep}
            onChange={(e) => {
              setIsPlaying(false);
              setSelectedStep(Number(e.target.value));
            }}
            disabled={traceLength === 0}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500"
            style={{ background: "var(--bg-surface)" }}
          />
        </div>

        {/* Right controls: smart step + speed */}
        <div className="flex items-center gap-3">

          {/* Smart Step toggle */}
          <button
            onClick={() => setSmartStep(!smartStep)}
            title="Smart Step: skip trivial 'reached line' events, jump only to assignments and branches"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer select-none"
            style={
              smartStep
                ? {
                    background: "rgba(96,165,250,0.15)",
                    border: "1px solid rgba(96,165,250,0.4)",
                    color: "#60a5fa",
                  }
                : {
                    background: "var(--btn-neutral-bg)",
                    border: "1px solid var(--btn-neutral-border)",
                    color: "var(--text-muted)",
                  }
            }
          >
            <span>⚡</span>
            <span>Smart</span>
          </button>

          {/* Delay slider */}
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Delay
            </span>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="w-16 h-1 rounded-lg appearance-none cursor-pointer accent-blue-500"
              style={{ background: "var(--bg-surface)" }}
            />
            <span
              className="text-[10px] font-mono w-9 text-right"
              style={{ color: "var(--text-secondary)" }}
            >
              {playbackSpeed}ms
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: keyboard hints */}
      <div className="flex items-center gap-3 justify-center">
        <span
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          Shortcuts:
        </span>
        {[
          { key: "←", label: "Back" },
          { key: "→", label: "Forward" },
          { key: "Space", label: "Play/Pause" },
        ].map(({ key, label }) => (
          <span key={key} className="flex items-center gap-1">
            <kbd
              className="px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{
                background: "var(--kbd-bg)",
                border: "1px solid var(--kbd-border)",
                color: "var(--kbd-text)",
              }}
            >
              {key}
            </kbd>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {label}
            </span>
          </span>
        ))}
        {smartStep && (
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded"
            style={{
              background: "rgba(96,165,250,0.1)",
              color: "#60a5fa",
              border: "1px solid rgba(96,165,250,0.3)",
            }}
          >
            ⚡ Smart Step ON — skipping line events
          </span>
        )}
      </div>
    </footer>
  );
}
