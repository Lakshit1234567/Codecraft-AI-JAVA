package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.dto.chat.StreamResponse;
import com.lakshit.projects.lovable_clone.entity.*;
import com.lakshit.projects.lovable_clone.enums.ChatEventType;
import com.lakshit.projects.lovable_clone.enums.MessageRole;
import com.lakshit.projects.lovable_clone.error.ResourceNotFoundException;
import com.lakshit.projects.lovable_clone.llm.LlmResponseParser;
import com.lakshit.projects.lovable_clone.llm.PromptUtils;
import com.lakshit.projects.lovable_clone.llm.advisors.FileTreeContextAdvisor;
import com.lakshit.projects.lovable_clone.repository.*;
import com.lakshit.projects.lovable_clone.security.AuthUtil;
import com.lakshit.projects.lovable_clone.service.AiGenerationService;
import com.lakshit.projects.lovable_clone.service.ProjectFileService;
import com.lakshit.projects.lovable_clone.service.UsageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiGenerationServiceImpl implements AiGenerationService {

    private final ChatClient chatClient;
    private final AuthUtil authUtil;
    private final ProjectFileService projectFileService;
    private final FileTreeContextAdvisor fileTreeContextAdvisor;
    private final ChatSessionRepository chatSessionRepository;
    private final ProjectRepository projectRepository;
    private final LlmResponseParser llmResponseParser;
    private final UserRepository userRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatEventRepository chatEventRepository;
    private final UsageService usageService;

    private static final Pattern FILE_TAG_PATTERN = Pattern.compile("<file path=\"([^\"]+)\">(.*?)</file>", Pattern.DOTALL);

    @Override
    @PreAuthorize("@security.canEditProject(#projectId)")
    public Flux<StreamResponse> streamResponse(String userMessage, Long projectId) {

        usageService.checkDailyTokensUsage();

        Long userId = authUtil.getCurrentUserId();
        ChatSession chatSession = createChatSessionIfNotExists(projectId, userId);

        Map<String, Object> advisorParams = Map.of(
                "userId", userId,
                "projectId", projectId
        );

        StringBuilder fullResponseBuffer = new StringBuilder();

        AtomicReference<Long> startTime = new AtomicReference<>(System.currentTimeMillis());
        AtomicReference<Long> endTime = new AtomicReference<>(0L);
        AtomicReference<Usage> usageRef = new AtomicReference<>();

        return chatClient.prompt()
                .system(PromptUtils.CODE_GENERATION_SYSTEM_PROMPT)
                .user(userMessage)
                .advisors(advisorSpec -> {
                            advisorSpec.params(advisorParams);
                            advisorSpec.advisors(fileTreeContextAdvisor);
                        }
                )
                .stream()
                .chatResponse()
                .doOnNext(response -> {
                    if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
                        if (response != null && response.getMetadata() != null && response.getMetadata().getUsage() != null) {
                            usageRef.set(response.getMetadata().getUsage());
                        }
                        return;
                    }

                    String content = response.getResult().getOutput().getText();

                    if (content != null && !content.isEmpty()) {
                        if (endTime.get() == 0) {
                            endTime.set(System.currentTimeMillis());
                        }
                        fullResponseBuffer.append(content);
                    }

                    if (response.getMetadata() != null && response.getMetadata().getUsage() != null) {
                        usageRef.set(response.getMetadata().getUsage());
                    }
                })
                .doOnComplete(() -> {
                    Schedulers.boundedElastic().schedule(() -> {
                        try {
                            long duration = (endTime.get() - startTime.get()) / 1000;
                            if (duration < 0) duration = 0;
                            finalizeChats(userMessage, chatSession, fullResponseBuffer.toString(), duration, usageRef.get());
                        } catch (Exception e) {
                            log.error("Failed to finalize chats and save files for projectId: {}", projectId, e);
                        }
                    });
                })
                .doOnError(error -> log.error("Error during streaming for projectId: {}", projectId, error))
                .map(response -> {
                    String text = "";
                    if (response != null && response.getResult() != null && response.getResult().getOutput() != null) {
                        text = response.getResult().getOutput().getText();
                    }
                    return new StreamResponse(text != null ? text : "");
                });
    }

    private void finalizeChats(String userMessage, ChatSession chatSession, String fullText, Long duration, Usage usage) {
        Long projectId = chatSession.getProject().getId();
        log.info("Finalizing chat for projectId={}, textLength={}", projectId, fullText != null ? fullText.length() : 0);

        int promptTokens = (usage != null && usage.getPromptTokens() != null) ? usage.getPromptTokens() : 0;
        int completionTokens = (usage != null && usage.getCompletionTokens() != null) ? usage.getCompletionTokens() : 0;
        int totalTokens = (usage != null && usage.getTotalTokens() != null) ? usage.getTotalTokens() : (promptTokens + completionTokens);

        if(totalTokens > 0) {
            usageService.recordTokenUsage(chatSession.getUser().getId(), totalTokens);
        }

        // Save the User message
        chatMessageRepository.save(
                ChatMessage.builder()
                        .chatSession(chatSession)
                        .role(MessageRole.USER)
                        .content(userMessage)
                        .tokensUsed(promptTokens)
                        .build()
        );

        ChatMessage assistantChatMessage = ChatMessage.builder()
                .role(MessageRole.ASSISTANT)
                .content(fullText != null && !fullText.isEmpty() ? fullText : "Assistant response")
                .chatSession(chatSession)
                .tokensUsed(completionTokens)
                .build();

        assistantChatMessage = chatMessageRepository.save(assistantChatMessage);

        List<ChatEvent> chatEventList = llmResponseParser.parseChatEvents(fullText, assistantChatMessage);
        chatEventList.addFirst(ChatEvent.builder()
                        .type(ChatEventType.THOUGHT)
                        .chatMessage(assistantChatMessage)
                        .content("Thought for "+duration+"s")
                        .sequenceOrder(0)
                .build());

        for (ChatEvent event : chatEventList) {
            if (event.getType() == ChatEventType.FILE_EDIT && event.getFilePath() != null && event.getContent() != null) {
                log.info("Saving generated file: projectId={}, path={}", projectId, event.getFilePath());
                try {
                    projectFileService.saveFile(projectId, event.getFilePath(), event.getContent());
                } catch (Exception ex) {
                    log.error("Failed to save file: projectId={}, path={}", projectId, event.getFilePath(), ex);
                }
            }
        }

        chatEventRepository.saveAll(chatEventList);
        log.info("Chat finalized successfully for projectId={}, saved {} events", projectId, chatEventList.size());
    }

    private ChatSession createChatSessionIfNotExists(Long projectId, Long userId) {
        ChatSessionId chatSessionId = new ChatSessionId(projectId, userId);
        ChatSession chatSession = chatSessionRepository.findById(chatSessionId).orElse(null);

        if(chatSession == null) {
            Project project = projectRepository.findById(projectId)
                    .orElseThrow(() -> new ResourceNotFoundException("Project", projectId.toString()));
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", userId.toString()));

            chatSession = ChatSession.builder()
                    .id(chatSessionId)
                    .project(project)
                    .user(user)
                    .build();

            chatSession = chatSessionRepository.save(chatSession);
        }
        return chatSession;
    }
}
