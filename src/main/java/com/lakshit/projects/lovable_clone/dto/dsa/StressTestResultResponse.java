package com.lakshit.projects.lovable_clone.dto.dsa;

public record StressTestResultResponse(
        boolean foundCounterexample,
        String failingInput,
        String expectedOutput,
        String actualOutput,
        String message,
        int iterationsRun,
        String bruteForceCode,
        String generatorCode
) {
}
