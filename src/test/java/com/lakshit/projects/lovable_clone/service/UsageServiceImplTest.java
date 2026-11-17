package com.lakshit.projects.lovable_clone.service;

import com.lakshit.projects.lovable_clone.dto.subscription.PlanResponse;
import com.lakshit.projects.lovable_clone.dto.subscription.SubscriptionResponse;
import com.lakshit.projects.lovable_clone.dto.subscription.UsageTodayResponse;
import com.lakshit.projects.lovable_clone.entity.UsageLog;
import com.lakshit.projects.lovable_clone.repository.UsageLogRepository;
import com.lakshit.projects.lovable_clone.security.AuthUtil;
import com.lakshit.projects.lovable_clone.service.impl.UsageServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsageServiceImplTest {

    @Mock
    private UsageLogRepository usageLogRepository;

    @Mock
    private AuthUtil authUtil;

    @Mock
    private SubscriptionService subscriptionService;

    @InjectMocks
    private UsageServiceImpl usageService;

    @BeforeEach
    void setUp() {
        when(authUtil.getCurrentUserId()).thenReturn(1L);
    }

    @Test
    void testCheckDailyTokensUsage_FreeTier_WithinLimit() {
        when(subscriptionService.getCurrentSubscription())
                .thenReturn(new SubscriptionResponse(null, "INCOMPLETE", Instant.now(), 0L));
        UsageLog log = UsageLog.builder().userId(1L).date(LocalDate.now()).tokensUsed(5000).build();
        when(usageLogRepository.findByUserIdAndDate(eq(1L), any(LocalDate.class))).thenReturn(Optional.of(log));

        assertDoesNotThrow(() -> usageService.checkDailyTokensUsage());
    }

    @Test
    void testCheckDailyTokensUsage_FreeTier_LimitExceeded_Throws429() {
        when(subscriptionService.getCurrentSubscription())
                .thenReturn(new SubscriptionResponse(null, "INCOMPLETE", Instant.now(), 0L));
        UsageLog log = UsageLog.builder().userId(1L).date(LocalDate.now()).tokensUsed(10001).build();
        when(usageLogRepository.findByUserIdAndDate(eq(1L), any(LocalDate.class))).thenReturn(Optional.of(log));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> usageService.checkDailyTokensUsage());
        assertEquals(429, ex.getStatusCode().value());
    }

    @Test
    void testCheckDailyTokensUsage_UnlimitedAi_Passes() {
        PlanResponse unlimitedPlan = new PlanResponse(2L, "Pro", 10, 50000, true, "$20");
        when(subscriptionService.getCurrentSubscription())
                .thenReturn(new SubscriptionResponse(unlimitedPlan, "ACTIVE", Instant.now(), 0L));
        UsageLog log = UsageLog.builder().userId(1L).date(LocalDate.now()).tokensUsed(999999).build();
        when(usageLogRepository.findByUserIdAndDate(eq(1L), any(LocalDate.class))).thenReturn(Optional.of(log));

        assertDoesNotThrow(() -> usageService.checkDailyTokensUsage());
    }

    @Test
    void testGetTodayUsageOfUser_Success() {
        when(subscriptionService.getCurrentSubscription())
                .thenReturn(new SubscriptionResponse(null, "INCOMPLETE", Instant.now(), 0L));
        UsageLog log = UsageLog.builder().userId(1L).date(LocalDate.now()).tokensUsed(2500).build();
        when(usageLogRepository.findByUserIdAndDate(eq(1L), any(LocalDate.class))).thenReturn(Optional.of(log));

        UsageTodayResponse response = usageService.getTodayUsageOfUser();

        assertNotNull(response);
        assertEquals(2500, response.tokensUsed());
        assertEquals(10000, response.tokensLimit());
    }
}
