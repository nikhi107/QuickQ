package com.quickq.backend.config;

import com.quickq.backend.websocket.QueueWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final QueueWebSocketHandler queueWebSocketHandler;
    private final AppProperties appProperties;

    public WebSocketConfig(QueueWebSocketHandler queueWebSocketHandler, AppProperties appProperties) {
        this.queueWebSocketHandler = queueWebSocketHandler;
        this.appProperties = appProperties;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(queueWebSocketHandler, "/ws/queue/*")
            .setAllowedOriginPatterns(appProperties.getCors().getAllowedOriginPatterns().toArray(String[]::new));
    }
}
