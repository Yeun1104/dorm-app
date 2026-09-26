package com.soongsil.soongpal.dorm.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 기숙사 공지사항 알림 스케줄러가 "마지막으로 알림 보낸 공지 번호"를 기억해두는 단일 행짜리 테이블.
 * 사용자별로 따로 안 두는 이유: 공지사항은 로그인 없이 누구나 같은 내용을 보므로, 시스템 전체에 딱 하나만 있으면 됨.
 */
@Getter
@NoArgsConstructor
@Entity
public class DormNoticeCheckpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** null이면 "아직 한 번도 체크 안 함" — 이 경우 최초 실행 시 알림 없이 기준점만 기록함(알림 폭탄 방지). */
    private Long lastNotifiedNoticeNo;

    public void updateLastNotifiedNoticeNo(Long noticeNo) {
        this.lastNotifiedNoticeNo = noticeNo;
    }
}
