package app.queue;

import app.dto.ApiDtos;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.RedisOperations;

import java.time.Duration;
import java.util.ArrayList;
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
        String key = userKey(userId);
        Map<String, String> fields = Map.of(
            "name", name,
            "queue_id", queueId,
            "ticket_number", ticketNumber
        );
        redisTemplate.opsForHash().putAll(key, fields);
        redisTemplate.expire(key, Duration.ofHours(4));
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

    @SuppressWarnings("unchecked")
    public List<ApiDtos.QueueUser> getUserDetailsBatch(List<String> userIds) {
        if (userIds == null || userIds.isEmpty()) return List.of();
        
        List<Object> results = redisTemplate.executePipelined(new SessionCallback<Object>() {
            @Override
            public Object execute(RedisOperations operations) throws org.springframework.dao.DataAccessException {
                for (String userId : userIds) {
                    operations.opsForHash().entries(userKey(userId));
                }
                return null;
            }
        });

        List<ApiDtos.QueueUser> users = new ArrayList<>();
        for (int i = 0; i < userIds.size(); i++) {
            Map<Object, Object> userData = (Map<Object, Object>) results.get(i);
            if (userData != null && !userData.isEmpty()) {
                String name = userData.getOrDefault("name", "Unknown").toString();
                String ticketNumber = userData.getOrDefault("ticket_number", "").toString();
                users.add(new ApiDtos.QueueUser(userIds.get(i), name, ticketNumber));
            } else {
                users.add(null);
            }
        }
        return users;
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
