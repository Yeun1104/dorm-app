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
 * 공동구매 게시글에 대한 구매자의 참여 요청/예약 건.
 * 채팅방은 요청 시점이 아니라 "방장이 수락한 시점"에 생김 (방장 피로도/노쇼 리스크 방지).
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

    // 요청 시점엔 null. 방장이 수락하는 순간 채팅방이 생기면서 채워짐.
    @Column(name = "chat_room_id")
    private Long chatRoomId;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReservationStatus status;

    @Builder
    public Reservation(Board board, User buyer, Integer quantity) {
        this.board = board;
        this.buyer = buyer;
        this.quantity = quantity;
        this.status = ReservationStatus.PENDING;
    }

    /** 방장이 수락. 이때 채팅방이 같이 생기므로 chatRoomId를 같이 채워줌. */
    public void accept(Long chatRoomId) {
        this.chatRoomId = chatRoomId;
        this.status = ReservationStatus.ACCEPTED;
    }

    public void reject() {
        this.status = ReservationStatus.REJECTED;
    }

    public void markCompleted() {
        this.status = ReservationStatus.COMPLETED;
    }

    public void cancel() {
        this.status = ReservationStatus.CANCELLED;
    }

    /** 수량 게이지에 실제로 잡혀있는 상태인지 (ACCEPTED 또는 COMPLETED). */
    public boolean isHoldingQuantity() {
        return status == ReservationStatus.ACCEPTED || status == ReservationStatus.COMPLETED;
    }
}
