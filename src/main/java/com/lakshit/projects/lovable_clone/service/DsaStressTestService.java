package com.lakshit.projects.lovable_clone.service;

import com.lakshit.projects.lovable_clone.dto.chat.StreamResponse;
import com.lakshit.projects.lovable_clone.dto.dsa.*;
import com.lakshit.projects.lovable_clone.enums.TestCaseStatus;
import reactor.core.publisher.Flux;

import java.util.List;

public interface DsaStressTestService {

    DsaSuiteResponse synthesizeStressSuite(Long projectId, DsaSuiteRequest request);

    StressTestResultResponse runStressTest(Long projectId, RunStressTestRequest request);

    Flux<StreamResponse> streamDiagnosis(Long projectId, DiagnoseFailureRequest request);

    TestCaseResponse archiveTestCase(Long projectId, TestCaseRequest request);

    List<TestCaseResponse> getTestCases(Long projectId, TestCaseStatus status);

    TestCaseResponse updateTestCaseStatus(Long projectId, Long testCaseId, TestCaseStatus status);
}
