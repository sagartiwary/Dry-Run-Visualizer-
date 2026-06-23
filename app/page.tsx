"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Editor, { Monaco, loader } from "@monaco-editor/react";
import { buildTrace, TraceEvent } from "../lib/tracer";
import { buildPythonTrace } from "../lib/python-tracer";
import Header from "../components/Header";
import VariableCards from "../components/VariableCards";
import ArrayBoard from "../components/ArrayBoard";
import StepperToolbar from "../components/StepperToolbar";
import StepLabel from "../components/StepLabel";
import ConsoleOutput from "../components/ConsoleOutput";
import { useTheme } from "../context/ThemeContext";

loader.config({ paths: { vs: "/vs" } });

type Language = "javascript" | "python";

// ─── JS Examples ─────────────────────────────────────────────────────────────
const JS_EXAMPLES = [
  {
    id: "next-greater",
    name: "Next Greater Element",
    category: "Stack",
    pointers: { arr: ["i", "ind"] },
    code: `function nextGreaterElements(arr) {
  let n = arr.length;
  let ans = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    let currEle = arr[i];

    for (let j = 1; j < n; j++) {
      let ind = (j + i) % n;

      if (arr[ind] > currEle) {
        ans[i] = arr[ind];
        break;
      }
    }
  }

  return ans;
}

console.log(nextGreaterElements([5, 7, 1, 7, 6, 0]));
`,
  },
  {
    id: "binary-search",
    name: "Binary Search",
    category: "Searching",
    pointers: { arr: ["low", "mid", "high"] },
    code: `function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    let mid = Math.floor((low + high) / 2);

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}

console.log(binarySearch([1, 3, 5, 7, 9, 11, 13], 7));
`,
  },
  {
    id: "two-pointer",
    name: "Two Sum (Two Pointer)",
    category: "Two Pointer",
    pointers: { arr: ["left", "right"] },
    code: `function twoSum(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    let sum = arr[left] + arr[right];

    if (sum === target) {
      return [left, right];
    } else if (sum < target) {
      left = left + 1;
    } else {
      right = right - 1;
    }
  }

  return [-1, -1];
}

console.log(twoSum([1, 2, 3, 5, 8, 13], 10));
`,
  },
  {
    id: "bubble-sort",
    name: "Bubble Sort",
    category: "Sorting",
    pointers: { arr: ["i", "j"] },
    code: `function bubbleSort(arr) {
  let n = arr.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }

  return arr;
}

console.log(bubbleSort([64, 34, 25, 12, 22, 11, 90]));
`,
  },
];

