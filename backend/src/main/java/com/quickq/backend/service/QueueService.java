package com.quickq.backend.service;

import com.quickq.backend.dto.ApiDtos;
import com.quickq.backend.entity.UserHistory;
import com.quickq.backend.repository.UserHistoryRepository;
import com.quickq.backend.websocket.QueueWebSocketBroadcaster;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QueueService {

    private final StringRedisTemplate redisTemplate;
    private final UserHistoryRepository userHistoryRepository;
    private final QueueWebSocketBroadcaster queueWebSocketBroadcaster;

    public QueueService(
        StringRedisTemplate redisTemplate,
        UserHistoryRepository userHistoryRepository,
        QueueWebSocketBroadcaster queueWebSocketBroadcaster
    ) {
        this.redisTemplate = redisTemplate;
        this.userHistoryRepository = userHistoryRepository;
        this.queueWebSocketBroadcaster = queueWebSocketBroadcaster;
    }

    @Transactional
    public ApiDtos.JoinQueueResponse joinQueue(String queueId, ApiDtos.JoinQueueRequest request) {
        Long seq = redisTemplate.opsForValue().increment("queue_seq:" + queueId);
        String prefix = queueId.substring(0, 1).toUpperCase();
        String ticketNumber = String.format("%s-%03d", prefix, seq);

        redisTemplate.opsForHash().put(userKey(request.userId()), "name", request.name());
        redisTemplate.opsForHash().put(userKey(request.userId()), "queue_id", queueId);
        redisTemplate.opsForHash().put(userKey(request.userId()), "ticket_number", ticketNumber);

        Long position = redisTemplate.opsForList().rightPush(queueKey(queueId), request.userId());

        UserHistory history = new UserHistory();
        history.setQueueId(queueId);
        history.setUserId(request.userId());
        history.setName(request.name());
        history.setTicketNumber(ticketNumber);
        userHistoryRepository.save(history);

        broadcastQueueUpdate(queueId);
        return new ApiDtos.JoinQueueResponse("Joined queue successfully", position == null ? 0 : position.intValue(), ticketNumber);
    }

    public ApiDtos.QueueStatusResponse getQueueStatus(String queueId) {
        List<ApiDtos.QueueUser> activeUsers = getActiveUsers(queueId);
        return new ApiDtos.QueueStatusResponse(queueId, activeUsers, activeUsers.size());
    }

    @Transactional
    public ApiDtos.CallNextResponse callNext(String queueId) {
        String nextUserId = redisTemplate.opsForList().leftPop(queueKey(queueId));
        ApiDtos.QueueUser calledUser = null;

        if (nextUserId != null) {
            Map<Object, Object> userData = redisTemplate.opsForHash().entries(userKey(nextUserId));
            String name = userData.getOrDefault("name", "Unknown").toString();
            String ticketNumber = userData.getOrDefault("ticket_number", "").toString();
            calledUser = new ApiDtos.QueueUser(nextUserId, name, ticketNumber);

            userHistoryRepository.findTopByUserIdAndCalledAtIsNullOrderByIdDesc(nextUserId).ifPresent(history -> {
                Instant calledAt = Instant.now();
                history.setCalledAt(calledAt);
                Instant joinedAt = history.getJoinedAt() == null ? calledAt : history.getJoinedAt();
                history.setWaitTimeSeconds((double) Duration.between(joinedAt, calledAt).toSeconds());
                userHistoryRepository.save(history);
            });
        }

        broadcastQueueUpdate(queueId);
        int remainingWaiting = getActiveUsers(queueId).size();
        return new ApiDtos.CallNextResponse(queueId, calledUser, remainingWaiting);
    }

    @Transactional
    public boolean leaveQueue(String queueId, String userId) {
        Long removed = redisTemplate.opsForList().remove(queueKey(queueId), 1, userId);
        if (removed != null && removed > 0) {
            redisTemplate.delete(userKey(userId));
            broadcastQueueUpdate(queueId);
            return true;
        }
        return false;
    }

    public ApiDtos.UserPositionResponse getUserPosition(String queueId, String userId) {
        List<String> activeUsers = redisTemplate.opsForList().range(queueKey(queueId), 0, -1);
        Integer position = null;
        if (activeUsers != null) {
            int index = activeUsers.indexOf(userId);
            if (index >= 0) {
                position = index + 1;
            }
        }

        return new ApiDtos.UserPositionResponse(queueId, userId, position);
    }

    public ApiDtos.QueueUpdateMessage buildQueueUpdateMessage(String queueId) {
        List<ApiDtos.QueueUser> activeUsers = getActiveUsers(queueId);
        return new ApiDtos.QueueUpdateMessage("QUEUE_UPDATE", queueId, activeUsers, activeUsers.size());
    }

    public void broadcastQueueUpdate(String queueId) {
        queueWebSocketBroadcaster.broadcast(queueId, buildQueueUpdateMessage(queueId));
    }

    private List<ApiDtos.QueueUser> getActiveUsers(String queueId) {
        List<String> userIds = redisTemplate.opsForList().range(queueKey(queueId), 0, -1);
        if (userIds == null) {
            return List.of();
        }

        return userIds.stream()
            .map(userId -> {
                Map<Object, Object> userData = redisTemplate.opsForHash().entries(userKey(userId));
                String name = userData.getOrDefault("name", "Unknown").toString();
                String ticketNumber = userData.getOrDefault("ticket_number", "").toString();
                return new ApiDtos.QueueUser(userId, name, ticketNumber);
            })
            .toList();
    }

    private String queueKey(String queueId) {
        return "queue:" + queueId;
    }

    private String userKey(String userId) {
        return "user:" + userId;
    }
}
