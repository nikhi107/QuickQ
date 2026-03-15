package com.quickq.backend.websocket;

import com.quickq.backend.service.QueueService;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class QueueWebSocketHandler extends TextWebSocketHandler {

    private final QueueService queueService;
    private final QueueWebSocketBroadcaster queueWebSocketBroadcaster;

    public QueueWebSocketHandler(QueueService queueService, QueueWebSocketBroadcaster queueWebSocketBroadcaster) {
        this.queueService = queueService;
        this.queueWebSocketBroadcaster = queueWebSocketBroadcaster;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String queueId = extractQueueId(session);
        queueWebSocketBroadcaster.register(queueId, session);
        queueWebSocketBroadcaster.sendToSession(queueId, session, queueService.buildQueueUpdateMessage(queueId));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // The frontend only needs the connection kept alive for broadcast updates.
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws IOException {
        String queueId = extractQueueId(session);
        queueWebSocketBroadcaster.unregister(queueId, session);
        if (session.isOpen()) {
            session.close();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        queueWebSocketBroadcaster.unregister(extractQueueId(session), session);
    }

    private String extractQueueId(WebSocketSession session) {
        String path = session.getUri() == null ? "" : session.getUri().getPath();
        String[] segments = path.split("/");
        return segments.length == 0 ? "" : segments[segments.length - 1];
    }
}
