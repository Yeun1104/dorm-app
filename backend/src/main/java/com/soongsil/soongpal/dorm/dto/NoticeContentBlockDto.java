package com.soongsil.soongpal.dorm.dto;

import java.util.List;

/**
 * 공지 본문을 앱에서 읽기 좋게 그리기 위한 블록 단위 구조.
 * type=TEXT 이면 text(줄바꿈 \n 포함), type=TABLE 이면 rows(첫 행은 보통 헤더)를 사용함.
 */
public record NoticeContentBlockDto(
        String type,
        String text,
        List<List<String>> rows
) {
    public static NoticeContentBlockDto text(String text) {
        return new NoticeContentBlockDto("TEXT", text, null);
    }

    public static NoticeContentBlockDto table(List<List<String>> rows) {
        return new NoticeContentBlockDto("TABLE", null, rows);
    }
}
