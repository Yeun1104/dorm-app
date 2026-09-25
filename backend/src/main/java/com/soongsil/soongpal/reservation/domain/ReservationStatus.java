package com.soongsil.soongpal.reservation.domain;

public enum ReservationStatus {
    PENDING,    // 구매자가 참여 요청. 아직 채팅방 없음, 수량 게이지도 안 깎임 (방장 확인 대기).
    ACCEPTED,   // 방장이 수락. 이 시점에 1:1 채팅방 생성 + 수량 게이지 차감이 같이 일어남.
    REJECTED,   // 방장이 거절. 종료 상태 (채팅/차감 없음).
    COMPLETED,  // 거래 완료.
    CANCELLED   // 수락 이후 취소. 게이지 복구됨.
}
