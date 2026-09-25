package com.soongsil.soongpal.report.controller;

import com.soongsil.soongpal.common.dto.CommonResDto;
import com.soongsil.soongpal.common.exception.UserErrorCode;
import com.soongsil.soongpal.common.exception.UserException;
import com.soongsil.soongpal.report.domain.ReportStatus;
import com.soongsil.soongpal.report.dto.ReportCreateReqDto;
import com.soongsil.soongpal.report.dto.ReportResDto;
import com.soongsil.soongpal.report.dto.ReportResolveReqDto;
import com.soongsil.soongpal.report.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Report Controller", description = "신고 접수 및 관리자 처리")
public class ReportController {

    private final ReportService reportService;

    @Operation(summary = "신고 접수", description = "다른 사용자를 신고합니다. 24시간 내 서로 다른 3명에게 신고당하면 자동으로 임시 블라인드됩니다.")
    @PostMapping("/api/reports")
    public ResponseEntity<CommonResDto<ReportResDto>> createReport(@Valid @RequestBody ReportCreateReqDto dto) {
        Long userId = getUserId();
        ReportResDto result = reportService.createReport(userId, dto);
        return new ResponseEntity<>(new CommonResDto<>("신고가 접수되었습니다.", result), HttpStatus.OK);
    }

    @Operation(summary = "[관리자] 신고 목록 조회", description = "status를 안 주면 전체 조회.")
    @GetMapping("/api/admin/reports")
    public ResponseEntity<CommonResDto<Page<ReportResDto>>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(defaultValue = "0") int page
    ) {
        assertAdmin();
        Page<ReportResDto> result = reportService.getReports(status, page);
        return new ResponseEntity<>(new CommonResDto<>("신고 목록 조회 성공", result), HttpStatus.OK);
    }

    @Operation(summary = "[관리자] 신고 처리", description = "DISMISS(기각)/WARN(경고)/SUSPEND(정지, suspensionDays 필요)/BAN(영구정지) 중 하나로 처리함.")
    @PatchMapping("/api/admin/reports/{reportId}/resolve")
    public ResponseEntity<CommonResDto<ReportResDto>> resolveReport(
            @PathVariable Long reportId,
            @Valid @RequestBody ReportResolveReqDto dto
    ) {
        assertAdmin();
        ReportResDto result = reportService.resolveReport(reportId, dto);
        return new ResponseEntity<>(new CommonResDto<>("신고가 처리되었습니다.", result), HttpStatus.OK);
    }

    private Long getUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UserException(UserErrorCode.INVALID_USER_CREDENTIALS);
        }

        return Long.parseLong(authentication.getName());
    }

    /**
     * SecurityConfig의 "/**" permitAll 규칙 때문에 /api/admin/** 의 hasRole("ADMIN")이 실제로는 안 걸리고 있어서
     * (이전부터 있던 이슈, 아직 안 고침) 컨트롤러 단에서 한 번 더 직접 권한 체크함.
     */
    private void assertAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin) {
            throw new UserException(UserErrorCode.USER_ACCESS_DENIED);
        }
    }
}
