package com.soongsil.soongpal.chat.service;

import com.soongsil.soongpal.chat.domain.fcm.DeviceToken;
import com.soongsil.soongpal.chat.repository.DeviceTokenRepository;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@RequiredArgsConstructor
@Transactional
@Service
public class DeviceTokenService {

    private final UserRepository userRepository;
    private final DeviceTokenRepository deviceTokenRepository;

    /**
     * 기기 FCM 토큰 등록(알림 허용 시점에 호출). 알림이 켜진 상태로 등록됨.
     * token 컬럼이 DB에서 unique라서, 다른 사람이 쓰던 토큰이 그대로 다시 들어올 수 있는 경우
     * (기기에서 로그아웃 후 다른 계정으로 로그인 등)를 처리함 — 예전 소유자에게서 떼어내고 나에게 새로 등록.
     */
    public void registerFcmToken(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        Optional<DeviceToken> existing = deviceTokenRepository.findByToken(fcmToken);
        if (existing.isPresent()) {
            DeviceToken token = existing.get();
            if (token.getUser().getId().equals(userId)) {
                token.enableNotification();
                return;
            }
            deviceTokenRepository.delete(token);
            deviceTokenRepository.flush();
        }

        DeviceToken deviceToken = DeviceToken.builder()
                .token(fcmToken)
                .user(user)
                .notificationEnabled(true)
                .build();
        deviceTokenRepository.save(deviceToken);
        user.addDeviceToken(deviceToken);
    }

    public void deleteFcmToken(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        DeviceToken findDeviceToken = deviceTokenRepository.findByUserAndToken(user, fcmToken)
                        .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        user.removeDeviceToken(findDeviceToken);
    }

    public void enableNotification(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        Optional<DeviceToken> existingToken = deviceTokenRepository.findByUserAndToken(user, fcmToken);
        if (existingToken.isPresent()) {
            existingToken.get().enableNotification();
            return;
        }

        DeviceToken deviceToken = DeviceToken.builder()
                .token(fcmToken)
                .user(user)
                .notificationEnabled(true)
                .build();
        deviceTokenRepository.save(deviceToken);
        user.addDeviceToken(deviceToken);
    }

    public void disableNotification(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        DeviceToken deviceToken = deviceTokenRepository.findByUserAndToken(user, fcmToken)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        deviceToken.disableNotification();
    }

    public boolean getNotification(Long userId, String fcmToken) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        DeviceToken deviceToken = deviceTokenRepository.findByUserAndToken(user, fcmToken)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        return deviceToken.isNotificationEnabled();
    }

}
