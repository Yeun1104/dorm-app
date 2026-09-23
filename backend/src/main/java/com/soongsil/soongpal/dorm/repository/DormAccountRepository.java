package com.soongsil.soongpal.dorm.repository;

import com.soongsil.soongpal.dorm.domain.DormAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DormAccountRepository extends JpaRepository<DormAccount, Long> {
    Optional<DormAccount> findByUserId(Long userId);
}
