package com.soongsil.soongpal.notification.domain;

import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자별 알림 카테고리 on/off 설정. (전체 푸시 on/off는 디바이스 단위 DeviceToken.notificationEnabled로 이미 있음 —
 * 그건 "이 폰에서 푸시를 받을지" 스위치고, 이건 "이 사람이 어떤 종류의 알림을 원하는지" 세부 설정임)
 * 아직 설정을 만든 적 없는 사용자는 이 엔티티 자체가 없고, 그 경우 서비스단에서 전부 true(기본 허용)로 취급함.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "notification_preference")
public class NotificationPreference extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private boolean chatEnabled = true;

    @Column(nullable = false)
    private boolean reservationEnabled = true; // 참여요청 옴/수락/거절

    @Column(nullable = false)
    private boolean boardStatusEnabled = true; // 모집완료/거래완료

    @Column(nullable = false)
    private boolean dormNoticeEnabled = true;

    public NotificationPreference(User user) {
        this.user = user;
    }

    public void update(boolean chatEnabled, boolean reservationEnabled, boolean boardStatusEnabled, boolean dormNoticeEnabled) {
        this.chatEnabled = chatEnabled;
        this.reservationEnabled = reservationEnabled;
        this.boardStatusEnabled = boardStatusEnabled;
        this.dormNoticeEnabled = dormNoticeEnabled;
    }
}
