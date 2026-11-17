package com.lakshit.projects.lovable_clone.service.impl;

import com.lakshit.projects.lovable_clone.dto.subscription.PlanResponse;
import com.lakshit.projects.lovable_clone.entity.Plan;
import com.lakshit.projects.lovable_clone.mapper.SubscriptionMapper;
import com.lakshit.projects.lovable_clone.repository.PlanRepository;
import com.lakshit.projects.lovable_clone.service.PlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanServiceImpl implements PlanService {

    private final PlanRepository planRepository;
    private final SubscriptionMapper subscriptionMapper;

    @Override
    public List<PlanResponse> getAllActivePlans() {
        List<Plan> plans = planRepository.findAll();
        if (plans.isEmpty()) {
            Plan free = new Plan();
            free.setName("Free Starter");
            free.setMaxProjects(3);
            free.setMaxTokensPerDay(10000);
            free.setMaxPreviews(2);
            free.setUnlimitedAi(false);
            free.setActive(true);
            free.setStripePriceId("price_free_starter");

            Plan pro = new Plan();
            pro.setName("Pro Builder");
            pro.setMaxProjects(25);
            pro.setMaxTokensPerDay(100000);
            pro.setMaxPreviews(10);
            pro.setUnlimitedAi(false);
            pro.setActive(true);
            pro.setStripePriceId("price_pro_builder");

            Plan enterprise = new Plan();
            enterprise.setName("Enterprise & Adversary");
            enterprise.setMaxProjects(100);
            enterprise.setMaxTokensPerDay(1000000);
            enterprise.setMaxPreviews(50);
            enterprise.setUnlimitedAi(true);
            enterprise.setActive(true);
            enterprise.setStripePriceId("price_enterprise");

            plans = planRepository.saveAll(List.of(free, pro, enterprise));
        }

        return plans.stream()
                .filter(p -> Boolean.TRUE.equals(p.getActive()))
                .map(subscriptionMapper::toPlanResponse)
                .toList();
    }
}
