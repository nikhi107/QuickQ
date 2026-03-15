package com.quickq.backend.controller;

import com.quickq.backend.dto.ApiDtos;
import com.quickq.backend.repository.UserHistoryRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AnalyticsController {

    private final UserHistoryRepository userHistoryRepository;

    public AnalyticsController(UserHistoryRepository userHistoryRepository) {
        this.userHistoryRepository = userHistoryRepository;
    }

    @GetMapping("/analytics/history")
    public ApiDtos.AnalyticsResponse getAnalytics() {
        Double averageWaitTimeSeconds = userHistoryRepository.averageWaitTimeSeconds();
        long totalServed = userHistoryRepository.countByCalledAtIsNotNull();
        return new ApiDtos.AnalyticsResponse(
            averageWaitTimeSeconds == null ? 0 : averageWaitTimeSeconds,
            totalServed
        );
    }
}
