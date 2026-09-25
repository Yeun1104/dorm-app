package com.soongsil.soongpal.reservation.dto;

import com.soongsil.soongpal.reservation.domain.Reservation;
import com.soongsil.soongpal.reservation.domain.ReservationStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReservationResDto {
    private Long id;
    private Long boardId;
    private Long buyerId;
    private String buyerNickname;
    private Long chatRoomId; // ACCEPTED 되기 전(PENDING)에는 null
    private Integer quantity;
    private Integer subtotal; // quantity * 개당가격
    private ReservationStatus status;
    private LocalDateTime createdAt;

    // 방장이 참여요청 목록에서 신청자를 판단할 때 참고하는 프로필 정보.
    // 방장용 목록 조회(getReservationsByBoard)에서만 채워지고, 그 외(내 신청 목록 등)에서는 null.
    private Integer buyerTradeCount;
    private Integer buyerNoShowReportCount;

    public static ReservationResDto from(Reservation reservation) {
        return ReservationResDto.builder()
                .id(reservation.getId())
                .boardId(reservation.getBoard().getId())
                .buyerId(reservation.getBuyer().getId())
                .buyerNickname(reservation.getBuyer().getNickName())
                .chatRoomId(reservation.getChatRoomId())
                .quantity(reservation.getQuantity())
                .subtotal(reservation.getQuantity() * reservation.getBoard().getUnitPrice())
                .status(reservation.getStatus())
                .createdAt(reservation.getCreatedAt())
                .build();
    }

    public static ReservationResDto withBuyerProfile(Reservation reservation, int buyerTradeCount, int buyerNoShowReportCount) {
        return ReservationResDto.builder()
                .id(reservation.getId())
                .boardId(reservation.getBoard().getId())
                .buyerId(reservation.getBuyer().getId())
                .buyerNickname(reservation.getBuyer().getNickName())
                .chatRoomId(reservation.getChatRoomId())
                .quantity(reservation.getQuantity())
                .subtotal(reservation.getQuantity() * reservation.getBoard().getUnitPrice())
                .status(reservation.getStatus())
                .createdAt(reservation.getCreatedAt())
                .buyerTradeCount(buyerTradeCount)
                .buyerNoShowReportCount(buyerNoShowReportCount)
                .build();
    }
}
