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

    @Schema(description = "제품 가격", example = "12000")
    @NotNull
    @Min(value = 0)
    private Integer price;

    @Schema(description = "수정할 관련 웹 페이지 URL (선택 사항)", example = "http://new.example.com/link")
    private String url;
    @Schema(description = "수정할 모임 장소 또는 거래 위치 (선택 사항)", example = "숭실대학교 한경직 기념관")
    private String location;

    @Schema(description = "수정할 게시글 상태", example = "USED", allowableValues = {"GROUP", "USED"})
    @NotNull
    private BoardCategory category;
}
