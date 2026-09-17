package com.soongsil.soongpal.user.domain;

import com.soongsil.soongpal.chat.domain.fcm.DeviceToken;
import com.soongsil.soongpal.common.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;


@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Where(clause = "deleted_at IS NULL")
public class User extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String kakaoId;

    @Column(unique = true, nullable = false)
    private String nickName;

    private String email;

    private String refreshToken;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DeviceToken> deviceTokens = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(name = "deleted_at") // <--- 2. deletedAt 필드 추가
    private LocalDateTime deletedAt;

    @Builder
    public User(String kakaoId, String nickName, String email) {
        this.kakaoId = kakaoId;
        this.nickName = nickName;
        this.email = email;
        this.role = Role.USER;
    }

    public void updateNickname(String nickName) {
        this.nickName = nickName;
    }

    public void updateRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public void addDeviceToken(DeviceToken deviceToken) {
        this.deviceTokens.add(deviceToken);
    }

    public void removeDeviceToken(DeviceToken deviceToken) {
        this.deviceTokens.remove(deviceToken);
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
        this.nickName = this.nickName + this.id + "(탈퇴)";
    }

}
