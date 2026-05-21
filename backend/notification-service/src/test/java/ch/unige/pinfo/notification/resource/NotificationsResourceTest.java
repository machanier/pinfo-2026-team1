package ch.unige.pinfo.notification.resource;

import ch.unige.pinfo.notification.model.Notification;
import ch.unige.pinfo.notification.repository.NotificationRepository;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.jwt.Claim;
import io.quarkus.test.security.jwt.JwtSecurity;
import io.restassured.http.ContentType;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;

@QuarkusTest
class NotificationsResourceTest {

        @InjectMock
        NotificationRepository notificationRepository;

        @InjectMock
        JsonWebToken jwt;

        private UUID userId;
        private UUID otherUserId;
        private UUID notificationId;
        private Notification notification;
        private Notification otherUserNotification;

        @BeforeEach
        void setUp() {
                userId = UUID.randomUUID();
                otherUserId = UUID.randomUUID();
                notificationId = UUID.randomUUID();

                Mockito.when(jwt.getSubject()).thenReturn(userId.toString());

                notification = new Notification();
                notification.notificationId = notificationId;
                notification.userId = userId;
                notification.body = "Test Notification";
                notification.read = false;
                notification.createdAt = OffsetDateTime.now();
                notification.type = ch.unige.pinfo.notification.model.NotificationType.ANNOUNCEMENT;

                otherUserNotification = new Notification();
                otherUserNotification.notificationId = UUID.randomUUID();
                otherUserNotification.userId = otherUserId;
                otherUserNotification.body = "Other User's Notification";
                otherUserNotification.read = false;
                otherUserNotification.createdAt = OffsetDateTime.now();
                otherUserNotification.type = ch.unige.pinfo.notification.model.NotificationType.EVENT_CANCELLED;
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsGet() {
                Mockito.when(notificationRepository.findPage(any(UUID.class), any(), any(), anyInt(), anyInt()))
                                .thenReturn(List.of(notification));
                Mockito.when(notificationRepository.countByFilter(any(UUID.class), any(), any())).thenReturn(1L);
                Mockito.when(notificationRepository.countUnread(any(UUID.class))).thenReturn(1L);

                given()
                                .queryParam("page", 0)
                                .queryParam("size", 10)
                                .when().get("/api/notifications")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("totalElements", is(1))
                                .body("content[0].notificationId", is(notificationId.toString()));
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsGet_FilterByType() {
                Mockito.when(notificationRepository.findPage(any(UUID.class), any(),
                                any(ch.unige.pinfo.notification.model.NotificationType.class), anyInt(), anyInt()))
                                .thenReturn(List.of(notification));
                Mockito.when(notificationRepository.countByFilter(any(UUID.class), any(),
                                any(ch.unige.pinfo.notification.model.NotificationType.class))).thenReturn(1L);
                Mockito.when(notificationRepository.countUnread(any(UUID.class))).thenReturn(1L);

                given()
                                .queryParam("type", "ANNOUNCEMENT")
                                .when().get("/api/notifications")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("totalElements", is(1))
                                .body("content[0].type", is("ANNOUNCEMENT"));
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsGet_FilterByRead() {
                notification.read = true;
                Mockito.when(notificationRepository.findPage(any(UUID.class), Mockito.eq(true), any(), anyInt(),
                                anyInt()))
                                .thenReturn(List.of(notification));
                Mockito.when(notificationRepository.countByFilter(any(UUID.class), Mockito.eq(true), any()))
                                .thenReturn(1L);
                Mockito.when(notificationRepository.countUnread(any(UUID.class))).thenReturn(0L);

                given()
                                .queryParam("read", true)
                                .when().get("/api/notifications")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("totalElements", is(1))
                                .body("content[0].read", is(true));
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsUnreadCountGet() {
                Mockito.when(notificationRepository.countUnread(any(UUID.class))).thenReturn(5L);

                given()
                                .when().get("/api/notifications/unread-count")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("count", is(5));
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsNotificationIdReadPatch() {
                Mockito.when(notificationRepository.findById(notificationId)).thenReturn(notification);

                given()
                                .pathParam("notificationId", notificationId)
                                .when().patch("/api/notifications/{notificationId}/read")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("read", is(true));

                Mockito.verify(notificationRepository).persist(notification);
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsNotificationIdReadPatch_NotFound() {
                Mockito.when(notificationRepository.findById(notificationId)).thenReturn(null);

                given()
                                .pathParam("notificationId", notificationId)
                                .when().patch("/api/notifications/{notificationId}/read")
                                .then()
                                .statusCode(404);
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsNotificationIdReadPatch_Forbidden() {
                Mockito.when(notificationRepository.findById(otherUserNotification.notificationId))
                                .thenReturn(otherUserNotification);

                given()
                                .pathParam("notificationId", otherUserNotification.notificationId)
                                .when().patch("/api/notifications/{notificationId}/read")
                                .then()
                                .statusCode(403);
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsReadAllPatch() {
                Mockito.when(notificationRepository.update(anyString(), any(java.util.Map.class))).thenReturn(1);

                given()
                                .when().patch("/api/notifications/read-all")
                                .then()
                                .statusCode(204);

                Mockito.verify(notificationRepository).update(anyString(), any(java.util.Map.class));
        }

        @Test
        @TestSecurity(user = "testUser", roles = { "STUDENT" })
        @JwtSecurity(claims = { @Claim(key = "sub", value = "testUser") })
        void testApiNotificationsGet_NoContent() {
                Mockito.when(notificationRepository.findPage(any(UUID.class), any(), any(), anyInt(), anyInt()))
                                .thenReturn(Collections.emptyList());
                Mockito.when(notificationRepository.countByFilter(any(UUID.class), any(), any())).thenReturn(0L);
                Mockito.when(notificationRepository.countUnread(any(UUID.class))).thenReturn(0L);

                given()
                                .when().get("/api/notifications")
                                .then()
                                .statusCode(200)
                                .contentType(ContentType.JSON)
                                .body("totalElements", is(0))
                                .body("content.size()", is(0));
        }

        @Test
        void testApiNotificationsGet_Unauthorized() {
                given()
                                .when().get("/api/notifications")
                                .then()
                                .statusCode(401);
        }
}