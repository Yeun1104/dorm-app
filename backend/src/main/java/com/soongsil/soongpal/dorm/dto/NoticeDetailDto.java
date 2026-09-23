package com.soongsil.soongpal.dorm.dto;

public record NoticeDetailDto(
        long postNo,
        String title,
        String writer,
        int viewCount,
        String writtenAt,
        String content
) {
}
