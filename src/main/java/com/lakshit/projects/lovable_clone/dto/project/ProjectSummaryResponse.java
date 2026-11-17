package com.lakshit.projects.lovable_clone.dto.project;

import com.lakshit.projects.lovable_clone.enums.ProjectRole;
import com.lakshit.projects.lovable_clone.enums.ProjectType;

import java.time.Instant;

public record ProjectSummaryResponse(
        Long id,
        String name,
        ProjectType type,
        Instant createdAt,
        Instant updatedAt,
        ProjectRole role
) {
}
