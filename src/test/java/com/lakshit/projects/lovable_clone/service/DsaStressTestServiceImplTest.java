package com.lakshit.projects.lovable_clone.service;

import com.lakshit.projects.lovable_clone.dto.dsa.DsaSuiteRequest;
import com.lakshit.projects.lovable_clone.dto.dsa.DsaSuiteResponse;
import com.lakshit.projects.lovable_clone.dto.dsa.TestCaseRequest;
import com.lakshit.projects.lovable_clone.dto.dsa.TestCaseResponse;
import com.lakshit.projects.lovable_clone.entity.FailedTestCase;
import com.lakshit.projects.lovable_clone.entity.Project;
import com.lakshit.projects.lovable_clone.enums.ProgrammingLanguage;
import com.lakshit.projects.lovable_clone.enums.ProjectType;
import com.lakshit.projects.lovable_clone.enums.TestCaseStatus;
import com.lakshit.projects.lovable_clone.mapper.DsaMapper;
import com.lakshit.projects.lovable_clone.repository.FailedTestCaseRepository;
import com.lakshit.projects.lovable_clone.repository.ProjectRepository;
import com.lakshit.projects.lovable_clone.security.AuthUtil;
import com.lakshit.projects.lovable_clone.service.impl.DsaStressTestServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DsaStressTestServiceImplTest {

    @Mock
    private ChatClient chatClient;

    @Mock
    private AuthUtil authUtil;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private FailedTestCaseRepository failedTestCaseRepository;

    @Mock
    private ProjectFileService projectFileService;

    @Mock
    private UsageService usageService;

    @Mock
    private DsaMapper dsaMapper;

    @InjectMocks
    private DsaStressTestServiceImpl dsaStressTestService;

    private Project testProject;

    @BeforeEach
    void setUp() {
        testProject = Project.builder()
                .id(1L)
                .name("Trapping Rain Water")
                .type(ProjectType.DSA)
                .build();
    }

    @Test
    void testArchiveTestCase_Success() {
        when(projectRepository.findById(1L)).thenReturn(Optional.of(testProject));

        TestCaseRequest request = new TestCaseRequest("5\n4 2 0 3 2\n", "3", "1", "Pointer mismatch");

        FailedTestCase savedEntity = FailedTestCase.builder()
                .id(101L)
                .project(testProject)
                .input(request.input())
                .expectedOutput(request.expectedOutput())
                .actualOutput(request.actualOutput())
                .explanation(request.explanation())
                .status(TestCaseStatus.FAILING)
                .createdAt(Instant.now())
                .build();

        when(failedTestCaseRepository.save(any(FailedTestCase.class))).thenReturn(savedEntity);
        when(dsaMapper.toTestCaseResponse(savedEntity)).thenReturn(new TestCaseResponse(
                101L, 1L, request.input(), request.expectedOutput(), request.actualOutput(),
                request.explanation(), TestCaseStatus.FAILING, Instant.now()
        ));

        TestCaseResponse response = dsaStressTestService.archiveTestCase(1L, request);

        assertNotNull(response);
        assertEquals(101L, response.id());
        assertEquals(TestCaseStatus.FAILING, response.status());
        verify(failedTestCaseRepository, times(1)).save(any(FailedTestCase.class));
    }

    @Test
    void testGetTestCases_FilterByStatus() {
        FailedTestCase tc = FailedTestCase.builder()
                .id(101L)
                .project(testProject)
                .input("input")
                .expectedOutput("exp")
                .actualOutput("act")
                .status(TestCaseStatus.FAILING)
                .build();

        when(failedTestCaseRepository.findByProjectIdAndStatusOrderByCreatedAtDesc(1L, TestCaseStatus.FAILING))
                .thenReturn(List.of(tc));
        when(dsaMapper.toListOfTestCaseResponse(List.of(tc))).thenReturn(List.of(
                new TestCaseResponse(101L, 1L, "input", "exp", "act", null, TestCaseStatus.FAILING, Instant.now())
        ));

        List<TestCaseResponse> results = dsaStressTestService.getTestCases(1L, TestCaseStatus.FAILING);

        assertEquals(1, results.size());
        assertEquals(TestCaseStatus.FAILING, results.get(0).status());
        verify(failedTestCaseRepository).findByProjectIdAndStatusOrderByCreatedAtDesc(1L, TestCaseStatus.FAILING);
    }

    @Test
    void testUpdateTestCaseStatus_Success() {
        FailedTestCase existing = FailedTestCase.builder()
                .id(101L)
                .project(testProject)
                .status(TestCaseStatus.FAILING)
                .build();

        when(failedTestCaseRepository.findById(101L)).thenReturn(Optional.of(existing));
        when(failedTestCaseRepository.save(existing)).thenReturn(existing);
        when(dsaMapper.toTestCaseResponse(existing)).thenReturn(
                new TestCaseResponse(101L, 1L, null, null, null, null, TestCaseStatus.RESOLVED, Instant.now())
        );

        TestCaseResponse response = dsaStressTestService.updateTestCaseStatus(1L, 101L, TestCaseStatus.RESOLVED);

        assertNotNull(response);
        assertEquals(TestCaseStatus.RESOLVED, response.status());
        verify(failedTestCaseRepository).save(existing);
    }
}
