package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.dto.dsa.StressTestResultResponse;
import com.lakshit.projects.lovable_clone.enums.ProgrammingLanguage;
import com.lakshit.projects.lovable_clone.service.DsaCodeExecutor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.*;

@Service
@Slf4j
public class DsaCodeExecutorImpl implements DsaCodeExecutor {

    private static final long TIMEOUT_COMPILE_MS = 10000;
    private static final long TIMEOUT_EXEC_MS = 3000;

    @Override
    public StressTestResultResponse executeDifferentialTesting(
            ProgrammingLanguage language,
            String generatorSource,
            String bruteForceSource,
            String studentSource,
            int maxIterations) {

        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("dsa_diff_");
            File dir = tempDir.toFile();

            log.info("Running DSA differential testing in {} for language {}", dir.getAbsolutePath(), language);

            // Step 1: Write source files
            String genFile = "generator." + getExtension(language);
            String bruteFile = "brute_force." + getExtension(language);
            String solFile = "solution." + getExtension(language);

            Files.writeString(tempDir.resolve(genFile), generatorSource, StandardCharsets.UTF_8);
            Files.writeString(tempDir.resolve(bruteFile), bruteForceSource, StandardCharsets.UTF_8);
            Files.writeString(tempDir.resolve(solFile), studentSource, StandardCharsets.UTF_8);

            // Step 2: Compile if needed
            List<String> genRunCmd;
            List<String> bruteRunCmd;
            List<String> solRunCmd;

            switch (language) {
                case CPP -> {
                    // Compile generator
                    ProcessResult compGen = runProcess(List.of("g++", "-O3", "-std=c++17", genFile, "-o", "gen"), dir, null, TIMEOUT_COMPILE_MS);
                    if (compGen.exitCode != 0) {
                        return errorResult("Generator compilation failed: " + compGen.stderr, generatorSource, bruteForceSource);
                    }
                    // Compile brute force
                    ProcessResult compBrute = runProcess(List.of("g++", "-O3", "-std=c++17", bruteFile, "-o", "brute"), dir, null, TIMEOUT_COMPILE_MS);
                    if (compBrute.exitCode != 0) {
                        return errorResult("Brute-force compilation failed: " + compBrute.stderr, generatorSource, bruteForceSource);
                    }
                    // Compile student solution
                    ProcessResult compSol = runProcess(List.of("g++", "-O3", "-std=c++17", solFile, "-o", "sol"), dir, null, TIMEOUT_COMPILE_MS);
                    if (compSol.exitCode != 0) {
                        return errorResult("Student code compilation failed:\n" + compSol.stderr, generatorSource, bruteForceSource);
                    }

                    genRunCmd = List.of("./gen");
                    bruteRunCmd = List.of("./brute");
                    solRunCmd = List.of("./sol");
                }
                case PYTHON -> {
                    genRunCmd = List.of("python3", genFile);
                    bruteRunCmd = List.of("python3", bruteFile);
                    solRunCmd = List.of("python3", solFile);
                }
                case JAVA -> {
                    // Compile all
                    ProcessResult comp = runProcess(List.of("javac", genFile, bruteFile, solFile), dir, null, TIMEOUT_COMPILE_MS);
                    if (comp.exitCode != 0) {
                        return errorResult("Java compilation failed:\n" + comp.stderr, generatorSource, bruteForceSource);
                    }
                    genRunCmd = List.of("java", "generator");
                    bruteRunCmd = List.of("java", "brute_force");
                    solRunCmd = List.of("java", "solution");
                }
                default -> {
                    return errorResult("Unsupported language: " + language, generatorSource, bruteForceSource);
                }
            }

            // Step 3: Run the fuzzing loop
            int runs = Math.min(Math.max(maxIterations, 5), 100);
            for (int i = 1; i <= runs; i++) {
                // Generate random input
                ProcessResult genRes = runProcess(genRunCmd, dir, null, TIMEOUT_EXEC_MS);
                if (genRes.exitCode != 0 || genRes.stdout.isBlank()) {
                    log.warn("Generator failed on iteration {}: {}", i, genRes.stderr);
                    continue;
                }
                String testInput = genRes.stdout.trim();

                // Run brute force
                ProcessResult bruteRes = runProcess(bruteRunCmd, dir, testInput, TIMEOUT_EXEC_MS);
                if (bruteRes.exitCode != 0) {
                    log.warn("Brute force failed on iteration {}: {}", i, bruteRes.stderr);
                    continue;
                }
                String expectedOutput = bruteRes.stdout.trim();

                // Run student solution
                ProcessResult solRes = runProcess(solRunCmd, dir, testInput, TIMEOUT_EXEC_MS);
                if (solRes.timedOut) {
                    return new StressTestResultResponse(
                            true,
                            testInput,
                            expectedOutput,
                            "Time Limit Exceeded (> " + TIMEOUT_EXEC_MS + "ms)",
                            "Counterexample found: Your solution exceeded time limit (infinite loop or inefficient complexity) on iteration " + i + ".",
                            i,
                            bruteForceSource,
                            generatorSource
                    );
                }

                if (solRes.exitCode != 0) {
                    return new StressTestResultResponse(
                            true,
                            testInput,
                            expectedOutput,
                            "Runtime Error (Exit Code " + solRes.exitCode + "):\n" + solRes.stderr.trim(),
                            "Counterexample found: Your solution crashed with runtime error on iteration " + i + ".",
                            i,
                            bruteForceSource,
                            generatorSource
                    );
                }

                String actualOutput = solRes.stdout.trim();

                // Compare outputs
                if (!expectedOutput.equals(actualOutput)) {
                    log.info("Found mismatch on iteration {}: expected='{}', actual='{}'", i, expectedOutput, actualOutput);
                    return new StressTestResultResponse(
                            true,
                            testInput,
                            expectedOutput,
                            actualOutput,
                            "Differential mismatch detected on randomized iteration " + i + "!",
                            i,
                            bruteForceSource,
                            generatorSource
                    );
                }
            }

            return new StressTestResultResponse(
                    false,
                    null,
                    null,
                    null,
                    "Passed all " + runs + " randomized stress test iterations within problem bounds! No discrepancies found.",
                    runs,
                    bruteForceSource,
                    generatorSource
            );

        } catch (Exception e) {
            log.error("Error executing stress test: {}", e.getMessage(), e);
            return errorResult("Internal execution error: " + e.getMessage(), generatorSource, bruteForceSource);
        } finally {
            if (tempDir != null) {
                cleanupDir(tempDir);
            }
        }
    }

    private StressTestResultResponse errorResult(String message, String generatorSource, String bruteForceSource) {
        return new StressTestResultResponse(
                false,
                null,
                null,
                null,
                message,
                0,
                bruteForceSource,
                generatorSource
        );
    }

    private String getExtension(ProgrammingLanguage language) {
        return switch (language) {
            case CPP -> "cpp";
            case JAVA -> "java";
            case PYTHON -> "py";
        };
    }

    private ProcessResult runProcess(List<String> command, File dir, String stdinData, long timeoutMs) {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(dir);

        Process process = null;
        try {
            process = pb.start();

            // Feed stdin if provided
            if (stdinData != null) {
                try (OutputStream os = process.getOutputStream()) {
                    os.write(stdinData.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                } catch (IOException ignored) {}
            }

            Process proc = process;
            CompletableFuture<String> stdoutFuture = CompletableFuture.supplyAsync(() -> readStream(proc.getInputStream()));
            CompletableFuture<String> stderrFuture = CompletableFuture.supplyAsync(() -> readStream(proc.getErrorStream()));

            boolean finished = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS);
            if (!finished) {
                process.destroyForcibly();
                return new ProcessResult(-1, "", "Process timed out after " + timeoutMs + "ms", true);
            }

            int exitCode = process.exitValue();
            String stdout = stdoutFuture.get(1, TimeUnit.SECONDS);
            String stderr = stderrFuture.get(1, TimeUnit.SECONDS);

            return new ProcessResult(exitCode, stdout, stderr, false);
        } catch (Exception e) {
            if (process != null) {
                process.destroyForcibly();
            }
            return new ProcessResult(-1, "", e.getMessage(), false);
        }
    }

    private String readStream(InputStream is) {
        try {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private void cleanupDir(Path path) {
        try {
            Files.walk(path)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
        } catch (Exception ignored) {}
    }

    private record ProcessResult(int exitCode, String stdout, String stderr, boolean timedOut) {}
}
