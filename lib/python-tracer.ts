/**
 * lib/python-tracer.ts
 *
 * Runs user Python code inside Skulpt (browser Python runtime).
 * Uses sys.settrace to capture variable state at every line/call/return.
 * Converts raw events into the same TraceEvent[] shape the JS tracer produces.
 *
 * KEY CONSTRAINT: Skulpt does NOT implement the `json` module, so we use a
 * hand-written _to_json helper in the Python wrapper.
 */

import { TraceEvent } from "./tracer";

declare global {
  interface Window { Sk: any; }
}

// ─── Skulpt loader ────────────────────────────────────────────────────────────
let skulptLoadPromise: Promise<void> | null = null;

function loadSkulpt(): Promise<void> {
  if (skulptLoadPromise) return skulptLoadPromise;
  skulptLoadPromise = new Promise<void>((resolve, reject) => {
    const s1 = document.createElement("script");
    s1.src = "/skulpt/skulpt.min.js";
    s1.onload = () => {
      const s2 = document.createElement("script");
      s2.src = "/skulpt/skulpt-stdlib.js";
      s2.onload = () => resolve();
      s2.onerror = () => reject(new Error("Skulpt stdlib failed to load"));
      document.head.appendChild(s2);
    };
    s1.onerror = () => reject(new Error("Skulpt failed to load"));
    document.head.appendChild(s1);
  });
  return skulptLoadPromise;
}

// ─── Python wrapper ───────────────────────────────────────────────────────────
// Rules:
//  • NO import json (not implemented in Skulpt)
//  • NO import builtins (not implemented in Skulpt)
//  • NO compile() (may not be implemented)
//  • User code is embedded as a char-code array → 100% safe escaping
//  • User's print() goes directly to Skulpt output (not captured separately)
//  • Trace events are prefixed with |||T so JS can separate them
const PYTHON_WRAPPER_TPL = `
import sys

_events = []

# ── Minimal JSON serialiser (no import json needed) ──────────────────────────
def _js(s):
    r = ''
    for c in s:
        if c == '\\\\':
            r = r + '\\\\\\\\'
        elif c == '"':
            r = r + '\\\\"'
        elif c == '\\n':
            r = r + '\\\\n'
        elif c == '\\r':
            r = r + '\\\\r'
        elif c == '\\t':
            r = r + '\\\\t'
        else:
            r = r + c
    return '"' + r + '"'

def _jv(v):
    if v is None:
        return 'null'
    elif isinstance(v, bool):
        return 'true' if v else 'false'
    elif isinstance(v, int):
        return str(int(v))
    elif isinstance(v, float):
        return str(float(v))
    elif isinstance(v, str):
        return _js(v)
    elif isinstance(v, list):
        parts = []
        for x in v:
            parts.append(_jv(x))
        return '[' + ','.join(parts) + ']'
    else:
        try:
            return _js(str(v))
        except:
            return '"?"'

def _jd(d):
    parts = []
    for k in d:
        parts.append(_js(str(k)) + ':' + _jv(d[k]))
    return '{' + ','.join(parts) + '}'

def _make_ev(ev, ln, fn, loc, ret_val, has_ret, err):
    loc_str = _jd(loc)
    s = '{"ev":' + _js(ev) + ',"ln":' + str(ln) + ',"fn":' + _js(fn) + ',"loc":' + loc_str
    if has_ret:
        s = s + ',"ret":' + _jv(ret_val)
    if err is not None:
        s = s + ',"err":' + _js(str(err))
    s = s + '}'
    return s

# ── Tracer ────────────────────────────────────────────────────────────────────
def _tracer(frame, event, arg):
    fn = frame.f_code.co_name
    if str(fn).startswith('_'):
        return _tracer

    lineno = frame.f_lineno
    local_vars = {}
    try:
        locs = frame.f_locals
        for k in locs:
            ks = str(k)
            if ks.startswith('_'):
                continue
            try:
                v = locs[k]
                if isinstance(v, bool):
                    local_vars[ks] = True if v else False
                elif isinstance(v, int):
                    local_vars[ks] = int(v)
                elif isinstance(v, float):
                    local_vars[ks] = float(v)
                elif v is None:
                    local_vars[ks] = None
                elif isinstance(v, str):
                    local_vars[ks] = str(v)
                elif isinstance(v, list):
                    out = []
                    for x in v:
                        if isinstance(x, bool):
                            out.append(True if x else False)
                        elif isinstance(x, int):
                            out.append(int(x))
                        elif isinstance(x, float):
                            out.append(float(x))
                        elif x is None:
                            out.append(None)
                        elif isinstance(x, str):
                            out.append(str(x))
                        else:
                            out.append(str(x))
                    local_vars[ks] = out
                else:
                    local_vars[ks] = str(v)
            except:
                local_vars[ks] = '?'
    except:
        pass

    has_ret = False
    ret_val = None
    err_val = None

    if event == 'return' and arg is not None:
        has_ret = True
        try:
            if isinstance(arg, bool):
                ret_val = True if arg else False
            elif isinstance(arg, int):
                ret_val = int(arg)
            elif isinstance(arg, float):
                ret_val = float(arg)
            elif arg is None:
                ret_val = None
            elif isinstance(arg, str):
                ret_val = str(arg)
            elif isinstance(arg, list):
                out = []
                for x in arg:
                    if isinstance(x, (int, float, str, bool)) or x is None:
                        out.append(x)
                    else:
                        out.append(str(x))
                ret_val = out
            else:
                ret_val = str(arg)
        except:
            ret_val = '?'
    elif event == 'exception' and arg is not None:
        try:
            err_val = str(arg[1])
        except:
            err_val = 'exception'

    _events.append(_make_ev(event, lineno, str(fn), local_vars, ret_val, has_ret, err_val))
    return _tracer

# ── Embed user code as char codes (safe for any input) ───────────────────────
___ucode = ''.join([chr(c) for c in %%%CHARCODES%%%])

# ── Run ───────────────────────────────────────────────────────────────────────
sys.settrace(_tracer)
try:
    exec(___ucode)
except Exception as _ex:
    sys.settrace(None)
    _events.append(_make_ev('error', 0, '<module>', {}, None, False, str(_ex)))

sys.settrace(None)

# ── Output trace events (prefixed so JS can identify them) ────────────────────
for _ev in _events:
    print('|||T' + _ev)
`;

