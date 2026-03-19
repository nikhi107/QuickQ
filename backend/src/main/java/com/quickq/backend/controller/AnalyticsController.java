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
    public ApiDtos.AnalyticsSplitResponse getGlobalAnalytics() {
        java.time.Instant startOfDay = java.time.LocalDate.now().atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();

        Double allTimeAvg = userHistoryRepository.averageWaitTimeSeconds();
        long allTimeServed = userHistoryRepository.countByCalledAtIsNotNull();

        Double todayAvg = userHistoryRepository.averageWaitTimeSecondsAfter(startOfDay);
        long todayServed = userHistoryRepository.countByCalledAtIsNotNullAndCalledAtAfter(startOfDay);

        return new ApiDtos.AnalyticsSplitResponse(
            new ApiDtos.Metrics(allTimeAvg == null ? 0 : allTimeAvg, allTimeServed),
            new ApiDtos.Metrics(todayAvg == null ? 0 : todayAvg, todayServed)
        );
    }

    @GetMapping("/analytics/queue/{queueId}")
    public ApiDtos.AnalyticsSplitResponse getQueueAnalytics(@org.springframework.web.bind.annotation.PathVariable String queueId) {
        java.time.Instant startOfDay = java.time.LocalDate.now().atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();

        Double allTimeAvg = userHistoryRepository.averageWaitTimeSecondsByQueueId(queueId);
        long allTimeServed = userHistoryRepository.countByCalledAtIsNotNullAndQueueId(queueId);

        Double todayAvg = userHistoryRepository.averageWaitTimeSecondsByQueueIdAfter(queueId, startOfDay);
        long todayServed = userHistoryRepository.countByCalledAtIsNotNullAndQueueIdAndCalledAtAfter(queueId, startOfDay);

        return new ApiDtos.AnalyticsSplitResponse(
            new ApiDtos.Metrics(allTimeAvg == null ? 0 : allTimeAvg, allTimeServed),
            new ApiDtos.Metrics(todayAvg == null ? 0 : todayAvg, todayServed)
        );
    }
}
