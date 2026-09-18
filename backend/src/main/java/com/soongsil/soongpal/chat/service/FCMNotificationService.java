package com.soongsil.soongpal.chat.service;

import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;


@Slf4j
@Service
@RequiredArgsConstructor
public class FCMNotificationService {

    // Firebase 기능이 꺼져있으면(app.feature.firebase.enabled=false) FirebaseMessaging 빈이 아예 없음.
    // Optional로 받아서 없으면 조용히 스킵.
    private final Optional<FirebaseMessaging> firebaseMessagingProvider;

    public void sendChatNotification(String fcmToken, String senderName, String message, Long roomId) {
        if (firebaseMessagingProvider.isEmpty()) {
            log.debug("Firebase 비활성화 상태 - 푸시 알림 생략 (roomId={})", roomId);
            return;
        }

        try {
            String title = senderName + "님의 메시지";

            Message fcmMessage = Message.builder()
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(message)
                            .build())
                    .putData("type", "chat")
                    .putData("roomId", roomId.toString())
                    .putData("senderName", senderName)
                    .putData("title", title)
                    .putData("body", message)
                    .setWebpushConfig(WebpushConfig.builder()
                            .setNotification(WebpushNotification.builder()
                                    .setTitle(title)
                                    .setBody(message)
                                    .setIcon("/icon.png")
                                    .build())
                            .putHeader("Urgency", "high")
                            .build())
                    .setApnsConfig(ApnsConfig.builder()
                            .setAps(Aps.builder()
                                    .setSound("default")
                                    .build())
                            .build())
                    .setToken(fcmToken)
                    .build();

            String response = firebaseMessagingProvider.get().send(fcmMessage);
            log.info("채팅 FCM 알림 전송 성공: {}", response);
        } catch (Exception e) {
            log.error("채팅 FCM 알림 전송 실패: {}", e.getMessage(), e);
        }
    }
}
