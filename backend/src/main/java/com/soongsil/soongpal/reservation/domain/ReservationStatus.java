package com.soongsil.soongpal.reservation.domain;

public enum ReservationStatus {
    PENDING,      // 구매자가 수량 입력하고 채팅 시작한 상태. 아직 수량 게이지 차감 안 됨.
    IN_PROGRESS,  // 방장이 "이 사람과 거래중"으로 확정. 이때부터 수량 게이지에서 차감됨.
    COMPLETED,    // 거래 완료 (게이지는 계속 차감된 채로 유지)
    CANCELLED     // 방장 또는 구매자가 취소. 게이지 차감됐었다면 복구됨.
}
