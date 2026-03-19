package com.quickq.backend.repository;

import com.quickq.backend.entity.QueueDefinition;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QueueDefinitionRepository extends JpaRepository<QueueDefinition, String> {

    List<QueueDefinition> findAllByActiveTrueOrderBySortOrderAscDisplayNameAsc();

    boolean existsByQueueIdAndActiveTrue(String queueId);
}
