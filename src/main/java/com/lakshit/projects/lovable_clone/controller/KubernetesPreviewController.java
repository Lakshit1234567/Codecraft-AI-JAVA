package com.lakshit.projects.lovable_clone.controller;

import com.lakshit.projects.lovable_clone.dto.k8s.K8sPreviewStatusResponse;
import com.lakshit.projects.lovable_clone.service.KubernetesPreviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/k8s-preview/{projectId}")
@RequiredArgsConstructor
public class KubernetesPreviewController {

    private final KubernetesPreviewService kubernetesPreviewService;

    @PostMapping("/deploy")
    @PreAuthorize("@security.canEditProject(#projectId)")
    public ResponseEntity<K8sPreviewStatusResponse> deployPreviewPod(@PathVariable Long projectId) {
        return ResponseEntity.ok(kubernetesPreviewService.deployPreviewPod(projectId));
    }

    @GetMapping("/status")
    @PreAuthorize("@security.canViewProject(#projectId)")
    public ResponseEntity<K8sPreviewStatusResponse> getPreviewPodStatus(@PathVariable Long projectId) {
        return ResponseEntity.ok(kubernetesPreviewService.getPreviewPodStatus(projectId));
    }

    @DeleteMapping
    @PreAuthorize("@security.canEditProject(#projectId)")
    public ResponseEntity<Void> terminatePreviewPod(@PathVariable Long projectId) {
        kubernetesPreviewService.terminatePreviewPod(projectId);
        return ResponseEntity.noContent().build();
    }
}
