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

    @Schema(description = "전체 결제 금액 (배송비 포함)", example = "15000")
    @NotNull
    @Min(value = 1)
    private Integer totalPrice;

    @Schema(description = "전체 상품 개수 (= 공구로 판매할 개수)", example = "30")
    @NotNull
    @Min(value = 1)
    private Integer totalQuantity;

    @Schema(description = "1인당 최소 구매 수량 (선택 사항, 없으면 1개부터)", example = "2")
    @Min(value = 1)
    private Integer minPurchaseQuantity;

    @Schema(description = "상품 관련 URL (선택 사항)", example = "https://example.com/cola")
    private String url;

    @Schema(description = "수령 장소 (선택 사항)", example = "기숙사 1층 로비")
    private String location;

    @Schema(description = "게시글 카테고리", example = "GROUP", allowableValues = {"GROUP"})
    @NotNull
    private BoardCategory category;

    public static Board toEntity(BoardCreateReqDto boardCreateReqDto, User user) {
        return Board.builder()
                .title(boardCreateReqDto.getTitle())
                .content(boardCreateReqDto.getContent())
                .totalPrice(boardCreateReqDto.getTotalPrice())
                .totalQuantity(boardCreateReqDto.getTotalQuantity())
                .minPurchaseQuantity(boardCreateReqDto.getMinPurchaseQuantity())
                .url(boardCreateReqDto.getUrl())
                .location(boardCreateReqDto.getLocation())
                .category(boardCreateReqDto.getCategory())
                .status(BoardStatus.IN_PROGRESS)
                .user(user)
                .build();
    }
}
