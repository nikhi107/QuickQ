package com.quickq.backend.dto;

import java.util.List;

public final class ApiDtos {

    private ApiDtos() {
    }

    public record AdminSignupRequest(String username, String password, String inviteCode) {
    }

    public record AuthResponse(String accessToken, String tokenType) {
    }

    public record JoinQueueRequest(String userId, String name) {
    }

    public record JoinQueueResponse(String message, int position, String ticketNumber) {
    }

    public record CreateQueueRequest(
        String queueId,
        String displayName,
        String adminSubtitle,
        String clientDescription,
        String counterLabel,
        String accentFrom,
        String accentTo
    ) {
    }

    public record QueueDefinitionResponse(
        String queueId,
        String displayName,
        String adminSubtitle,
        String clientDescription,
        String counterLabel,
        String accentFrom,
        String accentTo
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
