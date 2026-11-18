package com.lakshit.projects.lovable_clone.llm;

import com.lakshit.projects.lovable_clone.entity.ChatEvent;
import com.lakshit.projects.lovable_clone.entity.ChatMessage;
import com.lakshit.projects.lovable_clone.enums.ChatEventType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Slf4j
public class LlmResponseParser {

    /**
     * Regex Breakdown:
     * Group 1: Opening Tag (<tag ...>)
     * Group 2: Tag Name (message|file|tool)
     * Group 3: Attributes part (e.g., ' path="foo"' or ' args="a,b"')
     * Group 4: Content (The stuff inside)
     * Group 5: Closing Tag (</tag>)
     */
    private static final Pattern GENERIC_TAG_PATTERN = Pattern.compile(
            "(<(message|file|tool)([^>]*)>)([\\s\\S]*?)(</\\2>)",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL
    );

    // Attribute pattern supporting double, single, or unquoted attributes
    private static final Pattern ATTRIBUTE_PATTERN = Pattern.compile(
            "(path|name|file|args|phase)=[\"']?([^\"' >]+)[\"']?",
            Pattern.CASE_INSENSITIVE
    );

    // Unclosed <file path="..."> tag (e.g. if stream terminates or model omitted closing tag)
    private static final Pattern UNCLOSED_FILE_PATTERN = Pattern.compile(
            "<file([^>]*)>([\\s\\S]*?)(?=(?:<message|<file|$))",
            Pattern.CASE_INSENSITIVE
    );

    // Fallback markdown code block with path header or comment
    private static final Pattern CODE_BLOCK_PATTERN = Pattern.compile(
            "```(?:[a-zA-Z0-9_-]+)?\\s*(?:path=[\"']?([^\"'\\n]+)[\"']?)?\\n(?:\\s*(?://|/\\*|#)\\s*(?:file:?\\s*|path:?\\s*)?([a-zA-Z0-9_./\\-]+\\.[a-zA-Z0-9]+)\\s*(?:\\*/)?\\n)?([\\s\\S]*?)```",
            Pattern.CASE_INSENSITIVE
    );

    public List<ChatEvent> parseChatEvents(String fullResponse, ChatMessage parentMessage) {
        List<ChatEvent> events = new ArrayList<>();
        int orderCounter = 1;

        if (fullResponse == null || fullResponse.trim().isEmpty()) {
            return events;
        }

        Set<String> processedFiles = new HashSet<>();
        Matcher matcher = GENERIC_TAG_PATTERN.matcher(fullResponse);
        boolean hasFiles = false;

        while (matcher.find()) {
            String tagName = matcher.group(2).toLowerCase();
            String attributes = matcher.group(3);
            String content = matcher.group(4).trim();

            Map<String, String> attrMap = extractAttributes(attributes);

            ChatEvent.ChatEventBuilder builder = ChatEvent.builder()
                    .chatMessage(parentMessage)
                    .content(content)
                    .sequenceOrder(orderCounter++);

            switch (tagName) {
                case "message" -> {
                    builder.type(ChatEventType.MESSAGE);
                    String phase = attrMap.get("phase");
                    if (phase != null) {
                        builder.metadata(phase);
                    }
                }
                case "file" -> {
                    builder.type(ChatEventType.FILE_EDIT);
                    String filePath = getFilePath(attrMap);
                    builder.filePath(filePath);
                    if (filePath != null && !filePath.isEmpty() && !content.isEmpty()) {
                        hasFiles = true;
                        processedFiles.add(cleanPath(filePath));
                    }
                }
                case "tool" -> {
                    builder.type(ChatEventType.TOOL_LOG);
                    builder.metadata(attrMap.get("args"));
                }
                default -> { continue; }
            }

            events.add(builder.build());
        }

        // Check for unclosed <file ...> tags if none found or in addition
        if (!hasFiles) {
            Matcher unclosedMatcher = UNCLOSED_FILE_PATTERN.matcher(fullResponse);
            while (unclosedMatcher.find()) {
                String attributes = unclosedMatcher.group(1);
                String content = unclosedMatcher.group(2).trim();
                Map<String, String> attrMap = extractAttributes(attributes);
                String filePath = getFilePath(attrMap);
                if (filePath != null && !filePath.isEmpty() && !content.isEmpty() && !processedFiles.contains(cleanPath(filePath))) {
                    events.add(ChatEvent.builder()
                            .chatMessage(parentMessage)
                            .type(ChatEventType.FILE_EDIT)
                            .filePath(filePath)
                            .content(content)
                            .sequenceOrder(orderCounter++)
                            .build());
                    hasFiles = true;
                    processedFiles.add(cleanPath(filePath));
                }
            }
        }

        // Fallback: Check for markdown code blocks with file path comments or content
        if (!hasFiles) {
            Matcher codeMatcher = CODE_BLOCK_PATTERN.matcher(fullResponse);
            while (codeMatcher.find()) {
                String pathAttr = codeMatcher.group(1);
                String commentPath = codeMatcher.group(2);
                String codeContent = codeMatcher.group(3);

                String resolvedPath = pathAttr != null ? pathAttr.trim() : (commentPath != null ? commentPath.trim() : null);

                // If no path was explicitly annotated, detect if it's the main React component
                if (resolvedPath == null && codeContent != null && !codeContent.trim().isEmpty()) {
                    if (codeContent.contains("export function App") || codeContent.contains("function App") || codeContent.contains("export default App")) {
                        resolvedPath = "src/App.tsx";
                    }
                }

                if (resolvedPath != null && !resolvedPath.isEmpty() && codeContent != null && !codeContent.trim().isEmpty() && !processedFiles.contains(cleanPath(resolvedPath))) {
                    events.add(ChatEvent.builder()
                            .chatMessage(parentMessage)
                            .type(ChatEventType.FILE_EDIT)
                            .filePath(resolvedPath)
                            .content(codeContent.trim())
                            .sequenceOrder(orderCounter++)
                            .build());
                    hasFiles = true;
                    processedFiles.add(cleanPath(resolvedPath));
                }
            }
        }

        // If no tags matched at all, treat entire response as a single MESSAGE event
        if (events.isEmpty()) {
            events.add(ChatEvent.builder()
                    .chatMessage(parentMessage)
                    .type(ChatEventType.MESSAGE)
                    .content(fullResponse.trim())
                    .sequenceOrder(orderCounter++)
                    .build());
        }

        return events;
    }

    private String getFilePath(Map<String, String> attrMap) {
        if (attrMap.containsKey("path")) return attrMap.get("path");
        if (attrMap.containsKey("name")) return attrMap.get("name");
        if (attrMap.containsKey("file")) return attrMap.get("file");
        return null;
    }

    private String cleanPath(String path) {
        if (path == null) return "";
        return path.startsWith("/") ? path.substring(1) : path;
    }

    private Map<String, String> extractAttributes(String attributeString) {
        Map<String, String> attributes = new HashMap<>();
        if (attributeString == null) return attributes;

        Matcher matcher = ATTRIBUTE_PATTERN.matcher(attributeString);
        while (matcher.find()) {
            attributes.put(matcher.group(1).toLowerCase(), matcher.group(2));
        }
        return attributes;
    }
}
