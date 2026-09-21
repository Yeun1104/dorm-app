package com.soongsil.soongpal.dorm.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * ssudorm의 "night_bbs" 계열 게시판. 외박신청과 장기비움신청은 board_no만 다르고
 * 폼 구조(신청자/호실/자리/연락처/기간/사유)가 완전히 동일해서 같은 로직을 재사용함.
 */
@Getter
@RequiredArgsConstructor
public enum DormBoardType {
    OUTING(1, "외박신청"),
    LONG_TERM_ABSENCE(2, "장기비움신청");

    private final int boardNo;
    private final String label;
}
