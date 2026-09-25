package com.soongsil.soongpal.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ReportErrorCode {
    REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "신고 내역을 찾을 수 없습니다."),
    REPORT_SELF_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "본인을 신고할 수 없습니다."),
    REPORT_ALREADY_RESOLVED(HttpStatus.CONFLICT, "이미 처리된 신고입니다."),
    REPORT_SUSPENSION_DAYS_REQUIRED(HttpStatus.BAD_REQUEST, "정지 조치는 정지 일수(suspensionDays)가 필요합니다."),
    REPORT_ADMIN_ONLY(HttpStatus.FORBIDDEN, "관리자만 처리할 수 있습니다.");

    private final HttpStatus httpStatus;
    private final String message;
}
