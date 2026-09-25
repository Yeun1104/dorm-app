package com.soongsil.soongpal.report.domain;

public enum ReportResolutionAction {
    DISMISS, // 무혐의 기각
    WARN,    // 경고만 (정지 없음)
    SUSPEND, // n일 정지 (suspensionDays 필요)
    BAN      // 영구정지
}
