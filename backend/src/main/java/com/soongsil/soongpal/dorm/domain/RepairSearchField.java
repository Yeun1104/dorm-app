package com.soongsil.soongpal.dorm.domain;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 고쳐주세요 게시판 검색 대상. ssudorm 검색 폼의 W 파라미터 값과 매칭됨.
 */
@Getter
@RequiredArgsConstructor
public enum RepairSearchField {
    TITLE("title"),
    CONTENT("contents"),
    WRITER("guest_name");

    private final String paramValue;
}
