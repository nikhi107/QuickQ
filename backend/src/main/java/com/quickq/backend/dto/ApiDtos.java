package com.quickq.backend.dto;

import java.util.List;

public final class ApiDtos {

    private ApiDtos() {
    }

    public record AdminSignupRequest(String username, String password) {
    }

    public record AuthResponse(String accessToken, String tokenType) {
    }

    public record JoinQueueRequest(String userId, String name) {
    }

    public record QueueUser(String userId, String name) {
    }

    public record QueueStatusResponse(String queueId, List<QueueUser> activeUsers, int totalWaiting) {
    }

    public record CallNextResponse(String queueId, QueueUser calledUser, int remainingWaiting) {
    }

    public record UserPositionResponse(String queueId, String userId, Integer position) {
    }

    public record AnalyticsResponse(double averageWaitTimeSeconds, long totalServed) {
    }

    public record MessageResponse(String message) {
    }

    public record QueueUpdateMessage(String type, String queueId, List<QueueUser> activeUsers, int totalWaiting) {
    }
}
