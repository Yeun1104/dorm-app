package com.soongsil.soongpal.chat.service;

import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;


@Slf4j
@Service
@RequiredArgsConstructor
public class FCMNotificationService {

    // Firebase 기능이 꺼져있으면(app.feature.firebase.enabled=false) FirebaseMessaging 빈이 아예 없음.
    // Optional로 받아서 없으면 조용히 스킵.
    private final Optional<FirebaseMessaging> firebaseMessagingProvider;

    public void sendChatNotification(String fcmToken, String senderName, String message, Long roomId) {
        String title = senderName + "님의 메시지";
        sendPush(fcmToken, "chat", title, message, Map.of("roomId", roomId.toString(), "senderName", senderName));
    }

    /** 채팅 외의 알림(참여요청/거래상태/공지사항 등)을 보낼 때 쓰는 범용 푸시. */
    public void sendGenericNotification(String fcmToken, String type, String title, String body, Map<String, String> extraData) {
        sendPush(fcmToken, type, title, body, extraData);
    }

    private void sendPush(String fcmToken, String type, String title, String body, Map<String, String> extraData) {
        if (firebaseMessagingProvider.isEmpty()) {
            log.debug("Firebase 비활성화 상태 - 푸시 알림 생략 (type={})", type);
            return;
        }

        try {
            Message.Builder builder = Message.builder()
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("type", type)
                    .putData("title", title)
                    .putData("body", body)
                    .setWebpushConfig(WebpushConfig.builder()
                            .setNotification(WebpushNotification.builder()
                                    .setTitle(title)
                                    .setBody(body)
                                    .setIcon("/icon.png")
                                    .build())
                            .putHeader("Urgency", "high")
                            .build())
                    .setApnsConfig(ApnsConfig.builder()
                            .setAps(Aps.builder()
                                    .setSound("default")
                                    .build())
                            .build())
                    .setToken(fcmToken);

            if (extraData != null) {
                extraData.forEach(builder::putData);
            }

            String response = firebaseMessagingProvider.get().send(builder.build());
            log.info("FCM 알림 전송 성공 (type={}): {}", type, response);
        } catch (Exception e) {
            log.error("FCM 알림 전송 실패 (type={}): {}", type, e.getMessage(), e);
        }
    }
}
