package app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class ApiDtos {

    private ApiDtos() {
    }

    public record AdminSignupRequest(
        @NotBlank String username, 
        @NotBlank @Size(min=8, max=72) String password, 
        String inviteCode
    ) {}

    public record AuthResponse(String accessToken, String tokenType, String role) {
    }

    public record JoinQueueRequest(
        @NotBlank @Size(max=100) String name
    ) {}

    public record JoinQueueResponse(String message, int position, String ticketNumber, String userId) {
    }

    private static final String HEX_COLOR_PATTERN = "^#[0-9a-fA-F]{6}$";

    public record CreateQueueRequest(
        @NotBlank @Size(min=2, max=30) @Pattern(regexp="[a-z0-9_-]+") String queueId,
        @NotBlank @Size(max=80) String displayName,
        String adminSubtitle,
        String clientDescription,
        String counterLabel,
        @Pattern(regexp=HEX_COLOR_PATTERN, message="Must be a valid hex color (e.g. #0f766e)") String accentFrom,
        @Pattern(regexp=HEX_COLOR_PATTERN, message="Must be a valid hex color (e.g. #115e59)") String accentTo
    ) {
    }

    public record QueueDefinitionResponse(
        String queueId,
        String displayName,
        String adminSubtitle,
        String clientDescription,
        String counterLabel,
        String accentFrom,
        String accentTo,
        int sortOrder
    ) {
    }

    public record QueueUser(String userId, String name, String ticketNumber) {
    }

    public record QueueStatusResponse(String queueId, List<QueueUser> activeUsers, int totalWaiting, QueueUser servingUser, double averageWaitTimeSeconds) {
    }

    public record CallNextResponse(String queueId, QueueUser calledUser, int remainingWaiting) {
    }

    public record UserPositionResponse(String queueId, String userId, Integer position) {
    }

    public record AnalyticsResponse(double averageWaitTimeSeconds, long totalServed) {
    }

    public record Metrics(double averageWaitTimeSeconds, long totalServed) {
    }

    public record AnalyticsSplitResponse(Metrics allTime, Metrics today) {
    }

    public record MessageResponse(String message) {
    }

    public record QueueUpdateMessage(String type, String queueId, List<QueueUser> activeUsers, int totalWaiting, QueueUser servingUser, double averageWaitTimeSeconds) {
    }
}