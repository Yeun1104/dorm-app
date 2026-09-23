package com.soongsil.soongpal.dorm.domain;

import com.soongsil.soongpal.common.crypto.AesCryptoConverter;
import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자가 등록한 "본인의" 숭실대 기숙사(ssudorm) 로그인 계정.
 * dormUsername/dormPassword는 AesCryptoConverter로 암호화되어 DB에 저장됨 (평문 저장 금지).
 *
 * Phase 0(개인 검증) 기준: User와 1:1, 본인 계정만 등록해서 쓰는 것을 전제로 함.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "dorm_account")
public class DormAccount extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Convert(converter = AesCryptoConverter.class)
    @Column(name = "dorm_username", nullable = false, length = 512)
    private String dormUsername;

    @Convert(converter = AesCryptoConverter.class)
    @Column(name = "dorm_password", nullable = false, length = 512)
    private String dormPassword;

    public DormAccount(User user, String dormUsername, String dormPassword) {
        this.user = user;
        this.dormUsername = dormUsername;
        this.dormPassword = dormPassword;
    }

    public void updateCredentials(String dormUsername, String dormPassword) {
        this.dormUsername = dormUsername;
        this.dormPassword = dormPassword;
    }
}
