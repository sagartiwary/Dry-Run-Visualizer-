import * as acorn from "acorn";

export type StackFrame = {
  name: string;
  variables: Record<string, unknown>;
};

export type TraceEvent = {
  type: "assignment" | "branch" | "line" | "call-enter" | "call-exit" | "log" | "return" | "error";
  label: string;
  name?: string;
  value?: unknown;
  line?: number;
  env?: StackFrame[];
  heap?: Record<string, any>;
  stack?: string[];
};

function getIdentifiers(node: any): string[] {
  if (!node) return [];
  if (node.type === "Identifier") return [node.name];
  if (node.type === "ObjectPattern") {
    return node.properties.flatMap((p: any) => getIdentifiers(p.value));
  }
  if (node.type === "ArrayPattern") {
    return node.elements.filter(Boolean).flatMap((e: any) => getIdentifiers(e));
  }
  if (node.type === "AssignmentPattern") {
    return getIdentifiers(node.left);
  }
  if (node.type === "RestElement") {
    return getIdentifiers(node.argument);
  }
  if (node.type === "Property") {
    return getIdentifiers(node.value);
  }
  return [];
}

function getRootIdentifier(node: any): string | null {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression") return getRootIdentifier(node.object);
  return null;
}

function doesStatementProduceTrace(node: any): boolean {
  if (node.type === "VariableDeclaration") return true;
  if (node.type === "ReturnStatement") return true;
  if (
    node.type === "IfStatement" ||
    node.type === "WhileStatement" ||
    node.type === "DoWhileStatement" ||
    node.type === "ForStatement"
  ) {
    return true;
  }
  if (node.type === "ExpressionStatement") {
    const expr = node.expression;
    if (expr.type === "AssignmentExpression" || expr.type === "UpdateExpression") {
      return true;
    }
    if (expr.type === "CallExpression") {
      if (
        expr.callee.type === "MemberExpression" &&
        expr.callee.object.type === "Identifier" &&
        expr.callee.object.name === "console" &&
        expr.callee.property.type === "Identifier" &&
        expr.callee.property.name === "log"
      ) {
        return true;
      }
    }
  }
  return false;
}

