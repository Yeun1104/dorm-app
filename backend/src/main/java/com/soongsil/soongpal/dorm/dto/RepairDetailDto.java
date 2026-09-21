package com.soongsil.soongpal.dorm.dto;

public record RepairDetailDto(
        long postNo,
        String title,
        String writer,
        int viewCount,
        String writtenAt,
        String visitAllowed,
        String content
) {
}
