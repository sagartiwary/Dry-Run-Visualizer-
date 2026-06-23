"use client";

import React from "react";

// Pointer accent colors — semi-transparent backgrounds work in both dark + light
const POINTER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  i:     { bg: "rgba(164, 188, 252, 0.88)", border: "#507af5", text: "#507af5" },
  ind:   { bg: "rgba(166, 238, 211, 0.88)", border: "#10b981", text: "#10b981" },
  j:     { bg: "rgba(254, 215, 170, 0.88)", border: "#f59e0b", text: "#f59e0b" },
  low:   { bg: "rgba(164, 188, 252, 0.88)", border: "#507af5", text: "#507af5" },
  mid:   { bg: "rgba(166, 238, 211, 0.88)", border: "#10b981", text: "#10b981" },
  high:  { bg: "rgba(254, 215, 170, 0.88)", border: "#f59e0b", text: "#f59e0b" },
  left:  { bg: "rgba(216, 180, 254, 0.88)", border: "#a855f7", text: "#a855f7" },
  right: { bg: "rgba(252, 165, 165, 0.88)", border: "#ef4444", text: "#ef4444" },
  k:     { bg: "rgba(167, 243, 208, 0.88)", border: "#10b981", text: "#10b981" },
  p:     { bg: "rgba(253, 186, 116, 0.88)", border: "#f97316", text: "#f97316" },
  q:     { bg: "rgba(196, 181, 253, 0.88)", border: "#8b5cf6", text: "#8b5cf6" },
};

const getPointerStyle = (name: string) =>
  POINTER_COLORS[name] || { bg: "rgba(216, 180, 254, 0.78)", border: "#a855f7", text: "#a855f7" };

interface ArrayBoardProps {
  arrayVariables: Array<{ name: string; array: any[] }>;
  activeVariables: Record<string, any>;
  activePointersConfig?: Record<string, string[]>;
  activeExample?: boolean;
}

export default function ArrayBoard({
  arrayVariables,
  activeVariables,
  activePointersConfig,
  activeExample,
}: ArrayBoardProps) {
  return (
    <div
      className="flex flex-row flex-wrap gap-12 justify-center py-4 select-none shrink-0 my-2 items-start"
      style={{
        borderTop: "1px solid var(--border-soft)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      {arrayVariables.length === 0 ? (
        <div
          className="text-center italic text-xs font-mono py-8"
          style={{ color: "var(--text-muted)" }}
        >
          (no arrays in scope)
        </div>
      ) : (
        arrayVariables.map((arrData) => {
          const arrName = arrData.name;
          const arrayLength = arrData.array.length;

          const allowed =
            (activePointersConfig as Record<string, string[]> | undefined)?.[arrName] ??
            (activeExample
              ? []
              : ["i", "j", "k", "low", "mid", "high", "left", "right", "p", "q", "curr", "ind", "index"]);

          const activePointersForThisArray: Array<{ name: string; value: number }> = [];
          for (const name of allowed) {
            const val = activeVariables[name];
            if (typeof val === "number" && Number.isInteger(val) && val >= 0 && val < arrayLength) {
              activePointersForThisArray.push({ name, value: val });
            }
          }

          return (
            <div key={arrName} className="flex flex-col items-center gap-1">
              {/* Array name label */}
              <span
                className="font-mono font-bold text-sm tracking-wide self-start pl-2 mb-1"
                style={{ color: "var(--text-emerald)" }}
              >
                {arrName}
              </span>

              {/* Pointer arrows row ABOVE cells */}
              <div className="flex flex-row">
                {arrData.array.map((_, idx) => {
                  const pointing = activePointersForThisArray.filter((p) => p.value === idx);
                  return (
                    <div
                      key={idx}
                      className="w-12 flex flex-col items-center justify-end"
                      style={{ minHeight: "36px" }}
                    >
                      {pointing.map((p) => {
                        const style = getPointerStyle(p.name);
                        return (
                          <div key={p.name} className="flex flex-col items-center leading-none">
                            <span
                              className="font-mono text-[10px] font-extrabold uppercase tracking-wide"
                              style={{ color: style.text }}
                            >
                              {p.name}
                            </span>
                            <span
                              className="text-xs leading-none"
                              style={{ color: style.text }}
                            >
                              ▼
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Cells row */}
              <div className="flex flex-row justify-center gap-0">
                {arrData.array.map((val, idx) => {
                  const pointing = activePointersForThisArray.filter((p) => p.value === idx);
                  const primaryPointer = pointing[0];
                  const isFirst = idx === 0;
                  const isLast = idx === arrayLength - 1;

                  let roundedClass = "";
                  if (isFirst && isLast) roundedClass = "rounded-lg";
                  else if (isFirst) roundedClass = "rounded-l-lg";
                  else if (isLast) roundedClass = "rounded-r-lg";

                  let cellBg = "var(--cell-bg)";
                  let cellText = "var(--cell-text)";
                  let zClass = "relative";
                  let scaleClass = "";

                  let borderStyle: React.CSSProperties = {
                    border: "1px solid var(--cell-border)",
                    borderLeft: isFirst ? "1px solid var(--cell-border)" : "none",
                  };

                  if (primaryPointer) {
                    const ps = getPointerStyle(primaryPointer.name);
                    cellBg = ps.bg;
                    cellText = "var(--cell-active-text)";
                    zClass = "relative z-10";
                    scaleClass = "scale-105";
                    borderStyle = { border: `2px solid ${ps.border}` };
                  }

                  return (
                    <div key={idx} className={`flex flex-col items-center shrink-0 ${scaleClass} transition-all duration-200`}>
                      <div
                        className={`w-12 h-12 flex items-center justify-center ${roundedClass} ${zClass}`}
                        style={{ background: cellBg, color: cellText, ...borderStyle }}
                      >
                        <span className="font-mono font-bold text-lg leading-none">
                          {JSON.stringify(val)}
                        </span>
                        {/* Index — bottom-left corner */}
                        <span
                          className="absolute bottom-0.5 left-1.5 font-mono text-[9px] font-bold select-none"
                          style={{
                            color: primaryPointer ? cellText : "var(--cell-index)",
                            opacity: 0.6,
                          }}
                        >
                          {idx}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
