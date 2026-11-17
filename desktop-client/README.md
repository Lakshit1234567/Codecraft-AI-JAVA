# BreakMyCode — Minimal Desktop Client

A lightweight, docked desktop window designed for competitive programmers and DSA students. It eliminates terminal piping, automates differential stress-testing, and connects with the Spring Boot backend for AI suite synthesis, live failure diagnosis, and test case archival.

---

## 🚀 Quick Start

Ensure Node.js is installed. No external npm packages are needed (pure Node standard library):

```bash
cd desktop-client
npm start
# or: node runner.js
```

The runner will start on `http://localhost:4321` and automatically open a standalone, borderless desktop window via Microsoft Edge App Mode (`msedge.exe --app=http://localhost:4321`).

---

## ⚡ Core Capabilities

1. **Local Native Compilation & Execution:**
   - Detects `g++` (C++17 with `-O3`), `python`, and `javac` installed on the host machine.
   - Compiles and pipes `stdin`/`stdout` natively in an isolated scratch directory without sending untrusted code to the cloud.

2. **Sample Verification (Verify Tab):**
   - Paste problem samples once.
   - Hit **`Ctrl + Enter`** to compile, run, and display a side-by-side character/newline diff highlighting exact discrepancies.

3. **Differential Stress-Testing (Stress Tab):**
   - Click **"Generate Brute-Force & Generator"** to have Spring AI automatically write a naive $O(N^2)$ solver and bounded input generator.
   - Hit **`Ctrl + Shift + S`** to hammer both solutions in a high-speed background loop (100+ runs/second).
   - Halts immediately on the first mismatch, displaying the exact breaking input and both outputs.

4. **AI Root-Cause Diagnosis (SSE Streaming):**
   - Click **"Diagnose with AI"** to stream pedagogical feedback from Spring AI explaining why the counterexample failed without spoiling the solution.

5. **Revision Deck Archival:**
   - Click **"Save to Revision Deck"** to permanently archive the failing test case in PostgreSQL & MinIO via `POST /api/dsa/{projectId}/test-cases`.