function generate(node: any, isStatement = false): string {
  if (!node) return "";
  const line = node.loc?.start?.line ?? 1;

  switch (node.type) {
    case "Program":
      return node.body.map((s: any) => generateStatement(s)).join("\n");

    case "BlockStatement":
      return "{\n" + node.body.map((s: any) => generateStatement(s)).join("\n") + "\n}";

    case "EmptyStatement":
      return ";";

    case "ExpressionStatement":
      return generate(node.expression) + ";";

    case "VariableDeclaration": {
      const rawDecl = `${node.kind} ${node.declarations.map((d: any) => generate(d)).join(", ")}`;
      if (!isStatement) return rawDecl;
      const ids = node.declarations.flatMap((d: any) => getIdentifiers(d.id));
      const snaps = ids.map((id: string) => `___TRACE.snap("${id}", ${id}, ${line}, true);`).join(" ");
      return `${rawDecl}; ${snaps}`;
    }

    case "VariableDeclarator":
      return generate(node.id) + (node.init ? " = " + generate(node.init) : "");

    case "Identifier":
      return node.name;

    case "Literal":
      return node.raw;

    case "BinaryExpression":
    case "LogicalExpression":
      return `(${generate(node.left)} ${node.operator} ${generate(node.right)})`;

    case "UnaryExpression":
      return `(${node.operator}${generate(node.argument)})`;

    case "UpdateExpression": {
      const rootId = getRootIdentifier(node.argument);
      if (!rootId) return `${generate(node.argument)}${node.operator}`;
      if (node.prefix) {
        return `(++${generate(node.argument)}, ___TRACE.snap("${rootId}", ${rootId}, ${line}, false), ${generate(node.argument)})`;
      } else {
        return `(___TEMP = ${generate(node.argument)}, ${generate(node.argument)}++, ___TRACE.snap("${rootId}", ${rootId}, ${line}, false), ___TEMP)`;
      }
    }

    case "AssignmentExpression": {
      const rootId = getRootIdentifier(node.left);
      if (!rootId) return `${generate(node.left)} ${node.operator} ${generate(node.right)}`;
      return `(${generate(node.left)} ${node.operator} ${generate(node.right)}, ___TRACE.snap("${rootId}", ${rootId}, ${line}, false), ${generate(node.left)})`;
    }

    case "MemberExpression":
      if (node.computed) {
        return `${generate(node.object)}[${generate(node.property)}]`;
      } else {
        return `${generate(node.object)}.${generate(node.property)}`;
      }

    case "CallExpression": {
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "console" &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "log"
      ) {
        return `___TRACE.log([${node.arguments.map((a: any) => generate(a)).join(", ")}], ${line})`;
      }
      return `${generate(node.callee)}(${node.arguments.map((a: any) => generate(a)).join(", ")})`;
    }

    case "NewExpression":
      return `new ${generate(node.callee)}(${node.arguments.map((a: any) => generate(a)).join(", ")})`;

    case "ArrayExpression":
      return `[${node.elements.map((e: any) => (e ? generate(e) : "")).join(", ")}]`;

    case "ObjectExpression":
      return `{${node.properties.map((p: any) => generate(p)).join(", ")}}`;

    case "Property":
      if (node.shorthand) {
        return generate(node.key);
      }
      return `${generate(node.key)}: ${generate(node.value)}`;

    case "ThisExpression":
      return "this";

    case "ConditionalExpression":
      return `(${generate(node.test)} ? ${generate(node.consequent)} : ${generate(node.alternate)})`;

    case "BreakStatement":
      return "break;";

    case "ContinueStatement":
      return "continue;";

    case "ReturnStatement":
      return `return ___TRACE.ret(${node.argument ? generate(node.argument) : "undefined"}, ${line});`;

    case "IfStatement":
      return `if (___TRACE.branch(${generate(node.test)}, ${line}, "if")) ${generateStatement(node.consequent)} ${
        node.alternate ? "else " + generateStatement(node.alternate) : ""
      }`;

    case "WhileStatement":
      return `while (___TRACE.branch(${generate(node.test)}, ${line}, "while")) ${generateStatement(node.body)}`;

    case "DoWhileStatement":
      return `do ${generateStatement(node.body)} while (___TRACE.branch(${generate(node.test)}, ${line}, "do-while"));`;

    case "ForStatement":
      return `for (${node.init ? generate(node.init, false) : ""}; ${
        node.test ? "___TRACE.branch(" + generate(node.test) + ", " + line + ", 'for')" : ""
      }; ${node.update ? generate(node.update) : ""}) ${generateForBody(node)}`;

    case "FunctionDeclaration":
      return `function ${node.id.name}(${node.params.map((p: any) => generate(p)).join(", ")}) ${generateFunctionBody(
        node.id.name,
        node.params,
        node.body,
        line
      )}`;

    case "FunctionExpression":
      return `(function (${node.params.map((p: any) => generate(p)).join(", ")}) ${generateFunctionBody(
        null,
        node.params,
        node.body,
        line
      )})`;

    case "ArrowFunctionExpression":
      if (node.body.type !== "BlockStatement") {
        return `((${node.params.map((p: any) => generate(p)).join(", ")}) => ${generateArrowShorthandBody(
          node.params,
          node.body,
          line
        )})`;
      }
      return `((${node.params.map((p: any) => generate(p)).join(", ")}) => ${generateFunctionBody(
        null,
        node.params,
        node.body,
        line
      )})`;

    default:
      return "";
  }
}

function generateStatement(node: any): string {
  const line = node.loc?.start?.line ?? 1;
  const rawCode = generate(node, true);
  
  if (node.type === "BlockStatement") {
    return rawCode;
  }
  
  if (doesStatementProduceTrace(node)) {
    return rawCode;
  } else {
    return `{\n  ___TRACE.line(${line});\n  ${rawCode}\n}`;
  }
}

function generateForBody(node: any): string {
  const body = node.body;
  const line = node.loc?.start?.line ?? 1;
  let initSnaps = "";
  if (node.init && node.init.type === "VariableDeclaration") {
    const ids = node.init.declarations.flatMap((d: any) => getIdentifiers(d.id));
    initSnaps = ids.map((id: string) => `___TRACE.snap("${id}", ${id}, ${line}, true);`).join("\n");
  }
  if (body.type === "BlockStatement") {
    const statements = body.body.map((s: any) => generateStatement(s)).join("\n");
    return `{\n${initSnaps}\n${statements}\n}`;
  } else {
    return `{\n${initSnaps}\n${generateStatement(body)}\n}`;
  }
}

function generateFunctionBody(name: string | null, params: any[], body: any, line: number): string {
  const paramNames = params.flatMap(p => getIdentifiers(p));
  const paramObject = paramNames.map((name: string) => `${name}: ${name}`).join(", ");
  const statements = body.type === "BlockStatement" ? body.body : [body];
  const instrumentedBody = statements.map((s: any) => generateStatement(s)).join("\n");
  const functionNameStr = name ? `"${name}"` : "null";
  return `{\n___TRACE.enter(${functionNameStr}, { ${paramObject} }, ${line});\ntry {\n${instrumentedBody}\n} finally {\n___TRACE.exit(${functionNameStr}, ${line});\n}\n}`;
}

function generateArrowShorthandBody(params: any[], body: any, line: number): string {
  const paramNames = params.flatMap(p => getIdentifiers(p));
  const paramObject = paramNames.map((name: string) => `${name}: ${name}`).join(", ");
  const functionNameStr = "null";
  return `{\n___TRACE.enter(${functionNameStr}, { ${paramObject} }, ${line});\ntry {\nreturn ___TRACE.ret(${generate(
    body
  )}, ${line});\n} finally {\n___TRACE.exit(${functionNameStr}, ${line});\n}\n}`;
}

