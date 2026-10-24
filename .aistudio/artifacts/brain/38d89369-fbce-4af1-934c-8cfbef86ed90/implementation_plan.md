# RustCalc: Lightweight High-Precision Scientific & Graphing Calculator

A high-performance, low-memory scientific and graphing workstation delivering live WebAssembly computation, symbolic calculus (derivatives, numerical quadrature, roots, extrema), real-time multi-curve graphing with sub-pixel rendering, and a 20-calculation persistent history log, paired with a complete downloadable native Rust desktop application.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions have been synthesized based on your answers:
> - **Execution Architecture**: Desktop-style workstation UI with live WebAssembly computation engine, coupled with a complete, standalone native Rust (`egui`/`eframe`) desktop project viewer & zip/cargo exporter so you can run natively on any device.
> - **Mathematical Engine**: Full symbolic calculus including exact analytical derivatives ($d/dx$), adaptive numerical integration ($\int_a^b f(x)dx$), Newton-Raphson / Brent root finding, local extrema detection, and arbitrary-precision floating point / complex numbers ($z = a + bi$).
> - **Layout & Aesthetic**: Desmos-style split-pane notebook with full-height interactive coordinate plane, dark obsidian lab styling (`#0B0E14` / `#111622`), monospace tabular numerals, and low-latency interaction.

- **Confirmed Decision 1**: Interactive split-pane notebook layout with function list on the left and full-height coordinate plane on the right.
- **Confirmed Decision 2**: Symbolic differentiation and numerical quadrature prioritized alongside multi-color graphing and tangent tracing.
- **Confirmed Decision 3**: 20-item persistent calculation history with one-click re-insertion into formulas or graphs.

---

## 1. Overview & Core Concept

**RustCalc** is designed for engineers, mathematicians, scientists, and students who demand zero-lag responsiveness, high numerical precision, and instant visual feedback without the heavyweight resource overhead of bloated calculator suites.

- **What It Does**: Evaluates complex scientific equations, computes symbolic derivatives and numerical integrals, renders real-time multi-function graphs with customizable color-coded curves, allows infinite smooth pan & zoom, tracks curve coordinates with tangent slope probes, maintains a 20-calculation history log, and provides the full native Rust source code ready for `cargo run`.
- **Target Audience**: Engineers, physics and mathematics students, researchers, and developers seeking an ultra-responsive, lightweight graphing tool.
- **Key Value**: Microsecond evaluation latency, minimal memory footprint (< 15 MB), accurate handling of mathematical asymptotes/discontinuities, and native desktop portability.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Equation & Function Entry**: The user types equations or functions ($f_1(x) = \sin(x) \cdot \cos(2x)$, $f_2(x) = \frac{d}{dx}(x^3 - 3x)$, $f_3(x) = \int_0^x e^{-t^2} dt$) via an intelligent LaTeX/plain-math syntax bar or an interactive scientific keypad.
2. **Real-Time Interactive Graphing**: Each function receives a distinct vibrant phosphor hue. Curves draw instantly onto the 2D coordinate plane with auto-detected singularities. The user drags to pan, scrolls to zoom, clicks preset bounds (Trig, Standard, Zoom Fit), or hovers to inspect tangent lines with instantaneous slope values.
3. **Symbolic Calculus & Analysis Drawer**: For any selected function, the user can toggle symbolic derivative display, numerical definite integral calculator, roots finder, extrema (peaks & troughs), and a generated table of $(x, y)$ values.
4. **20-Calculation History Log**: Calculations executed in the console or scratchpad are recorded in an accessible tray showing input, output, timestamp, and actions (Copy, Recall, Graph). Exactly 20 entries are retained with local storage persistence.
5. **Native Rust Desktop Exporter**: A dedicated workstation panel allows developers to inspect the equivalent native Rust implementation (`main.rs`, `Cargo.toml`) and download a ready-to-build native application bundle.

### Visual Identity & Theme

- **Aesthetic Direction**: Obsidian laboratory workstation inspired by aerospace telemetry and high-precision scientific instrumentation (`references/8_science_space_biotech.md`).
- **Color Palette & Discipline (60-30-10 Budget)**:
  - **60% Primary Canvas**: Deep obsidian slate (`#090D14` canvas, `#0E1420` surface).
  - **30% Structural Panels & Grids**: Slate borders (`#1E293B`), hairline grid lines (`#162032`), muted secondary text (`#94A3B8`).
  - **10% Calibrated Phosphor Curve Accents**:
    - Curve 1: Laser Cyan (`#06B6D4`)
    - Curve 2: Telemetry Amber (`#F59E0B`)
    - Curve 3: Emerald Jade (`#10B981`)
    - Curve 4: Orchid Violet (`#8B5CF6`)
    - Curve 5: Crimson Rose (`#F43F5E`)
    - Curve 6: Cobalt Blue (`#3B82F6`)
