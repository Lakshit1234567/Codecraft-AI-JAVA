package com.lakshit.projects.lovable_clone.controller;

import com.lakshit.projects.lovable_clone.dto.adversary.BreakAppRequest;
import com.lakshit.projects.lovable_clone.dto.chat.StreamResponse;
import com.lakshit.projects.lovable_clone.service.WebAdversaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/projects/{projectId}")
@RequiredArgsConstructor
public class WebAdversaryController {

    private final WebAdversaryService webAdversaryService;

    @PostMapping(value = "/break-app", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("@security.canEditProject(#projectId)")
    public Flux<ServerSentEvent<StreamResponse>> breakApp(
            @PathVariable Long projectId,
            @RequestBody(required = false) BreakAppRequest request) {
        return webAdversaryService.breakApp(projectId, request)
                .map(data -> ServerSentEvent.<StreamResponse>builder()
                        .data(data)
                        .build());
    }
}
