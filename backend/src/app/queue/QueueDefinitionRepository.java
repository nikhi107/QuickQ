package app.queue;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QueueDefinitionRepository extends JpaRepository<QueueDefinition, String> {

    List<QueueDefinition> findAllByActiveTrueOrderBySortOrderAscDisplayNameAsc();

    boolean existsByQueueIdAndActiveTrue(String queueId);
}
