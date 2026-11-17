# Implementation Plan: BreakEngine (DSA Stress-Testing & Web Adversary)

## Architecture Overview & Dependencies
The implementation is structured into 4 sequential slices:

```
[Slice 1: Core Domain & Schema]
  ├── Enums (ProjectType, ProgrammingLanguage, TestCaseStatus)
  ├── Entity Update (Project.type) & New Entity (FailedTestCase)
  └── Repository (FailedTestCaseRepository, ProjectRepository queries)
          │
          ▼
[Slice 2: Spring AI Prompt Engineering & LLM Services]
  ├── PromptUtils updates (DSA synthesis, DSA diagnosis, Web adversary)
  ├── DsaStressTestService & Implementation (with MinIO save)
  └── WebAdversaryService & Implementation
          │
          ▼
[Slice 3: REST & Streaming API Layer]
  ├── DTOs (Requests, Responses) & MapStruct Mappers
  ├── DsaController (/api/dsa/**)
  ├── WebAdversaryController (/api/projects/{id}/break-app)
  └── ProjectController / Service updates (type support)
          │
          ▼
[Slice 4: Verification, Security & End-to-End Tests]
  ├── Token quota validation in UsageService
  ├── RBAC permission checks (@PreAuthorize)
  └── Integration tests with MockMvc
```

---

## Detailed Phases

### Phase 1: Core Domain & Data Layer
- **Components:** `ProjectType`, `ProgrammingLanguage`, `TestCaseStatus`, `Project` update, `FailedTestCase`, `FailedTestCaseRepository`.
- **Dependencies:** None.
- **Verification:** Unit tests verifying schema mapping and repository CRUD.

### Phase 2: AI Prompt Engineering & Business Logic
- **Components:**
  - `PromptUtils`: Dedicated system prompts for naive brute-force generation, input generator creation, and pedagogical failure diagnosis.
  - `DsaStressTestServiceImpl`: Orchestrates `ChatClient`, parses response code blocks, saves files to MinIO, and logs token usage.
  - `WebAdversaryServiceImpl`: Analyzes existing React components and streams hardening diffs.
- **Dependencies:** Phase 1, `MinioClient`, `ChatClient`, `UsageService`.
- **Verification:** Unit tests with mock `ChatClient` ensuring code block extraction and MinIO persistence.

### Phase 3: REST & Streaming Controller Layer
- **Components:**
  - `DsaController`: `/synthesize-suite`, `/diagnose` (SSE streaming), `/test-cases` CRUD.
  - `WebAdversaryController`: `/break-app` (SSE streaming).
  - Update `ProjectRequest`, `ProjectResponse`, and `ProjectSummaryResponse` with `ProjectType`.
- **Dependencies:** Phase 2, `AuthUtil`, `SecurityExpressions`.
- **Verification:** MockMvc tests testing HTTP statuses, authorization, and SSE event streaming.

### Phase 4: Token Accounting & Quota Enforcement
- **Components:**
  - Ensure all new AI endpoints call `usageService.recordTokenUsage(...)`.
  - Enable pre-flight token quota check before generation starts.
- **Dependencies:** Phase 3.
- **Verification:** Automated test hitting token quota limit returning `429 Too Many Requests`.

---

## Risk & Mitigation Matrix

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| LLM produces invalid/broken brute-force code | High | Prompt instructs LLM to use the most naive, simplest implementation (e.g. nested loops, recursion) and explicit type constraints. |
| MinIO path collisions between projects | Medium | All DSA files are isolated under `{projectId}/dsa/...` or `{projectId}/...` matching existing file architecture. |
| Streaming timeout on long diagnostics | Medium | Use Reactor `Flux<ServerSentEvent<StreamResponse>>` matching existing `ChatController.streamChat`. |
| Unauthenticated access to test case archives | High | All DSA endpoints guarded by `@PreAuthorize("@security.canEditProject(#projectId)")`. |
