package com.lakshit.projects.lovable_clone.dto.dsa;

import jakarta.validation.constraints.NotBlank;

public record TestCaseRequest(
        @NotBlank String input,
        @NotBlank String expectedOutput,
        @NotBlank String actualOutput,
        String explanation
) {
}
