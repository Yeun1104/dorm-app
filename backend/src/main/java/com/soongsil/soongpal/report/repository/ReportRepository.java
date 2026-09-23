package com.soongsil.soongpal.report.repository;

import com.soongsil.soongpal.report.domain.Report;
import com.soongsil.soongpal.report.domain.ReportCategory;
import com.soongsil.soongpal.report.domain.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface ReportRepository extends JpaRepository<Report, Long> {

    Page<Report> findByStatus(ReportStatus status, Pageable pageable);

    /** 24시간 내 서로 다른 신고자 수를 세기 위한 쿼리 (자동 임시 블라인드 조건 판정용). */
    @Query("select count(distinct r.reporter.id) from Report r " +
            "where r.reportedUser.id = :reportedUserId and r.createdAt >= :since")
    long countDistinctReportersSince(@Param("reportedUserId") Long reportedUserId, @Param("since") LocalDateTime since);

    /** 특정 카테고리(예: 노쇼)로, 관리자가 실제 조치(RESOLVED)한 신고 건수. 방장이 참여요청 목록에서 리스크 판단용으로 참고함. */
    long countByReportedUserIdAndCategoryAndStatus(Long reportedUserId, ReportCategory category, ReportStatus status);
}
