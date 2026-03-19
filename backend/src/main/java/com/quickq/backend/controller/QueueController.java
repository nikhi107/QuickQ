package com.quickq.backend.controller;

import com.quickq.backend.dto.ApiDtos;
import com.quickq.backend.service.QueueCatalogService;
import com.quickq.backend.service.QueueService;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class QueueController {

    private final QueueCatalogService queueCatalogService;
    private final QueueService queueService;

    public QueueController(QueueCatalogService queueCatalogService, QueueService queueService) {
        this.queueCatalogService = queueCatalogService;
        this.queueService = queueService;
    }

    @GetMapping("/queues")
    public List<ApiDtos.QueueDefinitionResponse> listQueues() {
        return queueCatalogService.listQueues();
    }

    @PostMapping("/admin/queues")
    public ApiDtos.QueueDefinitionResponse createQueue(@RequestBody ApiDtos.CreateQueueRequest request) {
        return queueCatalogService.createQueue(request);
    }

    @PostMapping("/queue/{queueId}/join")
    public ApiDtos.JoinQueueResponse joinQueue(
        @PathVariable String queueId,
        @RequestBody ApiDtos.JoinQueueRequest request
    ) {
        queueCatalogService.ensureQueueExists(queueId);
        return queueService.joinQueue(queueId, request);
    }

    @GetMapping("/queue/{queueId}/status")
    public ApiDtos.QueueStatusResponse getQueueStatus(@PathVariable String queueId) {
        queueCatalogService.ensureQueueExists(queueId);
        return queueService.getQueueStatus(queueId);
    }

    @PostMapping("/queue/{queueId}/next")
    public ApiDtos.CallNextResponse callNext(@PathVariable String queueId) {
        queueCatalogService.ensureQueueExists(queueId);
        return queueService.callNext(queueId);
    }

    @PostMapping("/queue/{queueId}/leave/{userId}")
    public ResponseEntity<?> leaveQueue(@PathVariable String queueId, @PathVariable String userId) {
        queueCatalogService.ensureQueueExists(queueId);
        if (queueService.leaveQueue(queueId, userId)) {
            return ResponseEntity.ok(new ApiDtos.MessageResponse("Left queue safely"));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("detail", "User not found in queue"));
    }

    @PostMapping("/admin/queue/{queueId}/requeue/{userId}")
    public ResponseEntity<?> requeueUser(@PathVariable String queueId, @PathVariable String userId) {
        queueCatalogService.ensureQueueExists(queueId);
        if (queueService.requeueUser(queueId, userId)) {
            return ResponseEntity.ok(new ApiDtos.MessageResponse("User requeued safely"));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("detail", "User not found in queue"));
    }

    @PostMapping("/admin/queue/{queueId}/clear-serving")
    public ResponseEntity<?> clearServingUser(@PathVariable String queueId) {
        queueCatalogService.ensureQueueExists(queueId);
        queueService.clearServingUser(queueId);
        return ResponseEntity.ok(new ApiDtos.MessageResponse("Serving user cleared"));
    }

    @GetMapping("/queue/{queueId}/position/{userId}")
    public ApiDtos.UserPositionResponse getUserPosition(
        @PathVariable String queueId,
        @PathVariable String userId
    ) {
        queueCatalogService.ensureQueueExists(queueId);
        return queueService.getUserPosition(queueId, userId);
    }
}
