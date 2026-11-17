package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.dto.k8s.K8sPreviewStatusResponse;
import com.lakshit.projects.lovable_clone.dto.project.FileNode;
import com.lakshit.projects.lovable_clone.service.KubernetesPreviewService;
import com.lakshit.projects.lovable_clone.service.ProjectFileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class KubernetesPreviewServiceImpl implements KubernetesPreviewService {

    private final ProjectFileService projectFileService;

    // Track background port-forward processes by projectId
    private final Map<Long, Process> portForwardProcesses = new ConcurrentHashMap<>();

    private static final String CLUSTER_NAME = "lovable-cluster";

    @Override
    public K8sPreviewStatusResponse deployPreviewPod(Long projectId) {
        String podName = "preview-pod-" + projectId;
        String cmName = "preview-cm-" + projectId;
        int hostPort = 32000 + (int) (projectId % 1000);

        try {
            // 1. Gather project files and generate standalone web bundle HTML
            String bundledHtml = buildBundledHtml(projectId);

            // 2. Write HTML to a temp file
            Path tempHtml = Files.createTempFile("preview_", ".html");
            Files.writeString(tempHtml, bundledHtml, StandardCharsets.UTF_8);

            // 3. Delete existing ConfigMap and Pod if any
            runKubectl(List.of("delete", "pod", podName, "--ignore-not-found=true"), null, 5000);
            runKubectl(List.of("delete", "configmap", cmName, "--ignore-not-found=true"), null, 5000);

            // 4. Create new ConfigMap containing index.html
            String cmYaml = String.format("""
                    apiVersion: v1
                    kind: ConfigMap
                    metadata:
                      name: %s
                      labels:
                        app: lovable-preview
                        projectId: "%d"
                    data:
                      index.html: |
                    %s
                    """,
                    cmName,
                    projectId,
                    bundledHtml.indent(4)
            );
            runKubectl(List.of("apply", "-f", "-"), cmYaml, 5000);

            Files.deleteIfExists(tempHtml);

            // 5. Apply Pod manifest
            String podYaml = String.format("""
                    apiVersion: v1
                    kind: Pod
                    metadata:
                      name: %s
                      labels:
                        app: lovable-preview
                        projectId: "%d"
                    spec:
                      containers:
                      - name: web-server
                        image: nginx:alpine
                        ports:
                        - containerPort: 80
                        volumeMounts:
                        - name: web-content
                          mountPath: /usr/share/nginx/html
                      volumes:
                      - name: web-content
                        configMap:
                          name: %s
                      restartPolicy: Never
                    """,
                    podName,
                    projectId,
                    cmName
            );
            runKubectl(List.of("apply", "-f", "-"), podYaml, 5000);

            // 6. Kill previous port-forward process if running
            stopPortForward(projectId);

            // 7. Start port-forward in background
            startPortForward(projectId, podName, hostPort);

            // 8. Poll for 3 seconds to see if pod starts running
            String status = "PENDING";
            String nodeName = "lovable-cluster-control-plane";
            String podIp = "N/A";

            for (int i = 0; i < 6; i++) {
                Thread.sleep(500);
                K8sPreviewStatusResponse current = queryPodStatus(projectId, podName, hostPort);
                if ("RUNNING".equalsIgnoreCase(current.status())) {
                    return current;
                }
                status = current.status();
                nodeName = current.nodeName();
                podIp = current.podIp();
            }

            return new K8sPreviewStatusResponse(
                    projectId,
                    podName,
                    status,
                    CLUSTER_NAME,
                    nodeName,
                    podIp,
                    "http://localhost:" + hostPort,
                    "Container initializing in Kubernetes pod...",
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
        String cmName = "preview-cm-" + projectId;
        stopPortForward(projectId);
        try {
            runKubectl(List.of("delete", "pod", podName, "--ignore-not-found=true"), null, 5000);
            runKubectl(List.of("delete", "configmap", cmName, "--ignore-not-found=true"), null, 5000);
        } catch (Exception e) {
            log.warn("Error deleting k8s preview pod for #{}: {}", projectId, e.getMessage());
        }
    }

    private K8sPreviewStatusResponse queryPodStatus(Long projectId, String podName, int hostPort) {
        try {
            ProcessResult res = runKubectl(List.of(
                    "get", "pod", podName,
                    "-o", "jsonpath={.status.phase},{.spec.nodeName},{.status.podIP}"
            ), null, 3000);

            if (res.exitCode != 0 || res.stdout.isBlank()) {
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

            String[] parts = res.stdout.trim().split(",");
            String phase = parts.length > 0 && !parts[0].isBlank() ? parts[0].toUpperCase() : "UNKNOWN";
            String node = parts.length > 1 && !parts[1].isBlank() ? parts[1] : "lovable-cluster-control-plane";
            String ip = parts.length > 2 && !parts[2].isBlank() ? parts[2] : "Pending";

            ProcessResult logRes = runKubectl(List.of("logs", podName, "--tail=10"), null, 2000);
            String logs = logRes.stdout.isBlank() ? "Nginx serving project preview on port 80." : logRes.stdout;

            // Check if port-forward process is still alive; if not, restart it
            Process pf = portForwardProcesses.get(projectId);
            if (pf == null || !pf.isAlive()) {
                if ("RUNNING".equalsIgnoreCase(phase)) {
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
                    "Not deployed",
                    hostPort
            );
        }
    }

    private void startPortForward(Long projectId, String podName, int hostPort) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "kubectl", "port-forward", "pod/" + podName, hostPort + ":80"
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            portForwardProcesses.put(projectId, process);
            log.info("Started kubectl port-forward for projectId #{} on http://localhost:{}", projectId, hostPort);
        } catch (Exception e) {
            log.error("Failed to start port-forward for projectId #{}: {}", projectId, e.getMessage());
        }
    }

    private void stopPortForward(Long projectId) {
        Process p = portForwardProcesses.remove(projectId);
        if (p != null) {
            p.destroyForcibly();
        }
    }

    private String buildBundledHtml(Long projectId) {
        List<FileNode> files = projectFileService.getFileTree(projectId).files();
        String appCode = "";
        String cssCode = "";
        StringBuilder subcomponents = new StringBuilder();

        if (files != null) {
            for (FileNode node : files) {
                String path = node.path();
                try {
                    String content = projectFileService.getFileContent(projectId, path).content();
                    if ("src/App.tsx".equals(path) || "App.tsx".equals(path)) {
                        appCode = content;
                    } else if (path.endsWith(".css")) {
                        cssCode += "\n" + content;
                    } else if (path.endsWith(".tsx")) {
                        String name = path.substring(path.lastIndexOf('/') + 1).replace(".tsx", "");
                        subcomponents.append(String.format("""
                                try {
                                  %s
                                  if (typeof %s !== 'undefined') {
                                    Components['%s'] = %s;
                                  }
                                } catch(e) { console.error('Subcomponent error: %s', e); }
                                """, sanitizeCode(content), name, name, name, name));
                    }
                } catch (Exception ignored) {}
            }
        }

        if (appCode.isBlank()) {
            appCode = "function App() { return <div className='p-8 text-center text-white font-sans'>No App.tsx source code generated yet.</div>; }";
        }

        return String.format("""
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>Kubernetes Pod Live Preview</title>
                  <script src="https://cdn.tailwindcss.com"></script>
                  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                  <style>
                    body { margin: 0; background-color: #030712; color: #f8fafc; font-family: system-ui, sans-serif; }
                    %s
                  </style>
                </head>
                <body>
                  <div id="root"></div>
                  <!-- Lucide Proxy Shim -->
                  <script type="text/babel">
                    const { createElement: h } = React;
                    function createLucideIcon(paths) {
                      return function(props) {
                        return h('svg', {
                          xmlns: 'http://www.w3.org/2000/svg', width: props.size || 20, height: props.size || 20,
                          viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2,
                          strokeLinecap: 'round', strokeLinejoin: 'round', className: props.className || '', ...props
                        }, paths.map((d, i) => h('path', { key: i, d })));
                      };
                    }
                    window.LucideProxy = new Proxy({}, {
                      get: (target, prop) => function(props) {
                        return h('span', { className: 'inline-flex items-center text-indigo-400 font-mono text-xs', ...props }, '✦');
                      }
                    });
                  </script>
                  <script type="text/babel" data-presets="react,typescript">
                    const { useState, useEffect, useMemo, useCallback, useRef } = React;
                    const Components = {};
                    %s
                    %s
                    try {
                      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
                    } catch(err) {
                      document.getElementById('root').innerHTML = '<div style="color:red;padding:2rem;">Render Error: ' + err.message + '</div>';
                    }
                  </script>
                </body>
                </html>
                """,
                cssCode,
                subcomponents.toString(),
                sanitizeCode(appCode)
        );
    }

    private String sanitizeCode(String code) {
        String clean = code.replaceAll("import\\s+[\\s\\S]*?from\\s+['\"][^'\"]+['\"];?", "");
        clean = clean.replaceAll("export\\s+default\\s+([A-Za-z0-9_]+);?", "");
        clean = clean.replaceAll("export\\s+(function|const|let|var)\\s+", "$1 ");
        return clean;
    }

    private ProcessResult runKubectl(List<String> args, String stdin, long timeoutMs) throws Exception {
        List<String> command = new ArrayList<>();
        command.add("kubectl");
        command.addAll(args);

        ProcessBuilder pb = new ProcessBuilder(command);
        Process p = pb.start();

        if (stdin != null) {
            try (OutputStream os = p.getOutputStream()) {
                os.write(stdin.getBytes(StandardCharsets.UTF_8));
                os.flush();
            }
        }

        CompletableFuture<String> outFuture = CompletableFuture.supplyAsync(() -> readStream(p.getInputStream()));
        CompletableFuture<String> errFuture = CompletableFuture.supplyAsync(() -> readStream(p.getErrorStream()));

        boolean finished = p.waitFor(timeoutMs, TimeUnit.MILLISECONDS);
        if (!finished) {
            p.destroyForcibly();
            return new ProcessResult(-1, "", "Timed out");
        }

        return new ProcessResult(p.exitValue(), outFuture.get(), errFuture.get());
    }

    private String readStream(InputStream is) {
        try {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private record ProcessResult(int exitCode, String stdout, String stderr) {}
}
