package com.lakshit.projects.lovable_clone.dto.dsa;

import com.lakshit.projects.lovable_clone.enums.ProgrammingLanguage;

public record DsaSuiteResponse(
        Long projectId,
        ProgrammingLanguage language,
        String bruteForceCode,
        String bruteForcePath,
        String generatorCode,
        String generatorPath,
        String inputBoundsSummary
) {
}
