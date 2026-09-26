package com.soongsil.soongpal.chat.domain;

import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;


@Builder
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Where(clause = "deleted_at IS NULL")
@Table(name = "chat_room_users")
public class ChatRoomUser extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id")
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ChatRole role = ChatRole.MEMBER;

    @Column(name = "last_read_message_id")
    private Long lastReadMessageId;

    /** 이 채팅방만 콕 집어서 무음(알림 안 옴)으로 설정했는지. 기본은 false(알림 받음). */
    @Column(name = "notification_muted", nullable = false)
    @Builder.Default
    private boolean notificationMuted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public void updateLastReadMessage(Long messageId) {
        this.lastReadMessageId = messageId;
    }

    public void setNotificationMuted(boolean muted) {
        this.notificationMuted = muted;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

}
