package com.soongsil.soongpal.chat.domain.fcm;

import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;
import lombok.*;


@Builder
@AllArgsConstructor
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
public class DeviceToken extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private boolean notificationEnabled;

    public void enableNotification() {
        this.notificationEnabled = true;
    }

    public void disableNotification() {
        this.notificationEnabled = false;
    }

}
