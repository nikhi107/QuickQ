package app.analytics;

import app.config.AppProperties;
import app.dto.ApiDtos;
import app.history.UserHistoryRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.ZoneId;

@RestController
public class AnalyticsController {

    private final UserHistoryRepository userHistoryRepository;
    private final AppProperties appProperties;

    public AnalyticsController(UserHistoryRepository userHistoryRepository, AppProperties appProperties) {
        this.userHistoryRepository = userHistoryRepository;
        this.appProperties = appProperties;
    }

    @GetMapping("/analytics/history")
    public ApiDtos.AnalyticsSplitResponse getGlobalAnalytics() {
        ZoneId zone = ZoneId.of(appProperties.getTimezone());
        java.time.Instant startOfDay = java.time.LocalDate.now(zone).atStartOfDay(zone).toInstant();

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
        ZoneId zone = ZoneId.of(appProperties.getTimezone());
        java.time.Instant startOfDay = java.time.LocalDate.now(zone).atStartOfDay(zone).toInstant();

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
