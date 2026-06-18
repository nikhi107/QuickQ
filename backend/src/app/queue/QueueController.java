package app.queue;

import app.dto.ApiDtos;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;

@RestController
public class QueueController {

    private final QueueCatalogService queueCatalogService;
    private final QueueService queueService;

    public QueueController(QueueCatalogService queueCatalogService, QueueService queueService) {
        this.queueCatalogService = queueCatalogService;
        this.queueService = queueService;
    }

    @Operation(summary = "List all queues", description = "Returns a list of all available queues.")
    @GetMapping("/queues")
    public List<ApiDtos.QueueDefinitionResponse> listQueues() {
        return queueCatalogService.listQueues();
    }

    @Operation(summary = "Create a new queue", description = "Creates a new queue definition.")
    @PostMapping("/admin/queues")
    public ApiDtos.QueueDefinitionResponse createQueue(@Valid @RequestBody ApiDtos.CreateQueueRequest request) {
        return queueCatalogService.createQueue(request);
    }

    @Operation(summary = "Join a queue", description = "Adds the user to the specified queue and returns a ticket number.")
    @PostMapping("/queue/{queueId}/join")
    public ApiDtos.JoinQueueResponse joinQueue(
        @PathVariable String queueId,
        @Valid @RequestBody ApiDtos.JoinQueueRequest request
    ) {
        queueCatalogService.ensureQueueExists(queueId);
        return queueService.joinQueue(queueId, request);
    }

    @Operation(summary = "Get queue status", description = "Returns the current status of the queue, including active users.")
    @GetMapping("/queue/{queueId}/status")
    public ApiDtos.QueueStatusResponse getQueueStatus(@PathVariable String queueId) {
        queueCatalogService.ensureQueueExists(queueId);
        return queueService.getQueueStatus(queueId);
    }

    @Operation(summary = "Call next user", description = "Calls the next user in the queue.")
    @PostMapping("/queue/{queueId}/next")
    public ApiDtos.CallNextResponse callNext(@PathVariable String queueId) {
        queueCatalogService.ensureQueueExists(queueId);
        return queueService.callNext(queueId);
    }

    @Operation(summary = "Leave a queue", description = "Removes the user from the specified queue.")
    @PostMapping("/queue/{queueId}/leave/{userId}")
    public ResponseEntity<?> leaveQueue(@PathVariable String queueId, @PathVariable String userId) {
        queueCatalogService.ensureQueueExists(queueId);
        if (queueService.leaveQueue(queueId, userId)) {
            return ResponseEntity.ok(new ApiDtos.MessageResponse("Left queue safely"));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("detail", "User not found in queue"));
    }

    @Operation(summary = "Requeue a user", description = "Moves the user back into the waiting line.")
    @PostMapping("/admin/queue/{queueId}/requeue/{userId}")
    public ResponseEntity<?> requeueUser(@PathVariable String queueId, @PathVariable String userId) {
        queueCatalogService.ensureQueueExists(queueId);
        if (queueService.requeueUser(queueId, userId)) {
            return ResponseEntity.ok(new ApiDtos.MessageResponse("User requeued safely"));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("detail", "User not found in queue"));
    }

    @Operation(summary = "Clear serving user", description = "Clears the currently serving user from the desk.")
    @PostMapping("/admin/queue/{queueId}/clear-serving")
    public ResponseEntity<?> clearServingUser(@PathVariable String queueId) {
        queueCatalogService.ensureQueueExists(queueId);
        queueService.clearServingUser(queueId);
        return ResponseEntity.ok(new ApiDtos.MessageResponse("Serving user cleared"));
    }

    @Operation(summary = "Get user position", description = "Returns the current position of the user in the queue.")
    @GetMapping("/queue/{queueId}/position/{userId}")
    public ApiDtos.UserPositionResponse getUserPosition(
        @PathVariable String queueId,
        @PathVariable String userId
    ) {
        queueCatalogService.ensureQueueExists(queueId);
        return queueService.getUserPosition(queueId, userId);
    }
}
