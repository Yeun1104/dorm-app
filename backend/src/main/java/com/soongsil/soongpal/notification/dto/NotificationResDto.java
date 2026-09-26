package com.soongsil.soongpal.notification.dto;

import com.soongsil.soongpal.notification.domain.Notification;
import com.soongsil.soongpal.notification.domain.NotificationType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationResDto {
    private Long id;
    private NotificationType type;
    private String title;
    private String body;
    private Long relatedBoardId;
    private Long relatedChatRoomId;
    private Long relatedReservationId;
    private boolean read;
    private LocalDateTime createdAt;

    public static NotificationResDto from(Notification notification) {
        return NotificationResDto.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .body(notification.getBody())
                .relatedBoardId(notification.getRelatedBoardId())
                .relatedChatRoomId(notification.getRelatedChatRoomId())
                .relatedReservationId(notification.getRelatedReservationId())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
