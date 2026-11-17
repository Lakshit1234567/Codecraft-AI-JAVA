# Task Breakdown: BreakEngine

## Slice 1: Core Domain & Data Layer
- [x] Task 1.1: Add Enums (`ProjectType`, `ProgrammingLanguage`, `TestCaseStatus`)
  - Acceptance: Enums created with proper values and Java package conventions.
  - Verify: Project builds with `mvn compile-only` or `mvn compile`.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/enums/ProjectType.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/enums/ProgrammingLanguage.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/enums/TestCaseStatus.java`

- [x] Task 1.2: Update `Project` entity and create `FailedTestCase` entity
  - Acceptance: `Project.type` added with `@Enumerated(EnumType.STRING)` defaulted to `WEB_APP`; `FailedTestCase` created with proper indices and foreign keys.
  - Verify: Hibernate schema generates without errors.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/entity/Project.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/entity/FailedTestCase.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/repository/FailedTestCaseRepository.java`

- [x] Task 1.3: Update Project DTOs and Mappers for `ProjectType`
  - Acceptance: `ProjectRequest`, `ProjectResponse`, and `ProjectSummaryResponse` include `ProjectType`; `ProjectMapper` maps it cleanly.
  - Verify: Existing `ProjectService` tests and compilation pass.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/dto/project/ProjectRequest.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/dto/project/ProjectResponse.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/dto/project/ProjectSummaryResponse.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/mapper/ProjectMapper.java`

---

## Slice 2: Prompt Engineering & AI Service Layer
- [x] Task 2.1: Add DSA & Adversary Prompts in `PromptUtils`
  - Acceptance: System prompts define clear XML tags (`<brute_force>`, `<generator>`, `<bounds>`) and diagnostic guidelines.
  - Verify: Unit test checks prompt structure.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/llm/PromptUtils.java`

- [x] Task 2.2: Implement `DsaStressTestService` & `DsaStressTestServiceImpl`
  - Acceptance: Service generates brute force and generator, writes to MinIO under `{projectId}`, and logs token usage in `UsageService`.
  - Verify: Service unit test with Mockito mocks for `ChatClient` and `ProjectFileService`.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/service/DsaStressTestService.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/service/impl/DsaStressTestServiceImpl.java`

- [x] Task 2.3: Implement Streaming Failure Diagnosis in `DsaStressTestService`
  - Acceptance: Streams SSE tokens explaining the discrepancy without spoiling the answer.
  - Verify: Returns non-null `Flux<ServerSentEvent<StreamResponse>>`.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/service/DsaStressTestService.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/service/impl/DsaStressTestServiceImpl.java`

- [x] Task 2.4: Implement `WebAdversaryService` for "Break My App"
  - Acceptance: Analyzes React components and streams vulnerability warnings + hardened component diffs.
  - Verify: Service unit test verifying SSE stream.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/service/WebAdversaryService.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/service/impl/WebAdversaryServiceImpl.java`

---

## Slice 3: REST & Streaming API Layer
- [x] Task 3.1: Create DSA DTOs & MapStruct Mappers
  - Acceptance: Request and response records created with bean validation annotations (`@NotBlank`, `@NotNull`).
  - Verify: MapStruct compiles mappers without warnings.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/dto/dsa/DsaSuiteRequest.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/dto/dsa/DsaSuiteResponse.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/dto/dsa/DiagnoseFailureRequest.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/dto/dsa/TestCaseRequest.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/dto/dsa/TestCaseResponse.java`
    - `src/main/java/com/lakshit/projects/lovable_clone/mapper/DsaMapper.java`

- [x] Task 3.2: Implement `DsaController`
  - Acceptance: Endpoints `/api/dsa/{projectId}/synthesize-suite`, `/diagnose`, and `/test-cases` CRUD implemented with `@PreAuthorize`.
  - Verify: MockMvc integration tests for authentication and authorization.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/controller/DsaController.java`

- [x] Task 3.3: Implement `WebAdversaryController`
  - Acceptance: Endpoint `POST /api/projects/{projectId}/break-app` streams findings.
  - Verify: MockMvc test for SSE media type.
  - Files:
    - `src/main/java/com/lakshit/projects/lovable_clone/controller/WebAdversaryController.java`

---

## Slice 4: Verification, Security & End-to-End Tests
- [x] Task 4.1: Integration tests for DSA suite synthesis and test case archival
  - Acceptance: MockMvc tests covering happy paths, 403 Forbidden on wrong user, and 400 Bad Request on invalid payload.
  - Verify: `mvn test` passes cleanly.
  - Files:
    - `src/test/java/com/lakshit/projects/lovable_clone/controller/DsaControllerTest.java`

- [x] Task 4.2: End-to-end build verification
  - Acceptance: Full application compiles, package builds, and tests run cleanly.
  - Verify: `mvn clean test` exits with code 0.

---

## Slice 5: Minimal GUI Desktop Client
- [x] Task 5.1: Scaffold desktop client runner and local execution pipeline
  - Acceptance: `runner.js` with local HTTP API, compiler detection for `g++`, `python`, `javac`, and Edge App Mode launcher.
  - Verify: Automated test (`test-runner.js`, `test-cpp.js`) passes native compilation, execution, and differential loop.
  - Files:
    - `desktop-client/package.json`
    - `desktop-client/runner.js`
    - `desktop-client/public/index.html`
    - `desktop-client/public/style.css`
    - `desktop-client/public/app.js`
    - `desktop-client/README.md`
