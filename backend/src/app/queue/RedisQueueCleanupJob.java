package app.queue;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RedisQueueCleanupJob {

    private final QueueRedisRepository queueRedisRepository;
    private final QueueCatalogService queueCatalogService;

    public RedisQueueCleanupJob(QueueRedisRepository queueRedisRepository, QueueCatalogService queueCatalogService) {
        this.queueRedisRepository = queueRedisRepository;
        this.queueCatalogService = queueCatalogService;
    }

    @Scheduled(fixedRate = 600000)
    public void cleanupGhostEntries() {
        queueCatalogService.listQueues().forEach(queueDef -> {
            String queueId = queueDef.queueId();
            List<String> activeUserIds = queueRedisRepository.getActiveUserIds(queueId);
            if (activeUserIds != null) {
                for (String userId : activeUserIds) {
                    if (queueRedisRepository.getUserDetails(userId) == null) {
                        // User hash no longer exists (expired TTL), remove from queue list
                        queueRedisRepository.removeUserFromQueue(queueId, userId);
                        System.out.println("Cleaned up ghost user " + userId + " from queue " + queueId);
                    }
                }
            }
        });
    }
}
