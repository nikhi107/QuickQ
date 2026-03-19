package com.quickq.backend.repository;

import com.quickq.backend.entity.UserHistory;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserHistoryRepository extends JpaRepository<UserHistory, Long> {

    Optional<UserHistory> findTopByUserIdAndCalledAtIsNullOrderByIdDesc(String userId);

    long countByCalledAtIsNotNull();

    @Query("select coalesce(avg(u.waitTimeSeconds), 0) from UserHistory u where u.calledAt is not null")
    Double averageWaitTimeSeconds();

    long countByCalledAtIsNotNullAndQueueId(String queueId);

    @Query("select coalesce(avg(u.waitTimeSeconds), 0) from UserHistory u where u.calledAt is not null and u.queueId = :queueId")
    Double averageWaitTimeSecondsByQueueId(String queueId);

    long countByCalledAtIsNotNullAndCalledAtAfter(java.time.Instant instant);

    @Query("select coalesce(avg(u.waitTimeSeconds), 0) from UserHistory u where u.calledAt is not null and u.calledAt > :instant")
    Double averageWaitTimeSecondsAfter(java.time.Instant instant);

    long countByCalledAtIsNotNullAndQueueIdAndCalledAtAfter(String queueId, java.time.Instant instant);

    @Query("select coalesce(avg(u.waitTimeSeconds), 0) from UserHistory u where u.calledAt is not null and u.queueId = :queueId and u.calledAt > :instant")
    Double averageWaitTimeSecondsByQueueIdAfter(String queueId, java.time.Instant instant);
}
