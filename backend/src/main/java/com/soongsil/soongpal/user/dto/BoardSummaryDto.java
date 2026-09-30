package com.soongsil.soongpal.user.dto;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardStatus;

import java.time.LocalDateTime;

public record BoardSummaryDto(
        Long id,
        String title,
        String thumbnailUrl, // 대표 이미지(첫 번째 사진). 없으면 null
        String location,
        Integer totalPrice,
        Integer totalQuantity,
        Integer unitPrice,
        BoardStatus status,
        LocalDateTime createdAt
) {
    public static BoardSummaryDto from(Board board) {
        String thumbnailUrl = board.getBoardImages().isEmpty() ? null : board.getBoardImages().get(0).getImageUrl();

        return new BoardSummaryDto(
                board.getId(),
                board.getTitle(),
                thumbnailUrl,
                board.getLocation(),
                board.getTotalPrice(),
                board.getTotalQuantity(),
                board.getUnitPrice(),
                board.getStatus(),
                board.getCreatedAt()
        );
    }
}
