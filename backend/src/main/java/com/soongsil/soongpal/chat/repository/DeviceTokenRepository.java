package com.soongsil.soongpal.chat.repository;

import com.soongsil.soongpal.chat.domain.fcm.DeviceToken;
import com.soongsil.soongpal.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {
    Optional<DeviceToken> findByUserAndToken(User user, String token);
}
