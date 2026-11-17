package com.lakshit.projects.lovable_clone.dto.project;

import com.lakshit.projects.lovable_clone.enums.ProjectType;
import jakarta.validation.constraints.NotBlank;

public record ProjectRequest(
        @NotBlank String name,
        ProjectType type) {
    public ProjectRequest(String name) {
        this(name, ProjectType.WEB_APP);
    }
}
