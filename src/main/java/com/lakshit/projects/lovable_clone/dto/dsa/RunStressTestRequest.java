package com.lakshit.projects.lovable_clone.dto.dsa;

import com.lakshit.projects.lovable_clone.enums.ProgrammingLanguage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RunStressTestRequest(
        @NotNull ProgrammingLanguage language,
        @NotBlank String problemDescription,
        @NotBlank String studentCode,
        String bruteForceCode,
        String generatorCode
) {
}
