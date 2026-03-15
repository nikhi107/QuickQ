package com.quickq.backend.controller;

import com.quickq.backend.dto.ApiDtos;
import com.quickq.backend.service.QueueService;
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

    private final QueueService queueService;

    public QueueController(QueueService queueService) {
        this.queueService = queueService;
    }

    @PostMapping("/queue/{queueId}/join")
    public Map<String, Object> joinQueue(
        @PathVariable String queueId,
        @RequestBody ApiDtos.JoinQueueRequest request
    ) {
        int position = queueService.joinQueue(queueId, request);
        return Map.of(
            "message", "Joined queue successfully",
            "position", position
        );
    }

    @GetMapping("/queue/{queueId}/status")
    public ApiDtos.QueueStatusResponse getQueueStatus(@PathVariable String queueId) {
        return queueService.getQueueStatus(queueId);
    }

    @PostMapping("/queue/{queueId}/next")
    public ApiDtos.CallNextResponse callNext(@PathVariable String queueId) {
        return queueService.callNext(queueId);
    }

    @PostMapping("/queue/{queueId}/leave/{userId}")
    public ResponseEntity<?> leaveQueue(@PathVariable String queueId, @PathVariable String userId) {
        if (queueService.leaveQueue(queueId, userId)) {
            return ResponseEntity.ok(new ApiDtos.MessageResponse("Left queue safely"));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("detail", "User not found in queue"));
    }

    @GetMapping("/queue/{queueId}/position/{userId}")
    public ApiDtos.UserPositionResponse getUserPosition(
        @PathVariable String queueId,
        @PathVariable String userId
    ) {
        return queueService.getUserPosition(queueId, userId);
    }
}
