package com.soongsil.soongpal.report.domain;

public enum ReportStatus {
    PENDING,   // 접수됨, 관리자 미확인
    RESOLVED,  // 관리자가 조치(경고/정지/영구정지)함
    DISMISSED  // 관리자가 무혐의로 판단해서 기각함
}
