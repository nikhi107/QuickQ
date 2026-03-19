package com.quickq.backend.service;

import com.quickq.backend.dto.ApiDtos;
import com.quickq.backend.entity.QueueDefinition;
import com.quickq.backend.repository.QueueDefinitionRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class QueueCatalogService {

    private final QueueDefinitionRepository queueDefinitionRepository;

    public QueueCatalogService(QueueDefinitionRepository queueDefinitionRepository) {
        this.queueDefinitionRepository = queueDefinitionRepository;
    }

    public List<ApiDtos.QueueDefinitionResponse> listQueues() {
        return queueDefinitionRepository.findAllByActiveTrueOrderBySortOrderAscDisplayNameAsc()
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public void ensureQueueExists(String queueId) {
        if (!queueDefinitionRepository.existsByQueueIdAndActiveTrue(queueId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Queue not found");
        }
    }

    private ApiDtos.QueueDefinitionResponse toResponse(QueueDefinition queueDefinition) {
        return new ApiDtos.QueueDefinitionResponse(
            queueDefinition.getQueueId(),
            queueDefinition.getDisplayName(),
            queueDefinition.getAdminSubtitle(),
            queueDefinition.getClientDescription(),
            queueDefinition.getCounterLabel(),
            queueDefinition.getAccentFrom(),
            queueDefinition.getAccentTo()
        );
    }
}
