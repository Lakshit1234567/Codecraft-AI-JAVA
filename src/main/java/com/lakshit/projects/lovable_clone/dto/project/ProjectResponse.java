package com.lakshit.projects.lovable_clone.dto.project;

import com.lakshit.projects.lovable_clone.dto.auth.UserProfileResponse;
import com.lakshit.projects.lovable_clone.enums.ProjectType;

import java.time.Instant;

public record ProjectResponse(
        Long id,
        String name,
        ProjectType type,
        Instant createdAt,
        Instant updatedAt,
        UserProfileResponse owner
) {
}
