package com.quickq.backend.service;

import com.quickq.backend.dto.ApiDtos;
import com.quickq.backend.repository.QueueRedisRepository;
import com.quickq.backend.repository.UserHistoryRepository;
import com.quickq.backend.websocket.QueueWebSocketBroadcaster;
import java.util.List;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AsyncQueueBroadcaster {

    private final QueueRedisRepository queueRedisRepository;
    private final UserHistoryRepository userHistoryRepository;
    private final QueueWebSocketBroadcaster queueWebSocketBroadcaster;

    public AsyncQueueBroadcaster(
        QueueRedisRepository queueRedisRepository,
        UserHistoryRepository userHistoryRepository,
        QueueWebSocketBroadcaster queueWebSocketBroadcaster
    ) {
        this.queueRedisRepository = queueRedisRepository;
        this.userHistoryRepository = userHistoryRepository;
        this.queueWebSocketBroadcaster = queueWebSocketBroadcaster;
    }

    @Async
    public void broadcastQueueUpdateAsync(String queueId) {
        List<String> userIds = queueRedisRepository.getActiveUserIds(queueId);
        List<ApiDtos.QueueUser> activeUsers = userIds == null ? List.of() : userIds.stream()
            .map(queueRedisRepository::getUserDetails)
            .toList();

        String servingUserId = queueRedisRepository.getServingUserId(queueId);
        ApiDtos.QueueUser servingUser = servingUserId == null ? null : queueRedisRepository.getUserDetails(servingUserId);

        Double avg = userHistoryRepository.averageWaitTimeSecondsByQueueId(queueId);
        
        ApiDtos.QueueUpdateMessage message = new ApiDtos.QueueUpdateMessage(
            "QUEUE_UPDATE", 
            queueId, 
            activeUsers, 
            activeUsers.size(), 
            servingUser, 
            avg == null ? 0.0 : avg
        );

        queueWebSocketBroadcaster.broadcast(queueId, message);
    }
}