export const buildTrace = (source: string): TraceEvent[] => {
  const trace: TraceEvent[] = [];
  const callStack: string[] = [];

  // Scoped Stack Frames
  const envFrames: StackFrame[] = [{ name: "global", variables: {} }];

  // Persistent reference mapping for Heap Identity (Python Tutor model)
  const heapMap = new Map<any, string>();

  const serializeState = (frames: StackFrame[]): { frames: StackFrame[]; heap: Record<string, any> } => {
    const heap: Record<string, any> = {};
    const visitedInStep = new Set<string>();

    const serializeValue = (val: any): any => {
      if (val === null || val === undefined) return val;
      if (typeof val === "function") return `[Function: ${val.name || "anonymous"}]`;
      if (val instanceof Date) return val.toISOString();
      if (val instanceof RegExp) return val.toString();
      if (typeof val !== "object") return val;

      let refId = heapMap.get(val);
      if (!refId) {
        refId = `ref_${heapMap.size + 1}`;
        heapMap.set(val, refId);
      }

      if (!visitedInStep.has(refId)) {
        visitedInStep.add(refId);

        if (Array.isArray(val)) {
          // Serialize elements
          const serializedArr = val.map(serializeValue);
          heap[refId] = {
            type: "array",
            value: serializedArr,
          };
        } else {
          // Serialize key-value pairs
          const serializedObj: Record<string, any> = {};
          for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
              serializedObj[key] = serializeValue(val[key]);
            }
          }
          heap[refId] = {
            type: "object",
            value: serializedObj,
          };
        }
      }

      return { __ref: refId };
    };

    const serializedFrames = frames.map(frame => {
      const vars: Record<string, any> = {};
      for (const [k, v] of Object.entries(frame.variables)) {
        vars[k] = serializeValue(v);
      }
      return {
        name: frame.name,
        variables: vars,
      };
    });

    return {
      frames: serializedFrames,
      heap,
    };
  };

  const setVariable = (name: string, value: unknown, isDecl = false) => {
    if (isDecl) {
      const topFrame = envFrames[envFrames.length - 1];
      topFrame.variables[name] = value;
      return;
    }
    for (let i = envFrames.length - 1; i >= 0; i--) {
      const frame = envFrames[i];
      if (Object.prototype.hasOwnProperty.call(frame.variables, name)) {
        frame.variables[name] = value;
        return;
      }
    }
    const topFrame = envFrames[envFrames.length - 1];
    topFrame.variables[name] = value;
  };

  const recordEvent = (type: TraceEvent["type"], label: string, line: number, value?: any, name?: string) => {
    const { frames: serializedFrames, heap: serializedHeap } = serializeState(envFrames);
    trace.push({
      type,
      label,
      name,
      value,
      line,
      env: serializedFrames,
      heap: serializedHeap,
      stack: [...callStack],
    });
  };

  const helper = {
    events: trace,
    snap: (name: string, value: unknown, line: number, isDecl?: boolean) => {
      setVariable(name, value, isDecl);
      recordEvent("assignment", "assignment", line, value, name);
      return value;
    },
    branch: (value: unknown, line: number, type: string) => {
      recordEvent("branch", type, line, value);
      return value;
    },
    line: (line: number) => {
      recordEvent("line", "step", line);
    },
    enter: (name: string | null, params: Record<string, unknown>, line: number) => {
      const displayName = name || "(anonymous)";
      callStack.push(displayName);
      
      const newFrame: StackFrame = {
        name: displayName,
        variables: {},
      };
      for (const [k, v] of Object.entries(params)) {
        newFrame.variables[k] = v;
      }
      envFrames.push(newFrame);

      recordEvent("call-enter", `enter ${displayName}`, line, params, displayName);
    },
    exit: (name: string | null, line: number) => {
      const displayName = name || "(anonymous)";
      callStack.pop();
      envFrames.pop();
      
      recordEvent("call-exit", `exit ${displayName}`, line, undefined, displayName);
    },
    ret: (value: unknown, line: number) => {
      recordEvent("return", "return", line, value);
      return value;
    },
    log: (values: unknown[], line: number) => {
      recordEvent("log", "console.log", line, values);
      return values[values.length - 1];
    },
  };

  try {
    const ast = acorn.parse(source, { ecmaVersion: 2020, locations: true, allowReturnOutsideFunction: true });
    const instrumented = generate(ast);

    const wrappedCode = `
      let ___TEMP;
      return (function() {
        ${instrumented}
      }).call(this);
    `;
    const fn = new Function("___TRACE", wrappedCode);
    fn(helper);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    trace.push({ type: "error", label: "runtime error", value: message });
    throw new Error(message);
  }

  return trace;
};
