# Spec: BreakEngine — Adversarial Generation & DSA Stress-Testing Platform

## 1. Objective & User Stories

### Context & Vision
Transform the existing **Lovable Clone** application into **BreakEngine**—a developer platform that not only generates full-stack React applications, but actively stress-tests and exposes critical edge cases in both web apps ("Break My App") and competitive programming solutions ("BreakMyCode").

### Core Personas & User Stories
1. **The DSA Student / Competitive Programmer:**
   - *Story:* As an algorithmic student tackling a LeetCode Hard or Codeforces problem, I want to paste my problem statement/constraints and student code so that the platform automatically synthesizes a guaranteed brute-force solver and random input generator.
   - *Story:* As a student running stress tests on my machine, when my local runner catches a mismatch, I want to send the failing test case to the platform for an AI diagnostic breakdown and archive it for revision.
2. **The Web Developer:**
   - *Story:* As a web developer building a React app with AI, I want an Adversarial QA agent to inspect my components and generate boundary-violating inputs (empty states, nulls, long strings, malicious payloads) to expose UI crashes before deploying.

---

## 2. Tech Stack & Dependencies

| Layer | Technology | Details |
|---|---|---|
| **Language & Runtime** | Java 21 | Spring Boot 4.0.0 |
| **Security** | Spring Security 6 + JJWT 0.12.6 | Stateless JWT, Method Security (`@PreAuthorize`) |
| **AI Integration** | Spring AI 2.0.0-M1 | `ChatClient`, Groq / OpenAI Provider (Llama 3.3 70B), Streaming SSE |
| **Database & ORM** | PostgreSQL 17 + pgvector | Spring Data JPA, Hibernate, Schema migrations (`ddl-auto: update`) |
| **Object Storage** | MinIO (S3-compatible) | MinIO Java SDK 8.6.0 (`projects` bucket) |
| **DTO Mappers** | MapStruct 1.6.3 | Annotation-driven mapping with Lombok bindings |
| **Client Interface** | Minimal GUI Desktop Window | Lightweight window runner communicating over HTTPS/SSE |

---

## 3. Project Structure & File Layout

```
src/main/java/com/lakshit/projects/lovable_clone/
├── controller/
│   ├── DsaController.java               # NEW: DSA stress-testing & test case endpoints
│   ├── WebAdversaryController.java      # NEW: "Break My App" adversarial QA endpoints
│   ├── ProjectController.java           # UPDATED: ProjectType awareness
│   └── ...
├── dto/
│   ├── dsa/                             # NEW: DTO records for DSA workflow
│   │   ├── DsaSuiteRequest.java
│   │   ├── DsaSuiteResponse.java
│   │   ├── DiagnoseFailureRequest.java
│   │   ├── TestCaseRequest.java
│   │   └── TestCaseResponse.java
│   ├── adversary/                       # NEW: DTO records for Web Adversary
│   │   ├── BreakAppRequest.java
│   │   └── BreakAppFinding.java
│   └── project/
│       ├── ProjectRequest.java          # UPDATED: includes projectType
│       └── ProjectSummaryResponse.java  # UPDATED: includes projectType
├── entity/
│   ├── Project.java                     # UPDATED: adds ProjectType enum
│   ├── FailedTestCase.java              # NEW: archived counterexamples
│   └── ...
├── enums/
│   ├── ProjectType.java                 # NEW: WEB_APP, DSA
│   ├── ProgrammingLanguage.java         # NEW: CPP, JAVA, PYTHON
│   └── TestCaseStatus.java              # NEW: FAILING, RESOLVED
├── llm/
│   ├── PromptUtils.java                 # UPDATED: adds DSA & Adversary system prompts
│   └── advisors/
│       └── DsaContextAdvisor.java       # NEW: injects student code into prompt context
├── repository/
│   └── FailedTestCaseRepository.java    # NEW: Spring Data JPA repo for test cases
└── service/
    ├── DsaStressTestService.java        # NEW: Interface for suite synthesis & diagnostics
    ├── WebAdversaryService.java         # NEW: Interface for Break My App QA
    └── impl/
        ├── DsaStressTestServiceImpl.java# NEW: Implementation with Spring AI & MinIO
        └── WebAdversaryServiceImpl.java # NEW: Implementation with Spring AI
```

---

## 4. Database Schema Updates

### 4.1 Enums

#### `ProjectType`
```java
public enum ProjectType {
    WEB_APP,
    DSA
}
```

#### `ProgrammingLanguage`
```java
public enum ProgrammingLanguage {
    CPP,
    JAVA,
    PYTHON
}
```

#### `TestCaseStatus`
```java
public enum TestCaseStatus {
    FAILING,
    RESOLVED
}
```

### 4.2 Entity Changes

