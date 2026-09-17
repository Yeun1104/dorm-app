package com.soongsil.soongpal.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Builder
public class BoardPageResDto {

    @Schema(description = "게시글 목록")
    private List<BoardResDto> boards;

    @Schema(description = "현재 페이지 번호")
    private int currentPage;

    @Schema(description = "총 페이지 수")
    private int totalPages;

    public static BoardPageResDto from(Page<BoardResDto> boardPage) {
        return BoardPageResDto.builder()
                .boards(boardPage.getContent())
                .currentPage(boardPage.getNumber())
                .totalPages(boardPage.getTotalPages())
                .build();
    }
}