package com.soongsil.soongpal.dorm.dto;

import java.util.List;

public record NoticeDetailDto(
        long postNo,
        String title,
        String writer,
        int viewCount,
        String writtenAt,
        /** 줄바꿈이 유지된 평문 (구버전 앱 호환용) */
        String content,
        /** 표/문단 구조를 유지한 본문. 앱은 이걸로 렌더링함 */
        List<NoticeContentBlockDto> blocks
) {
}
