package com.lakshit.projects.lovable_clone.dto.dsa;

import com.lakshit.projects.lovable_clone.enums.TestCaseStatus;

import java.time.Instant;

public record TestCaseResponse(
        Long id,
        Long projectId,
        String input,
        String expectedOutput,
        String actualOutput,
        String explanation,
        TestCaseStatus status,
        Instant createdAt
) {
}
