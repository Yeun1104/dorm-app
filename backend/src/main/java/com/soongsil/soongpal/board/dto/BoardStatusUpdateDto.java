package com.soongsil.soongpal.board.dto;

import com.soongsil.soongpal.board.domain.BoardStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class BoardStatusUpdateDto {

    @Schema(description = "수정할 게시글의 현재 거래 상태", example = "IN_PROGRESS", allowableValues = {"IN_PROGRESS, COMPLETED"})
    @NotNull
    private BoardStatus status;
}
