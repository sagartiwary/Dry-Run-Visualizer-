"use client";

import React, { useRef, useEffect } from "react";

interface VariableCardsProps {
  cardVariables: Array<[string, any]>;
}

export default function VariableCards({ cardVariables }: VariableCardsProps) {
  // Track previous values to detect changes and trigger pulse animation
  const prevValues = useRef<Record<string, string>>({});

  const getDisplay = (value: any): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "object" && "__ref" in value)
      return (value as { __ref: string }).__ref;
    return JSON.stringify(value);
  };

  return (
    <div className="flex flex-wrap gap-3 justify-center py-2 select-none shrink-0">
      {cardVariables.length === 0 ? (
        <span
          className="italic text-xs font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          (no variables in scope)
        </span>
      ) : (
        cardVariables.map(([name, value]) => {
          const displayValue = getDisplay(value);
          const prev = prevValues.current[name];
          const changed = prev !== undefined && prev !== displayValue;
          prevValues.current[name] = displayValue;

          return (
            <div
              key={name}
              className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 min-w-[80px] h-[84px] transition-all duration-200 ${changed ? "card-changed" : ""}`}
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                boxShadow: "0 4px 16px var(--card-shadow)",
              }}
            >
              {/* Variable name label */}
              <span
                className="text-[10px] font-bold uppercase tracking-widest select-none mb-0.5"
                style={{ color: "var(--card-label)", fontFamily: "'Inter', sans-serif" }}
              >
                {name}
              </span>

              {/* Divider */}
              <div
                className="w-8 h-px mb-1.5"
                style={{ background: "var(--card-border)" }}
              />

              {/* Value */}
              <span
                className="text-2xl font-bold font-mono leading-none"
                style={{ color: "var(--card-text)" }}
              >
                {displayValue}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