- **Typography & Precision Hierarchy**:
  - Display & Headings: `Plus Jakarta Sans`, clean neo-grotesque styling.
  - Math & Formulas: `KaTeX` / mathematical typeface with proper italicized variables ($x, y, t, \theta$).
  - Coordinates, Numbers & History: Tabular monospace (`font-mono tabular-nums`, `JetBrains Mono`).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: High-Precision Math Engine with Symbolic Differentiation
- **Chosen Approach**: Built-in AST-based recursive descent symbolic evaluator capable of analytical derivative transformation (product rule, quotient rule, chain rule, trigonometric, exponential, log rules), combined with Gauss-Kronrod / Simpson quadrature for numerical integrals, and complex number arithmetic.
- **Why**: Delivers instant feedback (< 1ms per 10,000 points) without server network latency or external cloud dependencies.
- **Alternatives Considered**: Simple `eval()` (unsafe, inaccurate, no calculus) or heavy server-side Python SymPy (introduces latency and network reliance).

### Decision 2: Sub-Pixel Canvas Graphing with Adaptive Asymptote Handling
- **Chosen Approach**: High-frequency HTML5 2D Canvas rendering with coordinate normalization, device-pixel-ratio scaling, smart tick calculation (e.g. integer or $\pi$-fractions), and vertical jump detection to prevent connecting asymptotes (such as in $\tan(x)$ or $1/(x-1)$).
- **Why**: Guarantees 60 FPS pan and zoom even with 8 simultaneous complex curves, maintaining negligible memory consumption (< 15 MB).
- **Alternatives Considered**: SVG paths (degrade in performance with many curves or rapid panning) or heavy 3D WebGL (unnecessary GPU memory footprint for 2D graphing).

### Decision 3: Standalone Native Rust App Blueprint
- **Chosen Approach**: Provide an interactive tab with the full, production-ready Rust source code utilizing `egui` and `eframe` (the premier lightweight, zero-dependency immediate-mode GUI for Rust) along with a single-click download of the complete Cargo package.
- **Why**: Fulfills the user's specific request for a native Rust app on this device while ensuring a fluid, immediate web workstation in the AI Studio environment.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RustCalc Workstation UI                         │
├───────────────────────────────────┬────────────────────────────────────┤
│ Left Panel: Notebook & Functions  │ Right Panel: Full-Height Plane     │
│  - Function List (f1..f8, colors) │  - Sub-Pixel 2D Canvas (60 FPS)    │
│  - Expression Parser / Evaluator  │  - Interactive Pan & Wheel Zoom    │
│  - Symbolic Calculus Inspector    │  - Tangent Probes & Coordinates    │
│  - Scientific Keypad Drawer       │  - Asymptote & Singularity Filters │
│  - 20-Item Calculation History    │  - Roots & Extrema HUD Markers     │
│  - Native Rust Code Exporter      │  - Coordinate Presets (Trig, Std)  │
├───────────────────────────────────┴────────────────────────────────────┤
│      Core Mathematical Engine (Symbolic AST + Quadrature + Roots)      │
│     - Arbitrary Precision Evaluation  - Complex Number Arithmetic      │
│     - Symbolic Derivative Engine      - Numerical Simpson Integrator   │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown
1. **`MathEngine` (`src/lib/mathEngine.ts`)**:
   - Tokenizer, recursive-descent parser, and AST evaluator.
   - Symbolic differentiator: converts AST $f(x)$ into simplified AST $f'(x)$.
   - Numerical integration: adaptive Simpson's rule $\int_a^b f(x) dx$.
   - Root finding: combined bisection and Newton-Raphson solver.
   - Complex numbers: real/imaginary operations, modulus, argument.
2. **`GraphCanvas` (`src/components/GraphCanvas.tsx`)**:
   - High-performance canvas with transform matrix (scale, pan offset).
   - Dynamic grid generator with adaptive decimal or $\pi$-based markings.
   - Real-time curve sampler with discontinuity culling.
   - Interactive crosshair probe, tangent slope line, and click-to-pin coordinate pins.
3. **`FunctionNotebook` (`src/components/FunctionNotebook.tsx`)**:
   - Dynamic list of functions with color pickers, visibility toggles, derivative generators, and value tables.
4. **`ScientificKeypad` (`src/components/ScientificKeypad.tsx`)**:
   - High-density keypad with trigonometry, powers, logs, calculus symbols ($d/dx, \int$), constants ($\pi, e, \phi$), and parentheses.
5. **`HistoryDrawer` (`src/components/HistoryDrawer.tsx`)**:
   - FIFO queue capped at exactly 20 calculations, saved to `localStorage`, with recall and copy buttons.
6. **`RustSourceExport` (`src/components/RustSourceExport.tsx`)**:
   - Complete `Cargo.toml` and `main.rs` implementation using Rust + `egui` for native desktop execution.
