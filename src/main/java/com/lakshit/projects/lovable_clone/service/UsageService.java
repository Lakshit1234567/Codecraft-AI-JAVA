package com.lakshit.projects.lovable_clone.service;

import com.lakshit.projects.lovable_clone.dto.subscription.UsageTodayResponse;

public interface UsageService {
    void recordTokenUsage(Long userId, int actualTokens);
    void checkDailyTokensUsage();
    UsageTodayResponse getTodayUsageOfUser();
}
