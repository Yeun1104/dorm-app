package com.soongsil.soongpal.reservation.domain;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 공동구매 게시글에 대한 구매자의 수량 예약 건.
 * 채팅방 하나당 예약 하나 (구매자가 "구매하기" 누르면 1:1 채팅방 + 예약이 같이 생김).
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
public class Reservation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @Column(name = "chat_room_id")
    private Long chatRoomId;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReservationStatus status;

    @Builder
    public Reservation(Board board, User buyer, Long chatRoomId, Integer quantity) {
        this.board = board;
        this.buyer = buyer;
        this.chatRoomId = chatRoomId;
        this.quantity = quantity;
        this.status = ReservationStatus.PENDING;
    }

    public void markInProgress() {
        this.status = ReservationStatus.IN_PROGRESS;
    }

    public void markCompleted() {
        this.status = ReservationStatus.COMPLETED;
    }

    public void cancel() {
        this.status = ReservationStatus.CANCELLED;
    }

    /** 수량 게이지에 실제로 잡혀있는 상태인지 (IN_PROGRESS 또는 COMPLETED). */
    public boolean isHoldingQuantity() {
        return status == ReservationStatus.IN_PROGRESS || status == ReservationStatus.COMPLETED;
    }
}