#### [`Project.java`](file:///c:/Users/HP/Downloads/lovable-clone-project/src/main/java/com/lakshit/projects/lovable_clone/entity/Project.java) (Updated)
Add column `type`:
```java
@Enumerated(EnumType.STRING)
@Column(nullable = false)
@Builder.Default
ProjectType type = ProjectType.WEB_APP;
```

#### `FailedTestCase.java` (New Entity)
```java
@Entity
@Table(name = "failed_test_cases", indexes = {
    @Index(name = "idx_failed_tc_project_id", columnList = "project_id"),
    @Index(name = "idx_failed_tc_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FailedTestCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    Project project;

    @Column(nullable = false, columnDefinition = "text")
    String input;

    @Column(nullable = false, columnDefinition = "text")
    String expectedOutput;

    @Column(nullable = false, columnDefinition = "text")
    String actualOutput;

    @Column(columnDefinition = "text")
    String explanation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    TestCaseStatus status = TestCaseStatus.FAILING;

    @CreationTimestamp
    Instant createdAt;

    @UpdateTimestamp
    Instant updatedAt;
}
```

---

## 5. API Contracts & Specifications

### 5.1 Project Creation (Updated)

- **Endpoint:** `POST /api/projects`
- **Security:** Authenticated JWT
- **Request Body:**
```json
{
  "name": "Two Pointer - Trapping Rain Water",
  "type": "DSA"
}
```
- **Response Body (`201 Created`):**
```json
{
  "id": 42,
  "name": "Two Pointer - Trapping Rain Water",
  "type": "DSA",
  "isPublic": false,
  "createdAt": "2026-11-16T12:00:00Z"
}
```

---

### 5.2 DSA Stress-Testing Suite Synthesis

Synthesizes a guaranteed $O(N^2)$ or brute-force baseline and a bounded random test case generator. Both generated files are automatically written into MinIO under `{projectId}/brute_force.{ext}` and `{projectId}/generator.{ext}`.

- **Endpoint:** `POST /api/dsa/{projectId}/synthesize-suite`
- **Security:** `@PreAuthorize("@security.canEditProject(#projectId)")`
- **Request Body:**
```json
{
  "language": "CPP",
  "problemDescription": "Given an array of integers representing elevations, compute trapped water. 1 <= n <= 10^5, 0 <= height[i] <= 10^4.",
  "studentCode": "#include <vector> ... int trap(vector<int>& height) { ... }"
}
```
- **Response Body (`200 OK`):**
```json
{
  "projectId": 42,
  "language": "CPP",
  "bruteForceCode": "#include <iostream>\n#include <vector> ... // Guaranteed naive O(N^2) solution",
  "bruteForcePath": "brute_force.cpp",
  "generatorCode": "#include <iostream>\n#include <random> ... // Generates bounded vectors",
  "generatorPath": "generator.cpp",
  "inputBoundsSummary": "n in [1, 100], height[i] in [0, 50] for fast local differential loops"
}
```
- **Token Accounting:** Records consumed prompt and completion tokens via `usageService.recordTokenUsage(userId, tokens)`.

---

### 5.3 Failure Diagnostic Streaming

When the student's local GUI detects an output mismatch, it invokes this endpoint to stream an AI diagnostic explaining the root cause of the bug without spoiling the full solution.

- **Endpoint:** `POST /api/dsa/{projectId}/diagnose`
- **Produces:** `text/event-stream` (`ServerSentEvent<StreamResponse>`)
- **Security:** `@PreAuthorize("@security.canEditProject(#projectId)")`
- **Request Body:**
```json
{
  "language": "CPP",
  "studentCode": "int trap(vector<int>& height) { ... }",
  "input": "5\n4 2 0 3 2\n",
  "expectedOutput": "3",
  "actualOutput": "1"
}
```
- **SSE Stream Output:**
```
data: {"content": "### Discrepancy Breakdown\n\n"}
data: {"content": "**Test Case Analysis:**\nYour solution failed on a dip where water should be trapped between bar index 0 (height 4) and bar index 3 (height 3).\n\n"}
data: {"content": "**Logical Flaw:**\nIn line 24, your right pointer decrements before computing the trapped volume, which overwrites the boundary wall calculation."}
```
- **On Stream Completion:** Consumed tokens are recorded in `usage_logs`.

---

### 5.4 Failed Test Case Archival

- **Endpoint:** `POST /api/dsa/{projectId}/test-cases`
- **Security:** `@PreAuthorize("@security.canEditProject(#projectId)")`
- **Request Body:**
```json
{
  "input": "5\n4 2 0 3 2\n",
  "expectedOutput": "3",
  "actualOutput": "1",
  "explanation": "Right-pointer boundary decrement flaw on asymmetrical walls"
}
```
- **Response Body (`201 Created`):**
```json
{
  "id": 101,
  "projectId": 42,
  "input": "5\n4 2 0 3 2\n",
  "expectedOutput": "3",
  "actualOutput": "1",
  "explanation": "Right-pointer boundary decrement flaw on asymmetrical walls",
  "status": "FAILING",
  "createdAt": "2026-11-16T12:05:00Z"
}
```

