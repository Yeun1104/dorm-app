package com.soongsil.soongpal.report.dto;

import com.soongsil.soongpal.report.domain.Report;
import com.soongsil.soongpal.report.domain.ReportCategory;
import com.soongsil.soongpal.report.domain.ReportStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReportResDto {
    private Long id;
    private Long reporterId;
    private String reporterNickname;
    private Long reportedUserId;
    private String reportedUserNickname;
    private Long relatedBoardId;
    private ReportCategory category;
    private String reason;
    private ReportStatus status;
    private String adminNote;
    private Integer appliedSuspensionDays;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    public static ReportResDto from(Report report) {
        return ReportResDto.builder()
                .id(report.getId())
                .reporterId(report.getReporter().getId())
                .reporterNickname(report.getReporter().getNickName())
                .reportedUserId(report.getReportedUser().getId())
                .reportedUserNickname(report.getReportedUser().getNickName())
                .relatedBoardId(report.getRelatedBoardId())
                .category(report.getCategory())
                .reason(report.getReason())
                .status(report.getStatus())
                .adminNote(report.getAdminNote())
                .appliedSuspensionDays(report.getAppliedSuspensionDays())
                .createdAt(report.getCreatedAt())
                .resolvedAt(report.getResolvedAt())
                .build();
    }
}
