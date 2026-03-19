package com.quickq.backend.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.quickq.backend.dto.ApiDtos;
import com.quickq.backend.entity.UserHistory;
import com.quickq.backend.repository.QueueRedisRepository;
import com.quickq.backend.repository.UserHistoryRepository;
import com.quickq.backend.websocket.QueueWebSocketBroadcaster;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QueueServiceTest {

    @Mock
    private QueueRedisRepository queueRedisRepository;

    @Mock
    private UserHistoryRepository userHistoryRepository;

    @Mock
    private QueueWebSocketBroadcaster queueWebSocketBroadcaster;

    @InjectMocks
    private QueueService queueService;

    @BeforeEach
    void setUp() {
        // Setup shared mock behaviors if needed
    }

    @Test
    void testJoinQueue_Success() {
        String queueId = "pharmacy";
        ApiDtos.JoinQueueRequest request = new ApiDtos.JoinQueueRequest("u1", "Nikhil");

        when(queueRedisRepository.incrementQueueSequence(queueId)).thenReturn(5L);
        when(queueRedisRepository.addUserToQueue(queueId, "u1")).thenReturn(1L);

        ApiDtos.JoinQueueResponse response = queueService.joinQueue(queueId, request);

        assertEquals("Joined queue successfully", response.detail());
        assertEquals(1, response.position());
        assertEquals("P-005", response.ticketNumber());

        verify(queueRedisRepository).saveUser("u1", queueId, "Nikhil", "P-005");
        verify(userHistoryRepository).save(any(UserHistory.class));
        verify(queueWebSocketBroadcaster).broadcast(eq(queueId), any());
    }

    @Test
    void testCallNext_WhenQueueIsNotEmpty() {
        String queueId = "pharmacy";
        String nextUserId = "u1";

        when(queueRedisRepository.popNextUserFromQueue(queueId)).thenReturn(nextUserId);
        ApiDtos.QueueUser mockUser = new ApiDtos.QueueUser(nextUserId, "Nikhil", "P-001");
        when(queueRedisRepository.getUserDetails(nextUserId)).thenReturn(mockUser);
        
        UserHistory mockHistory = new UserHistory();
        when(userHistoryRepository.findTopByUserIdAndCalledAtIsNullOrderByIdDesc(nextUserId))
                .thenReturn(Optional.of(mockHistory));

        ApiDtos.CallNextResponse response = queueService.callNext(queueId);

        assertNotNull(response);
        assertNotNull(response.calledUser());
        assertEquals("Nikhil", response.calledUser().name());
        
        verify(queueRedisRepository).setServingUser(queueId, nextUserId);
        verify(userHistoryRepository).save(mockHistory);
        assertNotNull(mockHistory.getCalledAt());
    }

    @Test
    void testCallNext_WhenQueueIsEmpty() {
        String queueId = "pharmacy";
        when(queueRedisRepository.popNextUserFromQueue(queueId)).thenReturn(null);

        ApiDtos.CallNextResponse response = queueService.callNext(queueId);

        assertNotNull(response);
        assertNull(response.calledUser());
        verify(queueRedisRepository, never()).setServingUser(anyString(), anyString());
    }
}
