package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.dto.subscription.PlanResponse;
import com.lakshit.projects.lovable_clone.dto.subscription.SubscriptionResponse;
import com.lakshit.projects.lovable_clone.dto.subscription.UsageTodayResponse;
import com.lakshit.projects.lovable_clone.entity.UsageLog;
import com.lakshit.projects.lovable_clone.repository.UsageLogRepository;
import com.lakshit.projects.lovable_clone.security.AuthUtil;
import com.lakshit.projects.lovable_clone.service.SubscriptionService;
import com.lakshit.projects.lovable_clone.service.UsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;

@RequiredArgsConstructor
@Service
public class UsageServiceImpl implements UsageService {

    private final UsageLogRepository usageLogRepository;
    private final AuthUtil authUtil;
    private final SubscriptionService subscriptionService;

    private static final int FREE_TIER_DAILY_TOKENS = 10_000;

    @Override
    public void recordTokenUsage(Long userId, int actualTokens) {
        LocalDate today = LocalDate.now();

        UsageLog todayLog = usageLogRepository.findByUserIdAndDate(userId, today)
                .orElseGet(() -> createNewDailyLog(userId, today));

        todayLog.setTokensUsed(todayLog.getTokensUsed() + actualTokens);
        usageLogRepository.save(todayLog);
    }

    @Override
    public void checkDailyTokensUsage() {
        Long userId = authUtil.getCurrentUserId();
        SubscriptionResponse subscriptionResponse = subscriptionService.getCurrentSubscription();
        PlanResponse plan = subscriptionResponse != null ? subscriptionResponse.plan() : null;

        LocalDate today = LocalDate.now();

        UsageLog todayLog = usageLogRepository.findByUserIdAndDate(userId, today)
                .orElseGet(() -> createNewDailyLog(userId, today));

        if (plan != null && Boolean.TRUE.equals(plan.unlimitedAi())) {
            return;
        }

        int currentUsage = todayLog.getTokensUsed();
        int limit = (plan != null && plan.maxTokensPerDay() != null)
                ? plan.maxTokensPerDay()
                : FREE_TIER_DAILY_TOKENS;

        if (currentUsage >= limit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Daily token limit reached (" + currentUsage + "/" + limit + "). Upgrade your plan for higher limits.");
        }
    }

    @Override
    public UsageTodayResponse getTodayUsageOfUser() {
        Long userId = authUtil.getCurrentUserId();
        SubscriptionResponse subscriptionResponse = subscriptionService.getCurrentSubscription();
        PlanResponse plan = subscriptionResponse != null ? subscriptionResponse.plan() : null;

        LocalDate today = LocalDate.now();
        UsageLog todayLog = usageLogRepository.findByUserIdAndDate(userId, today)
                .orElseGet(() -> createNewDailyLog(userId, today));

        int tokensUsed = todayLog.getTokensUsed();
        int tokensLimit = (plan != null && plan.maxTokensPerDay() != null)
                ? (Boolean.TRUE.equals(plan.unlimitedAi()) ? -1 : plan.maxTokensPerDay())
                : FREE_TIER_DAILY_TOKENS;

        int previewsLimit = 1;

        return new UsageTodayResponse(tokensUsed, tokensLimit, 0, previewsLimit);
    }

    private UsageLog createNewDailyLog(Long userId, LocalDate date) {
        UsageLog newLog = UsageLog.builder()
                .userId(userId)
                .date(date)
                .tokensUsed(0)
                .build();
        return usageLogRepository.save(newLog);
    }
}
