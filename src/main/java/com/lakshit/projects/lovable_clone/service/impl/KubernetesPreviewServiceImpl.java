package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.dto.k8s.K8sPreviewStatusResponse;
import com.lakshit.projects.lovable_clone.service.KubernetesPreviewService;
import com.lakshit.projects.lovable_clone.service.ProjectFileService;
import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.fabric8.kubernetes.client.dsl.ExecWatch;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class KubernetesPreviewServiceImpl implements KubernetesPreviewService {

    private final ProjectFileService projectFileService;

    // Fabric8 Kubernetes Client
    private final KubernetesClient k8sClient = new KubernetesClientBuilder().build();

    // Track background port-forward processes by projectId
    private final Map<Long, Process> portForwardProcesses = new ConcurrentHashMap<>();

    private static final String CLUSTER_NAME = "lovable-cluster";
    private static final String NAMESPACE = "default";
    private static final String SYNCER_CONFIGMAP = "preview-syncer-config";

    @PreDestroy
    public void cleanup() {
        for (Map.Entry<Long, Process> entry : portForwardProcesses.entrySet()) {
            try {
                entry.getValue().destroyForcibly();
            } catch (Exception ignored) {}
        }
        portForwardProcesses.clear();

        try {
            k8sClient.close();
        } catch (Exception ignored) {}
    }

    @Override
    public K8sPreviewStatusResponse deployPreviewPod(Long projectId) {
        String podName = "preview-pod-" + projectId;
        int hostPort = 32000 + (int) (projectId % 1000);

        try {
            log.info("Deploying two-container Vite preview pod for projectId #{} on port {}", projectId, hostPort);

            // Ensure project files exist in MinIO (trigger file tree loading which initializes template if empty)
            try {
                projectFileService.getFileTree(projectId);
            } catch (Exception e) {
                log.warn("Project #{} file tree check: {}", projectId, e.getMessage());
            }

            // Ensure preview-syncer-config ConfigMap exists
            ensureSyncerConfigMap();

            // 1. Terminate existing pod if running and wait for it to be completely removed
            try {
                Pod existing = k8sClient.pods().inNamespace(NAMESPACE).withName(podName).get();
                if (existing != null) {
                    k8sClient.pods().inNamespace(NAMESPACE).withName(podName).withGracePeriod(0).delete();
                    for (int i = 0; i < 20; i++) {
                        Thread.sleep(300);
                        if (k8sClient.pods().inNamespace(NAMESPACE).withName(podName).get() == null) {
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {}

            // 2. Kill existing port-forward process
            stopPortForward(projectId);

            // 3. Define the two-container pod (runner + syncer sharing /app emptyDir)
            Volume appVolume = new VolumeBuilder()
                    .withName("app-dir")
                    .withNewEmptyDir().endEmptyDir()
                    .build();

            Volume syncerVolume = new VolumeBuilder()
                    .withName("syncer-script")
                    .withNewConfigMap()
                        .withName(SYNCER_CONFIGMAP)
                    .endConfigMap()
                    .build();

            VolumeMount appMount = new VolumeMountBuilder()
                    .withName("app-dir")
                    .withMountPath("/app")
                    .build();

            VolumeMount syncerMount = new VolumeMountBuilder()
                    .withName("syncer-script")
                    .withMountPath("/scripts")
                    .build();

            // Syncer container: watches MinIO and syncs code files into /app
            Container syncerContainer = new ContainerBuilder()
                    .withName("syncer")
                    .withImage("node:20-alpine")
                    .withImagePullPolicy("IfNotPresent")
                    .withCommand("node", "/scripts/syncer.js")
                    .withEnv(
                            new EnvVarBuilder().withName("PROJECT_ID").withValue(String.valueOf(projectId)).build(),
                            new EnvVarBuilder().withName("MINIO_HOST").withValue("minio").build(),
                            new EnvVarBuilder().withName("MINIO_PORT").withValue("9000").build(),
                            new EnvVarBuilder().withName("MINIO_BUCKET").withValue("projects").build()
                    )
                    .withVolumeMounts(appMount, syncerMount)
                    .build();

            // Runner container: Vite server on port 5173 with HMR
            String runnerScript = """
                    echo "[Runner] Waiting for package.json in /app..."
                    while [ ! -f /app/package.json ]; do sleep 0.5; done
                    echo "[Runner] Found package.json. Setting up dependencies..."
                    if [ -d /cached-node-modules/node_modules ] && [ ! -d /app/node_modules ]; then
                      echo "[Runner] Copying cached node_modules..."
                      cp -r /cached-node-modules/node_modules /app/node_modules
                    elif [ ! -d /app/node_modules ]; then
                      echo "[Runner] Running npm install..."
                      cd /app && npm install
                    fi
                    echo "[Runner] Starting Vite development server on port 5173..."
                    cd /app && ./node_modules/.bin/vite --host 0.0.0.0 --port 5173
                    """;

            Container runnerContainer = new ContainerBuilder()
                    .withName("runner")
                    .withImage("lovable-runner:20-alpine")
                    .withImagePullPolicy("IfNotPresent")
                    .withPorts(new ContainerPortBuilder().withContainerPort(5173).build())
                    .withVolumeMounts(appMount)
                    .withCommand("sh", "-c")
                    .withArgs(runnerScript)
                    .build();

            Map<String, String> labels = new HashMap<>();
            labels.put("app", "lovable-preview");
            labels.put("projectId", String.valueOf(projectId));

            Pod pod = new PodBuilder()
                    .withNewMetadata()
                        .withName(podName)
                        .withNamespace(NAMESPACE)
                        .withLabels(labels)
                    .endMetadata()
                    .withNewSpec()
                        .withRestartPolicy("Never")
                        .withVolumes(appVolume, syncerVolume)
                        .withContainers(syncerContainer, runnerContainer)
                    .endSpec()
                    .build();

            // 4. Create Pod via Fabric8 Kubernetes Client
            k8sClient.pods().inNamespace(NAMESPACE).resource(pod).create();
            log.info("Created Pod {} in Kubernetes via fabric8 client", podName);

            // 5. Poll for pod to start running and Vite to be ready before establishing port-forward
            String status = "PENDING";
            String nodeName = "lovable-cluster-control-plane";
            String podIp = "N/A";

            for (int i = 0; i < 40; i++) {
                Thread.sleep(500);
                K8sPreviewStatusResponse current = queryPodStatus(projectId, podName, hostPort);
                status = current.status();
                nodeName = current.nodeName();
                podIp = current.podIp();

                if ("RUNNING".equalsIgnoreCase(status)) {
                    String runnerLogs = "";
                    try {
                        runnerLogs = k8sClient.pods().inNamespace(NAMESPACE).withName(podName).inContainer("runner").tailingLines(10).getLog();
                    } catch (Exception ignored) {}

                    if (runnerLogs != null && (runnerLogs.contains("ready in") || runnerLogs.contains("Local:"))) {
                        startPortForward(projectId, podName, hostPort);
                        return new K8sPreviewStatusResponse(
                                projectId,
                                podName,
                                "RUNNING",
                                CLUSTER_NAME,
                                nodeName,
                                podIp,
                                "http://localhost:" + hostPort,
                                runnerLogs,
                                hostPort
                        );
                    }
                }
            }

            // Pod still initializing; launch port-forward anyway and return status
            startPortForward(projectId, podName, hostPort);

            return new K8sPreviewStatusResponse(
                    projectId,
                    podName,
                    status,
                    CLUSTER_NAME,
                    nodeName,
                    podIp,
                    "http://localhost:" + hostPort,
                    "Vite runner initializing on port 5173...",
                    hostPort
            );

        } catch (Exception e) {
            log.error("Failed to deploy preview pod for projectId {}: {}", projectId, e.getMessage(), e);
            return new K8sPreviewStatusResponse(
                    projectId,
                    podName,
                    "ERROR",
                    CLUSTER_NAME,
                    "N/A",
                    "N/A",
                    "http://localhost:" + hostPort,
                    "Deployment failed: " + e.getMessage(),
                    hostPort
            );
        }
    }

    @Override
    public K8sPreviewStatusResponse getPreviewPodStatus(Long projectId) {
        String podName = "preview-pod-" + projectId;
        int hostPort = 32000 + (int) (projectId % 1000);
        return queryPodStatus(projectId, podName, hostPort);
    }

    @Override
    public void terminatePreviewPod(Long projectId) {
        String podName = "preview-pod-" + projectId;
        stopPortForward(projectId);
        try {
            k8sClient.pods().inNamespace(NAMESPACE).withName(podName).withGracePeriod(0).delete();
            log.info("Deleted Pod {} via fabric8 client", podName);
        } catch (Exception e) {
            log.warn("Error deleting k8s preview pod for #{}: {}", projectId, e.getMessage());
        }
    }

    @Override
    public String runCommand(String command, Long projectId, String containerName) {
        String podName = "preview-pod-" + projectId;
        String targetContainer = (containerName != null && !containerName.isBlank()) ? containerName : "runner";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ByteArrayOutputStream err = new ByteArrayOutputStream();
        try {
            log.info("Executing command '{}' on pod {} container {} via fabric8 client", command, podName, targetContainer);
            try (ExecWatch watch = k8sClient.pods().inNamespace(NAMESPACE)
                    .withName(podName)
                    .inContainer(targetContainer)
                    .writingOutput(out)
                    .writingError(err)
                    .exec("sh", "-c", command)) {
                Integer exitCode = watch.exitCode().get(60, TimeUnit.SECONDS);
                log.info("Command completed with exit code: {}", exitCode);
            }
            String output = out.toString(StandardCharsets.UTF_8).trim();
            String errorOutput = err.toString(StandardCharsets.UTF_8).trim();
            return output.isBlank() ? errorOutput : output;
        } catch (Exception e) {
            log.error("Failed to execute command on pod {}/{}: {}", podName, targetContainer, e.getMessage(), e);
            return "Execution error: " + e.getMessage();
        }
    }

    private K8sPreviewStatusResponse queryPodStatus(Long projectId, String podName, int hostPort) {
        try {
            Pod pod = k8sClient.pods().inNamespace(NAMESPACE).withName(podName).get();
            if (pod == null || pod.getStatus() == null) {
                return new K8sPreviewStatusResponse(
                        projectId,
                        podName,
                        "STOPPED",
                        CLUSTER_NAME,
                        "N/A",
                        "N/A",
                        "http://localhost:" + hostPort,
                        "Pod is not running.",
                        hostPort
                );
            }

            String phase = pod.getStatus().getPhase() != null ? pod.getStatus().getPhase().toUpperCase() : "UNKNOWN";
            String node = pod.getSpec() != null && pod.getSpec().getNodeName() != null ? pod.getSpec().getNodeName() : "lovable-cluster-control-plane";
            String ip = pod.getStatus().getPodIP() != null ? pod.getStatus().getPodIP() : "Pending";

            String logs = "";
            try {
                logs = k8sClient.pods().inNamespace(NAMESPACE).withName(podName).inContainer("runner").tailingLines(15).getLog();
            } catch (Exception ignored) {}
            if (logs == null || logs.isBlank()) {
                logs = "Vite runner initializing on port 5173...";
            }

            // Check if port-forward process is alive and healthy; if not, start it
            if ("RUNNING".equalsIgnoreCase(phase) && logs.contains("ready in")) {
                Process pf = portForwardProcesses.get(projectId);
                if (pf == null || !pf.isAlive() || !isPortListening(hostPort)) {
                    startPortForward(projectId, podName, hostPort);
                }
            }

            return new K8sPreviewStatusResponse(
                    projectId,
                    podName,
                    phase,
                    CLUSTER_NAME,
                    node,
                    ip,
                    "http://localhost:" + hostPort,
                    logs,
                    hostPort
            );
        } catch (Exception e) {
            return new K8sPreviewStatusResponse(
                    projectId,
                    podName,
                    "STOPPED",
                    CLUSTER_NAME,
                    "N/A",
                    "N/A",
                    "http://localhost:" + hostPort,
                    "Not deployed: " + e.getMessage(),
                    hostPort
            );
        }
    }

    private boolean isPortListening(int port) {
        try (Socket s = new Socket("127.0.0.1", port)) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private synchronized void startPortForward(Long projectId, String podName, int hostPort) {
        Process existing = portForwardProcesses.get(projectId);
        if (existing != null && existing.isAlive() && isPortListening(hostPort)) {
            return;
        }

        if (existing != null) {
            try {
                existing.destroyForcibly();
            } catch (Exception ignored) {}
        }

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "kubectl", "port-forward", "--address", "127.0.0.1", "pod/" + podName, hostPort + ":5173"
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            portForwardProcesses.put(projectId, process);

            CompletableFuture.runAsync(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        log.debug("[k8s-pf-{}] {}", projectId, line);
                    }
                } catch (Exception ignored) {}
            });

            // Wait synchronously for port to actually open and accept connections (up to 4s)
            boolean bound = false;
            for (int i = 0; i < 40; i++) {
                if (!process.isAlive()) {
                    log.warn("kubectl port-forward for projectId #{} exited prematurely", projectId);
                    break;
                }
                if (isPortListening(hostPort)) {
                    bound = true;
                    log.info("kubectl port-forward verified listening on http://localhost:{} for projectId #{}", hostPort, projectId);
                    break;
                }
                try {
                    Thread.sleep(100);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }

            if (!bound) {
                log.warn("Port {} not accepting connections yet, process alive={}", hostPort, process.isAlive());
            }

        } catch (Exception e) {
            log.error("Failed to start port-forward for projectId #{}: {}", projectId, e.getMessage());
        }
    }

    private synchronized void stopPortForward(Long projectId) {
        Process p = portForwardProcesses.remove(projectId);
        if (p != null) {
            p.destroyForcibly();
        }
    }

    private void ensureSyncerConfigMap() {
        try {
            ConfigMap cm = k8sClient.configMaps().inNamespace(NAMESPACE).withName(SYNCER_CONFIGMAP).get();
            if (cm == null) {
                File syncerFile = new File("k8s/syncer.js");
                String script = "";
                if (syncerFile.exists()) {
                    script = java.nio.file.Files.readString(syncerFile.toPath());
                } else {
                    script = "// syncer placeholder";
                }
                ConfigMap newCm = new ConfigMapBuilder()
                        .withNewMetadata().withName(SYNCER_CONFIGMAP).withNamespace(NAMESPACE).endMetadata()
                        .addToData("syncer.js", script)
                        .build();
                k8sClient.configMaps().inNamespace(NAMESPACE).resource(newCm).create();
                log.info("Auto-created ConfigMap {}", SYNCER_CONFIGMAP);
            }
        } catch (Exception e) {
            log.warn("ensureSyncerConfigMap check: {}", e.getMessage());
        }
    }
}
