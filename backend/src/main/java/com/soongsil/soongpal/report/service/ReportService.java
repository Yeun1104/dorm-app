package com.soongsil.soongpal.report.service;

import com.soongsil.soongpal.board.domain.Board;
import com.soongsil.soongpal.board.repository.BoardRepository;
import com.soongsil.soongpal.common.exception.ReportErrorCode;
import com.soongsil.soongpal.common.exception.ReportException;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.report.domain.Report;
import com.soongsil.soongpal.report.domain.ReportResolutionAction;
import com.soongsil.soongpal.report.domain.ReportStatus;
import com.soongsil.soongpal.report.dto.ReportCreateReqDto;
import com.soongsil.soongpal.report.dto.ReportResDto;
import com.soongsil.soongpal.report.dto.ReportResolveReqDto;
import com.soongsil.soongpal.report.repository.ReportRepository;
import com.soongsil.soongpal.user.domain.User;
import com.soongsil.soongpal.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 신고 접수 + 관리자 처리(경고/정지/영구정지/기각).
 * 정지 일수는 자동 단계(1차/2차/3차)가 아니라, 관리자가 매번 직접 입력해서 결정함.
 * 대신 "24시간 내 서로 다른 3명에게 신고당하면 관리자 확인 전까지 자동 임시 블라인드" 규칙만 자동으로 처리함.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final int AUTO_BLIND_DISTINCT_REPORTER_THRESHOLD = 3;
    private static final int AUTO_BLIND_WINDOW_HOURS = 24;

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final BoardRepository boardRepository;

    @Transactional
    public ReportResDto createReport(Long reporterId, ReportCreateReqDto dto) {
        User reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
        User reportedUser = userRepository.findById(dto.getReportedUserId())
                .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        if (reporter.getId().equals(reportedUser.getId())) {
            throw new ReportException(ReportErrorCode.REPORT_SELF_NOT_ALLOWED);
        }

        Board relatedBoard = null;
        if (dto.getRelatedBoardId() != null) {
            relatedBoard = boardRepository.findById(dto.getRelatedBoardId()).orElse(null);
        }

        Report report = Report.builder()
                .reporter(reporter)
                .reportedUser(reportedUser)
                .relatedBoard(relatedBoard)
                .category(dto.getCategory())
                .reason(dto.getReason())
                .build();
        reportRepository.save(report);

        applyAutoBlindIfNeeded(reportedUser);

        return ReportResDto.from(report);
    }

    /** 24시간 내 서로 다른 신고자가 3명 이상이면, 관리자 확인 전까지 자동으로 블라인드(임시 정지) 처리. */
    private void applyAutoBlindIfNeeded(User reportedUser) {
        if (reportedUser.isCurrentlyRestricted()) {
            return; // 이미 정지/블라인드/영구정지 상태면 중복 처리 안 함
        }
        LocalDateTime since = LocalDateTime.now().minusHours(AUTO_BLIND_WINDOW_HOURS);
        long distinctReporters = reportRepository.countDistinctReportersSince(reportedUser.getId(), since);
        if (distinctReporters >= AUTO_BLIND_DISTINCT_REPORTER_THRESHOLD) {
            reportedUser.blindPendingReview();
            log.info("자동 블라인드 처리됨: userId={}, 24시간 내 서로 다른 신고자 수={}", reportedUser.getId(), distinctReporters);
        }
    }

    public Page<ReportResDto> getReports(ReportStatus status, int page) {
        Pageable pageable = PageRequest.of(page, 20, Sort.by("createdAt").descending());
        Page<Report> reports = (status != null)
                ? reportRepository.findByStatus(status, pageable)
                : reportRepository.findAll(pageable);
        return reports.map(ReportResDto::from);
    }

    /** 관리자가 신고 건을 확인하고 조치를 정함. 정지 일수는 SUSPEND일 때만 직접 입력받음. */
    @Transactional
    public ReportResDto resolveReport(Long reportId, ReportResolveReqDto dto) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ReportException(ReportErrorCode.REPORT_NOT_FOUND));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ReportException(ReportErrorCode.REPORT_ALREADY_RESOLVED);
        }

        User reportedUser = report.getReportedUser();
        ReportResolutionAction action = dto.getAction();

        switch (action) {
            case DISMISS -> {
                reportedUser.clearBlindFlag();
                report.resolve(ReportStatus.DISMISSED, dto.getAdminNote(), null);
            }
            case WARN -> {
                reportedUser.clearBlindFlag();
                report.resolve(ReportStatus.RESOLVED, dto.getAdminNote(), null);
            }
            case SUSPEND -> {
                if (dto.getSuspensionDays() == null || dto.getSuspensionDays() <= 0) {
                    throw new ReportException(ReportErrorCode.REPORT_SUSPENSION_DAYS_REQUIRED);
                }
                reportedUser.suspendUntil(LocalDateTime.now().plusDays(dto.getSuspensionDays()));
                report.resolve(ReportStatus.RESOLVED, dto.getAdminNote(), dto.getSuspensionDays());
            }
            case BAN -> {
                reportedUser.banPermanently();
                report.resolve(ReportStatus.RESOLVED, dto.getAdminNote(), null);
            }
        }

        return ReportResDto.from(report);
    }
}
