package com.soongsil.soongpal.user.dto;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardStatus;

import java.time.LocalDateTime;

public record BoardSummaryDto(
        Long id,
        String title,
        Integer totalPrice,
        Integer totalQuantity,
        Integer unitPrice,
        BoardStatus status,
        LocalDateTime createdAt
) {
    public static BoardSummaryDto from(Board board) {
        return new BoardSummaryDto(
                board.getId(),
                board.getTitle(),
                board.getTotalPrice(),
                board.getTotalQuantity(),
                board.getUnitPrice(),
                board.getStatus(),
                board.getCreatedAt()
        );
    }
}
