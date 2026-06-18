package app.queue;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import app.dto.ApiDtos;
import app.history.UserHistoryService;
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
    private UserHistoryService userHistoryService;

    @Mock
    private AsyncQueueBroadcaster asyncQueueBroadcaster;

    @InjectMocks
    private QueueService queueService;

    @BeforeEach
    void setUp() {
        // Setup shared mock behaviors if needed
    }

    @Test
    void testJoinQueue_Success() {
        String queueId = "pharmacy";
        // JoinQueueRequest now only takes name; userId is generated server-side
        ApiDtos.JoinQueueRequest request = new ApiDtos.JoinQueueRequest("Nikhil");

        when(queueRedisRepository.incrementQueueSequence(queueId)).thenReturn(5L);
        when(queueRedisRepository.addUserToQueue(eq(queueId), anyString())).thenReturn(1L);

        ApiDtos.JoinQueueResponse response = queueService.joinQueue(queueId, request);

        assertEquals("Joined queue successfully", response.message());
        assertEquals(1, response.position());
        // Ticket prefix is derived from queueId: "pharmacy" -> "PH"
        assertEquals("PH-005", response.ticketNumber());
        // userId is a UUID generated server-side, so just assert it's present
        assertNotNull(response.userId());
        assertFalse(response.userId().isEmpty());

        // Verify Redis calls with anyString() for the generated userId
        verify(queueRedisRepository).saveUser(anyString(), eq(queueId), eq("Nikhil"), eq("PH-005"));
        verify(queueRedisRepository).addUserToQueue(eq(queueId), anyString());
        // Verify JPA history is saved via UserHistoryService (not UserHistoryRepository)
        verify(userHistoryService).saveNewHistory(eq(queueId), anyString(), eq("Nikhil"), eq("PH-005"));
        verify(asyncQueueBroadcaster).broadcastQueueUpdateAsync(eq(queueId));
    }

    @Test
    void testCallNext_WhenQueueIsNotEmpty() {
        String queueId = "pharmacy";
        String nextUserId = "u1";

        when(queueRedisRepository.popNextUserFromQueue(queueId)).thenReturn(nextUserId);
        ApiDtos.QueueUser mockUser = new ApiDtos.QueueUser(nextUserId, "Nikhil", "P-001");
        when(queueRedisRepository.getUserDetails(nextUserId)).thenReturn(mockUser);
        // getActiveUserIds is called by getActiveUsers -> getUserDetailsBatch for remainingWaiting
        when(queueRedisRepository.getActiveUserIds(queueId)).thenReturn(java.util.List.of());
        when(queueRedisRepository.getUserDetailsBatch(any())).thenReturn(java.util.List.of());

        ApiDtos.CallNextResponse response = queueService.callNext(queueId);

        assertNotNull(response);
        assertNotNull(response.calledUser());
        assertEquals("Nikhil", response.calledUser().name());

        verify(queueRedisRepository).setServingUser(queueId, nextUserId);
        // Verify JPA history call time is recorded via UserHistoryService
        verify(userHistoryService).recordCallTime(nextUserId);
    }

    @Test
    void testCallNext_WhenQueueIsEmpty() {
        String queueId = "pharmacy";
        when(queueRedisRepository.popNextUserFromQueue(queueId)).thenReturn(null);
        // getActiveUserIds is called for remainingWaiting count
        when(queueRedisRepository.getActiveUserIds(queueId)).thenReturn(java.util.List.of());
        when(queueRedisRepository.getUserDetailsBatch(any())).thenReturn(java.util.List.of());

        ApiDtos.CallNextResponse response = queueService.callNext(queueId);

        assertNotNull(response);
        assertNull(response.calledUser());
        verify(queueRedisRepository, never()).setServingUser(anyString(), anyString());
    }
}
