package com.soongsil.soongpal.board.dto;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.domain.BoardCategory;
import com.soongsil.soongpal.board.domain.BoardStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BoardUpdateReqDto {

    @Schema(description = "수정할 게시글의 제목", example = "제목 수정됨")
    @NotBlank
    private String title;

    @Schema(description = "수정할 게시글의 내용", example = "이러이러한 내용으로 바뀌었어요.")
    @NotBlank
    private String content;

    @Schema(description = "전체 결제 금액 (배송비 포함)", example = "15000")
    @NotNull
    @Min(value = 1)
    private Integer totalPrice;

    @Schema(description = "전체 상품 개수", example = "30")
    @NotNull
    @Min(value = 1)
    private Integer totalQuantity;

    @Schema(description = "1인당 최소 구매 수량 (선택 사항)", example = "2")
    @Min(value = 1)
    private Integer minPurchaseQuantity;

    @Schema(description = "수정할 관련 웹 페이지 URL (선택 사항)", example = "http://new.example.com/link")
    private String url;
    @Schema(description = "수정할 수령 장소 (선택 사항)", example = "숭실대학교 한경직 기념관")
    private String location;

    @Schema(description = "수정할 게시글 상태", example = "GROUP", allowableValues = {"GROUP"})
    @NotNull
    private BoardCategory category;
}
