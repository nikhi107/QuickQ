package com.quickq.backend.repository;

import com.quickq.backend.dto.ApiDtos;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class QueueRedisRepository {

    private final StringRedisTemplate redisTemplate;

    public QueueRedisRepository(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Long incrementQueueSequence(String queueId) {
        return redisTemplate.opsForValue().increment("queue_seq:" + queueId);
    }

    public void saveUser(String userId, String queueId, String name, String ticketNumber) {
        redisTemplate.opsForHash().put(userKey(userId), "name", name);
        redisTemplate.opsForHash().put(userKey(userId), "queue_id", queueId);
        redisTemplate.opsForHash().put(userKey(userId), "ticket_number", ticketNumber);
    }

    public void deleteUser(String userId) {
        redisTemplate.delete(userKey(userId));
    }

    public Long addUserToQueue(String queueId, String userId) {
        return redisTemplate.opsForList().rightPush(queueKey(queueId), userId);
    }

    public String popNextUserFromQueue(String queueId) {
        return redisTemplate.opsForList().leftPop(queueKey(queueId));
    }

    public boolean removeUserFromQueue(String queueId, String userId) {
        Long removed = redisTemplate.opsForList().remove(queueKey(queueId), 1, userId);
        return removed != null && removed > 0;
    }

    public List<String> getActiveUserIds(String queueId) {
        return redisTemplate.opsForList().range(queueKey(queueId), 0, -1);
    }

    public ApiDtos.QueueUser getUserDetails(String userId) {
        Map<Object, Object> userData = redisTemplate.opsForHash().entries(userKey(userId));
        if (userData.isEmpty()) return null;
        
        String name = userData.getOrDefault("name", "Unknown").toString();
        String ticketNumber = userData.getOrDefault("ticket_number", "").toString();
        return new ApiDtos.QueueUser(userId, name, ticketNumber);
    }

    public void setServingUser(String queueId, String userId) {
        redisTemplate.opsForValue().set("queue:" + queueId + ":serving", userId);
    }

    public String getServingUserId(String queueId) {
        return redisTemplate.opsForValue().get("queue:" + queueId + ":serving");
    }

    public void clearServingUser(String queueId) {
        redisTemplate.delete("queue:" + queueId + ":serving");
    }

    private String queueKey(String queueId) {
        return "queue:" + queueId;
    }

    private String userKey(String userId) {
        return "user:" + userId;
    }
}
