package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.entity.Project;
import com.lakshit.projects.lovable_clone.entity.ProjectFile;
import com.lakshit.projects.lovable_clone.error.ResourceNotFoundException;
import com.lakshit.projects.lovable_clone.repository.ProjectFileRepository;
import com.lakshit.projects.lovable_clone.repository.ProjectRepository;
import com.lakshit.projects.lovable_clone.service.ProjectTemplateService;
import io.minio.*;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@Service
@Slf4j
public class ProjectTemplateServiceImpl implements ProjectTemplateService {

    private final MinioClient minioClient;
    private final ProjectFileRepository projectFileRepository;
    private final ProjectRepository projectRepository;

    private static final String TEMPLATE_BUCKET = "starter-projects";
    private static final String TARGET_BUCKET = "projects";
    private static final String TEMPLATE_NAME = "react-vite-tailwind-daisyui-starter";

    @Override
    public void initializeProjectFromTemplate(Long projectId) {
        Project project = projectRepository.findById(projectId).orElseThrow(
                () -> new ResourceNotFoundException("Project", projectId.toString()));

        ensureBucketExists(TARGET_BUCKET);

        List<ProjectFile> filesToSave = new ArrayList<>();

        try {
            ensureBucketExists(TEMPLATE_BUCKET);
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(TEMPLATE_BUCKET)
                            .prefix(TEMPLATE_NAME + "/")
                            .recursive(true)
                            .build()
            );

            for (Result<Item> result : results) {
                Item item = result.get();
                String sourceKey = item.objectName();

                String cleanPath = sourceKey.replaceFirst(TEMPLATE_NAME + "/", "");
                String destKey = projectId + "/" + cleanPath;

                minioClient.copyObject(
                        CopyObjectArgs.builder()
                                .bucket(TARGET_BUCKET)
                                .object(destKey)
                                .source(
                                        CopySource.builder()
                                                .bucket(TEMPLATE_BUCKET)
                                                .object(sourceKey)
                                                .build()
                                )
                                .build()
                );

                ProjectFile pf = ProjectFile.builder()
                        .project(project)
                        .path(cleanPath)
                        .minioObjectKey(destKey)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build();

                filesToSave.add(pf);
            }
        } catch (Exception e) {
            log.warn("Could not copy starter files from MinIO template bucket: {}. Will use built-in starter files.", e.getMessage());
        }

        // If template bucket had no items or copy failed, populate default starter files
        if (filesToSave.isEmpty()) {
            Map<String, String> starterFiles = getDefaultStarterFiles();
            for (Map.Entry<String, String> entry : starterFiles.entrySet()) {
                String cleanPath = entry.getKey();
                String content = entry.getValue();
                String destKey = projectId + "/" + cleanPath;

                try {
                    byte[] contentBytes = content.getBytes(StandardCharsets.UTF_8);
                    InputStream inputStream = new ByteArrayInputStream(contentBytes);
                    minioClient.putObject(
                            PutObjectArgs.builder()
                                    .bucket(TARGET_BUCKET)
                                    .object(destKey)
                                    .stream(inputStream, contentBytes.length, -1)
                                    .contentType("text/plain")
                                    .build()
                    );

                    ProjectFile pf = ProjectFile.builder()
                            .project(project)
                            .path(cleanPath)
                            .minioObjectKey(destKey)
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();

                    filesToSave.add(pf);
                } catch (Exception ex) {
                    log.error("Failed to seed default starter file: {}", cleanPath, ex);
                }
            }
        }

        if (!filesToSave.isEmpty()) {
            projectFileRepository.saveAll(filesToSave);
            log.info("Initialized project #{} with {} files", projectId, filesToSave.size());
        }
    }

    private void ensureBucketExists(String bucketName) {
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("Created MinIO bucket: {}", bucketName);
            }
        } catch (Exception e) {
            log.warn("Failed to check or create bucket {}: {}", bucketName, e.getMessage());
        }
    }

    private Map<String, String> getDefaultStarterFiles() {
        Map<String, String> files = new LinkedHashMap<>();

        files.put("src/App.tsx", """
import React, { useState } from 'react';
import { Sparkles, Layers, Code, Play } from 'lucide-react';
import { Header } from './components/Header';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Lovable React Workspace Ready</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
          Build modern apps with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">CodeCraft AI</span>
        </h1>
        <p className="text-slate-400 max-w-lg mb-8 text-sm leading-relaxed">
          Ask the AI Architect to generate components, adjust themes, or connect APIs. All updates will instantly reflect in your project.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCount((c) => c + 1)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
          >
            Counter: {count}
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
""");

        files.put("src/components/Header.tsx", """
import React from 'react';
import { Layers } from 'lucide-react';

export function Header() {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
          <Layers className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold text-white tracking-wide">Lovable Studio</span>
      </div>
      <div className="text-xs text-slate-400 font-medium">
        React 18 + TypeScript + Vite + Tailwind CSS
      </div>
    </header>
  );
}

export default Header;
""");

        files.put("src/main.tsx", """
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
""");

        files.put("src/index.css", """
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background-color: #030712;
  color: #f3f4f6;
  font-family: system-ui, -apple-system, sans-serif;
}
""");

        files.put("package.json", """
{
  "name": "lovable-react-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.475.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.11",
    "typescript": "^5.5.3",
    "vite": "^5.4.2"
  }
}
""");

        files.put("index.html", """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lovable React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
""");

        return files;
    }
}
