package com.lakshit.projects.lovable_clone.service;

import com.lakshit.projects.lovable_clone.dto.k8s.K8sPreviewStatusResponse;

public interface KubernetesPreviewService {

    K8sPreviewStatusResponse deployPreviewPod(Long projectId);

    K8sPreviewStatusResponse getPreviewPodStatus(Long projectId);

    void terminatePreviewPod(Long projectId);

    String runCommand(String command, Long projectId, String containerName);
}
