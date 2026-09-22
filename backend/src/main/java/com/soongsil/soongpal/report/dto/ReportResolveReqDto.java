package com.soongsil.soongpal.report.dto;

import com.soongsil.soongpal.report.domain.ReportResolutionAction;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReportResolveReqDto {

    @Schema(description = "조치 종류", allowableValues = {"DISMISS", "WARN", "SUSPEND", "BAN"})
    @NotNull
    private ReportResolutionAction action;

    @Schema(description = "action이 SUSPEND일 때만 필수 — 정지 일수", example = "7")
    private Integer suspensionDays;

    @Schema(description = "관리자 메모 (선택)")
    private String adminNote;
}
