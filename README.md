# Dry Run Visualizer

Dry Run Visualizer is an interactive, browser-based learning tool that shows how JavaScript and Python programs execute one step at a time. It connects each executed line with the current variables, arrays, pointers, call stack, and console output, making it easier to understand algorithms without tracing them manually on paper.

## Features

- JavaScript and Python execution visualization
- Monaco-powered source editor with syntax highlighting
- Automatic tracing as the code changes
- Current and upcoming source-line highlighting
- Variable values grouped by the active stack frame
- Array visualization with indexes and pointer markers
- Call-stack and console-output tracking
- Back, forward, play, and pause controls
- Adjustable playback delay and a Smart Step mode for skipping minor events
- Progress slider for jumping directly to any execution step
- Built-in examples for searching, sorting, stacks, and two-pointer algorithms
- Light and dark themes with the preference saved locally
- Keyboard shortcuts for faster navigation

## How It Works

The application converts a program into a sequence of trace events and renders the state captured at each event.

- **JavaScript:** the source is parsed with Acorn and instrumented before being executed in the browser.
- **Python:** the program runs in the browser through Skulpt and uses a tracing wrapper to collect execution state.
- **Visualizer:** each trace event contains information such as the source line, event type, variables, heap values, and call stack. The React interface uses that snapshot to update the execution board.

No backend or external code-execution service is required.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18.17 or later
- npm (included with Node.js)

### Installation

```bash
git clone https://github.com/sagartiwary/Dry-Run-Visualizer-.git
cd Dry-Run-Visualizer-
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To create and run a production build:

```bash
npm run build
npm start
```

## Using the Visualizer

1. Select **JS** or **PY** in the source editor.
2. Choose a built-in example or replace it with your own code.
3. Wait briefly while the trace is generated automatically.
4. Use **Back**, **Forward**, or **Play** to move through execution.
5. Watch the highlighted line, variables, arrays, pointers, call stack, and console output update at each step.
6. Enable **Smart Step** to jump between meaningful events such as assignments, branches, function calls, returns, and output.

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Left Arrow` | Previous step |
| `Right Arrow` | Next step |
| `Space` | Play or pause |

Shortcuts are disabled while focus is inside the code editor, so normal editing remains unaffected.

## Built-in Examples

The project includes ready-to-run examples such as:

- Binary Search
- Linear Search (Python)
- Bubble Sort
- Two Sum using two pointers
- Next Greater Element (JavaScript)

These examples also define pointer mappings so variables such as `low`, `mid`, `high`, `left`, `right`, `i`, and `j` appear above the appropriate array cells.

## Project Structure

```text
Dry_Run_Visualizer/
├── app/
│   ├── globals.css          # Global styles and theme variables
│   ├── layout.tsx           # Root layout and application metadata
│   └── page.tsx             # Main editor and visualization workspace
├── components/              # Execution board and control components
├── context/
│   └── ThemeContext.tsx     # Theme state and persistence
├── lib/
│   ├── tracer.ts            # JavaScript parser and tracer
│   └── python-tracer.ts     # Skulpt-based Python tracer
├── public/
│   ├── skulpt/              # Browser Python runtime assets
│   └── vs/                  # Local Monaco Editor assets
└── package.json             # Dependencies and npm scripts
```

## Technology Stack

- [Next.js 14](https://nextjs.org/)
- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Acorn](https://github.com/acornjs/acorn)
- [Skulpt](https://skulpt.org/)

## Current Scope and Limitations

This project is an educational visualizer, not a full JavaScript or Python debugger.

- The custom tracers are designed around common algorithm and data-structure examples; advanced language syntax, asynchronous code, imports, browser APIs, and some complex objects may not be traced correctly.
- Python support is limited to the language features and standard-library modules available in Skulpt.
- Code is executed locally in the browser. Avoid running unknown or untrusted snippets.
- Array pointer highlighting is automatic for common pointer names in custom snippets and explicitly configured for the built-in examples.
- The current layout is optimized for desktop-sized screens.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create an optimized production build |
| `npm start` | Run the production build |
| `npm run lint` | Run the configured Next.js linter |

## Contributing

Contributions are welcome. To propose a change:

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature-name`.
3. Make and test your changes.
4. Commit them with a clear message.
5. Push the branch and open a pull request.

Useful areas for future improvement include broader syntax support, more languages and examples, responsive layouts, richer object visualization, and automated tests for both tracers.

## License

No license has been added yet. Add a `LICENSE` file before distributing the project under a specific open-source license.
