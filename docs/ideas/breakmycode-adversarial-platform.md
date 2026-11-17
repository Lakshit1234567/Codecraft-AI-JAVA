# BreakEngine: Adversarial Generation & Stress-Testing Platform

## Problem Statement
How might we transform an AI code generation platform into an active adversarial partner that stress-tests and exposes breaking edge cases in both full-stack applications and competitive programming solutions?

---

## Recommended Direction
A unified dual-mode platform powered by the existing Spring Boot + Spring AI + MinIO + PostgreSQL backend:

1. **Web App Mode ("Break My App"):**
   - The user generates a React web application using the existing conversational prompt flow.
   - The user triggers an "Adversarial Test" run. An AI QA adversary analyzes the component tree, generates dirty mock datasets, boundary-violating inputs, and unexpected component states to detect runtime crashes, unhandled nulls, and layout breakage before shipping.

2. **DSA Workspace Mode ("BreakMyCode"):**
   - A dedicated workspace for competitive programming and DSA students.
   - The student provides their target solution (`Solution.cpp`, `Solution.java`, `Solution.py`) and problem constraints.
   - The backend AI acts as an **Adversarial Synthesizer** to generate:
     1. A guaranteed correct brute-force solution ($O(N^2)$, $O(2^N)$ recursion).
     2. An input generator script bounded by the problem constraints.
   - A **Minimal GUI Desktop Window** on the student's machine pulls these artifacts, runs native compilation and differential fuzzing loops (100–1,000 runs/sec) locally on their own CPU.
   - On the first mismatch, the GUI displays a side-by-side character/newline diff and syncs the failing test case to the cloud backend.
   - The backend runs an AI diagnostic explaining the logical discrepancy and archives the failing test case permanently for spaced-repetition revision.

---

## Key Decisions
1. **Client Interface:** Dedicated **Minimal GUI Desktop Window** (e.g. lightweight Tauri / Electron window) designed to stay docked beside the student's primary code editor (VS Code, CLion, etc.).
2. **Unified Token Billing:** DSA brute-force generation, generator synthesis, and post-mortem AI diagnostics consume tokens against the **same daily quota** and subscription plans as web app generation.
3. **Zero-Trust Execution Safety:** Untrusted C++/Java/Python code is never compiled or executed on the server. Native compilation and loop piping occur strictly on the user's local machine via the GUI client.

---

## Key Assumptions to Validate
- [ ] **Prompt Reliability:** Verify that Groq / Llama 3.3 70B reliably produces 100% bug-free naive brute-force code and generator scripts across a benchmark of 20 standard LeetCode Medium/Hard problems.
- [ ] **Local Differential Runner Performance:** Verify that the minimal GUI runner can execute 500+ iterations of standard C++/Java/Python solutions in under 5 seconds without UI freezing.
- [ ] **Sync & Diagnostic Pipeline:** Validate that the SSE / REST endpoint can ingest failing I/O pairs and stream back clear, pedagogical diagnostic explanations within 2 seconds.

---

## MVP Scope

### What's In (Scope)
- **Backend (Spring Boot):**
  - Project entity extension with `ProjectType` enum (`WEB_APP`, `DSA`).
  - DSA Spring AI prompt pipelines:
    - `SynthesizeBruteForceAndGenerator`: Outputs both files with strict XML tags.
    - `DiagnoseFailure`: Ingests `{ studentCode, counterExampleInput, expectedOutput, actualOutput }` and streams an explanation of the root logical flaw.
  - Endpoints:
    - `POST /api/dsa/{projectId}/synthesize-suite`: Generates naive solver and input generator.
    - `POST /api/dsa/{projectId}/diagnose`: Streams AI failure post-mortem.
    - `POST /api/dsa/{projectId}/archive-failure`: Persists breaking test cases to PostgreSQL & MinIO.
    - `GET /api/dsa/{projectId}/archive`: Retrieves saved test cases for review.
  - Token tracking wired into `UsageService.recordTokenUsage(...)` for all DSA AI endpoints.

- **Client (Minimal GUI Window):**
  - Clean, compact docked window with public test case input fields and single-shortcut run.
  - Stress-test mode: triggers local `g++`/`javac`/`python3` subprocesses for optimal vs. brute-force.
  - Side-by-side visual diff (character, newline, value highlight).
  - One-click "Explain with AI" and "Save to Revision Deck".

### Not Doing (and Why)
- **Remote / Cloud Sandboxed Execution:** No remote code execution (RCE) on the server. Avoids massive compute cost, security liabilities, container cold starts, and complex judge sandboxing (isolate/seccomp).
- **Automated Solution Solver:** The AI will not write the optimal solution for the student; it only provides the brute-force baseline and diagnoses the failing counterexample to protect educational value.
- **Fragile Contest Scraping:** No direct scraping of LeetCode or Codeforces APIs in v1. Students paste sample constraints or code directly.

---

## Implementation Roadmap

### Phase 1: Backend Foundation (Spring Boot)
1. Add `ProjectType` (`WEB_APP`, `DSA`) to [`Project.java`](file:///c:/Users/HP/Downloads/lovable-clone-project/src/main/java/com/lakshit/projects/lovable_clone/entity/Project.java) and DTOs.
2. Create `DsaStressTestService` and `DsaController` with endpoints for stress suite generation and failure diagnosis.
3. Add DSA adversarial prompts in [`PromptUtils.java`](file:///c:/Users/HP/Downloads/lovable-clone-project/src/main/java/com/lakshit/projects/lovable_clone/llm/PromptUtils.java) and integrate token usage logging via [`UsageService`](file:///c:/Users/HP/Downloads/lovable-clone-project/src/main/java/com/lakshit/projects/lovable_clone/service/UsageService.java).
4. Create `FailedTestCase` entity and repository for test case archival and revision decks.

### Phase 2: "Break My App" Web Adversary
1. Add an adversarial analysis prompt to stress-test React component trees and state boundaries.
2. Expose an endpoint `POST /api/projects/{projectId}/stress-test-web` that outputs edge-case scenarios and code fixes.

### Phase 3: Minimal GUI Client
1. Scaffold lightweight desktop window client communicating with `/api/dsa/**` and `/api/auth/**`.
2. Implement local subprocess execution and piping loop for C++, Java, and Python.
3. Build side-by-side diff viewer and counterexample exporter.
