package app.history;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
public class UserHistoryService {

    private final UserHistoryRepository userHistoryRepository;

    public UserHistoryService(UserHistoryRepository userHistoryRepository) {
        this.userHistoryRepository = userHistoryRepository;
    }

    // @Transactional covers only JPA (SQLite)
    @Transactional
    public void saveNewHistory(String queueId, String userId, String name, String ticketNumber) {
        UserHistory history = new UserHistory();
        history.setQueueId(queueId);
        history.setUserId(userId);
        history.setName(name);
        history.setTicketNumber(ticketNumber);
        userHistoryRepository.save(history);
    }

    // @Transactional covers only JPA (SQLite)
    @Transactional
    public void recordCallTime(String userId) {
        userHistoryRepository.findTopByUserIdAndCalledAtIsNullOrderByIdDesc(userId).ifPresent(history -> {
            Instant calledAt = Instant.now();
            history.setCalledAt(calledAt);
            Instant joinedAt = history.getJoinedAt() == null ? calledAt : history.getJoinedAt();
            history.setWaitTimeSeconds((double) Duration.between(joinedAt, calledAt).toSeconds());
            userHistoryRepository.save(history);
        });
    }

    public Double getAverageWaitTimeSecondsByQueueId(String queueId) {
        return userHistoryRepository.averageWaitTimeSecondsByQueueId(queueId);
    }
}
