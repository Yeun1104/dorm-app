package com.soongsil.soongpal.notification.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.notification.dto.NotificationPreferenceResDto;
import com.soongsil.soongpal.notification.dto.NotificationPreferenceUpdateReqDto;
import com.soongsil.soongpal.notification.dto.NotificationResDto;
import com.soongsil.soongpal.notification.service.NotificationService;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Notification Controller", description = "알림함(목록/읽음/삭제) + 알림 카테고리별 on/off 설정")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @Operation(summary = "알림 목록 조회")
    @GetMapping("/api/notifications")
    public ResponseEntity<CommonResDto<Page<NotificationResDto>>> getNotifications(@RequestParam(defaultValue = "0") int page) {
        Long userId = getUserId();
        return new ResponseEntity<>(new CommonResDto<>("알림 목록 조회 성공", notificationService.getNotifications(userId, page)), HttpStatus.OK);
    }

    @Operation(summary = "안읽은 알림 개수 조회")
    @GetMapping("/api/notifications/unread-count")
    public ResponseEntity<CommonResDto<Map<String, Long>>> getUnreadCount() {
        Long userId = getUserId();
        return new ResponseEntity<>(new CommonResDto<>("안읽은 알림 개수 조회 성공", Map.of("unreadCount", notificationService.getUnreadCount(userId))), HttpStatus.OK);
    }

    @Operation(summary = "알림 읽음 처리")
    @PatchMapping("/api/notifications/{notificationId}/read")
    public ResponseEntity<CommonResDto<Void>> markAsRead(@PathVariable Long notificationId) {
        Long userId = getUserId();
        notificationService.markAsRead(userId, notificationId);
        return new ResponseEntity<>(new CommonResDto<>("알림을 읽음 처리했습니다.", null), HttpStatus.OK);
    }

    @Operation(summary = "알림 삭제")
    @DeleteMapping("/api/notifications/{notificationId}")
    public ResponseEntity<CommonResDto<Void>> deleteNotification(@PathVariable Long notificationId) {
        Long userId = getUserId();
        notificationService.deleteNotification(userId, notificationId);
        return new ResponseEntity<>(new CommonResDto<>("알림을 삭제했습니다.", null), HttpStatus.OK);
    }

    @Operation(summary = "알림 카테고리별 설정 조회", description = "설정을 만든 적 없으면 전부 true(기본 허용)로 내려옴.")
    @GetMapping("/api/notifications/preference")
    public ResponseEntity<CommonResDto<NotificationPreferenceResDto>> getPreference() {
        Long userId = getUserId();
        return new ResponseEntity<>(new CommonResDto<>("알림 설정 조회 성공", notificationService.getPreference(userId)), HttpStatus.OK);
    }

    @Operation(summary = "알림 카테고리별 설정 변경", description = "chatEnabled(채팅)/reservationEnabled(참여요청)/boardStatusEnabled(모집·거래완료)/dormNoticeEnabled(기숙사공지) 4개를 한 번에 다 보내야 함.")
    @PutMapping("/api/notifications/preference")
    public ResponseEntity<CommonResDto<NotificationPreferenceResDto>> updatePreference(@Valid @RequestBody NotificationPreferenceUpdateReqDto dto) {
        Long userId = getUserId();
        User user = userRepository.findById(userId).orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        return new ResponseEntity<>(new CommonResDto<>("알림 설정이 변경되었습니다.", notificationService.updatePreference(user, dto)), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }
}
