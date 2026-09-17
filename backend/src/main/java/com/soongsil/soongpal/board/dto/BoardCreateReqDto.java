package com.soongsil.soongpal.board.dto;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardCategory;
import com.soongsil.soongpal.board.domain.BoardStatus;
import com.soongsil.soongpal.user.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Getter
public class BoardCreateReqDto {

    @Schema(description = "게시글의 제목", example = "콜라 30개 묶음 공동구매")
    @NotBlank
    private String title;

    @Schema(description = "게시글의 내용", example = "전 10개만 필요해요!")
    @NotBlank
    private String content;

    @Schema(description = "판매 상품 가격", example = "12000")
    @NotNull
    @Min(value = 0)
    private Integer price;

    @Schema(description = "상품 관련 URL (선택 사항)", example = "https://example.com/cola")
    private String url;
    @Schema(description = "모임 장소 또는 거래 위치 (선택 사항)", example = "기숙사 1층 로비")
    private String location;

    @Schema(description = "게시글 카테고리 상태", example = "GROUP", allowableValues = {"GROUP", "USED"})
    @NotNull
    private BoardCategory category;

    public static Board toEntity(BoardCreateReqDto boardCreateReqDto, User user) {
        return Board.builder()
                .title(boardCreateReqDto.getTitle())
                .content(boardCreateReqDto.getContent())
                .price(boardCreateReqDto.getPrice())
                .url(boardCreateReqDto.getUrl())
                .location(boardCreateReqDto.getLocation())
                .category(boardCreateReqDto.getCategory())
                .status(BoardStatus.IN_PROGRESS)
                .user(user)
                .build();
    }
}
