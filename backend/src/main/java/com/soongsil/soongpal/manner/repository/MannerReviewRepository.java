package com.soongsil.soongpal.manner.repository;

import com.soongsil.soongpal.manner.domain.MannerReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MannerReviewRepository extends JpaRepository<MannerReview, Long> {

    boolean existsByReservationIdAndReviewerId(Long reservationId, Long reviewerId);

    List<MannerReview> findByRevieweeId(Long revieweeId);
}
