package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.dto.chat.StreamResponse;
import com.lakshit.projects.lovable_clone.dto.dsa.*;
import com.lakshit.projects.lovable_clone.entity.FailedTestCase;
import com.lakshit.projects.lovable_clone.entity.Project;
import com.lakshit.projects.lovable_clone.enums.ProgrammingLanguage;
import com.lakshit.projects.lovable_clone.enums.TestCaseStatus;
import com.lakshit.projects.lovable_clone.error.ResourceNotFoundException;
import com.lakshit.projects.lovable_clone.llm.PromptUtils;
import com.lakshit.projects.lovable_clone.mapper.DsaMapper;
import com.lakshit.projects.lovable_clone.repository.FailedTestCaseRepository;
import com.lakshit.projects.lovable_clone.repository.ProjectRepository;
import com.lakshit.projects.lovable_clone.security.AuthUtil;
import com.lakshit.projects.lovable_clone.service.DsaCodeExecutor;
import com.lakshit.projects.lovable_clone.service.DsaStressTestService;
import com.lakshit.projects.lovable_clone.service.ProjectFileService;
import com.lakshit.projects.lovable_clone.service.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class DsaStressTestServiceImpl implements DsaStressTestService {

    private final ChatClient chatClient;
    private final AuthUtil authUtil;
    private final ProjectRepository projectRepository;
    private final FailedTestCaseRepository failedTestCaseRepository;
    private final ProjectFileService projectFileService;
    private final UsageService usageService;
    private final DsaMapper dsaMapper;
    private final DsaCodeExecutor dsaCodeExecutor;

    @Override
    @Transactional
    public DsaSuiteResponse synthesizeStressSuite(Long projectId, DsaSuiteRequest request) {
        usageService.checkDailyTokensUsage();
        Long userId = authUtil.getCurrentUserId();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId.toString()));

        String userPrompt = String.format("""
                Language: %s

                ## Problem Description
                %s

                ## Student's Current Solution (Reference)
                %s
                """,
                request.language().name(),
                request.problemDescription(),
                request.studentCode() != null ? request.studentCode() : "N/A"
        );

        ChatResponse response = chatClient.prompt()
                .system(PromptUtils.DSA_SUITE_SYNTHESIS_SYSTEM_PROMPT)
                .user(userPrompt)
                .call()
                .chatResponse();

        if (response != null && response.getMetadata() != null && response.getMetadata().getUsage() != null) {
            usageService.recordTokenUsage(userId, response.getMetadata().getUsage().getTotalTokens());
        }

        String responseText = response != null && response.getResult() != null && response.getResult().getOutput() != null
                ? response.getResult().getOutput().getText()
                : "";

        String bruteForceCode = extractTag(responseText, "brute_force");
        String generatorCode = extractTag(responseText, "generator");
        String boundsSummary = extractTag(responseText, "bounds");

        String ext = resolveExtension(request.language());
        String bruteForcePath = "brute_force." + ext;
        String generatorPath = "generator." + ext;

        if (!bruteForceCode.isEmpty()) {
            projectFileService.saveFile(projectId, bruteForcePath, bruteForceCode);
        }
        if (!generatorCode.isEmpty()) {
            projectFileService.saveFile(projectId, generatorPath, generatorCode);
        }

        return new DsaSuiteResponse(
                project.getId(),
                request.language(),
                bruteForceCode,
                bruteForcePath,
                generatorCode,
                generatorPath,
                boundsSummary.isEmpty() ? "Bounded for fast differential testing" : boundsSummary
        );
    }

    @Override
    @Transactional
    public StressTestResultResponse runStressTest(Long projectId, RunStressTestRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId.toString()));

        String bruteForce = request.bruteForceCode();
        String generator = request.generatorCode();

        String ext = resolveExtension(request.language());
        String brutePath = "brute_force." + ext;
        String genPath = "generator." + ext;

        // If not supplied, try to load from project files or synthesize
        if (bruteForce == null || bruteForce.isBlank()) {
            try {
                bruteForce = projectFileService.getFileContent(projectId, brutePath).content();
            } catch (Exception ignored) {}
        }
        if (generator == null || generator.isBlank()) {
            try {
                generator = projectFileService.getFileContent(projectId, genPath).content();
            } catch (Exception ignored) {}
        }

        // If still missing, synthesize using LLM
        if (bruteForce == null || bruteForce.isBlank() || generator == null || generator.isBlank()) {
            log.info("Brute force or generator missing for projectId {}. Synthesizing now...", projectId);
            DsaSuiteResponse suite = synthesizeStressSuite(projectId, new DsaSuiteRequest(
                    request.language(),
                    request.problemDescription(),
                    request.studentCode()
            ));
            bruteForce = suite.bruteForceCode();
            generator = suite.generatorCode();
        }

        // Execute differential fuzzing loop
        StressTestResultResponse result = dsaCodeExecutor.executeDifferentialTesting(
                request.language(),
                generator,
                bruteForce,
                request.studentCode(),
                50
        );

        // If a breaking counterexample was found, automatically archive it
        if (result.foundCounterexample() && result.failingInput() != null && !result.failingInput().isBlank()) {
            try {
                FailedTestCase failedTestCase = FailedTestCase.builder()
                        .project(project)
                        .input(result.failingInput())
                        .expectedOutput(result.expectedOutput() != null ? result.expectedOutput() : "")
                        .actualOutput(result.actualOutput() != null ? result.actualOutput() : "")
                        .explanation(result.message())
                        .status(TestCaseStatus.FAILING)
                        .build();
                failedTestCaseRepository.save(failedTestCase);
                log.info("Archived failing test case for project #{}: {}", projectId, result.failingInput());
            } catch (Exception e) {
                log.warn("Failed to automatically archive counterexample: {}", e.getMessage());
            }
        }

        return result;
    }

    @Override
    public Flux<StreamResponse> streamDiagnosis(Long projectId, DiagnoseFailureRequest request) {
        usageService.checkDailyTokensUsage();
        Long userId = authUtil.getCurrentUserId();

        String userPrompt = String.format("""
                Language: %s

                ## Student Solution
                %s

                ## Failing Test Case Input
                %s

                ## Expected (Brute Force) Output
                %s

                ## Actual (Student) Output
                %s
                """,
                request.language().name(),
                request.studentCode(),
                request.input(),
                request.expectedOutput(),
                request.actualOutput()
        );

        AtomicReference<Usage> usageRef = new AtomicReference<>();

        return chatClient.prompt()
                .system(PromptUtils.DSA_DIAGNOSIS_SYSTEM_PROMPT)
                .user(userPrompt)
                .stream()
                .chatResponse()
                .doOnNext(response -> {
                    if (response.getMetadata() != null && response.getMetadata().getUsage() != null) {
                        usageRef.set(response.getMetadata().getUsage());
                    }
                })
                .doOnComplete(() -> {
                    Schedulers.boundedElastic().schedule(() -> {
                        Usage usage = usageRef.get();
                        if (usage != null) {
                            usageService.recordTokenUsage(userId, usage.getTotalTokens());
                        }
                    });
                })
                .doOnError(err -> log.error("Error streaming diagnosis for projectId {}: {}", projectId, err.getMessage()))
                .map(response -> {
                    String text = response.getResult() != null && response.getResult().getOutput() != null
                            ? response.getResult().getOutput().getText()
                            : "";
                    return new StreamResponse(text != null ? text : "");
                });
    }

    @Override
    @Transactional
    public TestCaseResponse archiveTestCase(Long projectId, TestCaseRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId.toString()));

        FailedTestCase failedTestCase = FailedTestCase.builder()
                .project(project)
                .input(request.input())
                .expectedOutput(request.expectedOutput())
                .actualOutput(request.actualOutput())
                .explanation(request.explanation())
                .status(TestCaseStatus.FAILING)
                .build();

        failedTestCase = failedTestCaseRepository.save(failedTestCase);
        return dsaMapper.toTestCaseResponse(failedTestCase);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TestCaseResponse> getTestCases(Long projectId, TestCaseStatus status) {
        List<FailedTestCase> cases;
        if (status != null) {
            cases = failedTestCaseRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(projectId, status);
        } else {
            cases = failedTestCaseRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        }
        return dsaMapper.toListOfTestCaseResponse(cases);
    }

    @Override
    @Transactional
    public TestCaseResponse updateTestCaseStatus(Long projectId, Long testCaseId, TestCaseStatus status) {
        FailedTestCase testCase = failedTestCaseRepository.findById(testCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", testCaseId.toString()));

        if (!testCase.getProject().getId().equals(projectId)) {
            throw new ResourceNotFoundException("TestCase", testCaseId.toString());
        }

        testCase.setStatus(status);
        testCase = failedTestCaseRepository.save(testCase);
        return dsaMapper.toTestCaseResponse(testCase);
    }

    private String extractTag(String text, String tag) {
        Pattern pattern = Pattern.compile("<" + tag + ">([\\s\\S]*?)</" + tag + ">", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return "";
    }

    private String resolveExtension(ProgrammingLanguage language) {
        return switch (language) {
            case CPP -> "cpp";
            case JAVA -> "java";
            case PYTHON -> "py";
        };
    }
}
