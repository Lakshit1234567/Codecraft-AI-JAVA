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
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

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
                        fullResponseBuffer.append(content);
                    }

                    if (response.getMetadata() != null && response.getMetadata().getUsage() != null) {
                        usageRef.set(response.getMetadata().getUsage());
                    }
                })
                .map(response -> {
                    String text = "";
                    if (response != null && response.getResult() != null && response.getResult().getOutput() != null) {
                        text = response.getResult().getOutput().getText();
                    }
                    return new StreamResponse(text != null ? text : "");
                })
                .concatWith(Flux.<StreamResponse>defer(() -> {
                    try {
                        long duration = (System.currentTimeMillis() - startTime.get()) / 1000;
                        if (duration < 0) duration = 0;
                        finalizeChats(userMessage, chatSession, fullResponseBuffer.toString(), duration, usageRef.get());
                    } catch (Exception e) {
                        log.error("Failed to finalize chats and save files for projectId: {}", projectId, e);
                    }
                    return Flux.<StreamResponse>empty();
                }).subscribeOn(Schedulers.boundedElastic()))
                .doOnError(error -> log.error("Error during streaming for projectId: {}", projectId, error))
                .onErrorResume(error -> {
                    String rawMsg = error.getMessage() != null ? error.getMessage() : "Unknown error";
                    String userFriendlyReason;
                    if (rawMsg.contains("401") || rawMsg.toLowerCase().contains("unauthorized")) {
                        userFriendlyReason = "Unauthorized (401): Please verify that `GROQ_API_KEY` is set to a valid Groq API key in your environment or `application-local.yaml`.";
                    } else if (rawMsg.contains("429") || rawMsg.toLowerCase().contains("too many requests")) {
                        userFriendlyReason = "Rate limit reached (429): Groq API rate limit reached. Please wait a moment and try again.";
                    } else {
                        userFriendlyReason = "AI Generation error: " + rawMsg;
                    }
                    log.error("Handled streaming error for projectId {}: {}", projectId, userFriendlyReason);

                    String formattedError = "<message phase=\"error\">\n" + userFriendlyReason + "\n</message>";
                    fullResponseBuffer.append(formattedError);
                    try {
                        long duration = (System.currentTimeMillis() - startTime.get()) / 1000;
                        if (duration < 0) duration = 0;
                        finalizeChats(userMessage, chatSession, fullResponseBuffer.toString(), duration, null);
                    } catch (Exception ex) {
                        log.error("Failed to save error chat for projectId {}", projectId, ex);
                    }
                    return Flux.just(new StreamResponse(formattedError));
                });
    }

    @Transactional
    public void finalizeChats(String userMessage, ChatSession chatSession, String fullText, Long duration, Usage usage) {
        Long projectId = chatSession.getProject().getId();
        log.info("Finalizing chat for projectId={}, textLength={}", projectId, fullText != null ? fullText.length() : 0);

        int promptTokens = (usage != null && usage.getPromptTokens() != null) ? usage.getPromptTokens() : 0;
        int completionTokens = (usage != null && usage.getCompletionTokens() != null) ? usage.getCompletionTokens() : 0;
        int totalTokens = (usage != null && usage.getTotalTokens() != null) ? usage.getTotalTokens() : (promptTokens + completionTokens);

        if (totalTokens > 0) {
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
                .content("Thought for " + duration + "s")
                .sequenceOrder(0)
                .build());

        for (ChatEvent event : chatEventList) {
            if (event.getType() == ChatEventType.FILE_EDIT && event.getFilePath() != null && event.getContent() != null) {
                if (event.getContent().trim().isEmpty()) {
                    continue; // Skip empty files so we don't accidentally wipe existing code
                }
                log.info("Saving generated file: projectId={}, path={}", projectId, event.getFilePath());
                try {
                    projectFileService.saveFile(projectId, event.getFilePath(), event.getContent());
                } catch (Exception ex) {
                    log.error("Failed to save file: projectId={}, path={}", projectId, event.getFilePath(), ex);
                }
            }
        }

        chatEventRepository.saveAll(chatEventList);
        assistantChatMessage.setEvents(chatEventList);
        log.info("Chat finalized successfully for projectId={}, saved {} events", projectId, chatEventList.size());
    }

    private ChatSession createChatSessionIfNotExists(Long projectId, Long userId) {
        ChatSessionId chatSessionId = new ChatSessionId(projectId, userId);
        ChatSession chatSession = chatSessionRepository.findById(chatSessionId).orElse(null);

        if (chatSession == null) {
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
