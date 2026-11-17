package com.lakshit.projects.lovable_clone.controller;

import com.lakshit.projects.lovable_clone.dto.subscription.UsageTodayResponse;
import com.lakshit.projects.lovable_clone.service.UsageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UsageControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UsageService usageService;

    @InjectMocks
    private UsageController usageController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(usageController).build();
    }

    @Test
    void testGetTodayUsage_Success() throws Exception {
        UsageTodayResponse response = new UsageTodayResponse(1200, 10000, 0, 1);
        when(usageService.getTodayUsageOfUser()).thenReturn(response);

        mockMvc.perform(get("/api/usage/today"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokensUsed").value(1200))
                .andExpect(jsonPath("$.tokensLimit").value(10000))
                .andExpect(jsonPath("$.previewsRunning").value(0))
                .andExpect(jsonPath("$.previewsLimit").value(1));
    }
}
