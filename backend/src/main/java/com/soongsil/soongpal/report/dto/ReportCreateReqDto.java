package com.soongsil.soongpal.report.dto;

import com.soongsil.soongpal.report.domain.ReportCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReportCreateReqDto {

    @Schema(description = "신고당하는 사용자 ID")
    @NotNull
    private Long reportedUserId;

    @Schema(description = "관련 게시글 ID (선택)")
    private Long relatedBoardId;

    @Schema(description = "신고 사유 카테고리")
    @NotNull
    private ReportCategory category;

    @Schema(description = "구체적인 신고 사유")
    @NotBlank
    private String reason;
}
