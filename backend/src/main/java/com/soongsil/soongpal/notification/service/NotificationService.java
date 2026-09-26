package com.soongsil.soongpal.notification.service;

import com.soongsil.soongpal.chat.domain.fcm.DeviceToken;
import com.soongsil.soongpal.chat.service.FCMNotificationService;
import com.soongsil.soongpal.common.exception.NotificationErrorCode;
import com.soongsil.soongpal.common.exception.NotificationException;
import com.soongsil.soongpal.notification.domain.Notification;
import com.soongsil.soongpal.notification.domain.NotificationPreference;
import com.soongsil.soongpal.notification.domain.NotificationType;
import com.soongsil.soongpal.notification.dto.NotificationPreferenceResDto;
import com.soongsil.soongpal.notification.dto.NotificationPreferenceUpdateReqDto;
import com.soongsil.soongpal.notification.dto.NotificationResDto;
import com.soongsil.soongpal.notification.repository.NotificationPreferenceRepository;
import com.soongsil.soongpal.notification.repository.NotificationRepository;
import com.soongsil.soongpal.user.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * 알림 발송 + 알림함(목록/읽음/삭제) + 카테고리별 설정 관리를 한 곳에서 담당.
 * 채팅 메시지 자체는 알림함에 안 쌓이고(채팅목록이 곧 알림함 역할), isChatEnabled()만 ChatService에서 참고함.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final FCMNotificationService fcmNotificationService;

    /** 참여요청/거래상태/공지사항 등 채팅 외 알림을 만들고(알림함 저장) 필요하면 푸시까지 보냄. */
    @Transactional
    public void notify(User recipient, NotificationType type, String title, String body,
                        Long boardId, Long chatRoomId, Long reservationId) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .body(body)
                .relatedBoardId(boardId)
                .relatedChatRoomId(chatRoomId)
                .relatedReservationId(reservationId)
                .build();
        notificationRepository.save(notification);

        if (!isCategoryEnabled(recipient.getId(), type)) {
            return;
        }

        Map<String, String> data = new HashMap<>();
        if (boardId != null) data.put("boardId", boardId.toString());
        if (chatRoomId != null) data.put("chatRoomId", chatRoomId.toString());
        if (reservationId != null) data.put("reservationId", reservationId.toString());

        for (DeviceToken token : recipient.getDeviceTokens()) {
            if (token.isNotificationEnabled()) {
                fcmNotificationService.sendGenericNotification(token.getToken(), type.name().toLowerCase(), title, body, data);
            }
        }
    }

    /** ChatService가 메시지 전송 시 이 사람에게 채팅 알림을 보내도 되는지 참고하는 용도. */
    public boolean isChatEnabled(Long userId) {
        return preferenceRepository.findByUserId(userId)
                .map(NotificationPreference::isChatEnabled)
                .orElse(true); // 설정 만든 적 없으면 기본 허용
    }

    private boolean isCategoryEnabled(Long userId, NotificationType type) {
        NotificationPreference pref = preferenceRepository.findByUserId(userId).orElse(null);
        if (pref == null) {
            return true;
        }
        return switch (type) {
            case RESERVATION_REQUESTED, RESERVATION_ACCEPTED, RESERVATION_REJECTED -> pref.isReservationEnabled();
            case BOARD_SOLD_OUT, RESERVATION_COMPLETED -> pref.isBoardStatusEnabled();
            case DORM_NOTICE -> pref.isDormNoticeEnabled();
        };
    }

    @Transactional(readOnly = true)
    public Page<NotificationResDto> getNotifications(Long userId, int page) {
        Pageable pageable = PageRequest.of(page, 20, Sort.by("createdAt").descending());
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable)
                .map(NotificationResDto::from);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipientIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationException(NotificationErrorCode.NOTIFICATION_NOT_FOUND));
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new NotificationException(NotificationErrorCode.NOTIFICATION_ACCESS_DENIED);
        }
        notification.markAsRead();
    }

    @Transactional
    public void deleteNotification(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationException(NotificationErrorCode.NOTIFICATION_NOT_FOUND));
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new NotificationException(NotificationErrorCode.NOTIFICATION_ACCESS_DENIED);
        }
        notificationRepository.delete(notification);
    }

    @Transactional(readOnly = true)
    public NotificationPreferenceResDto getPreference(Long userId) {
        return preferenceRepository.findByUserId(userId)
                .map(p -> NotificationPreferenceResDto.builder()
                        .chatEnabled(p.isChatEnabled())
                        .reservationEnabled(p.isReservationEnabled())
                        .boardStatusEnabled(p.isBoardStatusEnabled())
                        .dormNoticeEnabled(p.isDormNoticeEnabled())
                        .build())
                .orElse(NotificationPreferenceResDto.builder()
                        .chatEnabled(true).reservationEnabled(true).boardStatusEnabled(true).dormNoticeEnabled(true)
                        .build());
    }

    @Transactional
    public NotificationPreferenceResDto updatePreference(User user, NotificationPreferenceUpdateReqDto dto) {
        NotificationPreference pref = preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> preferenceRepository.save(new NotificationPreference(user)));
        pref.update(dto.isChatEnabled(), dto.isReservationEnabled(), dto.isBoardStatusEnabled(), dto.isDormNoticeEnabled());

        return NotificationPreferenceResDto.builder()
                .chatEnabled(pref.isChatEnabled())
                .reservationEnabled(pref.isReservationEnabled())
                .boardStatusEnabled(pref.isBoardStatusEnabled())
                .dormNoticeEnabled(pref.isDormNoticeEnabled())
                .build();
    }
}
