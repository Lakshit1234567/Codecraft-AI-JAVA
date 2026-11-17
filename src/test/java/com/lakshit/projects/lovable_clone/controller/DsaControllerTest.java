package com.lakshit.projects.lovable_clone.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lakshit.projects.lovable_clone.dto.dsa.DsaSuiteRequest;
import com.lakshit.projects.lovable_clone.dto.dsa.DsaSuiteResponse;
import com.lakshit.projects.lovable_clone.dto.dsa.TestCaseRequest;
import com.lakshit.projects.lovable_clone.dto.dsa.TestCaseResponse;
import com.lakshit.projects.lovable_clone.enums.ProgrammingLanguage;
import com.lakshit.projects.lovable_clone.enums.TestCaseStatus;
import com.lakshit.projects.lovable_clone.service.DsaStressTestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class DsaControllerTest {

    private MockMvc mockMvc;

    @Mock
    private DsaStressTestService dsaStressTestService;

    @InjectMocks
    private DsaController dsaController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(dsaController).build();
    }

    @Test
    void testSynthesizeStressSuite_Success() throws Exception {
        DsaSuiteRequest request = new DsaSuiteRequest(
                ProgrammingLanguage.CPP,
                "Trapping Rain Water description",
                "int trap() {}"
        );

        DsaSuiteResponse response = new DsaSuiteResponse(
                1L,
                ProgrammingLanguage.CPP,
                "int brute() {}",
                "brute_force.cpp",
                "int gen() {}",
                "generator.cpp",
                "n <= 50"
        );

        when(dsaStressTestService.synthesizeStressSuite(eq(1L), any(DsaSuiteRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/dsa/1/synthesize-suite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectId").value(1L))
                .andExpect(jsonPath("$.language").value("CPP"))
                .andExpect(jsonPath("$.bruteForcePath").value("brute_force.cpp"))
                .andExpect(jsonPath("$.generatorPath").value("generator.cpp"));
    }

    @Test
    void testArchiveTestCase_Success() throws Exception {
        TestCaseRequest request = new TestCaseRequest("4\n1 2 3 4", "10", "8", "Off by one");

        TestCaseResponse response = new TestCaseResponse(
                101L,
                1L,
                "4\n1 2 3 4",
                "10",
                "8",
                "Off by one",
                TestCaseStatus.FAILING,
                Instant.now()
        );

        when(dsaStressTestService.archiveTestCase(eq(1L), any(TestCaseRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/dsa/1/test-cases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(101L))
                .andExpect(jsonPath("$.status").value("FAILING"));
    }

    @Test
    void testGetTestCases_Success() throws Exception {
        TestCaseResponse response = new TestCaseResponse(
                101L,
                1L,
                "input",
                "expected",
                "actual",
                "explanation",
                TestCaseStatus.FAILING,
                Instant.now()
        );

        when(dsaStressTestService.getTestCases(eq(1L), eq(TestCaseStatus.FAILING)))
                .thenReturn(List.of(response));

        mockMvc.perform(get("/api/dsa/1/test-cases")
                        .param("status", "FAILING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(101L));
    }

    @Test
    void testUpdateTestCaseStatus_Success() throws Exception {
        TestCaseResponse response = new TestCaseResponse(
                101L,
                1L,
                "input",
                "expected",
                "actual",
                "explanation",
                TestCaseStatus.RESOLVED,
                Instant.now()
        );

        when(dsaStressTestService.updateTestCaseStatus(1L, 101L, TestCaseStatus.RESOLVED))
                .thenReturn(response);

        mockMvc.perform(patch("/api/dsa/1/test-cases/101")
                        .param("status", "RESOLVED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(101L))
                .andExpect(jsonPath("$.status").value("RESOLVED"));
    }
}
