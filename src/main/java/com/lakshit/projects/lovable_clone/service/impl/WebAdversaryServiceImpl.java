package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.dto.adversary.BreakAppRequest;
import com.lakshit.projects.lovable_clone.dto.chat.StreamResponse;
import com.lakshit.projects.lovable_clone.dto.project.FileNode;
import com.lakshit.projects.lovable_clone.llm.PromptUtils;
import com.lakshit.projects.lovable_clone.security.AuthUtil;
import com.lakshit.projects.lovable_clone.service.ProjectFileService;
import com.lakshit.projects.lovable_clone.service.UsageService;
import com.lakshit.projects.lovable_clone.service.WebAdversaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebAdversaryServiceImpl implements WebAdversaryService {

    private final ChatClient chatClient;
    private final AuthUtil authUtil;
    private final ProjectFileService projectFileService;
    private final UsageService usageService;

    private static final Pattern FILE_TAG_PATTERN = Pattern.compile("<file path=\"([^\"]+)\">(.*?)</file>", Pattern.DOTALL);

    @Override
    public Flux<StreamResponse> breakApp(Long projectId, BreakAppRequest request) {
        usageService.checkDailyTokensUsage();
        Long userId = authUtil.getCurrentUserId();

        String targetPath = request != null && request.targetFilePath() != null && !request.targetFilePath().isBlank()
                ? request.targetFilePath()
                : "src/App.tsx";

        String cleanPath = targetPath.startsWith("/") ? targetPath.substring(1) : targetPath;

        String componentContent = "";
        try {
            componentContent = projectFileService.getFileContent(projectId, cleanPath).content();
        } catch (Exception e) {
            log.warn("Could not read file {} for projectId {}: {}", cleanPath, projectId, e.getMessage());
            List<FileNode> fileTree = projectFileService.getFileTree(projectId).files();
            componentContent = "File tree: " + fileTree.toString();
        }

        String userPrompt = String.format("""
                Target Component Path: %s

                ## Component Source Code:
                %s
                """,
                cleanPath,
                componentContent
        );

        StringBuilder fullResponseBuffer = new StringBuilder();
        AtomicReference<Usage> usageRef = new AtomicReference<>();

        return chatClient.prompt()
                .system(PromptUtils.WEB_ADVERSARY_SYSTEM_PROMPT)
                .user(userPrompt)
                .stream()
                .chatResponse()
                .doOnNext(response -> {
                    String content = response.getResult() != null && response.getResult().getOutput() != null
                            ? response.getResult().getOutput().getText()
                            : "";
                    if (response.getMetadata() != null && response.getMetadata().getUsage() != null) {
                        usageRef.set(response.getMetadata().getUsage());
                    }
                    fullResponseBuffer.append(content);
                })
                .doOnComplete(() -> {
                    Schedulers.boundedElastic().schedule(() -> {
                        Usage usage = usageRef.get();
                        if (usage != null) {
                            usageService.recordTokenUsage(userId, usage.getTotalTokens());
                        }
                        parseAndSaveHardenedFiles(projectId, fullResponseBuffer.toString());
                    });
                })
                .doOnError(err -> log.error("Error running Web Adversary on projectId {}: {}", projectId, err.getMessage()))
                .map(response -> {
                    String text = response.getResult() != null && response.getResult().getOutput() != null
                            ? response.getResult().getOutput().getText()
                            : "";
                    return new StreamResponse(text != null ? text : "");
                });
    }

    private void parseAndSaveHardenedFiles(Long projectId, String fullText) {
        Matcher matcher = FILE_TAG_PATTERN.matcher(fullText);
        while (matcher.find()) {
            String filePath = matcher.group(1).trim();
            String fileContent = matcher.group(2).trim();
            if (!filePath.isEmpty() && !fileContent.isEmpty()) {
                try {
                    projectFileService.saveFile(projectId, filePath, fileContent);
                    log.info("Saved hardened file: {} for projectId: {}", filePath, projectId);
                } catch (Exception e) {
                    log.error("Failed to save hardened file {}: {}", filePath, e.getMessage());
                }
            }
        }
    }
}
