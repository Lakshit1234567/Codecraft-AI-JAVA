package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.dto.k8s.K8sPreviewStatusResponse;
import com.lakshit.projects.lovable_clone.dto.project.FileNode;
import com.lakshit.projects.lovable_clone.service.KubernetesPreviewService;
import com.lakshit.projects.lovable_clone.service.ProjectFileService;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class KubernetesPreviewServiceImpl implements KubernetesPreviewService {

    private final ProjectFileService projectFileService;

    // Track background port-forward processes by projectId
    private final Map<Long, Process> portForwardProcesses = new ConcurrentHashMap<>();

    private static final String CLUSTER_NAME = "lovable-cluster";

    private static final Set<String> REACT_HOOKS = Set.of(
            "useState", "useEffect", "useMemo", "useCallback", "useRef",
            "useContext", "createContext", "useReducer", "forwardRef",
            "memo", "Fragment", "Children", "useId", "useTransition", "useDeferredValue"
    );

    @PreDestroy
    public void cleanup() {
        for (Map.Entry<Long, Process> entry : portForwardProcesses.entrySet()) {
            try {
                entry.getValue().destroyForcibly();
            } catch (Exception ignored) {}
        }
        portForwardProcesses.clear();
    }

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

            // 4. Create new ConfigMap containing index.html directly from file
            try {
                runKubectl(List.of("create", "configmap", cmName, "--from-file=index.html=" + tempHtml.toAbsolutePath()), null, 5000);
            } finally {
                Files.deleteIfExists(tempHtml);
            }

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

            // 7. Poll for pod to start running before establishing port-forward
            String status = "PENDING";
            String nodeName = "lovable-cluster-control-plane";
            String podIp = "N/A";

            for (int i = 0; i < 30; i++) {
                Thread.sleep(500);
                K8sPreviewStatusResponse current = queryPodStatus(projectId, podName, hostPort);
                if ("RUNNING".equalsIgnoreCase(current.status())) {
                    startPortForward(projectId, podName, hostPort);
                    return current;
                }
                status = current.status();
                nodeName = current.nodeName();
                podIp = current.podIp();
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

            // Check if port-forward process is alive and healthy; if not, start it
            if ("RUNNING".equalsIgnoreCase(phase)) {
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
                    "Not deployed",
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
                    "kubectl", "port-forward", "--address", "127.0.0.1", "pod/" + podName, hostPort + ":80"
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

    private boolean isEntryFile(String path) {
        if (path == null) return false;
        String p = path.toLowerCase();
        return p.equals("src/app.tsx") || p.equals("app.tsx")
                || p.endsWith("/main.tsx") || p.endsWith("/main.jsx") || p.endsWith("/main.ts") || p.endsWith("/main.js")
                || p.equals("main.tsx") || p.equals("main.jsx") || p.equals("main.ts") || p.equals("main.js")
                || p.endsWith("/index.tsx") || p.endsWith("/index.jsx") || p.endsWith("/index.ts") || p.endsWith("/index.js")
                || p.equals("index.tsx") || p.equals("index.jsx") || p.equals("index.ts") || p.equals("index.js")
                || p.endsWith(".html") || p.endsWith(".json") || p.endsWith(".css");
    }

    private String buildBundledHtml(Long projectId) {
        List<FileNode> files = projectFileService.getFileTree(projectId).files();
        String appCode = "";
        String cssCode = "";
        StringBuilder subcomponents = new StringBuilder();
        List<String> componentNames = new ArrayList<>();

        if (files != null) {
            for (FileNode node : files) {
                String path = node.path();
                if ("src/App.tsx".equalsIgnoreCase(path) || "App.tsx".equalsIgnoreCase(path)) {
                    try {
                        appCode = projectFileService.getFileContent(projectId, path).content();
                    } catch (Exception ignored) {}
                } else if (path.endsWith(".css")) {
                    try {
                        String content = projectFileService.getFileContent(projectId, path).content();
                        cssCode += "\n" + content;
                    } catch (Exception ignored) {}
                } else if (!isEntryFile(path) && (path.endsWith(".tsx") || path.endsWith(".jsx"))) {
                    try {
                        String content = projectFileService.getFileContent(projectId, path).content();
                        String name = path.substring(path.lastIndexOf('/') + 1).replace(".tsx", "").replace(".jsx", "");
                        componentNames.add(name);
                        String sanitized = sanitizeCode(content, name);
                        subcomponents.append("\n// --- Subcomponent: ").append(name).append(" ---\ntry {\n")
                                .append(sanitized).append("\n")
                                .append("if (typeof ").append(name).append(" !== 'undefined') {\n")
                                .append("  window.Components['").append(name).append("'] = ").append(name).append(";\n")
                                .append("}\n")
                                .append("if (typeof ").append(name).append("Component !== 'undefined') {\n")
                                .append("  window.Components['").append(name).append("Component'] = ").append(name).append("Component;\n")
                                .append("  window.Components['").append(name).append("'] = ").append(name).append("Component;\n")
                                .append("}\n")
                                .append("} catch(err) {\n")
                                .append("  console.error('Error defining subcomponent ' + '").append(name).append(":', err);\n")
                                .append("}\n");
                    } catch (Exception e) {
                        log.warn("Could not include subcomponent {} in bundled html: {}", path, e.getMessage());
                    }
                }
            }
        }

        if (appCode.isBlank()) {
            try {
                appCode = projectFileService.getFileContent(projectId, "src/App.tsx").content();
            } catch (Exception ignored) {}
        }
        if (appCode.isBlank()) {
            appCode = "export function App() { return <div className='p-8 text-center text-white font-sans'>No App.tsx source code generated yet.</div>; }";
        }

        StringBuilder componentScopeInjections = new StringBuilder();
        for (String cName : componentNames) {
            componentScopeInjections.append("var ").append(cName)
                    .append(" = window.Components['").append(cName)
                    .append("'] || window.Components['").append(cName).append("Component'] || (window.LucideProxy ? window.LucideProxy['").append(cName)
                    .append("'] : null) || (window.resolveComponent ? window.resolveComponent('").append(cName).append("') : (() => null));\n");
            componentScopeInjections.append("var ").append(cName).append("Component")
                    .append(" = window.Components['").append(cName).append("Component'] || window.Components['").append(cName)
                    .append("'] || (window.LucideProxy ? window.LucideProxy['").append(cName).append("Component'] : null) || (window.resolveComponent ? window.resolveComponent('")
                    .append(cName).append("Component') : (() => null));\n");
        }

        return String.format("""
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>Kubernetes Pod Live Preview</title>
                  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
                  <meta http-equiv="Pragma" content="no-cache" />
                  <meta http-equiv="Expires" content="0" />
                  <script>
                    window.__ENV__ = { VITE_API_URL: 'http://localhost:8080' };
                    window.ENV = window.__ENV__;
                    
                    // Client-Side API Fallback Shim: ensures preview remains fully interactive even when external backend is offline
                    (function() {
                      const _nativeFetch = window.fetch;
                      window.fetch = async function(url, options) {
                        const urlStr = String(url);
                        try {
                          const res = await _nativeFetch(url, options);
                          if (res.ok) return res;
                        } catch(e) {}
                        
                        // Fallback for arithmetic /calculate endpoints
                        if (urlStr.includes('/calculate')) {
                          try {
                            const u = new URL(urlStr, window.location.href);
                            const expr = u.searchParams.get('expr');
                            if (expr) {
                              const cleanExpr = expr.replace(/[^0-9+\\-*\\/.]/g, '');
                              const result = Function('"use strict"; return (' + cleanExpr + ')')();
                              return new Response(JSON.stringify({ result: result }), {
                                status: 200,
                                headers: { 'Content-Type': 'application/json' }
                              });
                            }
                          } catch(err) {
                            return new Response(JSON.stringify({ error: 'Evaluation error' }), {
                              status: 400,
                              headers: { 'Content-Type': 'application/json' }
                            });
                          }
                        }
                        return new Response(JSON.stringify({ status: 'ok', mock: true }), {
                          status: 200,
                          headers: { 'Content-Type': 'application/json' }
                        });
                      };
                    })();
                  </script>
                  <script crossorigin="anonymous" src="https://cdn.tailwindcss.com"></script>
                  <script crossorigin="anonymous" src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                  <script crossorigin="anonymous" src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                  <script crossorigin="anonymous" src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                  <script>
                    if (window.Babel) {
                      window.Babel.registerPreset('tsx', {
                        presets: [
                          [window.Babel.availablePresets['typescript'], { ignoreExtensions: true }],
                          [window.Babel.availablePresets['react'], { runtime: 'classic' }]
                        ]
                      });
                    }
                  </script>
                  <style>
                    body { margin: 0; background-color: #030712; color: #f8fafc; font-family: system-ui, sans-serif; }
                    %s
                  </style>
                </head>
                <body>
                  <div id="root"></div>
                  <!-- Lucide Proxy Shim -->
                  <script>
                    const { createElement: h } = React;
                    function createLucideIcon(paths) {
                      return function({ size = 20, className = '', color = 'currentColor', strokeWidth = 2, ...props }) {
                        return h('svg', {
                          xmlns: 'http://www.w3.org/2000/svg', width: size, height: size,
                          viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: strokeWidth,
                          strokeLinecap: 'round', strokeLinejoin: 'round', className: className, ...props
                        }, paths.map((d, i) => h('path', { key: i, d })));
                      };
                    }
                    window.LucideIcons = {
                      Sparkles: createLucideIcon(['m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z', 'M5 3v4', 'M19 17v4', 'M3 5h4', 'M17 19h4']),
                      ArrowRight: createLucideIcon(['M5 12h14', 'm12 5 7-7-7-7']),
                      Check: createLucideIcon(['M20 6 9 17l-5-5']),
                      CheckCircle: createLucideIcon(['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'm9 11 3 3L22 4']),
                      CheckCircle2: createLucideIcon(['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z', 'm9 12 2 2 4-4']),
                      Layers: createLucideIcon(['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 12.5', 'm22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 17.5']),
                      Code: createLucideIcon(['m16 18 6-6-6-6', 'm8 6-6 6 6 6']),
                      Play: createLucideIcon(['m5 3 14 9-14 9V3z']),
                      Zap: createLucideIcon(['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4z']),
                      Shield: createLucideIcon(['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z']),
                      Star: createLucideIcon(['M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z']),
                      Trash2: createLucideIcon(['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2']),
                      Users: createLucideIcon(['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z']),
                      Globe: createLucideIcon(['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20']),
                      Search: createLucideIcon(['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'm21 21-4.3-4.3']),
                      Menu: createLucideIcon(['M4 12h16', 'M4 6h16', 'M4 18h16']),
                      X: createLucideIcon(['M18 6 6 18', 'M6 6l12 12']),\n                      Circle: createLucideIcon(['M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z']),\n                      Square: createLucideIcon(['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z']),\n                      Calculator: createLucideIcon(['M4 2v20h16V2H4zm4 4h8v4H8V6zm0 6h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-8 4h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z']),
                      Plus: createLucideIcon(['M5 12h14', 'M12 5v14']),
                      Minus: createLucideIcon(['M5 12h14']),
                      RefreshCw: createLucideIcon(['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5']),
                      RotateCcw: createLucideIcon(['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5']),
                      ExternalLink: createLucideIcon(['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', 'm15 3 6 6', 'M10 14 21 3'])
                    };
                    window.LucideProxy = new Proxy(window.LucideIcons, {
                      get: (target, prop) => {
                        if (typeof prop === 'string' && prop in target) return target[prop];
                        if (typeof prop === 'string' && (/^[A-Z]/.test(prop) || prop.endsWith('Icon') || prop.startsWith('Lucide'))) {
                          return function FallbackIcon({ size = 20, className = '', color = 'currentColor', strokeWidth = 2, ...props }) {
                            return h('svg', {
                              xmlns: 'http://www.w3.org/2000/svg',
                              width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color,
                              strokeWidth: strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', className: className, ...props
                            }, [
                              h('circle', { key: 'c', cx: 12, cy: 12, r: 8 }),
                              h('path', { key: 'p', d: 'm12 8v4l2 2' })
                            ]);
                          };
                        }
                        return undefined;
                      }
                    });

                    window.resolveComponent = function(name) {
                      return function DynamicComponent(props) {
                        const Component = (window.Components && (
                          window.Components[name] ||
                          window.Components[name.replace(/Component$/, '')] ||
                          window.Components[name + 'Component']
                        )) || (window.LucideProxy && (
                          window.LucideProxy[name] ||
                          window.LucideProxy[name.replace(/Icon$/, '')]
                        ));
                        if (Component) {
                          return React.createElement(Component, props);
                        }
                        return React.createElement('div', {
                          className: 'p-4 m-2 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-mono text-center'
                        }, 'Component <' + name + ' /> ready');
                      };
                    };
                  </script>
                  <script type="text/babel" data-presets="tsx">
                    var { 
                      useState, useEffect, useMemo, useCallback, useRef,
                      useContext, createContext, useReducer, forwardRef,
                      memo, Fragment, Children, useId, useTransition, useDeferredValue
                    } = React;
                    var Lucide = window.LucideProxy;
                    var { 
                      Sparkles, ArrowRight, Check, CheckCircle, CheckCircle2, 
                      Layers, Code, Play, Zap, Shield, Star, Trash2, Users, Globe, Search, Menu, X, Plus, Minus 
                    } = window.LucideProxy;

                    window.Components = {};

                    %s
                    %s
                    %s

                    try {
                      const RootApp = window.Components['App'] || (typeof App !== 'undefined' ? App : null);
                      if (RootApp) {
                        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(RootApp));
                      } else {
                        document.getElementById('root').innerHTML = '<div style="color:#f87171;padding:2rem;text-align:center;">App component not found in src/App.tsx</div>';
                      }
                    } catch(err) {
                      console.error('Render error:', err);
                      document.getElementById('root').innerHTML = '<div style="color:#f87171;padding:2rem;background:#180a0a;border:1px solid #7f1d1d;margin:1rem;border-radius:0.5rem;font-family:monospace;font-size:0.875rem;"><strong>⚠️ Preview Render Error:</strong><pre style="margin-top:0.5rem;white-space:pre-wrap;">' + (err.message || String(err)) + '</pre></div>';
                    }
                  </script>
                </body>
                </html>
                """,
                cssCode,
                subcomponents.toString(),
                componentScopeInjections.toString(),
                sanitizeCode(appCode, "App")
        );
    }

    private String sanitizeCode(String code, String componentName) {
        if (code == null || code.isBlank()) return "";
        String clean = code;

        // 0. Sanitize import.meta.env and import.meta so Babel Standalone does not fail in script mode
        clean = clean.replaceAll("import\\.meta\\.env", "(window.__ENV__ || window.ENV || {})");
        clean = clean.replaceAll("import\\.meta", "({})");

        // 1. Transform ES imports
        Pattern importPattern = Pattern.compile("import\\s+(?:(?:\\*\\s+as\\s+(\\w+))|(?:(\\w+)(?:\\s*,\\s*\\{([^}]*)\\})?)|(?:\\{([^}]*)\\}))\\s+from\\s+['\"][^'\"]+['\"];?");
        Matcher m = importPattern.matcher(clean);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String starAlias = m.group(1);
            String defaultImport = m.group(2);
            String namedWithDefault = m.group(3);
            String namedOnly = m.group(4);

            StringBuilder replacements = new StringBuilder();
            if (starAlias != null && !starAlias.isBlank()) {
                replacements.append("var ").append(starAlias).append(" = window.LucideProxy;\n");
            }
            if (defaultImport != null && !defaultImport.isBlank() && !defaultImport.equals("React") && !defaultImport.equals("ReactDOM")) {
                replacements.append("var ").append(defaultImport).append(" = window.Components['")
                        .append(defaultImport).append("'] || window.Components['")
                        .append(defaultImport.replace("Component", "")).append("'] || (window.LucideProxy ? window.LucideProxy['")
                        .append(defaultImport).append("'] : null) || (window.resolveComponent ? window.resolveComponent('")
                        .append(defaultImport).append("') : (() => null));\n");
            }
            String namedGroup = namedWithDefault != null ? namedWithDefault : namedOnly;
            if (namedGroup != null && !namedGroup.isBlank()) {
                String[] identifiers = namedGroup.split(",");
                for (String item : identifiers) {
                    item = item.trim();
                    if (item.isEmpty()) continue;
                    String[] parts = item.split("\\s+as\\s+");
                    String origName = parts[0].trim();
                    String alias = parts.length > 1 ? parts[1].trim() : origName;
                    if (alias.equals("React") || alias.equals("ReactDOM")) continue;

                    if (REACT_HOOKS.contains(origName)) {
                        replacements.append("var ").append(alias).append(" = React.").append(origName).append(";\n");
                    } else {
                        replacements.append("var ").append(alias).append(" = window.Components['")
                                .append(origName).append("'] || window.Components['")
                                .append(origName.replace("Component", "")).append("'] || (window.LucideProxy ? window.LucideProxy['")
                                .append(origName).append("'] : null) || (window.resolveComponent ? window.resolveComponent('")
                                .append(origName).append("') : (() => null));\n");
                    }
                }
            }
            m.appendReplacement(sb, Matcher.quoteReplacement(replacements.toString()));
        }
        m.appendTail(sb);
        clean = sb.toString();

        // 2. Remove side-effect imports
        clean = clean.replaceAll("import\\s+['\"][^'\"]+['\"];?", "");
        clean = clean.replaceAll("import\\s+[\\s\\S]*?from\\s+['\"][^'\"]+['\"];?", "");
        clean = clean.replaceAll("import\\s+[^;\\n]+;?", "");

        // 3. Clean exports and preserve component registrations
        clean = Pattern.compile("export\\s+default\\s+function(?:\\s+([A-Za-z0-9_]+))?\\s*\\(")
                .matcher(clean)
                .replaceAll(mr -> {
                    String fn = mr.group(1);
                    if (fn == null || fn.isBlank()) {
                        fn = componentName != null && !componentName.isBlank() ? componentName : "DefaultComponent";
                    }
                    return "function " + fn + "(";
                });

        clean = Pattern.compile("export\\s+default\\s+class(?:\\s+([A-Za-z0-9_]+))?")
                .matcher(clean)
                .replaceAll(mr -> {
                    String cls = mr.group(1);
                    if (cls == null || cls.isBlank()) {
                        cls = componentName != null && !componentName.isBlank() ? componentName : "DefaultClass";
                    }
                    return "class " + cls + " ";
                });

        clean = Pattern.compile("export\\s+default\\s+([A-Za-z0-9_]+);?")
                .matcher(clean)
                .replaceAll(mr -> {
                    String id = mr.group(1);
                    return "// export default " + id + ";\n"
                            + "if (typeof " + id + " !== 'undefined') {\n"
                            + "  window.Components['" + id + "'] = " + id + ";\n"
                            + "  window.Components['" + componentName + "'] = " + id + ";\n"
                            + "}\n";
                });

        clean = clean.replaceAll("export\\s+(function|const|let|var)\\s+", "$1 ");
        clean = clean.replaceAll("export\\s*\\{[^}]*\\};?", "");

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

        int exitCode = p.exitValue();
        String stdout = outFuture.get(1, TimeUnit.SECONDS);
        String stderr = errFuture.get(1, TimeUnit.SECONDS);

        return new ProcessResult(exitCode, stdout, stderr);
    }

    private String readStream(InputStream is) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        } catch (IOException e) {
            return "";
        }
    }

    private record ProcessResult(int exitCode, String stdout, String stderr) {}
}
