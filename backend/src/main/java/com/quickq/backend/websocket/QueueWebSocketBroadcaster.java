package com.quickq.backend.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quickq.backend.dto.ApiDtos;
import java.io.IOException;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Component
public class QueueWebSocketBroadcaster {

    private final ConcurrentHashMap<String, Set<WebSocketSession>> sessionsByQueue = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public QueueWebSocketBroadcaster(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(String queueId, WebSocketSession session) {
        sessionsByQueue.computeIfAbsent(queueId, ignored -> Collections.newSetFromMap(new ConcurrentHashMap<>()))
            .add(session);
    }

    public void unregister(String queueId, WebSocketSession session) {
        Set<WebSocketSession> sessions = sessionsByQueue.get(queueId);
        if (sessions == null) {
            return;
        }
        sessions.remove(session);
        if (sessions.isEmpty()) {
            sessionsByQueue.remove(queueId);
        }
    }

    public void sendToSession(String queueId, WebSocketSession session, ApiDtos.QueueUpdateMessage message) {
        sendMessage(queueId, session, message);
    }

    public void broadcast(String queueId, ApiDtos.QueueUpdateMessage message) {
        Set<WebSocketSession> sessions = sessionsByQueue.get(queueId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        sessions.forEach(session -> sendMessage(queueId, session, message));
    }

    private void sendMessage(String queueId, WebSocketSession session, ApiDtos.QueueUpdateMessage message) {
        if (!session.isOpen()) {
            unregister(queueId, session);
            return;
        }

        try {
            String payload = objectMapper.writeValueAsString(message);
            synchronized (session) {
                session.sendMessage(new TextMessage(payload));
            }
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize queue update", ex);
        } catch (IOException ex) {
            unregister(queueId, session);
            try {
                session.close();
            } catch (IOException ignored) {
            }
        }
    }
}
