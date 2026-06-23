"use client";

import React from "react";
import { TraceEvent } from "../lib/tracer";

interface ConsoleOutputProps {
  trace: TraceEvent[];
  currentStep: number;
}

export default function ConsoleOutput({ trace, currentStep }: ConsoleOutputProps) {
  // Collect all log events up to (and including) the current step
  const logs: Array<{ step: number; value: unknown; isCurrent: boolean }> = [];

  for (let i = 0; i <= currentStep; i++) {
    const ev = trace[i];
    if (ev?.type === "log") {
      logs.push({ step: i, value: ev.value, isCurrent: i === currentStep });
    }
  }

  const formatValue = (v: unknown): string => {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (Array.isArray(v)) return v.map(formatValue).join(", ");
    if (typeof v === "object") return JSON.stringify(v, null, 0);
    return String(v);
  };

  return (
    <div
      className="shrink-0 rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border-soft)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 select-none"
        style={{
          background: "var(--bg-surface)",
          borderBottom: logs.length > 0 ? "1px solid var(--border-soft)" : "none",
        }}
      >
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>▸</span>
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Console Output
        </span>
        {logs.length > 0 && (
          <span
            className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-base)",
            }}
          >
            {logs.length} line{logs.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Log lines */}
      {logs.length > 0 && (
        <div
          className="max-h-28 overflow-y-auto"
          style={{ background: "var(--bg-elevated)" }}
        >
          {logs.map((log, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 px-3 py-1.5 font-mono text-xs transition-colors duration-150"
              style={{
                borderBottom:
                  idx < logs.length - 1 ? "1px solid var(--border-soft)" : "none",
                background: log.isCurrent ? "rgba(96,165,250,0.07)" : "transparent",
              }}
            >
              <span style={{ color: "#f59e0b", opacity: 0.7, userSelect: "none" }}>›</span>
              <span
                className="flex-1 break-all"
                style={{
                  color: log.isCurrent ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: log.isCurrent ? "600" : "400",
                }}
              >
                {formatValue(log.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {logs.length === 0 && (
        <div
          className="px-3 py-2 font-mono text-[10px] italic"
          style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}
        >
          No output yet
        </div>
      )}
    </div>
  );
}
