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

    // ===== 학교 계정(usaint) 인증 여부 — 인증돼야만 글쓰기/구매 가능 =====
    // ⚠️ usaint 연동 자체는 아직 안 만들어서, 지금은 관리자가 수동으로 true로 바꿔주는 것 말고는 참이 될 방법이 없음.
    @Column(name = "school_verified", nullable = false)
    private boolean schoolVerified = false;

    // ===== 신고/정지 관련 (User 생성 시점엔 관여 안 하는 필드라 @Builder 생성자에는 안 넣고 필드 초기값만 씀) =====

    /** null이면 정지 아님. 미래 시각이면 그때까지 정지. */
    @Column(name = "suspended_until")
    private LocalDateTime suspendedUntil;

    @Column(name = "permanently_banned", nullable = false)
    private boolean permanentlyBanned = false;

    /** 24시간 내 서로 다른 3명에게 신고당해서 관리자 확인 전까지 자동으로 걸린 임시 블라인드 상태. */
    @Column(name = "blinded_pending_review", nullable = false)
    private boolean blindedPendingReview = false;

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

    public void suspendUntil(LocalDateTime until) {
        this.suspendedUntil = until;
        this.blindedPendingReview = false;
    }

    public void banPermanently() {
        this.permanentlyBanned = true;
        this.blindedPendingReview = false;
    }

    /** 관리자가 정지를 완전히 해제할 때 (정지기간 + 블라인드 둘 다 풀어줌). */
    public void clearSuspension() {
        this.suspendedUntil = null;
        this.blindedPendingReview = false;
    }

    /** 신고 처리 결과가 경고/기각이라 실제 정지는 아니지만, 자동 블라인드만 풀어주고 싶을 때. */
    public void clearBlindFlag() {
        this.blindedPendingReview = false;
    }

    public void blindPendingReview() {
        this.blindedPendingReview = true;
    }

    public boolean isCurrentlyRestricted() {
        if (permanentlyBanned || blindedPendingReview) {
            return true;
        }
        return suspendedUntil != null && suspendedUntil.isAfter(LocalDateTime.now());
    }

    public void markSchoolVerified() {
        this.schoolVerified = true;
    }
}
