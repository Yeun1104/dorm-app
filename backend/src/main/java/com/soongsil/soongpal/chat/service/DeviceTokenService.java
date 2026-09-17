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