- **Endpoint:** `GET /api/dsa/{projectId}/test-cases`
- **Query Params:** `?status=FAILING` (optional)
- **Response Body (`200 OK`):**
```json
[
  {
    "id": 101,
    "projectId": 42,
    "input": "5\n4 2 0 3 2\n",
    "expectedOutput": "3",
    "actualOutput": "1",
    "explanation": "Right-pointer boundary decrement flaw on asymmetrical walls",
    "status": "FAILING",
    "createdAt": "2026-11-16T12:05:00Z"
  }
]
```

- **Endpoint:** `PATCH /api/dsa/{projectId}/test-cases/{testCaseId}`
- **Request Body:**
```json
{
  "status": "RESOLVED"
}
```
- **Response Body (`200 OK`):** Returns updated `TestCaseResponse`.

---

### 5.5 "Break My App" Adversarial Web Testing

Scans existing React source code stored in MinIO for this project, identifies brittle boundaries, generates malicious mock data, and provides concrete XML file fixes.

- **Endpoint:** `POST /api/projects/{projectId}/break-app`
- **Produces:** `text/event-stream` (`ServerSentEvent<StreamResponse>`)
- **Security:** `@PreAuthorize("@security.canEditProject(#projectId)")`
- **Request Body:**
```json
{
  "targetFilePath": "src/components/Checkout.tsx"
}
```
- **Behavior:**
  1. Pulls file tree and relevant components from MinIO.
  2. Prompts Spring AI with adversarial QA instructions.
  3. Streams findings with `<message>` tags and proposed hardened code in `<file path="...">` tags.
  4. Automatically parses edits via `LlmResponseParser` and saves hardened files to MinIO.

---

## 6. Error Handling Contract

All endpoints adhere to the standard Spring Boot `ApiError` format:
```json
{
  "status": 400,
  "error": "BAD_REQUEST",
  "message": "User does not have an active subscription or has exceeded daily token limit.",
  "timestamp": "2026-11-16T12:10:00Z"
}
```

Status Code Strategy:
- `400 Bad Request`: Validation failure or invalid parameters.
- `401 Unauthorized`: Missing or expired JWT.
- `403 Forbidden`: Authenticated user lacks permission on the project.
- `404 Not Found`: Project or Test Case ID not found.
- `429 Too Many Requests`: Daily token limit reached on current subscription plan.
- `500 Internal Server Error`: MinIO or AI provider upstream error.

---

## 7. Testing Strategy

1. **Unit Tests (JUnit 5 & Mockito):**
   - `DsaStressTestServiceImplTest`: Mock `ChatClient` and verify correct extraction of brute-force and generator code.
   - `LlmResponseParserTest`: Verify parsing of multi-part DSA responses and adversarial `<file>` tags.
2. **Integration Tests (`@SpringBootTest` & `MockMvc`):**
   - `DsaControllerTest`: Verify authentication, RBAC authorization (`@PreAuthorize`), and endpoint contract adherence.
   - `FailedTestCaseRepositoryTest`: Verify JPA persistence and project deletion cascades.
3. **End-to-End Local Loop Verification:**
   - Script simulating the Minimal GUI window calling `synthesize-suite`, piping outputs locally, and posting a failing diff to `/diagnose`.

---

## 8. Boundaries

### Always Do
- Enforce `@PreAuthorize("@security.canEditProject(#projectId)")` on all mutating DSA and adversary endpoints.
- Log token consumption through `UsageService` for all Spring AI calls.
- Save generated code and test cases in UTF-8 to MinIO and PostgreSQL.
- Keep execution of untrusted C++/Java/Python strictly off the server.

### Ask First
- Adding third-party compilers or judge sandboxes (e.g. Judge0 or Docker containers) to the backend.
- Altering the Stripe billing pricing structure for DSA vs Web apps.

### Never Do
- Execute `g++`, `javac`, or Python subprocesses directly inside the Spring Boot container.
- Expose raw database stack traces or Groq API keys in response payloads.
- Bypass user permission checks when fetching archived test cases.

---

## 9. Success Criteria

- [ ] `ProjectType` enum is stored in PostgreSQL and returned in project listing APIs.
- [ ] `POST /api/dsa/{projectId}/synthesize-suite` successfully returns valid brute-force code and generator code within 5 seconds on standard inputs.
- [ ] `POST /api/dsa/{projectId}/diagnose` returns an active SSE stream detailing the root cause of the differential mismatch.
- [ ] Archived test cases persist in PostgreSQL and can be fetched/updated (`FAILING` -> `RESOLVED`).
- [ ] All token usage is recorded in `usage_logs` and rejected with `429 Too Many Requests` if the user's daily quota is exceeded.
- [ ] Build passes with zero compilation errors (`mvn clean test`).
