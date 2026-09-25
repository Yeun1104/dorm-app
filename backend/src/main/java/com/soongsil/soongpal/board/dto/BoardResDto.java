package com.soongsil.soongpal.board.dto;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardCategory;
import com.soongsil.soongpal.board.domain.BoardStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class BoardResDto {
    private Long id;
    private String title;
    private String content;

    private Integer totalPrice;
    private Integer totalQuantity;
    private Integer minPurchaseQuantity;
    private Integer unitPrice;       // 자동 계산 (올림)
    private Integer remainingQuantity; // 자동 계산 (totalQuantity - 예약(ACCEPTED/COMPLETED) 합계)
    private Integer waitingCount;      // 방장 수락 대기중인 참여요청(PENDING) 건수 — 프론트 FOMO 문구용

    private String url;
    private String location;
    private BoardCategory category;
    private BoardStatus status;

    private Long authorId;
    private String authorNickname;
    private LocalDateTime createdAt;
    private List<BoardImageDto> images;

    private Integer likeCount;
    private boolean liked;

    public static BoardResDto from(Board board, Integer likeCount, boolean liked, Integer remainingQuantity, Integer waitingCount) {
        return BoardResDto.builder()
                .id(board.getId())
                .title(board.getTitle())
                .content(board.getContent())
                .totalPrice(board.getTotalPrice())
                .totalQuantity(board.getTotalQuantity())
                .minPurchaseQuantity(board.getMinPurchaseQuantity())
                .unitPrice(board.getUnitPrice())
                .remainingQuantity(remainingQuantity)
                .waitingCount(waitingCount)
                .url(board.getUrl())
                .location(board.getLocation())
                .category(board.getCategory())
                .status(board.getStatus())
                .likeCount(likeCount)
                .liked(liked)
                // User가 null인지 확인하는 방어 로직
                .authorId(board.getUser() != null ? board.getUser().getId() : null)
                .authorNickname(board.getUser() != null ? board.getUser().getNickName() : "알 수 없음")
                .createdAt(board.getCreatedAt())
                .images(board.getBoardImages().stream()
                        .map(BoardImageDto::new)
                        .collect(Collectors.toList()))
                .build();
    }
}
