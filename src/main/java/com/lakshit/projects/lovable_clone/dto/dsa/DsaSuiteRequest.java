package com.lakshit.projects.lovable_clone.dto.dsa;

import com.lakshit.projects.lovable_clone.enums.ProgrammingLanguage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DsaSuiteRequest(
        @NotNull ProgrammingLanguage language,
        @NotBlank String problemDescription,
        String studentCode
) {
}
