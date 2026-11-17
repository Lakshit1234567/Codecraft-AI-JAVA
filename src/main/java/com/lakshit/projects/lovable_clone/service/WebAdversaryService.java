package com.lakshit.projects.lovable_clone.service;

import com.lakshit.projects.lovable_clone.dto.adversary.BreakAppRequest;
import com.lakshit.projects.lovable_clone.dto.chat.StreamResponse;
import reactor.core.publisher.Flux;

public interface WebAdversaryService {

    Flux<StreamResponse> breakApp(Long projectId, BreakAppRequest request);
}