function buildWrapper(userCode: string): string {
  const charCodes = Array.from(userCode)
    .map((c) => c.charCodeAt(0))
    .join(",");
  return PYTHON_WRAPPER_TPL.replace("%%%CHARCODES%%%", `[${charCodes}]`);
}

// ─── Raw event shape ──────────────────────────────────────────────────────────
interface RawEvent {
  ev: "line" | "call" | "return" | "exception" | "error";
  ln: number;
  fn: string;
  loc: Record<string, any>;
  ret?: any;
  err?: string;
}

// ─── Convert raw events → TraceEvent[] ───────────────────────────────────────
function convertEvents(rawEvents: RawEvent[], printLines: string[]): TraceEvent[] {
  const events: TraceEvent[] = [];

  const frameStack: Array<{ name: string; variables: Record<string, any> }> = [
    { name: "global", variables: {} },
  ];
  const callStack: string[] = [];
  const heap: Record<string, any> = {};

  const processLocals = (rawLoc: Record<string, any>, scope: string) => {
    const vars: Record<string, any> = {};
    for (const [key, val] of Object.entries(rawLoc)) {
      if (Array.isArray(val)) {
        const refId = `py_${scope}_${key}`;
        heap[refId] = { type: "array", value: val };
        vars[key] = { __ref: refId };
      } else {
        vars[key] = val;
      }
    }
    return vars;
  };

  const snapEnv = () =>
    frameStack.map((f) => ({ name: f.name, variables: { ...f.variables } }));
  const snapHeap = () => ({ ...heap });
  const snapStack = () => [...callStack];

  const valStr = (v: any): string => {
    if (v === null || v === undefined) return "None";
    if (Array.isArray(v)) return `[${v.join(", ")}]`;
    return String(v);
  };

  for (const raw of rawEvents) {
    const { ev, ln, fn, loc } = raw;

    if (ev === "call") {
      const scopeName = fn === "<module>" ? "global" : fn;
      const vars = processLocals(loc, scopeName);
      frameStack.push({ name: scopeName, variables: vars });
      if (fn !== "<module>") {
        callStack.push(fn);
        events.push({
          type: "call-enter",
          label: `enter ${fn}`,
          name: fn,
          value: undefined,
          line: ln,
          env: snapEnv(),
          heap: snapHeap(),
          stack: snapStack(),
        });
      }
    } else if (ev === "line") {
      const topFrame = frameStack[frameStack.length - 1];
      const newVars = processLocals(loc, topFrame.name);

      // Detect changed variables → emit assignment events
      for (const [key, newVal] of Object.entries(newVars)) {
        const oldStr = JSON.stringify(topFrame.variables[key]);
        const newStr = JSON.stringify(newVal);
        if (oldStr !== newStr && topFrame.variables[key] !== undefined) {
          const display =
            newVal && typeof newVal === "object" && "__ref" in newVal
              ? `list[${heap[(newVal as any).__ref]?.value?.length ?? "?"}]`
              : valStr(newVal);
          events.push({
            type: "assignment",
            label: "assignment",
            name: key,
            value: display,
            line: ln,
            env: snapEnv(),
            heap: snapHeap(),
            stack: snapStack(),
          });
        }
      }

      topFrame.variables = newVars;

      events.push({
        type: "line",
        label: "step",
        name: undefined,
        value: undefined,
        line: ln,
        env: snapEnv(),
        heap: snapHeap(),
        stack: snapStack(),
      });
    } else if (ev === "return") {
      events.push({
        type: "return",
        label: "return",
        name: fn,
        value: raw.ret !== undefined ? valStr(raw.ret) : undefined,
        line: ln,
        env: snapEnv(),
        heap: snapHeap(),
        stack: snapStack(),
      });
      if (frameStack.length > 1) {
        frameStack.pop();
        if (fn !== "<module>") callStack.pop();
      }
    } else if (ev === "exception" || ev === "error") {
      events.push({
        type: "error",
        label: "runtime error",
        name: undefined,
        value: raw.err ?? "An error occurred",
        line: ln,
        env: snapEnv(),
        heap: snapHeap(),
        stack: snapStack(),
      });
    }
  }

  // User's print() output → log events appended at end
  for (const msg of printLines) {
    events.push({
      type: "log",
      label: "print",
      name: undefined,
      value: msg,
      line: 0,
      env: snapEnv(),
      heap: snapHeap(),
      stack: snapStack(),
    });
  }

  return events;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function buildPythonTrace(userCode: string): Promise<TraceEvent[]> {
  await loadSkulpt();

  const Sk = window.Sk;
  if (!Sk) throw new Error("Skulpt not available");

  const outputLines: string[] = [];

  Sk.configure({
    output: (text: string) => {
      // Skulpt calls this for every print(); split on newlines
      text.split("\n").forEach((ln) => {
        if (ln !== "") outputLines.push(ln);
      });
    },
    read: (filename: string) => {
      if (Sk.builtinFiles?.files[filename] !== undefined) {
        return Sk.builtinFiles.files[filename];
      }
      throw new Error(`File not found: '${filename}'`);
    },
    __future__: Sk.python3,
  });

  const wrapper = buildWrapper(userCode);

  try {
    await Sk.misceval.asyncToPromise(() =>
      Sk.importMainWithBody("<stdin>", false, wrapper, true)
    );
  } catch (err: any) {
    // Skulpt throws its own error types
    const raw: string = err?.toString?.() ?? String(err);
    // Strip Skulpt's verbose prefix: "Traceback ...\n...\nXxxError: msg"
    const match = raw.match(/(\w+Error|Exception):\s*(.+)$/m);
    const msg = match ? `${match[1]}: ${match[2]}` : raw.slice(0, 200);
    throw new Error(msg);
  }

  // Split output: |||T → trace events, everything else → user print lines
  const traceLines: string[] = [];
  const printLines: string[] = [];

  for (const line of outputLines) {
    if (line.startsWith("|||T")) {
      traceLines.push(line.slice(4));
    } else {
      // This is user's print() output
      printLines.push(line);
    }
  }

  // Parse raw events
  const rawEvents: RawEvent[] = [];
  for (const line of traceLines) {
    try {
      rawEvents.push(JSON.parse(line));
    } catch {
      /* skip malformed */
    }
  }

  if (rawEvents.length === 0 && printLines.length === 0) {
    throw new Error("No trace produced. Make sure the code is valid Python 3.");
  }

  return convertEvents(rawEvents, printLines);
}
