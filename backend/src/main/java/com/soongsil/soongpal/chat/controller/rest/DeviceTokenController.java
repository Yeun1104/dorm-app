package com.soongsil.soongpal.chat.controller.rest;

import com.soongsil.soongpal.chat.service.DeviceTokenService;
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

    @Operation(summary = "FCM 토큰 삭제", description = "사용자의 FCM 토큰을 삭제합니다.")
    @DeleteMapping
    public ResponseEntity<String> deleteFcmToken(@RequestParam String fcmToken) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = Long.parseLong(authentication.getName());

        deviceTokenService.deleteFcmToken(userId, fcmToken);

        return ResponseEntity.ok("FCM 토큰이 삭제되었습니다.");
    }

    @Operation(summary = "알림 켜기", description = "특정 디바이스의 알림을 활성화합니다.")
    @PatchMapping("/enable")
    public ResponseEntity<String> enableNotification(@RequestParam String fcmToken) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = Long.parseLong(authentication.getName());

        deviceTokenService.enableNotification(userId, fcmToken);

        return ResponseEntity.ok("알림이 켜졌습니다.");
    }

    @Operation(summary = "알림 끄기", description = "특정 디바이스의 알림을 비활성화합니다.")
    @PatchMapping("/disable")
    public ResponseEntity<String> disableNotification(@RequestParam String fcmToken) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = Long.parseLong(authentication.getName());

        deviceTokenService.disableNotification(userId, fcmToken);

        return ResponseEntity.ok("알림이 꺼졌습니다.");
    }

    @Operation(summary = "알림 여부", description = "특정 디바이스의 알림을 활성화여부를 조회합니다..")
    @GetMapping
    public ResponseEntity<String> getNotification(@RequestParam String fcmToken) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long userId = Long.parseLong(authentication.getName());

        boolean notification = deviceTokenService.getNotification(userId, fcmToken);
        return ResponseEntity.ok(String.valueOf(notification));
    }

}
