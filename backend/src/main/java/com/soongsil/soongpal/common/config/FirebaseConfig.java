package com.soongsil.soongpal.common.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;

/**
 * FCM 푸시 설정.
 * app.feature.firebase.enabled=true 일 때만 활성화됨 (로컬 기본값은 false).
 * 꺼져 있으면 이 설정 클래스 자체가 로드되지 않고, FirebaseMessaging 빈도 생성되지 않는다.
 * → FCMNotificationService 쪽에서 Optional<FirebaseMessaging>로 받아 null-safe하게 처리함.
 */
@Slf4j
@Configuration
@ConditionalOnProperty(prefix = "app.feature.firebase", name = "enabled", havingValue = "true")
public class FirebaseConfig {

    @Value("${firebase.config.path}")
    private String firebaseConfigPath;

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                GoogleCredentials credentials = GoogleCredentials
                        .fromStream(new ClassPathResource(firebaseConfigPath).getInputStream());

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .build();

                FirebaseApp.initializeApp(options);
                log.info("Firebase 초기화 완료");
            }
        } catch (IOException e) {
            throw new RuntimeException("Firebase 초기화 실패 (firebase.config.path=" + firebaseConfigPath + ")", e);
        }
    }

    @Bean
    public FirebaseMessaging firebaseMessaging() {
        return FirebaseMessaging.getInstance();
    }
}
