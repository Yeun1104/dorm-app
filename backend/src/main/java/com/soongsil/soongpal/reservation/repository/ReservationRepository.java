package com.soongsil.soongpal.reservation.repository;

import com.soongsil.soongpal.reservation.domain.Reservation;
import com.soongsil.soongpal.reservation.domain.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByBoardId(Long boardId);

    Optional<Reservation> findByBoardIdAndBuyerIdAndStatusIn(Long boardId, Long buyerId, List<ReservationStatus> statuses);

    List<Reservation> findByBuyerId(Long buyerId);

    List<Reservation> findByBoardIdAndStatus(Long boardId, ReservationStatus status);

    long countByBoardIdAndStatus(Long boardId, ReservationStatus status);

    /** 수량 게이지 차감분(ACCEPTED + COMPLETED)의 합. 없으면 null이 나올 수 있어서 서비스에서 0 처리함. */
    @Query("select coalesce(sum(r.quantity), 0) from Reservation r " +
            "where r.board.id = :boardId and r.status in ('ACCEPTED', 'COMPLETED')")
    int sumHeldQuantityByBoardId(@Param("boardId") Long boardId);

    /** 이 사용자가 구매자로서 COMPLETED한 거래 수 (프로필 "거래횟수"용). */
    long countByBuyerIdAndStatus(Long buyerId, ReservationStatus status);

    /** 이 사용자가 게시글 작성자(판매자/총대)로서 COMPLETED한 거래 건수 (프로필 "거래횟수"용). */
    long countByBoard_UserIdAndStatus(Long userId, ReservationStatus status);
}