// ─── Python Examples ──────────────────────────────────────────────────────────
const PY_EXAMPLES = [
  {
    id: "py-binary-search",
    name: "Binary Search",
    category: "Searching",
    pointers: { arr: ["low", "mid", "high"] },
    code: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1

    while low <= high:
        mid = (low + high) // 2

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1

arr = [1, 3, 5, 7, 9, 11, 13]
result = binary_search(arr, 7)
print(result)
`,
  },
  {
    id: "py-two-pointer",
    name: "Two Sum (Two Pointer)",
    category: "Two Pointer",
    pointers: { arr: ["left", "right"] },
    code: `def two_sum(arr, target):
    left = 0
    right = len(arr) - 1

    while left < right:
        total = arr[left] + arr[right]

        if total == target:
            return [left, right]
        elif total < target:
            left = left + 1
        else:
            right = right - 1

    return [-1, -1]

arr = [1, 2, 3, 5, 8, 13]
result = two_sum(arr, 10)
print(result)
`,
  },
  {
    id: "py-bubble-sort",
    name: "Bubble Sort",
    category: "Sorting",
    pointers: { arr: ["i", "j"] },
    code: `def bubble_sort(arr):
    n = len(arr)

    for i in range(n - 1):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                temp = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = temp

    return arr

arr = [64, 34, 25, 12, 22, 11]
result = bubble_sort(arr)
print(result)
`,
  },
  {
    id: "py-linear-search",
    name: "Linear Search",
    category: "Searching",
    pointers: { arr: ["i"] },
    code: `def linear_search(arr, target):
    n = len(arr)

    for i in range(n):
        if arr[i] == target:
            return i

    return -1

arr = [4, 2, 9, 7, 5, 1, 8]
result = linear_search(arr, 7)
print(result)
`,
  },
];

// ─── Smart-step types ─────────────────────────────────────────────────────────
const MEANINGFUL_TYPES = new Set([
  "assignment", "branch", "call-enter", "call-exit", "return", "log", "error",
]);

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Language state ──
  const [language, setLanguage] = useState<Language>("javascript");
  const examples = language === "javascript" ? JS_EXAMPLES : PY_EXAMPLES;

  // ── Editor / trace state ──
  const [selectedExampleId, setSelectedExampleId] = useState(examples[0].id);
  const [source, setSource] = useState(examples[0].code);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [selectedStep, setSelectedStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);
  const [smartStep, setSmartStep] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  // Monaco refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Derived
  const current = trace[selectedStep] ?? null;
  const next = trace[selectedStep + 1] ?? null;
  const currentLine = current?.line ?? null;
  const nextLine = next?.line ?? null;
  const currentStack: string[] = current?.stack ?? [];

  const currentFrames = current?.env ?? [{ name: "global", variables: {} }];
  const currentHeap = current?.heap ?? {};

  const activeFrame = useMemo(
    () => currentFrames[currentFrames.length - 1] ?? { name: "global", variables: {} },
    [currentFrames]
  );
  const activeVariables = useMemo(() => activeFrame.variables, [activeFrame]);
  const activeExample = useMemo(() => examples.find((ex) => ex.id === selectedExampleId), [examples, selectedExampleId]);
  const activePointersConfig = useMemo(() => activeExample?.pointers, [activeExample]);

  const cardVariables = useMemo(() => {
    return Object.entries(activeVariables).filter(([name, val]) => {
      if (name.startsWith("___")) return false;
      if (val && typeof val === "object" && "__ref" in val) {
        const heapItem = currentHeap[(val as { __ref: string }).__ref];
        if (heapItem?.type === "array") return false;
      }
      return true;
    });
  }, [activeVariables, currentHeap]);

  const arrayVariables = useMemo(() => {
    const arrs: Array<{ name: string; array: unknown[] }> = [];
    for (const [name, val] of Object.entries(activeVariables)) {
      if (name.startsWith("___")) continue;
      if (val && typeof val === "object" && "__ref" in val) {
        const heapItem = currentHeap[(val as { __ref: string }).__ref];
        if (heapItem?.type === "array") arrs.push({ name, array: heapItem.value as unknown[] });
      }
    }
    return arrs;
  }, [activeVariables, currentHeap]);

  // ── Trace compilation ──
  const runTrace = useCallback(async () => {
    setError(null);
    setIsPlaying(false);
    setIsBuilding(true);
    try {
      let built: TraceEvent[];
      if (language === "python") {
        built = await buildPythonTrace(source);
      } else {
        built = buildTrace(source);
      }
      setTrace(built);
      setSelectedStep(0);
    } catch (err) {
      setTrace([]);
      setSelectedStep(0);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBuilding(false);
    }
  }, [source, language]);

  useEffect(() => {
    const t = setTimeout(runTrace, language === "python" ? 800 : 300);
    return () => clearTimeout(t);
  }, [runTrace]);

  // ── Autoplay ──
  useEffect(() => {
    if (!isPlaying || trace.length === 0) return;
    const t = setInterval(() => {
      setSelectedStep((prev) => {
        if (prev >= trace.length - 1) { setIsPlaying(false); return prev; }
        if (smartStep) {
          let nxt = prev + 1;
          while (nxt < trace.length - 1 && !MEANINGFUL_TYPES.has(trace[nxt].type)) nxt++;
          return nxt;
        }
        return prev + 1;
      });
    }, playbackSpeed);
    return () => clearInterval(t);
  }, [isPlaying, playbackSpeed, trace, smartStep]);

  // ── Monaco decorations ──
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const decs: any[] = [];
    if (currentLine) decs.push({ range: new monaco.Range(currentLine, 1, currentLine, 1), options: { isWholeLine: true, className: "line-decor-current" } });
    if (nextLine)    decs.push({ range: new monaco.Range(nextLine, 1, nextLine, 1),       options: { isWholeLine: true, className: "line-decor-next" } });
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decs);
    if (currentLine) editor.revealLineInCenterIfOutsideViewport(currentLine);
  }, [currentLine, nextLine]);

  // ── Stepper ──
  const stepBack = useCallback(() => {
    setIsPlaying(false);
    setSelectedStep((i) => {
      if (!smartStep) return Math.max(0, i - 1);
      let prev = i - 1;
      while (prev > 0 && !MEANINGFUL_TYPES.has(trace[prev]?.type)) prev--;
      return Math.max(0, prev);
    });
  }, [smartStep, trace]);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setSelectedStep((i) => {
      if (!smartStep) return Math.min(trace.length - 1, i + 1);
      let nxt = i + 1;
      while (nxt < trace.length - 1 && !MEANINGFUL_TYPES.has(trace[nxt]?.type)) nxt++;
      return Math.min(trace.length - 1, nxt);
    });
  }, [smartStep, trace]);

  // ── Global keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const inEditor =
        active?.closest(".monaco-editor") !== null ||
        active?.classList.contains("inputarea") ||
        (active instanceof HTMLTextAreaElement && active.closest(".monaco-editor") !== null);
      if (inEditor) return;
      if (e.key === "ArrowLeft")       { e.preventDefault(); stepBack(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); stepForward(); }
      else if (e.key === " ")          { e.preventDefault(); setIsPlaying((p) => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stepBack, stepForward]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  // ── Language switch ──
  const switchLanguage = (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang);
    const newExamples = lang === "javascript" ? JS_EXAMPLES : PY_EXAMPLES;
    setSelectedExampleId(newExamples[0].id);
    setSource(newExamples[0].code);
    setTrace([]);
    setSelectedStep(0);
    setError(null);
    setIsPlaying(false);
  };

  // ── Example selection ──
  const selectExample = (id: string) => {
    const ex = examples.find((e) => e.id === id);
    if (!ex) return;
    setSelectedExampleId(id);
    setSource(ex.code);
    setSelectedStep(0);
    setIsPlaying(false);
  };

  const hasLogs = trace.some((ev) => ev.type === "log");

  return (
    <main
      className="h-screen p-5 flex flex-col font-sans transition-colors duration-200 overflow-hidden"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Header />

      {/* Example selector tabs */}
      <div className="flex items-center gap-2 mb-4 shrink-0 flex-wrap">
        {examples.map((ex) => {
          const active = ex.id === selectedExampleId;
          return (
            <button
              key={ex.id}
              onClick={() => selectExample(ex.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none active:scale-95"
              style={
                active
                  ? { background: "var(--border-accent)", color: "#fff", border: "1px solid var(--border-accent)" }
                  : { background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-base)" }
              }
            >
              <span className="mr-1.5 opacity-60 text-[10px]">{ex.category}</span>
              {ex.name}
            </button>
          );
        })}
      </div>

      {/* Main workspace */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* ── Editor Panel ── */}
        <section
          className="w-[46%] rounded-2xl p-5 flex flex-col min-h-0 relative transition-colors duration-200 shrink-0"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-base)" }}
        >
          {/* Editor header with language switcher */}
          <div className="flex justify-between items-center mb-3 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--border-base)" }} />
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                Source Editor
              </h2>
            </div>

            {/* Language toggle */}
            <div
              className="flex items-center rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border-base)" }}
            >
              {(["javascript", "python"] as Language[]).map((lang) => {
                const active = lang === language;
                return (
                  <button
                    key={lang}
                    onClick={() => switchLanguage(lang)}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all duration-150"
                    style={
                      active
                        ? { background: "var(--border-accent)", color: "#fff" }
                        : { background: "transparent", color: "var(--text-muted)" }
                    }
                  >
                    {lang === "javascript" ? "JS" : "PY"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 rounded-xl overflow-hidden min-h-0" style={{ border: "1px solid var(--border-base)" }}>
            <Editor
              height="100%"
              language={language}
              theme={isDark ? "vs-dark" : "vs"}
              value={source}
              onChange={(val) => setSource(val ?? "")}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 13,
                fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                lineNumbersMinChars: 3,
                padding: { top: 14, bottom: 14 },
                renderLineHighlight: "none",
              }}
            />
          </div>

          {/* Building spinner overlay */}
          {isBuilding && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: "var(--bg-panel)", border: "1px solid var(--border-base)", color: "var(--text-secondary)" }}>
                <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Running Python…
              </div>
            </div>
          )}

          {/* Compilation error overlay */}
          {error && !isBuilding && (
            <div className="absolute bottom-5 left-5 right-5 p-3 bg-red-950/90 border border-red-800/80 text-red-200 text-xs font-mono rounded-xl shadow-xl backdrop-blur-md">
              <div className="font-bold uppercase text-[9px] tracking-wider text-red-400 mb-1">
                {language === "python" ? "Python Error" : "Compilation Error"}
              </div>
              {error}
            </div>
          )}
        </section>

        {/* ── Execution Board ── */}
        <section
          className="flex-1 rounded-2xl p-5 flex flex-col min-h-0 shadow-xl relative transition-colors duration-200"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-base)" }}
        >
          {/* Board header with call stack */}
          <div
            className="flex items-center gap-2 mb-3 shrink-0 select-none pb-3"
            style={{ borderBottom: "1px solid var(--border-soft)" }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
              Execution Board
            </h2>

            {/* Language pill */}
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ml-1"
              style={{
                background: language === "python" ? "rgba(250,204,21,0.12)" : "rgba(96,165,250,0.12)",
                color: language === "python" ? "#facc15" : "#60a5fa",
                border: `1px solid ${language === "python" ? "rgba(250,204,21,0.25)" : "rgba(96,165,250,0.25)"}`,
              }}
            >
              {language === "python" ? "🐍 Python" : "⚡ JavaScript"}
            </span>

            {/* Call stack breadcrumb */}
            {currentStack.length > 0 && (
              <div className="flex items-center gap-1 ml-2 overflow-hidden">
                {currentStack.map((fn, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>›</span>}
                    <span
                      className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        background: idx === currentStack.length - 1 ? "rgba(96,165,250,0.15)" : "var(--bg-surface)",
                        color: idx === currentStack.length - 1 ? "#60a5fa" : "var(--text-muted)",
                        border: `1px solid ${idx === currentStack.length - 1 ? "rgba(96,165,250,0.3)" : "var(--border-base)"}`,
                      }}
                    >
                      {fn}()
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Step label */}
          {trace.length > 0 && (
            <div className="mb-3 shrink-0">
              <StepLabel event={current} stepIndex={selectedStep} totalSteps={trace.length} />
            </div>
          )}

          {/* Board scroll area */}
          <div className="flex-1 flex flex-col justify-start gap-4 overflow-y-auto pr-1 min-h-0">
            {trace.length === 0 && !isBuilding ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 py-10 select-none">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-base)" }}
                >
                  {language === "python" ? "🐍" : "🧩"}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
                    No trace yet
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Write valid {language === "python" ? "Python" : "JavaScript"} in the editor<br />
                    or pick an example above to begin.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <VariableCards cardVariables={cardVariables} />
                <ArrayBoard
                  arrayVariables={arrayVariables}
                  activeVariables={activeVariables}
                  activePointersConfig={activePointersConfig}
                  activeExample={!!activeExample}
                />
                {hasLogs && <ConsoleOutput trace={trace} currentStep={selectedStep} />}
              </>
            )}
          </div>

          <StepperToolbar
            selectedStep={selectedStep}
            setSelectedStep={setSelectedStep}
            traceLength={trace.length}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            stepBack={stepBack}
            stepForward={stepForward}
            smartStep={smartStep}
            setSmartStep={setSmartStep}
          />
        </section>

      </div>
    </main>
  );
}
