package com.lakshit.projects.lovable_clone.controller;

import com.lakshit.projects.lovable_clone.dto.chat.StreamResponse;
import com.lakshit.projects.lovable_clone.dto.dsa.*;
import com.lakshit.projects.lovable_clone.enums.TestCaseStatus;
import com.lakshit.projects.lovable_clone.service.DsaStressTestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

@RestController
@RequestMapping("/api/dsa/{projectId}")
@RequiredArgsConstructor
public class DsaController {

    private final DsaStressTestService dsaStressTestService;

    @PostMapping("/synthesize-suite")
    @PreAuthorize("@security.canEditProject(#projectId)")
    public ResponseEntity<DsaSuiteResponse> synthesizeStressSuite(
            @PathVariable Long projectId,
            @RequestBody @Valid DsaSuiteRequest request) {
        return ResponseEntity.ok(dsaStressTestService.synthesizeStressSuite(projectId, request));
    }

    @PostMapping(value = "/diagnose", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("@security.canEditProject(#projectId)")
    public Flux<ServerSentEvent<StreamResponse>> streamDiagnosis(
            @PathVariable Long projectId,
            @RequestBody @Valid DiagnoseFailureRequest request) {
        return dsaStressTestService.streamDiagnosis(projectId, request)
                .map(data -> ServerSentEvent.<StreamResponse>builder()
                        .data(data)
                        .build());
    }

    @PostMapping("/test-cases")
    @PreAuthorize("@security.canEditProject(#projectId)")
    public ResponseEntity<TestCaseResponse> archiveTestCase(
            @PathVariable Long projectId,
            @RequestBody @Valid TestCaseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(dsaStressTestService.archiveTestCase(projectId, request));
    }

    @GetMapping("/test-cases")
    @PreAuthorize("@security.canViewProject(#projectId)")
    public ResponseEntity<List<TestCaseResponse>> getTestCases(
            @PathVariable Long projectId,
            @RequestParam(required = false) TestCaseStatus status) {
        return ResponseEntity.ok(dsaStressTestService.getTestCases(projectId, status));
    }

    @PatchMapping("/test-cases/{testCaseId}")
    @PreAuthorize("@security.canEditProject(#projectId)")
    public ResponseEntity<TestCaseResponse> updateTestCaseStatus(
            @PathVariable Long projectId,
            @PathVariable Long testCaseId,
            @RequestParam TestCaseStatus status) {
        return ResponseEntity.ok(dsaStressTestService.updateTestCaseStatus(projectId, testCaseId, status));
    }
}
