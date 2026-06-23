# Dry Run Visualizer

A learning-first Next.js app that accepts JavaScript code, runs a simple instrumentation-based tracer, and lets you step through execution visually.

## What is included

- `app/page.tsx` — main UI with a code editor, run button, trace list, and step controls.
- `lib/tracer.ts` — a minimal JS tracer that instruments assignments, returns, and `console.log` calls, then executes the code and records trace events.
- `app/page.module.css` and `app/globals.css` — styling for a clean editor and visualizer interface.

## How to run

```bash
cd c:/Users/Sagar/OneDrive/Desktop/Dry_Run_Visualizer
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Learning path

1. Open `lib/tracer.ts` and read how source text is rewritten to record events.
2. Open `app/page.tsx` and follow how the trace is created, stored, and displayed.
3. Modify the example code in the editor and rerun it to see live trace updates.
4. Add new trace events or improve the tracer to support more JavaScript patterns.

## Why this design?

- We use a small tracer first because it gives a simple, visible mapping from code to execution steps.
- `lib/tracer.ts` does not try to execute arbitrary code directly; it rewrites assignments and `console.log` statements to capture values.
- `app/page.tsx` keeps the UI simple so you can focus on how the trace data is generated and rendered.
- This is a learning-first approach: build the smallest working version, then expand.

## How you can learn while I build

- Read before changing: inspect the current `tracer.ts` and `page.tsx` files, and ask why each section exists.
- Make a small change, run it, and then inspect the new trace. For example, change the `fib` function to `fib(6)` and see how the trace grows.
- After you understand the current JavaScript flow, we can add a second language step by step.
- I will explain each change before applying it, and you can then try editing the project yourself.

## Next steps

- Add support for Python using Pyodide.
- Add multi-language parsing and a shared trace format.
- Improve the UI with syntax highlighting and source-range highlighting.
