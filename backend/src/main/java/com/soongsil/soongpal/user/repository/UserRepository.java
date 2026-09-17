package com.soongsil.soongpal.user.repository;

import com.soongsil.soongpal.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByKakaoId(String kakaoId);
    Optional<User> findByNickName(String nickname);
}
