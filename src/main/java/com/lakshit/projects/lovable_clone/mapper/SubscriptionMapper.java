package com.lakshit.projects.lovable_clone.mapper;

import com.lakshit.projects.lovable_clone.dto.subscription.PlanResponse;
import com.lakshit.projects.lovable_clone.dto.subscription.SubscriptionResponse;
import com.lakshit.projects.lovable_clone.entity.Plan;
import com.lakshit.projects.lovable_clone.entity.Subscription;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SubscriptionMapper {

    SubscriptionResponse toSubscriptionResponse(Subscription subscription);

    @Mapping(target = "price", expression = "java(determinePrice(plan))")
    PlanResponse toPlanResponse(Plan plan);

    default String determinePrice(Plan plan) {
        if (plan == null || plan.getName() == null) return "$0";
        String name = plan.getName().toLowerCase();
        if (name.contains("pro")) return "$29/mo";
        if (name.contains("enterprise")) return "$99/mo";
        return "Free";
    }
}
