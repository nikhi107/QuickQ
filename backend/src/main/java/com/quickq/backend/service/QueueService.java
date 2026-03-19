package com.quickq.backend.service;

import com.quickq.backend.dto.ApiDtos;
import com.quickq.backend.entity.UserHistory;
import com.quickq.backend.repository.QueueRedisRepository;
import com.quickq.backend.repository.UserHistoryRepository;
import com.quickq.backend.websocket.QueueWebSocketBroadcaster;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QueueService {

    private final QueueRedisRepository queueRedisRepository;
    private final UserHistoryRepository userHistoryRepository;
    private final QueueWebSocketBroadcaster queueWebSocketBroadcaster;

    public QueueService(
        QueueRedisRepository queueRedisRepository,
        UserHistoryRepository userHistoryRepository,
        QueueWebSocketBroadcaster queueWebSocketBroadcaster
    ) {
        this.queueRedisRepository = queueRedisRepository;
        this.userHistoryRepository = userHistoryRepository;
        this.queueWebSocketBroadcaster = queueWebSocketBroadcaster;
    }

    @Transactional
    public ApiDtos.JoinQueueResponse joinQueue(String queueId, ApiDtos.JoinQueueRequest request) {
        Long seq = queueRedisRepository.incrementQueueSequence(queueId);
        String prefix = queueId.substring(0, 1).toUpperCase();
        String ticketNumber = String.format("%s-%03d", prefix, seq);

        queueRedisRepository.saveUser(request.userId(), queueId, request.name(), ticketNumber);
        Long position = queueRedisRepository.addUserToQueue(queueId, request.userId());

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
        ApiDtos.QueueUser servingUser = getServingUser(queueId);
        Double avg = userHistoryRepository.averageWaitTimeSecondsByQueueId(queueId);
        return new ApiDtos.QueueStatusResponse(queueId, activeUsers, activeUsers.size(), servingUser, avg == null ? 0.0 : avg);
    }

    @Transactional
    public ApiDtos.CallNextResponse callNext(String queueId) {
        String nextUserId = queueRedisRepository.popNextUserFromQueue(queueId);
        ApiDtos.QueueUser calledUser = null;

        if (nextUserId != null) {
            queueRedisRepository.setServingUser(queueId, nextUserId);
            calledUser = queueRedisRepository.getUserDetails(nextUserId);

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
        if (queueRedisRepository.removeUserFromQueue(queueId, userId)) {
            queueRedisRepository.deleteUser(userId);
            broadcastQueueUpdate(queueId);
            return true;
        }
        return false;
    }

    @Transactional
    public boolean requeueUser(String queueId, String userId) {
        if (queueRedisRepository.removeUserFromQueue(queueId, userId)) {
            queueRedisRepository.addUserToQueue(queueId, userId);
            broadcastQueueUpdate(queueId);
            return true;
        }
        return false;
    }

    public ApiDtos.UserPositionResponse getUserPosition(String queueId, String userId) {
        List<String> activeUsers = queueRedisRepository.getActiveUserIds(queueId);
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
        ApiDtos.QueueUser servingUser = getServingUser(queueId);
        Double avg = userHistoryRepository.averageWaitTimeSecondsByQueueId(queueId);
        return new ApiDtos.QueueUpdateMessage("QUEUE_UPDATE", queueId, activeUsers, activeUsers.size(), servingUser, avg == null ? 0.0 : avg);
    }

    public void broadcastQueueUpdate(String queueId) {
        queueWebSocketBroadcaster.broadcast(queueId, buildQueueUpdateMessage(queueId));
    }

    private List<ApiDtos.QueueUser> getActiveUsers(String queueId) {
        List<String> userIds = queueRedisRepository.getActiveUserIds(queueId);
        if (userIds == null) {
            return List.of();
        }

        return userIds.stream()
            .map(queueRedisRepository::getUserDetails)
            .toList();
    }

    private ApiDtos.QueueUser getServingUser(String queueId) {
        String servingUserId = queueRedisRepository.getServingUserId(queueId);
        if (servingUserId == null) return null;
        
        return queueRedisRepository.getUserDetails(servingUserId);
    }

    public void clearServingUser(String queueId) {
        queueRedisRepository.clearServingUser(queueId);
        broadcastQueueUpdate(queueId);
    }
}
