package com.soongsil.soongpal.report.domain;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.common.domain.BaseEntity;
import com.soongsil.soongpal.user.domain.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
public class Report extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_user_id", nullable = false)
    private User reportedUser;

    // 어떤 거래/게시글 건에 대한 신고인지 (선택 — 게시글이 삭제돼도 신고 기록은 남아야 해서 FK 대신 id만 보관)
    @Column(name = "related_board_id")
    private Long relatedBoardId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportCategory category;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status;

    // 관리자가 처리하면서 남기는 메모/사유
    @Lob
    @Column(columnDefinition = "TEXT")
    private String adminNote;

    // 관리자가 이 신고 건으로 실제 적용한 정지 일수 (영구정지/경고/기각이면 null)
    private Integer appliedSuspensionDays;

    private LocalDateTime resolvedAt;

    @Builder
    public Report(User reporter, User reportedUser, Board relatedBoard, ReportCategory category, String reason) {
        this.reporter = reporter;
        this.reportedUser = reportedUser;
        this.relatedBoardId = relatedBoard != null ? relatedBoard.getId() : null;
        this.category = category;
        this.reason = reason;
        this.status = ReportStatus.PENDING;
    }

    public void resolve(ReportStatus resultStatus, String adminNote, Integer appliedSuspensionDays) {
        this.status = resultStatus;
        this.adminNote = adminNote;
        this.appliedSuspensionDays = appliedSuspensionDays;
        this.resolvedAt = LocalDateTime.now();
    }
}
