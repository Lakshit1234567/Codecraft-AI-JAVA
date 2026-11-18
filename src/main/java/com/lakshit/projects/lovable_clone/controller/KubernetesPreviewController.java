package com.lakshit.projects.lovable_clone.controller;

import com.lakshit.projects.lovable_clone.dto.k8s.K8sPreviewStatusResponse;
import com.lakshit.projects.lovable_clone.service.KubernetesPreviewService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class KubernetesPreviewController {

    private final KubernetesPreviewService kubernetesPreviewService;

    @PostMapping({"/api/k8s-preview/{projectId}/deploy", "/deploy/{projectId}"})
    public ResponseEntity<K8sPreviewStatusResponse> deployPreviewPod(@PathVariable Long projectId) {
        return ResponseEntity.ok(kubernetesPreviewService.deployPreviewPod(projectId));
    }

    @GetMapping("/api/k8s-preview/{projectId}/status")
    public ResponseEntity<K8sPreviewStatusResponse> getPreviewPodStatus(@PathVariable Long projectId) {
        return ResponseEntity.ok(kubernetesPreviewService.getPreviewPodStatus(projectId));
    }

    @PostMapping("/api/k8s-preview/{projectId}/exec")
    public ResponseEntity<Map<String, String>> execCommand(
            @PathVariable Long projectId,
            @RequestBody ExecRequest request
    ) {
        String result = kubernetesPreviewService.runCommand(
                request.getCommand(),
                projectId,
                request.getContainer() != null ? request.getContainer() : "runner"
        );
        return ResponseEntity.ok(Map.of("output", result));
    }

    @DeleteMapping("/api/k8s-preview/{projectId}")
    public ResponseEntity<Void> terminatePreviewPod(@PathVariable Long projectId) {
        kubernetesPreviewService.terminatePreviewPod(projectId);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class ExecRequest {
        private String command;
        private String container;
    }
}
