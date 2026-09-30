package com.soongsil.soongpal.chat.controller.rest;

import com.soongsil.soongpal.chat.service.DeviceTokenService;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/fcm")
public class DeviceTokenController {

    private final DeviceTokenService deviceTokenService;

    @Operation(summary = "FCM 토큰 등록", description = "휴대폰 푸시 알림을 받으려면 앱이 알림 권한을 받은 뒤 이 API로 기기 토큰을 등록해야 함. 알림이 켜진 상태로 등록됨.")
    @PostMapping
    public ResponseEntity<String> registerFcmToken(@RequestParam String fcmToken) {
        Long userId = getUserId();
        deviceTokenService.registerFcmToken(userId, fcmToken);
        return ResponseEntity.ok("FCM 토큰이 등록되었습니다.");
    }

    @Operation(summary = "FCM 토큰 삭제", description = "사용자의 FCM 토큰을 삭제합니다.")
    @DeleteMapping
    public ResponseEntity<String> deleteFcmToken(@RequestParam String fcmToken) {
        Long userId = getUserId();
        deviceTokenService.deleteFcmToken(userId, fcmToken);
        return ResponseEntity.ok("FCM 토큰이 삭제되었습니다.");
    }

    @Operation(summary = "알림 켜기", description = "특정 디바이스의 알림을 활성화합니다.")
    @PatchMapping("/enable")
    public ResponseEntity<String> enableNotification(@RequestParam String fcmToken) {
        Long userId = getUserId();
        deviceTokenService.enableNotification(userId, fcmToken);
        return ResponseEntity.ok("알림이 켜졌습니다.");
    }

    @Operation(summary = "알림 끄기", description = "특정 디바이스의 알림을 비활성화합니다.")
    @PatchMapping("/disable")
    public ResponseEntity<String> disableNotification(@RequestParam String fcmToken) {
        Long userId = getUserId();
        deviceTokenService.disableNotification(userId, fcmToken);
        return ResponseEntity.ok("알림이 꺼졌습니다.");
    }

    @Operation(summary = "알림 여부", description = "특정 디바이스의 알림을 활성화여부를 조회합니다..")
    @GetMapping
    public ResponseEntity<String> getNotification(@RequestParam String fcmToken) {
        Long userId = getUserId();
        boolean notification = deviceTokenService.getNotification(userId, fcmToken);
        return ResponseEntity.ok(String.valueOf(notification));
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }

}
