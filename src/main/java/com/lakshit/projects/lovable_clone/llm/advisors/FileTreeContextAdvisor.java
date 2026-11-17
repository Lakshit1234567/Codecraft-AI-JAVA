package com.lakshit.projects.lovable_clone.llm.advisors;

import com.lakshit.projects.lovable_clone.dto.project.FileNode;
import com.lakshit.projects.lovable_clone.service.ProjectFileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.StreamAdvisor;
import org.springframework.ai.chat.client.advisor.api.StreamAdvisorChain;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class FileTreeContextAdvisor implements StreamAdvisor {

    private final ProjectFileService projectFileService;

    @Override
    public Flux<ChatClientResponse> adviseStream(ChatClientRequest request, StreamAdvisorChain streamAdvisorChain) {
        Map<String, Object> context = request.context();
        Long projectId = Long.parseLong(context.getOrDefault("projectId", 0).toString());

        ChatClientRequest augmentedChatClientRequest = augmentRequestWithFileTree(request, projectId);

        return streamAdvisorChain.nextStream(augmentedChatClientRequest);
    }

    private ChatClientRequest augmentRequestWithFileTree(ChatClientRequest request, Long projectId) {

        List<Message> incomingMessages = request.prompt().getInstructions();

        Message systemMessage = incomingMessages.stream()
                .filter(m -> m.getMessageType() == MessageType.SYSTEM)
                .findFirst()
                .orElse(null);

        List<Message> userMessages = incomingMessages.stream()
                .filter(m -> m.getMessageType() != MessageType.SYSTEM)
                .toList();

        StringBuilder systemContentBuilder = new StringBuilder();
        if (systemMessage != null && systemMessage.getText() != null) {
            systemContentBuilder.append(systemMessage.getText()).append("\n\n");
        }

        List<FileNode> fileTree = projectFileService.getFileTree(projectId).files();
        systemContentBuilder.append("---- PROJECT FILE TREE ----\n");
        if (fileTree != null && !fileTree.isEmpty()) {
            for (FileNode node : fileTree) {
                systemContentBuilder.append("- ").append(node.path()).append("\n");
            }

            // Include content of key existing source files to prevent unnecessary tool calls
            systemContentBuilder.append("\n---- EXISTING SOURCE FILES ----\n");
            for (FileNode node : fileTree) {
                String path = node.path();
                if (path.endsWith(".tsx") || path.endsWith(".ts") || path.endsWith(".css")) {
                    try {
                        String content = projectFileService.getFileContent(projectId, path).content();
                        if (content != null && content.length() < 4000) {
                            systemContentBuilder.append("\n--- START OF FILE: ").append(path).append(" ---\n");
                            systemContentBuilder.append(content).append("\n");
                            systemContentBuilder.append("--- END OF FILE ---\n");
                        }
                    } catch (Exception e) {
                        log.debug("Skipped file content for context: {}", path);
                    }
                }
            }
        }

        List<Message> allMessages = new ArrayList<>();
        allMessages.add(new SystemMessage(systemContentBuilder.toString()));
        allMessages.addAll(userMessages);

        return request
                .mutate()
                .prompt(new Prompt(allMessages, request.prompt().getOptions()))
                .build();
    }

    @Override
    public String getName() {
        return "FileTreeContextAdvisor";
    }

    @Override
    public int getOrder() {
        return 0;
    }
}
