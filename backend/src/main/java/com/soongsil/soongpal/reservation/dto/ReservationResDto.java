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
    private Long chatRoomId;
    private Integer quantity;
    private Integer subtotal; // quantity * 개당가격
    private ReservationStatus status;
    private LocalDateTime createdAt;

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
}
