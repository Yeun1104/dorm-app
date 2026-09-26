package com.soongsil.soongpal.notification.domain;

public enum NotificationType {
    RESERVATION_REQUESTED,  // 내 글에 참여 요청이 옴
    RESERVATION_ACCEPTED,   // 내 참여 요청이 수락됨
    RESERVATION_REJECTED,   // 내 참여 요청이 거절됨
    BOARD_SOLD_OUT,         // 참여한 공동구매가 모집완료(전량 소진)됨
    RESERVATION_COMPLETED,  // 내 참여 건이 거래완료됨
    DORM_NOTICE             // 기숙사 새 공지사항
}
