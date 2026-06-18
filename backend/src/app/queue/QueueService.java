package app.queue;

import app.dto.ApiDtos;
import app.history.UserHistoryService;
import app.websocket.QueueWebSocketBroadcaster;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class QueueService {

    private final QueueRedisRepository queueRedisRepository;
    private final UserHistoryService userHistoryService;
    private final AsyncQueueBroadcaster asyncQueueBroadcaster;

    public QueueService(
        QueueRedisRepository queueRedisRepository,
        UserHistoryService userHistoryService,
        AsyncQueueBroadcaster asyncQueueBroadcaster
    ) {
        this.queueRedisRepository = queueRedisRepository;
        this.userHistoryService = userHistoryService;
        this.asyncQueueBroadcaster = asyncQueueBroadcaster;
    }

    public ApiDtos.JoinQueueResponse joinQueue(String queueId, ApiDtos.JoinQueueRequest request) {
        String userId = UUID.randomUUID().toString();
        
        Long seq = queueRedisRepository.incrementQueueSequence(queueId);
        String prefix = queueId.length() >= 2
            ? queueId.substring(0, 2).toUpperCase()
            : queueId.substring(0, 1).toUpperCase();
        String ticketNumber = String.format("%s-%03d", prefix, seq);

        Long position = 0L;
        try {
            // Redis operations are NOT transactional
            queueRedisRepository.saveUser(userId, queueId, request.name(), ticketNumber);
            position = queueRedisRepository.addUserToQueue(queueId, userId);
        } catch (Exception e) {
            System.err.println("Error saving user to Redis: " + e.getMessage());
        }

        userHistoryService.saveNewHistory(queueId, userId, request.name(), ticketNumber);

        broadcastQueueUpdate(queueId);
        return new ApiDtos.JoinQueueResponse("Joined queue successfully", position == null ? 0 : position.intValue(), ticketNumber, userId);
    }

    public ApiDtos.QueueStatusResponse getQueueStatus(String queueId) {
        List<ApiDtos.QueueUser> activeUsers = getActiveUsers(queueId);
        ApiDtos.QueueUser servingUser = getServingUser(queueId);
        Double avg = userHistoryService.getAverageWaitTimeSecondsByQueueId(queueId);
        return new ApiDtos.QueueStatusResponse(queueId, activeUsers, activeUsers.size(), servingUser, avg == null ? 0.0 : avg);
    }

    public ApiDtos.CallNextResponse callNext(String queueId) {
        String nextUserId = null;
        try {
            // Redis operations are NOT transactional
            nextUserId = queueRedisRepository.popNextUserFromQueue(queueId);
        } catch (Exception e) {
            System.err.println("Error popping user from Redis queue: " + e.getMessage());
        }
        
        ApiDtos.QueueUser calledUser = null;

        if (nextUserId != null) {
            try {
                queueRedisRepository.setServingUser(queueId, nextUserId);
                calledUser = queueRedisRepository.getUserDetails(nextUserId);
            } catch (Exception e) {
                System.err.println("Error updating serving user in Redis: " + e.getMessage());
            }

            userHistoryService.recordCallTime(nextUserId);
        }

        broadcastQueueUpdate(queueId);
        int remainingWaiting = getActiveUsers(queueId).size();
        return new ApiDtos.CallNextResponse(queueId, calledUser, remainingWaiting);
    }

    public boolean leaveQueue(String queueId, String userId) {
        boolean removed = false;
        try {
            // Redis operations are NOT transactional
            if (queueRedisRepository.removeUserFromQueue(queueId, userId)) {
                queueRedisRepository.deleteUser(userId);
                removed = true;
            }
        } catch (Exception e) {
            System.err.println("Error removing user from Redis: " + e.getMessage());
        }
        
        if (removed) {
            broadcastQueueUpdate(queueId);
        }
        return removed;
    }

    public boolean requeueUser(String queueId, String userId) {
        boolean requeued = false;
        try {
            // Redis operations are NOT transactional
            if (queueRedisRepository.removeUserFromQueue(queueId, userId)) {
                queueRedisRepository.addUserToQueue(queueId, userId);
                requeued = true;
            }
        } catch (Exception e) {
            System.err.println("Error requeuing user in Redis: " + e.getMessage());
        }
        
        if (requeued) {
            broadcastQueueUpdate(queueId);
        }
        return requeued;
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
        Double avg = userHistoryService.getAverageWaitTimeSecondsByQueueId(queueId);
        return new ApiDtos.QueueUpdateMessage("QUEUE_UPDATE", queueId, activeUsers, activeUsers.size(), servingUser, avg == null ? 0.0 : avg);
    }

    public void broadcastQueueUpdate(String queueId) {
        asyncQueueBroadcaster.broadcastQueueUpdateAsync(queueId);
    }

    private List<ApiDtos.QueueUser> getActiveUsers(String queueId) {
        List<String> userIds = queueRedisRepository.getActiveUserIds(queueId);
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }

        // Use pipelining to batch fetch user details
        List<ApiDtos.QueueUser> users = queueRedisRepository.getUserDetailsBatch(userIds);
        return users.stream().filter(u -> u != null).toList();
    }

    private ApiDtos.QueueUser getServingUser(String queueId) {
        String servingUserId = queueRedisRepository.getServingUserId(queueId);
        if (servingUserId == null) return null;
        
        return queueRedisRepository.getUserDetails(servingUserId);
    }

    public void clearServingUser(String queueId) {
        try {
            queueRedisRepository.clearServingUser(queueId);
        } catch (Exception e) {
            System.err.println("Error clearing serving user in Redis: " + e.getMessage());
        }
        broadcastQueueUpdate(queueId);
    }
}
