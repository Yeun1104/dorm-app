package com.soongsil.soongpal.chat.repository;

import com.soongsil.soongpal.chat.domain.fcm.DeviceToken;
import com.soongsil.soongpal.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {
    Optional<DeviceToken> findByUserAndToken(User user, String token);

    /** token 컬럼이 unique라서, 같은 토큰이 다른 사람 소유로 이미 저장돼있을 수 있는지(기기 재로그인 등) 확인할 때 씀. */
    Optional<DeviceToken> findByToken(String token);
}
