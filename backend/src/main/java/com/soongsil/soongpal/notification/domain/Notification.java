package com.soongsil.soongpal.notification.domain;

import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 인앱 알림함(알림 목록 화면)에 쌓이는 알림 1건. 채팅 메시지 자체는 채팅목록이 곧 알림함 역할이라 여기엔 안 쌓음. */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
public class Notification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String body;

    private Long relatedBoardId;
    private Long relatedChatRoomId;
    private Long relatedReservationId;

    @Column(nullable = false)
    private boolean read = false;

    @Builder
    public Notification(User recipient, NotificationType type, String title, String body,
                         Long relatedBoardId, Long relatedChatRoomId, Long relatedReservationId) {
        this.recipient = recipient;
        this.type = type;
        this.title = title;
        this.body = body;
        this.relatedBoardId = relatedBoardId;
        this.relatedChatRoomId = relatedChatRoomId;
        this.relatedReservationId = relatedReservationId;
    }

    public void markAsRead() {
        this.read = true;
    }
}
