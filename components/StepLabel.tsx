"use client";

import React from "react";
import { TraceEvent } from "../lib/tracer";

interface StepLabelProps {
  event: TraceEvent | null;
  stepIndex: number;
  totalSteps: number;
}

/* Maps the raw tracer label/type into a human-readable sentence */
function buildDescription(event: TraceEvent): { icon: string; text: string; color: string } {
  const { type, label, name, value, line } = event;

  const valStr = (v: unknown): string => {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (Array.isArray(v)) return `[${v.map(valStr).join(", ")}]`;
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  switch (type) {
    case "assignment":
      return {
        icon: "←",
        text: name
          ? `Assigned  ${name}  =  ${valStr(value)}`
          : `Variable updated`,
        color: "#60a5fa",  // blue
      };

    case "branch": {
      const result = value ? "✓ true" : "✗ false";
      const condType = label === "if" ? "if" : label === "for" ? "for loop" : label === "while" ? "while loop" : "condition";
      return {
        icon: "⤷",
        text: `Evaluated ${condType} → ${result}`,
        color: value ? "#34d399" : "#f87171",  // green / red
      };
    }

    case "call-enter":
      return {
        icon: "→",
        text: `Called function  ${name ?? ""}`,
        color: "#a78bfa",  // violet
      };

    case "call-exit":
      return {
        icon: "←",
        text: `Returned from  ${name ?? ""}`,
        color: "#94a3b8",
      };

    case "return":
      return {
        icon: "↩",
        text: `Returned  ${valStr(value)}`,
        color: "#fb923c",  // orange
      };

    case "log":
      return {
        icon: "▸",
        text: label === "print"
          ? `print()  →  ${valStr(value)}`
          : `console.log  →  ${valStr(value)}`,
        color: "#facc15",  // yellow
      };

    case "line":
      return {
        icon: "·",
        text: `Reached line ${line ?? "—"}`,
        color: "#475569",
      };

    case "error":
      return {
        icon: "✕",
        text: `Runtime error: ${valStr(value)}`,
        color: "#f87171",
      };

    default:
      return { icon: "·", text: label ?? "Step", color: "#475569" };
  }
}

export default function StepLabel({ event, stepIndex, totalSteps }: StepLabelProps) {
  if (!event) return null;

  const { icon, text, color } = buildDescription(event);

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl select-none"
      style={{
        background: "var(--step-bar-bg)",
        border: "1px solid var(--step-bar-border)",
      }}
    >
      {/* Colored icon badge */}
      <span
        className="flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold font-mono shrink-0"
        style={{
          background: `${color}18`,
          color,
          border: `1px solid ${color}40`,
        }}
      >
        {icon}
      </span>

      {/* Description text */}
      <span
        className="text-sm font-medium flex-1 truncate"
        style={{ color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}
      >
        {text}
      </span>

      {/* Step counter badge */}
      <span
        className="text-[11px] font-mono shrink-0 px-2 py-0.5 rounded-md"
        style={{
          color: "var(--text-muted)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-base)",
        }}
      >
        {stepIndex + 1} / {totalSteps}
      </span>
    </div>
  );
}
