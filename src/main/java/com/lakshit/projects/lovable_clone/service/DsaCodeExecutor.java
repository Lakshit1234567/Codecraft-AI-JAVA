package com.lakshit.projects.lovable_clone.service;

import com.lakshit.projects.lovable_clone.dto.dsa.StressTestResultResponse;
import com.lakshit.projects.lovable_clone.enums.ProgrammingLanguage;

public interface DsaCodeExecutor {

    StressTestResultResponse executeDifferentialTesting(
            ProgrammingLanguage language,
            String generatorSource,
            String bruteForceSource,
            String studentSource,
            int maxIterations
    );
}
