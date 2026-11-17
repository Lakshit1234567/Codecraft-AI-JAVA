package com.lakshit.projects.lovable_clone.dto.k8s;

public record K8sPreviewStatusResponse(
        Long projectId,
        String podName,
        String status,
        String cluster,
        String nodeName,
        String podIp,
        String previewUrl,
        String logs,
        int port
) {
}
