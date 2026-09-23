package com.soongsil.soongpal.dorm.dto;

public record NoticeListItemDto(
        long displayNo,
        long no,
        String title,
        String writer,
        int viewCount,
        String writtenDate,
        boolean isNew
) {
}
